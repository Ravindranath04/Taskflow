// src/jobs/escalationEngine.js
// Runs every hour — escalates overdue tasks automatically

const prisma = require("../lib/prisma");
const { autoAssignTask } = require("../lib/assignmentEngine");

// ─── ESCALATION RULES ─────────────────────────────────────────────────────────
const RULES = [
  {
    name:       "7-day re-assign",
    daysOverdue: 7,
    action:     "REASSIGN",
    message:    (task, member) => `Task "${task.title}" was overdue for 7 days and has been auto-reassigned.`,
  },
  {
    name:       "3-day PM alert",
    daysOverdue: 3,
    action:     "NOTIFY_PM",
    message:    (task) => `⚠️ Task "${task.title}" is 3+ days overdue and needs your attention.`,
  },
  {
    name:       "1-day reminder",
    daysOverdue: 1,
    action:     "REMIND_ASSIGNEE",
    message:    (task) => `⏰ Reminder: "${task.title}" is overdue. Please update its status.`,
  },
];

const CRITICAL_STALE_HOURS = 48; // 2 days

// ─── RUN ESCALATION CHECK ─────────────────────────────────────────────────────
async function runEscalationCheck() {
  console.log("[Escalation] Running hourly check...");
  const now = new Date();
  let actionsCount = 0;

  // ── 1. Overdue tasks ──────────────────────────────────────────────────────
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status:  { notIn: ["DONE"] },
    },
    include: {
      assignee: true,
      project:  { include: { members: { include: { user: true } } } },
    },
  });

  for (const task of overdueTasks) {
    const daysOverdue = Math.floor((now - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));

    // Apply highest applicable rule
    const rule = RULES.find(r => daysOverdue >= r.daysOverdue);
    if (!rule) continue;

    // Check if we already sent this notification recently (avoid spam)
    const recentNotif = await prisma.notification.findFirst({
      where: {
        message: { contains: task.title },
        type:    rule.action,
        createdAt: { gt: new Date(now - 23 * 60 * 60 * 1000) }, // within last 23h
      },
    });
    if (recentNotif) continue;

    if (rule.action === "REASSIGN" && task.projectId) {
      // Auto-reassign to best available member
      await autoAssignTask(task.id, task.projectId);

      // Notify old assignee
      if (task.assigneeId) {
        await prisma.notification.create({
          data: {
            userId:  task.assigneeId,
            type:    "REASSIGN",
            title:   "Task re-assigned due to overdue",
            message: rule.message(task),
          },
        });
      }
      actionsCount++;

    } else if (rule.action === "NOTIFY_PM") {
      // Notify project admins/owners
      const admins = task.project.members.filter(m => m.role === "owner" || m.user.role === "ADMIN");
      const targets = admins.length > 0 ? admins : task.project.members.slice(0, 1);
      await Promise.all(targets.map(m =>
        prisma.notification.create({
          data: {
            userId:  m.userId,
            type:    "NOTIFY_PM",
            title:   "Overdue task needs attention",
            message: rule.message(task),
          },
        })
      ));
      actionsCount++;

    } else if (rule.action === "REMIND_ASSIGNEE" && task.assigneeId) {
      await prisma.notification.create({
        data: {
          userId:  task.assigneeId,
          type:    "REMIND_ASSIGNEE",
          title:   "Task overdue reminder",
          message: rule.message(task),
        },
      });
      actionsCount++;
    }

    console.log(`[Escalation] ${rule.name} → "${task.title}" (${daysOverdue}d overdue)`);
  }

  // ── 2. Upcoming deadlines ───────────────────────────────────────────────
  const soonThreshold = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const upcomingTasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: soonThreshold },
      status:  { notIn: ["DONE"] },
    },
    include: {
      assignee: true,
      project:  { include: { members: { include: { user: true } } } },
    },
  });

  for (const task of upcomingTasks) {
    const daysLeft = Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24));
    const ruleType = daysLeft <= 1 ? "TASK_DUE_TODAY" : "TASK_DUE_SOON";
    const message = `⏰ Task "${task.title}" is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;

    const recentNotif = await prisma.notification.findFirst({
      where: {
        message:   { contains: task.title },
        type:      ruleType,
        createdAt: { gt: new Date(now - 23 * 60 * 60 * 1000) },
      },
    });
    if (recentNotif) continue;

    const recipientIds = task.assigneeId
      ? [task.assigneeId]
      : task.project.members.filter(m => m.role === "owner" || m.user.role === "ADMIN").map(m => m.userId);

    if (recipientIds.length > 0) {
      await Promise.all(recipientIds.map(userId =>
        prisma.notification.create({
          data: {
            userId,
            type: ruleType,
            title: daysLeft <= 1 ? "Task due soon" : "Upcoming task deadline",
            message,
          },
        })
      ));
      actionsCount++;
      console.log(`[Escalation] ${ruleType} → "${task.title}" (${daysLeft}d left)`);
    }
  }

  // ── 3. Upcoming project deadlines ───────────────────────────────────────
  const projectThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingProjects = await prisma.project.findMany({
    where: {
      deadline: { gte: now, lte: projectThreshold },
      status:   { not: "COMPLETED" },
    },
    include: {
      owner: true,
      members: { include: { user: true } },
    },
  });

  for (const project of upcomingProjects) {
    const daysLeft = Math.ceil((new Date(project.deadline) - now) / (1000 * 60 * 60 * 24));
    const type = daysLeft <= 1 ? "PROJECT_DEADLINE_TODAY" : "PROJECT_DEADLINE_SOON";
    const message = `📅 Project "${project.name}" deadline is in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;

    const recentNotif = await prisma.notification.findFirst({
      where: {
        message:   { contains: project.name },
        type,
        createdAt: { gt: new Date(now - 23 * 60 * 60 * 1000) },
      },
    });
    if (recentNotif) continue;

    const recipients = [project.ownerId, ...project.members.map(m => m.userId)];
    await Promise.all(recipients.map(userId =>
      prisma.notification.create({
        data: {
          userId,
          type,
          title: daysLeft <= 1 ? "Project deadline today" : "Project deadline soon",
          message,
        },
      })
    ));
    actionsCount++;
    console.log(`[Escalation] ${type} → "${project.name}" (${daysLeft}d left)`);
  }

  // ── 4. Stale critical tasks ───────────────────────────────────────────────
  const staleThreshold = new Date(now - CRITICAL_STALE_HOURS * 60 * 60 * 1000);
  const staleCritical = await prisma.task.findMany({
    where: {
      priority:  "CRITICAL",
      status:    { notIn: ["DONE"] },
      updatedAt: { lt: staleThreshold },
    },
    include: {
      assignee: true,
      project:  { include: { members: { include: { user: true }, where: { role: "owner" } } } },
    },
  });

  for (const task of staleCritical) {
    // Flag in dashboard via notification
    const owners = task.project.members;
    if (owners.length > 0) {
      const recent = await prisma.notification.findFirst({
        where: {
          message:   { contains: task.title },
          type:      "STALE_CRITICAL",
          createdAt: { gt: new Date(now - 23 * 60 * 60 * 1000) },
        },
      });
      if (recent) continue;

      await prisma.notification.create({
        data: {
          userId:  owners[0].userId,
          type:    "STALE_CRITICAL",
          title:   "🔴 Critical task has no activity",
          message: `"${task.title}" is marked CRITICAL but hasn't been updated in ${CRITICAL_STALE_HOURS}+ hours.`,
        },
      });
      actionsCount++;
      console.log(`[Escalation] Stale critical → "${task.title}"`);
    }
  }

  console.log(`[Escalation] Done. ${actionsCount} actions taken.`);
  return { actionsCount, overdueChecked: overdueTasks.length, staleCritical: staleCritical.length };
}

// ─── SCHEDULE (runs every hour) ───────────────────────────────────────────────
function scheduleEscalationJob() {
  console.log("[Escalation] Hourly job scheduled");
  runEscalationCheck(); // run immediately on startup
  setInterval(runEscalationCheck, 60 * 60 * 1000); // then every hour
}

module.exports = { runEscalationCheck, scheduleEscalationJob };