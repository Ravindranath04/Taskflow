// src/jobs/predictiveAnalytics.js
// Runs nightly — analyses every active project for risks and sends alerts

const prisma    = require("../lib/prisma");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── ANALYSE ONE PROJECT ──────────────────────────────────────────────────────
async function analyseProject(project) {
  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    include: { assignee: { select: { id:true, name:true, role:true } } },
    orderBy: { updatedAt: "desc" },
  });

  const now        = new Date();
  const deadline   = project.deadline ? new Date(project.deadline) : null;
  const daysLeft   = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : null;

  // ── Calculate velocity ──
  const last7days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const completedLast7 = tasks.filter(t =>
    t.status === "DONE" && new Date(t.updatedAt) > last7days
  ).length;
  const remainingTasks = tasks.filter(t => t.status !== "DONE").length;
  const velocityDaysNeeded = completedLast7 > 0
    ? Math.ceil(remainingTasks / (completedLast7 / 7))
    : 999;

  // ── Workload per member ──
  const workloadMap = {};
  tasks.filter(t => t.status !== "DONE" && t.assignee).forEach(t => {
    const name = t.assignee.name;
    workloadMap[name] = (workloadMap[name] || 0) + 1;
  });
  const overloadedMembers = Object.entries(workloadMap)
    .filter(([, count]) => count >= 6)
    .map(([name, count]) => `${name} (${count} tasks)`);

  // ── Stale critical tasks ──
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const staleCritical = tasks.filter(t =>
    t.priority === "CRITICAL" &&
    t.status !== "DONE" &&
    new Date(t.updatedAt) < twoDaysAgo
  ).map(t => t.title);

  // ── Unassigned tasks ──
  const unassigned = tasks.filter(t => !t.assigneeId && t.status !== "DONE").length;

  // ── Overdue tasks ──
  const overdueTasks = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
  );

  // ── Build context for Claude ──
  const prompt = `Analyse this project and identify risks. Be concise — 3-5 bullet points max.

Project: ${project.name}
Deadline: ${deadline ? deadline.toDateString() : "None set"} (${daysLeft ?? "?"} days left)
Tasks: ${tasks.length} total, ${remainingTasks} remaining, ${completedLast7} completed last 7 days
Velocity: At current pace, ${velocityDaysNeeded} days needed to complete remaining tasks
Overloaded members (6+ tasks): ${overloadedMembers.join(", ") || "None"}
Stale critical tasks (no update 2+ days): ${staleCritical.join(", ") || "None"}
Unassigned tasks: ${unassigned}
Overdue tasks: ${overdueTasks.length}

List the top risks and a one-line recommendation for each. Format:
🔴 CRITICAL: [risk]
🟡 WARNING: [risk]  
🟢 INFO: [observation]`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{ role:"user", content: prompt }],
  });

  const analysis = res.content[0].text;

  // ── Determine overall risk level ──
  const riskLevel =
    (daysLeft !== null && velocityDaysNeeded > daysLeft) ? "CRITICAL" :
    (overloadedMembers.length > 0 || staleCritical.length > 1) ? "HIGH" :
    (unassigned > 3 || overdueTasks.length > 0) ? "MEDIUM" : "LOW";

  return {
    projectId:    project.id,
    projectName:  project.name,
    riskLevel,
    daysLeft,
    velocityDaysNeeded,
    overloadedMembers,
    staleCritical,
    unassigned,
    overdueCount: overdueTasks.length,
    analysis,
    generatedAt:  new Date().toISOString(),
  };
}

// ─── SEND NOTIFICATIONS FOR HIGH RISK PROJECTS ───────────────────────────────
async function sendRiskNotifications(report) {
  if (report.riskLevel === "LOW") return;

  // Find all admins/PMs in the project
  const members = await prisma.projectMember.findMany({
    where: { projectId: report.projectId },
    include: { user: { select: { id:true, role:true } } },
  });

  const admins = members.filter(m => m.user.role === "ADMIN" || m.role === "owner");
  if (admins.length === 0) return; // notify all members if no admins
  const targets = admins.length > 0 ? admins : members;

  await Promise.all(targets.map(m =>
    prisma.notification.create({
      data: {
        userId:  m.user.id,
        type:    `RISK_${report.riskLevel}`,
        title:   `${report.riskLevel === "CRITICAL" ? "🔴" : "🟡"} Project risk detected — ${report.projectName}`,
        message: report.analysis.slice(0, 300) + "...",
      },
    })
  ));

  console.log(`[Analytics] Notified ${targets.length} members about ${report.riskLevel} risk in ${report.projectName}`);
}

// ─── RUN FULL NIGHTLY ANALYSIS ────────────────────────────────────────────────
async function runNightlyAnalysis() {
  console.log("[Analytics] Starting nightly analysis...");

  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ["ACTIVE", "PLANNING"] } },
  });

  const reports = [];
  for (const project of activeProjects) {
    try {
      const report = await analyseProject(project);
      await sendRiskNotifications(report);
      reports.push(report);
      console.log(`[Analytics] ${project.name} → Risk: ${report.riskLevel}`);
    } catch (err) {
      console.error(`[Analytics] Failed for ${project.name}:`, err.message);
    }
  }

  console.log(`[Analytics] Done. Analysed ${reports.length} projects.`);
  return reports;
}

// ─── SCHEDULE (runs every night at 9pm) ──────────────────────────────────────
function scheduleNightlyJob() {
  const now        = new Date();
  const tonight    = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  if (tonight <= now) tonight.setDate(tonight.getDate() + 1);

  const msUntil = tonight - now;
  console.log(`[Analytics] Nightly job scheduled in ${Math.round(msUntil/3600000)}h`);

  setTimeout(() => {
    runNightlyAnalysis();
    setInterval(runNightlyAnalysis, 24 * 60 * 60 * 1000); // repeat every 24h
  }, msUntil);
}

module.exports = { runNightlyAnalysis, analyseProject, scheduleNightlyJob };
