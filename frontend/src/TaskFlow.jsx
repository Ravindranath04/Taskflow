import { useState, useCallback, useContext, createContext, useRef, useEffect } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const MEMBERS = [
  { id:"m1", name:"Priya Sharma",  role:"Frontend Dev", avatar:"PS", color:"#7C3AED", load:3 },
  { id:"m2", name:"Arjun Nair",    role:"Backend Dev",  avatar:"AN", color:"#059669", load:4 },
  { id:"m3", name:"Sneha Patel",   role:"Designer",     avatar:"SP", color:"#DC2626", load:2 },
  { id:"m4", name:"Rohit Kumar",   role:"DevOps",       avatar:"RK", color:"#D97706", load:5 },
  { id:"m5", name:"Kavya Menon",   role:"PM",           avatar:"KM", color:"#0891B2", load:3 },
];

const PROJECTS = [
  { id:"p1", name:"TaskFlow MVP",  description:"AI-assisted project management",  color:"#7C3AED", status:"active",   progress:42, deadline:"2025-08-30", members:["m1","m2","m3","m5"] },
  { id:"p2", name:"Mobile App",    description:"React Native companion app",       color:"#059669", status:"active",   progress:18, deadline:"2025-10-15", members:["m1","m3","m4"] },
  { id:"p3", name:"API v2",        description:"Backend REST API redesign",        color:"#D97706", status:"planning", progress:5,  deadline:"2025-09-20", members:["m2","m4","m5"] },
];

const TASKS_INIT = [
  { id:"t1",  projectId:"p1", title:"Design system setup",    description:"Create Figma component library", status:"done",       priority:"high",     assignee:"m3", tags:["design"],           createdAt:"2025-05-01" },
  { id:"t2",  projectId:"p1", title:"Auth API endpoints",     description:"JWT login & register routes",    status:"done",       priority:"high",     assignee:"m2", tags:["backend","auth"],    createdAt:"2025-05-02" },
  { id:"t3",  projectId:"p1", title:"Kanban board UI",        description:"Drag-and-drop task board",       status:"inprogress", priority:"high",     assignee:"m1", tags:["frontend"],          createdAt:"2025-05-03" },
  { id:"t4",  projectId:"p1", title:"AI chat integration",    description:"Connect Claude API to tasks",    status:"inprogress", priority:"critical", assignee:"m2", tags:["ai","backend"],      createdAt:"2025-05-04" },
  { id:"t5",  projectId:"p1", title:"Dashboard analytics",    description:"Charts for project metrics",     status:"todo",       priority:"medium",   assignee:"m1", tags:["frontend"],          createdAt:"2025-05-05" },
  { id:"t6",  projectId:"p1", title:"Notification system",    description:"Email + in-app notifications",  status:"todo",       priority:"low",      assignee:"m5", tags:["backend"],           createdAt:"2025-05-06" },
  { id:"t7",  projectId:"p1", title:"User settings page",     description:"Profile and preferences",        status:"todo",       priority:"medium",   assignee:"m3", tags:["frontend"],          createdAt:"2025-05-07" },
  { id:"t8",  projectId:"p1", title:"Write API docs",         description:"Swagger/OpenAPI documentation", status:"review",     priority:"medium",   assignee:"m5", tags:["docs"],              createdAt:"2025-05-08" },
  { id:"t9",  projectId:"p2", title:"RN project scaffold",    description:"Expo setup with navigation",     status:"done",       priority:"high",     assignee:"m1", tags:["mobile"],            createdAt:"2025-05-01" },
  { id:"t10", projectId:"p2", title:"Push notification setup",description:"Firebase Cloud Messaging",       status:"inprogress", priority:"high",     assignee:"m4", tags:["mobile","backend"],  createdAt:"2025-05-03" },
  { id:"t11", projectId:"p2", title:"Mobile UI screens",      description:"Dashboard, board, profile",      status:"todo",       priority:"medium",   assignee:"m3", tags:["design","mobile"],   createdAt:"2025-05-06" },
  { id:"t12", projectId:"p3", title:"API audit",              description:"Document all v1 endpoints",      status:"done",       priority:"high",     assignee:"m2", tags:["backend","docs"],    createdAt:"2025-05-01" },
  { id:"t13", projectId:"p3", title:"GraphQL schema design",  description:"Define types and mutations",      status:"todo",       priority:"high",     assignee:"m2", tags:["backend"],           createdAt:"2025-05-05" },
  { id:"t14", projectId:"p3", title:"CI/CD pipeline",         description:"GitHub Actions deploy flow",     status:"inprogress", priority:"critical", assignee:"m4", tags:["devops"],            createdAt:"2025-05-04" },
];

