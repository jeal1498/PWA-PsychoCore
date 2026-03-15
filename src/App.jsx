import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, Calendar, FileText, DollarSign, BookOpen, Home, Plus, X,
  ChevronLeft, ChevronRight, Search, Trash2, Clock, Phone, Mail,
  Lock, TrendingUp, Tag, Brain, Heart, AlertCircle, CheckCircle,
  Check, Smile, Meh, Frown, Star, Shield, Printer, Edit2, Menu
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg: "#F4F2EE",
  card: "#FFFFFF",
  cardAlt: "#F9F8F5",
  p: "#3A6B6E",
  pL: "#5A9497",
  pA: "rgba(58,107,110,0.08)",
  acc: "#C4895A",
  accA: "rgba(196,137,90,0.10)",
  t: "#1A2B28",
  tm: "#5A7270",
  tl: "#9BAFAD",
  suc: "#4E8B5F",
  sucA: "rgba(78,139,95,0.08)",
  err: "#B85050",
  errA: "rgba(184,80,80,0.08)",
  war: "#B8900A",
  warA: "rgba(184,144,10,0.08)",
  bdr: "#D8E2E0",
  bdrL: "#EDF1F0",
  sh: "0 2px 8px rgba(0,0,0,0.06)",
  shM: "0 8px 28px rgba(0,0,0,0.10)",
  fH: '"Cormorant Garamond", Georgia, serif',
  fB: '"DM Sans", system-ui, sans-serif',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const todayDate = new Date();
