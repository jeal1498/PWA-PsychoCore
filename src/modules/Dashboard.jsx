// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — Etapa 5: Business Intelligence & Alertas Clínicas          ║
// ║  DEPENDENCIA: npm install recharts  (si aún no está en el proyecto)          ║
// ║  Verifica con: grep "recharts" package.json antes de instalar.               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect } from "react";
import { T, MONTHS_ES } from "../theme.js";
import { getAllAssignments } from "../lib/supabase.js";
import { bus } from "../lib/eventBus.js";
import {
  todayDate, fmt, fmtDate, fmtCur,
  moodIcon, moodColor, progressStyle,
} from "../utils.js";
import { Card, Badge } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Calendar, TrendingUp, AlertCircle, Clock,
  FileText, ChevronRight, ShieldAlert, DollarSign,
  ClipboardList, Target, UserX, Activity, ArrowRight,
  AlertTriangle, TrendingDown, Zap, CheckCircle2,
  ChevronDown, ChevronUp, Camera, BadgeCheck, Briefcase,
  CalendarClock, ListChecks,
} from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus } from "./Consent.jsx";

// ── Colores fijos para recharts (CSS vars no funcionan en atributos SVG) ────────
const CC = {
  income:   "#2D9B91",  // teal  — ingresos
  sessions: "#6B5B9E",  // púrpura — sesiones
  risk:     "#C4622A",  // rojo-naranja — riesgo
  warn:     "#B8900A",  // ámbar — advertencia
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function getLast6Months() {
  const now = new Date();
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTHS_ES[d.getMonth()].slice(0, 3),
    });
  }
  return out;
}

function getPeriodStart(period) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = now.getMonth();
  if (period === "month")   return `${y}-${String(m + 1).padStart(2, "0")}-01`;
  if (period === "quarter") return `${y}-${String(Math.floor(m / 3) * 3 + 1).padStart(2, "0")}-01`;
  return `${y}-01-01`;
}

// ── FASE 3: Contador reactivo de tareas pendientes ───────────────────────────
function usePendingTasks() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    getAllAssignments()
      .then(all => setCount(all.filter(a => a.status === "pending").length))
      .catch(() => setCount(0));
  }, []);
  useEffect(() => {
    const inc = () => setCount(c => (c ?? 0) + 1);
    bus.on("task:assigned", inc);
    return () => bus.off("task:assigned", inc);
  }, []);
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES UI
// ─────────────────────────────────────────────────────────────────────────────
function SeeAll({ label = "Ver todo", onClick }) {
  return (
    <button onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer", color: T.tl,
        display: "flex", alignItems: "center", gap: 3,
        fontFamily: T.fB, fontSize: 12, padding: 0, flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.color = T.p}
      onMouseLeave={e => e.currentTarget.style.color = T.tl}>
      {label} <ChevronRight size={12} />
    </button>
  );
}

function SectionHead({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: 0 }}>{title}</h3>
      {action}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, sub, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ transition: "all .15s ease", boxShadow: hover ? T.shM : T.sh, transform: hover ? "translateY(-2px)" : "translateY(0)", borderRadius: 16 }}
    >
      <Card onClick={onClick} style={{ padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: bg,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} color={color} strokeWidth={1.7} />
          </div>
        </div>
        <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color: T.t, lineHeight: 1, marginBottom: 2 }}>
          {value}
        </div>
        <div style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 700, color: T.tl,
          letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
        {sub && (
          <div style={{ fontFamily: T.fB, fontSize: 11, color, marginTop: 4 }}>{sub}</div>
        )}
      </Card>
    </div>
  );
}

