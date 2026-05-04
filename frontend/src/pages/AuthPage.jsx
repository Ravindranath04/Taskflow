// src/pages/AuthPage.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";

export default function AuthPage() {
  const { login, register, authLoading, error } = useApp();
  const [mode,  setMode]  = useState("login"); // "login" | "register"
  const [form,  setForm]  = useState({ name: "", email: "", password: "" });
  const [localError, setLocalError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLocalError("");
    if (!form.email || !form.password) return setLocalError("Email and password are required");
    if (mode === "register" && !form.name)   return setLocalError("Name is required");
    if (mode === "register" && form.password.length < 8) return setLocalError("Password must be at least 8 characters");

    const res = mode === "login"
      ? await login(form.email, form.password)
      : await register(form.name, form.email, form.password);

    if (!res.success) setLocalError(res.error);
  };

  const err = localError || error;

  return (
    <div style={{ minHeight:"100vh", background:"#0f0f13", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      {/* Background glow */}
      <div style={{ position:"fixed", top:"20%", left:"50%", transform:"translateX(-50%)", width:600, height:600, background:"radial-gradient(circle, #7C3AED18 0%, transparent 70%)", pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:420, padding:"0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, marginBottom:14 }}>T</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#e2e2e8", letterSpacing:"-0.5px", margin:"0 0 4px" }}>TaskFlow</h1>
          <p style={{ color:"#6b6b7e", fontSize:14, margin:0 }}>AI-Assisted Project Management</p>
        </div>

        {/* Card */}
        <div style={{ background:"#16161d", border:"1px solid #2a2a35", borderRadius:18, padding:32 }}>
          {/* Tabs */}
          <div style={{ display:"flex", background:"#0f0f13", borderRadius:10, padding:4, marginBottom:28 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setLocalError(""); }}
                style={{ flex:1, padding:"8px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, transition:"all .15s",
                  background: mode===m ? "#16161d" : "transparent",
                  color:      mode===m ? "#e2e2e8" : "#6b6b7e",
                  boxShadow:  mode===m ? "0 1px 4px rgba(0,0,0,.4)" : "none",
                }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {mode === "register" && (
              <div>
                <label style={{ fontSize:12, color:"#6b6b7e", display:"block", marginBottom:5 }}>Full Name</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Priya Sharma"
                  style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:9, padding:"10px 13px", color:"#e2e2e8", fontSize:14, outline:"none", boxSizing:"border-box" }}
                  onFocus={e => e.target.style.borderColor="#6d28d9"}
                  onBlur={e  => e.target.style.borderColor="#2a2a35"}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize:12, color:"#6b6b7e", display:"block", marginBottom:5 }}>Email</label>
              <input value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="you@company.com" type="email"
                style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:9, padding:"10px 13px", color:"#e2e2e8", fontSize:14, outline:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor="#6d28d9"}
                onBlur={e  => e.target.style.borderColor="#2a2a35"}
              />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#6b6b7e", display:"block", marginBottom:5 }}>Password</label>
              <input value={form.password} onChange={e => set("password", e.target.value)}
                placeholder={mode==="register" ? "Min 8 characters" : "••••••••"} type="password"
                onKeyDown={e => e.key==="Enter" && handleSubmit()}
                style={{ width:"100%", background:"#1a1a24", border:"1px solid #2a2a35", borderRadius:9, padding:"10px 13px", color:"#e2e2e8", fontSize:14, outline:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor="#6d28d9"}
                onBlur={e  => e.target.style.borderColor="#2a2a35"}
              />
            </div>
          </div>

          {err && (
            <div style={{ marginTop:14, padding:"10px 13px", background:"#2d0a0a", border:"1px solid #7f1d1d", borderRadius:8, color:"#fca5a5", fontSize:13 }}>
              {err}
            </div>
          )}

          <button onClick={handleSubmit} disabled={authLoading}
            style={{ width:"100%", marginTop:20, padding:"11px", borderRadius:10, background: authLoading ? "#2a2a35" : "linear-gradient(135deg,#7C3AED,#4F46E5)", border:"none", color: authLoading ? "#6b6b7e" : "#fff", cursor: authLoading ? "default":"pointer", fontSize:14, fontWeight:700, letterSpacing:"0.01em", transition:"all .15s" }}>
            {authLoading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {/* Demo hint */}
          {mode === "login" && (
            <div style={{ marginTop:18, padding:"11px 14px", background:"#0d1729", border:"1px solid #1e3a5f", borderRadius:10 }}>
              <div style={{ fontSize:11, color:"#60a5fa", fontWeight:700, marginBottom:6 }}>DEMO ACCOUNTS</div>
              {[["kavya@taskflow.dev","Admin"],["priya@taskflow.dev","Member"]].map(([e,r]) => (
                <div key={e} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <button onClick={() => setForm({ email:e, password:"password123", name:"" })}
                    style={{ background:"none", border:"none", color:"#93c5fd", cursor:"pointer", fontSize:12, padding:0, textDecoration:"underline" }}>
                    {e}
                  </button>
                  <span style={{ fontSize:10, color:"#64748b" }}>{r} · password123</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}