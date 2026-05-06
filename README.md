# TaskFlow - AI-Powered Project Management System

> A modern, AI-enhanced task management and team collaboration platform built with React, Node.js, and PostgreSQL.

[![Version](https://img.shields.io/badge/version-4.0.0-blue)](https://github.com/yourusername/TaskFlow)
[![Node](https://img.shields.io/badge/node-v18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18+-blue)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-14+-blue)](https://postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**TaskFlow** is an intelligent project management system designed to streamline team collaboration and enhance productivity. It leverages AI (Google Gemini) to assist with task generation, smart assignments, and performance analytics.

**Key Capabilities:**
- Real-time task board with drag-and-drop functionality
- AI-powered task generation and assignment suggestions
- Team member rating and performance tracking
- Project-based organization with role-based access
- Advanced filtering and notifications
- Employee performance scoring

---

## ✨ Features

### Core Features
✅ **Project Management**
- Create and manage multiple projects
- Automatic team member addition to new projects
- Project status tracking (Planning, Active, On Hold, Completed, Archived)
- Color-coded project categories

✅ **Task Management**
- Kanban-style board (To Do, In Progress, Review, Done)
- Drag-and-drop task movement
- Task priority levels (Critical, High, Medium, Low)
- Due date tracking with deadline alerts
- Task assignments and ownership

✅ **AI Features**
- Generate tasks from descriptions
- Auto-assign tasks based on team member skills and availability
- Suggest best assignee for any task
- AI-powered project summarization
- Risk analysis and escalation recommendations
- Chat-based command processing

✅ **Team & Performance**
- Team member profiles with skills and expertise
- Performance scoring based on completion, on-time delivery, and ratings
- Peer rating system for completed tasks
- Real-time performance metrics
- Workload balancing

✅ **Notifications & Analytics**
- Real-time notifications for task assignments
- Activity notifications
- Team and individual performance reports
- Task completion analytics

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL 14+
- **Authentication:** JWT (JSON Web Tokens)
- **AI:** Google Generative AI (Gemini 2.5 Flash)
- **Validation:** Zod
- **Real-time:** Socket.IO

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **State Management:** React Context API
- **Real-time:** Socket.IO Client
- **Styling:** CSS-in-JS

### Database
- **PostgreSQL 14+**
- **Connection:** Prisma ORM
- **Migrations:** Prisma migrations

---

## 📁 Project Structure

```
Task flow/
├── Backend/                      # Express.js API Server
│   ├── src/
│   │   ├── index.js             # Server entry point
│   │   ├── routes/
│   │   │   └── index.js         # API route definitions
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   ├── taskController.js
│   │   │   ├── profileController.js
│   │   │   ├── userController.js
│   │   │   └── aiController.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT authentication
│   │   │   └── errorHandler.js
│   │   ├── lib/
│   │   │   ├── prisma.js        # Database client
│   │   │   ├── assignmentEngine.js
│   │   │   └── nlpCommandProcessor.js
│   │   └── jobs/
│   │       ├── escalationEngine.js
│   │       └── predictiveAnalytics.js
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.js              # Database seeding
│   │   └── migrations/          # Database migrations
│   ├── package.json
│   └── .env                     # Environment variables

├── frontend/                     # React SPA
│   ├── src/
│   │   ├── main.jsx             # App entry point
│   │   ├── App.jsx              # Main component
│   │   ├── TaskFlow.jsx         # Main application component
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BoardPage.jsx
│   │   │   ├── TeamPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── TeamAndReports.jsx
│   │   │   └── AuthPage.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Layout.jsx
│   │   │   ├── ai/
│   │   │   │   └── AIPanel.jsx
│   │   │   └── notifications/
│   │   │       └── NotificationBell.jsx
│   │   ├── store/
│   │   │   └── AppContext.jsx   # Global state
│   │   ├── api/
│   │   │   ├── client.js        # Axios setup
│   │   │   └── services.js      # API endpoints
│   │   └── index.css
│   ├── vite.config.js
│   ├── index.html
│   ├── package.json
│   └── .env.local               # Frontend env variables

├── README.md                     # This file
├── TROUBLESHOOTING.md           # Troubleshooting guide
└── .gitignore                   # Git ignore rules
```

---

## 📦 Prerequisites

Before running the application, ensure you have:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **npm** v9 or higher (comes with Node.js)
- **PostgreSQL** v14 or higher ([Download](https://www.postgresql.org/))
- **Git** ([Download](https://git-scm.com/))
- **Google Gemini API Key** ([Get here](https://ai.google.dev/))

### Verify Installation

```bash
node --version      # Should be v18+
npm --version       # Should be v9+
psql --version      # Should be psql 14+
```

---

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/TaskFlow.git
cd "Task flow"
```

### 2. Install Backend Dependencies

```bash
cd Backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration

### Backend Setup

#### Step 1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE taskflow_db;
CREATE USER taskflow_user WITH PASSWORD 'your_secure_password';
ALTER ROLE taskflow_user SET client_encoding TO 'utf8';
ALTER ROLE taskflow_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE taskflow_user SET default_transaction_deferrable TO on;
ALTER ROLE taskflow_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE taskflow_db TO taskflow_user;
\q
```

#### Step 2: Create Backend .env File

```bash
cd Backend
cp .env.example .env  # or create manually
```

**Backend/.env**
```env
# Database
DATABASE_URL="postgresql://taskflow_user:your_secure_password@localhost:5432/taskflow_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long-for-security"
JWT_EXPIRY="24h"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-key-min-32-chars-long"

# Google AI
GEMINI_API_KEY="your-google-gemini-api-key"

# Server
PORT=5000
NODE_ENV="development"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"
```

#### Step 3: Setup Prisma Database

```bash
cd Backend

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with sample data
npx prisma db seed
```

### Frontend Setup

#### Create Frontend .env.local File

```bash
cd ../frontend
```

**frontend/.env.local**
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=TaskFlow
```

---

## 🚀 Running the Application

### Development Mode

#### Terminal 1: Start Backend Server

```bash
cd Backend
npm run dev
```

**Expected Output:**
```
Server running on http://localhost:5000
Database connected
```

#### Terminal 2: Start Frontend Development Server

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Press h to show help
```

#### Terminal 3: (Optional) Watch Database Changes

```bash
cd Backend
npx prisma studio
```

This opens Prisma Studio at `http://localhost:5555` to view/edit database records.

### Production Mode

#### Build Backend

```bash
cd Backend
npm run build  # or just npm start (no build needed)
```

#### Build Frontend

```bash
cd frontend
npm run build
```

**Output:** `frontend/dist/` directory created

#### Start Production Server

```bash
# Backend
cd Backend
NODE_ENV=production npm start

# Frontend (serve from dist)
# Use a static server or deploy to Vercel/Netlify
```

---

## 📡 API Documentation

### Authentication Endpoints

```
POST   /auth/register          Register new user
POST   /auth/login             Login user
POST   /auth/refresh           Refresh JWT token
POST   /auth/logout            Logout user
GET    /auth/me                Get current user
```

### Projects Endpoints

```
GET    /projects               Get all projects (user-specific or all if admin)
GET    /projects/:id           Get project details
POST   /projects               Create new project
PATCH  /projects/:id           Update project
DELETE /projects/:id           Delete project
POST   /projects/:id/members   Add member to project
DELETE /projects/:id/members/:userId  Remove member
```

### Tasks Endpoints

```
GET    /projects/:projectId/tasks     Get tasks in project
POST   /projects/:projectId/tasks     Create task
GET    /tasks/:id                     Get task details
PATCH  /tasks/:id                     Update task
PATCH  /tasks/:id/status              Update task status
DELETE /tasks/:id                     Delete task
POST   /tasks/:id/comments            Add comment to task
```

### Profile Endpoints

```
GET    /profile/:userId               Get user profile
PATCH  /profile/me                    Update own profile
GET    /profile/team                  Get team members
POST   /ratings/:taskId               Rate completed task
```

### AI Endpoints

```
POST   /ai/chat                       Chat with AI assistant
POST   /ai/generate-tasks             Generate tasks from description
POST   /ai/parse-task                 Parse task text
POST   /ai/create-project             Create project via AI
POST   /ai/auto-assign/:taskId        Auto-assign task
GET    /ai/suggest-assign/:taskId     Get assignment suggestion
POST   /ai/summarize/:projectId       Summarize project
POST   /ai/analyse/:projectId         Analyze project risks
```

### Authentication Header

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## 🗄️ Database Schema

### Key Tables

**users**
- id, email, name, password, role, color, avatar
- timestamps: createdAt, updatedAt

**projects**
- id, name, description, color, status, deadline
- owner (foreign key to users)
- timestamps: createdAt, updatedAt

**tasks**
- id, title, description, status, priority, tags
- projectId, assigneeId, creatorId
- requiredSkills, requiredDomains
- dueDate, timestamps

**project_members**
- projectId, userId, role (owner/member)
- timestamps: joinedAt

**task_ratings**
- id, taskId, ratedUserId, ratedById, stars, comment
- timestamp: createdAt

**employee_profiles**
- userId, title, bio, department, yearsExperience
- skills, techStack, domains
- performanceScore, avgTaskRating
- tasksCompleted, tasksOnTime, tasksLate

**notifications**
- id, userId, type, title, message, read
- link, timestamp: createdAt

---


## 🔧 Available Scripts

### Backend

```bash
npm run dev           # Start development server with hot reload
npm start             # Start production server
npm run db:migrate    # Run Prisma migrations
npm run db:generate   # Generate Prisma client
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio GUI
```

### Frontend

```bash
npm run dev           # Start Vite dev server
npm run build         # Build for production
npm run preview       # Preview production build locally
```

---

## ⚙️ Environment Variables Reference

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@localhost/db |
| JWT_SECRET | Secret for JWT signing | min-32-characters-long-string |
| JWT_EXPIRY | JWT expiration time | 24h |
| GEMINI_API_KEY | Google Gemini API key | your-api-key |
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development/production |
| FRONTEND_URL | Frontend origin for CORS | http://localhost:5173 |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API base URL | http://localhost:5000/api |
| VITE_APP_NAME | Application name | TaskFlow |

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL service
# Windows: Services → PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Verify connection string
psql -U taskflow_user -d taskflow_db -h localhost
```

### Port Already in Use

```bash
# Backend (5000)
npx kill-port 5000

# Frontend (5173)
npx kill-port 5173
```

### Prisma Sync Issues

```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (caution!)
npx prisma migrate reset
```

### CORS Errors

```bash
# Backend/.env
FRONTEND_URL=http://localhost:5173

# Check CORS middleware in src/index.js
```

### API Not Responding

```bash
# Check backend is running
curl http://localhost:5000/api/auth/me

# Check JWT token
# Verify VITE_API_URL in frontend
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/my-awesome-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Support

For support, email support@taskflow.com or open an issue on GitHub.

---

## 🎉 Quick Start Checklist

- [ ] Clone repository
- [ ] Install Node.js v18+
- [ ] Install PostgreSQL
- [ ] Create `.env` files (Backend + Frontend)
- [ ] Run `npm install` in both directories
- [ ] Create PostgreSQL database
- [ ] Run Prisma migrations
- [ ] Get Google Gemini API key
- [ ] Start backend: `npm run dev`
- [ ] Start frontend: `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Login or Register

**Happy coding! 🚀**
