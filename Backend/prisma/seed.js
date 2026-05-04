// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with employee profiles...");

  // Clear all
  await prisma.taskRating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // ── Create users with full profiles ──────────────────────────────────────
  const priya = await prisma.user.create({
    data: {
      email:"priya@taskflow.dev", name:"Priya Sharma", password,
      color:"#7C3AED", avatar:"PS", role:"MEMBER",
      profile: { create: {
        title:          "Senior Frontend Developer",
        bio:            "5 years building React apps. Passionate about clean UI and performance.",
        department:     "Engineering",
        yearsExperience:5,
        skills:         ["React","TypeScript","Tailwind","Redux","Jest","Figma"],
        techStack:      ["VSCode","Chrome DevTools","Storybook","Webpack"],
        domains:        ["frontend","ui","design"],
        performanceScore: 88,
        avgTaskRating:  4.5,
        tasksCompleted: 47,
        tasksOnTime:    42,
        tasksLate:      5,
      }},
    },
  });

  const arjun = await prisma.user.create({
    data: {
      email:"arjun@taskflow.dev", name:"Arjun Nair", password,
      color:"#059669", avatar:"AN", role:"MEMBER",
      profile: { create: {
        title:          "Backend Engineer",
        bio:            "4 years in Node.js and PostgreSQL. Built 3 production APIs from scratch.",
        department:     "Engineering",
        yearsExperience:4,
        skills:         ["Node.js","PostgreSQL","Redis","Docker","REST APIs","GraphQL","Prisma"],
        techStack:      ["VSCode","Postman","DBeaver","Docker Desktop"],
        domains:        ["backend","api","database","auth"],
        performanceScore: 91,
        avgTaskRating:  4.7,
        tasksCompleted: 53,
        tasksOnTime:    50,
        tasksLate:      3,
      }},
    },
  });

  const sneha = await prisma.user.create({
    data: {
      email:"sneha@taskflow.dev", name:"Sneha Patel", password,
      color:"#DC2626", avatar:"SP", role:"MEMBER",
      profile: { create: {
        title:          "UI/UX Designer",
        bio:            "3 years designing user-centered products. Expert in Figma and design systems.",
        department:     "Design",
        yearsExperience:3,
        skills:         ["Figma","Adobe XD","UI Design","UX Research","Prototyping","Design Systems"],
        techStack:      ["Figma","Miro","Zeplin","Notion"],
        domains:        ["design","ui","frontend","ux"],
        performanceScore: 85,
        avgTaskRating:  4.3,
        tasksCompleted: 38,
        tasksOnTime:    34,
        tasksLate:      4,
      }},
    },
  });

  const rohit = await prisma.user.create({
    data: {
      email:"rohit@taskflow.dev", name:"Rohit Kumar", password,
      color:"#D97706", avatar:"RK", role:"MEMBER",
      profile: { create: {
        title:          "DevOps Engineer",
        bio:            "6 years in cloud infrastructure. AWS certified. Built CI/CD for 10+ teams.",
        department:     "Infrastructure",
        yearsExperience:6,
        skills:         ["AWS","Docker","Kubernetes","GitHub Actions","Terraform","Linux","Nginx"],
        techStack:      ["AWS Console","Terraform","Grafana","PagerDuty"],
        domains:        ["devops","infra","cloud","ci","deploy"],
        performanceScore: 93,
        avgTaskRating:  4.8,
        tasksCompleted: 61,
        tasksOnTime:    58,
        tasksLate:      3,
      }},
    },
  });

  const kavya = await prisma.user.create({
    data: {
      email:"kavya@taskflow.dev", name:"Kavya Menon", password,
      color:"#0891B2", avatar:"KM", role:"ADMIN",
      profile: { create: {
        title:          "Engineering Manager",
        bio:            "8 years in tech. Led teams of 5-15 engineers. PMP certified.",
        department:     "Management",
        yearsExperience:8,
        skills:         ["Project Management","Agile","Scrum","Roadmapping","Stakeholder Mgmt","JIRA"],
        techStack:      ["JIRA","Confluence","Slack","Google Workspace","Notion"],
        domains:        ["planning","management","docs","review","sprint"],
        performanceScore: 95,
        avgTaskRating:  4.9,
        tasksCompleted: 72,
        tasksOnTime:    70,
        tasksLate:      2,
      }},
    },
  });

  console.log("✅ Created 5 users with full employee profiles");

  // ── Projects ──────────────────────────────────────────────────────────────
  const p1 = await prisma.project.create({
    data: {
      name:"TaskFlow MVP", description:"AI-assisted project management system",
      color:"#7C3AED", status:"ACTIVE", deadline: new Date("2025-08-30"),
      ownerId: kavya.id,
      members: { create: [
        { userId: priya.id },
        { userId: arjun.id },
        { userId: sneha.id },
        { userId: kavya.id, role:"owner" },
      ]},
    },
  });

  const p2 = await prisma.project.create({
    data: {
      name:"Mobile App", description:"React Native companion app",
      color:"#059669", status:"ACTIVE", deadline: new Date("2025-10-15"),
      ownerId: kavya.id,
      members: { create: [
        { userId: priya.id },
        { userId: sneha.id },
        { userId: rohit.id },
      ]},
    },
  });

  const p3 = await prisma.project.create({
    data: {
      name:"API v2", description:"Backend REST API redesign",
      color:"#D97706", status:"PLANNING", deadline: new Date("2025-09-20"),
      ownerId: kavya.id,
      members: { create: [
        { userId: arjun.id },
        { userId: rohit.id },
        { userId: kavya.id, role:"owner" },
      ]},
    },
  });

  console.log("✅ Created 3 projects");

  // ── Tasks with requiredSkills ─────────────────────────────────────────────
  const tasks = await Promise.all([
    prisma.task.create({ data: { title:"Design system setup",    description:"Create Figma component library", status:"DONE",        priority:"HIGH",     assigneeId:sneha.id, creatorId:kavya.id, projectId:p1.id, tags:["design"],        requiredSkills:["Figma","Design Systems"],  requiredDomains:["design"] }}),
    prisma.task.create({ data: { title:"Auth API endpoints",     description:"JWT login & register routes",   status:"DONE",        priority:"HIGH",     assigneeId:arjun.id, creatorId:kavya.id, projectId:p1.id, tags:["backend","auth"], requiredSkills:["Node.js","REST APIs"],      requiredDomains:["backend","auth"] }}),
    prisma.task.create({ data: { title:"Kanban board UI",        description:"Drag-and-drop task board",      status:"IN_PROGRESS", priority:"HIGH",     assigneeId:priya.id, creatorId:kavya.id, projectId:p1.id, tags:["frontend"],       requiredSkills:["React","TypeScript"],       requiredDomains:["frontend"] }}),
    prisma.task.create({ data: { title:"AI chat integration",    description:"Connect Claude API to tasks",   status:"IN_PROGRESS", priority:"CRITICAL", assigneeId:arjun.id, creatorId:kavya.id, projectId:p1.id, tags:["ai","backend"],   requiredSkills:["Node.js","REST APIs"],      requiredDomains:["backend","api"] }}),
    prisma.task.create({ data: { title:"Dashboard analytics",    description:"Charts for project metrics",    status:"TODO",        priority:"MEDIUM",   assigneeId:priya.id, creatorId:kavya.id, projectId:p1.id, tags:["frontend"],       requiredSkills:["React","TypeScript"],       requiredDomains:["frontend"] }}),
    prisma.task.create({ data: { title:"Write API docs",         description:"Swagger/OpenAPI docs",          status:"REVIEW",      priority:"MEDIUM",   assigneeId:kavya.id, creatorId:kavya.id, projectId:p1.id, tags:["docs"],           requiredSkills:["Project Management"],       requiredDomains:["docs"] }}),
    prisma.task.create({ data: { title:"CI/CD pipeline",         description:"GitHub Actions deploy flow",    status:"IN_PROGRESS", priority:"CRITICAL", assigneeId:rohit.id, creatorId:kavya.id, projectId:p3.id, tags:["devops"],         requiredSkills:["GitHub Actions","Docker"],  requiredDomains:["devops","ci"] }}),
    prisma.task.create({ data: { title:"GraphQL schema",         description:"Define types and mutations",    status:"TODO",        priority:"HIGH",     assigneeId:arjun.id, creatorId:kavya.id, projectId:p3.id, tags:["backend"],        requiredSkills:["GraphQL","Node.js"],        requiredDomains:["backend","api"] }}),
    prisma.task.create({ data: { title:"Mobile UI screens",      description:"Dashboard, board, profile",     status:"TODO",        priority:"MEDIUM",   assigneeId:sneha.id, creatorId:kavya.id, projectId:p2.id, tags:["design","mobile"],requiredSkills:["Figma","UI Design"],        requiredDomains:["design","ui"] }}),
    prisma.task.create({ data: { title:"Push notifications",     description:"Firebase Cloud Messaging",      status:"IN_PROGRESS", priority:"HIGH",     assigneeId:rohit.id, creatorId:kavya.id, projectId:p2.id, tags:["devops","mobile"],requiredSkills:["AWS","Docker"],             requiredDomains:["devops","infra"] }}),
  ]);

  // ── Add ratings for DONE tasks ────────────────────────────────────────────
  const doneTasks = tasks.filter(t => t.status === "DONE");
  for (const task of doneTasks) {
    if (!task.assigneeId) continue;
    await prisma.taskRating.create({
      data: {
        taskId:      task.id,
        ratedUserId: task.assigneeId,
        ratedById:   kavya.id,
        stars:       task.assigneeId === arjun.id ? 5 : 4,
        comment:     "Great work, delivered on time!",
      },
    });
  }

  console.log(`✅ Created ${tasks.length} tasks with skill requirements + ratings`);

  // ── Welcome notifications ─────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId:priya.id, type:"WELCOME", title:"Welcome to TaskFlow!", message:"Your profile is set up. You have 3 tasks assigned to you.", read:false },
      { userId:arjun.id, type:"TASK_ASSIGNED", title:"New task assigned", message:"AI Chat integration has been assigned to you based on your backend skills.", read:false },
      { userId:rohit.id, type:"RISK_HIGH", title:"🟡 Workload warning", message:"You have 5 open tasks. Consider completing some before taking new ones.", read:false },
    ],
  });

  console.log("\n🎉 Seed complete!");
  console.log("──────────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  kavya@taskflow.dev  → password123  (Admin)");
  console.log("  priya@taskflow.dev  → password123  (Frontend Dev)");
  console.log("  arjun@taskflow.dev  → password123  (Backend Dev)");
  console.log("  sneha@taskflow.dev  → password123  (Designer)");
  console.log("  rohit@taskflow.dev  → password123  (DevOps)");
  console.log("──────────────────────────────────────────");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());