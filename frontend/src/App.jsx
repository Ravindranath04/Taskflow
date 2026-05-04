// src/App.jsx
import { useState } from "react";
import { AppProvider, useApp } from "./store/AppContext";
import AuthPage  from "./pages/AuthPage";
import Layout    from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import BoardPage from "./pages/BoardPage";
import { TeamPage, ReportsPage } from "./pages/TeamAndReports";

function LoadingScreen() {
  return (
    <div style={{ height:"100vh", background:"#0f0f13", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif", gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700 }}>T</div>
      <div style={{ color:"#6b6b7e", fontSize:14 }}>Loading TaskFlow…</div>
      <div style={{ display:"flex", gap:5 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#6d28d9", animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function AppShell() {
  const { user, loading } = useApp();
  const [page, setPage] = useState("dashboard");

  if (loading)  return <LoadingScreen/>;
  if (!user)    return <AuthPage/>;

  const pages = {
    dashboard: <Dashboard/>,
    board:     <BoardPage/>,
    team:      <TeamPage/>,
    reports:   <ReportsPage/>,
  };

  return (
    <Layout page={page} setPage={setPage}>
      {pages[page] || <Dashboard/>}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell/>
    </AppProvider>
  );
}