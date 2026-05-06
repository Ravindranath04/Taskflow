// src/pages/TeamPage.jsx
import { useState, useEffect } from "react";
import { profileApi } from "../api/services";

function StarDisplay({ value }) {
  return (
    <div style={{ display:"flex", gap:1 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize:11, color: value>=s?"#F59E0B":"#2a2a35" }}>★</span>
      ))}
    </div>
  );
}

export default function TeamPage({ onViewProfile }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi.getTeam().then(setTeam).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color:"#6b6b7e", padding:24 }}>Loading team…</div>;

  return (
    <div style={{ maxWidth:960 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 3px", color:"#e2e2e8" }}>Team</h1>
        <p style={{ color:"#6b6b7e", fontSize:13, margin:0 }}>{team.length} members · click a card to view full profile</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
        {team.map(m => {
          const p = m.profile;
          const loadPct = Math.min(100, (m.openTasks||0) / 7 * 100);
          return (
            <div key={m.id}
              onClick={() => onViewProfile && onViewProfile(m.id)}
              style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:22, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=m.color+"80";e.currentTarget.style.background="#1a1a24";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a35";e.currentTarget.style.background="#16161d";}}>

              {/* Top row */}
              <div style={{ display:"flex", gap:14, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:m.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:700, color:"#fff", flexShrink:0 }}>
                  {m.avatar||m.name?.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#e2e2e8" }}>{m.name}</div>
                  <div style={{ fontSize:12, color:"#a78bfa", fontWeight:500 }}>{p?.title||m.role}</div>
                  <div style={{ fontSize:11, color:"#6b6b7e", marginBottom:4 }}>{m.email}</div>
                  <div style={{ fontSize:11, color:"#6b6b7e" }}>{p?.department} · {p?.yearsExperience||0}y exp</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <StarDisplay value={Math.round(m.avgRating||0)}/>
                  <div style={{ fontSize:11, color:"#F59E0B", fontWeight:600 }}>{m.avgRating||0}⭐</div>
                </div>
              </div>

              {/* Skills */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:14 }}>
                {(p?.skills||[]).slice(0,5).map(skill => (
                  <span key={skill} style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:"#1a1a24", color:"#a78bfa", border:"1px solid #3730a3" }}>{skill}</span>
                ))}
                {(p?.skills||[]).length > 5 && (
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:"#1a1a24", color:"#6b6b7e" }}>+{p.skills.length-5} more</span>
                )}
                {!p?.skills?.length && <span style={{ fontSize:11, color:"#3a3a4e" }}>No skills listed</span>}
              </div>

              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
                {[
                  { l:"Completed", v:p?.tasksCompleted||0, c:"#22c55e" },
                  { l:"On Time",   v:`${p?.tasksOnTime||0}`, c:"#3b82f6" },
                  { l:"Score",     v:`${p?.performanceScore||0}`, c: (p?.performanceScore||0)>=80?"#22c55e":"#f97316" },
                ].map(s => (
                  <div key={s.l} style={{ background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"7px", textAlign:"center" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:10, color:"#6b6b7e" }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Workload bar */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, color:"#6b6b7e" }}>Current workload</span>
                  <span style={{ fontSize:11, fontWeight:600, color:loadPct>=70?"#ef4444":"#6b6b7e" }}>{m.openTasks||0} open tasks</span>
                </div>
                <div style={{ height:5, background:"#2a2a35", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:loadPct+"%", background:loadPct>=70?"#ef4444":loadPct>=50?"#f97316":m.color, borderRadius:3 }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
