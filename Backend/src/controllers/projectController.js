const { z } = require("zod");
const prisma = require("../lib/prisma");

const projectSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  color:       z.string().optional(),
  status:      z.enum(["PLANNING","ACTIVE","ON_HOLD","COMPLETED","ARCHIVED"]).optional(),
  deadline:    z.string().datetime().optional().nullable(),
});

const include = {
  owner:   { select: { id:true, name:true, email:true, avatar:true, color:true } },
  members: { include: { user: { select: { id:true, name:true, email:true, avatar:true, color:true, role:true } } } },
  _count:  { select: { tasks: true } },
};

// GET /api/projects
const getAll = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include,
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(projects.map(async (p) => {
      const tasks = await prisma.task.findMany({ where: { projectId: p.id }, select: { status: true } });
      const done  = tasks.filter(t => t.status === "DONE").length;
      const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      return { ...p, progress };
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

// GET /api/projects/:id
const getOne = async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, members: { some: { userId: req.user.id } } },
      include: { ...include, tasks: { include: { assignee: { select: { id:true, name:true, avatar:true, color:true } }, creator: { select: { id:true, name:true } } }, orderBy: { createdAt: "desc" } } },
    });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const done     = project.tasks.filter(t => t.status === "DONE").length;
    const progress = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;

    res.json({ ...project, progress });
  } catch (err) { next(err); }
};

// POST /api/projects
const create = async (req, res, next) => {
  try {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : null,
        ownerId:  req.user.id,
        members:  { create: [{ userId: req.user.id, role: "owner" }] },
      },
      include,
    });
    res.status(201).json({ ...project, progress: 0 });
  } catch (err) { next(err); }
};

// PATCH /api/projects/:id
const update = async (req, res, next) => {
  try {
    const data = projectSchema.partial().parse(req.body);

    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: req.params.id, userId: req.user.id } } });
    if (!member) return res.status(403).json({ error: "Not a project member" });

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { ...data, deadline: data.deadline ? new Date(data.deadline) : undefined },
      include,
    });
    res.json(project);
  } catch (err) { next(err); }
};

// DELETE /api/projects/:id
const remove = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.ownerId !== req.user.id) return res.status(403).json({ error: "Only the owner can delete a project" });

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: "Project deleted" });
  } catch (err) { next(err); }
};

// POST /api/projects/:id/members
const addMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, select: { id:true, name:true, email:true, avatar:true, color:true } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: req.params.id, userId: user.id } } });
    if (existing) return res.status(409).json({ error: "User is already a member" });

    await prisma.projectMember.create({ data: { projectId: req.params.id, userId: user.id } });
    res.status(201).json({ user, message: "Member added" });
  } catch (err) { next(err); }
};

// DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res, next) => {
  try {
    await prisma.projectMember.delete({ where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } } });
    res.json({ message: "Member removed" });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove, addMember, removeMember };
