import { useState, useRef, useEffect } from "react";
import { Bell, X, Clock, CheckCircle } from "lucide-react";
import { T } from "../theme.js";

export default function NotificationBell({ notifications, dismiss, dismissAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = notifications.length;
  const urgent = notifications.filter(n => n.urgent).length;

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dotColor = urgent > 0 ? T.err : T.war;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative", background: open ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
          border: "none", borderRadius: 9, width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff", transition: "background .15s", flexShrink: 0,
        }}
      >
        <Bell size={18} strokeWidth={1.8} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: 7, right: 7, width: 8, height: 8,
            borderRadius: "50%", background: dotColor,
            border: "2px solid transparent", boxSizing: "content-box",
            animation: urgent ? "pulse 1.5s ease infinite" : "none",
          }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 320, background: T.card, borderRadius: 16,
          boxShadow: T.shM, border: `1px solid ${T.bdrL}`, zIndex: 400,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.bdrL}` }}>
            <span style={{ fontFamily: T.fH, fontSize: 17, fontWeight: 600, color: T.t }}>
              Recordatorios {count > 0 && <span style={{ fontSize: 13, color: T.tl, fontFamily: T.fB }}>({count})</span>}
            </span>
            {count > 0 && (
              <button onClick={() => { dismissAll(); setOpen(false); }}
                style={{ background: "none", border: "none", fontFamily: T.fB, fontSize: 12, color: T.tl, cursor: "pointer" }}>
                Limpiar todo
              </button>
            )}
          </div>

          {/* List */}
          {count === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center" }}>
              <CheckCircle size={28} color={T.suc} strokeWidth={1.4} style={{ marginBottom: 8, opacity: 0.6 }} />
              <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl }}>Sin recordatorios pendientes</div>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "14px 18px", borderBottom: `1px solid ${T.bdrL}`,
                background: n.urgent ? "rgba(184,80,80,0.04)" : "transparent",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: n.urgent ? T.errA : T.warA,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Clock size={16} color={n.urgent ? T.err : T.war} strokeWidth={1.6} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: n.urgent ? T.err : T.war, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t }}>{n.body}</div>
                </div>
                <button onClick={() => dismiss(n.id)}
                  style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 2, flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
