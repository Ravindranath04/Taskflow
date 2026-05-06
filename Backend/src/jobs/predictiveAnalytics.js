// src/jobs/predictiveAnalytics.js
// ✅ Uses Google Gemini API (FREE)

const prisma = require("../lib/prisma");

// ─── Gemini helper ────────────────────────────────────────────────────────────
async function gemini(prompt) {
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role:"user", parts:[{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── ANALYSE ONE PROJECT ──────────────────────────────────────────────────────
async function analyseProject(project) {
  const tasks  = await prisma.task.findMany({
    where:   { projectId: project.id },
    include: { assignee: { select: { id:true, name:true } } },
    orderBy: { updatedAt: "desc" },
  });

  const now      = new Date();
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : null;

  // Velocity — tasks completed in last 7 days
  const last7      = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const doneRecent = tasks.filter(t => t.status === "DONE" && new Date(t.updatedAt) > last7).length;
  const remaining  = tasks.filter(t => t.status !== "DONE").length;
  const daysNeeded = doneRecent > 0 ? Math.ceil(remaining / (doneRecent / 7)) : 999;

  // Overloaded members
  const loadMap = {};
  tasks.filter(t => t.status !== "DONE" && t.assignee).forEach(t => {
    loadMap[t.assignee.name] = (loadMap[t.assignee.name] || 0) + 1;
  });
  const overloaded = Object.entries(loadMap).filter(([,c]) => c >= 6).map(([n,c]) => `${n} (${c} tasks)`);

  // Stale critical tasks
  const twoDaysAgo    = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const staleCritical = tasks.filter(t =>
    t.priority === "CRITICAL" && t.status !== "DONE" && new Date(t.updatedAt) < twoDaysAgo
  ).map(t => t.title);

  const unassigned  = tasks.filter(t => !t.assigneeId && t.status !== "DONE").length;
  const overdueCount= tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length;

  // Ask Gemini for analysis
  const prompt = `Analyse this software project and identify top risks. Give 3-5 bullet points only.

Project: ${project.name}
Deadline: ${deadline ? deadline.toDateString() : "None"} (${daysLeft ?? "?"} days left)
Tasks remaining: ${remaining} | Completed last 7 days: ${doneRecent} | Days needed at current pace: ${daysNeeded}
Overloaded members (6+ tasks): ${overloaded.join(", ") || "None"}
Stale critical tasks (no update 2+ days): ${staleCritical.join(", ") || "None"}
Unassigned tasks: ${unassigned} | Overdue tasks: ${overdueCount}

Format each point as:
🔴 CRITICAL: [risk + recommendation]
🟡 WARNING: [risk + recommendation]
🟢 INFO: [observation]`;

  const analysis = await gemini(prompt);

  const riskLevel =
    (daysLeft !== null && daysNeeded > daysLeft) ? "CRITICAL" :
    (overloaded.length > 0 || staleCritical.length > 1) ? "HIGH" :
    (unassigned > 3 || overdueCount > 0) ? "MEDIUM" : "LOW";

  return {
    projectId:         project.id,
    projectName:       project.name,
    riskLevel,
    daysLeft,
    velocityDaysNeeded:daysNeeded,
    overloadedMembers: overloaded,
    staleCritical,
    unassigned,
    overdueCount,
    analysis,
    generatedAt:       new Date().toISOString(),
  };
}

// ─── SEND NOTIFICATIONS FOR HIGH RISK ────────────────────────────────────────
async function sendRiskNotifications(report) {
  if (report.riskLevel === "LOW") return;

  const members = await prisma.projectMember.findMany({
    where:   { projectId: report.projectId },
    include: { user: { select: { id:true, role:true } } },
  });
  const admins  = members.filter(m => m.user.role === "ADMIN" || m.role === "owner");
  const targets = admins.length > 0 ? admins : members;

  await Promise.all(targets.map(m =>
    prisma.notification.create({
      data: {
        userId:  m.user.id,
        type:    `RISK_${report.riskLevel}`,
        title:   `${report.riskLevel === "CRITICAL" ? "🔴" : "🟡"} Risk detected — ${report.projectName}`,
        message: report.analysis.slice(0, 300) + "...",
      },
    })
  ));
}

// ─── NIGHTLY ANALYSIS ─────────────────────────────────────────────────────────
async function runNightlyAnalysis() {
  console.log("[Analytics] Starting nightly analysis...");
  const projects = await prisma.project.findMany({
    where: { status: { in: ["ACTIVE","PLANNING"] } },
  });

  const reports = [];
  for (const p of projects) {
    try {
      const report = await analyseProject(p);
      await sendRiskNotifications(report);
      reports.push(report);
      console.log(`[Analytics] ${p.name} → ${report.riskLevel}`);
    } catch (err) {
      console.error(`[Analytics] Failed for ${p.name}:`, err.message);
    }
  }
  console.log(`[Analytics] Done — ${reports.length} projects analysed`);
  return reports;
}

// ─── SCHEDULE (every night at 9pm) ───────────────────────────────────────────
function scheduleNightlyJob() {
  const now     = new Date();
  const tonight = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  if (tonight <= now) tonight.setDate(tonight.getDate() + 1);
  const msUntil = tonight - now;
  console.log(`[Analytics] Nightly job in ${Math.round(msUntil/3600000)}h`);
  setTimeout(() => {
    runNightlyAnalysis();
    setInterval(runNightlyAnalysis, 24 * 60 * 60 * 1000);
  }, msUntil);
}

module.exports = { runNightlyAnalysis, analyseProject, scheduleNightlyJob };