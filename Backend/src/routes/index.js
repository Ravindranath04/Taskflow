// src/routes/index.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth");

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = require("../controllers/authController");
router.post("/auth/register", auth.register);
router.post("/auth/login",    auth.login);
router.post("/auth/refresh",  auth.refresh);
router.post("/auth/logout",   auth.logout);
router.get ("/auth/me",       authenticate, auth.me);

// ── Users ─────────────────────────────────────────────────────────────────────
const users = require("../controllers/userController");
router.get  ("/users/team",     authenticate, users.getTeam);
router.get  ("/users/me/stats", authenticate, users.myStats);
router.patch("/users/me",       authenticate, users.updateProfile);

// ── Projects ──────────────────────────────────────────────────────────────────
const projects = require("../controllers/projectController");
router.get   ("/projects",                     authenticate, projects.getAll);
router.post  ("/projects",                     authenticate, projects.create);
router.get   ("/projects/:id",                 authenticate, projects.getOne);
router.patch ("/projects/:id",                 authenticate, projects.update);
router.delete("/projects/:id",                 authenticate, projects.remove);
router.post  ("/projects/:id/members",         authenticate, projects.addMember);
router.delete("/projects/:id/members/:userId", authenticate, projects.removeMember);

// ── Tasks ─────────────────────────────────────────────────────────────────────
const tasks = require("../controllers/taskController");
router.get   ("/tasks/my",                  authenticate, tasks.getMyTasks);
router.get   ("/tasks/:id",                 authenticate, tasks.getOne);
router.patch ("/tasks/:id",                 authenticate, tasks.update);
router.patch ("/tasks/:id/status",          authenticate, tasks.updateStatus);
router.delete("/tasks/:id",                 authenticate, tasks.remove);
router.post  ("/tasks/:id/comments",        authenticate, tasks.addComment);
router.get   ("/projects/:projectId/tasks", authenticate, tasks.getByProject);
router.post  ("/projects/:projectId/tasks", authenticate, tasks.create);

// ── AI + Smart Features ───────────────────────────────────────────────────────
const ai = require("../controllers/aiController");
router.post ("/ai/chat",                      authenticate, ai.chat);
router.post ("/ai/generate-tasks",            authenticate, ai.generateTasks);
router.post ("/ai/auto-assign/:taskId",       authenticate, ai.autoAssign);
router.get  ("/ai/suggest-assign/:taskId",    authenticate, ai.suggestAssign);
router.post ("/ai/summarize/:projectId",      authenticate, ai.summarize);
router.post ("/ai/analyse/:projectId",        authenticate, ai.analyseRisk);
router.post ("/ai/run-escalation",            authenticate, ai.triggerEscalation);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get  ("/notifications",          authenticate, ai.getNotifications);
router.patch("/notifications/read-all", authenticate, ai.markAllRead);
router.patch("/notifications/:id/read", authenticate, ai.markRead);

module.exports = router;