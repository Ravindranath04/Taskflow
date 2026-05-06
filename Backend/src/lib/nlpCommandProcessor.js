// src/lib/nlpCommandProcessor.js
// ✅ Uses Google Gemini API (FREE)

const prisma  = require("./prisma");
const { autoAssignTask } = require("./assignmentEngine");

// ─── Gemini helper ────────────────────────────────────────────────────────────
async function gemini(prompt, systemPrompt = "") {
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role:"user", parts:[{ text: (systemPrompt ? systemPrompt + "\n\n" : "") + prompt }] }],
      generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── COMMAND SYSTEM PROMPT ────────────────────────────────────────────────────
const COMMAND_SYSTEM = `You are TaskFlow's AI assistant. You answer questions AND execute project management commands.

When user gives a command, respond with:
1. A brief natural language confirmation
2. ACTION: lines for the system to execute

ACTION formats:
ACTION: ASSIGN_TASK        | taskId:<id> | userId:<id>
ACTION: MOVE_TASK          | taskId:<id> | status:TODO|IN_PROGRESS|REVIEW|DONE
ACTION: ASSIGN_ALL_UNASSIGNED | projectId:<id> | filterTag:<tag> | userId:<id>
ACTION: MOVE_ALL           | fromStatus:REVIEW | toStatus:DONE | projectId:<id>
ACTION: CREATE_PROJECT     | name:<text> | description:<text> | deadline:<YYYY-MM-DD or days_from_now> | color:<hex> | memberEmails:<email1,email2>
ACTION: CREATE_TASK        | projectId:<id> | title:<text> | description:<text> | priority:TODO|IN_PROGRESS|REVIEW|DONE | tags:<tag1,tag2> | dueDate:<YYYY-MM-DD> | deadline:<YYYY-MM-DD or days_from_now> | assigneeId:<id>
ACTION: CREATE_SPRINT      | projectId:<id> | count:5
ACTION: REASSIGN_OVERLOADED| projectId:<id>

Examples:
"Create a new project for website redesign and add the core backlog" → ACTION: CREATE_PROJECT | name:Website Redesign | description:Modernize UI and launch MVP | deadline:30 | color:#4f46e5
"Create a task for a login page and assign it to the best frontend developer" → ACTION: CREATE_TASK | projectId:xxx | title:Login flow UI | description:Build login page and validation | priority:HIGH | tags:frontend,auth | dueDate:2025-06-01

If the user asks to create a task without specifying assigneeId, auto-assign the best available member by experience and workload.
For questions like "who is closest to finishing" — answer in text, no ACTION needed.`;

// ─── PARSE ACTION LINES ───────────────────────────────────────────────────────
function parseActions(text) {
  return text.split("\n")
    .filter(l => l.trim().startsWith("ACTION:"))
    .map(line => {
      const parts   = line.replace("ACTION:", "").split("|").map(s => s.trim());
      const command = parts[0];
      const params  = {};
      parts.slice(1).forEach(p => {
        const [k, ...rest] = p.split(":");
        const v = rest.join(":").trim();
        if (k && v) params[k] = v;
      });
      return { command, params };
    });
}

