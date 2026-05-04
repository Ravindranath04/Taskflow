const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const password = await bcrypt.hash("password123", 10);

  const users = await Promise.all([
    prisma.user.create({ data: { email: "priya@taskflow.dev",  name: "Priya Sharma",  password, role: "MEMBER", color: "#7C3AED", avatar: "PS" } }),
    prisma.user.create({ data: { email: "arjun@taskflow.dev",  name: "Arjun Nair",    password, role: "MEMBER", color: "#059669", avatar: "AN" } }),
    prisma.user.create({ data: { email: "sneha@taskflow.dev",  name: "Sneha Patel",   password, role: "MEMBER", color: "#DC2626", avatar: "SP" } }),
    prisma.user.create({ data: { email: "rohit@taskflow.dev",  name: "Rohit Kumar",   password, role: "MEMBER", color: "#D97706", avatar: "RK" } }),
    prisma.user.create({ data: { email: "kavya@taskflow.dev",  name: "Kavya Menon",   password, role: "ADMIN",  color: "#0891B2", avatar: "KM" } }),
  ]);

  const [priya, arjun, sneha, rohit, kavya] = users;
  console.log(`✅ Created ${users.length} users`);

  // Create projects
  const p1 = await prisma.project.create({
    data: {
      name: "TaskFlow MVP",
      description: "AI-assisted project management system",
      color: "#7C3AED",
      status: "ACTIVE",
      deadline: new Date("2025-08-30"),
      ownerId: kavya.id,
      members: {
        create: [
          { userId: priya.id },
          { userId: arjun.id },
          { userId: sneha.id },
          { userId: kavya.id, role: "owner" },
        ],
      },
    },
  });

  const p2 = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "React Native companion app",
      color: "#059669",
      status: "ACTIVE",
      deadline: new Date("2025-10-15"),
      ownerId: kavya.id,
      members: {
        create: [
          { userId: priya.id },
          { userId: sneha.id },
          { userId: rohit.id },
        ],
      },
    },
  });

  const p3 = await prisma.project.create({
    data: {
      name: "API v2",
      description: "Backend REST API redesign",
      color: "#D97706",
      status: "PLANNING",
      deadline: new Date("2025-09-20"),
      ownerId: kavya.id,
      members: {
        create: [
          { userId: arjun.id },
          { userId: rohit.id },
          { userId: kavya.id, role: "owner" },
        ],
      },
    },
  });

  console.log("✅ Created 3 projects");

  // Create tasks for p1
  const taskData = [
    { title: "Design system setup",     description: "Create Figma component library with tokens", status: "DONE",        priority: "HIGH",     assigneeId: sneha.id,  tags: ["design"],          projectId: p1.id, creatorId: kavya.id },
    { title: "Auth API endpoints",      description: "JWT login, register, refresh token routes",  status: "DONE",        priority: "HIGH",     assigneeId: arjun.id,  tags: ["backend","auth"],   projectId: p1.id, creatorId: kavya.id },
    { title: "Kanban board UI",         description: "Drag-and-drop task board with columns",       status: "IN_PROGRESS", priority: "HIGH",     assigneeId: priya.id,  tags: ["frontend"],         projectId: p1.id, creatorId: kavya.id },
    { title: "AI chat integration",     description: "Connect Claude API to task creation flow",    status: "IN_PROGRESS", priority: "CRITICAL", assigneeId: arjun.id,  tags: ["ai","backend"],     projectId: p1.id, creatorId: kavya.id },
    { title: "Dashboard analytics",     description: "Charts for project progress and metrics",     status: "TODO",        priority: "MEDIUM",   assigneeId: priya.id,  tags: ["frontend"],         projectId: p1.id, creatorId: kavya.id },
    { title: "Notification system",     description: "Email + in-app notifications for deadlines",  status: "TODO",        priority: "LOW",      assigneeId: kavya.id,  tags: ["backend"],          projectId: p1.id, creatorId: kavya.id },
    { title: "User settings page",      description: "Profile, preferences, and team management",   status: "TODO",        priority: "MEDIUM",   assigneeId: sneha.id,  tags: ["frontend"],         projectId: p1.id, creatorId: kavya.id },
    { title: "Write API docs",          description: "Swagger/OpenAPI documentation",               status: "REVIEW",      priority: "MEDIUM",   assigneeId: kavya.id,  tags: ["docs"],             projectId: p1.id, creatorId: kavya.id },
    // p2 tasks
    { title: "RN project scaffold",     description: "Expo setup with navigation and state",        status: "DONE",        priority: "HIGH",     assigneeId: priya.id,  tags: ["mobile"],           projectId: p2.id, creatorId: kavya.id },
    { title: "Push notification setup", description: "Firebase Cloud Messaging integration",        status: "IN_PROGRESS", priority: "HIGH",     assigneeId: rohit.id,  tags: ["mobile","backend"], projectId: p2.id, creatorId: kavya.id },
    { title: "Mobile UI screens",       description: "Dashboard, board, profile screens",           status: "TODO",        priority: "MEDIUM",   assigneeId: sneha.id,  tags: ["design","mobile"],  projectId: p2.id, creatorId: kavya.id },
    // p3 tasks
    { title: "API audit",               description: "Document all existing v1 endpoints",          status: "DONE",        priority: "HIGH",     assigneeId: arjun.id,  tags: ["backend","docs"],   projectId: p3.id, creatorId: kavya.id },
    { title: "GraphQL schema design",   description: "Define types, queries, mutations",             status: "TODO",        priority: "HIGH",     assigneeId: arjun.id,  tags: ["backend"],          projectId: p3.id, creatorId: kavya.id },
    { title: "CI/CD pipeline",          description: "GitHub Actions for test, build, deploy",      status: "IN_PROGRESS", priority: "CRITICAL", assigneeId: rohit.id,  tags: ["devops"],           projectId: p3.id, creatorId: kavya.id },
  ];

  await prisma.task.createMany({ data: taskData });
  console.log(`✅ Created ${taskData.length} tasks`);

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────");
  console.log("Login with any of these accounts:");
  users.forEach(u => console.log(`  📧 ${u.email}  🔑 password123`));
  console.log("─────────────────────────────────");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