const PCOLOR = { critical:"#ef4444", high:"#f97316", medium:"#a78bfa", low:"#22c55e" };
const SCOLOR = { todo:"#6b7280", inprogress:"#3b82f6", review:"#f59e0b", done:"#22c55e" };
const TCOLOR = { frontend:"#3b82f6", backend:"#8b5cf6", design:"#ec4899", ai:"#f59e0b", auth:"#06b6d4", devops:"#10b981", docs:"#6b7280", mobile:"#f97316" };
const COLS   = [
  { id:"todo",       label:"To Do",       color:"#6b7280" },
  { id:"inprogress", label:"In Progress", color:"#3b82f6" },
  { id:"review",     label:"Review",      color:"#f59e0b" },
  { id:"done",       label:"Done",        color:"#22c55e" },
];

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const Ctx = createContext(null);
let uid = 100;

function AppProvider({ children }) {
  const [projects]                = useState(PROJECTS);
  const [tasks,    setTasks]      = useState(TASKS_INIT);
  const [members]                 = useState(MEMBERS);
  const [active,   setActive]     = useState("p1");
  const [aiMsgs,   setAiMsgs]     = useState([{
    role:"assistant",
    content:"Hi! I'm your AI assistant powered by Claude.\n\n**What I can do:**\n• **Generate tasks** from a feature description\n• **Summarize** project status and blockers\n• **Suggest assignments** based on workload\n• **Prioritize** your backlog\n\nTry: *\"Generate tasks for a user authentication feature\"*",
  }]);

  const addTask    = useCallback(t  => { const n={id:`t${++uid}`,createdAt:new Date().toISOString().slice(0,10),status:"todo",priority:"medium",tags:[],...t}; setTasks(p=>[...p,n]); return n; },[]);
  const updateTask = useCallback((id,u)=>setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t)),[]);
  const deleteTask = useCallback(id =>setTasks(p=>p.filter(t=>t.id!==id)),[]);
  const byProject  = useCallback(pid=>tasks.filter(t=>t.projectId===pid),[tasks]);
  const byMember   = useCallback(mid=>tasks.filter(t=>t.assignee===mid),[tasks]);
  const getProject = useCallback(id =>projects.find(p=>p.id===id),[projects]);
  const getMember  = useCallback(id =>members.find(m=>m.id===id),[members]);

  return (
    <Ctx.Provider value={{ projects,tasks,members,active,setActive,aiMsgs,setAiMsgs,addTask,updateTask,deleteTask,byProject,byMember,getProject,getMember }}>
      {children}
    </Ctx.Provider>
  );
}

const useApp = () => useContext(Ctx);

// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────

const Avatar = ({m,size=26})=>(
  <div style={{width:size,height:size,borderRadius:"50%",background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:700,color:"#fff",flexShrink:0}}>{m.avatar}</div>
);

const Badge = ({label,color="#6b7280"})=>(
  <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:color+"22",color,border:`1px solid ${color}44`}}>{label}</span>
);

// ─── AI PANEL ────────────────────────────────────────────────────────────────

const SYSTEM = `You are an AI assistant in TaskFlow, a project management tool.
Help teams by:
1. GENERATING TASKS: Format each as: TASK: [title] | PRIORITY: [critical/high/medium/low] | TAGS: [tag1,tag2]
2. Summarizing project status concisely
3. Suggesting smart assignments based on workload
4. Prioritization advice

Team: Priya Sharma (Frontend Dev, 3 tasks), Arjun Nair (Backend Dev, 4 tasks), Sneha Patel (Designer, 2 tasks), Rohit Kumar (DevOps, 5 tasks), Kavya Menon (PM, 3 tasks).
Be concise and actionable. Always use TASK: format when generating tasks.`;

function parseTasks(text) {
  return text.split("\n").filter(l=>l.includes("TASK:")).map(line=>{
    const title    = (line.match(/TASK:\s*([^|]+)/)||[])[1]?.trim()||"";
    const priority = (line.match(/PRIORITY:\s*([^|]+)/)||[])[1]?.trim().toLowerCase()||"medium";
    const tags     = ((line.match(/TAGS:\s*(.+)/)||[])[1]||"").split(",").map(t=>t.trim()).filter(Boolean);
    return title ? {title,priority,tags} : null;
  }).filter(Boolean);
}