// ─── EXECUTE ONE COMMAND ──────────────────────────────────────────────────────
async function executeCommand(action, projectId, userId) {
  const { command, params } = action;
  const results = [];

  try {
    switch (command) {

      case "ASSIGN_TASK": {
        const task = await prisma.task.update({
          where:   { id: params.taskId },
          data:    { assigneeId: params.userId },
          include: { assignee: { select: { name:true } } },
        });
        results.push(`✓ Assigned "${task.title}" to ${task.assignee?.name}`);
        break;
      }

      case "MOVE_TASK": {
        const task = await prisma.task.update({
          where: { id: params.taskId },
          data:  { status: params.status },
        });
        results.push(`✓ Moved "${task.title}" to ${params.status}`);
        break;
      }

      case "ASSIGN_ALL_UNASSIGNED": {
        const pid   = params.projectId || projectId;
        const where = { projectId: pid, assigneeId: null, status: { not: "DONE" } };
        if (params.filterTag) where.tags = { has: params.filterTag };

        const tasks = await prisma.task.findMany({ where });
        for (const task of tasks) {
          if (params.userId) {
            await prisma.task.update({ where: { id: task.id }, data: { assigneeId: params.userId } });
            results.push(`✓ Assigned "${task.title}"`);
          } else {
            const res = await autoAssignTask(task.id, pid);
            if (res) results.push(`✓ Auto-assigned "${task.title}" → ${res.assignedTo.memberName}`);
          }
        }
        if (tasks.length === 0) results.push("No unassigned tasks found");
        break;
      }

      case "MOVE_ALL": {
        const pid   = params.projectId || projectId;
        const tasks = await prisma.task.findMany({ where: { projectId: pid, status: params.fromStatus } });
        await prisma.task.updateMany({ where: { projectId: pid, status: params.fromStatus }, data: { status: params.toStatus } });
        results.push(`✓ Moved ${tasks.length} tasks from ${params.fromStatus} → ${params.toStatus}`);
        break;
      }

      case "CREATE_SPRINT": {
        const pid   = params.projectId || projectId;
        const count = parseInt(params.count) || 5;
        const order = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
        const tasks = await prisma.task.findMany({ where: { projectId: pid, status: "TODO" } });
        tasks.sort((a,b) => (order[a.priority]||9) - (order[b.priority]||9));
        const sprint = tasks.slice(0, count);
        await prisma.task.updateMany({ where: { id: { in: sprint.map(t=>t.id) } }, data: { status: "IN_PROGRESS" } });
        results.push(`✓ Sprint created — ${sprint.length} tasks moved to In Progress:`);
        sprint.forEach(t => results.push(`  • ${t.title} (${t.priority})`));
        break;
      }

      case "CREATE_PROJECT": {
        const parseDateField = (value) => {
          if (!value) return null;
          const trimmed = value.trim();
          const numeric = Number(trimmed);
          if (!Number.isNaN(numeric) && /^\d+$/.test(trimmed)) {
            const d = new Date();
            d.setDate(d.getDate() + numeric);
            return d;
          }
          const parsed = new Date(trimmed);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        const projectData = {
          name:        params.name || "New project",
          description: params.description || "",
          color:       params.color || "#7C3AED",
          deadline:    parseDateField(params.deadline),
        };

        if (!projectData.name) {
          results.push("✗ CREATE_PROJECT requires a name.");
          break;
        }
        if (!userId) {
          results.push("✗ CREATE_PROJECT requires an authenticated user.");
          break;
        }

        const project = await prisma.project.create({
          data: {
            name:        projectData.name,
            description: projectData.description,
            color:       projectData.color,
            deadline:    projectData.deadline,
            ownerId:     userId,
            members:     { create: [{ userId, role: "owner" }] },
          },
        });

        if (params.memberEmails) {
          const emails = params.memberEmails.split(",").map(e => e.trim()).filter(Boolean);
          for (const email of emails) {
            const user = await prisma.user.findUnique({ where: { email } });
            if (user) {
              await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id } });
            }
          }
        }

        results.push(`✓ Created project "${project.name}" with id ${project.id}`);
        break;
      }

      case "CREATE_TASK": {
        const parseDateField = (value) => {
          if (!value) return null;
          const trimmed = value.trim();
          const numeric = Number(trimmed);
          if (!Number.isNaN(numeric) && /^\d+$/.test(trimmed)) {
            const d = new Date();
            d.setDate(d.getDate() + numeric);
            return d;
          }
          const parsed = new Date(trimmed);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        const taskData = {
          title:       params.title || "New task",
          description: params.description || "",
          priority:    params.priority || "MEDIUM",
          tags:        params.tags ? params.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          projectId:   params.projectId || projectId,
          dueDate:     parseDateField(params.dueDate) || parseDateField(params.deadline),
        };

        if (!taskData.projectId) {
          results.push("✗ CREATE_TASK requires a valid projectId.");
          break;
        }

        const project = await prisma.project.findUnique({ where: { id: taskData.projectId } });
        if (!project) {
          results.push(`✗ CREATE_TASK invalid projectId: ${taskData.projectId}`);
          break;
        }

        if (!userId) {
          results.push("✗ CREATE_TASK requires an authenticated user.");
          break;
        }

        const task = await prisma.task.create({
          data: {
            title:       taskData.title,
            description: taskData.description,
            priority:    taskData.priority,
            tags:        taskData.tags,
            projectId:   taskData.projectId,
            creatorId:   userId,
            dueDate:     taskData.dueDate,
            assigneeId:  params.assigneeId || null,
          },
          include: { assignee: { select: { name:true } }, project: { select: { id:true, name:true } } },
        });

        if (!params.assigneeId) {
          const res = await autoAssignTask(task.id, taskData.projectId);
          if (res) {
            results.push(`✓ Created and auto-assigned "${task.title}" to ${res.assignedTo.memberName}`);
          } else {
            results.push(`✓ Created "${task.title}" but auto-assignment failed.`);
          }
        } else {
          results.push(`✓ Created and assigned "${task.title}" to provided user`);
        }
        break;
      }

      case "REASSIGN_OVERLOADED": {
        const pid     = params.projectId || projectId;
        const members = await prisma.projectMember.findMany({ where: { projectId: pid }, include: { user: true } });
        for (const m of members) {
          const count = await prisma.task.count({ where: { assigneeId: m.userId, status: { not: "DONE" } } });
          if (count >= 6) {
            const tasks = await prisma.task.findMany({ where: { assigneeId: m.userId, status: "TODO" }, take: 2 });
            for (const task of tasks) {
              await prisma.task.update({ where: { id: task.id }, data: { assigneeId: null } });
              const res = await autoAssignTask(task.id, pid);
              if (res && res.assignedTo.memberId !== m.userId) {
                results.push(`✓ Moved "${task.title}" from ${m.user.name} → ${res.assignedTo.memberName}`);
              }
            }
          }
        }
        if (results.length === 0) results.push("No overloaded members found");
        break;
      }

      default:
        results.push(`Unknown command: ${command}`);
    }
  } catch (err) {
    results.push(`✗ Error in ${command}: ${err.message}`);
  }

  return results;
}

