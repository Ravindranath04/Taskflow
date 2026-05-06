// src/controllers/aiController.js
// ✅ Uses Google Gemini API (FREE)

const { z }                  = require("zod");
const prisma                 = require("../lib/prisma");
const { autoAssignTask, suggestAssignment } = require("../lib/assignmentEngine");
const { processNLPCommand }  = require("../lib/nlpCommandProcessor");
const { analyseProject }     = require("../jobs/predictiveAnalytics");
const { runEscalationCheck } = require("../jobs/escalationEngine");

// ─── Gemini client helper ─────────────────────────────────────────────────────
async function gemini(prompt, systemPrompt = "", maxTokens = 1000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    contents: [
      { role: "user", parts: [{ text: (systemPrompt ? systemPrompt + "\n\n" : "") + prompt }] }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

const BASE_SYSTEM = `You are TaskFlow's AI assistant. Help with project management questions, generate tasks, summarize status, and execute commands.
When generating tasks use: TASK: [title] | PRIORITY: [critical/high/medium/low] | TAGS: [tag1,tag2] | DESCRIPTION: [description] | DEADLINE: [days_from_now or YYYY-MM-DD] | SKILLS: [skill1,skill2] | DOMAINS: [domain1,domain2]
Always choose a realistic deadline based on the task size and urgency. Prefer shorter deadlines for critical items and at least 3-5 days for medium work. Include the most relevant required skills, domains, and tags for each task.`;

// ─── PARSE TASK LINES ─────────────────────────────────────────────────────────
function parseTasks(text) {
  return text.split("\n").filter(l => l.includes("TASK:")).map(line => {
    const deadlineText = (line.match(/DEADLINE:\s*([^|]+)/) || [])[1]?.trim();
    let dueDate = null;
    if (deadlineText) {
      const days = parseInt(deadlineText, 10);
      if (!Number.isNaN(days)) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
      } else if (!Number.isNaN(Date.parse(deadlineText))) {
        dueDate = new Date(deadlineText);
      }
    }

    const skills = ((line.match(/SKILLS?:\s*([^|]+)/i) || [])[1] || "").split(",").map(t => t.trim()).filter(Boolean);
    const domains = ((line.match(/DOMAINS?:\s*([^|]+)/i) || [])[1] || "").split(",").map(t => t.trim()).filter(Boolean);
    const tags = ((line.match(/TAGS:\s*([^|]+)/i) || [])[1] || "").split(",").map(t => t.trim()).filter(Boolean);

    return {
      title:       (line.match(/TASK:\s*([^|]+)/)       || [])[1]?.trim() || "",
      priority:    (line.match(/PRIORITY:\s*([^|]+)/)   || [])[1]?.trim().toLowerCase() || "medium",
      description: (line.match(/DESCRIPTION:\s*([^|]+)/)   || [])[1]?.trim() || "",
      tags,
      requiredSkills: skills.length ? skills : tags,
      requiredDomains: domains,
      dueDate,
    };
  }).filter(t => t.title);
}

function parseTaskMetadata(text) {
  const jsonMatch = text.match(/({[\s\S]*})/);
  if (jsonMatch) {
    try {
      const cleaned = jsonMatch[1]
        .replace(/\b(\w+)\s*:/g, '"$1":')
        .replace(/'/g, '"');
      return JSON.parse(cleaned);
    } catch (err) {
      // fallback to manual parsing below
    }
  }

  const skills = ((text.match(/SKILLS?:\s*([^\n]+)/i) || [])[1] || "")
    .split(/,|;/).map(t => t.trim()).filter(Boolean);
  const domains = ((text.match(/DOMAINS?:\s*([^\n]+)/i) || [])[1] || "")
    .split(/,|;/).map(t => t.trim()).filter(Boolean);
  const complexity = (text.match(/COMPLEXITY:\s*([^\n]+)/i) || [])[1]?.trim() || "Medium";
  const effortEstimate = (text.match(/EFFORT(?: ESTIMATE)?:\s*([^\n]+)/i) || [])[1]?.trim() || "Medium";
  return {
    requiredSkills: skills,
    requiredDomains: domains,
    complexity,
    effortEstimate,
  };
}

// ─── POST /api/ai/parse-task ──────────────────────────────────────────────────
const parseTask = async (req, res, next) => {
  try {
    const { text } = z.object({ text: z.string().min(5) }).parse(req.body);
    const prompt = `Extract the task metadata from this description and return a JSON object containing: requiredSkills, requiredDomains, complexity, effortEstimate. Use arrays for skills/domains and simple strings for complexity and effort. Do not add extra explanation.\n\nTask description: "${text}"`;
    const output = await gemini(prompt, BASE_SYSTEM);
    const parsed = parseTaskMetadata(output);
    res.json({ raw: output, parsed });
  } catch (err) { next(err); }
};

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message, projectId, history = [], executeCommands = true } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    let projectContext = "";
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: { include: { user: { select: { id:true, name:true, email:true, role:true, profile: true } } } },
          tasks:   { select: { id:true, title:true, status:true, priority:true, assigneeId:true } },
        },
      });
      if (project) {
        const memberLines = project.members.map(m => {
          const user = m.user;
          const title = user.profile?.title || user.role || "Team Member";
          const skills = (user.profile?.skills || []).join(", ") || "N/A";
          return `- ${user.name} | role: ${title} | account role: ${user.role} | email: ${user.email} | skills: ${skills}`;
        }).join("\n");
        const taskLines = project.tasks.map(t => `"${t.title}" (${t.status}, priority:${t.priority}, assignee:${t.assigneeId || "unassigned"})`).join("; ") || "None";
        projectContext = `Project: ${project.name}\nTeam members:\n${memberLines}\nOpen tasks: ${taskLines}`;
      }
    }

    if (executeCommands && projectId) {
      const result = await processNLPCommand(message, projectId, history, req.user.id);
      return res.json(result);
    }

    const historyText = (history || []).slice(-6).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const fullPrompt = `${projectContext}${projectContext ? "\n\n" : ""}${historyText ? historyText + "\n" : ""}User: ${message}`;
    const systemPrompt = `${BASE_SYSTEM}\nWhen asked about team members or roles, use the provided project member list exactly. If the user asks who is backend engineer or devops engineer, answer from the team members and include their email if relevant.`;
    const reply       = await gemini(fullPrompt, systemPrompt);
    res.json({ reply, actions: [], results: [], executed: false });
  } catch (err) { next(err); }
};

