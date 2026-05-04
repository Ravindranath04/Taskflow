// src/controllers/aiController.js
const { z }                    = require("zod");
const prisma                   = require("../lib/prisma");
const { autoAssignTask, suggestAssignment } = require("../lib/assignmentEngine");
const { processNLPCommand }    = require("../lib/nlpCommandProcessor");
const { analyseProject }       = require("../jobs/predictiveAnalytics");
const { runEscalationCheck }   = require("../jobs/escalationEngine");
const Anthropic                = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM = `You are TaskFlow's AI assistant. Help with project management questions, generate tasks, summarize status, and execute commands.
When generating tasks use: TASK: [title] | PRIORITY: [critical/high/medium/low] | TAGS: [tag1,tag2] | DESCRIPTION: [description]`;

// POST /api/ai/chat  — now supports NLP commands
const chat = async (req, res, next) => {
  try {
    const { message, projectId, history = [], executeCommands = true } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    if (executeCommands && projectId) {
      // Use the NLP command processor — detects and executes actions
      const result = await processNLPCommand(message, projectId, history);
      return res.json(result);
    }

    // Plain chat (no command execution)
    const response = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system:     BASE_SYSTEM,
      messages:   [...(history||[]).slice(-10), { role:"user", content: message }],
    });
    res.json({ reply: response.content[0].text, actions: [], results: [], executed: false });
  } catch (err) { next(err); }
};

// POST /api/ai/generate-tasks
const generateTasks = async (req, res, next) => {
  try {
    const { description, projectId, autoAssign = false } = z.object({
      description: z.string().min(5),
      projectId:   z.string(),
      autoAssign:  z.boolean().optional(),
    }).parse(req.body);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role:"user", content: `Generate 5-8 specific tasks for: "${description}". Use TASK: format.` }],
    });

    const text    = response.content[0].text;
    const parsed  = parseTasks(text);

    const created = await Promise.all(parsed.map(async t => {
      const task = await prisma.task.create({
        data: {
          title:       t.title,
          description: t.description || "",
          priority:    t.priority.toUpperCase(),
          tags:        t.tags,
          projectId,
          creatorId:   req.user.id,
        },
        include: { assignee: { select: { id:true, name:true, avatar:true, color:true } } },
      });

      // Auto-assign immediately if requested
      if (autoAssign) await autoAssignTask(task.id, projectId);
      return task;
    }));

    // Broadcast via Socket.io
    const io = req.app.get("io");
    if (io) created.forEach(t => io.to(`project:${projectId}`).emit("task:created", { task: t, projectId }));

    res.status(201).json({ reply: text, tasks: created, count: created.length });
  } catch (err) { next(err); }
};

// POST /api/ai/auto-assign/:taskId
const autoAssign = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const result = await autoAssignTask(req.params.taskId, projectId);
    if (!result) return res.status(400).json({ error: "Could not auto-assign task" });

    // Broadcast update
    const io = req.app.get("io");
    if (io) io.to(`project:${projectId}`).emit("task:updated", { task: result.task, projectId });

    res.json(result);
  } catch (err) { next(err); }
};

// GET /api/ai/suggest-assign/:taskId?projectId=xxx
const suggestAssign = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    const result = await suggestAssignment(req.params.taskId, projectId);
    res.json(result);
  } catch (err) { next(err); }
};

// POST /api/ai/summarize/:projectId
const summarize = async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, members: { some: { userId: req.user.id } } },
      include: { tasks: { select: { title:true, status:true, priority:true, assignee: { select: { name:true } } } }, members: { include: { user: { select: { name:true } } } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const stats      = project.tasks.reduce((a,t) => { a[t.status]=(a[t.status]||0)+1; return a; }, {});
    const critical   = project.tasks.filter(t => t.priority==="CRITICAL" && t.status!=="DONE");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 512,
      messages: [{ role:"user", content: `Summarize in 3-4 sentences:\nProject: ${project.name}\nTasks: ${JSON.stringify(stats)}\nCritical open: ${critical.map(t=>t.title).join(", ")||"None"}\nTeam: ${project.members.map(m=>m.user.name).join(", ")}` }],
    });

    res.json({ summary: response.content[0].text, stats, criticalCount: critical.length });
  } catch (err) { next(err); }
};

// POST /api/ai/analyse/:projectId  — predictive risk analysis
const analyseRisk = async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, members: { some: { userId: req.user.id } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const report = await analyseProject(project);
    res.json(report);
  } catch (err) { next(err); }
};

// POST /api/ai/run-escalation  — manually trigger escalation check (admin only)
const triggerEscalation = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
    const result = await runEscalationCheck();
    res.json(result);
  } catch (err) { next(err); }
};

// GET /api/notifications  — get user's notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take:    50,
    });
    res.json(notifications);
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

function parseTasks(text) {
  return text.split("\n").filter(l => l.includes("TASK:")).map(line => ({
    title:       (line.match(/TASK:\s*([^|]+)/)      ||[])[1]?.trim()||"",
    priority:    (line.match(/PRIORITY:\s*([^|]+)/)  ||[])[1]?.trim().toLowerCase()||"medium",
    description: (line.match(/DESCRIPTION:\s*(.+)/)  ||[])[1]?.trim()||"",
    tags:        ((line.match(/TAGS:\s*([^|]+)/)     ||[])[1]||"").split(",").map(t=>t.trim()).filter(Boolean),
  })).filter(t => t.title);
}

module.exports = { chat, generateTasks, autoAssign, suggestAssign, summarize, analyseRisk, triggerEscalation, getNotifications, markRead, markAllRead };