// ─── MAIN: PROCESS USER MESSAGE ───────────────────────────────────────────────
async function processNLPCommand(message, projectId, history = [], userId) {
  // Build context
  const project = await prisma.project.findUnique({
    where:   { id: projectId },
    include: {
      tasks:   { where: { status: { not: "DONE" } }, select: { id:true, title:true, status:true, priority:true, assigneeId:true, tags:true } },
      members: { include: { user: { select: { id:true, name:true, role:true } } } },
    },
  });

  const context = project ? `
Current project: ${project.name}
Members: ${project.members.map(m=>`${m.user.name}(id:${m.user.id},role:${m.user.role})`).join(", ")}
Open tasks: ${project.tasks.map(t=>`"${t.title}"(id:${t.id},status:${t.status},priority:${t.priority},assignee:${t.assigneeId||"none"})`).join("; ")}
` : "";

  const historyText = (history || []).slice(-6).map(m => `${m.role==="user"?"User":"Assistant"}: ${m.content}`).join("\n");
  const fullPrompt  = `${context}\n${historyText ? historyText + "\n" : ""}User: ${message}`;

  const reply   = await gemini(fullPrompt, COMMAND_SYSTEM);
  const actions = parseActions(reply);

  // Execute all detected actions
  const executionResults = [];
  for (const action of actions) {
    const res = await executeCommand(action, projectId, userId);
    executionResults.push(...res);
  }

  // Strip ACTION: lines from visible reply
  const cleanReply = reply.split("\n").filter(l => !l.trim().startsWith("ACTION:")).join("\n").trim();

  return {
    reply:    cleanReply,
    actions:  actions.map(a => a.command),
    results:  executionResults,
    executed: actions.length > 0,
  };
}

module.exports = { processNLPCommand };