const fmt = (d) => d.toISOString().split("T")[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const daysAhead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };
const fmtDate = (d) => new Date(d + "T12:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fmtCur = (n) => `$${Number(n).toLocaleString("es-MX")}`;
const moodColor = (m) => ({ bueno: T.suc, moderado: T.war, bajo: T.err })[m] || T.tm;
const moodIcon = (m) => ({ bueno: Smile, moderado: Meh, bajo: Frown })[m] || Meh;
const progressStyle = (p) => ({
  excelente: { bg: T.sucA, c: T.suc },
  bueno: { bg: T.pA, c: T.p },
  moderado: { bg: T.warA, c: T.war },
  bajo: { bg: T.errA, c: T.err },
})[p] || { bg: T.bdrL, c: T.tm };

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA — se usa solo si localStorage está vacío
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_PATIENTS = [
  { id: "p1", name: "María González López",  age: 34, phone: "998-123-4567", email: "maria@email.com",   diagnosis: "Trastorno de Ansiedad Generalizada",   reason: "Episodios de ansiedad recurrentes, dificultad para dormir", notes: "Paciente motivada, buen pronóstico",          createdAt: daysAgo(120) },
  { id: "p2", name: "Carlos Ramírez Torres", age: 28, phone: "998-234-5678", email: "carlos@email.com",  diagnosis: "Depresión Mayor — Episodio moderado",    reason: "Aislamiento social, pérdida de trabajo",                   notes: "Requiere seguimiento semanal",               createdAt: daysAgo(60)  },
  { id: "p3", name: "Sofía Morales Vega",    age: 42, phone: "998-345-6789", email: "sofia@email.com",   diagnosis: "TDAH — Tipo combinado",                  reason: "Dificultades de concentración en trabajo y hogar",         notes: "Evaluación neuropsicológica pendiente",     createdAt: daysAgo(30)  },
  { id: "p4", name: "Roberto Sánchez Cruz",  age: 19, phone: "998-456-7890", email: "roberto@email.com", diagnosis: "En evaluación — Posible TOC",             reason: "Pensamientos intrusivos, rituales compulsivos",            notes: "Primera generación universitaria, alto estrés", createdAt: daysAgo(14) },
];

const SAMPLE_APPOINTMENTS = [
  { id: "a1", patientId: "p1", patientName: "María González López",  date: daysAgo(7), time: "10:00", type: "Seguimiento",     status: "completada" },
  { id: "a2", patientId: "p2", patientName: "Carlos Ramírez Torres", date: daysAgo(5), time: "11:30", type: "Seguimiento",     status: "completada" },
  { id: "a3", patientId: "p3", patientName: "Sofía Morales Vega",    date: daysAgo(2), time: "09:00", type: "Evaluación",      status: "completada" },
  { id: "a4", patientId: "p1", patientName: "María González López",  date: fmt(todayDate), time: "10:00", type: "Seguimiento",  status: "pendiente"  },
  { id: "a5", patientId: "p4", patientName: "Roberto Sánchez Cruz",  date: fmt(todayDate), time: "12:00", type: "Primera consulta", status: "pendiente" },
  { id: "a6", patientId: "p2", patientName: "Carlos Ramírez Torres", date: daysAhead(3), time: "11:30", type: "Seguimiento",   status: "pendiente"  },
  { id: "a7", patientId: "p3", patientName: "Sofía Morales Vega",    date: daysAhead(5), time: "09:00", type: "Seguimiento",   status: "pendiente"  },
];

const SAMPLE_SESSIONS = [
  { id: "s1", patientId: "p1", patientName: "María González López",  date: daysAgo(21), duration: 50, mood: "moderado", progress: "bueno",     notes: "Trabajamos técnicas de respiración diafragmática. La paciente reporta menor frecuencia de ataques. Se asignó diario de pensamientos.", tags: ["ansiedad","respiración"] },
  { id: "s2", patientId: "p1", patientName: "María González López",  date: daysAgo(14), duration: 50, mood: "bueno",    progress: "excelente", notes: "Revisión del diario de pensamientos. Identifica patrones cognitivos negativos. Introducción a reestructuración cognitiva.",             tags: ["TCC","cognición"]       },
  { id: "s3", patientId: "p2", patientName: "Carlos Ramírez Torres", date: daysAgo(12), duration: 50, mood: "bajo",     progress: "moderado",  notes: "Resistencia a activación conductual. Exploración de creencias nucleares sobre fracaso. Psicoeducación sobre depresión.",               tags: ["depresión","creencias"] },
  { id: "s4", patientId: "p3", patientName: "Sofía Morales Vega",    date: daysAgo(9),  duration: 60, mood: "bueno",    progress: "bueno",     notes: "Aplicación de Conners 3 completada. Discusión de estrategias de organización. La paciente mostró buena disposición.",                  tags: ["TDAH","evaluación"]     },
  { id: "s5", patientId: "p1", patientName: "María González López",  date: daysAgo(7),  duration: 50, mood: "bueno",    progress: "excelente", notes: "Consolidación de habilidades. Paciente reporta 80% de reducción en episodios. Iniciamos trabajo en asertividad.",                       tags: ["asertividad","progreso"] },
  { id: "s6", patientId: "p2", patientName: "Carlos Ramírez Torres", date: daysAgo(5),  duration: 50, mood: "moderado", progress: "bueno",     notes: "Avance notable. Retomó contacto con amigos. Planificación de actividades de placer para la semana.",                                    tags: ["activación","social"]   },
];

const SAMPLE_PAYMENTS = [
  { id: "pay1", patientId: "p1", patientName: "María González López",  date: daysAgo(21), amount: 900,  concept: "Sesión individual",              method: "Transferencia", status: "pagado"   },
  { id: "pay2", patientId: "p1", patientName: "María González López",  date: daysAgo(14), amount: 900,  concept: "Sesión individual",              method: "Efectivo",      status: "pagado"   },
  { id: "pay3", patientId: "p2", patientName: "Carlos Ramírez Torres", date: daysAgo(12), amount: 900,  concept: "Sesión individual",              method: "Transferencia", status: "pagado"   },
  { id: "pay4", patientId: "p3", patientName: "Sofía Morales Vega",    date: daysAgo(9),  amount: 1500, concept: "Evaluación neuropsicológica",    method: "Transferencia", status: "pagado"   },
  { id: "pay5", patientId: "p1", patientName: "María González López",  date: daysAgo(7),  amount: 900,  concept: "Sesión individual",              method: "Efectivo",      status: "pagado"   },
  { id: "pay6", patientId: "p2", patientName: "Carlos Ramírez Torres", date: daysAgo(5),  amount: 900,  concept: "Sesión individual",              method: "Transferencia", status: "pagado"   },
  { id: "pay7", patientId: "p4", patientName: "Roberto Sánchez Cruz",  date: fmt(todayDate), amount: 1200, concept: "Primera consulta (90 min)", method: "Pendiente",     status: "pendiente" },
];

const SAMPLE_RESOURCES = [
  { id: "r1", title: "Registro de Pensamientos ABC",      type: "Ejercicio",      description: "Formulario para identificar situaciones, emociones y pensamientos automáticos. Ideal para TCC.",          tags: ["TCC","cognición"],          url: "" },
  { id: "r2", title: "Técnica de Respiración 4-7-8",      type: "Técnica",        description: "Guía paso a paso de la respiración 4-7-8 para manejo de ansiedad aguda.",                                 tags: ["ansiedad","relajación"],    url: "" },
  { id: "r3", title: "Escala de Activación Conductual",   type: "Evaluación",     description: "Registro semanal de actividades y estado de ánimo para pacientes con depresión.",                         tags: ["depresión","conductual"],   url: "" },
  { id: "r4", title: "Psicoeducación TDAH para adultos",  type: "Psicoeducación", description: "Material informativo sobre síntomas, fortalezas y estrategias de manejo para TDAH en adultos.",           tags: ["TDAH","psicoeducación"],   url: "" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: localStorage persistence
// ─────────────────────────────────────────────────────────────────────────────
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("localStorage write failed:", e);
    }
  }, [key, value]);

  return [value, setValue];
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Button component — variants: primary | ghost | danger | accent */
function Btn({ children, onClick, variant = "primary", small = false, style: sx = {}, disabled = false }) {
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
  };
  return (
    <button
      style={{ ...base, ...(styles[variant] || styles.primary), ...sx }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

/** Card container */
function Card({ children, style: sx = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.card, borderRadius: 16, boxShadow: T.sh,
        border: `1px solid ${T.bdrL}`, overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .18s, transform .18s", ...sx,
      }}
    >
      {children}
    </div>
  );
}

/** Modal overlay */
function Modal({ open, onClose, title, children, width = 540 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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

/** Text input */
function Input({ label, value, onChange, type = "text", placeholder, style: sx = {} }) {
  return (
    <div style={{ marginBottom: 16, ...sx }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box", transition: "border .15s" }}
      />
    </div>
  );
}

/** Textarea */
function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}
      />
    </div>
  );
}

/** Select */
function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", cursor: "pointer", boxSizing: "border-box" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/** Badge pill */
function Badge({ children, color, bg }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: T.fB, color: color || T.p, background: bg || T.pA, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

/** Empty state placeholder */
function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px", color: T.tl }}>
      <Icon size={40} strokeWidth={1.2} style={{ marginBottom: 16, opacity: 0.4 }} />
      <div style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.tm, marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl }}>{desc}</div>
    </div>
  );
}

