// src/pages/Dashboard.jsx
import { useApp } from "../store/AppContext";

const PCOLOR = { critical:"#ef4444", high:"#f97316", medium:"#a78bfa", low:"#22c55e" };
const SCOLOR = { todo:"#6b7280", inprogress:"#3b82f6", "in_progress":"#3b82f6", review:"#f59e0b", done:"#22c55e" };

export default function Dashboard() {
  const { projects, tasks, members, setActiveProject } = useApp();

  const normalize = s => s?.toLowerCase().replace("_","") || "";
  const done    = tasks.filter(t => normalize(t.status) === "done").length;
  const inp     = tasks.filter(t => ["inprogress","in_progress"].includes(normalize(t.status))).length;
  const crit    = tasks.filter(t => t.priority?.toLowerCase() === "critical").length;

  return (
    <div style={{ maxWidth:1050 }}>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.5px", margin:"0 0 3px", color:"#e2e2e8" }}>Dashboard</h1>
        <p style={{ color:"#6b6b7e", fontSize:13, margin:0 }}>Your projects at a glance</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        {[
          { l:"Total Tasks",  v:tasks.length, c:"#e2e2e8" },
          { l:"In Progress",  v:inp,          c:"#3b82f6" },
          { l:"Completed",    v:done,         c:"#22c55e" },
          { l:"Critical",     v:crit,         c:"#ef4444" },
        ].map(s => (
          <div key={s.l} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:12, padding:"16px 18px" }}>
            <div style={{ fontSize:11, color:"#6b6b7e", marginBottom:5 }}>{s.l}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.c, letterSpacing:"-0.5px" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:0, color:"#e2e2e8" }}>Projects</h2>
          <span style={{ fontSize:12, color:"#6b6b7e" }}>{projects.length} projects</span>
        </div>
        {projects.length === 0 ? (
          <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:40, textAlign:"center", color:"#3a3a4e" }}>
            No projects yet. Create one to get started!
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {projects.map(p => {
              const pt = tasks.filter(t => t.projectId === p.id);
              const pdone = pt.filter(t => normalize(t.status) === "done").length;
              const progress = p.progress ?? (pt.length ? Math.round(pdone/pt.length*100) : 0);
              const pm = (p.members || []).slice(0, 4);
              return (
                <div key={p.id} onClick={() => setActiveProject(p.id)}
                  style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:18, cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=p.color+"80"; e.currentTarget.style.background="#1a1a24"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#2a2a35"; e.currentTarget.style.background="#16161d"; }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }}/>
                        <span style={{ fontWeight:700, fontSize:14, color:"#e2e2e8" }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize:11, color:"#6b6b7e" }}>{p.description}</div>
                    </div>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:p.status==="ACTIVE"?"#052e16":"#1c1917", color:p.status==="ACTIVE"?"#22c55e":"#a3a3a3", border:"1px solid", borderColor:p.status==="ACTIVE"?"#15803d":"#404040", flexShrink:0 }}>
                      {p.status?.toLowerCase()}
                    </span>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, color:"#6b6b7e" }}>Progress</span>
                      <span style={{ fontSize:11, fontWeight:700, color:"#e2e2e8" }}>{progress}%</span>
                    </div>
                    <div style={{ height:5, background:"#2a2a35", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:progress+"%", background:p.color, borderRadius:3 }}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    {[{l:"Total",v:pt.length},{l:"Active",v:pt.filter(t=>["inprogress","in_progress"].includes(normalize(t.status))).length,c:"#3b82f6"},{l:"Done",v:pdone,c:"#22c55e"}].map(s => (
                      <div key={s.l} style={{ flex:1, background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:7, padding:"5px 0", textAlign:"center" }}>
                        <div style={{ fontSize:15, fontWeight:700, color:s.c||"#e2e2e8" }}>{s.v}</div>
                        <div style={{ fontSize:10, color:"#6b6b7e" }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex" }}>
                      {pm.map((m, i) => (
                        <div key={m.userId||i} style={{ width:22, height:22, borderRadius:"50%", background:m.user?.color||"#7C3AED", border:"2px solid #16161d", marginLeft:i?-6:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:"#fff" }}>
                          {m.user?.avatar||m.user?.name?.slice(0,2).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize:10, color:"#6b6b7e" }}>{p.deadline ? "Due " + new Date(p.deadline).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent tasks + team */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:14 }}>
        <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:18 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:"#e2e2e8" }}>Recent Tasks</div>
          {tasks.slice(0, 6).map(t => {
            const m = t.assigneeObj || members.find(x => x.id === t.assigneeId);
            const p = projects.find(x => x.id === t.projectId);
            const st = normalize(t.status);
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #1e1e2e" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:PCOLOR[t.priority?.toLowerCase()]||"#6b6b7e", flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#e2e2e8" }}>{t.title}</div>
                  <div style={{ fontSize:11, color:"#6b6b7e" }}>{p?.name}</div>
                </div>
                <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"#1a1a24", color:SCOLOR[st]||"#6b6b7e", border:"1px solid #2a2a35", flexShrink:0 }}>{st}</span>
                {m && (
                  <div style={{ width:22, height:22, borderRadius:"50%", background:m.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:"#fff", flexShrink:0 }}>
                    {m.avatar||m.name?.slice(0,2).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
          {tasks.length === 0 && <div style={{ fontSize:13, color:"#3a3a4e", padding:"12px 0" }}>No tasks yet</div>}
        </div>

        <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:18 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:"#e2e2e8" }}>Team</div>
          {members.map(m => {
            const load = m.openTasks ?? 0;
            return (
              <div key={m.id} style={{ marginBottom:13 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:m.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff", flexShrink:0 }}>
                    {m.avatar||m.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#e2e2e8" }}>{m.name?.split(" ")[0]}</div>
                    <div style={{ fontSize:10, color:"#6b6b7e" }}>{m.role}</div>
                  </div>
                  <span style={{ fontSize:11, color:load>=5?"#ef4444":"#6b6b7e" }}>{load}</span>
                </div>
                <div style={{ height:4, background:"#2a2a35", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:Math.min(100,load/7*100)+"%", background:load>=5?"#ef4444":load>=4?"#f97316":m.color||"#7C3AED", borderRadius:2 }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}