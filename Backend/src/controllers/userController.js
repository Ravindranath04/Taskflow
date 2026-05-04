const { z } = require("zod");
const prisma = require("../lib/prisma");

// GET /api/users/team  — all users (for assignment dropdowns)
const getTeam = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, avatar: true, color: true, role: true,
        _count: { select: { assignedTasks: { where: { status: { not: "DONE" } } } } },
      },
      orderBy: { name: "asc" },
    });
    res.json(users.map(u => ({ ...u, openTasks: u._count.assignedTasks })));
  } catch (err) { next(err); }
};

// GET /api/users/me/stats
const myStats = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      select: { status: true, priority: true },
    });

    const byStatus   = tasks.reduce((a,t) => { a[t.status]=(a[t.status]||0)+1; return a; }, {});
    const byPriority = tasks.reduce((a,t) => { a[t.priority]=(a[t.priority]||0)+1; return a; }, {});

    res.json({ totalTasks: tasks.length, byStatus, byPriority });
  } catch (err) { next(err); }
};

// PATCH /api/users/me
const updateProfile = async (req, res, next) => {
  try {
    const data = z.object({
      name:  z.string().min(2).max(50).optional(),
      color: z.string().optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id:true, name:true, email:true, avatar:true, color:true, role:true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

module.exports = { getTeam, myStats, updateProfile };
