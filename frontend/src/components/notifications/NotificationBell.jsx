// src/components/notifications/NotificationBell.jsx
import { useState, useEffect, useRef } from "react";
import { notificationsApi } from "../../api/services";

const TYPE_ICON = {
  TASK_ASSIGNED:   "🤖",
  TASK_RATED:      "⭐",
  RISK_CRITICAL:   "🔴",
  RISK_HIGH:       "🟡",
  REMIND_ASSIGNEE: "⏰",
  NOTIFY_PM:       "⚠️",
  REASSIGN:        "🔄",
  STALE_CRITICAL:  "🔴",
  WELCOME:         "👋",
  DEFAULT:         "🔔",
};

export default function NotificationBell() {
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    loadNotifs();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadNotifs = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifs(data);
    } catch {}
  };

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    setLoading(true);
    await notificationsApi.markAllRead();
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    setLoading(false);
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      {/* Bell button */}
      <button onClick={() => setOpen(p => !p)}
        style={{ position:"relative", width:36, height:36, borderRadius:8, background:open?"#1e1e2e":"transparent", border:`1px solid ${open?"#2a2a35":"transparent"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, transition:"all .15s" }}>
        🔔
        {unread > 0 && (
          <div style={{ position:"absolute", top:4, right:4, width:16, height:16, borderRadius:"50%", background:"#ef4444", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #16161d" }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:340, background:"#16161d", border:"1px solid #2a2a35", borderRadius:14, zIndex:1000, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
          {/* Header */}
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #2a2a35", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#e2e2e8" }}>
              Notifications {unread > 0 && <span style={{ fontSize:11, background:"#ef4444", color:"#fff", padding:"1px 6px", borderRadius:10, marginLeft:6 }}>{unread}</span>}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} disabled={loading}
                style={{ background:"none", border:"none", color:"#6d28d9", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight:380, overflow:"auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding:"32px 16px", textAlign:"center", color:"#3a3a4e", fontSize:13 }}>
                No notifications yet
              </div>
            ) : notifs.map(n => (
              <div key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                style={{ padding:"12px 16px", borderBottom:"1px solid #1e1e2e", cursor:n.read?"default":"pointer", background:n.read?"transparent":"#1a1a2e", transition:"background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background="#1a1a24"}
                onMouseLeave={e => e.currentTarget.style.background=n.read?"transparent":"#1a1a2e"}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{TYPE_ICON[n.type] || TYPE_ICON.DEFAULT}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:n.read?400:600, color:"#e2e2e8", marginBottom:2 }}>{n.title}</div>
                    <div style={{ fontSize:12, color:"#6b6b7e", lineHeight:1.4 }}>{n.message}</div>
                    <div style={{ fontSize:10, color:"#4a4a5a", marginTop:4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && <div style={{ width:7, height:7, borderRadius:"50%", background:"#6d28d9", flexShrink:0, marginTop:4 }}/>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
