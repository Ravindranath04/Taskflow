// src/components/layout/Layout.jsx
import { useState } from "react";
import { useApp } from "../../store/AppContext";
import AIPanel from "../ai/AIPanel";
import NotificationBell from "../notifications/NotificationBell";

const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"⊞" },
  { id:"board",     label:"Task Board", icon:"▦" },
  { id:"team",      label:"Team",       icon:"◑" },
  { id:"reports",   label:"Reports",    icon:"◈" },
  { id:"profile",   label:"My Profile", icon:"◉" },
];

function ProjectModal({ onClose, createProject }) {
  const [form, setForm] = useState({ name:"", description:"", deadline:"", memberEmails:"", color:"#7C3AED" });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createProject({
        name: form.name,
        description: form.description,
        color: form.color,
        deadline: form.deadline || null,
        memberEmails: form.memberEmails,
      });
      onClose();
    } catch (err) {
      console.error("Create project failed", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:440, background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#e2e8f0" }}>Create Project</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>Add a deadline and team members.</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:20, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"grid", gap:12 }}>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Project name"
            style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, outline:"none" }} />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, resize:"vertical", outline:"none" }} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, outline:"none" }} />
            <input value={form.memberEmails} onChange={e => setForm(p => ({ ...p, memberEmails: e.target.value }))}
              placeholder="Members (comma-separated emails)"
              style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:10, width:"100%" }}>
              <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                placeholder="#7C3AED"
                style={{ background:"#111827", border:"1px solid #2a2a35", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, outline:"none" }} />
              <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                style={{ width:"100%", borderRadius:10, border:"1px solid #2a2a35", cursor:"pointer" }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:10 }}>
            <button onClick={create} disabled={saving}
              style={{ flex:1, padding:"11px 14px", borderRadius:10, background:saving?"#2a2a35":"#6d28d9", border:"none", color:"#fff", cursor:saving?"default":"pointer", fontWeight:700 }}>
              {saving ? "Creating…" : "Create Project"}
            </button>
            <button onClick={onClose}
              style={{ padding:"11px 14px", borderRadius:10, background:"#111827", border:"1px solid #2a2a35", color:"#9ca3af", cursor:"pointer", fontWeight:700 }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children, page, setPage }) {
  const { projects, activeProject, setActiveProject, user, logout, createProject, deleteProject } = useApp();
  const [aiOpen,           setAiOpen]           = useState(false);
  const [showUserMenu,     setShowUserMenu]     = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const active = projects.find(p => p.id === activeProject);
  const canDeleteProject = active && (user?.role === "ADMIN" || active.owner?.id === user?.id);

  return (
    <div style={{display:"flex",height:"100vh",background:"#0f0f13",color:"#e2e2e8",fontFamily:"'DM Sans','Segoe UI',sans-serif",overflow:"hidden"}}>
      {/* Sidebar */}
      <aside style={{width:215,background:"#16161d",borderRight:"1px solid #2a2a35",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 18px 14px",borderBottom:"1px solid #2a2a35"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700}}>T</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,letterSpacing:"-0.3px"}}>TaskFlow</div>
              <div style={{fontSize:10,color:"#6b6b7e"}}>AI-Powered v4</div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div style={{padding:"14px 10px 8px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b6b7e",textTransform:"uppercase",letterSpacing:"0.08em",padding:"0 8px 7px"}}>Projects</div>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>{setActiveProject(p.id);setPage("board");}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,background:activeProject===p.id?"#1e1e2e":"transparent",border:activeProject===p.id?"1px solid #2e2e40":"1px solid transparent",cursor:"pointer",color:activeProject===p.id?"#e2e2e8":"#8888a0",textAlign:"left",marginBottom:2}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:p.color,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Nav */}
        <nav style={{padding:"4px 10px",flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b6b7e",textTransform:"uppercase",letterSpacing:"0.08em",padding:"8px 8px"}}>Navigation</div>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 9px",borderRadius:8,background:page===n.id?"#1e1e2e":"transparent",border:page===n.id?"1px solid #2e2e40":"1px solid transparent",cursor:"pointer",color:page===n.id?"#a78bfa":"#8888a0",textAlign:"left",marginBottom:2}}>
              <span style={{fontSize:15,lineHeight:1}}>{n.icon}</span>
              <span style={{fontSize:12,fontWeight:page===n.id?600:400}}>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* AI Button */}
        <div style={{padding:"8px 10px"}}>
          <button onClick={()=>setAiOpen(true)}
            style={{width:"100%",padding:"9px 11px",borderRadius:10,cursor:"pointer",background:"linear-gradient(135deg,#1a1030,#0d1a2e)",border:"1px solid #3d2a6e",color:"#c4b5fd",display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700}}>
            <span style={{fontSize:14}}>✦</span>
            <span>AI Assistant</span>
            <span style={{marginLeft:"auto",background:"#4c1d95",color:"#ddd6fe",fontSize:9,padding:"1px 5px",borderRadius:8}}>GEMINI</span>
          </button>
        </div>

        {/* User */}
        <div style={{padding:"8px 10px 16px",borderTop:"1px solid #2a2a35",position:"relative"}}>
          <button onClick={()=>setShowUserMenu(p=>!p)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 9px",borderRadius:9,background:"transparent",border:"1px solid transparent",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="#1a1a24"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{width:28,height:28,borderRadius:"50%",background:user?.color||"#7C3AED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>
              {user?.avatar||user?.name?.slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1,textAlign:"left",minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"#e2e2e8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
              <div style={{fontSize:10,color:"#6b6b7e"}}>{user?.role}</div>
            </div>
          </button>
          {showUserMenu && (
            <div style={{position:"absolute",bottom:"100%",left:10,right:10,background:"#1e1e2e",border:"1px solid #2a2a35",borderRadius:10,padding:6,zIndex:100}}>
              <button onClick={()=>{setPage("profile");setShowUserMenu(false);}}
                style={{width:"100%",padding:"7px 10px",borderRadius:7,background:"none",border:"none",color:"#e2e2e8",cursor:"pointer",fontSize:12,textAlign:"left"}}>◉ My Profile</button>
              <button onClick={logout}
                style={{width:"100%",padding:"7px 10px",borderRadius:7,background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12,textAlign:"left"}}>⇠ Sign Out</button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <header style={{height:52,background:"#16161d",borderBottom:"1px solid #2a2a35",display:"flex",alignItems:"center",padding:"0 22px",gap:14,flexShrink:0}}>
          <div style={{flex:1}}>
            {active && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:active.color}}/>
                <span style={{fontWeight:700,fontSize:14}}>{active.name}</span>
                <span style={{fontSize:11,color:"#6b6b7e",background:"#1e1e2e",padding:"2px 7px",borderRadius:20,border:"1px solid #2a2a35"}}>{active.status}</span>
              </div>
            )}
          </div>
          <button onClick={()=>setShowProjectModal(true)}
            style={{padding:"5px 13px",borderRadius:8,background:"#111827",border:"1px solid #2a2a35",color:"#a5b4fc",cursor:"pointer",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
            + New Project
          </button>
          {canDeleteProject && (
            <button onClick={async () => { if (active) await deleteProject(active.id); }}
              style={{padding:"5px 13px",borderRadius:8,background:"#3b0d0d",border:"1px solid #7f1d1d",color:"#fecaca",cursor:"pointer",fontSize:12,fontWeight:500}}>
              Delete Project
            </button>
          )}
          <NotificationBell/>
          <button onClick={()=>setAiOpen(!aiOpen)}
            style={{padding:"5px 13px",borderRadius:8,background:aiOpen?"#2d1b69":"#1a1a24",border:`1px solid ${aiOpen?"#6d28d9":"#2a2a35"}`,color:aiOpen?"#c4b5fd":"#8888a0",cursor:"pointer",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
            <span>✦</span> AI
          </button>
        </header>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>
          <div style={{flex:1,overflow:"auto",padding:22}}>{children}</div>
          {aiOpen&&(
            <div style={{width:370,borderLeft:"1px solid #2a2a35",flexShrink:0}}>
              <AIPanel onClose={()=>setAiOpen(false)}/>
            </div>
          )}
          {showProjectModal && (
            <ProjectModal onClose={() => setShowProjectModal(false)} createProject={createProject} />
          )}
        </div>
      </main>
    </div>
  );
}