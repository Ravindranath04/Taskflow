// src/controllers/profileController.js
const { z }    = require("zod");
const prisma   = require("../lib/prisma");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model    = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const profileSchema = z.object({
  title:           z.string().optional(),
  bio:             z.string().optional(),
  department:      z.string().optional(),
  yearsExperience: z.number().optional(),
  skills:          z.array(z.string()).optional(),
  techStack:       z.array(z.string()).optional(),
  domains:         z.array(z.string()).optional(),
  linkedinUrl:     z.string().optional(),
  githubUrl:       z.string().optional(),
});

const profileInclude = {
  profile: true,
  _count: { select: { assignedTasks: true } },
};

// GET /api/profile/:userId
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id:true, name:true, email:true, avatar:true, color:true, role:true,
        createdAt:true,
        profile: true,
        assignedTasks: {
          include: {
            project:  { select: { id:true, name:true, color:true } },
            ratings:  true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        receivedRatings: {
          include: {
            task:    { select: { title:true } },
            ratedBy: { select: { name:true, avatar:true, color:true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate live stats
    const completedTasks = user.assignedTasks.filter(t => t.status === "DONE");
    const onTime = completedTasks.filter(t => !t.dueDate || new Date(t.dueDate) >= new Date(t.updatedAt));
    const avgRating = user.receivedRatings.length
      ? user.receivedRatings.reduce((s, r) => s + r.stars, 0) / user.receivedRatings.length
      : 0;

    res.json({
      ...user,
      stats: {
        totalTasks:     user.assignedTasks.length,
        completedTasks: completedTasks.length,
        onTimeTasks:    onTime.length,
        avgRating:      Math.round(avgRating * 10) / 10,
        completionRate: user.assignedTasks.length
          ? Math.round(completedTasks.length / user.assignedTasks.length * 100) : 0,
        onTimeRate: completedTasks.length
          ? Math.round(onTime.length / completedTasks.length * 100) : 0,
      },
    });
  } catch (err) { next(err); }
};

// PATCH /api/profile/me
const updateMyProfile = async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    const profile = await prisma.employeeProfile.upsert({
      where:  { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });

    // Recalculate performance score after profile update
    await recalcPerformance(req.user.id);

    res.json(profile);
  } catch (err) { next(err); }
};

// POST /api/ratings/:taskId  — rate an employee's work on a task (any team member can rate)
const rateTask = async (req, res, next) => {
  try {
    const { stars, comment } = z.object({
      stars:   z.number().min(1).max(5),
      comment: z.string().optional(),
    }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        project: { include: { members: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!task.assigneeId) return res.status(400).json({ error: "Task has no assignee" });
    if (task.status !== "DONE") return res.status(400).json({ error: "Can only rate completed tasks" });

    // Prevent self-rating
    if (task.assigneeId === req.user.id) {
      return res.status(400).json({ error: "Cannot rate your own work" });
    }

    // Ensure rater is a project member
    const raterIsMember = task.project.members.some(m => m.userId === req.user.id);
    if (!raterIsMember && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only project members or admins can rate tasks" });
    }

    const rating = await prisma.taskRating.upsert({
      where:  { taskId_ratedById: { taskId: task.id, ratedById: req.user.id } },
      update: { stars, comment },
      create: { taskId: task.id, ratedUserId: task.assigneeId, ratedById: req.user.id, stars, comment },
      include: { ratedBy: { select: { name: true, avatar: true } } },
    });

    // Notify the rated person
    await prisma.notification.create({
      data: {
        userId:  task.assigneeId,
        type:    "TASK_RATED",
        title:   `You received ${stars}⭐ for "${task.title}"`,
        message: comment || `Rated ${stars} out of 5 stars by ${req.user.name}.`,
        link:    `/profile/${req.user.id}`,
      },
    });

    // Recalculate performance score for the rated person
    await recalcPerformance(task.assigneeId);

    res.json(rating);
  } catch (err) { next(err); }
};

// GET /api/profile/team-overview  — all members with profiles for team page
const teamOverview = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id:true, name:true, email:true, avatar:true, color:true, role:true,
        profile: true,
        _count: { select: { assignedTasks: { where: { status: { not: "DONE" } } } } },
        receivedRatings: { select: { stars: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json(users.map(u => ({
      ...u,
      openTasks: u._count.assignedTasks,
      avgRating: u.receivedRatings.length
        ? Math.round(u.receivedRatings.reduce((s,r) => s+r.stars, 0) / u.receivedRatings.length * 10) / 10
        : 0,
    })));
  } catch (err) { next(err); }
};

// POST /api/profile/ai-summary/:userId  — AI writes a profile summary
const aiProfileSummary = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { profile: true, receivedRatings: { select: { stars:true, comment:true } } },
    });
    if (!user || !user.profile) return res.status(404).json({ error: "Profile not found" });

    const p = user.profile;
    const avgRating = user.receivedRatings.length
      ? user.receivedRatings.reduce((s,r) => s+r.stars, 0) / user.receivedRatings.length : 0;

    const prompt = `Write a 3-sentence professional summary for this employee:
Name: ${user.name}
Title: ${p.title}
Experience: ${p.yearsExperience} years
Skills: ${p.skills.join(", ")}
Domains: ${p.domains.join(", ")}
Performance score: ${p.performanceScore}/100
Average rating: ${avgRating.toFixed(1)}/5
Tasks completed: ${p.tasksCompleted} (${p.tasksOnTime} on time)
Bio: ${p.bio || "Not provided"}

Be professional and highlight their strongest areas.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary });
  } catch (err) { next(err); }
};

// Helper: recalculate performance score for a user
async function recalcPerformance(userId) {
  const tasks   = await prisma.task.findMany({ where: { assigneeId: userId } });
  const ratings = await prisma.taskRating.findMany({ where: { ratedUserId: userId } });

  const completed = tasks.filter(t => t.status === "DONE").length;
  const onTime    = tasks.filter(t => t.status === "DONE" && (!t.dueDate || new Date(t.dueDate) >= new Date(t.updatedAt))).length;
  const avgRating = ratings.length ? ratings.reduce((s,r) => s+r.stars, 0) / ratings.length : 0;
  const openTasks = tasks.filter(t => t.status !== "DONE").length;

  // Score formula: completion(30) + on-time(30) + rating(30) + workload penalty(10)
  const completionScore = completed > 0 ? Math.min(30, completed) : 0;
  const onTimeScore     = completed > 0 ? Math.round((onTime / completed) * 30) : 0;
  const ratingScore     = Math.round((avgRating / 5) * 30);
  const workloadPenalty = openTasks >= 7 ? 10 : openTasks >= 5 ? 5 : 0;
  const total = Math.min(100, completionScore + onTimeScore + ratingScore - workloadPenalty + 10);

  await prisma.employeeProfile.update({
    where:  { userId },
    data: {
      performanceScore: total,
      avgTaskRating:    Math.round(avgRating * 10) / 10,
      tasksCompleted:   completed,
      tasksOnTime:      onTime,
      tasksLate:        completed - onTime,
      currentWorkload:  openTasks,
    },
  });
}

module.exports = { getProfile, updateMyProfile, rateTask, teamOverview, aiProfileSummary };