// src/api/services.js
// All API calls in one place — import what you need in components

import { api } from "./client";

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data)          => api.post("/auth/register", data),
  login:    (email,password)=> api.post("/auth/login", { email, password }),
  logout:   ()              => api.post("/auth/logout", { refreshToken: localStorage.getItem("refreshToken") }),
  me:       ()              => api.get("/auth/me"),
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
export const projectsApi = {
  getAll:       ()             => api.get("/projects"),
  getOne:       (id)           => api.get(`/projects/${id}`),
  create:       (data)         => api.post("/projects", data),
  update:       (id, data)     => api.patch(`/projects/${id}`, data),
  delete:       (id)           => api.delete(`/projects/${id}`),
  addMember:    (id, email)    => api.post(`/projects/${id}/members`, { email }),
  removeMember: (id, userId)   => api.delete(`/projects/${id}/members/${userId}`),
};

// ─── TASKS ────────────────────────────────────────────────────────────────────
export const tasksApi = {
  getByProject: (projectId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/projects/${projectId}/tasks${params ? "?" + params : ""}`);
  },
  getMyTasks:   ()             => api.get("/tasks/my"),
  getOne:       (id)           => api.get(`/tasks/${id}`),
  create:       (projectId, d) => api.post(`/projects/${projectId}/tasks`, d),
  update:       (id, data)     => api.patch(`/tasks/${id}`, data),
  updateStatus: (id, status)   => api.patch(`/tasks/${id}/status`, { status }),
  delete:       (id)           => api.delete(`/tasks/${id}`),
  addComment:   (id, content)  => api.post(`/tasks/${id}/comments`, { content }),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  chat:           (message, projectId, history) => api.post("/ai/chat", { message, projectId, history }),
  generateTasks:  (description, projectId)      => api.post("/ai/generate-tasks", { description, projectId }),
  summarize:      (projectId)                   => api.post(`/ai/summarize/${projectId}`, {}),
  suggestAssignee:(taskTitle, taskDescription, projectId) =>
    api.post("/ai/suggest-assignee", { taskTitle, taskDescription, projectId }),
};

// ─── USERS ────────────────────────────────────────────────────────────────────
export const usersApi = {
  getTeam:       () => api.get("/users/team"),
  myStats:       () => api.get("/users/me/stats"),
  updateProfile: (data) => api.patch("/users/me", data),
};