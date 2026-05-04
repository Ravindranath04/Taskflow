// src/components/layout/Layout.jsx
import { useState } from "react";
import { useApp } from "../../store/AppContext";
import AIPanel from "../ai/AIPanel";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "board",     label: "Task Board", icon: "▦" },
  { id: "team",      label: "Team",       icon: "◑" },
  { id: "reports",   label: "Reports",    icon: "◈" },
];

export default function Layout({ children, page, setPage }) {
  const { projects, activeProject, setActiveProject, user, logout } = useApp();
  const [aiOpen, setAiOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const active = projects.find(p => p.id === activeProject);

  return (
    <div style={{ display:"flex", height:"100vh", background:"#0f0f13", color:"#e2e2e8", fontFamily:"'DM Sans','Segoe UI',sans-serif", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{ width:215, background:"#16161d", borderRight:"1px solid #2a2a35", display:"flex", flexDirection:"column", flexShrink:0 }}>
        {/* Logo */}
        <div style={{ padding:"20px 18px 14px", borderBottom:"1px solid #2a2a35" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700 }}>T</div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, letterSpacing:"-0.3px" }}>TaskFlow</div>
              <div style={{ fontSize:10, color:"#6b6b7e" }}>AI-Powered</div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div style={{ padding:"14px 10px 8px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#6b6b7e", textTransform:"uppercase", letterSpacing:"0.08em", padding:"0 8px 7px" }}>Projects</div>
          {projects.map(p => (
            <button key={p.id} onClick={() => { setActiveProject(p.id); setPage("board"); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 9px", borderRadius:8, background:activeProject===p.id?"#1e1e2e":"transparent", border:activeProject===p.id?"1px solid #2e2e40":"1px solid transparent", cursor:"pointer", color:activeProject===p.id?"#e2e2e8":"#8888a0", textAlign:"left", transition:"all .15s", marginBottom:2 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:p.color, flexShrink:0 }}/>
              <span style={{ fontSize:12, fontWeight:500, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
              <span style={{ fontSize:9, background:activeProject===p.id?"#2a2a3e":"#1e1e28", color:"#8888a0", padding:"1px 5px", borderRadius:8 }}>
                {p.status === "ACTIVE" ? "●" : "○"}
              </span>
            </button>
          ))}
          {projects.length === 0 && (
            <div style={{ fontSize:12, color:"#3a3a4e", padding:"8px 9px" }}>No projects yet</div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding:"4px 10px", flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#6b6b7e", textTransform:"uppercase", letterSpacing:"0.08em", padding:"8px 8px" }}>Navigation</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 9px", borderRadius:8, background:page===n.id?"#1e1e2e":"transparent", border:page===n.id?"1px solid #2e2e40":"1px solid transparent", cursor:"pointer", color:page===n.id?"#a78bfa":"#8888a0", textAlign:"left", transition:"all .15s", marginBottom:2 }}>
              <span style={{ fontSize:15, lineHeight:1 }}>{n.icon}</span>
              <span style={{ fontSize:12, fontWeight:page===n.id?600:400 }}>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* AI Button */}
        <div style={{ padding:"8px 10px" }}>
          <button onClick={() => setAiOpen(true)}
            style={{ width:"100%", padding:"9px 11px", borderRadius:10, cursor:"pointer", background:"linear-gradient(135deg,#1a1030,#0d1a2e)", border:"1px solid #3d2a6e", color:"#c4b5fd", display:"flex", alignItems:"center", gap:7, fontSize:12, fontWeight:700 }}>
            <span style={{ fontSize:14 }}>✦</span>
            <span>AI Assistant</span>
            <span style={{ marginLeft:"auto", background:"#4c1d95", color:"#ddd6fe", fontSize:9, padding:"1px 5px", borderRadius:8 }}>CLAUDE</span>
          </button>
        </div>

        {/* User profile */}
        <div style={{ padding:"8px 10px 16px", borderTop:"1px solid #2a2a35", position:"relative" }}>
          <button onClick={() => setShowUserMenu(p => !p)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 9px", borderRadius:9, background:showUserMenu?"#1e1e2e":"transparent", border:"1px solid transparent", cursor:"pointer", transition:"all .15s" }}
            onMouseEnter={e => e.currentTarget.style.background="#1a1a24"}
            onMouseLeave={e => e.currentTarget.style.background=showUserMenu?"#1e1e2e":"transparent"}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:user?.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {user?.avatar || user?.name?.slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex:1, textAlign:"left", minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#e2e2e8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
              <div style={{ fontSize:10, color:"#6b6b7e" }}>{user?.role}</div>
            </div>
            <span style={{ color:"#6b6b7e", fontSize:10 }}>▲</span>
          </button>
          {showUserMenu && (
            <div style={{ position:"absolute", bottom:"100%", left:10, right:10, background:"#1e1e2e", border:"1px solid #2a2a35", borderRadius:10, padding:6, marginBottom:4, zIndex:100 }}>
              <div style={{ padding:"6px 10px", fontSize:11, color:"#6b6b7e", borderBottom:"1px solid #2a2a35", marginBottom:4 }}>{user?.email}</div>
              <button onClick={logout}
                style={{ width:"100%", padding:"7px 10px", borderRadius:7, background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:12, fontWeight:600, textAlign:"left" }}>
                ⇠ Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <header style={{ height:52, background:"#16161d", borderBottom:"1px solid #2a2a35", display:"flex", alignItems:"center", padding:"0 22px", gap:14, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            {active && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:active.color }}/>
                <span style={{ fontWeight:700, fontSize:14 }}>{active.name}</span>
                <span style={{ fontSize:11, color:"#6b6b7e", background:"#1e1e2e", padding:"2px 7px", borderRadius:20, border:"1px solid #2a2a35" }}>{active.status}</span>
              </div>
            )}
          </div>
          <button onClick={() => setAiOpen(!aiOpen)}
            style={{ padding:"5px 13px", borderRadius:8, background:aiOpen?"#2d1b69":"#1a1a24", border:`1px solid ${aiOpen?"#6d28d9":"#2a2a35"}`, color:aiOpen?"#c4b5fd":"#8888a0", cursor:"pointer", fontSize:12, fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
            <span>✦</span> AI
          </button>
        </header>

        <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
          <div style={{ flex:1, overflow:"auto", padding:22 }}>{children}</div>
          {aiOpen && (
            <div style={{ width:360, borderLeft:"1px solid #2a2a35", flexShrink:0 }}>
              <AIPanel onClose={() => setAiOpen(false)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}