function FinKpiCard({ label, value, icon: Icon, color, bg, sub, tag, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => onClick && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ transition: "all .15s ease", boxShadow: hover ? T.shM : T.sh, transform: hover ? "translateY(-2px)" : "translateY(0)", borderRadius: 16 }}
    >
      <Card onClick={onClick} style={{ padding: "16px 20px", cursor: onClick ? "pointer" : "default", borderLeft: `3px solid ${color}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: bg,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={14} color={color} strokeWidth={1.8} />
            </div>
            <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl,
              textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
          </div>
          {tag && (
            <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 10.5, fontWeight: 700,
              fontFamily: T.fB, color, background: bg }}>{tag}</span>
          )}
        </div>
        <div style={{ fontFamily: T.fH, fontSize: 30, fontWeight: 500, color: T.t, lineHeight: 1, marginBottom: 2 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 4 }}>{sub}</div>
        )}
      </Card>
    </div>
  );
}

function PeriodFilter({ value, onChange }) {
  const opts = [
    { id: "month",   label: "Este Mes" },
    { id: "quarter", label: "Trimestre" },
    { id: "year",    label: "Año" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{
            padding: "6px 14px", borderRadius: 9999, fontFamily: T.fB, fontSize: 12.5,
            fontWeight: 600, cursor: "pointer", transition: "all .15s", border: "none",
            background: value === o.id ? T.p : T.cardAlt,
            color: value === o.id ? "#fff" : T.tm,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12,
      padding: "10px 14px", fontFamily: T.fB, fontSize: 12, boxShadow: T.shM,
    }}>
      <div style={{ fontWeight: 700, color: T.t, marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: T.tm }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: T.t }}>
            {p.dataKey === "ingresos" ? fmtCur(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ApptCard({ appt, onStart }) {
  const done = appt.status === "completada";
  return (
    <div style={{
      background: done ? T.cardAlt : T.card,
      border: `1.5px solid ${done ? T.bdrL : T.bdr}`,
      borderRadius: 14, padding: "12px 14px",
      opacity: done ? 0.65 : 1, transition: "all .15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10,
          background: done ? T.sucA : T.pA,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", flexShrink: 0 }}>
          <Clock size={14} color={done ? T.suc : T.p} strokeWidth={1.6} />
          {appt.time && (
            <span style={{ fontFamily: T.fB, fontSize: 9, fontWeight: 700,
              color: done ? T.suc : T.p, marginTop: 1, lineHeight: 1 }}>
              {appt.time}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {appt.patientName.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tm, marginTop: 1,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {appt.type}
          </div>
        </div>
        {done ? (
          <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11,
            fontWeight: 700, fontFamily: T.fB, color: T.suc, background: T.sucA, flexShrink: 0 }}>
            Completada
          </span>
        ) : (
          <button onClick={() => onStart(appt)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
              borderRadius: 9999, border: `1.5px solid ${T.p}`, background: T.pA,
              color: T.p, fontFamily: T.fB, fontSize: 11.5, fontWeight: 700,
              cursor: "pointer", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.p; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.pA; e.currentTarget.style.color = T.p; }}>
            <FileText size={11} /> Sesión
          </button>
        )}
      </div>
    </div>
  );
}

function QuickBar({ onQuickNav, onNewSession, isMobile }) {
  const actions = [
    { label: "Nuevo",     sub: "paciente", icon: Users,      color: T.p,   bg: T.pA,   module: "patients", handler: null },
    { label: "Agendar",   sub: "cita",     icon: Calendar,   color: T.acc, bg: T.accA, module: "agenda",   handler: null },
    { label: "Nueva",     sub: "nota",     icon: FileText,   color: T.suc, bg: T.sucA, module: "sessions", handler: onNewSession },
    { label: "Registrar", sub: "pago",     icon: DollarSign, color: T.war, bg: T.warA, module: "finance",  handler: null },
  ];
  return (
    // [mobile-audit] grid de 4 columnas fijo → colapsa a 2×2 en mobile
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
      {actions.map(a => (
        <button key={a.label}
          onClick={() => a.handler ? a.handler() : onQuickNav(a.module, "add")}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "14px 8px", borderRadius: 14, border: `1.5px solid ${T.bdrL}`,
            background: T.card, cursor: "pointer", transition: "all .15s", fontFamily: T.fB,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = a.bg; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.bdrL; e.currentTarget.style.background = T.card; }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: a.bg,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <a.icon size={18} color={a.color} strokeWidth={1.6} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.tm, lineHeight: 1.3, textAlign: "center" }}>
            {a.label}<br />{a.sub}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEJORA 1 — Alerta de saldo pendiente al inicio de la jornada
// ─────────────────────────────────────────────────────────────────────────────
function PendingBalanceAlert({ pendingCount, pendingTotal, onNavigate }) {
  if (pendingCount === 0) return null;
  return (
    <div style={{
      marginBottom: 20,
      background: T.warA,
      border: `1.5px solid ${T.war}40`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${T.war}20`,
          border: `1.5px solid ${T.war}50`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <AlertCircle size={17} color={T.war} strokeWidth={1.8} />
        </div>
        <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.war }}>
          {pendingCount} paciente{pendingCount !== 1 ? "s" : ""} con saldo pendiente
          {" — "}
          <span style={{ fontWeight: 800 }}>
            Total: {fmtCur(pendingTotal)} MXN
          </span>
        </span>
      </div>
      <button
        onClick={() => onNavigate("finance")}
        style={{
          padding: "8px 16px", borderRadius: 9999, border: `1.5px solid ${T.war}`,
          background: "transparent", color: T.war, fontFamily: T.fB, fontSize: 12.5,
          fontWeight: 700, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.war; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.war; }}>
        Ver en Finanzas →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEJORA 2 — Barra de progreso de configuración pendiente
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSetupBar({ profile = {}, services = [], onNavigate, onQuickNav }) {
  const [open, setOpen] = useState(true);

  // Mapeo de cada ítem al tab de Settings correspondiente
  const ITEM_TAB = {
    photo:    "profile",
    cedula:   "profile",
    services: "services",
    schedule: "horario",
  };

  const handleConfigure = (key) => {
    const tab = ITEM_TAB[key] || "profile";
    if (onQuickNav) {
      onQuickNav("settings", null, tab);
    } else {
      onNavigate("settings");
    }
  };

  const items = useMemo(() => [
    {
      key:   "photo",
      label: "Foto de perfil",
      icon:  Camera,
      done:  !!(profile?.photo || profile?.avatar),
    },
    {
      key:   "cedula",
      label: "Número de cédula",
      icon:  BadgeCheck,
      done:  !!(profile?.cedula),
    },
    {
      key:   "services",
      label: "Al menos un servicio configurado",
      icon:  Briefcase,
      done:  services.length > 0,
    },
    {
      key:   "schedule",
      label: "Horario de disponibilidad",
      icon:  CalendarClock,
      done:  !!(profile?.schedule?.workDays?.length > 0),
    },
  ], [profile, services]);

  const completed = items.filter(i => i.done).length;
  const total     = items.length;

  // No renderiza si todo está completo
  if (completed === total) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <div style={{
      marginBottom: 20,
      background: T.card,
      border: `1.5px solid ${T.bdrL}`,
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Header colapsable */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "14px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ListChecks size={16} color={T.p} strokeWidth={1.8} />
          <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 700, color: T.t }}>
            Completa tu perfil
          </span>
          <span style={{
            padding: "2px 10px", borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
            fontFamily: T.fB, color: T.p, background: T.pA,
          }}>
            {completed} de {total} completados
          </span>
        </div>
        {open
          ? <ChevronUp size={16} color={T.tl} />
          : <ChevronDown size={16} color={T.tl} />}
      </button>

      {/* Barra de progreso */}
      <div style={{ padding: "0 16px", marginBottom: open ? 0 : 14 }}>
        <div style={{
          height: 6, borderRadius: 9999, background: T.bdrL, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 9999,
            width: `${pct}%`,
            background: pct === 100 ? T.suc : T.p,
            transition: "width .4s ease",
          }} />
        </div>
      </div>

      {/* Lista de ítems — solo visible si abierto */}
      {open && (
        <div style={{ padding: "10px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {items.map(item => {
              const ItemIcon = item.icon;
              return (
                <div key={item.key} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10,
                  background: item.done ? T.sucA : T.cardAlt,
                  border: `1px solid ${item.done ? T.suc : T.bdrL}30`,
                  opacity: item.done ? 0.75 : 1,
                  transition: "all .15s",
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: item.done ? `${T.suc}20` : T.pA,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.done
                      ? <CheckCircle2 size={14} color={T.suc} strokeWidth={2} />
                      : <ItemIcon size={14} color={T.p} strokeWidth={1.8} />}
                  </div>
                  <span style={{
                    flex: 1, fontFamily: T.fB, fontSize: 13, color: item.done ? T.tm : T.t,
                    textDecoration: item.done ? "line-through" : "none",
                  }}>
                    {item.label}
                  </span>
                  {!item.done && (
                    <button
                      onClick={() => handleConfigure(item.key)}
                      style={{
                        padding: "4px 12px", borderRadius: 9999, border: `1.5px solid ${T.p}`,
                        background: "transparent", color: T.p, fontFamily: T.fB,
                        fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                        transition: "all .15s", flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.p; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.p; }}>
                      Configurar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEJORA 3 — Guía contextual para el primer paciente
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    {
      num:     1,
      title:   "Registra tu primer paciente",
      desc:    "Agrega sus datos, historial y motivo de consulta.",
      icon:    Users,
      color:   T.p,
      bg:      T.pA,
      btnLabel:"Nuevo paciente",
      module:  "patients",
      isBtn:   true,
    },
    {
      num:     2,
      title:   "Agenda su primera cita",
      desc:    "Programa la sesión inicial en el calendario integrado.",
      icon:    Calendar,
      color:   T.acc,
      bg:      T.accA,
      btnLabel:"Ir a Agenda",
      module:  "agenda",
      isBtn:   true,
    },
    {
      num:     3,
      title:   "Envía el mensaje de bienvenida",
      desc:    "PsychoCore generará automáticamente el mensaje de confirmación al agendar la cita. No necesitas hacer nada adicional.",
      icon:    FileText,
      color:   T.suc,
      bg:      T.sucA,
      btnLabel:null,
      module:  null,
      isBtn:   false,
    },
  ];

  return (
    <div style={{
      padding: "32px 24px 28px",
      background: T.card,
      border: `1.5px solid ${T.bdrL}`,
      borderRadius: 18,
      textAlign: "center",
    }}>
      {/* Ícono decorativo */}
      <div style={{
        width: 64, height: 64, borderRadius: 18, background: T.pA,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <Zap size={28} color={T.p} strokeWidth={1.5} />
      </div>

      <h2 style={{
        fontFamily: T.fH, fontSize: 26, fontWeight: 500, color: T.t,
        margin: "0 0 8px",
      }}>
        ¡Bienvenido a PsychoCore!
      </h2>
      <p style={{
        fontFamily: T.fB, fontSize: 14, color: T.tm,
        margin: "0 auto 32px", maxWidth: 480, lineHeight: 1.6,
      }}>
        Sigue estos tres pasos para comenzar a gestionar tu práctica clínica.
      </p>

      {/* Pasos */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16, marginBottom: 28, textAlign: "left",
      }}>
        {steps.map(step => {
          const StepIcon = step.icon;
          return (
            <div key={step.num} style={{
              background: T.cardAlt,
              border: `1.5px solid ${T.bdrL}`,
              borderRadius: 14, padding: "20px 16px",
              display: "flex", flexDirection: "column", gap: 12,
              position: "relative", overflow: "hidden",
            }}>
              {/* Número de paso — decorativo fondo */}
              <div style={{
                position: "absolute", top: -6, right: 10,
                fontFamily: T.fH, fontSize: 72, fontWeight: 700,
                color: `${step.color}08`, lineHeight: 1, userSelect: "none",
              }}>
                {step.num}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, background: step.bg, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${step.color}30`,
                }}>
                  <StepIcon size={17} color={step.color} strokeWidth={1.7} />
                </div>
                <span style={{
                  fontFamily: T.fB, fontSize: 11, fontWeight: 800, color: step.color,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                }}>
                  Paso {step.num}
                </span>
              </div>

              <div>
                <div style={{ fontFamily: T.fB, fontSize: 14.5, fontWeight: 700, color: T.t, marginBottom: 5 }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.55 }}>
                  {step.desc}
                </div>
              </div>

              {step.isBtn && (
                <button
                  onClick={() => onNavigate(step.module)}
                  style={{
                    alignSelf: "flex-start",
                    padding: "8px 16px", borderRadius: 9999,
                    border: `1.5px solid ${step.color}`,
                    background: step.bg, color: step.color,
                    fontFamily: T.fB, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", transition: "all .15s",
                    marginTop: "auto",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = step.color; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = step.bg; e.currentTarget.style.color = step.color; }}>
                  {step.btnLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p style={{
        fontFamily: T.fB, fontSize: 12, color: T.tl,
        margin: 0, lineHeight: 1.5,
      }}>
        Puedes consultar esta guía en cualquier momento desde{" "}
        <span style={{ fontWeight: 700, color: T.tm }}>Configuración → Ayuda</span>.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANELES BI
// ─────────────────────────────────────────────────────────────────────────────

// Panel: Gráfica de Tendencia Financiera (Área 6 meses)
function TrendChart({ data, isMobile }) {
  return (
    <Card style={{ padding: "20px 20px 12px" }}>
      <SectionHead
        title="Tendencia Financiera — 6 Meses"
        action={
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: CC.income }} />
              <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>Ingresos</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: CC.sessions }} />
              <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>Sesiones</span>
            </div>
          </div>
        }
      />
      <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: isMobile ? -20 : 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CC.income}   stopOpacity={0.25} />
              <stop offset="95%" stopColor={CC.income}   stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CC.sessions} stopOpacity={0.22} />
              <stop offset="95%" stopColor={CC.sessions} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, fill: "#888" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            yAxisId="income"
            orientation="left"
            tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, fill: "#888" }}
            axisLine={false} tickLine={false}
            tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
          />
          <YAxis
            yAxisId="sessions"
            orientation="right"
            tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, fill: "#888" }}
            axisLine={false} tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(150,150,150,0.15)", strokeWidth: 1 }} />
          <Area
            yAxisId="income"
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke={CC.income}
            strokeWidth={2.5}
            fill="url(#gradIncome)"
            dot={{ r: 3, fill: CC.income, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Area
            yAxisId="sessions"
            type="monotone"
            dataKey="sesiones"
            name="Sesiones"
            stroke={CC.sessions}
            strokeWidth={2}
            fill="url(#gradSessions)"
            dot={{ r: 3, fill: CC.sessions, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Panel: Vigilancia Clínica (alto + moderado + inminente)
function RiskVigilancePanel({ patients, riskAssessments, onNavigate }) {
  const latestByPt = useMemo(() => {
    const m = {};
    riskAssessments.forEach(a => {
      if (!m[a.patientId] || a.date > m[a.patientId].date) m[a.patientId] = a;
    });
    return m;
  }, [riskAssessments]);

  const vigilance = useMemo(() =>
    Object.values(latestByPt)
      .filter(a => ["inminente", "alto", "moderado"].includes(a.riskLevel))
      .sort((a, b) => {
        const ord = { inminente: 0, alto: 1, moderado: 2 };
        return (ord[a.riskLevel] ?? 9) - (ord[b.riskLevel] ?? 9);
      }),
    [latestByPt]
  );

  const riskCounts = useMemo(() => {
    const c = { inminente: 0, alto: 0, moderado: 0 };
    vigilance.forEach(a => { if (c[a.riskLevel] !== undefined) c[a.riskLevel]++; });
    return c;
  }, [vigilance]);

  return (
    <Card style={{ padding: 24, borderTop: `3px solid ${CC.risk}` }}>
      <SectionHead
        title="Vigilancia Clínica"
        action={<SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />}
      />

      {/* Mini-resumen por nivel */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "inminente", label: "Inminente" },
          { key: "alto",      label: "Alto" },
          { key: "moderado",  label: "Moderado" },
        ].map(({ key, label }) => {
          const rc = RISK_CONFIG[key];
          return (
            <div key={key} style={{
              flex: 1, textAlign: "center", padding: "8px 4px",
              borderRadius: 10, background: rc?.bg || T.cardAlt,
              border: `1px solid ${rc?.color || T.bdr}30`,
            }}>
              <div style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: rc?.color || T.t }}>
                {riskCounts[key]}
              </div>
              <div style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700,
                color: rc?.color || T.tl, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {vigilance.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "20px 0",
          fontFamily: T.fB, fontSize: 13, color: T.tl,
        }}>
          ✓ Sin pacientes en vigilancia activa
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {vigilance.slice(0, 6).map(a => {
            const pt  = patients.find(p => p.id === a.patientId);
            const rc  = RISK_CONFIG[a.riskLevel] || {};
            return (
              <div key={a.id}
                onClick={() => onNavigate("sessions")}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 11, cursor: "pointer",
                  background: T.card, border: `1.5px solid ${rc.color || T.bdr}30`,
                  transition: "all .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${rc.color || T.bdr}80`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${rc.color || T.bdr}30`}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: rc.bg || T.cardAlt, border: `2px solid ${rc.color || T.bdr}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontFamily: T.fH, fontSize: 15, color: rc.color || T.t }}>
                    {pt?.name?.[0] || "?"}
                  </span>
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  </div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>
                    Últ. eval.: {fmtDate(a.date)}
                    {a.safetyPlan?.warningSignals
                      ? <span style={{ color: T.suc, marginLeft: 6 }}>✓ Plan seguridad</span>
                      : <span style={{ color: T.war, marginLeft: 6 }}>⚠ Sin plan</span>
                    }
                  </div>
                </div>
                {/* Badge nivel */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ padding: "3px 9px", borderRadius: 9999, fontSize: 10.5, fontWeight: 700,
                    fontFamily: T.fB, color: rc.color || T.t, background: rc.bg || T.cardAlt,
                    border: `1px solid ${rc.color || T.bdr}`, textTransform: "uppercase" }}>
                    {rc.label || a.riskLevel}
                  </span>
                  <ArrowRight size={11} color={T.tl} />
                </div>
              </div>
            );
          })}
          {vigilance.length > 6 && (
            <div style={{ textAlign: "center", fontFamily: T.fB, fontSize: 12, color: T.tl, padding: "4px 0" }}>
              +{vigilance.length - 6} más —{" "}
              <span style={{ color: T.p, cursor: "pointer", textDecoration: "underline" }}
                onClick={() => onNavigate("risk")}>
                Ver todos
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Panel: Inteligencia de Retención y Abandono
function RetentionPanel({ patients, sessions, onNavigate }) {
  // ── Inactividad (21 días) ────────────────────────────────────────────────
  const threshold21 = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 21);
    return fmt(d);
  }, []);

  const lastSessionByPt = useMemo(() => {
    const m = {};
    sessions.forEach(s => {
      if (!m[s.patientId] || s.date > m[s.patientId]) m[s.patientId] = s.date;
    });
    return m;
  }, [sessions]);

  const inactivePatients = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .filter(p => {
        const last = lastSessionByPt[p.id];
        return !last || last < threshold21;
      })
      .map(p => ({ ...p, lastSession: lastSessionByPt[p.id] || null }))
      .sort((a, b) => {
        if (!a.lastSession && !b.lastSession) return 0;
        if (!a.lastSession) return -1;
        if (!b.lastSession) return 1;
        return a.lastSession.localeCompare(b.lastSession);
      }),
    [patients, lastSessionByPt, threshold21]
  );

  // ── Tasa de conversión (1ª sesión → 2ª sesión, ventana 90 días) ─────────
  const conversionData = useMemo(() => {
    const ninetyAgo = new Date(todayDate);
    ninetyAgo.setDate(ninetyAgo.getDate() - 90);
    const ninetyStr = fmt(ninetyAgo);

    // Primera sesión de cada paciente
    const firstByPt = {};
    sessions.forEach(s => {
      if (!firstByPt[s.patientId] || s.date < firstByPt[s.patientId]) firstByPt[s.patientId] = s.date;
    });

    // Contar sesiones totales por paciente
    const countByPt = {};
    sessions.forEach(s => { countByPt[s.patientId] = (countByPt[s.patientId] || 0) + 1; });

    // Pacientes cuya primera sesión fue en la ventana de 90 días
    const newPts = Object.entries(firstByPt)
      .filter(([, date]) => date >= ninetyStr)
      .map(([id]) => id);

    const converted = newPts.filter(id => (countByPt[id] || 0) >= 2);

    return {
      total: newPts.length,
      converted: converted.length,
      rate: newPts.length > 0 ? Math.round((converted.length / newPts.length) * 100) : null,
    };
  }, [sessions]);

  const rateColor = conversionData.rate === null ? T.tm
    : conversionData.rate >= 70 ? T.suc
    : conversionData.rate >= 40 ? T.war
    : T.err;

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    return diff;
  };

  return (
    <Card style={{ padding: 24 }}>
      <SectionHead title="Retención de Pacientes" action={null} />

      {/* Tasa de conversión */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 16px", borderRadius: 12, marginBottom: 20,
        background: T.cardAlt, border: `1px solid ${T.bdrL}`,
      }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%",
          background: `${rateColor}15`, border: `2.5px solid ${rateColor}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 500, color: rateColor }}>
            {conversionData.rate !== null ? `${conversionData.rate}%` : "—"}
          </span>
        </div>
        <div>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 700, color: T.t, marginBottom: 2 }}>
            Tasa de Conversión
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
            {conversionData.converted} de {conversionData.total} pacientes nuevos
            {" ("}últimos 90 días{") "}regresaron a 2ª sesión
          </div>
          {conversionData.rate !== null && (
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700,
              color: rateColor, marginTop: 3 }}>
              {conversionData.rate >= 70 ? "✓ Retención saludable"
                : conversionData.rate >= 40 ? "⚠ Retención moderada — revisar seguimiento"
                : "✗ Retención baja — acción recomendada"}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de Inactividad */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700,
          color: T.war, textTransform: "uppercase", letterSpacing: "0.07em",
          display: "flex", alignItems: "center", gap: 5 }}>
          <UserX size={13} color={T.war} />
          Riesgo de abandono
          {inactivePatients.length > 0 && (
            <span style={{ padding: "1px 8px", borderRadius: 9999,
              background: T.warA, color: T.war, fontSize: 11, fontWeight: 800 }}>
              {inactivePatients.length}
            </span>
          )}
        </span>
        <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>+21 días sin sesión</span>
      </div>

      {inactivePatients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0",
          fontFamily: T.fB, fontSize: 13, color: T.tl }}>
          ✓ Todos los pacientes activos tienen actividad reciente
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {inactivePatients.slice(0, 5).map(p => {
            const days = daysSince(p.lastSession);
            const urgency = !p.lastSession || (days !== null && days > 45);
            return (
              <div key={p.id}
                onClick={() => onNavigate("sessions")}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10,
                  background: urgency ? T.warA : T.cardAlt,
                  border: `1.5px solid ${urgency ? T.war : T.bdrL}30`,
                  cursor: "pointer", transition: "all .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <div style={{ width: 32, height: 32, borderRadius: "50%",
                  background: urgency ? T.warA : T.bdrL,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: T.fH, fontSize: 13, color: urgency ? T.war : T.tm }}>
                    {p.name?.[0] || "?"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  </div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>
                    {p.lastSession ? `Última sesión: ${fmtDate(p.lastSession)}` : "Sin sesiones registradas"}
                  </div>
                </div>
                <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700,
                  color: urgency ? T.war : T.tl, flexShrink: 0 }}>
                  {days !== null ? `${days}d` : "—"}
                </span>
              </div>
            );
          })}
          {inactivePatients.length > 5 && (
            <div style={{ textAlign: "center", fontFamily: T.fB, fontSize: 12, color: T.tl, padding: "4px 0" }}>
              +{inactivePatients.length - 5} más
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({
  patients        = [],
  appointments    = [],
  sessions        = [],
  payments        = [],
  riskAssessments = [],
  treatmentPlans  = [],
  services        = [],
  profile         = {},
  onNavigate,
  onQuickNav,
  onStartSession,
  onNewSession,
}) {
  const isMobile     = useIsMobile();
  const pendingTasks = usePendingTasks();
  const todayStr     = fmt(todayDate);
  const [period, setPeriod] = useState("month");

  // ── Rango del período seleccionado ──────────────────────────────────────
  const periodStart = useMemo(() => getPeriodStart(period), [period]);

  const isInPeriod = (dateStr) => dateStr >= periodStart && dateStr <= todayStr;

  // ── Financiero — período actual ─────────────────────────────────────────
  const periodPayments = useMemo(() =>
    payments.filter(p => p.status === "pagado" && isInPeriod(p.date)),
    [payments, periodStart, todayStr]
  );
  const periodIncome = useMemo(() =>
    periodPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [periodPayments]
  );
  const periodSessions = useMemo(() =>
    sessions.filter(s => isInPeriod(s.date)),
    [sessions, periodStart, todayStr]
  );
  const avgTicket = periodSessions.length > 0
    ? Math.round(periodIncome / periodSessions.length)
    : 0;

  // Proyección: citas pendientes en los próximos 30 días × ticket promedio
  const future30Str = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + 30);
    return fmt(d);
  }, []);
  const projectedIncome = useMemo(() => {
    const pending = appointments.filter(a =>
      a.status === "pendiente" && a.date > todayStr && a.date <= future30Str
    );
    return pending.length * (avgTicket || 0);
  }, [appointments, todayStr, future30Str, avgTicket]);

  // ── Tendencia — últimos 6 meses (independiente del filtro) ──────────────
  const trendData = useMemo(() =>
    getLast6Months().map(({ key, label }) => ({
      label,
      ingresos: payments
        .filter(p => p.status === "pagado" && p.date.startsWith(key))
        .reduce((s, p) => s + Number(p.amount || 0), 0),
      sesiones: sessions.filter(s => s.date.startsWith(key)).length,
    })),
    [payments, sessions]
  );

  // ── Citas hoy ────────────────────────────────────────────────────────────
  const todayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === todayStr)
      .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [appointments, todayStr]
  );
  const pendingAppts = todayAppts.filter(a => a.status !== "completada");

  // ── Alertas críticas (alto/inminente) — para banner superior ────────────
  const latestByPt = useMemo(() => {
    const m = {};
    riskAssessments.forEach(a => {
      if (!m[a.patientId] || a.date > m[a.patientId].date) m[a.patientId] = a;
    });
    return m;
  }, [riskAssessments]);

  const criticalAlerts = useMemo(() =>
    Object.values(latestByPt)
      .filter(a => a.riskLevel === "alto" || a.riskLevel === "inminente"),
    [latestByPt]
  );

  // ── Consentimientos ──────────────────────────────────────────────────────
  const consentIssues = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .filter(p => {
        const cs = consentStatus(p);
        return cs === "pending" || cs === "expired" || cs === "expiring";
      }),
    [patients]
  );

  // ── Seguimientos post-alta ───────────────────────────────────────────────
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr  = fmt(tomorrowDate);
  const upcoming14   = new Date(todayDate);
  upcoming14.setDate(upcoming14.getDate() + 14);

  const followUps = useMemo(() =>
    appointments.filter(a =>
      a.type === "Seguimiento post-alta" && a.status === "pendiente" &&
      a.date >= todayStr && a.date <= fmt(upcoming14)
    ),
    [appointments, todayStr]
  );
  const overdueFollowUps = useMemo(() =>
    appointments.filter(a =>
      a.type === "Seguimiento post-alta" && a.status === "pendiente" && a.date < todayStr
    ),
    [appointments, todayStr]
  );

  // ── Sesiones recientes ───────────────────────────────────────────────────
  const recentSess = useMemo(() =>
    [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [sessions]
  );

  // ── Resumen para chips del header ────────────────────────────────────────
  const activeCount = patients.filter(p => (p.status || "activo") === "activo").length;
  const pendingPay  = payments.filter(p => p.status === "pendiente").length;

  const summaryParts = [];
  if (todayAppts.length > 0) summaryParts.push(`${todayAppts.length} cita${todayAppts.length > 1 ? "s" : ""} hoy`);
  if (criticalAlerts.length > 0) summaryParts.push(`${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} clínica${criticalAlerts.length > 1 ? "s" : ""}`);

  const hasSecondaryAlerts = consentIssues.length > 0 || followUps.length > 0 || overdueFollowUps.length > 0;

  // ── Labels de período para subtítulos ───────────────────────────────────
  const periodLabel = period === "month" ? "este mes" : period === "quarter" ? "este trimestre" : "este año";

  // ── MEJORA 1: Pagos pendientes del mes en curso ──────────────────────────
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const pendingBalanceData = useMemo(() => {
    const pending = payments.filter(p => {
      if (p.status !== "pendiente") return false;
      // Si tiene fecha, filtra por mes actual; si no tiene fecha, incluir siempre
      if (p.date) return p.date.startsWith(currentMonthKey);
      return true;
    });
    const total      = pending.reduce((s, p) => s + Number(p.amount || 0), 0);
    const patientIds = [...new Set(pending.map(p => p.patientId).filter(Boolean))];
    // Si hay pagos sin patientId, los cuenta como pacientes separados
    const noIdCount  = pending.filter(p => !p.patientId).length;
    const uniqueCount = patientIds.length + (noIdCount > 0 ? 1 : 0);
    return {
      count:      Math.max(uniqueCount, pending.length > 0 ? 1 : 0),
      total,
      hasPending: pending.length > 0,
    };
  }, [payments, currentMonthKey]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── 1. HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: T.fH, fontSize: isMobile ? 28 : 34,
          fontWeight: 500, color: T.t, lineHeight: 1.1, marginBottom: 4 }}>
          {greeting()} 🌿
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>
            {todayDate.toLocaleDateString("es-MX", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </span>
          {summaryParts.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {summaryParts.map((s, i) => (
                <span key={i} style={{
                  padding: "2px 10px", borderRadius: 9999,
                  background: s.includes("alerta") ? T.errA : T.pA,
                  color:      s.includes("alerta") ? T.err  : T.p,
                  fontFamily: T.fB, fontSize: 11.5, fontWeight: 700,
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MEJORA 1: ALERTA DE SALDO PENDIENTE ───────────────────────────── */}
      {pendingBalanceData.hasPending && (
        <PendingBalanceAlert
          pendingCount={pendingBalanceData.count}
          pendingTotal={pendingBalanceData.total}
          onNavigate={onNavigate}
        />
      )}

      {/* ── 2. BANNER ALERTAS CRÍTICAS (alto / inminente) ─────────────────── */}
      {criticalAlerts.length > 0 && (
        <div style={{
          marginBottom: 20, background: T.errA,
          border: `1.5px solid ${T.err}40`, borderRadius: 14, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={17} color={T.err} strokeWidth={1.8} />
              <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.err,
                textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Alertas clínicas activas
              </span>
            </div>
            <SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />
          </div>
          <div style={{ display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px,1fr))",
            gap: 8 }}>
            {criticalAlerts.map(a => {
              const pt = patients.find(p => p.id === a.patientId);
              const rc = RISK_CONFIG[a.riskLevel];
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", background: T.card, borderRadius: 10,
                  border: `1.5px solid ${rc.color}40` }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: rc.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, border: `2px solid ${rc.color}` }}>
                    <span style={{ fontFamily: T.fH, fontSize: 15, color: rc.color }}>
                      {pt?.name?.[0] || "?"}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>
                      Evaluado: {fmtDate(a.date)}
                    </div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11,
                    fontWeight: 700, fontFamily: T.fB, color: rc.color, background: rc.bg,
                    border: `1px solid ${rc.color}`, flexShrink: 0 }}>
                    {rc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. ACCIONES RÁPIDAS ───────────────────────────────────────────── */}
      <QuickBar onQuickNav={onQuickNav} onNewSession={onNewSession} isMobile={isMobile} />

      {/* ── MEJORA 2: BARRA DE PROGRESO DE CONFIGURACIÓN ──────────────────── */}
      <ProfileSetupBar
        profile={profile}
        services={services}
        onNavigate={onNavigate}
        onQuickNav={onQuickNav}
      />

      {/* ── MEJORA 3: GUÍA DE PRIMER PACIENTE o CONTENIDO NORMAL ──────────── */}
      {patients.length === 0 ? (

        <WelcomeGuide onNavigate={onNavigate} />

      ) : (
        <>
          {/* ── 4. FILTRO DE PERÍODO + KPIs FINANCIEROS ─────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.t, margin: 0 }}>
              Salud Financiera
            </h2>
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 12, marginBottom: 20,
          }}>
            <FinKpiCard
              label="Ingresos"
              value={fmtCur(periodIncome)}
              icon={TrendingUp}
              color={CC.income}
              bg={`${CC.income}18`}
              sub={periodLabel}
              onClick={() => onNavigate("finance")}
            />
            <FinKpiCard
              label="Proyección"
              value={fmtCur(projectedIncome)}
              icon={Zap}
              color={CC.sessions}
              bg={`${CC.sessions}15`}
              sub="próximos 30 días"
              tag={projectedIncome > 0 ? `${appointments.filter(a => a.status === "pendiente" && a.date > todayStr && a.date <= future30Str).length} citas` : null}
            />
            <FinKpiCard
              label="Ticket Prom."
              value={avgTicket > 0 ? fmtCur(avgTicket) : "—"}
              icon={Target}
              color="#5B8DB8"
              bg="rgba(91,141,184,0.12)"
              sub={`${periodSessions.length} sesiones`}
            />
            <FinKpiCard
              label="Pagos Pend."
              value={pendingPay}
              icon={AlertCircle}
              color={T.war}
              bg={T.warA}
              sub={pendingPay > 0 ? "cobros sin confirmar" : "al día ✓"}
              onClick={() => onNavigate("finance")}
            />
          </div>

          {/* ── 5. KPIs OPERATIVOS ──────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))",
            gap: 10, marginBottom: 24,
          }}>
            <KpiCard label="Pacientes activos" value={activeCount}
              icon={Users} color={T.p} bg={T.pA} onClick={() => onNavigate("patients")} />
            <KpiCard label="Citas hoy" value={todayAppts.length}
              icon={Calendar} color={T.acc} bg={T.accA} onClick={() => onNavigate("agenda")} />
            <KpiCard label="Sesiones período" value={periodSessions.length}
              icon={Activity} color={CC.sessions} bg={`${CC.sessions}15`} onClick={() => onNavigate("sessions")} />
            <KpiCard label="Tareas pendientes" value={pendingTasks ?? "…"}
              icon={ClipboardList} color={T.p} bg={T.pA} onClick={() => onNavigate("tasks")} />
          </div>

          {/* ── 6. GRÁFICA DE TENDENCIA ──────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <TrendChart data={trendData} isMobile={isMobile} />
          </div>

          {/* ── 7. GRID: VIGILANCIA CLÍNICA + RETENCIÓN ─────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 20, marginBottom: 24,
          }}>
            <RiskVigilancePanel
              patients={patients}
              riskAssessments={riskAssessments}
              onNavigate={onNavigate}
            />
            <RetentionPanel
              patients={patients}
              sessions={sessions}
              onNavigate={onNavigate}
            />
          </div>

          {/* ── 8. CITAS DE HOY ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.t, margin: 0 }}>
                  Citas de hoy
                </h2>
                {pendingAppts.length > 0 && (
                  <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 2 }}>
                    {pendingAppts.length} pendiente{pendingAppts.length > 1 ? "s" : ""} por documentar
                  </div>
                )}
              </div>
              <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
            </div>

            {todayAppts.length === 0 ? (
              <Card style={{ padding: 28, textAlign: "center" }}>
                <Calendar size={34} strokeWidth={1.2}
                  style={{ color: T.tl, opacity: 0.35, marginBottom: 10 }} />
                <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tl, marginBottom: 14 }}>
                  Sin citas programadas para hoy
                </div>
                <button onClick={() => onNavigate("agenda")}
                  style={{ background: T.pA, border: "none", borderRadius: 9999,
                    padding: "8px 16px", fontFamily: T.fB, fontSize: 13,
                    color: T.p, cursor: "pointer", fontWeight: 700 }}>
                  + Agendar cita
                </button>
              </Card>
            ) : (
              <div style={{ display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px,1fr))",
                gap: 12 }}>
                {todayAppts.map(a => (
                  <ApptCard key={a.id} appt={a} onStart={onStartSession} />
                ))}
              </div>
            )}
          </div>

          {/* ── 9. GRID INFERIOR: Sesiones recientes + Pendientes ─────────── */}
          <div style={{ display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px,1fr))",
            gap: 20 }}>

            {/* Sesiones recientes */}
            <Card style={{ padding: 24 }}>
              <SectionHead
                title="Sesiones recientes"
                action={<SeeAll label="Ver todas" onClick={() => onNavigate("sessions")} />}
              />
              {recentSess.length === 0 ? (
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl,
                  textAlign: "center", padding: "20px 0" }}>
                  Sin sesiones registradas aún
                </div>
              ) : recentSess.map(s => {
                const MoodIcon = moodIcon(s.mood);
                const ps = progressStyle(s.progress);
                return (
                  <div key={s.id} onClick={() => onNavigate("sessions")}
                    style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 0", borderBottom: `1px solid ${T.bdrL}`, cursor: "pointer" }}>
                    <MoodIcon size={17} color={moodColor(s.mood)} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.patientName.split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
                        {fmtDate(s.date)}
                      </div>
                    </div>
                    <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                  </div>
                );
              })}
            </Card>

            {/* Pendientes secundarios */}
            {hasSecondaryAlerts && (
              <Card style={{ padding: 24 }}>
                <SectionHead title="Pendientes" action={null} />

                {consentIssues.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center",
                      justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700,
                        color: T.war, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        ⚠ Consentimientos
                      </span>
                      <SeeAll label="Ver" onClick={() => onNavigate("patients")} />
                    </div>
                    {consentIssues.slice(0, 3).map(p => {
                      const cs    = consentStatus(p);
                      const color = cs === "expired" ? T.err : cs === "expiring" ? T.acc : T.war;
                      const label = cs === "expired" ? "Vencido" : cs === "expiring" ? "Por vencer" : "Sin firmar";
                      return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 9, background: `${color}10`, marginBottom: 5 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%",
                            background: `${color}20`, display: "flex", alignItems: "center",
                            justifyContent: "center", flexShrink: 0, border: `1.5px solid ${color}40` }}>
                            <span style={{ fontFamily: T.fH, fontSize: 12, color }}>{p.name[0]}</span>
                          </div>
                          <span style={{ fontFamily: T.fB, fontSize: 13, color: T.t, flex: 1,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name.split(" ").slice(0, 2).join(" ")}
                          </span>
                          <span style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 700, color, flexShrink: 0 }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                    {consentIssues.length > 3 && (
                      <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, textAlign: "center", marginTop: 2 }}>
                        +{consentIssues.length - 3} más
                      </div>
                    )}
                  </div>
                )}

                {(overdueFollowUps.length > 0 || followUps.length > 0) && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center",
                      justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700,
                        color: "#5B8DB8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        📅 Post-alta
                      </span>
                      <SeeAll label="Ver" onClick={() => onNavigate("agenda")} />
                    </div>
                    {[...overdueFollowUps, ...followUps].slice(0, 3).map(a => {
                      const pt      = patients.find(p => p.id === a.patientId);
                      const overdue = a.date < todayStr;
                      return (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 9,
                          background: overdue ? T.warA : "rgba(91,141,184,0.08)", marginBottom: 5 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%",
                            background: overdue ? T.warA : "rgba(91,141,184,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, border: `1.5px solid ${overdue ? T.war : "#5B8DB8"}40` }}>
                            <span style={{ fontFamily: T.fH, fontSize: 12,
                              color: overdue ? T.war : "#5B8DB8" }}>
                              {pt?.name?.[0] || "?"}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                            </div>
                            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>
                              {fmtDate(a.date)}
                            </div>
                          </div>
                          <span style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                            color: overdue ? T.war : "#5B8DB8" }}>
                            {overdue ? "Vencido" : "Próximo"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        </>
      )}

    </div>
  );
}
