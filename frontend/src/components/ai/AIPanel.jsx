// src/components/ai/AIPanel.jsx
import { useState, useRef, useEffect } from "react";
import { useApp } from "../../store/AppContext";
import { aiApi } from "../../api/services";

function parseTasks(text) {
  return text.split("\n").filter(l => l.includes("TASK:")).map(line => {
    const title       = (line.match(/TASK:\s*([^|]+)/)       || [])[1]?.trim() || "";
    const priority    = (line.match(/PRIORITY:\s*([^|]+)/)   || [])[1]?.trim().toLowerCase() || "medium";
    const description = (line.match(/DESCRIPTION:\s*(.+)/)   || [])[1]?.trim() || "";
    const tags        = ((line.match(/TAGS:\s*([^|]+)/)      || [])[1] || "").split(",").map(t => t.trim()).filter(Boolean);
    return title ? { title, priority, description, tags } : null;
  }).filter(Boolean);
}

function MsgBubble({ msg }) {
  const { addTask, activeProject } = useApp();
  const [added, setAdded] = useState(false);
  const isAI = msg.role === "assistant";
  const detected = isAI ? parseTasks(msg.content) : [];

  const renderMd = text => text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={i} style={{ marginBottom: line === "" ? 5 : 0 }}>
        {parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : <span key={j}>{p}</span>)}
      </div>
    );
  });

  return (
    <div style={{ marginBottom:14, display:"flex", gap:8, alignItems:"flex-start", flexDirection:isAI?"row":"row-reverse" }}>
      {isAI && (
        <div style={{ width:26, height:26, borderRadius:"50%", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>✦</div>
      )}
      <div style={{ maxWidth:"88%" }}>
        <div style={{ padding:"9px 13px", borderRadius:isAI?"4px 12px 12px 12px":"12px 4px 12px 12px", background:isAI?"#1e1e2e":"#2d1b69", border:`1px solid ${isAI?"#2a2a35":"#4c1d95"}`, fontSize:13, lineHeight:1.6, color:"#e2e2e8" }}>
          {renderMd(msg.content)}
        </div>
        {detected.length > 0 && (
          <div style={{ marginTop:7, padding:"10px 12px", background:"#0f1729", border:"1px solid #1e3a5f", borderRadius:10 }}>
            <div style={{ fontSize:11, color:"#60a5fa", fontWeight:600, marginBottom:6 }}>{detected.length} TASKS DETECTED</div>
            {detected.map((t, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:t.priority==="critical"?"#ef4444":t.priority==="high"?"#f97316":"#a78bfa", flexShrink:0 }}/>
                <span style={{ fontSize:12, color:"#cbd5e1", flex:1 }}>{t.title}</span>
                <span style={{ fontSize:10, padding:"1px 6px", borderRadius:6, background:"#1e293b", color:"#64748b" }}>{t.priority}</span>
              </div>
            ))}
            <button
              onClick={async () => {
                if (!added) {
                  for (const t of detected) {
                    await addTask({ ...t, projectId: activeProject });
                  }
                  setAdded(true);
                }
              }}
              style={{ marginTop:8, width:"100%", padding:"6px", borderRadius:8, background:added?"#1e293b":"#1d4ed8", border:"none", color:added?"#64748b":"#fff", cursor:added?"default":"pointer", fontSize:12, fontWeight:600 }}>
              {added ? "✓ Added to Board" : `+ Add All ${detected.length} Tasks to Board`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIPanel({ onClose }) {
  const { aiMessages, setAiMessages, activeProject } = useApp();
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [aiMessages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", content:input.trim() };
    const history = aiMessages.filter(m => m.role === "user" || m.role === "assistant").slice(-10);
    setAiMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await aiApi.chat(userMsg.content, activeProject, history);
      setAiMessages(p => [...p, { role:"assistant", content: res.reply }]);
    } catch (err) {
      setAiMessages(p => [...p, { role:"assistant", content:`Error: ${err.message}. Make sure the backend is running on port 5000.` }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK = [
    "Generate tasks for user auth feature",
    "Summarize project status",
    "Who should handle backend tasks?",
    "What should the team focus on this week?",
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:"#13131a" }}>
      <div style={{ padding:"14px 16px", borderBottom:"1px solid #2a2a35", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>AI Assistant</div>
          <div style={{ fontSize:11, color:"#6b6b7e" }}>Powered by Claude · via Backend</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b6b7e", cursor:"pointer", fontSize:20, lineHeight:1 }}>×</button>
      </div>

      <div style={{ flex:1, overflow:"auto", padding:"14px 13px" }}>
        {aiMessages.map((m, i) => <MsgBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:26, height:26, borderRadius:"50%", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>✦</div>
            <div style={{ display:"flex", gap:4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#6b6b7e", animation:`dot 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {aiMessages.length <= 1 && (
        <div style={{ padding:"0 13px 10px" }}>
          <div style={{ fontSize:11, color:"#6b6b7e", marginBottom:7 }}>QUICK ACTIONS</div>
          {QUICK.map((q, i) => (
            <button key={i} onClick={() => setInput(q)}
              style={{ width:"100%", display:"block", padding:"7px 10px", borderRadius:8, background:"#1a1a24", border:"1px solid #2a2a35", color:"#8888a0", cursor:"pointer", fontSize:12, textAlign:"left", marginBottom:5 }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding:"10px 13px 14px", borderTop:"1px solid #2a2a35", flexShrink:0 }}>
        <div style={{ display:"flex", gap:8, background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:12, padding:"4px 4px 4px 12px", alignItems:"flex-end" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask AI to generate tasks, summarize, assign…"
            rows={1} style={{ flex:1, background:"none", border:"none", color:"#e2e2e8", fontSize:13, resize:"none", outline:"none", minHeight:36, maxHeight:100, lineHeight:1.5, padding:"6px 0" }}/>
          <button onClick={send} disabled={loading || !input.trim()}
            style={{ width:34, height:34, borderRadius:8, background:input.trim()&&!loading?"#6d28d9":"#2a2a35", border:"none", color:input.trim()&&!loading?"#fff":"#4a4a5a", cursor:input.trim()&&!loading?"pointer":"default", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>↑</button>
        </div>
        <div style={{ fontSize:10, color:"#4a4a5a", marginTop:4, textAlign:"center" }}>Enter to send · Shift+Enter for new line</div>
      </div>
      <style>{`@keyframes dot{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}