/** Page header with optional action button */
function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
      <div>
        <h1 style={{ fontFamily: T.fH, fontSize: 34, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.01em" }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCK SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const CORRECT_PIN = "1234"; // TODO: en producción, usar hash + salt

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const handlePress = useCallback((key) => {
    if (blocked || pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === CORRECT_PIN) {
          setAttempts(0);
          onUnlock();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(true);
          setShake(true);
          if (newAttempts >= 5) {
            setBlocked(true);
            setTimeout(() => { setBlocked(false); setAttempts(0); }, 30000);
          }
          setTimeout(() => { setPin(""); setError(false); setShake(false); }, 800);
        }
      }, 100);
    }
  }, [pin, attempts, blocked, onUnlock]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= "0" && e.key <= "9") handlePress(e.key);
      if (e.key === "Backspace") setPin(p => p.slice(0, -1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePress]);

  const keys = [[1,2,3],[4,5,6],[7,8,9],["","0","⌫"]];

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fB }}>
      <div style={{ textAlign: "center", color: "#fff" }}>
        {/* Logo */}
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Brain size={32} strokeWidth={1.4} />
        </div>
        <div style={{ fontFamily: T.fH, fontSize: 36, fontWeight: 300, letterSpacing: "0.02em", marginBottom: 4 }}>PsychoCore</div>
        <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 44, letterSpacing: "0.06em" }}>GESTIÓN CLÍNICA</div>

        {/* PIN dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 40, animation: shake ? "shake .4s ease" : "none" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? (error ? "#ef4444" : "#fff") : "rgba(255,255,255,0.25)", transition: "all .15s", transform: i < pin.length ? "scale(1.1)" : "scale(1)" }} />
          ))}
        </div>

        {blocked
          ? <div style={{ fontSize: 13, color: "#fca5a5", marginBottom: 24 }}>Demasiados intentos. Espera 30 segundos.</div>
          : error
          ? <div style={{ fontSize: 13, color: "#fca5a5", marginBottom: 16, marginTop: -28 }}>PIN incorrecto ({5 - attempts} intentos restantes)</div>
          : null
        }

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12, justifyContent: "center" }}>
          {keys.flat().map((k, i) => (
            <button
              key={i}
              onClick={() => k === "⌫" ? setPin(p => p.slice(0,-1)) : k !== "" ? handlePress(String(k)) : null}
              style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: k === "" ? "transparent" : "rgba(255,255,255,0.10)", color: "#fff", fontSize: k === "⌫" ? 20 : 24, fontFamily: T.fH, cursor: k === "" ? "default" : "pointer", transition: "background .15s", backdropFilter: "blur(4px)", opacity: blocked && k !== "" ? 0.4 : 1 }}
              onMouseEnter={e => { if (k !== "" && !blocked) e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => e.currentTarget.style.background = k === "" ? "transparent" : "rgba(255,255,255,0.10)"}
            >
              {k}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, opacity: 0.35, marginTop: 36 }}>PIN demo: 1234 · Soporta teclado físico</div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",  icon: Home,      label: "Inicio"    },
  { id: "patients",   icon: Users,     label: "Pacientes" },
  { id: "agenda",     icon: Calendar,  label: "Agenda"    },
  { id: "sessions",   icon: FileText,  label: "Sesiones"  },
  { id: "finance",    icon: DollarSign,label: "Finanzas"  },
  { id: "resources",  icon: BookOpen,  label: "Recursos"  },
];

// Hook: detect mobile breakpoint reactively
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function Sidebar({ active, setActive, onLock, open, onClose }) {
  const isMobile = useIsMobile();

  // Close sidebar when pressing Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleNav = (id) => {
    setActive(id);
    if (isMobile) onClose();
  };

  const sidebarStyle = isMobile
    ? {
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200,
        width: 260, background: T.t,
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .28s cubic-bezier(.4,0,.2,1)",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.25)" : "none",
      }
    : {
        width: 220, background: T.t,
        display: "flex", flexDirection: "column", flexShrink: 0,
        minHeight: "100vh", position: "sticky", top: 0,
      };

  return (
    <>
      {/* Backdrop — only on mobile when open */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 199,
            background: "rgba(0,0,0,0.45)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity .28s ease",
          }}
        />
      )}

      <aside style={sidebarStyle}>
        {/* Logo + mobile close button */}
        <div style={{ padding: "28px 20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.p, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Brain size={18} color="#fff" strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "0.01em" }}>PsychoCore</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: T.fB, letterSpacing: "0.08em" }}>GESTIÓN CLÍNICA</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 14, fontWeight: isActive ? 600 : 400, marginBottom: 2, transition: "all .15s", background: isActive ? T.p : "transparent", color: isActive ? "#fff" : "rgba(255,255,255,0.50)" }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.50)"; } }}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Lock */}
        <div style={{ padding: "16px 12px 28px" }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 12 }} />
          <button
            onClick={onLock}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 13, background: "transparent", color: "rgba(255,255,255,0.35)", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.background = "transparent"; }}
          >
            <Lock size={15} strokeWidth={1.8} />
            Bloquear pantalla
          </button>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ patients, appointments, sessions, payments }) {
  const todayStr = fmt(todayDate);
  const monthStr = fmt(todayDate).slice(0, 7);
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const monthIncome = payments.filter(p => p.status === "pagado" && p.date.startsWith(monthStr)).reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter(p => p.status === "pendiente").length;
  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const stats = [
    { label: "Pacientes activos", value: patients.length,    icon: Users,      color: T.p,   bg: T.pA   },
    { label: "Citas hoy",         value: todayAppts.length,  icon: Calendar,   color: T.acc, bg: T.accA },
    { label: "Ingresos este mes", value: fmtCur(monthIncome),icon: TrendingUp, color: T.suc, bg: T.sucA },
    { label: "Pagos pendientes",  value: pending,            icon: AlertCircle,color: T.war, bg: T.warA },
  ];

  return (
    <div>
      <PageHeader
        title={`Buenos días 🌿`}
        subtitle={todayDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.tm, fontFamily: T.fB, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: T.fH, fontSize: 32, fontWeight: 500, color: T.t }}>{s.value}</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={20} color={s.color} strokeWidth={1.6} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {/* Today appointments */}
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: "0 0 16px" }}>Citas de hoy</h3>
          {todayAppts.length === 0
            ? <div style={{ textAlign: "center", padding: "24px 0", color: T.tl, fontFamily: T.fB, fontSize: 13 }}>Sin citas programadas para hoy</div>
            : todayAppts.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: T.pA, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock size={18} color={T.p} strokeWidth={1.6} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t }}>{a.patientName.split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{a.time} · {a.type}</div>
                </div>
                <Badge color={a.status === "completada" ? T.suc : T.war} bg={a.status === "completada" ? T.sucA : T.warA}>{a.status}</Badge>
              </div>
            ))
          }
        </Card>

        {/* Recent sessions */}
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: "0 0 16px" }}>Sesiones recientes</h3>
          {recentSessions.map(s => {
            const MoodIcon = moodIcon(s.mood);
            const ps = progressStyle(s.progress);
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                <MoodIcon size={18} color={moodColor(s.mood)} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t }}>{s.patientName.split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{fmtDate(s.date)}</div>
                </div>
                <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE: PATIENTS
// ─────────────────────────────────────────────────────────────────────────────
function Patients({ patients, setPatients, sessions, payments }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", age: "", phone: "", email: "", diagnosis: "", reason: "", notes: "" });
  const fld = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    patients.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis || "").toLowerCase().includes(search.toLowerCase())
    ),
    [patients, search]
  );

  const save = () => {
    if (!form.name.trim()) return;
    setPatients(prev => [...prev, { ...form, id: "p" + uid(), createdAt: fmt(todayDate) }]);
    setForm({ name: "", age: "", phone: "", email: "", diagnosis: "", reason: "", notes: "" });
    setShowAdd(false);
  };

  const del = (id) => { setPatients(prev => prev.filter(p => p.id !== id)); if (selected?.id === id) setSelected(null); };

  // Patient detail view
  if (selected) {
    const ptSessions = sessions.filter(s => s.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const ptPayments = payments.filter(p => p.patientId === selected.id);
    const totalPaid = ptPayments.filter(p => p.status === "pagado").reduce((s,p) => s + Number(p.amount), 0);

    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.p, fontFamily: T.fB, fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0 }}>
          <ChevronLeft size={16} /> Volver a pacientes
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
          {/* Profile card */}
          <Card style={{ padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.pA, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: T.fH, fontSize: 26, color: T.p }}>{selected.name[0]}</span>
            </div>
            <h2 style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.t, margin: "0 0 4px" }}>{selected.name}</h2>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: "0 0 18px" }}>
              {selected.age ? `${selected.age} años · ` : ""}Desde {fmtDate(selected.createdAt)}
            </p>

            <div style={{ borderTop: `1px solid ${T.bdrL}`, paddingTop: 16 }}>
              {selected.phone && <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontFamily: T.fB, fontSize: 13, color: T.tm }}><Phone size={14} /> {selected.phone}</div>}
              {selected.email && <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontFamily: T.fB, fontSize: 13, color: T.tm }}><Mail size={14} /> {selected.email}</div>}
            </div>

            {selected.diagnosis && (
              <div style={{ marginTop: 16, padding: 14, background: T.pA, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.p, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>Diagnóstico</div>
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t }}>{selected.diagnosis}</div>
              </div>
            )}

            {selected.reason && (
              <div style={{ marginTop: 12, padding: 14, background: T.cardAlt, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.tm, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>Motivo de consulta</div>
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t }}>{selected.reason}</div>
              </div>
            )}

            <div style={{ marginTop: 18, display: "flex", justifyContent: "space-around", fontFamily: T.fB, paddingTop: 16, borderTop: `1px solid ${T.bdrL}` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: T.fH, fontSize: 28, color: T.p, lineHeight: 1 }}>{ptSessions.length}</div>
                <div style={{ fontSize: 11, color: T.tm, marginTop: 4 }}>Sesiones</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: T.fH, fontSize: 28, color: T.suc, lineHeight: 1 }}>{fmtCur(totalPaid)}</div>
                <div style={{ fontSize: 11, color: T.tm, marginTop: 4 }}>Total pagado</div>
              </div>
            </div>
          </Card>

          {/* Sessions history */}
          <Card style={{ padding: 24 }}>
            <h3 style={{ fontFamily: T.fH, fontSize: 20, margin: "0 0 16px", color: T.t }}>Historial de sesiones</h3>
            {ptSessions.length === 0
              ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, padding: "16px 0" }}>Sin sesiones registradas aún</div>
              : ptSessions.map(s => {
                const MoodIcon = moodIcon(s.mood);
                const ps = progressStyle(s.progress);
                return (
                  <div key={s.id} style={{ borderBottom: `1px solid ${T.bdrL}`, paddingBottom: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t }}>{fmtDate(s.date)} · {s.duration} min</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <MoodIcon size={14} color={moodColor(s.mood)} />
                        <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                      </div>
                    </div>
                    <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: "0 0 8px", lineHeight: 1.65 }}>{s.notes}</p>
                    {(s.tags || []).length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.tags.map(t => <Badge key={t} color={T.acc} bg={T.accA}><Tag size={10} /> {t}</Badge>)}
                      </div>
                    )}
                  </div>
                );
              })
            }
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.length} paciente${patients.length !== 1 ? "s" : ""} registrado${patients.length !== 1 ? "s" : ""}`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Nuevo paciente</Btn>}
      />

      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.tl, pointerEvents: "none" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o diagnóstico..."
          style={{ width: "100%", padding: "11px 14px 11px 42px", border: `1.5px solid ${T.bdr}`, borderRadius: 12, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }} />
      </div>

      {filtered.length === 0
        ? <EmptyState icon={Users} title="Sin pacientes" desc="Agrega tu primer paciente con el botón de arriba" />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.map(p => (
              <Card key={p.id} onClick={() => setSelected(p)} style={{ padding: 20, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = T.shM}
                onMouseLeave={e => e.currentTarget.style.boxShadow = T.sh}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: T.pA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: T.fH, fontSize: 20, color: T.p }}>{p.name[0]}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); del(p.id); }} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 500, color: T.t, marginBottom: 2 }}>
                  {p.name.split(" ").slice(0, 2).join(" ")}
                </div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 10 }}>
                  {p.age ? `${p.age} años · ` : ""}Desde {fmtDate(p.createdAt)}
                </div>
                {p.diagnosis && <Badge>{p.diagnosis.split("—")[0].trim()}</Badge>}
              </Card>
            ))}
          </div>
        )
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo paciente">
        <Input label="Nombre completo *" value={form.name} onChange={fld("name")} placeholder="Ej. María González López" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Edad" value={form.age} onChange={fld("age")} type="number" />
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-123-4567" />
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} type="email" />
        <Input label="Diagnóstico" value={form.diagnosis} onChange={fld("diagnosis")} placeholder="Ej. Trastorno de Ansiedad Generalizada" />
        <Textarea label="Motivo de consulta" value={form.reason} onChange={fld("reason")} rows={2} />
        <Textarea label="Notas adicionales" value={form.notes} onChange={fld("notes")} rows={2} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.name.trim()}><Check size={15} /> Guardar paciente</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE: AGENDA
// ─────────────────────────────────────────────────────────────────────────────
function Agenda({ appointments, setAppointments, patients }) {
  const [current, setCurrent] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ patientId: "", date: fmt(todayDate), time: "09:00", type: "Seguimiento", status: "pendiente" });
  const fld = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    return (d >= 1 && d <= daysInMonth) ? String(d).padStart(2, "0") : null;
  });

  const todayStr = fmt(todayDate);
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const apptsByDay = useMemo(() => {
    const map = {};
    appointments.filter(a => a.date.startsWith(monthStr)).forEach(a => {
      const d = a.date.split("-")[2];
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [appointments, monthStr]);

  const dayAppts = selectedDay ? (apptsByDay[selectedDay] || []) : [];
  const upcomingAppts = [...appointments].filter(a => a.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 8);

  const save = () => {
    if (!form.patientId || !form.date) return;
    const pt = patients.find(p => p.id === form.patientId);
    setAppointments(prev => [...prev, { ...form, id: "a" + uid(), patientName: pt?.name || "" }]);
    setForm({ patientId: "", date: fmt(todayDate), time: "09:00", type: "Seguimiento", status: "pendiente" });
    setShowAdd(false);
  };

  const del = (id) => setAppointments(prev => prev.filter(a => a.id !== id));
  const toggle = (id) => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "completada" ? "pendiente" : "completada" } : a));

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Gestión de citas y disponibilidad"
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Nueva cita</Btn>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.t }}>
              {MONTHS_ES[month]} {year}
            </span>
            <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: T.tl, fontFamily: T.fB, letterSpacing: "0.06em", padding: "6px 0" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = `${monthStr}-${d}`;
              const isToday = dateStr === todayStr;
              const isSel = d === selectedDay;
              const appts = apptsByDay[d];
              return (
                <div key={i} onClick={() => setSelectedDay(isSel ? null : d)}
                  style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, cursor: "pointer", background: isSel ? T.p : isToday ? T.pA : "transparent", color: isSel ? "#fff" : isToday ? T.p : T.t, fontFamily: T.fB, fontSize: 13.5, fontWeight: isToday || isSel ? 600 : 400, transition: "all .12s", position: "relative" }}
                >
                  {d}
                  {appts && (
                    <div style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>
                      {appts.slice(0, 3).map((_, j) => (
                        <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "rgba(255,255,255,0.7)" : T.acc }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day appointments */}
          {selectedDay && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${T.bdrL}`, paddingTop: 16 }}>
              <h4 style={{ fontFamily: T.fH, fontSize: 18, color: T.t, margin: "0 0 12px" }}>
                {parseInt(selectedDay)} de {MONTHS_ES[month]}
              </h4>
              {dayAppts.length === 0
                ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl }}>Sin citas este día</div>
                : dayAppts.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: T.cardAlt, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t }}>{a.patientName.split(" ").slice(0,2).join(" ")}</div>
                      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{a.time} · {a.type}</div>
                    </div>
                    <button onClick={() => toggle(a.id)} style={{ background: a.status === "completada" ? T.sucA : T.warA, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: T.fB, color: a.status === "completada" ? T.suc : T.war, fontWeight: 600 }}>
                      {a.status}
                    </button>
                    <button onClick={() => del(a.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer" }}><Trash2 size={13} /></button>
                  </div>
                ))
              }
            </div>
          )}
        </Card>

        {/* Upcoming appointments panel */}
        <Card style={{ padding: 24, alignSelf: "start" }}>
          <h3 style={{ fontFamily: T.fH, fontSize: 20, color: T.t, margin: "0 0 14px" }}>Próximas citas</h3>
          {upcomingAppts.length === 0
            ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl }}>No hay citas próximas</div>
            : upcomingAppts.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                <div style={{ width: 38, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontFamily: T.fH, fontSize: 20, color: T.p, lineHeight: 1 }}>{parseInt(a.date.split("-")[2])}</div>
                  <div style={{ fontSize: 10, color: T.tl, fontFamily: T.fB }}>{MONTHS_ES[parseInt(a.date.split("-")[1])-1].slice(0,3)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 500, color: T.t }}>{a.patientName.split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{a.time} · {a.type}</div>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva cita">
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Fecha *" value={form.date} onChange={fld("date")} type="date" />
          <Input label="Hora" value={form.time} onChange={fld("time")} type="time" />
        </div>
        <Select label="Tipo de cita" value={form.type} onChange={fld("type")}
          options={["Primera consulta","Seguimiento","Evaluación","Crisis","Cierre de proceso"].map(t => ({ value: t, label: t }))} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId || !form.date}><Check size={15} /> Guardar cita</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE: SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Print a session note as PDF via browser */
