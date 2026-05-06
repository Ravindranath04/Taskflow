// src/lib/assignmentEngine.js
// ✅ Uses Google Gemini API (FREE)

const prisma = require("./prisma");

// ─── Gemini helper ────────────────────────────────────────────────────────────
async function gemini(prompt) {
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role:"user", parts:[{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.5 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── SKILL KEYWORDS MAP ───────────────────────────────────────────────────────
const ROLE_SKILLS = {
  "Frontend Dev":  ["frontend","ui","react","css","design","component","responsive","typescript"],
  "Backend Dev":   ["backend","api","database","auth","server","node","prisma","sql","graphql"],
  "Designer":      ["design","figma","ui","ux","mockup","wireframe","layout","prototype"],
  "DevOps":        ["devops","ci","cd","deploy","docker","pipeline","infra","cloud","aws","kubernetes"],
  "PM":            ["docs","planning","sprint","roadmap","report","meeting","review","management"],
  "Full Stack":    ["frontend","backend","api","react","node","database"],
  "QA":            ["test","bug","qa","quality","automation"],
};

// ─── SCORE ONE MEMBER ─────────────────────────────────────────────────────────
async function scoreMember(user, task) {
  const profile = user.profile;

  // Use profile skills if available, otherwise fall back to role keywords
  const memberSkills = profile?.skills?.map(s => s.toLowerCase()) ||
                       ROLE_SKILLS[user.role || ""] || [];
  const memberDomains = profile?.domains?.map(d => d.toLowerCase()) || [];

  const reqSkills  = (task.requiredSkills  || task.tags || []).map(s => s.toLowerCase());
  const reqDomains = (task.requiredDomains || []).map(d => d.toLowerCase());

  // 1. Skill match (0-1)
  const skillMatches  = reqSkills.length
    ? reqSkills.filter(s => memberSkills.some(ms => ms.includes(s) || s.includes(ms))).length / reqSkills.length
    : 0.3;
  const domainMatches = reqDomains.length
    ? reqDomains.filter(d => memberDomains.includes(d)).length / reqDomains.length
    : 0.3;
  const skillScore = (skillMatches * 0.6) + (domainMatches * 0.4);

  // 2. Experience score (0-1)
  const expScore = profile ? Math.min(1, (profile.yearsExperience || 0) / 10) : 0.3;

  // 3. Workload score (0-1) — fewer open tasks = higher score
  const openTasks     = profile?.currentWorkload ?? await prisma.task.count({
    where: { assigneeId: user.id, status: { not: "DONE" } },
  });
  const workloadScore = Math.max(0, 1 - openTasks / 8);

  // 4. Performance score (0-1)
  const perfScore = profile ? (profile.performanceScore || 50) / 100 : 0.5;

  // 5. On-time rate (0-1)
  const onTimeRate = profile && profile.tasksCompleted > 0
    ? profile.tasksOnTime / profile.tasksCompleted
    : 0.5;

  // FINAL: skill(40%) + exp(10%) + workload(25%) + perf(15%) + ontime(10%)
  const finalScore =
    (skillScore    * 0.35) +
    (expScore      * 0.15) +
    (workloadScore * 0.25) +
    (perfScore     * 0.15) +
    (onTimeRate    * 0.10);

  return {
    memberId:   user.id,
    memberName: user.name,
    role:       profile?.title || user.role || "Team Member",
    score:      Math.round(finalScore * 100) / 100,
    breakdown: {
      skillScore:    Math.round(skillScore    * 100),
      expScore:      Math.round(expScore      * 100),
      workloadScore: Math.round(workloadScore * 100),
      perfScore:     Math.round(perfScore     * 100),
      onTimeRate:    Math.round(onTimeRate    * 100),
      openTasks,
      yearsExp:      profile?.yearsExperience || 0,
      avgRating:     profile?.avgTaskRating   || 0,
      matchedSkills: reqSkills.filter(s => memberSkills.some(ms => ms.includes(s))),
    },
  };
}

// ─── AUTO-ASSIGN A TASK ───────────────────────────────────────────────────────
async function autoAssignTask(taskId, projectId) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    const members = await prisma.projectMember.findMany({
      where:   { projectId },
      include: { user: { include: { profile: true } } },
    });
    if (!members.length) return null;

    const scores = await Promise.all(members.map(m => scoreMember(m.user, task)));
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    const updated = await prisma.task.update({
      where:   { id: taskId },
      data:    { assigneeId: best.memberId, autoAssigned: true, assignmentScore: best.score },
      include: { assignee: { select: { id:true, name:true, email:true, avatar:true, color:true } }, project: { select: { id:true, name:true } } },
    });

    // Update workload count
    await prisma.employeeProfile.updateMany({
      where: { userId: best.memberId },
      data:  { currentWorkload: { increment: 1 } },
    });

    // Notify assignee
    await prisma.notification.create({
      data: {
        userId:  best.memberId,
        type:    "TASK_ASSIGNED",
        title:   "🤖 Task auto-assigned to you",
        message: `"${task.title}" was assigned by AI based on your skills (${best.breakdown.matchedSkills.join(", ") || "domain match"}) and availability.`,
      },
    });

    console.log(`[AutoAssign] "${task.title}" → ${best.memberName} (score: ${best.score})`);
    return { task: updated, scores, assignedTo: best };
  } catch (err) {
    console.error("[AutoAssign] Error:", err.message);
    return null;
  }
}

// ─── SUGGEST ASSIGNMENT (without assigning) ───────────────────────────────────
async function suggestAssignment(taskId, projectId) {
  const task    = await prisma.task.findUnique({ where: { id: taskId } });
  const members = await prisma.projectMember.findMany({
    where:   { projectId },
    include: { user: { include: { profile: true } } },
  });

  const scores = await Promise.all(members.map(m => scoreMember(m.user, task)));
  scores.sort((a, b) => b.score - a.score);

  const prompt = `Task: "${task.title}" requires: ${(task.requiredSkills || task.tags || []).join(", ")}

Top 3 candidates:
${scores.slice(0,3).map((s,i) =>
  `${i+1}. ${s.memberName} (${s.role}) — score: ${s.score} | skills: ${s.breakdown.skillScore}% | ${s.breakdown.yearsExp}yrs exp | ${s.breakdown.openTasks} open tasks | rating: ${s.breakdown.avgRating}⭐ | on-time: ${s.breakdown.onTimeRate}%`
).join("\n")}

In 2 sentences explain why ${scores[0].memberName} is the best fit for this task.`;

  const explanation = await gemini(prompt);
  return { scores, recommended: scores[0], explanation };
}

module.exports = { autoAssignTask, suggestAssignment, scoreMember };