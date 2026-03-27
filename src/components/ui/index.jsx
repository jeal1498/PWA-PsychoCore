import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { T } from "../../theme.js";

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", small = false, style: sx = {}, disabled = false }) {
  const [hover, setHover] = useState(false);
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: T.fB, fontWeight: 500,
    letterSpacing: "0.01em", transition: "all .18s ease",
    padding: small ? "7px 14px" : "10px 20px",
    fontSize: small ? 13 : 14, borderRadius: 9999, opacity: disabled ? 0.55 : 1,
  };
  const styles = {
    primary: { background: hover ? T.pL : T.p, color: "#fff" },
    ghost:   { background: hover ? T.pA : "transparent", color: T.p, border: `1.5px solid ${T.bdr}` },
    danger:  { background: hover ? T.errA : "transparent", color: T.err, border: `1.5px solid ${T.errA}` },
    accent:  { background: hover ? "#D4996A" : T.acc, color: "#fff" },
    success: { background: hover ? "#3d7049" : T.suc, color: "#fff" },
  };
  return (
    <button
      style={{ ...base, ...(styles[variant] || styles.primary), ...sx }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={disabled ? undefined : onClick}
    >{children}</button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style: sx = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.card, borderRadius: 16, boxShadow: T.sh,
      border: `1px solid ${T.bdrL}`, overflow: "hidden",
      cursor: onClick ? "pointer" : "default", transition: "box-shadow .18s", ...sx,
    }}>{children}</div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 540 }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(26,43,40,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.card, borderRadius: 20, boxShadow: T.shM, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 18px", borderBottom: `1px solid ${T.bdrL}` }}>
          <span style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 600, color: T.t }}>{title}</span>
          <button onClick={onClose} style={{ background: T.bdrL, border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.tm }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Form controls ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600, color: T.tm,
  marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase",
};
const inputBase = {
  width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`,
  borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t,
  background: T.card, outline: "none", boxSizing: "border-box", transition: "border .15s",
};

export function Input({ label, value, onChange, type = "text", placeholder, style: sx = {} }) {
  return (
    <div style={{ marginBottom: 16, ...sx }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputBase} />
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ ...inputBase, resize: "vertical" }} />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inputBase, cursor: "pointer" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
      borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: T.fB,
      color: color || T.p, background: bg || T.pA, letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
// FIX D2: la prop `action` soporta dos formas:
//   1. Nodo React directo (comportamiento original preservado):
//      <EmptyState action={<button>...</button>} />
//   2. Objeto { label: string, onClick: fn } — renderiza un Btn primario estilizado:
//      <EmptyState action={{ label: "Nueva sesión", onClick: () => setShowAdd(true) }} />
export function EmptyState({ icon: Icon, title, desc, action }) {
  // FIX D2: detectar si action es objeto {label, onClick} o nodo React
  const actionNode = action && typeof action === "object" && "label" in action && "onClick" in action
    ? (
      <button
        onClick={action.onClick}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 22px", borderRadius: 9999,
          background: T.p, color: "#fff", border: "none",
          fontFamily: T.fB, fontSize: 13, fontWeight: 600,
          cursor: "pointer", transition: "opacity .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        {action.label}
      </button>
    )
    : action; // nodo React directo — sin cambios

  return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <Icon size={40} strokeWidth={1.2} style={{ marginBottom: 16, opacity: 0.35, color: T.tl }} />
      <div style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.tm, marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl }}>{desc}</div>
      {actionNode && <div style={{ marginTop: 20 }}>{actionNode}</div>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: T.fH, fontSize: 34, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.01em" }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${T.bdrL}`, marginBottom: 28 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 14, fontWeight: active === t.id ? 600 : 400, color: active === t.id ? T.p : T.tm, borderBottom: active === t.id ? `2px solid ${T.p}` : "2px solid transparent", marginBottom: -2, transition: "all .15s" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
