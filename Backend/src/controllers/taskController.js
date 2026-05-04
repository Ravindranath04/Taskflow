const { z } = require("zod");
const prisma = require("../lib/prisma");

const taskSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().optional(),
  status:      z.enum(["TODO","IN_PROGRESS","REVIEW","DONE"]).optional(),
  priority:    z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]).optional(),
  tags:        z.array(z.string()).optional(),
  assigneeId:  z.string().optional().nullable(),
  dueDate:     z.string().datetime().optional().nullable(),
});

const include = {
  assignee: { select: { id:true, name:true, email:true, avatar:true, color:true } },
  creator:  { select: { id:true, name:true, avatar:true } },
  _count:   { select: { comments: true } },
};

// GET /api/projects/:projectId/tasks
const getByProject = async (req, res, next) => {
  try {
    const { status, priority, assigneeId, search } = req.query;

    const where = {
      projectId: req.params.projectId,
      ...(status     && { status }),
      ...(priority   && { priority }),
      ...(assigneeId && { assigneeId }),
      ...(search     && { title: { contains: search, mode: "insensitive" } }),
    };

    const tasks = await prisma.task.findMany({ where, include, orderBy: { createdAt: "desc" } });
    res.json(tasks);
  } catch (err) { next(err); }
};

// GET /api/tasks/my — current user's tasks across all projects
const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where:   { assigneeId: req.user.id },
      include: { ...include, project: { select: { id:true, name:true, color:true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  } catch (err) { next(err); }
};

// GET /api/tasks/:id
const getOne = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where:   { id: req.params.id },
      include: { ...include, project: { select: { id:true, name:true, color:true } }, comments: { include: { author: { select: { id:true, name:true, avatar:true, color:true } } }, orderBy: { createdAt: "asc" } } },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) { next(err); }
};

// POST /api/projects/:projectId/tasks
const create = async (req, res, next) => {
  try {
    const data = taskSchema.parse(req.body);

    // Verify user is a project member
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: req.params.projectId, userId: req.user.id } } });
    if (!member) return res.status(403).json({ error: "Not a project member" });

    const task = await prisma.task.create({
      data: {
        ...data,
        projectId: req.params.projectId,
        creatorId: req.user.id,
        dueDate:   data.dueDate ? new Date(data.dueDate) : null,
      },
      include,
    });
    res.status(201).json(task);
  } catch (err) { next(err); }
};

// PATCH /api/tasks/:id
const update = async (req, res, next) => {
  try {
    const data = taskSchema.partial().parse(req.body);
    const task = await prisma.task.update({
      where:   { id: req.params.id },
      data:    { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      include,
    });
    res.json(task);
  } catch (err) { next(err); }
};

// PATCH /api/tasks/:id/status  — quick status update (for drag-and-drop)
const updateStatus = async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["TODO","IN_PROGRESS","REVIEW","DONE"]) }).parse(req.body);
    const task = await prisma.task.update({ where: { id: req.params.id }, data: { status }, include });
    res.json(task);
  } catch (err) { next(err); }
};

// DELETE /api/tasks/:id
const remove = async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (err) { next(err); }
};

// POST /api/tasks/:id/comments
const addComment = async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const comment = await prisma.comment.create({
      data: { content, taskId: req.params.id, authorId: req.user.id },
      include: { author: { select: { id:true, name:true, avatar:true, color:true } } },
    });
    res.status(201).json(comment);
  } catch (err) { next(err); }
};

module.exports = { getByProject, getMyTasks, getOne, create, update, updateStatus, remove, addComment };
