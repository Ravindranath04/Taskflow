// src/lib/assignmentEngine.js
// Smart Auto-Assignment Engine
// Score = (skill match × 0.5) + (low workload × 0.3) + (past success rate × 0.2)

const prisma  = require("./prisma");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── SKILL KEYWORDS MAP ───────────────────────────────────────────────────────
const ROLE_SKILLS = {
  "Frontend Dev":  ["frontend", "ui", "react", "css", "design", "component", "responsive"],
  "Backend Dev":   ["backend", "api", "database", "auth", "server", "node", "prisma", "sql"],
  "Designer":      ["design", "figma", "ui", "ux", "mockup", "wireframe", "layout"],
  "DevOps":        ["devops", "ci", "cd", "deploy", "docker", "pipeline", "infra", "cloud"],
  "PM":            ["docs", "planning", "sprint", "roadmap", "report", "meeting", "review"],
  "Full Stack":    ["frontend", "backend", "api", "react", "node", "database"],
  "QA":            ["test", "bug", "qa", "quality", "automation", "selenium"],
};

// ─── SCORE A SINGLE MEMBER FOR A TASK ─────────────────────────────────────────
async function scoreMember(member, task, projectId) {
  // 1. Skill match score (0–1)
  const memberKeywords = ROLE_SKILLS[member.role] || [];
  const taskText = `${task.title} ${task.description || ""} ${(task.tags || []).join(" ")}`.toLowerCase();
  const matchedKeywords = memberKeywords.filter(k => taskText.includes(k));
  const skillScore = memberKeywords.length > 0
    ? matchedKeywords.length / memberKeywords.length
    : 0.3; // neutral if role unknown

  // 2. Workload score (0–1) — fewer open tasks = higher score
  const openTasks = await prisma.task.count({
    where: { assigneeId: member.id, status: { not: "DONE" } },
  });
  const workloadScore = Math.max(0, 1 - openTasks / 10); // 0 tasks = 1.0, 10+ tasks = 0.0

  // 3. Past success rate (0–1) — completed tasks of similar type
  const completedSimilar = await prisma.task.count({
    where: {
      assigneeId: member.id,
      status: "DONE",
      OR: [
        { tags: { hasSome: task.tags || [] } },
        { title: { contains: task.tags?.[0] || "", mode: "insensitive" } },
      ],
    },
  });
  const totalCompleted = await prisma.task.count({
    where: { assigneeId: member.id, status: "DONE" },
  });
  const successRate = totalCompleted > 0
    ? Math.min(1, completedSimilar / Math.max(totalCompleted * 0.3, 1))
    : 0.3; // neutral for new members

  // ── Final weighted score ──
  const finalScore = (skillScore * 0.5) + (workloadScore * 0.3) + (successRate * 0.2);

  return {
    memberId:   member.id,
    memberName: member.name,
    role:       member.role,
    score:      Math.round(finalScore * 100) / 100,
    breakdown: {
      skillScore:   Math.round(skillScore * 100),
      workloadScore:Math.round(workloadScore * 100),
      successRate:  Math.round(successRate * 100),
      openTasks,
      completedSimilar,
      matchedKeywords,
    },
  };
}

// ─── MAIN: AUTO-ASSIGN A TASK ─────────────────────────────────────────────────
async function autoAssignTask(taskId, projectId) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    // Get all project members
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
    });

    if (projectMembers.length === 0) return null;

    // Score every member
    const scores = await Promise.all(
      projectMembers.map(pm => scoreMember(pm.user, task, projectId))
    );

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // Assign the task
    const updated = await prisma.task.update({
      where: { id: taskId },
      data:  { assigneeId: best.memberId },
      include: {
        assignee: { select: { id:true, name:true, email:true, avatar:true, color:true } },
        project:  { select: { id:true, name:true } },
      },
    });

    // Create notification for the assignee
    await prisma.notification.create({
      data: {
        userId:  best.memberId,
        type:    "TASK_ASSIGNED",
        title:   "New task assigned to you",
        message: `"${task.title}" was auto-assigned to you based on your skills and availability.`,
      },
    });

    console.log(`[AutoAssign] "${task.title}" → ${best.memberName} (score: ${best.score})`);
    console.log(`[AutoAssign] Breakdown:`, best.breakdown);

    return { task: updated, scores, assignedTo: best };
  } catch (err) {
    console.error("[AutoAssign] Error:", err.message);
    return null;
  }
}

// ─── GET ASSIGNMENT SUGGESTION (without actually assigning) ───────────────────
async function suggestAssignment(taskId, projectId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true },
  });

  const scores = await Promise.all(
    members.map(pm => scoreMember(pm.user, task, projectId))
  );
  scores.sort((a, b) => b.score - a.score);

  // Ask Claude to explain the recommendation in natural language
  const prompt = `Task: "${task.title}" (tags: ${(task.tags||[]).join(", ")}, priority: ${task.priority})
Top candidates:
${scores.slice(0,3).map((s,i) => `${i+1}. ${s.memberName} (${s.role}) - score: ${s.score} | open tasks: ${s.breakdown.openTasks} | skill match: ${s.breakdown.skillScore}% | past success: ${s.breakdown.successRate}%`).join("\n")}

In 2 sentences, explain why ${scores[0].memberName} is the best choice for this task.`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role:"user", content: prompt }],
  });

  return {
    scores,
    recommended: scores[0],
    explanation: res.content[0].text,
  };
}

module.exports = { autoAssignTask, suggestAssignment, scoreMember };
