// src/store/AppContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api/client";
import { authApi, projectsApi, tasksApi, usersApi } from "../api/services";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [projects,     setProjects]     = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [members,      setMembers]      = useState([]);
  const [activeProject,setActiveProject]= useState(null);
  const [loading,      setLoading]      = useState(true);
  const [authLoading,  setAuthLoading]  = useState(false);
  const [error,        setError]        = useState(null);
  const [aiMessages,   setAiMessages]   = useState([{
    role: "assistant",
    content: "Hi! I'm your AI assistant powered by Claude.\n\n**What I can do:**\n• **Generate tasks** from a feature description\n• **Summarize** project status\n• **Suggest assignments** based on workload\n• **Prioritize** your backlog\n\nTry: *\"Generate tasks for a user authentication feature\"*",
  }]);

  // ── Bootstrap: load user + data on mount ──────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      api.setTokens(token, localStorage.getItem("refreshToken"));
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [meRes, projectsRes, teamRes] = await Promise.all([
        authApi.me(),
        projectsApi.getAll(),
        usersApi.getTeam(),
      ]);
      setUser(meRes.user);
      setProjects(projectsRes);
      setMembers(teamRes);
      if (projectsRes.length > 0) {
        const firstId = projectsRes[0].id;
        setActiveProject(firstId);
        const taskRes = await tasksApi.getByProject(firstId);
        setTasks(taskRes);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
      if (err.status === 401) {
        api.clearTokens();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setAuthLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      api.setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      await loadInitialData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setAuthLoading(true);
    setError(null);
    try {
      const res = await authApi.register({ name, email, password });
      api.setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      await loadInitialData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    api.clearTokens();
    setUser(null); setProjects([]); setTasks([]); setMembers([]);
    setActiveProject(null);
  };

  // ── Projects ──────────────────────────────────────────────────────────────
  const switchProject = useCallback(async (projectId) => {
    setActiveProject(projectId);
    try {
      const taskRes = await tasksApi.getByProject(projectId);
      setTasks(taskRes);
    } catch (err) { console.error("Failed to load tasks:", err); }
  }, []);

  const createProject = useCallback(async (data) => {
    const proj = await projectsApi.create(data);
    setProjects(p => [proj, ...p]);
    return proj;
  }, []);

  const updateProject = useCallback(async (id, data) => {
    const proj = await projectsApi.update(id, data);
    setProjects(p => p.map(x => x.id === id ? proj : x));
    return proj;
  }, []);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const addTask = useCallback(async (taskData) => {
    const { projectId, ...rest } = taskData;
    const pid = projectId || activeProject;
    // Map frontend status/priority format to backend enum format
    const mapped = {
      ...rest,
      status:   rest.status   ? rest.status.toUpperCase().replace("-","_") : "TODO",
      priority: rest.priority ? rest.priority.toUpperCase() : "MEDIUM",
    };
    const task = await tasksApi.create(pid, mapped);
    setTasks(p => [task, ...p]);
    return task;
  }, [activeProject]);

  const updateTask = useCallback(async (id, updates) => {
    // Map camelCase status values to backend enums
    const mapped = { ...updates };
    if (mapped.status) {
      const statusMap = { todo:"TODO", inprogress:"IN_PROGRESS", review:"REVIEW", done:"DONE" };
      mapped.status = statusMap[mapped.status] || mapped.status;
    }
    if (mapped.priority) mapped.priority = mapped.priority.toUpperCase();
    const task = await tasksApi.update(id, mapped);
    setTasks(p => p.map(t => t.id === id ? normalizeTask(task) : t));
    return task;
  }, []);

  const updateTaskStatus = useCallback(async (id, status) => {
    // Map frontend status → backend enum
    const statusMap = { todo:"TODO", inprogress:"IN_PROGRESS", review:"REVIEW", done:"DONE" };
    const backendStatus = statusMap[status] || status;
    const task = await tasksApi.updateStatus(id, backendStatus);
    setTasks(p => p.map(t => t.id === id ? normalizeTask(task) : t));
    return task;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await tasksApi.delete(id);
    setTasks(p => p.filter(t => t.id !== id));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getMemberById  = useCallback((id) => members.find(m => m.id === id), [members]);
  const getProjectById = useCallback((id) => projects.find(p => p.id === id), [projects]);
  const getTasksByProject = useCallback((pid) => tasks.filter(t => t.projectId === pid), [tasks]);
  const getTasksByMember  = useCallback((mid) => tasks.filter(t => t.assigneeId === mid || t.assignee?.id === mid), [tasks]);

  return (
    <AppContext.Provider value={{
      user, projects, tasks, members, activeProject, loading, authLoading, error,
      aiMessages, setAiMessages,
      setActiveProject: switchProject,
      login, register, logout,
      createProject, updateProject,
      addTask, updateTask, updateTaskStatus, deleteTask,
      getMemberById, getProjectById, getTasksByProject, getTasksByMember,
      reloadTasks: () => activeProject && tasksApi.getByProject(activeProject).then(setTasks),
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Normalize backend task format → frontend format
export function normalizeTask(t) {
  const statusMap = { TODO:"todo", IN_PROGRESS:"inprogress", REVIEW:"review", DONE:"done" };
  const priorityMap = { CRITICAL:"critical", HIGH:"high", MEDIUM:"medium", LOW:"low" };
  return {
    ...t,
    status:     statusMap[t.status]   || t.status?.toLowerCase()   || "todo",
    priority:   priorityMap[t.priority]|| t.priority?.toLowerCase() || "medium",
    assignee:   t.assignee?.id || t.assigneeId || null,
    assigneeObj:t.assignee || null,
  };
}

export const useApp = () => useContext(AppContext);