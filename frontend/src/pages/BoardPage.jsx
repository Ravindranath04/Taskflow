// src/pages/BoardPage.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";

const COLS = [
  { id:"todo",        label:"To Do",       color:"#6b7280", backendId:"TODO" },
  { id:"inprogress",  label:"In Progress", color:"#3b82f6", backendId:"IN_PROGRESS" },
  { id:"review",      label:"Review",      color:"#f59e0b", backendId:"REVIEW" },
  { id:"done",        label:"Done",        color:"#22c55e", backendId:"DONE" },
];
const PCOLOR = { critical:"#ef4444", high:"#f97316", medium:"#a78bfa", low:"#22c55e" };
const TCOLOR = { frontend:"#3b82f6", backend:"#8b5cf6", design:"#ec4899", ai:"#f59e0b", auth:"#06b6d4", devops:"#10b981", docs:"#6b7280", mobile:"#f97316" };

// normalize backend status → frontend col id
const toCol = s => {
  if (!s) return "todo";
  const map = { TODO:"todo", IN_PROGRESS:"inprogress", REVIEW:"review", DONE:"done" };
  return map[s] || s.toLowerCase().replace("_","");
};

function TaskModal({ task, onClose }) {
  const { members, updateTask, deleteTask } = useApp();
  const [ed, setEd] = useState({
    title:       task.title,
    description: task.description || "",
    status:      toCol(task.status),
    priority:    task.priority?.toLowerCase() || "medium",
    assigneeId:  task.assigneeId || task.assignee?.id || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateTask(task.id, ed);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:26, width:480, maxHeight:"80vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
          <span style={{ fontWeight:700, fontSize:16, color:"#e2e2e8" }}>Edit Task</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b6b7e", cursor:"pointer", fontSize:20 }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input value={ed.title} onChange={e => setEd(p => ({...p,title:e.target.value}))}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:14, outline:"none" }}/>
          <textarea value={ed.description} onChange={e => setEd(p => ({...p,description:e.target.value}))} rows={3}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, resize:"vertical", outline:"none" }}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <select value={ed.status} onChange={e => setEd(p => ({...p,status:e.target.value}))}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }}>
              {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={ed.priority} onChange={e => setEd(p => ({...p,priority:e.target.value}))}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }}>
              {["critical","high","medium","low"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <select value={ed.assigneeId} onChange={e => setEd(p => ({...p,assigneeId:e.target.value}))}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={save} disabled={saving}
            style={{ flex:1, padding:"9px", borderRadius:8, background:saving?"#2a2a35":"#6d28d9", border:"none", color:"#fff", cursor:saving?"default":"pointer", fontSize:14, fontWeight:600 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={async () => { await deleteTask(task.id); onClose(); }}
            style={{ padding:"9px 14px", borderRadius:8, background:"#1a1a24", border:"1px solid #ef444440", color:"#ef4444", cursor:"pointer", fontSize:14 }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose }) {
  const { members, activeProject, addTask } = useApp();
  const [f, setF]   = useState({ title:"", description:"", priority:"medium", assigneeId:"", tags:"" });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!f.title.trim()) return;
    setSaving(true);
    await addTask({
      ...f,
      projectId: activeProject,
      tags: f.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:26, width:440 }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:18, color:"#e2e2e8" }}>New Task</div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <input placeholder="Task title *" value={f.title} onChange={e => setF(p => ({...p,title:e.target.value}))}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:14, outline:"none" }}/>
          <textarea placeholder="Description (optional)" value={f.description} onChange={e => setF(p => ({...p,description:e.target.value}))} rows={2}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, resize:"vertical", outline:"none" }}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <select value={f.priority} onChange={e => setF(p => ({...p,priority:e.target.value}))}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }}>
              {["critical","high","medium","low"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={f.assigneeId} onChange={e => setF(p => ({...p,assigneeId:e.target.value}))}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <input placeholder="Tags: frontend, ai, backend" value={f.tags} onChange={e => setF(p => ({...p,tags:e.target.value}))}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }}/>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={create} disabled={saving}
            style={{ flex:1, padding:"9px", borderRadius:8, background:saving?"#2a2a35":"#6d28d9", border:"none", color:"#fff", cursor:saving?"default":"pointer", fontSize:14, fontWeight:600 }}>
            {saving ? "Creating…" : "Create Task"}
          </button>
          <button onClick={onClose} style={{ padding:"9px 14px", borderRadius:8, background:"#1a1a24", border:"1px solid #2a2a35", color:"#8888a0", cursor:"pointer", fontSize:14 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { tasks, members, activeProject, projects, updateTaskStatus } = useApp();
  const [dragging, setDragging] = useState(null);
  const [hover,    setHover]    = useState(null);
  const [sel,      setSel]      = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [filter,   setFilter]   = useState("all");

  const project = projects.find(p => p.id === activeProject);
  const pt = tasks.filter(t => t.projectId === activeProject);
  const ft = filter === "all" ? pt : pt.filter(t => (t.assigneeId || t.assignee?.id) === filter);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 3px", letterSpacing:"-0.5px", color:"#e2e2e8" }}>{project?.name || "Task Board"}</h1>
          <p style={{ color:"#6b6b7e", fontSize:12, margin:0 }}>{pt.length} tasks · drag cards between columns</p>
        </div>
        <div style={{ display:"flex", gap:9, alignItems:"center" }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"6px 11px", color:"#e2e2e8", fontSize:12, outline:"none", cursor:"pointer" }}>
            <option value="all">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)}
            style={{ padding:"6px 14px", borderRadius:8, background:"#6d28d9", border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            + New Task
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, flex:1, overflow:"auto", alignItems:"start" }}>
        {COLS.map(col => {
          const ct = ft.filter(t => toCol(t.status) === col.id);
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setHover(col.id); }}
              onDrop={async () => {
                if (dragging && toCol(dragging.status) !== col.id) {
                  await updateTaskStatus(dragging.id, col.id);
                }
                setDragging(null); setHover(null);
              }}
              onDragLeave={() => setHover(null)}
              style={{ background:hover===col.id?"#1a1a24":"#13131a", border:`1px solid ${hover===col.id?col.color+"60":"#2a2a35"}`, borderRadius:12, padding:12, minHeight:180, transition:"all .15s" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:col.color }}/>
                  <span style={{ fontWeight:600, fontSize:13, color:"#e2e2e8" }}>{col.label}</span>
                </div>
                <span style={{ fontSize:11, background:"#1e1e2e", color:"#6b6b7e", padding:"2px 7px", borderRadius:20 }}>{ct.length}</span>
              </div>

              {ct.map(task => {
                const m = task.assigneeObj || members.find(x => x.id === (task.assigneeId || task.assignee?.id));
                return (
                  <div key={task.id} draggable onDragStart={() => setDragging(task)} onClick={() => setSel(task)}
                    style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:10, padding:"11px 13px", cursor:"grab", marginBottom:8, transition:"all .15s", userSelect:"none" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="#3a3a4e"; e.currentTarget.style.background="#1a1a24"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a35"; e.currentTarget.style.background="#16161d"; }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:7, flexWrap:"wrap" }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:PCOLOR[task.priority?.toLowerCase()]||"#6b6b7e" }}/>
                      {(task.tags||[]).map(tag => (
                        <span key={tag} style={{ fontSize:10, padding:"1px 6px", borderRadius:8, background:(TCOLOR[tag]||"#6b7280")+"22", color:TCOLOR[tag]||"#6b7280", border:`1px solid ${(TCOLOR[tag]||"#6b7280")}44` }}>{tag}</span>
                      ))}
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#e2e2e8", lineHeight:1.4, marginBottom:6 }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize:11, color:"#6b6b7e", marginBottom:6, lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{task.description}</div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4 }}>
                      <span style={{ fontSize:10, color:"#6b6b7e" }}>{task.createdAt?.slice(0,10)}</span>
                      {m && (
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ fontSize:10, color:"#6b6b7e" }}>{m.name?.split(" ")[0]}</span>
                          <div style={{ width:20, height:20, borderRadius:"50%", background:m.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontWeight:700, color:"#fff" }}>
                            {m.avatar||m.name?.slice(0,2).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {ct.length === 0 && <div style={{ fontSize:12, color:"#2a2a35", textAlign:"center", padding:"18px 0" }}>Drop tasks here</div>}
            </div>
          );
        })}
      </div>

      {sel     && <TaskModal task={sel} onClose={() => setSel(null)}/>}
      {showAdd && <AddModal  onClose={() => setShowAdd(false)}/>}
    </div>
  );
}