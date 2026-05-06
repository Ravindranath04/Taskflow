// src/store/AppContext.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { api } from "../api/client";
import { authApi, projectsApi, tasksApi, usersApi, aiApi } from "../api/services";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [projects,      setProjects]      = useState([]);
  const [tasks,         setTasks]         = useState([]);
  const [myTasks,       setMyTasks]       = useState([]);
  const [members,       setMembers]       = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [authLoading,   setAuthLoading]   = useState(false);
  const [error,         setError]         = useState(null);
  const [aiMessages,    setAiMessages]    = useState([{
    role: "assistant",
    content: "Hi! I'm your AI assistant powered by Gemini.\n\n**What I can do:**\n• **Generate tasks** from a feature description\n• **Summarize** project status\n• **Suggest assignments** based on workload\n• **Prioritize** your backlog\n\nTry: *\"Generate tasks for a user authentication feature\"*",
  }]);

  const userRef          = useRef(null);
  const activeProjectRef = useRef(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      api.setTokens(token, localStorage.getItem("refreshToken"));
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => { activeProjectRef.current = activeProject; }, [activeProject]);

  // ── POLLING every 15 seconds ──────────────────────────────────────────────
  // Catches: new project assigned to user, new task assigned to user
  useEffect(() => {
    if (!user) return;
    userRef.current = user;

    const poll = async () => {
      try {
        const [freshProjects, freshMyTasks, freshMembers] = await Promise.all([
          projectsApi.getAll(),
          tasksApi.getMyTasks(),
          usersApi.getTeam(),
        ]);

        // Check if user was added to any new projects
        setProjects(prev => {
          const prevIds  = prev.map(p => p.id).sort().join(",");
          const freshIds = freshProjects.map(p => p.id).sort().join(",");
          if (prevIds === freshIds) return prev; // no change

          // Find newly added projects
          const newProjects = freshProjects.filter(p => !prev.some(op => op.id === p.id));
          if (newProjects.length > 0 && activeProjectRef.current === null) {
            // Auto-switch to the new project
            const newId = newProjects[0].id;
            setActiveProject(newId);
            activeProjectRef.current = newId;
            tasksApi.getByProject(newId).then(t => setTasks(t.map(normalizeTask)));
          }
          return freshProjects;
        });

        // Always update myTasks so new assigned tasks appear immediately
        setMyTasks(freshMyTasks.map(normalizeTask));
        setMembers(freshMembers);

        // Refresh current project board tasks too
        if (activeProjectRef.current) {
          const freshTasks = await tasksApi.getByProject(activeProjectRef.current);
          setTasks(freshTasks.map(normalizeTask));
        }
      } catch (err) {
        console.warn("[Poll] Skipped:", err.message);
      }
    };

    const interval = setInterval(poll, 15000); // every 15 seconds
    return () => clearInterval(interval);
  }, [user]);

  // ── Load all initial data ─────────────────────────────────────────────────
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [meRes, projectsRes, teamRes] = await Promise.all([
        authApi.me(),
        projectsApi.getAll(),
        usersApi.getTeam(),
      ]);

      setUser(meRes.user);
      userRef.current = meRes.user;
      setProjects(projectsRes);
      setMembers(teamRes);

      // Load my tasks regardless of projects
      const assignedToMe = await tasksApi.getMyTasks();
      setMyTasks(assignedToMe.map(normalizeTask));

      if (projectsRes.length > 0) {
        const firstId = projectsRes[0].id;
        setActiveProject(firstId);
        activeProjectRef.current = firstId;
        const projectTasks = await tasksApi.getByProject(firstId);
        setTasks(projectTasks.map(normalizeTask));
      }
    } catch (err) {
      console.error("loadInitialData error:", err);
      if (err.status === 401) api.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setAuthLoading(true); setError(null);
    try {
      const res = await authApi.login(email, password);
      api.setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      await loadInitialData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally { setAuthLoading(false); }
  };

  const register = async (name, email, password) => {
    setAuthLoading(true); setError(null);
    try {
      const res = await authApi.register({ name, email, password });
      api.setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      await loadInitialData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally { setAuthLoading(false); }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    api.clearTokens();
    setUser(null); setProjects([]); setTasks([]);
    setMyTasks([]); setMembers([]); setActiveProject(null);
    userRef.current = null; activeProjectRef.current = null;
  };

  // ── Projects ──────────────────────────────────────────────────────────────
  const switchProject = useCallback(async (projectId) => {
    setActiveProject(projectId);
    activeProjectRef.current = projectId;
    try {
      const taskRes = await tasksApi.getByProject(projectId);
      setTasks(taskRes.map(normalizeTask));
    } catch (err) { console.error("switchProject error:", err); }
  }, []);

  const createProject = useCallback(async (data) => {
    const proj = await projectsApi.create(data);
    setProjects(p => [proj, ...p]);
    setActiveProject(proj.id);
    activeProjectRef.current = proj.id;
    setTasks([]);
    return proj;
  }, []);

  const updateProject = useCallback(async (id, data) => {
    const proj = await projectsApi.update(id, data);
    setProjects(p => p.map(x => x.id === id ? proj : x));
    return proj;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await projectsApi.delete(id);
    setProjects(prev => {
      const remaining = prev.filter(x => x.id !== id);
      if (remaining.length === 0) {
        setActiveProject(null); activeProjectRef.current = null;
      } else if (remaining.every(p => p.id !== activeProjectRef.current)) {
        setActiveProject(remaining[0].id); activeProjectRef.current = remaining[0].id;
      }
      return remaining;
    });
    setTasks(p => p.filter(t => t.projectId !== id));
    setMyTasks(p => p.filter(t => t.projectId !== id));
  }, []);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const addTask = useCallback(async (taskData) => {
    const { projectId, ...rest } = taskData;
    const pid = projectId || activeProjectRef.current;
    const mapped = {
      ...rest,
      status:   rest.status   ? rest.status.toUpperCase().replace("-","_") : "TODO",
      priority: rest.priority ? rest.priority.toUpperCase() : "MEDIUM",
    };
    const task     = await tasksApi.create(pid, mapped);
    const normalized = normalizeTask(task);
    setTasks(p => [normalized, ...p]);
    // If assigned to me, add to myTasks right away
    if (task.assigneeId === userRef.current?.id) {
      setMyTasks(p => [normalized, ...p]);
    }
    return task;
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    const mapped = { ...updates };
    if (mapped.status) {
      const sm = { todo:"TODO", inprogress:"IN_PROGRESS", review:"REVIEW", done:"DONE" };
      mapped.status = sm[mapped.status] || mapped.status;
    }
    if (mapped.priority) mapped.priority = mapped.priority.toUpperCase();
    const task       = await tasksApi.update(id, mapped);
    const normalized = normalizeTask(task);
    setTasks(p => p.map(t => t.id === id ? normalized : t));
    // Smart update of myTasks
    setMyTasks(p => {
      const exists = p.some(t => t.id === id);
      const isMyTask = normalized.assignee === userRef.current?.id;
      if (isMyTask && !exists) return [normalized, ...p];
      if (!isMyTask && exists) return p.filter(t => t.id !== id);
      return p.map(t => t.id === id ? normalized : t);
    });
    return task;
  }, []);

  const updateTaskStatus = useCallback(async (id, status) => {
    const sm   = { todo:"TODO", inprogress:"IN_PROGRESS", review:"REVIEW", done:"DONE" };
    const task = await tasksApi.updateStatus(id, sm[status] || status);
    const normalized = normalizeTask(task);
    setTasks(p => p.map(t => t.id === id ? normalized : t));
    setMyTasks(p => p.map(t => t.id === id ? normalized : t));
    return task;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await tasksApi.delete(id);
    setTasks(p => p.filter(t => t.id !== id));
    setMyTasks(p => p.filter(t => t.id !== id));
  }, []);

  // ── Manual full refresh ───────────────────────────────────────────────────
  const refreshMyTasks = useCallback(async () => {
    try {
      const [freshProjects, freshTasks] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getMyTasks(),
      ]);
      setProjects(freshProjects);
      setMyTasks(freshTasks.map(normalizeTask));
      if (activeProjectRef.current) {
        const pt = await tasksApi.getByProject(activeProjectRef.current);
        setTasks(pt.map(normalizeTask));
      }
    } catch (err) { console.error("refreshMyTasks error:", err); }
  }, []);

  const suggestAssignment = useCallback(async (taskId) => {
    if (!activeProjectRef.current) return null;
    return aiApi.suggestAssign(taskId, activeProjectRef.current);
  }, []);

  const autoAssignTask = useCallback(async (taskId) => {
    if (!activeProjectRef.current) return null;
    const result = await aiApi.autoAssign(taskId, activeProjectRef.current);
    if (result?.task) {
      const normalized = normalizeTask(result.task);
      setTasks(p => p.map(t => t.id === taskId ? normalized : t));
      if (normalized.assignee === userRef.current?.id) {
        setMyTasks(p => {
          const exists = p.some(t => t.id === taskId);
          return exists ? p.map(t => t.id === taskId ? normalized : t) : [normalized, ...p];
        });
      }
    }
    return result;
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getMemberById     = useCallback((id) => members.find(m => m.id === id), [members]);
  const getProjectById    = useCallback((id) => projects.find(p => p.id === id), [projects]);
  const getTasksByProject = useCallback((pid) => tasks.filter(t => t.projectId === pid), [tasks]);
  const getTasksByMember  = useCallback((mid) => tasks.filter(t => t.assigneeId === mid || t.assignee?.id === mid), [tasks]);

  return (
    <AppContext.Provider value={{
      user, projects, tasks, myTasks, members, activeProject,
      loading, authLoading, error,
      aiMessages, setAiMessages,
      setActiveProject: switchProject,
      login, register, logout,
      createProject, updateProject, deleteProject,
      addTask, updateTask, updateTaskStatus, deleteTask,
      refreshMyTasks, suggestAssignment, autoAssignTask,
      getMemberById, getProjectById, getTasksByProject, getTasksByMember,
      reloadTasks: () => activeProjectRef.current &&
        tasksApi.getByProject(activeProjectRef.current).then(r => setTasks(r.map(normalizeTask))),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function normalizeTask(t) {
  const statusMap   = { TODO:"todo", IN_PROGRESS:"inprogress", REVIEW:"review", DONE:"done" };
  const priorityMap = { CRITICAL:"critical", HIGH:"high", MEDIUM:"medium", LOW:"low" };
  return {
    ...t,
    status:      statusMap[t.status]     || t.status?.toLowerCase()   || "todo",
    priority:    priorityMap[t.priority] || t.priority?.toLowerCase() || "medium",
    assignee:    t.assignee?.id || t.assigneeId || null,
    assigneeObj: t.assignee || null,
  };
}

export const useApp = () => useContext(AppContext);