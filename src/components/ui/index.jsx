import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { T } from "../../theme.js";

// ── MICRO ANIMATION HELPER ────────────────────────────────────────────────────
// Injects a minimal keyframe block once into the document <head>.
// Uses a sentinel flag so it only runs once, even with HMR.
if (typeof document !== "undefined" && !window.__psychocore_styles__) {
  window.__psychocore_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes pc-fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes pc-overlayIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes pc-scaleIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);   }
    }
    @keyframes pc-pulse {
      0%, 100% { opacity: 0.35; }
      50%       { opacity: 0.6;  }
    }
  `;
  document.head.appendChild(s);
}

// ── Button ────────────────────────────────────────────────────────────────────
/**
 * Variants: primary | secondary | ghost | danger | accent | success
 * Props: children, onClick, variant, small, style, disabled, isMobile
 */
export function Btn({
  children,
  onClick,
  variant = "primary",
  small = false,
  style: sx = {},
  disabled = false,
  isMobile = false,
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const sm = small || isMobile;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sm ? 5 : 7,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: T.fB,
    fontWeight: 500,
    letterSpacing: "0.015em",
    transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease, opacity 0.15s ease, color 0.2s ease",
    padding: sm ? "8px 16px" : "11px 22px",
    fontSize: sm ? 13 : 14,
    borderRadius: 9999,
    opacity: disabled ? 0.48 : 1,
    transform: active && !disabled ? "scale(0.975)" : "scale(1)",
    userSelect: "none",
    whiteSpace: "nowrap",
    position: "relative",
    overflow: "hidden",
  };

  const styles = {
    primary: {
      background: hover ? T.pL : T.p,
      color: "#fff",
      boxShadow: hover
        ? `0 6px 20px rgba(58,107,110,0.32)`
        : `0 2px 8px rgba(58,107,110,0.18)`,
    },
    secondary: {
      background: hover ? T.pA : "transparent",
      color: T.p,
      border: `1.5px solid ${T.p}`,
      boxShadow: hover ? `0 2px 10px rgba(58,107,110,0.12)` : "none",
    },
    ghost: {
      background: hover ? T.pA : "transparent",
      color: hover ? T.p : T.tm,
      border: `1.5px solid ${T.bdr}`,
      boxShadow: "none",
    },
    danger: {
      background: hover ? T.errA : "transparent",
      color: T.err,
      border: `1.5px solid ${hover ? T.err : T.errA}`,
      boxShadow: hover ? `0 2px 10px rgba(184,80,80,0.14)` : "none",
    },
    accent: {
      background: hover ? "#D4996A" : T.acc,
      color: "#fff",
      boxShadow: hover
        ? `0 6px 20px rgba(196,137,90,0.32)`
        : `0 2px 8px rgba(196,137,90,0.18)`,
    },
    success: {
      background: hover ? "#3d7049" : T.suc,
      color: "#fff",
      boxShadow: hover
        ? `0 6px 20px rgba(78,139,95,0.28)`
        : `0 2px 8px rgba(78,139,95,0.16)`,
    },
  };

  return (
    <button
      style={{ ...base, ...(styles[variant] || styles.primary), ...sx }}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => !disabled && setActive(true)}
      onMouseUp={() => setActive(false)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
/**
 * Props: children, style, onClick, isMobile, noPad, hover (boolean to enable hover effect)
 */
export function Card({ children, style: sx = {}, onClick, isMobile = false, noPad = false, hover: hoverEffect = false }) {
  const [hovered, setHovered] = useState(false);

  const isInteractive = !!(onClick || hoverEffect);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => isInteractive && setHovered(true)}
      onMouseLeave={() => isInteractive && setHovered(false)}
      style={{
        background: T.card,
        borderRadius: isMobile ? 16 : 20,
        boxShadow: hovered
          ? `0 12px 40px rgba(26,43,40,0.12), 0 2px 8px rgba(26,43,40,0.06)`
          : T.sh,
        border: `1px solid ${hovered ? T.bdr : T.bdrL}`,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease, transform 0.2s ease",
        transform: hovered && isInteractive ? "translateY(-2px)" : "translateY(0)",
        padding: noPad ? 0 : undefined,
        ...sx,
      }}
    >
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
/**
 * Props: open, onClose, title, children, width, isMobile
 */
export function Modal({ open, onClose, title, children, width = 540, isMobile = false }) {
  const didMount = useRef(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (open) {
      document.addEventListener("keydown", h);
      document.body.style.overflow = "hidden";
      didMount.current = true;
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 31, 30, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
        animation: "pc-overlayIn 0.22s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: isMobile ? "20px 20px 0 0" : 24,
          boxShadow: `0 24px 80px rgba(15,31,30,0.22), 0 4px 16px rgba(15,31,30,0.1)`,
          width: "100%",
          maxWidth: isMobile ? "100%" : width,
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          border: `1px solid ${T.bdrL}`,
          animation: "pc-scaleIn 0.26s cubic-bezier(0.34,1.3,0.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "20px 20px 16px" : "26px 32px 20px",
            borderBottom: `1px solid ${T.bdrL}`,
            position: "sticky",
            top: 0,
            background: T.card,
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: T.fH,
              fontSize: isMobile ? 22 : 26,
              fontWeight: 600,
              color: T.t,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: T.bdrL,
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.tm,
              transition: "background 0.15s ease, color 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.errA;
              e.currentTarget.style.color = T.err;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.bdrL;
              e.currentTarget.style.color = T.tm;
            }}
            aria-label="Cerrar"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? "20px 20px 24px" : "28px 32px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Form Controls ─────────────────────────────────────────────────────────────

const labelStyle = (isMobile = false) => ({
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: T.tm,
  marginBottom: 7,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: T.fB,
});

const inputBase = (focused = false, hasError = false, isMobile = false) => ({
  width: "100%",
  padding: isMobile ? "11px 14px" : "11px 16px",
  border: `1.5px solid ${hasError ? T.err : focused ? T.p : T.bdr}`,
  borderRadius: 12,
  fontFamily: T.fB,
  fontSize: isMobile ? 15 : 14,
  color: T.t,
  background: focused ? T.card : T.cardAlt,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
  boxShadow: focused
    ? `0 0 0 3.5px ${hasError ? "rgba(184,80,80,0.14)" : "rgba(58,107,110,0.14)"}`
    : "none",
  WebkitAppearance: "none",
  appearance: "none",
});

/**
 * Props: label, value, onChange, type, placeholder, style, isMobile, error, hint
 */
export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  style: sx = {},
  isMobile = false,
  error,
  hint,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18, ...sx }}>
      {label && <label style={labelStyle(isMobile)}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputBase(focused, !!error, isMobile)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.err, fontFamily: T.fB, display: "flex", alignItems: "center", gap: 4 }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.tl, fontFamily: T.fB }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Props: label, value, onChange, placeholder, rows, style, isMobile, error, hint
 */
export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  style: sx = {},
  isMobile = false,
  error,
  hint,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18, ...sx }}>
      {label && <label style={labelStyle(isMobile)}>{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...inputBase(focused, !!error, isMobile),
          resize: "vertical",
          lineHeight: 1.65,
          minHeight: isMobile ? 90 : 100,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.err, fontFamily: T.fB }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.tl, fontFamily: T.fB }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Props: label, value, onChange, options, style, isMobile, error
 */
export function Select({
  label,
  value,
  onChange,
  options,
  style: sx = {},
  isMobile = false,
  error,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18, ...sx }}>
      {label && <label style={labelStyle(isMobile)}>{label}</label>}
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputBase(focused, !!error, isMobile),
            cursor: "pointer",
            paddingRight: 40,
            // The custom arrow below handles the indicator
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <div
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: focused ? T.p : T.tm,
            transition: "color 0.18s",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.err, fontFamily: T.fB }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
/**
 * Semantic variants: default | success | error | warning | accent | neutral
 * Or pass raw color + bg props for custom coloring (backward compat).
 * Props: children, variant, color, bg, dot, isMobile
 */
export function Badge({ children, variant, color, bg, dot = false, isMobile = false }) {
  const semantics = {
    default: { color: T.p,   bg: T.pA   },
    success: { color: T.suc, bg: T.sucA  },
    error:   { color: T.err, bg: T.errA  },
    warning: { color: T.war, bg: T.warA  },
    accent:  { color: T.acc, bg: T.accA  },
    neutral: { color: T.tm,  bg: T.bdrL  },
  };

  const resolved = variant
    ? (semantics[variant] || semantics.default)
    : { color: color || T.p, bg: bg || T.pA };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dot ? 5 : 4,
        padding: isMobile ? "4px 11px" : "3px 10px",
        borderRadius: 9999,
        fontSize: isMobile ? 12 : 11,
        fontWeight: 600,
        fontFamily: T.fB,
        color: resolved.color,
        background: resolved.bg,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: resolved.color,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
      )}
      {children}
    </span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
/**
 * Prop `action` supports two forms (original contract preserved):
 *   1. React node:  <EmptyState action={<button>…</button>} />
 *   2. Object:      <EmptyState action={{ label: "…", onClick: fn }} />
 * Props: icon, title, desc, action, isMobile
 */
export function EmptyState({ icon: Icon, title, desc, action, isMobile = false }) {
  const [btnHover, setBtnHover] = useState(false);

  const actionNode =
    action && typeof action === "object" && "label" in action && "onClick" in action ? (
      <button
        onClick={action.onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: isMobile ? "12px 24px" : "10px 22px",
          borderRadius: 9999,
          background: btnHover ? T.pL : T.p,
          color: "#fff",
          border: "none",
          fontFamily: T.fB,
          fontSize: isMobile ? 14 : 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.2s ease, box-shadow 0.2s ease",
          boxShadow: btnHover
            ? `0 6px 20px rgba(58,107,110,0.3)`
            : `0 2px 8px rgba(58,107,110,0.16)`,
          letterSpacing: "0.01em",
        }}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
      >
        {action.label}
      </button>
    ) : (
      action
    );

  return (
    <div
      style={{
        textAlign: "center",
        padding: isMobile ? "48px 20px" : "72px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "pc-fadeSlideUp 0.4s ease",
      }}
    >
      {/* Icon container with subtle glow ring */}
      <div
        style={{
          width: isMobile ? 72 : 80,
          height: isMobile ? 72 : 80,
          borderRadius: "50%",
          background: T.pA,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: isMobile ? 20 : 24,
          boxShadow: `0 0 0 10px ${T.bdrL}`,
          animation: "pc-pulse 3s ease-in-out infinite",
        }}
      >
        {Icon && (
          <Icon
            size={isMobile ? 28 : 32}
            strokeWidth={1.4}
            style={{ color: T.p, opacity: 0.75 }}
          />
        )}
      </div>

      <div
        style={{
          fontFamily: T.fH,
          fontSize: isMobile ? 22 : 26,
          fontWeight: 500,
          color: T.t,
          marginBottom: 10,
          letterSpacing: "-0.01em",
          lineHeight: 1.25,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontFamily: T.fB,
          fontSize: isMobile ? 14 : 13.5,
          color: T.tl,
          maxWidth: 340,
          lineHeight: 1.65,
          marginBottom: actionNode ? 28 : 0,
        }}
      >
        {desc}
      </div>

      {actionNode && <div>{actionNode}</div>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
/**
 * Props: title, subtitle, action, isMobile
 */
export function PageHeader({ title, subtitle, action, isMobile = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: isMobile ? "flex-start" : "flex-end",
        justifyContent: "space-between",
        marginBottom: isMobile ? 22 : 32,
        flexWrap: "wrap",
        gap: isMobile ? 14 : 12,
        flexDirection: isMobile ? "column" : "row",
        animation: "pc-fadeSlideUp 0.3s ease",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: T.fH,
            fontSize: isMobile ? 30 : 38,
            fontWeight: 500,
            color: T.t,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: T.fB,
              fontSize: isMobile ? 13.5 : 14,
              color: T.tm,
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div style={{ flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
          {action}
        </div>
      )}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
/**
 * Props: tabs [{ id, label }], active, onChange, isMobile
 */
export function Tabs({ tabs, active, onChange, isMobile = false }) {
  return (
    <div
      style={{
        display: "flex",
        gap: isMobile ? 2 : 4,
        borderBottom: `1.5px solid ${T.bdrL}`,
        marginBottom: isMobile ? 22 : 28,
        overflowX: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <TabBtn
            key={t.id}
            label={t.label}
            isActive={isActive}
            onClick={() => onChange(t.id)}
            isMobile={isMobile}
          />
        );
      })}
    </div>
  );
}

// Internal tab button with hover state
function TabBtn({ label, isActive, onClick, isMobile }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: isMobile ? "10px 16px" : "11px 22px",
        border: "none",
        background: "none",
        cursor: "pointer",
        fontFamily: T.fB,
        fontSize: isMobile ? 13.5 : 14,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? T.p : hover ? T.t : T.tm,
        borderBottom: isActive
          ? `2px solid ${T.p}`
          : `2px solid transparent`,
        marginBottom: -1.5,
        transition: "color 0.15s ease, border-color 0.15s ease",
        whiteSpace: "nowrap",
        letterSpacing: isActive ? "0.005em" : "normal",
        outline: "none",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {label}
    </button>
  );
}
