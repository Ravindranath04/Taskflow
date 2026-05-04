-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "completionNotes" TEXT,
ADD COLUMN     "completionRating" INTEGER;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "assignmentScore" DOUBLE PRECISION,
ADD COLUMN     "autoAssigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredDomains" TEXT[],
ADD COLUMN     "requiredSkills" TEXT[];

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "department" TEXT,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skills" TEXT[],
    "techStack" TEXT[],
    "domains" TEXT[],
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTaskRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksOnTime" INTEGER NOT NULL DEFAULT 0,
    "tasksLate" INTEGER NOT NULL DEFAULT 0,
    "currentWorkload" INTEGER NOT NULL DEFAULT 0,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_ratings" (
    "id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "ratedById" TEXT NOT NULL,

    CONSTRAINT "task_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_userId_key" ON "employee_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_ratings_taskId_ratedById_key" ON "task_ratings"("taskId", "ratedById");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_ratings" ADD CONSTRAINT "task_ratings_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_ratings" ADD CONSTRAINT "task_ratings_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_ratings" ADD CONSTRAINT "task_ratings_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