function printSessionNote(session, patients) {
  const pt = patients.find(p => p.id === session.patientId);
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Nota de Sesión — ${session.patientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; max-width: 720px; margin: 48px auto; color: #1A2B28; line-height: 1.6; }
  header { border-bottom: 3px solid #3A6B6E; padding-bottom: 20px; margin-bottom: 32px; }
  h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; color: #3A6B6E; }
  .subtitle { font-size: 13px; color: #5A7270; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .field label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #9BAFAD; font-weight: 600; display: block; margin-bottom: 4px; }
  .field p { font-size: 15px; }
  .notes { background: #F9F8F5; padding: 20px; border-radius: 10px; border-left: 4px solid #3A6B6E; margin-bottom: 24px; }
  .notes label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #9BAFAD; font-weight: 600; display: block; margin-bottom: 10px; }
  .notes p { font-size: 14px; line-height: 1.75; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag { background: rgba(196,137,90,0.1); color: #C4895A; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
  footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #D8E2E0; font-size: 12px; color: #9BAFAD; display: flex; justify-content: space-between; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<header>
  <h1>Nota de Evolución Clínica</h1>
  <p class="subtitle">Generada con PsychoCore · ${new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
</header>
<div class="grid">
  <div class="field"><label>Paciente</label><p>${session.patientName}</p></div>
  <div class="field"><label>Fecha de sesión</label><p>${fmtDate(session.date)}</p></div>
  <div class="field"><label>Duración</label><p>${session.duration} minutos</p></div>
  <div class="field"><label>Estado de ánimo</label><p style="text-transform:capitalize">${session.mood}</p></div>
  <div class="field"><label>Progreso terapéutico</label><p style="text-transform:capitalize">${session.progress}</p></div>
  ${pt?.diagnosis ? `<div class="field"><label>Diagnóstico</label><p>${pt.diagnosis}</p></div>` : ""}
</div>
<div class="notes">
  <label>Notas clínicas</label>
  <p>${session.notes}</p>
</div>
${(session.tags || []).length ? `<div style="margin-bottom:24px"><label style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;font-weight:600;display:block;margin-bottom:8px">Etiquetas</label><div class="tags">${session.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div></div>` : ""}
<footer>
  <span>PsychoCore — Sistema de Gestión Clínica</span>
  <span>Documento confidencial — solo para uso profesional</span>
</footer>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function Sessions({ sessions, setSessions, patients }) {
  const [filterPt, setFilterPt] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patientId: "", date: fmt(todayDate), duration: 50, mood: "moderado", progress: "bueno", notes: "", tags: "" });
  const fld = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    sessions.filter(s => !filterPt || s.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [sessions, filterPt]
  );

  const save = () => {
    if (!form.patientId || !form.notes.trim()) return;
    const pt = patients.find(p => p.id === form.patientId);
    setSessions(prev => [...prev, { ...form, id: "s" + uid(), patientName: pt?.name || "", tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) }]);
    setForm({ patientId: "", date: fmt(todayDate), duration: 50, mood: "moderado", progress: "bueno", notes: "", tags: "" });
    setShowAdd(false);
  };

  const del = (id) => setSessions(prev => prev.filter(s => s.id !== id));

  return (
    <div>
      <PageHeader
        title="Notas de Sesión"
        subtitle={`${sessions.length} nota${sessions.length !== 1 ? "s" : ""} registrada${sessions.length !== 1 ? "s" : ""}`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Nueva nota</Btn>}
      />

      <div style={{ marginBottom: 20 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, cursor: "pointer", outline: "none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={FileText} title="Sin notas de sesión" desc="Registra la evolución de tus pacientes con el botón de arriba" />
        : filtered.map(s => {
          const MoodIcon = moodIcon(s.mood);
          const ps = progressStyle(s.progress);
          return (
            <Card key={s.id} style={{ padding: 22, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: T.fH, fontSize: 17, fontWeight: 500, color: T.t }}>{s.patientName.split(" ").slice(0,2).join(" ")}</span>
                    <span style={{ fontSize: 11, color: T.tl }}>·</span>
                    <span style={{ fontSize: 13, color: T.tm, fontFamily: T.fB }}>{fmtDate(s.date)}</span>
                    <span style={{ fontSize: 11, color: T.tl }}>·</span>
                    <span style={{ fontSize: 12, color: T.tm, fontFamily: T.fB }}>{s.duration} min</span>
                  </div>
                  <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, margin: "0 0 12px", lineHeight: 1.65 }}>{s.notes}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <MoodIcon size={14} color={moodColor(s.mood)} />
                      <span style={{ fontSize: 12, fontFamily: T.fB, color: moodColor(s.mood), fontWeight: 600 }}>{s.mood}</span>
                    </div>
                    <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                    {(s.tags || []).map(tag => (
                      <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={10} /> {tag}</Badge>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => printSessionNote(s, patients)} title="Exportar como PDF" style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
                    <Printer size={15} />
                  </button>
                  <button onClick={() => del(s.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 8 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva nota de sesión" width={580}>
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date" />
          <Input label="Duración (min)" value={form.duration} onChange={fld("duration")} type="number" />
          <Select label="Progreso" value={form.progress} onChange={fld("progress")}
            options={["excelente","bueno","moderado","bajo"].map(p => ({ value: p, label: p }))} />
        </div>
        <Select label="Estado de ánimo" value={form.mood} onChange={fld("mood")}
          options={["bueno","moderado","bajo"].map(p => ({ value: p, label: p }))} />
        <Textarea label="Notas clínicas *" value={form.notes} onChange={fld("notes")}
          placeholder="Describe el contenido de la sesión, intervenciones aplicadas, respuesta del paciente..." rows={5} />
        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="Ej. TCC, ansiedad, respiración" />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId || !form.notes.trim()}><Check size={15} /> Guardar nota</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE: FINANCE
// ─────────────────────────────────────────────────────────────────────────────
function Finance({ payments, setPayments, patients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterPt, setFilterPt] = useState("");
  const [form, setForm] = useState({ patientId: "", date: fmt(todayDate), amount: "", concept: "Sesión individual", method: "Transferencia", status: "pagado" });
  const fld = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    payments.filter(p => !filterPt || p.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [payments, filterPt]
  );

  const monthStr = fmt(todayDate).slice(0, 7);
  const monthIncome = payments.filter(p => p.status === "pagado" && p.date.startsWith(monthStr)).reduce((s,p) => s + Number(p.amount), 0);
  const totalPaid = filtered.filter(p => p.status === "pagado").reduce((s,p) => s + Number(p.amount), 0);
  const totalPending = filtered.filter(p => p.status === "pendiente").reduce((s,p) => s + Number(p.amount), 0);

  const save = () => {
    if (!form.patientId || !form.amount) return;
    const pt = patients.find(p => p.id === form.patientId);
    setPayments(prev => [...prev, { ...form, id: "pay" + uid(), patientName: pt?.name || "" }]);
    setForm({ patientId: "", date: fmt(todayDate), amount: "", concept: "Sesión individual", method: "Transferencia", status: "pagado" });
    setShowAdd(false);
  };

  const del = (id) => setPayments(prev => prev.filter(p => p.id !== id));
  const toggle = (id) => setPayments(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "pagado" ? "pendiente" : "pagado" } : p));

  const stats = [
    { label: "Ingresos este mes", value: fmtCur(monthIncome), icon: TrendingUp, color: T.suc, bg: T.sucA },
    { label: "Cobrado (filtro)", value: fmtCur(totalPaid), icon: CheckCircle, color: T.p, bg: T.pA },
    { label: "Por cobrar (filtro)", value: fmtCur(totalPending), icon: AlertCircle, color: T.war, bg: T.warA },
  ];

  return (
    <div>
      <PageHeader
        title="Finanzas"
        subtitle="Control de ingresos y estados de cuenta"
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Registrar pago</Btn>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.tm, fontFamily: T.fB, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: T.fH, fontSize: 30, fontWeight: 500, color: T.t }}>{s.value}</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={20} color={s.color} strokeWidth={1.6} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, cursor: "pointer", outline: "none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      <Card>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.bdrL}`, display: "grid", gridTemplateColumns: "1fr 110px 100px 140px 110px 90px", gap: 12 }}>
          {["Paciente","Fecha","Monto","Concepto","Método","Estado"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.tl, fontFamily: T.fB, letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0
          ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botón de arriba" />
          : filtered.map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 140px 110px 90px", gap: 12, padding: "14px 20px", borderBottom: `1px solid ${T.bdrL}`, alignItems: "center" }}>
              <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t }}>{p.patientName.split(" ").slice(0,2).join(" ")}</span>
              <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>{fmtDate(p.date)}</span>
              <span style={{ fontFamily: T.fH, fontSize: 16, color: T.t, fontWeight: 500 }}>{fmtCur(p.amount)}</span>
              <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{p.concept}</span>
              <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{p.method}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => toggle(p.id)} style={{ background: p.status === "pagado" ? T.sucA : T.warA, border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontFamily: T.fB, color: p.status === "pagado" ? T.suc : T.war, fontWeight: 600 }}>
                  {p.status}
                </button>
                <button onClick={() => del(p.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))
        }
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Registrar pago">
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date" />
          <Input label="Monto (MXN) *" value={form.amount} onChange={fld("amount")} type="number" placeholder="900" />
        </div>
        <Select label="Concepto" value={form.concept} onChange={fld("concept")}
          options={["Sesión individual","Evaluación neuropsicológica","Primera consulta (90 min)","Pareja / Familia","Taller / Grupo","Otro"].map(c => ({ value: c, label: c }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Método de pago" value={form.method} onChange={fld("method")}
            options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m => ({ value: m, label: m }))} />
          <Select label="Estado" value={form.status} onChange={fld("status")}
            options={[{ value: "pagado", label: "Pagado" }, { value: "pendiente", label: "Pendiente" }]} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId || !form.amount}><Check size={15} /> Guardar pago</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE: RESOURCES
// ─────────────────────────────────────────────────────────────────────────────
const RESOURCE_TYPE_COLORS = {
  Ejercicio:      { c: T.p,         bg: T.pA                          },
  Técnica:        { c: T.acc,       bg: T.accA                        },
  Lectura:        { c: "#6B5B9E",   bg: "rgba(107,91,158,0.10)"       },
  Evaluación:     { c: T.suc,       bg: T.sucA                        },
  Psicoeducación: { c: "#5B8DB8",   bg: "rgba(91,141,184,0.10)"       },
  Video:          { c: T.err,       bg: T.errA                        },
  Otro:           { c: T.tm,        bg: T.bdrL                        },
};

function Resources({ resources, setResources }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", type: "Ejercicio", description: "", url: "", tags: "" });
  const fld = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    resources.filter(r =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
    ),
    [resources, search]
  );

  const save = () => {
    if (!form.title.trim()) return;
    setResources(prev => [...prev, { ...form, id: "r" + uid(), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean), createdAt: fmt(todayDate) }]);
    setForm({ title: "", type: "Ejercicio", description: "", url: "", tags: "" });
    setShowAdd(false);
  };

  const del = (id) => setResources(prev => prev.filter(r => r.id !== id));

  return (
    <div>
      <PageHeader
        title="Recursos"
        subtitle={`${resources.length} material${resources.length !== 1 ? "es" : ""} en biblioteca`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Agregar recurso</Btn>}
      />

      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.tl, pointerEvents: "none" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, descripción o etiqueta..."
          style={{ width: "100%", padding: "11px 14px 11px 42px", border: `1.5px solid ${T.bdr}`, borderRadius: 12, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }} />
      </div>

      {filtered.length === 0
        ? <EmptyState icon={BookOpen} title="Biblioteca vacía" desc="Agrega ejercicios, técnicas y materiales para compartir con tus pacientes" />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {filtered.map(r => {
              const tc = RESOURCE_TYPE_COLORS[r.type] || RESOURCE_TYPE_COLORS.Otro;
              return (
                <Card key={r.id} style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <Badge color={tc.c} bg={tc.bg}>{r.type}</Badge>
                    <button onClick={() => del(r.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 style={{ fontFamily: T.fH, fontSize: 19, fontWeight: 500, color: T.t, margin: "0 0 8px", lineHeight: 1.3 }}>{r.title}</h3>
                  {r.description && (
                    <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: "0 0 12px", lineHeight: 1.6 }}>{r.description}</p>
                  )}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: T.p, fontFamily: T.fB, textDecoration: "none", display: "block", marginBottom: 10 }}>
                      Abrir enlace →
                    </a>
                  )}
                  {(r.tags || []).length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {r.tags.map(tag => <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={10} /> {tag}</Badge>)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar recurso">
        <Input label="Título *" value={form.title} onChange={fld("title")} placeholder="Ej. Registro de Pensamientos ABC" />
        <Select label="Tipo" value={form.type} onChange={fld("type")}
          options={Object.keys(RESOURCE_TYPE_COLORS).map(t => ({ value: t, label: t }))} />
        <Textarea label="Descripción" value={form.description} onChange={fld("description")}
          placeholder="Describe brevemente para qué sirve este recurso..." rows={3} />
        <Input label="Enlace (opcional)" value={form.url} onChange={fld("url")} placeholder="https://..." />
        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="Ej. ansiedad, TCC, adultos" />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.title.trim()}><Check size={15} /> Guardar recurso</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
const MODULES = { dashboard: Dashboard, patients: Patients, agenda: Agenda, sessions: Sessions, finance: Finance, resources: Resources };

export default function App() {
  const [locked, setLocked] = useState(true);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Persistent state
  const [patients,     setPatients]     = useLocalStorage("pc_patients",     SAMPLE_PATIENTS);
  const [appointments, setAppointments] = useLocalStorage("pc_appointments", SAMPLE_APPOINTMENTS);
  const [sessions,     setSessions]     = useLocalStorage("pc_sessions",     SAMPLE_SESSIONS);
  const [payments,     setPayments]     = useLocalStorage("pc_payments",     SAMPLE_PAYMENTS);
  const [resources,    setResources]    = useLocalStorage("pc_resources",    SAMPLE_RESOURCES);

  const ActiveModule = MODULES[activeModule];

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.fB }}>
      {/* Desktop: sidebar in flow. Mobile: sidebar is fixed overlay, not in flow */}
      {!isMobile && (
        <Sidebar
          active={activeModule} setActive={setActiveModule}
          onLock={() => setLocked(true)}
          open={true} onClose={() => {}}
        />
      )}
      {isMobile && (
        <Sidebar
          active={activeModule} setActive={setActiveModule}
          onLock={() => setLocked(true)}
          open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content — always full width on mobile */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ background: T.t, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 9, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}
            >
              <Menu size={20} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T.p, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={14} color="#fff" strokeWidth={1.5} />
              </div>
              <span style={{ fontFamily: T.fH, fontSize: 17, fontWeight: 600, color: "#fff" }}>PsychoCore</span>
            </div>
          </div>
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? "20px 18px 32px" : "36px 40px",
          overflowY: "auto",
        }}>
          <ActiveModule
            patients={patients}         setPatients={setPatients}
            appointments={appointments} setAppointments={setAppointments}
            sessions={sessions}         setSessions={setSessions}
            payments={payments}         setPayments={setPayments}
            resources={resources}       setResources={setResources}
          />
        </main>
      </div>
    </div>
  );
}
