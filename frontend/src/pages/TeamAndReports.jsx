// src/pages/TeamPage.jsx
import { useApp } from "../store/AppContext";

const PCOLOR = { critical:"#ef4444", high:"#f97316", medium:"#a78bfa", low:"#22c55e" };
const SCOLOR = { todo:"#6b7280", inprogress:"#3b82f6", in_progress:"#3b82f6", review:"#f59e0b", done:"#22c55e" };
const norm = s => s?.toLowerCase().replace("_","") || "todo";

export function TeamPage() {
  const { members, tasks, projects } = useApp();
  return (
    <div style={{ maxWidth:920 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 3px", letterSpacing:"-0.5px", color:"#e2e2e8" }}>Team</h1>
        <p style={{ color:"#6b6b7e", fontSize:13, margin:0 }}>{members.length} members · workload overview</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {members.map(m => {
          const mt = tasks.filter(t => t.assigneeId === m.id || t.assignee?.id === m.id);
          const load = m.openTasks ?? mt.filter(t => norm(t.status) !== "done").length;
          const pct  = Math.min(100, load / 7 * 100);
          return (
            <div key={m.id} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e1e2e", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:m.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                  {m.avatar||m.name?.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#e2e2e8" }}>{m.name}</div>
                  <div style={{ fontSize:12, color:"#6b6b7e" }}>{m.role}</div>
                </div>
                {[{l:"Total",v:mt.length},{l:"Active",v:mt.filter(t=>norm(t.status)==="inprogress").length,c:"#3b82f6"},{l:"Done",v:mt.filter(t=>norm(t.status)==="done").length,c:"#22c55e"}].map(s => (
                  <div key={s.l} style={{ textAlign:"center", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"7px 14px" }}>
                    <div style={{ fontSize:17, fontWeight:700, color:s.c||"#e2e2e8" }}>{s.v}</div>
                    <div style={{ fontSize:10, color:"#6b6b7e" }}>{s.l}</div>
                  </div>
                ))}
                <div style={{ width:120 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:"#6b6b7e" }}>Workload</span>
                    <span style={{ fontSize:11, color:pct>=70?"#ef4444":"#6b6b7e", fontWeight:600 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height:5, background:"#2a2a35", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:pct+"%", background:pct>=70?"#ef4444":pct>=50?"#f97316":m.color||"#7C3AED", borderRadius:3 }}/>
                  </div>
                </div>
              </div>
              {mt.length > 0 && (
                <div style={{ padding:"12px 20px", display:"flex", flexWrap:"wrap", gap:7 }}>
                  {mt.map(t => {
                    const p = projects.find(x => x.id === t.projectId);
                    const st = norm(t.status);
                    return (
                      <div key={t.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 9px", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, fontSize:12 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:PCOLOR[t.priority?.toLowerCase()]||"#6b6b7e" }}/>
                        <span style={{ color:"#c4c4d0" }}>{t.title}</span>
                        <span style={{ color:SCOLOR[st]||"#6b6b7e", fontSize:10 }}>● {st}</span>
                        {p && <span style={{ color:"#6b6b7e", fontSize:10 }}>{p.name}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {members.length === 0 && <div style={{ color:"#3a3a4e", fontSize:13 }}>No team members loaded.</div>}
      </div>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";

function BarChart({ data, title }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"), W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);
    const max = Math.max(...data.map(d => d.value), 1);
    const bw  = (W-40)/data.length - 10;
    data.forEach((d, i) => {
      const x  = 20 + i * ((W-40)/data.length);
      const bh = (d.value/max) * (H-55);
      const y  = H - 28 - bh;
      ctx.fillStyle = d.color||"#6d28d9";
      ctx.beginPath(); ctx.roundRect(x,y,bw,bh,[4,4,0,0]); ctx.fill();
      ctx.fillStyle="#e2e2e8"; ctx.font="bold 11px system-ui"; ctx.textAlign="center";
      if (d.value > 0) ctx.fillText(d.value, x+bw/2, y-5);
      ctx.fillStyle="#6b6b7e"; ctx.font="10px system-ui";
      ctx.fillText(d.label, x+bw/2, H-8);
    });
  }, [data]);
  return (
    <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:18 }}>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:"#e2e2e8" }}>{title}</div>
      <canvas ref={ref} width={420} height={170} style={{ width:"100%", height:170 }}/>
    </div>
  );
}

function DonutChart({ data, title, total }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"), W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 16;
    let angle = -Math.PI/2;
    const tot = data.reduce((s,d) => s+d.value, 0) || 1;
    data.forEach(d => {
      const sl = (d.value/tot)*2*Math.PI;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+sl); ctx.closePath();
      ctx.fillStyle = d.color; ctx.fill(); angle += sl;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*.58,0,2*Math.PI); ctx.fillStyle="#16161d"; ctx.fill();
    ctx.fillStyle="#e2e2e8"; ctx.font="bold 18px system-ui"; ctx.textAlign="center";
    ctx.fillText(total, cx, cy+5);
    ctx.fillStyle="#6b6b7e"; ctx.font="10px system-ui"; ctx.fillText("tasks", cx, cy+18);
  }, [data, total]);
  return (
    <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:18 }}>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:"#e2e2e8" }}>{title}</div>
      <div style={{ display:"flex", alignItems:"center", gap:18 }}>
        <canvas ref={ref} width={150} height={150} style={{ width:130, height:130, flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          {data.map(d => (
            <div key={d.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:d.color }}/>
                <span style={{ fontSize:12, color:"#c4c4d0" }}>{d.label}</span>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:"#e2e2e8" }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { tasks, projects, members } = useApp();
  const n = s => s?.toLowerCase().replace("_","") || "";

  const byStatus = [
    { label:"Todo",    value:tasks.filter(t=>n(t.status)==="todo").length,       color:"#6b7280" },
    { label:"In Prog", value:tasks.filter(t=>n(t.status)==="inprogress").length, color:"#3b82f6" },
    { label:"Review",  value:tasks.filter(t=>n(t.status)==="review").length,     color:"#f59e0b" },
    { label:"Done",    value:tasks.filter(t=>n(t.status)==="done").length,       color:"#22c55e" },
  ];
  const byPriority = [
    { label:"Critical", value:tasks.filter(t=>t.priority?.toLowerCase()==="critical").length, color:"#ef4444" },
    { label:"High",     value:tasks.filter(t=>t.priority?.toLowerCase()==="high").length,     color:"#f97316" },
    { label:"Medium",   value:tasks.filter(t=>t.priority?.toLowerCase()==="medium").length,   color:"#a78bfa" },
    { label:"Low",      value:tasks.filter(t=>t.priority?.toLowerCase()==="low").length,      color:"#22c55e" },
  ];
  const byMember  = members.map(m => ({ label:m.name?.split(" ")[0], value:tasks.filter(t=>t.assigneeId===m.id||t.assignee?.id===m.id).length, color:m.color||"#7C3AED" }));
  const byProject = projects.map(p => ({ label:p.name?.split(" ")[0], value:tasks.filter(t=>t.projectId===p.id).length, color:p.color }));
  const cr = tasks.length ? Math.round(tasks.filter(t=>n(t.status)==="done").length/tasks.length*100) : 0;

  return (
    <div style={{ maxWidth:960 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 3px", letterSpacing:"-0.5px", color:"#e2e2e8" }}>Reports</h1>
        <p style={{ color:"#6b6b7e", fontSize:13, margin:0 }}>Analytics across all projects</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[{l:"Completion Rate",v:cr+"%",c:"#22c55e"},{l:"Active Projects",v:projects.filter(p=>p.status==="ACTIVE").length,c:"#3b82f6"},{l:"Avg/Member",v:members.length?Math.round(tasks.length/members.length):0,c:"#a78bfa"},{l:"Critical",v:tasks.filter(t=>t.priority?.toLowerCase()==="critical").length,c:"#ef4444"}].map(s => (
          <div key={s.l} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:12, padding:"15px 17px" }}>
            <div style={{ fontSize:11, color:"#6b6b7e", marginBottom:5 }}>{s.l}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.c, letterSpacing:"-0.5px" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <DonutChart data={byStatus}   title="Tasks by Status"   total={tasks.length}/>
        <DonutChart data={byPriority} title="Tasks by Priority" total={tasks.length}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <BarChart data={byMember}  title="Tasks per Member"/>
        <BarChart data={byProject} title="Tasks per Project"/>
      </div>
      <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:18 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:"#e2e2e8" }}>Project Progress</div>
        {projects.map(p => {
          const pt = tasks.filter(t => t.projectId === p.id);
          const prog = p.progress ?? (pt.length ? Math.round(pt.filter(t=>n(t.status)==="done").length/pt.length*100) : 0);
          return (
            <div key={p.id} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:p.color }}/>
                  <span style={{ fontSize:13, fontWeight:600, color:"#e2e2e8" }}>{p.name}</span>
                  <span style={{ fontSize:11, color:"#6b6b7e" }}>{pt.filter(t=>n(t.status)==="done").length}/{pt.length} done</span>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:p.color }}>{prog}%</span>
              </div>
              <div style={{ height:7, background:"#2a2a35", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:prog+"%", background:p.color, borderRadius:4 }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}