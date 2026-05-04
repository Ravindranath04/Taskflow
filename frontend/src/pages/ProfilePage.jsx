// src/pages/ProfilePage.jsx
import { useState, useEffect } from "react";
import { profileApi, ratingsApi } from "../api/services";
import { useApp } from "../store/AppContext";

const SKILL_COLORS = ["#7C3AED","#059669","#DC2626","#D97706","#0891B2","#7C3AED","#6D28D9","#065F46"];
const sc = (s) => SKILL_COLORS[s.length % SKILL_COLORS.length];

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

function PerformanceBar({ label, value, max=100, color="#7C3AED" }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, color:"#8888a0" }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:"#e2e2e8" }}>{value}{max===100?"%":""}</span>
      </div>
      <div style={{ height:6, background:"#2a2a35", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.min(100,(value/max)*100)}%`, background:color, borderRadius:3, transition:"width .5s" }}/>
      </div>
    </div>
  );
}

export default function ProfilePage({ userId }) {
  const { user: currentUser } = useApp();
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [editData,  setEditData]  = useState({});
  const [ratingTask,setRatingTask]= useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingNote,setRatingNote]= useState("");
  const [tab,       setTab]       = useState("overview"); // overview | tasks | ratings

  const targetId = userId || currentUser?.id;
  const isOwn    = targetId === currentUser?.id;

  useEffect(() => { if (targetId) load(); }, [targetId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await profileApi.getProfile(targetId);
      setProfile(data);
      setEditData({
        title:           data.profile?.title || "",
        bio:             data.profile?.bio || "",
        department:      data.profile?.department || "",
        yearsExperience: data.profile?.yearsExperience || 0,
        skills:          (data.profile?.skills || []).join(", "),
        techStack:       (data.profile?.techStack || []).join(", "),
        domains:         (data.profile?.domains || []).join(", "),
        linkedinUrl:     data.profile?.linkedinUrl || "",
        githubUrl:       data.profile?.githubUrl || "",
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await profileApi.aiSummary(targetId);
      setAiSummary(res.summary);
    } catch {}
    setAiLoading(false);
  };

  const saveProfile = async () => {
    await profileApi.updateMine({
      ...editData,
      yearsExperience: parseInt(editData.yearsExperience) || 0,
      skills:    editData.skills.split(",").map(s=>s.trim()).filter(Boolean),
      techStack: editData.techStack.split(",").map(s=>s.trim()).filter(Boolean),
      domains:   editData.domains.split(",").map(s=>s.trim()).filter(Boolean),
    });
    setEditing(false);
    load();
  };

  const submitRating = async () => {
    if (!ratingTask) return;
    await ratingsApi.rateTask(ratingTask.id, ratingVal, ratingNote);
    setRatingTask(null); setRatingVal(5); setRatingNote("");
    load();
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#6b6b7e" }}>Loading profile…</div>
  );
  if (!profile) return (
    <div style={{ color:"#6b6b7e", padding:24 }}>Profile not found.</div>
  );

  const p = profile.profile;
  const s = profile.stats;

  return (
    <div style={{ maxWidth:900 }}>
      {/* Header card */}
      <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:28, marginBottom:20 }}>
        <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
          {/* Avatar */}
          <div style={{ width:72, height:72, borderRadius:"50%", background:profile.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#fff", flexShrink:0, border:"3px solid #2a2a35" }}>
            {profile.avatar || profile.name?.slice(0,2).toUpperCase()}
          </div>

          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
              <h1 style={{ fontSize:22, fontWeight:800, color:"#e2e2e8", margin:0 }}>{profile.name}</h1>
              <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:profile.role==="ADMIN"?"#2d1b69":"#1a1a24", color:profile.role==="ADMIN"?"#c4b5fd":"#8888a0", border:"1px solid #2a2a35" }}>{profile.role}</span>
            </div>
            <div style={{ fontSize:14, color:"#a78bfa", fontWeight:600, marginBottom:4 }}>{p?.title || "Team Member"}</div>
            <div style={{ fontSize:13, color:"#6b6b7e", marginBottom:8 }}>{p?.department} · {p?.yearsExperience || 0} years experience</div>
            {p?.bio && <div style={{ fontSize:13, color:"#c4c4d0", lineHeight:1.6, maxWidth:500 }}>{p.bio}</div>}

            {/* Star rating display */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
              <StarRating value={Math.round(s?.avgRating||0)} readonly size={18}/>
              <span style={{ fontSize:13, color:"#e2e2e8", fontWeight:600 }}>{s?.avgRating||0}</span>
              <span style={{ fontSize:12, color:"#6b6b7e" }}>({profile.receivedRatings?.length||0} ratings)</span>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
            {isOwn && (
              <button onClick={() => setEditing(!editing)}
                style={{ padding:"7px 14px", borderRadius:8, background:"#1a1a24", border:"1px solid #2a2a35", color:"#e2e2e8", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                {editing ? "Cancel" : "✏️ Edit Profile"}
              </button>
            )}
            <button onClick={getAiSummary} disabled={aiLoading}
              style={{ padding:"7px 14px", borderRadius:8, background:"linear-gradient(135deg,#1a1030,#0d1a2e)", border:"1px solid #3d2a6e", color:"#c4b5fd", cursor:"pointer", fontSize:12, fontWeight:600 }}>
              {aiLoading ? "Generating…" : "✦ AI Summary"}
            </button>
          </div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div style={{ marginTop:18, padding:"14px 16px", background:"#0f1729", border:"1px solid #1e3a5f", borderRadius:10 }}>
            <div style={{ fontSize:11, color:"#60a5fa", fontWeight:700, marginBottom:6 }}>✦ AI-Generated Summary</div>
            <p style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.6, margin:0 }}>{aiSummary}</p>
          </div>
        )}

        {/* Links */}
        {(p?.githubUrl || p?.linkedinUrl) && (
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            {p.githubUrl    && <a href={p.githubUrl}    target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#6d28d9", textDecoration:"none" }}>⟶ GitHub</a>}
            {p.linkedinUrl  && <a href={p.linkedinUrl}  target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#0891B2", textDecoration:"none" }}>⟶ LinkedIn</a>}
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ background:"#16161d", border:"1px solid #6d28d9", borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:15, color:"#e2e2e8", marginBottom:18 }}>Edit Your Profile</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { l:"Job Title",          k:"title",           ph:"Senior Frontend Developer" },
              { l:"Department",         k:"department",       ph:"Engineering" },
              { l:"Years of Experience",k:"yearsExperience",  ph:"5", type:"number" },
              { l:"GitHub URL",         k:"githubUrl",        ph:"https://github.com/..." },
              { l:"LinkedIn URL",       k:"linkedinUrl",      ph:"https://linkedin.com/in/..." },
            ].map(f => (
              <div key={f.k}>
                <label style={{ fontSize:11, color:"#6b6b7e", display:"block", marginBottom:4 }}>{f.l}</label>
                <input type={f.type||"text"} value={editData[f.k]||""} placeholder={f.ph}
                  onChange={e => setEditData(p => ({...p, [f.k]:e.target.value}))}
                  style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 11px", color:"#e2e2e8", fontSize:13, outline:"none", boxSizing:"border-box" }}/>
              </div>
            ))}
          </div>
          {[
            { l:"Bio",              k:"bio",       ph:"Short description about yourself…", rows:2 },
            { l:"Skills (comma separated)", k:"skills", ph:"React, TypeScript, Node.js, PostgreSQL", rows:2 },
            { l:"Tech Stack",       k:"techStack", ph:"VSCode, Figma, Docker, AWS",         rows:1 },
            { l:"Domains",          k:"domains",   ph:"frontend, backend, devops, design",  rows:1 },
          ].map(f => (
            <div key={f.k} style={{ marginTop:14 }}>
              <label style={{ fontSize:11, color:"#6b6b7e", display:"block", marginBottom:4 }}>{f.l}</label>
              <textarea value={editData[f.k]||""} placeholder={f.ph} rows={f.rows}
                onChange={e => setEditData(p => ({...p, [f.k]:e.target.value}))}
                style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"8px 11px", color:"#e2e2e8", fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
            </div>
          ))}
          <button onClick={saveProfile}
            style={{ marginTop:18, padding:"9px 20px", borderRadius:8, background:"#6d28d9", border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Save Profile
          </button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
        {[
          { l:"Tasks Done",    v:s?.completedTasks||0,    c:"#22c55e" },
          { l:"On Time",       v:`${s?.onTimeRate||0}%`,  c:"#3b82f6" },
          { l:"Completion",    v:`${s?.completionRate||0}%`,c:"#a78bfa" },
          { l:"Avg Rating",    v:`${s?.avgRating||0}⭐`,  c:"#F59E0B" },
          { l:"Perf Score",    v:`${p?.performanceScore||0}/100`, c: p?.performanceScore>=80?"#22c55e":p?.performanceScore>=60?"#f97316":"#ef4444" },
        ].map(stat => (
          <div key={stat.l} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:800, color:stat.c, letterSpacing:"-0.5px" }}>{stat.v}</div>
            <div style={{ fontSize:11, color:"#6b6b7e", marginTop:3 }}>{stat.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:"#13131a", borderRadius:10, padding:4, marginBottom:18, width:"fit-content" }}>
        {["overview","tasks","ratings"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, transition:"all .15s",
              background:tab===t?"#16161d":"transparent",
              color:     tab===t?"#e2e2e8":"#6b6b7e",
              boxShadow: tab===t?"0 1px 4px rgba(0,0,0,.4)":"none",
            }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Skills */}
          <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:20 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#e2e2e8", marginBottom:14 }}>Skills</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {(p?.skills||[]).map(skill => (
                <span key={skill} style={{ fontSize:12, padding:"4px 10px", borderRadius:20, background:sc(skill)+"22", color:sc(skill), border:`1px solid ${sc(skill)}44`, fontWeight:500 }}>
                  {skill}
                </span>
              ))}
              {(!p?.skills?.length) && <span style={{ fontSize:12, color:"#3a3a4e" }}>No skills added yet</span>}
            </div>

            <div style={{ fontWeight:700, fontSize:13, color:"#8888a0", marginTop:18, marginBottom:10 }}>Tech Stack</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(p?.techStack||[]).map(t => (
                <span key={t} style={{ fontSize:11, padding:"3px 9px", borderRadius:8, background:"#1a1a24", color:"#8888a0", border:"1px solid #2a2a35" }}>{t}</span>
              ))}
            </div>

            <div style={{ fontWeight:700, fontSize:13, color:"#8888a0", marginTop:16, marginBottom:10 }}>Domains</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(p?.domains||[]).map(d => (
                <span key={d} style={{ fontSize:11, padding:"3px 9px", borderRadius:8, background:"#1e1e2e", color:"#a78bfa", border:"1px solid #3730a3" }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Performance */}
          <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:20 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#e2e2e8", marginBottom:18 }}>Performance</div>
            <PerformanceBar label="Overall Score"    value={p?.performanceScore||0} color={p?.performanceScore>=80?"#22c55e":"#f97316"}/>
            <PerformanceBar label="On-Time Rate"     value={s?.onTimeRate||0}       color="#3b82f6"/>
            <PerformanceBar label="Completion Rate"  value={s?.completionRate||0}   color="#a78bfa"/>
            <PerformanceBar label="Avg Rating"       value={(s?.avgRating||0)*20}   color="#F59E0B"/>
            <div style={{ marginTop:16, padding:"12px 14px", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
                {[{l:"Completed",v:p?.tasksCompleted||0,c:"#22c55e"},{l:"On Time",v:p?.tasksOnTime||0,c:"#3b82f6"},{l:"Late",v:p?.tasksLate||0,c:"#ef4444"}].map(x => (
                  <div key={x.l}>
                    <div style={{ fontSize:18, fontWeight:700, color:x.c }}>{x.v}</div>
                    <div style={{ fontSize:10, color:"#6b6b7e" }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Tasks */}
      {tab === "tasks" && (
        <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:20 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#e2e2e8", marginBottom:16 }}>Assigned Tasks</div>
          {(profile.assignedTasks||[]).length === 0 && <div style={{ color:"#3a3a4e", fontSize:13 }}>No tasks yet</div>}
          {(profile.assignedTasks||[]).map(t => {
            const statusColor = { TODO:"#6b7280", IN_PROGRESS:"#3b82f6", REVIEW:"#f59e0b", DONE:"#22c55e" };
            const canRate = !isOwn && t.status==="DONE" && currentUser?.role==="ADMIN" && !t.ratings?.length;
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #1e1e2e" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:statusColor[t.status]||"#6b7280", flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:"#e2e2e8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                  <div style={{ fontSize:11, color:"#6b6b7e" }}>{t.project?.name}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {t.ratings?.length > 0 && <StarRating value={t.ratings[0].stars} readonly size={14}/>}
                  {canRate && (
                    <button onClick={() => { setRatingTask(t); setRatingVal(5); }}
                      style={{ padding:"3px 9px", borderRadius:6, background:"#1a1a24", border:"1px solid #2a2a35", color:"#a78bfa", cursor:"pointer", fontSize:11 }}>
                      Rate
                    </button>
                  )}
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:"#1a1a24", color:statusColor[t.status], border:"1px solid #2a2a35" }}>{t.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: Ratings */}
      {tab === "ratings" && (
        <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, padding:20 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#e2e2e8", marginBottom:16 }}>Received Ratings</div>
          {(profile.receivedRatings||[]).length === 0 && <div style={{ color:"#3a3a4e", fontSize:13 }}>No ratings yet</div>}
          {(profile.receivedRatings||[]).map((r, i) => (
            <div key={i} style={{ padding:"12px 0", borderBottom:"1px solid #1e1e2e" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:r.ratedBy?.color||"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff" }}>
                  {r.ratedBy?.avatar}
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:"#e2e2e8" }}>{r.ratedBy?.name}</span>
                <StarRating value={r.stars} readonly size={15}/>
                <span style={{ fontSize:11, color:"#6b6b7e", marginLeft:"auto" }}>for "{r.task?.title}"</span>
              </div>
              {r.comment && <div style={{ fontSize:12, color:"#8888a0", paddingLeft:34 }}>{r.comment}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Rating modal */}
      {ratingTask && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setRatingTask(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:16, padding:28, width:400 }}>
            <div style={{ fontWeight:700, fontSize:16, color:"#e2e2e8", marginBottom:6 }}>Rate this work</div>
            <div style={{ fontSize:13, color:"#6b6b7e", marginBottom:20 }}>"{ratingTask.title}"</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#6b6b7e", marginBottom:8 }}>Stars</div>
              <StarRating value={ratingVal} onChange={setRatingVal} size={28}/>
            </div>
            <textarea value={ratingNote} onChange={e=>setRatingNote(e.target.value)}
              placeholder="Optional comment…" rows={3}
              style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:8, padding:"9px 12px", color:"#e2e2e8", fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box", marginBottom:16 }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={submitRating} style={{ flex:1, padding:"9px", borderRadius:8, background:"#6d28d9", border:"none", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:600 }}>Submit Rating</button>
              <button onClick={() => setRatingTask(null)} style={{ padding:"9px 16px", borderRadius:8, background:"#1a1a24", border:"1px solid #2a2a35", color:"#8888a0", cursor:"pointer", fontSize:14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
