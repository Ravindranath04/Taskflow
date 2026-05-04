// src/api/services.js
import { api } from "./client";

export const authApi = {
  register: (data)           => api.post("/auth/register", data),
  login:    (email, password)=> api.post("/auth/login", { email, password }),
  logout:   ()               => api.post("/auth/logout", { refreshToken: localStorage.getItem("refreshToken") }),
  me:       ()               => api.get("/auth/me"),
};

export const projectsApi = {
  getAll:       ()           => api.get("/projects"),
  getOne:       (id)         => api.get(`/projects/${id}`),
  create:       (data)       => api.post("/projects", data),
  update:       (id, data)   => api.patch(`/projects/${id}`, data),
  delete:       (id)         => api.delete(`/projects/${id}`),
  addMember:    (id, email)  => api.post(`/projects/${id}/members`, { email }),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

export const tasksApi = {
  getByProject: (projectId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/projects/${projectId}/tasks${params ? "?" + params : ""}`);
  },
  getMyTasks:   ()              => api.get("/tasks/my"),
  getOne:       (id)            => api.get(`/tasks/${id}`),
  create:       (projectId, d)  => api.post(`/projects/${projectId}/tasks`, d),
  update:       (id, data)      => api.patch(`/tasks/${id}`, data),
  updateStatus: (id, status)    => api.patch(`/tasks/${id}/status`, { status }),
  delete:       (id)            => api.delete(`/tasks/${id}`),
  addComment:   (id, content)   => api.post(`/tasks/${id}/comments`, { content }),
};

export const aiApi = {
  chat:           (message, projectId, history)         => api.post("/ai/chat", { message, projectId, history, executeCommands: true }),
  generateTasks:  (description, projectId, autoAssign)  => api.post("/ai/generate-tasks", { description, projectId, autoAssign }),
  autoAssign:     (taskId, projectId)                   => api.post(`/ai/auto-assign/${taskId}`, { projectId }),
  suggestAssign:  (taskId, projectId)                   => api.get(`/ai/suggest-assign/${taskId}?projectId=${projectId}`),
  summarize:      (projectId)                           => api.post(`/ai/summarize/${projectId}`, {}),
  analyseRisk:    (projectId)                           => api.post(`/ai/analyse/${projectId}`, {}),
  triggerEscalation: ()                                 => api.post("/ai/run-escalation", {}),
};

export const profileApi = {
  getTeam:      ()        => api.get("/profile/team"),
  getProfile:   (userId)  => api.get(`/profile/${userId}`),
  updateMine:   (data)    => api.patch("/profile/me", data),
  aiSummary:    (userId)  => api.post(`/profile/ai-summary/${userId}`, {}),
};

export const ratingsApi = {
  rateTask: (taskId, stars, comment) => api.post(`/ratings/${taskId}`, { stars, comment }),
};

export const notificationsApi = {
  getAll:      ()   => api.get("/notifications"),
  markRead:    (id) => api.patch(`/notifications/${id}/read`, {}),
  markAllRead: ()   => api.patch("/notifications/read-all", {}),
};

export const usersApi = {
  getTeam:       () => api.get("/users/team"),
  myStats:       () => api.get("/users/me/stats"),
  updateProfile: (data) => api.patch("/users/me", data),
};