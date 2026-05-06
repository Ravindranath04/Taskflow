// src/controllers/taskController.js
const { z }    = require("zod");
const prisma   = require("../lib/prisma");

const dateString = z.string().optional().nullable().refine(value => {
  if (value === undefined || value === null || value === "") return true;
  return !Number.isNaN(Date.parse(value));
}, { message: "Invalid date" });

const taskSchema = z.object({
  title:           z.string().min(1).max(200),
  description:     z.string().optional(),
  status:          z.enum(["TODO","IN_PROGRESS","REVIEW","DONE"]).optional(),
  priority:        z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]).optional(),
  tags:            z.array(z.string()).optional(),
  assigneeId:      z.string().optional().nullable(),
  dueDate:         dateString,
  requiredSkills:  z.array(z.string()).optional(),
  requiredDomains: z.array(z.string()).optional(),
});

const include = {
  assignee: { select: { id:true, name:true, email:true, avatar:true, color:true } },
  creator:  { select: { id:true, name:true, avatar:true } },
  _count:   { select: { comments: true } },
};

// ── Notify assignee when task is assigned ─────────────────────────────────────
async function notifyAssignee(task, assigneeId, assigner) {
  if (!assigneeId) return;
  try {
    await prisma.notification.create({
      data: {
        userId:  assigneeId,
        type:    "TASK_ASSIGNED",
        title:   "📋 New task assigned to you",
        message: `"${task.title}" has been assigned to you${assigner ? ` by ${assigner.name}` : ""}. Check your dashboard!`,
        link:    `/tasks/${task.id}`,
      },
    });
  } catch (err) {
    console.error("[Notify] Failed to create notification:", err.message);
  }
}

// ── Update workload count on profile ─────────────────────────────────────────
async function adjustWorkload(oldAssigneeId, newAssigneeId) {
  if (oldAssigneeId && oldAssigneeId !== newAssigneeId) {
    await prisma.employeeProfile.updateMany({
      where: { userId: oldAssigneeId },
      data:  { currentWorkload: { decrement: 1 } },
    }).catch(() => {});
  }
  if (newAssigneeId && oldAssigneeId !== newAssigneeId) {
    await prisma.employeeProfile.updateMany({
      where: { userId: newAssigneeId },
      data:  { currentWorkload: { increment: 1 } },
    }).catch(() => {});
  }
}

// GET /api/projects/:projectId/tasks
const getByProject = async (req, res, next) => {
  try {
    const { status, priority, assigneeId, search } = req.query;
    const where = {
      projectId: req.params.projectId,
      ...(status     && { status }),
      ...(priority   && { priority }),
      ...(assigneeId && { assigneeId }),
      ...(search     && { title: { contains: search, mode: "insensitive" } }),
    };
    const tasks = await prisma.task.findMany({ where, include, orderBy: { createdAt: "desc" } });
    res.json(tasks);
  } catch (err) { next(err); }
};

// GET /api/tasks/my — current user's tasks across ALL projects
const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where:   { assigneeId: req.user.id },
      include: { ...include, project: { select: { id:true, name:true, color:true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  } catch (err) { next(err); }
};

// GET /api/tasks/:id
const getOne = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where:   { id: req.params.id },
      include: {
        ...include,
        project:  { select: { id:true, name:true, color:true } },
        comments: { include: { author: { select: { id:true, name:true, avatar:true, color:true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) { next(err); }
};

// POST /api/projects/:projectId/tasks
const create = async (req, res, next) => {
  try {
    const data = taskSchema.parse(req.body);

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.projectId, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: "Not a project member" });

    const task = await prisma.task.create({
      data: {
        ...data,
        projectId: req.params.projectId,
        creatorId: req.user.id,
        dueDate:   data.dueDate ? new Date(data.dueDate) : null,
      },
      include,
    });

    if (data.assigneeId) {
      await adjustWorkload(null, data.assigneeId);
      await notifyAssignee(task, data.assigneeId, req.user);
    }

    res.status(201).json(task);
  } catch (err) { next(err); }
};

// PATCH /api/tasks/:id — admin can update everything, members can update their own task status
const update = async (req, res, next) => {
  try {
    const data = taskSchema.partial().parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    // Members can only update tasks assigned to them (status changes only)
    // Admins can update everything including reassignment
    const isAdmin  = req.user.role === "ADMIN";
    const isOwner  = existing.assigneeId === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "You can only update tasks assigned to you" });
    }

    // Non-admins cannot reassign tasks
    if (!isAdmin && data.assigneeId !== undefined) {
      return res.status(403).json({ error: "Only admins can reassign tasks" });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data:  { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      include,
    });

    // If assignee changed, notify the new assignee and update workload
    if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
      await adjustWorkload(existing.assigneeId, data.assigneeId);
      await notifyAssignee(task, data.assigneeId, req.user);
    }

    res.json(task);
  } catch (err) { next(err); }
};

// PATCH /api/tasks/:id/status — drag and drop — any member can update status of their task
// Admins can update any task's status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(["TODO","IN_PROGRESS","REVIEW","DONE"]),
    }).parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    const isAdmin = req.user.role === "ADMIN";
    const isOwner = existing.assigneeId === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "You can only move tasks assigned to you" });
    }

    const task = await prisma.task.update({
      where:  { id: req.params.id },
      data:   { status },
      include,
    });
    res.json(task);
  } catch (err) { next(err); }
};

// DELETE /api/tasks/:id — admin only
const remove = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can delete tasks" });
    }
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    if (existing.assigneeId) await adjustWorkload(existing.assigneeId, null);
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (err) { next(err); }
};

// POST /api/tasks/:id/comments
const addComment = async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const comment = await prisma.comment.create({
      data:    { content, taskId: req.params.id, authorId: req.user.id },
      include: { author: { select: { id:true, name:true, avatar:true, color:true } } },
    });
    res.status(201).json(comment);
  } catch (err) { next(err); }
};

module.exports = { getByProject, getMyTasks, getOne, create, update, updateStatus, remove, addComment };