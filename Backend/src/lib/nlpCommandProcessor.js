// src/lib/nlpCommandProcessor.js
// Parses Claude's reply for ACTION: commands and executes them on the database

const prisma = require("./prisma");
const { autoAssignTask } = require("./assignmentEngine");

// ─── COMMAND PATTERNS ─────────────────────────────────────────────────────────
// Claude is prompted to reply with ACTION: lines when it detects a command
// Format: ACTION: COMMAND_TYPE | param1 | param2

const COMMAND_SYSTEM_PROMPT = `You are TaskFlow's AI assistant. You answer questions AND execute commands.

When the user gives a command, respond with:
1. A brief natural language confirmation
2. One or more ACTION: lines for the system to execute

ACTION formats:
ACTION: ASSIGN_TASK | taskId:<id> | userId:<id>
ACTION: MOVE_TASK   | taskId:<id> | status:TODO|IN_PROGRESS|REVIEW|DONE
ACTION: ASSIGN_ALL_UNASSIGNED | projectId:<id> | role:<role>
ACTION: MOVE_ALL    | fromStatus:REVIEW | toStatus:DONE | projectId:<id>
ACTION: CREATE_SPRINT | projectId:<id> | count:5
ACTION: REASSIGN_OVERLOADED | projectId:<id>

Examples:
User: "Assign all unassigned backend tasks to Arjun"
→ ACTION: ASSIGN_ALL_UNASSIGNED | projectId:p1 | filterTag:backend | userId:m2

User: "Move everything in review to done"  
→ ACTION: MOVE_ALL | fromStatus:REVIEW | toStatus:DONE | projectId:p1

User: "Create a sprint with the 5 highest priority tasks"
→ ACTION: CREATE_SPRINT | projectId:p1 | count:5

Always include the ACTION: line even if the task requires looking up data first.
For "who is closest to finishing" type questions — answer in text, no ACTION needed.`;

// ─── PARSE ACTION LINES FROM AI RESPONSE ─────────────────────────────────────
function parseActions(text) {
  return text.split("\n")
    .filter(l => l.trim().startsWith("ACTION:"))
    .map(line => {
      const parts = line.replace("ACTION:", "").split("|").map(s => s.trim());
      const command = parts[0];
      const params  = {};
      parts.slice(1).forEach(p => {
        const [k, v] = p.split(":").map(s => s.trim());
        if (k && v) params[k] = v;
      });
      return { command, params };
    });
}

// ─── EXECUTE A PARSED COMMAND ─────────────────────────────────────────────────
async function executeCommand(action, projectId) {
  const { command, params } = action;
  const results = [];

  try {
    switch (command) {

      case "ASSIGN_TASK": {
        const task = await prisma.task.update({
          where: { id: params.taskId },
          data:  { assigneeId: params.userId },
          include: { assignee: { select: { name:true } } },
        });
        results.push(`✓ Assigned "${task.title}" to ${task.assignee?.name}`);
        break;
      }

      case "MOVE_TASK": {
        const statusMap = { TODO:"TODO", IN_PROGRESS:"IN_PROGRESS", REVIEW:"REVIEW", DONE:"DONE" };
        const task = await prisma.task.update({
          where: { id: params.taskId },
          data:  { status: statusMap[params.status] || params.status },
        });
        results.push(`✓ Moved "${task.title}" to ${params.status}`);
        break;
      }

      case "ASSIGN_ALL_UNASSIGNED": {
        const pid = params.projectId || projectId;
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
        if (tasks.length === 0) results.push("No unassigned tasks found matching criteria");
        break;
      }

      case "MOVE_ALL": {
        const pid = params.projectId || projectId;
        const tasks = await prisma.task.findMany({
          where: { projectId: pid, status: params.fromStatus },
        });
        await prisma.task.updateMany({
          where: { projectId: pid, status: params.fromStatus },
          data:  { status: params.toStatus },
        });
        results.push(`✓ Moved ${tasks.length} tasks from ${params.fromStatus} → ${params.toStatus}`);
        break;
      }

      case "CREATE_SPRINT": {
        const pid   = params.projectId || projectId;
        const count = parseInt(params.count) || 5;
        const priorityOrder = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
        const tasks = await prisma.task.findMany({
          where: { projectId: pid, status: "TODO" },
        });
        tasks.sort((a, b) => (priorityOrder[a.priority]||9) - (priorityOrder[b.priority]||9));
        const sprintTasks = tasks.slice(0, count);
        await prisma.task.updateMany({
          where: { id: { in: sprintTasks.map(t => t.id) } },
          data:  { status: "IN_PROGRESS" },
        });
        results.push(`✓ Sprint created with ${sprintTasks.length} tasks moved to In Progress:`);
        sprintTasks.forEach(t => results.push(`  • ${t.title} (${t.priority})`));
        break;
      }

      case "REASSIGN_OVERLOADED": {
        const pid = params.projectId || projectId;
        const members = await prisma.projectMember.findMany({
          where: { projectId: pid },
          include: { user: true },
        });
        for (const m of members) {
          const count = await prisma.task.count({
            where: { assigneeId: m.userId, status: { not: "DONE" } },
          });
          if (count >= 6) {
            // Move 2 tasks to auto-assign
            const tasks = await prisma.task.findMany({
              where: { assigneeId: m.userId, status: "TODO" },
              take: 2,
            });
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
    results.push(`✗ Error executing ${command}: ${err.message}`);
  }

  return results;
}

// ─── MAIN: PROCESS USER MESSAGE ───────────────────────────────────────────────
async function processNLPCommand(message, projectId, history = []) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Get project context for Claude
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks:   { where: { status: { not: "DONE" } }, select: { id:true, title:true, status:true, priority:true, assigneeId:true, tags:true } },
      members: { include: { user: { select: { id:true, name:true, role:true } } } },
    },
  });

  const context = project ? `
Project: ${project.name}
Members: ${project.members.map(m => `${m.user.name}(id:${m.user.id},role:${m.user.role})`).join(", ")}
Open tasks: ${project.tasks.map(t => `"${t.title}"(id:${t.id},status:${t.status},priority:${t.priority},assignee:${t.assigneeId||"none"})`).join("; ")}
` : "";

  const res = await client.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 600,
    system:     COMMAND_SYSTEM_PROMPT + context,
    messages:   [...history.slice(-6), { role:"user", content: message }],
  });

  const reply   = res.content[0].text;
  const actions = parseActions(reply);

  // Execute all detected actions
  const executionResults = [];
  for (const action of actions) {
    const results = await executeCommand(action, projectId);
    executionResults.push(...results);
  }

  // Strip ACTION: lines from the user-visible reply
  const cleanReply = reply.split("\n")
    .filter(l => !l.trim().startsWith("ACTION:"))
    .join("\n").trim();

  return {
    reply:    cleanReply,
    actions:  actions.map(a => a.command),
    results:  executionResults,
    executed: actions.length > 0,
  };
}

module.exports = { processNLPCommand, COMMAND_SYSTEM_PROMPT };