function MsgBubble({ msg }) {
  const {addTask,active} = useApp();
  const [added, setAdded] = useState(false);
  const isAI = msg.role==="assistant";
  const detected = isAI ? parseTasks(msg.content) : [];

  const renderMd = text => text.split("\n").map((line,i)=>{
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <div key={i} style={{marginBottom:line===""?5:0}}>{parts.map((p,j)=>p.startsWith("**")?<strong key={j}>{p.slice(2,-2)}</strong>:<span key={j}>{p}</span>)}</div>;
  });

  return (
    <div style={{marginBottom:14,display:"flex",gap:8,alignItems:"flex-start",flexDirection:isAI?"row":"row-reverse"}}>
      {isAI && <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✦</div>}
      <div style={{maxWidth:"88%"}}>
        <div style={{padding:"9px 13px",borderRadius:isAI?"4px 12px 12px 12px":"12px 4px 12px 12px",background:isAI?"#1e1e2e":"#2d1b69",border:`1px solid ${isAI?"#2a2a35":"#4c1d95"}`,fontSize:13,lineHeight:1.6,color:"#e2e2e8"}}>
          {renderMd(msg.content)}
        </div>
        {detected.length>0 && (
          <div style={{marginTop:7,padding:"10px 12px",background:"#0f1729",border:"1px solid #1e3a5f",borderRadius:10}}>
            <div style={{fontSize:11,color:"#60a5fa",fontWeight:600,marginBottom:6}}>{detected.length} TASKS DETECTED</div>
            {detected.map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:PCOLOR[t.priority]||"#a78bfa",flexShrink:0}}/>
                <span style={{fontSize:12,color:"#cbd5e1",flex:1}}>{t.title}</span>
                <Badge label={t.priority} color={PCOLOR[t.priority]}/>
              </div>
            ))}
            <button onClick={()=>{if(!added){detected.forEach(t=>addTask({...t,projectId:active}));setAdded(true);}}}
              style={{marginTop:8,width:"100%",padding:"6px",borderRadius:8,background:added?"#1e293b":"#1d4ed8",border:"none",color:added?"#64748b":"#fff",cursor:added?"default":"pointer",fontSize:12,fontWeight:600}}>
              {added?"✓ Added to Board":`+ Add All ${detected.length} Tasks to Board`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AIPanel({ onClose }) {
  const {aiMsgs,setAiMsgs,active,getProject,byProject,members} = useApp();
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[aiMsgs,loading]);

  const ctx = () => {
    const p=getProject(active); const ts=byProject(active);
    const sc=ts.reduce((a,t)=>{a[t.status]=(a[t.status]||0)+1;return a},{});
    return `\nCurrent project: ${p?.name} (${p?.progress}% done). Tasks: ${JSON.stringify(sc)}. Team: ${members.map(m=>`${m.name}(${m.role},${m.load} tasks)`).join(", ")}`;
  };

  const send = async () => {
    if(!input.trim()||loading) return;
    const userMsg={role:"user",content:input.trim()};
    const msgs=[...aiMsgs,userMsg];
    setAiMsgs(msgs); setInput(""); setLoading(true);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYSTEM+ctx(),
          messages:msgs.map(m=>({role:m.role,content:m.content}))})
      });
      const d=await res.json();
      const text=d.content?.map(b=>b.text||"").join("")||"Sorry, couldn't get a response.";
      setAiMsgs(p=>[...p,{role:"assistant",content:text}]);
    } catch { setAiMsgs(p=>[...p,{role:"assistant",content:"Connection error. Please check the API setup."}]); }
    finally { setLoading(false); }
  };

  const QUICK=["Generate tasks for user auth feature","Summarize project status","Who should handle backend tasks?","What should the team focus on this week?"];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#13131a"}}>
      <div style={{padding:"14px 16px",borderBottom:"1px solid #2a2a35",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>AI Assistant</div><div style={{fontSize:11,color:"#6b6b7e"}}>Powered by Claude</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b6b7e",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"14px 13px"}}>
        {aiMsgs.map((m,i)=><MsgBubble key={i} msg={m}/>)}
        {loading && (
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✦</div>
            <div style={{display:"flex",gap:4}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#6b6b7e",animation:`dot 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {aiMsgs.length<=1 && (
        <div style={{padding:"0 13px 10px"}}>
          <div style={{fontSize:11,color:"#6b6b7e",marginBottom:7}}>QUICK ACTIONS</div>
          {QUICK.map((q,i)=>(
            <button key={i} onClick={()=>setInput(q)} style={{width:"100%",display:"block",padding:"7px 10px",borderRadius:8,background:"#1a1a24",border:"1px solid #2a2a35",color:"#8888a0",cursor:"pointer",fontSize:12,textAlign:"left",marginBottom:5}}>{q}</button>
          ))}
        </div>
      )}
      <div style={{padding:"10px 13px 14px",borderTop:"1px solid #2a2a35",flexShrink:0}}>
        <div style={{display:"flex",gap:8,background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:12,padding:"4px 4px 4px 12px",alignItems:"flex-end"}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Ask AI to generate tasks, summarize, assign…"
            rows={1} style={{flex:1,background:"none",border:"none",color:"#e2e2e8",fontSize:13,resize:"none",outline:"none",minHeight:36,maxHeight:100,lineHeight:1.5,padding:"6px 0"}}/>
          <button onClick={send} disabled={loading||!input.trim()}
            style={{width:34,height:34,borderRadius:8,background:input.trim()&&!loading?"#6d28d9":"#2a2a35",border:"none",color:input.trim()&&!loading?"#fff":"#4a4a5a",cursor:input.trim()&&!loading?"pointer":"default",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
        </div>
        <div style={{fontSize:10,color:"#4a4a5a",marginTop:4,textAlign:"center"}}>Enter to send · Shift+Enter for new line</div>
      </div>
      <style>{`@keyframes dot{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard() {
  const {projects,tasks,members,setActive} = useApp();
  const done=tasks.filter(t=>t.status==="done").length;
  const inp =tasks.filter(t=>t.status==="inprogress").length;
  const crit=tasks.filter(t=>t.priority==="critical").length;

  return (
    <div style={{maxWidth:1050}}>
      <div style={{marginBottom:26}}>
        <h1 style={{fontSize:22,fontWeight:800,letterSpacing:"-0.5px",margin:"0 0 3px",color:"#e2e2e8"}}>Dashboard</h1>
        <p style={{color:"#6b6b7e",fontSize:13,margin:0}}>Your projects at a glance</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[{l:"Total Tasks",v:tasks.length,c:"#e2e2e8"},{l:"In Progress",v:inp,c:"#3b82f6"},{l:"Completed",v:done,c:"#22c55e"},{l:"Critical",v:crit,c:"#ef4444"}].map(s=>(
          <div key={s.l} style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:"#6b6b7e",marginBottom:5}}>{s.l}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.c,letterSpacing:"-0.5px"}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:700,margin:0,color:"#e2e2e8"}}>Projects</h2>
          <span style={{fontSize:12,color:"#6b6b7e"}}>{projects.length} projects</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {projects.map(p=>{
            const pt=tasks.filter(t=>t.projectId===p.id);
            const pm=members.filter(m=>p.members.includes(m.id));
            return (
              <div key={p.id} onClick={()=>setActive(p.id)}
                style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,padding:18,cursor:"pointer",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color+"80";e.currentTarget.style.background="#1a1a24";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a35";e.currentTarget.style.background="#16161d";}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:p.color}}/>
                      <span style={{fontWeight:700,fontSize:14,color:"#e2e2e8"}}>{p.name}</span>
                    </div>
                    <div style={{fontSize:11,color:"#6b6b7e"}}>{p.description}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:p.status==="active"?"#052e16":"#1c1917",color:p.status==="active"?"#22c55e":"#a3a3a3",border:"1px solid",borderColor:p.status==="active"?"#15803d":"#404040"}}>{p.status}</span>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#6b6b7e"}}>Progress</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#e2e2e8"}}>{p.progress}%</span>
                  </div>
                  <div style={{height:5,background:"#2a2a35",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:p.progress+"%",background:p.color,borderRadius:3}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {[{l:"Total",v:pt.length},{l:"Active",v:pt.filter(t=>t.status==="inprogress").length,c:"#3b82f6"},{l:"Done",v:pt.filter(t=>t.status==="done").length,c:"#22c55e"}].map(s=>(
                    <div key={s.l} style={{flex:1,background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:7,padding:"5px 0",textAlign:"center"}}>
                      <div style={{fontSize:15,fontWeight:700,color:s.c||"#e2e2e8"}}>{s.v}</div>
                      <div style={{fontSize:10,color:"#6b6b7e"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex"}}>
                    {pm.slice(0,4).map((m,i)=>(
                      <div key={m.id} style={{width:22,height:22,borderRadius:"50%",background:m.color,border:"2px solid #16161d",marginLeft:i?-6:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>{m.avatar}</div>
                    ))}
                  </div>
                  <span style={{fontSize:10,color:"#6b6b7e"}}>Due {p.deadline}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent + workload */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:14}}>
        <div style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,padding:18}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#e2e2e8"}}>Recent Tasks</div>
          {[...tasks].sort((a,b)=>b.id.localeCompare(a.id)).slice(0,6).map(t=>{
            const m=members.find(x=>x.id===t.assignee);
            const p=projects.find(x=>x.id===t.projectId);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #1e1e2e"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:PCOLOR[t.priority]||"#6b6b7e",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#e2e2e8"}}>{t.title}</div>
                  <div style={{fontSize:11,color:"#6b6b7e"}}>{p?.name}</div>
                </div>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#1a1a24",color:SCOLOR[t.status]||"#6b6b7e",border:"1px solid #2a2a35",flexShrink:0}}>{t.status}</span>
                {m && <Avatar m={m} size={22}/>}
              </div>
            );
          })}
        </div>
        <div style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,padding:18}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#e2e2e8"}}>Team Workload</div>
          {members.map(m=>(
            <div key={m.id} style={{marginBottom:13}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                <Avatar m={m} size={24}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#e2e2e8"}}>{m.name.split(" ")[0]}</div>
                  <div style={{fontSize:10,color:"#6b6b7e"}}>{m.role}</div>
                </div>
                <span style={{fontSize:11,color:m.load>=5?"#ef4444":"#6b6b7e"}}>{m.load}</span>
              </div>
              <div style={{height:4,background:"#2a2a35",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:(m.load/7*100)+"%",background:m.load>=5?"#ef4444":m.load>=4?"#f97316":m.color,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BOARD ────────────────────────────────────────────────────────────────────

function TaskModal({task,onClose}) {
  const {members,projects,updateTask,deleteTask}=useApp();
  const [ed,setEd]=useState({...task});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:16,padding:26,width:480,maxHeight:"80vh",overflow:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <span style={{fontWeight:700,fontSize:16,color:"#e2e2e8"}}>Edit Task</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b6b7e",cursor:"pointer",fontSize:20}}>×</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input value={ed.title} onChange={e=>setEd(p=>({...p,title:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:14,outline:"none"}}/>
          <textarea value={ed.description||""} onChange={e=>setEd(p=>({...p,description:e.target.value}))} rows={3} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,resize:"vertical",outline:"none"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <select value={ed.status} onChange={e=>setEd(p=>({...p,status:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,outline:"none"}}>
              {COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={ed.priority} onChange={e=>setEd(p=>({...p,priority:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,outline:"none"}}>
              {["critical","high","medium","low"].map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <select value={ed.assignee||""} onChange={e=>setEd(p=>({...p,assignee:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,outline:"none"}}>
            <option value="">Unassigned</option>
            {members.map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={()=>{updateTask(task.id,ed);onClose();}} style={{flex:1,padding:"9px",borderRadius:8,background:"#6d28d9",border:"none",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Save</button>
          <button onClick={()=>{deleteTask(task.id);onClose();}} style={{padding:"9px 14px",borderRadius:8,background:"#1a1a24",border:"1px solid #ef444440",color:"#ef4444",cursor:"pointer",fontSize:14}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function AddModal({onClose}) {
  const {members,active,addTask}=useApp();
  const [f,setF]=useState({title:"",description:"",priority:"medium",assignee:"",tags:""});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:16,padding:26,width:440}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:18,color:"#e2e2e8"}}>New Task</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <input placeholder="Task title *" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:14,outline:"none"}}/>
          <textarea placeholder="Description" value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} rows={2} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,resize:"vertical",outline:"none"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <select value={f.priority} onChange={e=>setF(p=>({...p,priority:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,outline:"none"}}>
              {["critical","high","medium","low"].map(x=><option key={x} value={x}>{x}</option>)}
            </select>
            <select value={f.assignee} onChange={e=>setF(p=>({...p,assignee:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,outline:"none"}}>
              <option value="">Unassigned</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <input placeholder="Tags: frontend, ai, backend" value={f.tags} onChange={e=>setF(p=>({...p,tags:e.target.value}))} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"8px 12px",color:"#e2e2e8",fontSize:13,outline:"none"}}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={()=>{if(f.title.trim()){addTask({...f,projectId:active,tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean)});onClose();}}} style={{flex:1,padding:"9px",borderRadius:8,background:"#6d28d9",border:"none",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Create Task</button>
          <button onClick={onClose} style={{padding:"9px 14px",borderRadius:8,background:"#1a1a24",border:"1px solid #2a2a35",color:"#8888a0",cursor:"pointer",fontSize:14}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function BoardPage() {
  const {tasks,members,active,updateTask}=useApp();
  const [dragging,setDragging]=useState(null);
  const [hover,setHover]=useState(null);
  const [sel,setSel]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [filter,setFilter]=useState("all");
  const pt=tasks.filter(t=>t.projectId===active);
  const ft=filter==="all"?pt:pt.filter(t=>t.assignee===filter);

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexShrink:0}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,margin:"0 0 3px",letterSpacing:"-0.5px",color:"#e2e2e8"}}>Task Board</h1>
          <p style={{color:"#6b6b7e",fontSize:12,margin:0}}>{pt.length} tasks · drag cards between columns</p>
        </div>
        <div style={{display:"flex",gap:9,alignItems:"center"}}>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"6px 11px",color:"#e2e2e8",fontSize:12,outline:"none",cursor:"pointer"}}>
            <option value="all">All Members</option>
            {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={()=>setShowAdd(true)} style={{padding:"6px 14px",borderRadius:8,background:"#6d28d9",border:"none",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>+ New Task</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,flex:1,overflow:"auto",alignItems:"start"}}>
        {COLS.map(col=>{
          const ct=ft.filter(t=>t.status===col.id);
          return (
            <div key={col.id}
              onDragOver={e=>{e.preventDefault();setHover(col.id);}}
              onDrop={()=>{if(dragging&&dragging.status!==col.id)updateTask(dragging.id,{status:col.id});setDragging(null);setHover(null);}}
              onDragLeave={()=>setHover(null)}
              style={{background:hover===col.id?"#1a1a24":"#13131a",border:`1px solid ${hover===col.id?col.color+"60":"#2a2a35"}`,borderRadius:12,padding:12,minHeight:180,transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:col.color}}/>
                  <span style={{fontWeight:600,fontSize:13,color:"#e2e2e8"}}>{col.label}</span>
                </div>
                <span style={{fontSize:11,background:"#1e1e2e",color:"#6b6b7e",padding:"2px 7px",borderRadius:20}}>{ct.length}</span>
              </div>
              {ct.map(task=>{
                const m=members.find(x=>x.id===task.assignee);
                return (
                  <div key={task.id} draggable onDragStart={()=>setDragging(task)} onClick={()=>setSel(task)}
                    style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:10,padding:"11px 13px",cursor:"grab",marginBottom:8,transition:"all .15s",userSelect:"none"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#3a3a4e";e.currentTarget.style.background="#1a1a24";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a35";e.currentTarget.style.background="#16161d";}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7,flexWrap:"wrap"}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:PCOLOR[task.priority]||"#6b6b7e"}}/>
                      {(task.tags||[]).map(tag=><Badge key={tag} label={tag} color={TCOLOR[tag]||"#6b7280"}/>)}
                    </div>
                    <div style={{fontSize:13,fontWeight:500,color:"#e2e2e8",lineHeight:1.4,marginBottom:task.description?6:0}}>{task.title}</div>
                    {task.description && <div style={{fontSize:11,color:"#6b6b7e",marginBottom:6,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{task.description}</div>}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}>
                      <span style={{fontSize:10,color:"#6b6b7e"}}>{task.createdAt}</span>
                      {m && <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:10,color:"#6b6b7e"}}>{m.name.split(" ")[0]}</span><Avatar m={m} size={20}/></div>}
                    </div>
                  </div>
                );
              })}
              {ct.length===0 && <div style={{fontSize:12,color:"#2a2a35",textAlign:"center",padding:"18px 0"}}>Drop tasks here</div>}
            </div>
          );
        })}
      </div>

      {sel && <TaskModal task={sel} onClose={()=>setSel(null)}/>}
      {showAdd && <AddModal onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}

// ─── TEAM PAGE ────────────────────────────────────────────────────────────────

function TeamPage() {
  const {members,tasks,projects,byMember}=useApp();
  return (
    <div style={{maxWidth:920}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800,margin:"0 0 3px",letterSpacing:"-0.5px",color:"#e2e2e8"}}>Team</h1>
        <p style={{color:"#6b6b7e",fontSize:13,margin:0}}>{members.length} members · workload overview</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {members.map(m=>{
          const mt=byMember(m.id);
          const pct=Math.min(100,m.load/7*100);
          return (
            <div key={m.id} style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #1e1e2e",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <Avatar m={m} size={42}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#e2e2e8"}}>{m.name}</div>
                  <div style={{fontSize:12,color:"#6b6b7e"}}>{m.role}</div>
                </div>
                {[{l:"Total",v:mt.length},{l:"Active",v:mt.filter(t=>t.status==="inprogress").length,c:"#3b82f6"},{l:"Done",v:mt.filter(t=>t.status==="done").length,c:"#22c55e"}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,padding:"7px 14px"}}>
                    <div style={{fontSize:17,fontWeight:700,color:s.c||"#e2e2e8"}}>{s.v}</div>
                    <div style={{fontSize:10,color:"#6b6b7e"}}>{s.l}</div>
                  </div>
                ))}
                <div style={{width:120}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#6b6b7e"}}>Workload</span>
                    <span style={{fontSize:11,color:pct>=70?"#ef4444":"#6b6b7e",fontWeight:600}}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{height:5,background:"#2a2a35",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:pct>=70?"#ef4444":pct>=50?"#f97316":m.color,borderRadius:3}}/>
                  </div>
                </div>
              </div>
              {mt.length>0 && (
                <div style={{padding:"12px 20px",display:"flex",flexWrap:"wrap",gap:7}}>
                  {mt.map(t=>{
                    const p=projects.find(x=>x.id===t.projectId);
                    return (
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 9px",background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:8,fontSize:12}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:PCOLOR[t.priority]||"#6b6b7e"}}/>
                        <span style={{color:"#c4c4d0"}}>{t.title}</span>
                        <span style={{color:SCOLOR[t.status]||"#6b6b7e",fontSize:10}}>● {t.status}</span>
                        {p&&<span style={{color:"#6b6b7e",fontSize:10}}>{p.name}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────

function BarChart({data,title}) {
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"),W=c.width,H=c.height;
    ctx.clearRect(0,0,W,H);
    const max=Math.max(...data.map(d=>d.value),1);
    const bw=(W-40)/data.length-10;
    data.forEach((d,i)=>{
      const x=20+i*((W-40)/data.length);
      const bh=(d.value/max)*(H-55);
      const y=H-28-bh;
      ctx.fillStyle=d.color||"#6d28d9";
      ctx.beginPath(); ctx.roundRect(x,y,bw,bh,[4,4,0,0]); ctx.fill();
      ctx.fillStyle="#e2e2e8"; ctx.font="bold 11px system-ui"; ctx.textAlign="center";
      if(d.value>0) ctx.fillText(d.value,x+bw/2,y-5);
      ctx.fillStyle="#6b6b7e"; ctx.font="10px system-ui";
      ctx.fillText(d.label,x+bw/2,H-8);
    });
  },[data]);
  return (
    <div style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,padding:18}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#e2e2e8"}}>{title}</div>
      <canvas ref={ref} width={420} height={170} style={{width:"100%",height:170}}/>
    </div>
  );
}

function DonutChart({data,title,total}) {
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"),W=c.width,H=c.height;
    ctx.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2,r=Math.min(W,H)/2-16;
    let angle=-Math.PI/2;
    const tot=data.reduce((s,d)=>s+d.value,0)||1;
    data.forEach(d=>{
      const sl=(d.value/tot)*2*Math.PI;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+sl); ctx.closePath();
      ctx.fillStyle=d.color; ctx.fill(); angle+=sl;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*.58,0,2*Math.PI); ctx.fillStyle="#16161d"; ctx.fill();
    ctx.fillStyle="#e2e2e8"; ctx.font="bold 18px system-ui"; ctx.textAlign="center";
    ctx.fillText(total,cx,cy+5);
    ctx.fillStyle="#6b6b7e"; ctx.font="10px system-ui"; ctx.fillText("tasks",cx,cy+18);
  },[data,total]);
  return (
    <div style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,padding:18}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#e2e2e8"}}>{title}</div>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <canvas ref={ref} width={150} height={150} style={{width:130,height:130,flexShrink:0}}/>
        <div style={{flex:1}}>
          {data.map(d=>(
            <div key={d.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:d.color}}/>
                <span style={{fontSize:12,color:"#c4c4d0"}}>{d.label}</span>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:"#e2e2e8"}}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const {tasks,projects,members,byMember}=useApp();
  const byStatus=[
    {label:"Todo",    value:tasks.filter(t=>t.status==="todo").length,       color:"#6b7280"},
    {label:"In Prog", value:tasks.filter(t=>t.status==="inprogress").length, color:"#3b82f6"},
    {label:"Review",  value:tasks.filter(t=>t.status==="review").length,     color:"#f59e0b"},
    {label:"Done",    value:tasks.filter(t=>t.status==="done").length,       color:"#22c55e"},
  ];
  const byPriority=[
    {label:"Critical",value:tasks.filter(t=>t.priority==="critical").length,color:"#ef4444"},
    {label:"High",    value:tasks.filter(t=>t.priority==="high").length,    color:"#f97316"},
    {label:"Medium",  value:tasks.filter(t=>t.priority==="medium").length,  color:"#a78bfa"},
    {label:"Low",     value:tasks.filter(t=>t.priority==="low").length,     color:"#22c55e"},
  ];
  const byMemberData=members.map(m=>({label:m.name.split(" ")[0],value:byMember(m.id).length,color:m.color}));
  const byProjectData=projects.map(p=>({label:p.name.split(" ")[0],value:tasks.filter(t=>t.projectId===p.id).length,color:p.color}));
  const cr=Math.round(tasks.filter(t=>t.status==="done").length/tasks.length*100);

  return (
    <div style={{maxWidth:960}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800,margin:"0 0 3px",letterSpacing:"-0.5px",color:"#e2e2e8"}}>Reports</h1>
        <p style={{color:"#6b6b7e",fontSize:13,margin:0}}>Analytics across all projects</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Completion Rate",v:cr+"%",c:"#22c55e"},{l:"Active Projects",v:projects.filter(p=>p.status==="active").length,c:"#3b82f6"},{l:"Avg Tasks/Member",v:Math.round(tasks.length/members.length),c:"#a78bfa"},{l:"Critical Tasks",v:tasks.filter(t=>t.priority==="critical").length,c:"#ef4444"}].map(s=>(
          <div key={s.l} style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:12,padding:"15px 17px"}}>
            <div style={{fontSize:11,color:"#6b6b7e",marginBottom:5}}>{s.l}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.c,letterSpacing:"-0.5px"}}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <DonutChart data={byStatus} title="Tasks by Status" total={tasks.length}/>
        <DonutChart data={byPriority} title="Tasks by Priority" total={tasks.length}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <BarChart data={byMemberData} title="Tasks per Member"/>
        <BarChart data={byProjectData} title="Tasks per Project"/>
      </div>
      <div style={{background:"#16161d",border:"1px solid #2a2a35",borderRadius:14,padding:18}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#e2e2e8"}}>Project Progress</div>
        {projects.map(p=>{
          const pt=tasks.filter(t=>t.projectId===p.id);
          return (
            <div key={p.id} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:p.color}}/>
                  <span style={{fontSize:13,fontWeight:600,color:"#e2e2e8"}}>{p.name}</span>
                  <span style={{fontSize:11,color:"#6b6b7e"}}>{pt.filter(t=>t.status==="done").length}/{pt.length} done</span>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:p.color}}>{p.progress}%</span>
              </div>
              <div style={{height:7,background:"#2a2a35",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:p.progress+"%",background:p.color,borderRadius:4}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LAYOUT + APP ────────────────────────────────────────────────────────────

const NAV=[
  {id:"dashboard",label:"Dashboard",icon:"⊞"},
  {id:"board",    label:"Task Board",icon:"▦"},
  {id:"team",     label:"Team",      icon:"◑"},
  {id:"reports",  label:"Reports",   icon:"◈"},
];

function AppShell() {
  const {projects,active,setActive}=useApp();
  const [page,setPage]=useState("dashboard");
  const [aiOpen,setAiOpen]=useState(false);
  const proj=projects.find(p=>p.id===active);

  const pages={dashboard:<Dashboard/>,board:<BoardPage/>,team:<TeamPage/>,reports:<ReportsPage/>};

  return (
    <div style={{display:"flex",height:"100vh",background:"#0f0f13",color:"#e2e2e8",fontFamily:"'DM Sans','Segoe UI',sans-serif",overflow:"hidden"}}>
      {/* Sidebar */}
      <aside style={{width:210,background:"#16161d",borderRight:"1px solid #2a2a35",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 18px 14px",borderBottom:"1px solid #2a2a35"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700}}>T</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,letterSpacing:"-0.3px"}}>TaskFlow</div>
              <div style={{fontSize:10,color:"#6b6b7e"}}>AI-Powered</div>
            </div>
          </div>
        </div>

        <div style={{padding:"14px 10px 8px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b6b7e",textTransform:"uppercase",letterSpacing:"0.08em",padding:"0 8px 7px"}}>Projects</div>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>{setActive(p.id);setPage("board");}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,background:active===p.id?"#1e1e2e":"transparent",border:active===p.id?"1px solid #2e2e40":"1px solid transparent",cursor:"pointer",color:active===p.id?"#e2e2e8":"#8888a0",textAlign:"left",transition:"all .15s",marginBottom:2}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:p.color,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
              <span style={{fontSize:9,background:active===p.id?"#2a2a3e":"#1e1e28",color:"#8888a0",padding:"1px 5px",borderRadius:8}}>{p.status==="active"?"●":"○"}</span>
            </button>
          ))}
        </div>

        <nav style={{padding:"4px 10px",flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:"#6b6b7e",textTransform:"uppercase",letterSpacing:"0.08em",padding:"8px 8px"}}>Navigation</div>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 9px",borderRadius:8,background:page===n.id?"#1e1e2e":"transparent",border:page===n.id?"1px solid #2e2e40":"1px solid transparent",cursor:"pointer",color:page===n.id?"#a78bfa":"#8888a0",textAlign:"left",transition:"all .15s",marginBottom:2}}>
              <span style={{fontSize:15,lineHeight:1}}>{n.icon}</span>
              <span style={{fontSize:12,fontWeight:page===n.id?600:400}}>{n.label}</span>
            </button>
          ))}
        </nav>

        <div style={{padding:"10px 10px 18px"}}>
          <button onClick={()=>setAiOpen(true)}
            style={{width:"100%",padding:"9px 11px",borderRadius:10,cursor:"pointer",background:"linear-gradient(135deg,#1a1030,#0d1a2e)",border:"1px solid #3d2a6e",color:"#c4b5fd",display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700}}>
            <span style={{fontSize:14}}>✦</span>
            <span>AI Assistant</span>
            <span style={{marginLeft:"auto",background:"#4c1d95",color:"#ddd6fe",fontSize:9,padding:"1px 5px",borderRadius:8,fontWeight:700}}>CLAUDE</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <header style={{height:52,background:"#16161d",borderBottom:"1px solid #2a2a35",display:"flex",alignItems:"center",padding:"0 22px",gap:14,flexShrink:0}}>
          <div style={{flex:1}}>
            {proj && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:proj.color}}/>
                <span style={{fontWeight:700,fontSize:14}}>{proj.name}</span>
                <span style={{fontSize:11,color:"#6b6b7e",background:"#1e1e2e",padding:"2px 7px",borderRadius:20,border:"1px solid #2a2a35"}}>{proj.status}</span>
              </div>
            )}
          </div>
          <button onClick={()=>setAiOpen(!aiOpen)}
            style={{padding:"5px 13px",borderRadius:8,background:aiOpen?"#2d1b69":"#1a1a24",border:`1px solid ${aiOpen?"#6d28d9":"#2a2a35"}`,color:aiOpen?"#c4b5fd":"#8888a0",cursor:"pointer",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:5}}>
            <span>✦</span> AI
          </button>
        </header>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>
          <div style={{flex:1,overflow:"auto",padding:22}}>{pages[page]||<Dashboard/>}</div>
          {aiOpen && (
            <div style={{width:360,borderLeft:"1px solid #2a2a35",flexShrink:0}}>
              <AIPanel onClose={()=>setAiOpen(false)}/>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppShell/></AppProvider>;
}