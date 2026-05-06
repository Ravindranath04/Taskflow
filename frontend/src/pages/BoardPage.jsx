// src/pages/BoardPage.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { ratingsApi } from "../api/services";

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

function StarRating({ value, onChange, readonly = false, size = 20 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s}
          onClick={() => !readonly && onChange && onChange(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{ fontSize:size, cursor:readonly?"default":"pointer", color:(hover||value)>=s?"#F59E0B":"#2a2a35", transition:"color .1s" }}>
          ★
        </span>
      ))}
    </div>
  );
}

function TaskModal({ task, onClose, onRatingSuccess }) {
  const { user, members, updateTask, deleteTask, suggestAssignment, autoAssignTask } = useApp();
  const canEdit = user?.role === "ADMIN";
  const [ed, setEd] = useState({
    title:       task.title,
    description: task.description || "",
    status:      toCol(task.status),
    priority:    task.priority?.toLowerCase() || "medium",
    assigneeId:  task.assigneeId || task.assignee?.id || "",
    dueDate:     task.dueDate ? String(task.dueDate).slice(0,10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingNote, setRatingNote] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateTask(task.id, ed);
    setSaving(false);
    onClose();
  };

  const loadSuggestion = async () => {
    setSuggestLoading(true);
    try {
      const res = await suggestAssignment(task.id);
      setSuggestion(res);
    } catch (err) {
      console.error("Suggestion failed", err);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    setAssignLoading(true);
    try {
      const result = await autoAssignTask(task.id);
      if (result?.task) {
        setEd(p => ({ ...p, assigneeId: result.task.assignee?.id || result.task.assigneeId || "" }));
        setSuggestion(result);
      }
    } catch (err) {
      console.error("Auto-assign failed", err);
    } finally {
      setAssignLoading(false);
    }
  };

  const submitRating = async () => {
    setRatingLoading(true);
    try {
      await ratingsApi.rateTask(task.id, ratingVal, ratingNote);
      setShowRatingModal(false);
      setRatingVal(5);
      setRatingNote("");
      // Trigger callback to refresh board data
      if (onRatingSuccess) {
        onRatingSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Rating failed", err);
    } finally {
      setRatingLoading(false);
    }
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
            <select value={ed.status} onChange={e => setEd(p => ({...p,status:e.target.value}))} disabled={!canEdit}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13, outline:"none", opacity: canEdit ? 1 : 0.5, cursor: canEdit ? "pointer" : "not-allowed" }}>
              {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={ed.priority} onChange={e => setEd(p => ({...p,priority:e.target.value}))} disabled={!canEdit}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13, outline:"none", opacity: canEdit ? 1 : 0.5, cursor: canEdit ? "pointer" : "not-allowed" }}>
              {["critical","high","medium","low"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <select value={ed.assigneeId} onChange={e => setEd(p => ({...p,assigneeId:e.target.value}))} disabled={!canEdit}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13, outline:"none", opacity: canEdit ? 1 : 0.5, cursor: canEdit ? "pointer" : "not-allowed" }}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
            <input type="date" value={ed.dueDate} onChange={e => setEd(p => ({...p,dueDate:e.target.value}))} disabled={!canEdit}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13, outline:"none", opacity: canEdit ? 1 : 0.5, cursor: canEdit ? "pointer" : "not-allowed" }} />
          </div>

          {(task.requiredSkills?.length > 0 || task.requiredDomains?.length > 0) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12, color:"#cbd5e1" }}>
              {task.requiredSkills?.length > 0 && (
                <div style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"10px" }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>Required skills</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {task.requiredSkills.map(skill => <span key={skill} style={{ padding:"4px 8px", borderRadius:999, background:"#111827", border:"1px solid #31364d" }}>{skill}</span>)}
                  </div>
                </div>
              )}
              {task.requiredDomains?.length > 0 && (
                <div style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"10px" }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>Domains</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {task.requiredDomains.map(domain => <span key={domain} style={{ padding:"4px 8px", borderRadius:999, background:"#111827", border:"1px solid #31364d" }}>{domain}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {typeof task.assignmentScore === "number" && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#111827", border:"1px solid #2a2a35", borderRadius:10, color:"#cbd5e1", fontSize:12 }}>
              <span>AI assignment score</span>
              <span style={{ fontWeight:700 }}>{Math.round(task.assignmentScore * 100) / 100}%</span>
            </div>
          )}

          {!canEdit && (
            <div style={{ padding:"10px 12px", borderRadius:10, background:"#111827", border:"1px solid #2a2a35", color:"#9ca3af", fontSize:12 }}>
              Only admins can change stage, assignee, deadline, and delete tasks.
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap" }}>
          {toCol(ed.status) === "done" && task.assigneeId && user?.id !== task.assigneeId && (
            <button onClick={() => setShowRatingModal(true)}
              style={{ minWidth:160, padding:"9px", borderRadius:8, background:"#f59e0b", border:"none", color:"#000", cursor:"pointer", fontSize:14, fontWeight:600 }}>
              ⭐ Rate Performance
            </button>
          )}
          <button onClick={save} disabled={saving || !canEdit}
            style={{ flex:1, minWidth:160, padding:"9px", borderRadius:8, background:(saving||!canEdit)?"#2a2a35":"#6d28d9", border:"none", color:"#fff", cursor:(saving||!canEdit)?"default":"pointer", fontSize:14, fontWeight:600 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={loadSuggestion} disabled={suggestLoading}
            style={{ minWidth:160, padding:"9px", borderRadius:8, background:suggestLoading?"#2a2a35":"#2563eb", border:"none", color:"#fff", cursor:suggestLoading?"default":"pointer", fontSize:14, fontWeight:600 }}>
            {suggestLoading ? "Thinking…" : "Suggest Best Assignee"}
          </button>
          <button onClick={handleAutoAssign} disabled={assignLoading || !canEdit}
            style={{ minWidth:160, padding:"9px", borderRadius:8, background:(assignLoading||!canEdit)?"#2a2a35":"#059669", border:"none", color:"#fff", cursor:(assignLoading||!canEdit)?"default":"pointer", fontSize:14, fontWeight:600 }}>
            {assignLoading ? "Assigning…" : "Auto-Assign Best Match"}
          </button>
          <button onClick={async () => { await deleteTask(task.id); onClose(); }} disabled={!canEdit}
            style={{ padding:"9px 14px", borderRadius:8, background:!canEdit?"#1a1a24":"#1a1a24", border:"1px solid #ef444440", color:!canEdit?"#6b7280":"#ef4444", cursor:!canEdit?"not-allowed":"pointer", fontSize:14 }}>
            Delete
          </button>
        </div>

        {suggestion?.recommended && (
          <div style={{ marginTop:14, padding:"14px", borderRadius:12, background:"#111827", border:"1px solid #2a2a35" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#60a5fa", marginBottom:8 }}>AI Recommendation</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>{suggestion.recommended.memberName}</div>
                <div style={{ fontSize:12, color:"#9ca3af" }}>{suggestion.recommended.role} — {suggestion.recommended.score * 100}% match</div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#a5f3fc" }}>{Math.round(suggestion.recommended.score * 100)}%</div>
            </div>
            <div style={{ fontSize:12, color:"#cbd5e1", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{suggestion.explanation}</div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => !ratingLoading && setShowRatingModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:28, width:400 }}>
            <div style={{ fontWeight:700, fontSize:16, color:"#e2e2e8", marginBottom:6 }}>Rate this performance</div>
            <div style={{ fontSize:13, color:"#6b6b7e", marginBottom:20 }}>\"{ task.title}\"</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#6b6b7e", marginBottom:8 }}>Stars (1-5)</div>
              <StarRating value={ratingVal} onChange={setRatingVal} size={28}/>
            </div>
            <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)}
              placeholder="Optional feedback…" rows={3}
              style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"10px", color:"#e2e2e8", fontSize:13, resize:"vertical", outline:"none", marginBottom:16, boxSizing:"border-box" }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={submitRating} disabled={ratingLoading}
                style={{ flex:1, padding:"11px", borderRadius:8, background:ratingLoading?"#2a2a35":"#f59e0b", border:"none", color:ratingLoading?"#6b6b7e":"#000", cursor:ratingLoading?"default":"pointer", fontWeight:700 }}>
                {ratingLoading ? "Submitting…" : "Submit Rating"}
              </button>
              <button onClick={() => !ratingLoading && setShowRatingModal(false)}
                style={{ padding:"11px 14px", borderRadius:8, background:"#1a1a24", border:"1px solid #2a2a35", color:"#8888a0", cursor:"pointer", fontWeight:600 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddModal({ onClose }) {
  const { members, activeProject, addTask } = useApp();
  const [f, setF]   = useState({ title:"", description:"", priority:"medium", assigneeId:"", tags:"", dueDate:"" });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!f.title.trim() || !activeProject) return;
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <input type="date" value={f.dueDate} onChange={e => setF(p => ({...p,dueDate:e.target.value}))}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }} />
            <input placeholder="Tags: frontend, ai, backend" value={f.tags} onChange={e => setF(p => ({...p,tags:e.target.value}))}
              style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 12px", color:"#e2e2e8", fontSize:13, outline:"none" }} />
          </div>
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
  const { user, tasks, members, activeProject, projects, updateTaskStatus, switchProject } = useApp();
  const canEdit = user?.role === "ADMIN";
  const [dragging, setDragging] = useState(null);
  const [hover,    setHover]    = useState(null);
  const [sel,      setSel]      = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [filter,   setFilter]   = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRatingSuccess = async () => {
    // Refresh current project tasks to show updated rating
    if (activeProject) {
      await switchProject(activeProject);
    }
    setRefreshKey(k => k + 1);
    setSel(null);
  };

  const project = projects.find(p => p.id === activeProject);
  const pt = tasks.filter(t => t.projectId === activeProject);
  const ft = filter === "all" ? pt : pt.filter(t => (t.assigneeId || t.assignee?.id) === filter);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 3px", letterSpacing:"-0.5px", color:"#e2e2e8" }}>{project?.name || "Task Board"}</h1>
          <p style={{ color:"#6b6b7e", fontSize:12, margin:0 }}>{pt.length} tasks · drag cards between columns</p>
          <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
            {COLS.map(col => (
              <span key={col.id} style={{ fontSize:11, color:col.color, background:"rgba(255,255,255,.05)", padding:"4px 8px", borderRadius:999, border:`1px solid ${col.color}33` }}>
                {col.label}: {pt.filter(t => toCol(t.status) === col.id).length}
              </span>
            ))}
          </div>
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
              onDragOver={e => { if (canEdit) { e.preventDefault(); setHover(col.id); } }}
              onDrop={async () => {
                if (canEdit && dragging && toCol(dragging.status) !== col.id) {
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
                  <div key={task.id} draggable={canEdit} onDragStart={() => canEdit && setDragging(task)} onClick={() => setSel(task)}
                    style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:10, padding:"11px 13px", cursor: canEdit ? "grab" : "default", marginBottom:8, transition:"all .15s", userSelect:"none" }}
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
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4, gap:8 }}>
                      <span style={{ fontSize:10, color:"#6b6b7e" }}>{task.createdAt?.slice(0,10)}</span>
                      {task.dueDate && (
                        <span style={{ fontSize:10, color:"#fbbf24" }}>Due {String(task.dueDate).slice(0,10)}</span>
                      )}
                      {m && (
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ fontSize:10, color:"#6b6b7e" }}>{m.name?.split(" ")[0]}</span>
                          <div style={{ width:20, height:20, borderRadius:"50%", background:m.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontWeight:700, color:"#fff" }}>
                            {m.avatar||m.name?.slice(0,2).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, gap:8, flexWrap:"wrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {typeof task.assignmentScore === "number" ? (
                          <span style={{ fontSize:10, color:"#a5f3fc", background:"#0f1729", border:"1px solid #1e3a5f", borderRadius:999, padding:"4px 8px" }}>
                            AI score {Math.round(task.assignmentScore * 100) / 100}%
                          </span>
                        ) : (
                          <span style={{ fontSize:10, color:"#6b6b7e" }}>No AI score</span>
                        )}
                        {task.ratings?.length > 0 && (
                          <span style={{ fontSize:10, color:"#F59E0B", background:"#1a1409", border:"1px solid #F59E0B", borderRadius:999, padding:"4px 8px", display:"flex", alignItems:"center", gap:2 }}>
                            ⭐ {task.ratings[0].stars}/5
                          </span>
                        )}
                      </div>
                      {toCol(task.status) === "done" && task.assigneeId && !task.ratings?.length && (
                        <button onClick={e => { e.stopPropagation(); setSel(task); }}
                          style={{ fontSize:10, padding:"4px 8px", borderRadius:8, border:"1px solid #F59E0B", background:"#1a1409", color:"#F59E0B", cursor:"pointer", fontWeight:600 }}>
                          Rate ⭐
                        </button>
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

      {sel     && <TaskModal task={sel} onClose={() => setSel(null)} onRatingSuccess={handleRatingSuccess}/>}
      {showAdd && <AddModal  onClose={() => setShowAdd(false)}/>}
    </div>
  );
}