// ─── POST /api/ai/generate-tasks ─────────────────────────────────────────────
const generateTasks = async (req, res, next) => {
  try {
    const { description, projectId, autoAssign = true } = z.object({
      description: z.string().min(5),
      projectId:   z.string(),
      autoAssign:  z.boolean().optional(),
    }).parse(req.body);

    const text   = await gemini(`Generate 5-8 specific actionable tasks for: "${description}". Use TASK: format and include realistic deadlines in days, required skills, and domains.`, BASE_SYSTEM);
    const parsed = parseTasks(text);

    const created = await Promise.all(parsed.map(async t => {
      const task = await prisma.task.create({
        data: {
          title:          t.title,
          description:    t.description || "",
          priority:       t.priority.toUpperCase(),
          tags:           t.tags,
          requiredSkills: t.requiredSkills,
          requiredDomains:t.requiredDomains,
          dueDate:        t.dueDate || null,
          projectId,
          creatorId:      req.user.id,
        },
        include: { assignee: { select: { id:true, name:true, avatar:true, color:true } } },
      });
      if (autoAssign) await autoAssignTask(task.id, projectId);
      return task;
    }));

    const io = req.app.get("io");
    if (io) created.forEach(t => io.to(`project:${projectId}`).emit("task:created", { task: t, projectId }));

    res.status(201).json({ reply: text, tasks: created, count: created.length });
  } catch (err) { next(err); }
};

// ─── POST /api/ai/create-project ───────────────────────────────────────────
const createProject = async (req, res, next) => {
  try {
    const { name, description, color, deadline, memberEmails } = z.object({
      name:         z.string().min(1).max(100),
      description:  z.string().optional(),
      color:        z.string().optional(),
      deadline:     z.string().optional().nullable(),
      memberEmails: z.string().optional(),
    }).parse(req.body);

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        color:       color || "#7C3AED",
        deadline:    deadline ? new Date(deadline) : null,
        ownerId:     req.user.id,
        members:     { create: [{ userId: req.user.id, role: "owner" }] },
      },
    });

    if (memberEmails) {
      const emails = memberEmails.split(",").map(e => e.trim()).filter(Boolean);
      for (const email of emails) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && user.id !== req.user.id) {
          await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id } });
        }
      }
    }

    res.status(201).json(project);
  } catch (err) { next(err); }
};

// ─── POST /api/ai/auto-assign/:taskId ────────────────────────────────────────
const autoAssign = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required to auto-assign tasks" });
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    const result = await autoAssignTask(req.params.taskId, projectId);
    if (!result) return res.status(400).json({ error: "Could not auto-assign task" });
    const io = req.app.get("io");
    if (io) io.to(`project:${projectId}`).emit("task:updated", { task: result.task, projectId });
    res.json(result);
  } catch (err) { next(err); }
};

// ─── GET /api/ai/suggest-assign/:taskId ──────────────────────────────────────
const suggestAssign = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    const result = await suggestAssignment(req.params.taskId, projectId);
    res.json(result);
  } catch (err) { next(err); }
};

// ─── POST /api/ai/summarize/:projectId ───────────────────────────────────────
const summarize = async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where:   { id: req.params.projectId, members: { some: { userId: req.user.id } } },
      include: {
        tasks:   { select: { title:true, status:true, priority:true, assignee: { select: { name:true } } } },
        members: { include: { user: { select: { name:true } } } },
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const stats    = project.tasks.reduce((a,t) => { a[t.status]=(a[t.status]||0)+1; return a; }, {});
    const critical = project.tasks.filter(t => t.priority==="CRITICAL" && t.status!=="DONE");

    const summary = await gemini(
      `Summarize in 3-4 sentences:\nProject: ${project.name}\nTasks: ${JSON.stringify(stats)}\nCritical open: ${critical.map(t=>t.title).join(", ")||"None"}\nTeam: ${project.members.map(m=>m.user.name).join(", ")}`
    );

    res.json({ summary, stats, criticalCount: critical.length });
  } catch (err) { next(err); }
};

// ─── POST /api/ai/analyse/:projectId ─────────────────────────────────────────
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

// ─── POST /api/ai/run-escalation ─────────────────────────────────────────────
const triggerEscalation = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
    const result = await runEscalationCheck();
    res.json(result);
  } catch (err) { next(err); }
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
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

const markRead = async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { chat, generateTasks, parseTask, createProject, autoAssign, suggestAssign, summarize, analyseRisk, triggerEscalation, getNotifications, markRead, markAllRead, gemini };