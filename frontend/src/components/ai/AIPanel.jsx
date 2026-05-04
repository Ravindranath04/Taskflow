// src/components/ai/AIPanel.jsx
import { useState, useRef, useEffect } from "react";
import { useApp } from "../../store/AppContext";
import { aiApi } from "../../api/services";

function parseTasks(text) {
  return text.split("\n").filter(l=>l.includes("TASK:")).map(line=>({
    title:    (line.match(/TASK:\s*([^|]+)/)||[])[1]?.trim()||"",
    priority: (line.match(/PRIORITY:\s*([^|]+)/)||[])[1]?.trim().toLowerCase()||"medium",
    tags:     ((line.match(/TAGS:\s*([^|]+)/)||[])[1]||"").split(",").map(t=>t.trim()).filter(Boolean),
  })).filter(t=>t.title);
}

function MsgBubble({ msg }) {
  const { addTask, activeProject } = useApp();
  const [added, setAdded] = useState(false);
  const isAI   = msg.role === "assistant";
  const detected = isAI ? parseTasks(msg.content) : [];

  // Execution results (from NLP commands)
  const hasResults = msg.results?.length > 0;

  const renderMd = text => text.split("\n").map((line,i)=>{
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <div key={i} style={{marginBottom:line===""?5:0}}>{parts.map((p,j)=>p.startsWith("**")?<strong key={j}>{p.slice(2,-2)}</strong>:<span key={j}>{p}</span>)}</div>;
  });

  return (
    <div style={{marginBottom:16,display:"flex",gap:8,alignItems:"flex-start",flexDirection:isAI?"row":"row-reverse"}}>
      {isAI&&<div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✦</div>}
      <div style={{maxWidth:"90%"}}>
        <div style={{padding:"9px 13px",borderRadius:isAI?"4px 12px 12px 12px":"12px 4px 12px 12px",background:isAI?"#1e1e2e":"#2d1b69",border:`1px solid ${isAI?"#2a2a35":"#4c1d95"}`,fontSize:13,lineHeight:1.6,color:"#e2e2e8"}}>
          {renderMd(msg.content)}
        </div>

        {/* NLP command execution results */}
        {hasResults && (
          <div style={{marginTop:7,padding:"10px 12px",background:"#052e16",border:"1px solid #15803d",borderRadius:10}}>
            <div style={{fontSize:11,color:"#4ade80",fontWeight:700,marginBottom:6}}>⚡ EXECUTED {msg.actions?.join(", ")}</div>
            {msg.results.map((r,i)=>(
              <div key={i} style={{fontSize:12,color:"#86efac",marginBottom:3}}>{r}</div>
            ))}
          </div>
        )}

        {/* Task detection */}
        {detected.length > 0 && (
          <div style={{marginTop:7,padding:"10px 12px",background:"#0f1729",border:"1px solid #1e3a5f",borderRadius:10}}>
            <div style={{fontSize:11,color:"#60a5fa",fontWeight:700,marginBottom:6}}>{detected.length} TASKS DETECTED</div>
            {detected.map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:t.priority==="critical"?"#ef4444":t.priority==="high"?"#f97316":"#a78bfa",flexShrink:0}}/>
                <span style={{fontSize:12,color:"#cbd5e1",flex:1}}>{t.title}</span>
              </div>
            ))}
            <button onClick={async()=>{if(!added){for(const t of detected)await addTask({...t,projectId:activeProject});setAdded(true);}}}
              style={{marginTop:8,width:"100%",padding:"6px",borderRadius:8,background:added?"#1e293b":"#1d4ed8",border:"none",color:added?"#64748b":"#fff",cursor:added?"default":"pointer",fontSize:12,fontWeight:600}}>
              {added?"✓ Added to Board":`+ Add All ${detected.length} Tasks`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const QUICK = [
  { label:"🤖 Auto-assign all tasks",    text:"Auto assign all unassigned tasks based on skills" },
  { label:"📊 Risk analysis",            text:"Analyse project risks and predict deadline" },
  { label:"📝 Generate tasks",           text:"Generate tasks for a user authentication feature" },
  { label:"📋 Summarize status",         text:"Summarize current project status" },
  { label:"🔄 Create sprint",            text:"Create a sprint with the 5 highest priority tasks" },
  { label:"👥 Who should do this?",      text:"Who on the team should handle backend API tasks?" },
];

export default function AIPanel({ onClose }) {
  const { aiMessages, setAiMessages, activeProject } = useApp();
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [mode,    setMode]    = useState("chat"); // chat | risk
  const [risk,    setRisk]    = useState(null);
  const [riskLoad,setRiskLoad]= useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[aiMessages,loading]);

  const send = async () => {
    if (!input.trim()||loading) return;
    const userMsg = {role:"user",content:input.trim()};
    const history = aiMessages.filter(m=>m.role==="user"||m.role==="assistant").slice(-8);
    setAiMessages(p=>[...p,userMsg]);
    setInput(""); setLoading(true);
    try {
      const res = await aiApi.chat(userMsg.content, activeProject, history);
      setAiMessages(p=>[...p,{
        role:"assistant",
        content:  res.reply,
        actions:  res.actions,
        results:  res.results,
        executed: res.executed,
      }]);
    } catch(err) {
      setAiMessages(p=>[...p,{role:"assistant",content:`Error: ${err.message}`}]);
    } finally { setLoading(false); }
  };

  const loadRisk = async () => {
    setRiskLoad(true);
    try {
      const r = await aiApi.analyseRisk(activeProject);
      setRisk(r);
    } catch {}
    setRiskLoad(false);
  };

  const RISK_COLOR = { CRITICAL:"#ef4444", HIGH:"#f97316", MEDIUM:"#F59E0B", LOW:"#22c55e" };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#13131a"}}>
      {/* Header */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid #2a2a35",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✦</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14,color:"#e2e2e8"}}>AI Assistant</div>
          <div style={{fontSize:11,color:"#6b6b7e"}}>NLP Commands · Auto-Assign · Risk Analysis</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b6b7e",cursor:"pointer",fontSize:20}}>×</button>
      </div>

      {/* Mode tabs */}
      <div style={{display:"flex",gap:4,padding:"10px 13px 0",flexShrink:0}}>
        {[{id:"chat",label:"💬 Chat"},{id:"risk",label:"📊 Risk"}].map(t=>(
          <button key={t.id} onClick={()=>{setMode(t.id);if(t.id==="risk"&&!risk)loadRisk();}}
            style={{padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:mode===t.id?"#1e1e2e":"transparent",color:mode===t.id?"#e2e2e8":"#6b6b7e"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Risk panel */}
      {mode==="risk" && (
        <div style={{flex:1,overflow:"auto",padding:"14px 13px"}}>
          {riskLoad && <div style={{color:"#6b6b7e",fontSize:13,textAlign:"center",paddingTop:40}}>Analysing project…</div>}
          {risk && !riskLoad && (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15,color:"#e2e2e8"}}>{risk.projectName}</div>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:RISK_COLOR[risk.riskLevel]+"22",color:RISK_COLOR[risk.riskLevel],border:`1px solid ${RISK_COLOR[risk.riskLevel]}44`,fontWeight:700}}>
                  {risk.riskLevel} RISK
                </span>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[
                  {l:"Days Left",    v:risk.daysLeft??'N/A',    c: risk.daysLeft<7?"#ef4444":"#22c55e"},
                  {l:"Days Needed",  v:risk.velocityDaysNeeded, c: risk.velocityDaysNeeded>risk.daysLeft?"#ef4444":"#22c55e"},
                  {l:"Overdue",      v:risk.overdueCount,       c: risk.overdueCount>0?"#f97316":"#22c55e"},
                  {l:"Unassigned",   v:risk.unassigned,         c: risk.unassigned>2?"#f97316":"#22c55e"},
                ].map(x=>(
                  <div key={x.l} style={{background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:x.c}}>{x.v}</div>
                    <div style={{fontSize:10,color:"#6b6b7e"}}>{x.l}</div>
                  </div>
                ))}
              </div>

              {risk.overloadedMembers?.length>0 && (
                <div style={{padding:"10px 12px",background:"#2d0a0a",border:"1px solid #7f1d1d",borderRadius:10,marginBottom:12}}>
                  <div style={{fontSize:11,color:"#fca5a5",fontWeight:700,marginBottom:4}}>⚠️ Overloaded Members</div>
                  {risk.overloadedMembers.map(m=><div key={m} style={{fontSize:12,color:"#fca5a5"}}>{m}</div>)}
                </div>
              )}

              <div style={{padding:"12px 14px",background:"#0f1729",border:"1px solid #1e3a5f",borderRadius:10}}>
                <div style={{fontSize:11,color:"#60a5fa",fontWeight:700,marginBottom:8}}>✦ AI Analysis</div>
                <div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{risk.analysis}</div>
              </div>

              <button onClick={loadRisk} style={{marginTop:12,width:"100%",padding:"8px",borderRadius:8,background:"#1a1a24",border:"1px solid #2a2a35",color:"#8888a0",cursor:"pointer",fontSize:12}}>
                🔄 Refresh Analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat panel */}
      {mode==="chat" && (
        <>
          <div style={{flex:1,overflow:"auto",padding:"14px 13px"}}>
            {aiMessages.map((m,i)=><MsgBubble key={i} msg={m}/>)}
            {loading&&(
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✦</div>
                <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#6b6b7e",animation:`dot 1.2s ease-in-out ${i*.2}s infinite`}}/>)}</div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick actions */}
          {aiMessages.length<=1 && (
            <div style={{padding:"0 13px 8px",flexShrink:0}}>
              <div style={{fontSize:11,color:"#6b6b7e",marginBottom:7}}>QUICK ACTIONS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {QUICK.map((q,i)=>(
                  <button key={i} onClick={()=>setInput(q.text)}
                    style={{padding:"7px 9px",borderRadius:8,background:"#1a1a24",border:"1px solid #2a2a35",color:"#8888a0",cursor:"pointer",fontSize:11,textAlign:"left",lineHeight:1.3}}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{padding:"10px 13px 14px",borderTop:"1px solid #2a2a35",flexShrink:0}}>
            <div style={{display:"flex",gap:8,background:"#1a1a24",border:"1px solid #2a2a35",borderRadius:12,padding:"4px 4px 4px 12px",alignItems:"flex-end"}}>
              <textarea value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Ask anything or give a command…"
                rows={1} style={{flex:1,background:"none",border:"none",color:"#e2e2e8",fontSize:13,resize:"none",outline:"none",minHeight:36,maxHeight:100,lineHeight:1.5,padding:"6px 0"}}/>
              <button onClick={send} disabled={loading||!input.trim()}
                style={{width:34,height:34,borderRadius:8,background:input.trim()&&!loading?"#6d28d9":"#2a2a35",border:"none",color:input.trim()&&!loading?"#fff":"#4a4a5a",cursor:input.trim()&&!loading?"pointer":"default",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes dot{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}