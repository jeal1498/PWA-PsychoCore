// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — Centro de Control / PsychoCore                             ║
// ║  Jerarquía: Awareness → Urgencia → Acción → Vigilancia → Inteligencia       ║
// ║  Refactor: minimalismo cálido, whitespace máximo, EmptyState nuevo          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect } from "react";
import { T, MONTHS_ES } from "../theme.js";
import { getAllAssignments } from "../lib/supabase.js";
import { bus } from "../lib/eventBus.js";
import {
  todayDate, fmt, fmtDate, fmtCur,
  moodIcon, moodColor, progressStyle,
} from "../utils.js";
import { Card, Badge, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, Calendar, TrendingUp, AlertCircle, Clock,
  FileText, ChevronRight, ShieldAlert, DollarSign,
  ClipboardList, Target, Activity, ArrowRight,
  AlertTriangle, Zap, CheckCircle2,
  ChevronDown, ChevronUp, Camera, BadgeCheck, Briefcase,
  CalendarClock, ListChecks, Sparkles, UserX,
} from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus } from "./Consent.jsx";

// ── Chart colors fijos (CSS vars no funcionan en attrs SVG) ─────────────────
const CC = {
  income:   "#2D9B91",
  sessions: "#6B5B9E",
  risk:     "#C4622A",
  warn:     "#B8900A",
};

// ── Inject keyframes once ────────────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_dash_styles__) {
  window.__pc_dash_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes dash-fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes dash-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes dash-slideRight {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes dash-pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%       { transform: scale(1.4); opacity: 0.7; }
    }
    @keyframes dash-bar-grow {
      from { width: 0%; }
    }
    @keyframes dash-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
  `;
  document.head.appendChild(s);
}

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
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  if (period === "month")   return `${y}-${String(m + 1).padStart(2, "0")}-01`;
  if (period === "quarter") return `${y}-${String(Math.floor(m / 3) * 3 + 1).padStart(2, "0")}-01`;
  return `${y}-01-01`;
}

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
// PRIMITIVOS DE LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

/** Wrapper con animación fade+slide, aplicado en cascada */
function FadeUp({ children, delay = 0, style: sx = {} }) {
  return (
    <div
      style={{
        animation: `dash-fadeUp 0.42s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
        ...sx,
      }}
    >
      {children}
    </div>
  );
}

/** Separador sutil */
function Divider({ style: sx = {} }) {
  return <div style={{ height: 1, background: T.bdrL, margin: "2px 0", ...sx }} />;
}

/** Encabezado de sección: Cormorant + acción opcional */
function SectionHead({ title, subtitle, action, delay = 0 }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: subtitle ? 14 : 16,
        gap: 8,
        animation: `dash-fadeUp 0.35s ease ${delay}s both`,
      }}
    >
      <div>
        <h3
          style={{
            fontFamily: T.fH, fontSize: 21, fontWeight: 500,
            color: T.t, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, margin: "3px 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
    </div>
  );
}

/** Enlace "Ver todo" inline */
function SeeAll({ label = "Ver todo", onClick, delay = 0 }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "none", border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 3,
        fontFamily: T.fB, fontSize: 12, fontWeight: 600, padding: 0,
        color: hover ? T.p : T.tl,
        transition: "color 0.18s ease",
        flexShrink: 0,
        animation: `dash-fadeIn 0.4s ease ${delay}s both`,
      }}
    >
      {label} <ChevronRight size={12} strokeWidth={2.5} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARDS — Operativos y Financieros
// ─────────────────────────────────────────────────────────────────────────────

/** KPI compacto: icono + número grande + etiqueta */
function KpiCard({ label, value, icon: Icon, color, bg, sub, onClick, delay = 0 }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ animation: `dash-fadeUp 0.4s ease ${delay}s both` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Card
        onClick={onClick}
        style={{
          padding: "18px 20px",
          cursor: onClick ? "pointer" : "default",
          transform: hover && onClick ? "translateY(-2px)" : "none",
          boxShadow: hover && onClick ? `0 10px 32px rgba(26,43,40,0.11)` : T.sh,
          transition: "box-shadow 0.22s ease, transform 0.2s ease",
          border: `1px solid ${hover && onClick ? T.bdr : T.bdrL}`,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 10, background: bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Icon size={15} color={color} strokeWidth={1.8} />
        </div>
        <div
          style={{
            fontFamily: T.fH, fontSize: 32, fontWeight: 500,
            color: T.t, lineHeight: 1, marginBottom: 4, letterSpacing: "-0.025em",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: T.fB, fontSize: 10.5, fontWeight: 700,
            color: T.tl, letterSpacing: "0.065em", textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        {sub && (
          <div style={{ fontFamily: T.fB, fontSize: 11, color, marginTop: 5 }}>{sub}</div>
        )}
      </Card>
    </div>
  );
}

/** KPI financiero: borde izquierdo de color + valor grande */
function FinKpiCard({ label, value, icon: Icon, color, bg, sub, tag, onClick, delay = 0 }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ animation: `dash-fadeUp 0.4s ease ${delay}s both` }}
      onMouseEnter={() => onClick && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Card
        onClick={onClick}
        style={{
          padding: "18px 20px",
          cursor: onClick ? "pointer" : "default",
          borderLeft: `3px solid ${color}`,
          transform: hover && onClick ? "translateY(-2px)" : "none",
          boxShadow: hover && onClick ? `0 10px 32px rgba(26,43,40,0.11)` : T.sh,
          transition: "box-shadow 0.22s ease, transform 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 9, background: bg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon size={14} color={color} strokeWidth={1.8} />
            </div>
            <span style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.065em" }}>
              {label}
            </span>
          </div>
          {tag && (
            <span style={{ padding: "2px 9px", borderRadius: 9999, fontSize: 10.5, fontWeight: 700, fontFamily: T.fB, color, background: bg }}>
              {tag}
            </span>
          )}
        </div>
        <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color: T.t, lineHeight: 1, marginBottom: 2, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, marginTop: 5 }}>{sub}</div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD FILTER
// ─────────────────────────────────────────────────────────────────────────────
function PeriodFilter({ value, onChange }) {
  const opts = [
    { id: "month",   label: "Mes" },
    { id: "quarter", label: "Trimestre" },
    { id: "year",    label: "Año" },
  ];
  return (
    <div
      style={{
        display: "flex", gap: 2,
        background: T.cardAlt, borderRadius: 9999,
        padding: "3px", border: `1px solid ${T.bdrL}`,
      }}
    >
      {opts.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            padding: "5px 14px", borderRadius: 9999,
            fontFamily: T.fB, fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all .18s ease", border: "none",
            background: value === o.id ? T.card : "transparent",
            color: value === o.id ? T.t : T.tl,
            boxShadow: value === o.id ? `0 1px 4px rgba(26,43,40,0.08)` : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.card, border: `1px solid ${T.bdr}`,
        borderRadius: 12, padding: "10px 14px",
        fontFamily: T.fB, fontSize: 12, boxShadow: `0 8px 28px rgba(26,43,40,0.14)`,
      }}
    >
      <div style={{ fontFamily: T.fH, fontSize: 15, color: T.t, marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: T.tl }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: T.t }}>
            {p.dataKey === "ingresos" ? fmtCur(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 1 — HEADER CONTEXTUAL
// ─────────────────────────────────────────────────────────────────────────────
function DashboardHeader({ todayAppts, criticalAlerts, isMobile }) {
  return (
    <FadeUp delay={0} style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: T.fH,
              fontSize: isMobile ? 32 : 40,
              fontWeight: 500, color: T.t, margin: 0,
              letterSpacing: "-0.022em", lineHeight: 1.1,
            }}
          >
            {greeting()} 🌿
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>
              {todayDate.toLocaleDateString("es-MX", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
            {todayAppts.length > 0 && (
              <Badge variant="default" dot>
                {todayAppts.length} cita{todayAppts.length > 1 ? "s" : ""} hoy
              </Badge>
            )}
            {criticalAlerts.length > 0 && (
              <Badge variant="error" dot>
                {criticalAlerts.length} alerta{criticalAlerts.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 2 — ALERTAS CRÍTICAS (solo si existen)
// ─────────────────────────────────────────────────────────────────────────────
function CriticalAlertsBanner({ criticalAlerts, patients, onNavigate }) {
  if (criticalAlerts.length === 0) return null;

  const imminent = criticalAlerts.filter(a => a.riskLevel === "inminente");
  const high     = criticalAlerts.filter(a => a.riskLevel === "alto");

  return (
    <FadeUp delay={0.04} style={{ marginBottom: 24 }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${T.errA} 0%, rgba(184,80,80,0.04) 100%)`,
          border: `1.5px solid rgba(184,80,80,0.2)`,
          borderRadius: 18, padding: "18px 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: "rgba(184,80,80,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ShieldAlert size={15} color={T.err} strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.err, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Alertas clínicas activas
              </span>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {imminent.length > 0 && <Badge variant="error" dot>{imminent.length} inminente{imminent.length > 1 ? "s" : ""}</Badge>}
                {high.length > 0 && <Badge variant="warning" dot>{high.length} alto{high.length > 1 ? "s" : ""}</Badge>}
              </div>
            </div>
          </div>
          <SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />
        </div>

        {/* Chips de pacientes */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {criticalAlerts.slice(0, 6).map(a => {
            const pt = patients.find(p => p.id === a.patientId);
            const rc = RISK_CONFIG[a.riskLevel] || {};
            return (
              <div
                key={a.id}
                onClick={() => onNavigate("risk")}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${rc.color || T.err}80`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${rc.color || T.err}30`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "6px 10px 6px 7px",
                  background: T.card, borderRadius: 9999,
                  border: `1.5px solid ${rc.color || T.err}30`,
                  cursor: "pointer", transition: "border-color 0.18s ease",
                }}
              >
                <div
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: rc.bg, border: `1.5px solid ${rc.color || T.err}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: T.fH, fontSize: 11, color: rc.color }}>
                    {pt?.name?.[0] || "?"}
                  </span>
                </div>
                <span style={{ fontFamily: T.fB, fontSize: 12.5, fontWeight: 600, color: T.t }}>
                  {pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                </span>
                <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 800, color: rc.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {rc.label}
                </span>
              </div>
            );
          })}
          {criticalAlerts.length > 6 && (
            <div
              onClick={() => onNavigate("risk")}
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "6px 12px", background: T.errA, borderRadius: 9999,
                fontFamily: T.fB, fontSize: 12, color: T.err, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              +{criticalAlerts.length - 6} más →
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  );
}

/** Alerta de saldo pendiente — más compacta y menos alarmista */
function PendingBalanceAlert({ pendingCount, pendingTotal, onNavigate }) {
  if (pendingCount === 0) return null;
  return (
    <FadeUp delay={0.02} style={{ marginBottom: 16 }}>
      <div
        style={{
          background: T.warA, border: `1px solid rgba(185,144,10,0.18)`,
          borderRadius: 14, padding: "11px 16px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <AlertCircle size={14} color={T.war} strokeWidth={2} />
          <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.war }}>
            {pendingCount} paciente{pendingCount !== 1 ? "s" : ""} con saldo pendiente{" "}
            <span style={{ fontWeight: 800 }}>{fmtCur(pendingTotal)} MXN</span>
          </span>
        </div>
        <Btn variant="ghost" small onClick={() => onNavigate("finance")}
          style={{ color: T.war, borderColor: `${T.war}50`, fontSize: 12 }}>
          Ver en Finanzas <ArrowRight size={12} />
        </Btn>
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 3 — AGENDA DEL DÍA
// ─────────────────────────────────────────────────────────────────────────────
function ApptCard({ appt, onStart }) {
  const done = appt.status === "completada";
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: done ? T.cardAlt : T.card,
        border: `1.5px solid ${hover && !done ? T.bdr : T.bdrL}`,
        borderRadius: 14, padding: "12px 14px",
        opacity: done ? 0.62 : 1,
        transition: "all .2s ease",
        transform: hover && !done ? "translateY(-1px)" : "none",
        boxShadow: hover && !done ? `0 6px 20px rgba(26,43,40,0.08)` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Burbuja de hora */}
        <div
          style={{
            width: 46, height: 46, borderRadius: 12,
            background: done ? T.sucA : T.pA,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Clock size={13} color={done ? T.suc : T.p} strokeWidth={1.8} />
          {appt.time && (
            <span style={{ fontFamily: T.fB, fontSize: 9.5, fontWeight: 700, color: done ? T.suc : T.p, marginTop: 1, lineHeight: 1 }}>
              {appt.time}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {appt.patientName?.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, marginTop: 1 }}>
            {appt.type}
          </div>
        </div>

        {done ? (
          <Badge variant="success" dot>Completada</Badge>
        ) : (
          <Btn
            variant="ghost"
            small
            onClick={() => onStart(appt)}
            style={{ gap: 4, padding: "6px 12px", fontSize: 12 }}
          >
            <FileText size={11} strokeWidth={2} /> Sesión
          </Btn>
        )}
      </div>
    </div>
  );
}

function AgendaSection({ todayAppts, pendingAppts, onNavigate, onStartSession, isMobile }) {
  return (
    <FadeUp delay={0.1} style={{ marginBottom: 36 }}>
      {/* Header de sección */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2
            style={{
              fontFamily: T.fH, fontSize: isMobile ? 24 : 28,
              fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.015em",
            }}
          >
            Citas de hoy
          </h2>
          {pendingAppts.length > 0 && (
            <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, margin: "3px 0 0" }}>
              {pendingAppts.length} pendiente{pendingAppts.length > 1 ? "s" : ""} por documentar
            </p>
          )}
        </div>
        <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
      </div>

      {todayAppts.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Sin citas hoy"
          desc="No hay consultas programadas para este día."
          action={{ label: "Agendar cita", onClick: () => onNavigate("agenda") }}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 10,
          }}
        >
          {todayAppts.map((a, idx) => (
            <div key={a.id} style={{ animation: `dash-fadeUp 0.38s ease ${idx * 0.05}s both` }}>
              <ApptCard appt={a} onStart={onStartSession} />
            </div>
          ))}
        </div>
      )}
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 4 — QUICK ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
function QuickAction({ action: a, onQuickNav, delay }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => a.handler ? a.handler() : onQuickNav(a.module, "add")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px", borderRadius: 14,
        border: `1.5px solid ${hover ? a.color + "50" : T.bdrL}`,
        background: hover ? a.bg : T.card,
        cursor: "pointer", transition: "all .2s ease",
        fontFamily: T.fB, textAlign: "left",
        transform: hover ? "translateY(-1px)" : "none",
        boxShadow: hover ? `0 6px 20px rgba(26,43,40,0.09)` : "none",
        animation: `dash-fadeUp 0.38s ease ${delay}s both`,
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 10, background: a.bg, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.18s ease",
          transform: hover ? "scale(1.08)" : "scale(1)",
        }}
      >
        <a.icon size={16} color={a.color} strokeWidth={1.7} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: hover ? T.t : T.tm, lineHeight: 1.3 }}>
        {a.label}
      </span>
    </button>
  );
}

function QuickBar({ onQuickNav, onNewSession, isMobile }) {
  const actions = [
    { label: "Nuevo paciente",  icon: Users,      color: T.p,   bg: T.pA,   module: "patients", handler: null },
    { label: "Agendar cita",    icon: Calendar,   color: T.acc, bg: T.accA, module: "agenda",   handler: null },
    { label: "Registrar nota",  icon: FileText,   color: T.suc, bg: T.sucA, module: "sessions", handler: onNewSession },
    { label: "Registrar pago",  icon: DollarSign, color: T.war, bg: T.warA, module: "finance",  handler: null },
  ];
  return (
    <FadeUp delay={0.07} style={{ marginBottom: 36 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {actions.map((a, i) => (
          <QuickAction key={a.label} action={a} onQuickNav={onQuickNav} delay={i * 0.04} />
        ))}
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 5 — VIGILANCIA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
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
    <Card style={{ padding: 24, borderTop: `2.5px solid ${CC.risk}35` }}>
      <SectionHead
        title="Vigilancia Clínica"
        subtitle="Pacientes con evaluación de riesgo activa"
        action={<SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />}
      />

      {/* Resumen de conteos por nivel */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: "inminente", variant: "error" },
          { key: "alto",      variant: "warning" },
          { key: "moderado",  variant: "accent" },
        ].map(({ key }) => {
          const rc = RISK_CONFIG[key];
          return (
            <div
              key={key}
              style={{
                flex: 1, textAlign: "center",
                padding: "12px 6px", borderRadius: 12,
                background: rc?.bg || T.cardAlt,
                border: `1px solid ${rc?.color || T.bdr}18`,
              }}
            >
              <div
                style={{
                  fontFamily: T.fH, fontSize: 26, fontWeight: 500,
                  color: rc?.color || T.t, lineHeight: 1, marginBottom: 4,
                }}
              >
                {riskCounts[key]}
              </div>
              <div
                style={{
                  fontFamily: T.fB, fontSize: 9.5, fontWeight: 700,
                  color: rc?.color || T.tl, textTransform: "uppercase", letterSpacing: "0.06em",
                }}
              >
                {key}
              </div>
            </div>
          );
        })}
      </div>

      {vigilance.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Sin vigilancia activa"
          desc="Todos los pacientes evaluados están en niveles seguros."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {vigilance.slice(0, 5).map((a, idx) => {
            const pt = patients.find(p => p.id === a.patientId);
            const rc = RISK_CONFIG[a.riskLevel] || {};
            return (
              <div
                key={a.id}
                onClick={() => onNavigate("risk")}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${rc.color || T.bdr}45`;
                  e.currentTarget.style.background = T.card;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `${rc.color || T.bdr}18`;
                  e.currentTarget.style.background = T.cardAlt;
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 11, cursor: "pointer",
                  background: T.cardAlt,
                  border: `1.5px solid ${rc.color || T.bdr}18`,
                  transition: "all .18s ease",
                  animation: `dash-fadeUp 0.35s ease ${idx * 0.05}s both`,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: rc.bg || T.cardAlt,
                    border: `2px solid ${rc.color || T.bdr}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: T.fH, fontSize: 15, color: rc.color || T.t }}>
                    {pt?.name?.[0] || "?"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  </div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 1 }}>
                    {fmtDate(a.date)}
                    {a.safetyPlan?.warningSignals
                      ? <span style={{ color: T.suc, marginLeft: 8 }}>✓ Plan activo</span>
                      : <span style={{ color: T.war, marginLeft: 8 }}>⚠ Sin plan</span>
                    }
                  </div>
                </div>
                <Badge color={rc.color} bg={rc.bg}>{rc.label || a.riskLevel}</Badge>
              </div>
            );
          })}
          {vigilance.length > 5 && (
            <button
              onClick={() => onNavigate("risk")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: T.fB, fontSize: 12, color: T.p, padding: "4px 0",
                textAlign: "center",
              }}
            >
              +{vigilance.length - 5} más →
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 5b — RIESGO DE ABANDONO (RetentionPanel)
// ─────────────────────────────────────────────────────────────────────────────
function RetentionPanel({ patients, sessions, onNavigate }) {
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

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(todayDate) - new Date(dateStr);
    return Math.floor(diff / 86400000);
  };

  const inactivePatients = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .map(p => ({ ...p, lastSession: lastSessionByPt[p.id] || null }))
      .filter(p => !p.lastSession || p.lastSession < threshold21)
      .sort((a, b) => {
        if (!a.lastSession) return -1;
        if (!b.lastSession) return 1;
        return a.lastSession.localeCompare(b.lastSession);
      }),
    [patients, lastSessionByPt, threshold21]
  );

  return (
    <Card style={{ padding: 24 }}>
      <SectionHead
        title="Riesgo de abandono"
        subtitle="Sin sesión en más de 21 días"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {inactivePatients.length > 0 && (
              <Badge variant="warning" dot>{inactivePatients.length}</Badge>
            )}
            <SeeAll label="Pacientes" onClick={() => onNavigate("patients")} />
          </div>
        }
      />

      {inactivePatients.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Actividad saludable"
          desc="Todos los pacientes activos tienen sesiones recientes."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {inactivePatients.slice(0, 5).map((p, idx) => {
            const days    = daysSince(p.lastSession);
            const urgency = !p.lastSession || (days !== null && days > 45);
            return (
              <div
                key={p.id}
                onClick={() => onNavigate("sessions")}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10,
                  background: urgency ? T.warA : T.cardAlt,
                  border: `1.5px solid ${urgency ? T.war + "25" : T.bdrL}`,
                  cursor: "pointer", transition: "all .18s ease",
                  animation: `dash-fadeUp 0.35s ease ${idx * 0.05}s both`,
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: urgency ? `${T.war}22` : T.bdrL,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: T.fH, fontSize: 13, color: urgency ? T.war : T.tm }}>
                    {p.name?.[0] || "?"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  </div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>
                    {p.lastSession ? `Última: ${fmtDate(p.lastSession)}` : "Sin sesiones"}
                  </div>
                </div>
                <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, flexShrink: 0, color: urgency ? T.war : T.tl }}>
                  {days !== null ? `${days}d` : "—"}
                </span>
              </div>
            );
          })}
          {inactivePatients.length > 5 && (
            <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, textAlign: "center", padding: "4px 0", margin: 0 }}>
              +{inactivePatients.length - 5} más
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 6 — SALUD FINANCIERA
// ─────────────────────────────────────────────────────────────────────────────
function TrendChart({ data, isMobile }) {
  return (
    <Card style={{ padding: "22px 20px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.01em" }}>
          Tendencia — 6 meses
        </h3>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {[{ color: CC.income, label: "Ingresos" }, { color: CC.sessions, label: "Sesiones" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? 170 : 210}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: isMobile ? -24 : 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CC.income}   stopOpacity={0.22} />
              <stop offset="95%" stopColor={CC.income}   stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CC.sessions} stopOpacity={0.20} />
              <stop offset="95%" stopColor={CC.sessions} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.07)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, fill: "#999" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            yAxisId="income" orientation="left"
            tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, fill: "#999" }}
            axisLine={false} tickLine={false}
            tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
          />
          <YAxis
            yAxisId="sessions" orientation="right"
            tick={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, fill: "#999" }}
            axisLine={false} tickLine={false} allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(150,150,150,0.12)", strokeWidth: 1 }} />
          <Area yAxisId="income"   type="monotone" dataKey="ingresos" name="Ingresos"
            stroke={CC.income}   strokeWidth={2.2} fill="url(#gradIncome)"
            dot={{ r: 3, fill: CC.income, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          <Area yAxisId="sessions" type="monotone" dataKey="sesiones" name="Sesiones"
            stroke={CC.sessions} strokeWidth={2} fill="url(#gradSessions)"
            dot={{ r: 3, fill: CC.sessions, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function FinancialSection({
  period, setPeriod, periodIncome, projectedIncome, avgTicket,
  periodSessions, pendingPay, pendingFut30, activeCount,
  todayAppts, pendingTasks, trendData, periodLabel, isMobile,
  onNavigate,
}) {
  return (
    <FadeUp delay={0.18} style={{ marginBottom: 36 }}>
      {/* Encabezado con filtro de período */}
      <div
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16, flexWrap: "wrap", gap: 10,
        }}
      >
        <h2
          style={{
            fontFamily: T.fH, fontSize: isMobile ? 24 : 28,
            fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.015em",
          }}
        >
          Salud Financiera
        </h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPIs financieros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12, marginBottom: 12,
        }}
      >
        <FinKpiCard
          label="Ingresos"
          value={fmtCur(periodIncome)}
          icon={TrendingUp}
          color={CC.income}
          bg={`${CC.income}18`}
          sub={periodLabel}
          delay={0}
          onClick={() => onNavigate("finance")}
        />
        <FinKpiCard
          label="Proyección"
          value={fmtCur(projectedIncome)}
          icon={Zap}
          color={CC.sessions}
          bg={`${CC.sessions}15`}
          sub="próx. 30 días"
          tag={pendingFut30 > 0 ? `${pendingFut30} citas` : null}
          delay={0.04}
        />
        <FinKpiCard
          label="Ticket prom."
          value={avgTicket > 0 ? fmtCur(avgTicket) : "—"}
          icon={Target}
          color="#5B8DB8"
          bg="rgba(91,141,184,0.12)"
          sub={`${periodSessions.length} sesiones`}
          delay={0.08}
        />
        <FinKpiCard
          label="Pagos pend."
          value={pendingPay}
          icon={AlertCircle}
          color={T.war}
          bg={T.warA}
          sub={pendingPay > 0 ? "sin confirmar" : "al día ✓"}
          delay={0.12}
          onClick={() => onNavigate("finance")}
        />
      </div>

      {/* KPIs operativos compactos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10, marginBottom: 14,
        }}
      >
        <KpiCard
          label="Pacientes activos" value={activeCount}
          icon={Users} color={T.p} bg={T.pA} delay={0}
          onClick={() => onNavigate("patients")}
        />
        <KpiCard
          label="Citas hoy" value={todayAppts.length}
          icon={Calendar} color={T.acc} bg={T.accA} delay={0.04}
          onClick={() => onNavigate("agenda")}
        />
        <KpiCard
          label="Sesiones período" value={periodSessions.length}
          icon={Activity} color={CC.sessions} bg={`${CC.sessions}15`} delay={0.08}
          onClick={() => onNavigate("sessions")}
        />
        <KpiCard
          label="Tareas pend." value={pendingTasks ?? "…"}
          icon={ClipboardList} color={T.p} bg={T.pA} delay={0.12}
          onClick={() => onNavigate("tasks")}
        />
      </div>

      {/* Gráfica de tendencia */}
      <TrendChart data={trendData} isMobile={isMobile} />
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONA 7 — HISTORIAL Y PENDIENTES
// ─────────────────────────────────────────────────────────────────────────────
function RecentSessionsPanel({ sessions: recentSess, onNavigate }) {
  return (
    <Card style={{ padding: 24 }}>
      <SectionHead
        title="Sesiones recientes"
        action={<SeeAll label="Ver todas" onClick={() => onNavigate("sessions")} />}
      />
      {recentSess.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin sesiones aún"
          desc="Las notas de sesión aparecerán aquí al registrar tu primera consulta."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recentSess.map((s, idx) => {
            const MoodIcon = moodIcon(s.mood);
            const ps       = progressStyle(s.progress);
            return (
              <div key={s.id}>
                <div
                  onClick={() => onNavigate("sessions")}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.72"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0", cursor: "pointer",
                    transition: "opacity 0.15s ease",
                    animation: `dash-fadeUp 0.35s ease ${idx * 0.05}s both`,
                  }}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 9, background: T.cardAlt,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <MoodIcon size={15} color={moodColor(s.mood)} strokeWidth={1.7} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.patientName?.split(" ").slice(0, 2).join(" ")}
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl }}>
                      {fmtDate(s.date)}
                    </div>
                  </div>
                  <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                </div>
                {idx < recentSess.length - 1 && <Divider />}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function PendingPanel({ consentIssues, followUps, overdueFollowUps, patients, todayStr, onNavigate }) {
  const hasContent = consentIssues.length > 0 || followUps.length > 0 || overdueFollowUps.length > 0;
  if (!hasContent) return null;

  return (
    <Card style={{ padding: 24 }}>
      <SectionHead title="Pendientes" />

      {/* Consentimientos */}
      {consentIssues.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 800, color: T.war, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Consentimientos
            </span>
            <SeeAll label="Ver" onClick={() => onNavigate("patients")} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {consentIssues.slice(0, 3).map(p => {
              const cs    = consentStatus(p);
              const color = cs === "expired" ? T.err : cs === "expiring" ? T.acc : T.war;
              const label = cs === "expired" ? "Vencido" : cs === "expiring" ? "Por vencer" : "Sin firmar";
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 9,
                    background: `${color}0C`,
                    border: `1px solid ${color}18`,
                  }}
                >
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: `${color}15`, display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: T.fH, fontSize: 11, color }}>{p.name[0]}</span>
                  </div>
                  <span style={{ fontFamily: T.fB, fontSize: 13, color: T.t, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name.split(" ").slice(0, 2).join(" ")}
                  </span>
                  <Badge color={color} bg={`${color}15`}>{label}</Badge>
                </div>
              );
            })}
            {consentIssues.length > 3 && (
              <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, textAlign: "center", margin: "2px 0 0" }}>
                +{consentIssues.length - 3} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Follow-ups post-alta */}
      {(overdueFollowUps.length > 0 || followUps.length > 0) && (
        <div>
          {consentIssues.length > 0 && <Divider style={{ margin: "0 0 14px" }} />}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 800, color: "#5B8DB8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Post-alta
            </span>
            <SeeAll label="Ver" onClick={() => onNavigate("agenda")} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[...overdueFollowUps, ...followUps].slice(0, 4).map(a => {
              const pt      = patients.find(p => p.id === a.patientId);
              const overdue = a.date < todayStr;
              const color   = overdue ? T.war : "#5B8DB8";
              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 9,
                    background: overdue ? T.warA : "rgba(91,141,184,0.06)",
                    border: `1px solid ${color}18`,
                  }}
                >
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: `${color}15`, display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: T.fH, fontSize: 11, color }}>
                      {pt?.name?.[0] || "?"}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 10.5, color: T.tl }}>
                      {fmtDate(a.date)}
                    </div>
                  </div>
                  <Badge color={color} bg={`${color}15`}>
                    {overdue ? "Vencido" : "Próximo"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SETUP BAR (collapsible)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSetupBar({ profile = {}, services = [], onNavigate, onQuickNav }) {
  const [open, setOpen] = useState(true);

  const ITEM_TAB = {
    photo:    "profile",
    cedula:   "profile",
    services: "services",
    schedule: "horario",
  };

  const handleConfigure = (key) => {
    const tab = ITEM_TAB[key] || "profile";
    if (onQuickNav) onQuickNav("settings", null, tab);
    else onNavigate("settings");
  };

  const items = useMemo(() => [
    { key: "photo",    label: "Foto de perfil",            icon: Camera,        done: !!(profile?.photo || profile?.avatar) },
    { key: "cedula",   label: "Número de cédula",          icon: BadgeCheck,    done: !!(profile?.cedula) },
    { key: "services", label: "Al menos un servicio",      icon: Briefcase,     done: services.length > 0 },
    { key: "schedule", label: "Horario de disponibilidad", icon: CalendarClock, done: !!(profile?.schedule?.workDays?.length > 0) },
  ], [profile, services]);

  const completed = items.filter(i => i.done).length;
  const total     = items.length;
  if (completed === total) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <FadeUp delay={0.06} style={{ marginBottom: 24 }}>
      <div
        style={{
          background: T.card,
          border: `1.5px solid ${T.bdrL}`,
          borderRadius: 16, overflow: "hidden",
        }}
      >
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: "100%", background: "none", border: "none", cursor: "pointer",
            padding: "13px 18px", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListChecks size={15} color={T.p} strokeWidth={1.8} />
            <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t }}>
              Completa tu perfil
            </span>
            <Badge variant="default">{completed} de {total}</Badge>
          </div>
          {open ? <ChevronUp size={15} color={T.tl} /> : <ChevronDown size={15} color={T.tl} />}
        </button>

        {/* Progress bar */}
        <div style={{ padding: "0 18px", marginBottom: open ? 4 : 14 }}>
          <div style={{ height: 4, borderRadius: 9999, background: T.bdrL, overflow: "hidden" }}>
            <div
              style={{
                height: "100%", borderRadius: 9999,
                width: `${pct}%`, background: T.p,
                transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                animation: "dash-bar-grow 0.6s ease 0.2s both",
              }}
            />
          </div>
        </div>

        {open && (
          <div style={{ padding: "6px 18px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(item => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.key}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 10,
                      background: item.done ? T.sucA : T.cardAlt,
                      border: `1px solid ${item.done ? T.suc + "28" : T.bdrL}`,
                      opacity: item.done ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: item.done ? `${T.suc}15` : T.pA,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {item.done
                        ? <CheckCircle2 size={13} color={T.suc} strokeWidth={2.2} />
                        : <ItemIcon size={13} color={T.p} strokeWidth={1.8} />}
                    </div>
                    <span
                      style={{
                        flex: 1, fontFamily: T.fB, fontSize: 13,
                        color: item.done ? T.tl : T.t,
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.label}
                    </span>
                    {!item.done && (
                      <Btn variant="ghost" small onClick={() => handleConfigure(item.key)}
                        style={{ fontSize: 11.5, padding: "4px 12px" }}>
                        Configurar
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME GUIDE (estado cero — sin pacientes)
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    {
      num: 1, title: "Registra tu primer paciente",
      desc: "Agrega sus datos, historial y motivo de consulta.",
      icon: Users, color: T.p, bg: T.pA, btnLabel: "Nuevo paciente", module: "patients", isBtn: true,
    },
    {
      num: 2, title: "Agenda su primera cita",
      desc: "Programa la sesión inicial en el calendario integrado.",
      icon: Calendar, color: T.acc, bg: T.accA, btnLabel: "Ir a Agenda", module: "agenda", isBtn: true,
    },
    {
      num: 3, title: "Mensaje de bienvenida",
      desc: "PsychoCore enviará automáticamente la confirmación al agendar.",
      icon: FileText, color: T.suc, bg: T.sucA, btnLabel: null, module: null, isBtn: false,
    },
  ];

  return (
    <FadeUp delay={0.1}>
      <Card style={{ padding: "44px 36px 40px", textAlign: "center" }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: 18,
            background: T.pA, display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 22px",
          }}
        >
          <Sparkles size={28} color={T.p} strokeWidth={1.5} />
        </div>
        <h2
          style={{
            fontFamily: T.fH, fontSize: 32, fontWeight: 500,
            color: T.t, margin: "0 0 10px", letterSpacing: "-0.02em",
          }}
        >
          ¡Bienvenido a PsychoCore!
        </h2>
        <p
          style={{
            fontFamily: T.fB, fontSize: 14, color: T.tm,
            margin: "0 auto 36px", maxWidth: 440, lineHeight: 1.7,
          }}
        >
          Sigue estos tres pasos para comenzar a gestionar tu práctica clínica.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14, marginBottom: 30, textAlign: "left",
          }}
        >
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <FadeUp key={step.num} delay={0.12 + idx * 0.08}>
                <div
                  style={{
                    background: T.cardAlt,
                    border: `1.5px solid ${T.bdrL}`,
                    borderRadius: 16, padding: "20px 18px",
                    display: "flex", flexDirection: "column", gap: 10,
                    position: "relative", overflow: "hidden", height: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "absolute", top: -8, right: 8,
                      fontFamily: T.fH, fontSize: 80, fontWeight: 700,
                      color: `${step.color}07`, lineHeight: 1, userSelect: "none",
                    }}
                  >
                    {step.num}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10, background: step.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${step.color}22`,
                      }}
                    >
                      <StepIcon size={16} color={step.color} strokeWidth={1.8} />
                    </div>
                    <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 800, color: step.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Paso {step.num}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t, marginBottom: 4 }}>
                      {step.title}
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm, lineHeight: 1.6 }}>
                      {step.desc}
                    </div>
                  </div>
                  {step.isBtn && (
                    <Btn
                      variant="ghost"
                      small
                      onClick={() => onNavigate(step.module)}
                      style={{ alignSelf: "flex-start", marginTop: "auto", color: step.color, borderColor: `${step.color}45` }}
                    >
                      {step.btnLabel}
                    </Btn>
                  )}
                </div>
              </FadeUp>
            );
          })}
        </div>

        <p style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, margin: 0 }}>
          Consulta esta guía en{" "}
          <span style={{ fontWeight: 700, color: T.tm }}>Configuración → Ayuda</span>.
        </p>
      </Card>
    </FadeUp>
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

  // ── Rango de período ──────────────────────────────────────────────────────
  const periodStart = useMemo(() => getPeriodStart(period), [period]);
  const isInPeriod  = (dateStr) => dateStr >= periodStart && dateStr <= todayStr;

  // ── Financieros ───────────────────────────────────────────────────────────
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

  const pendingPay = payments.filter(p => p.status === "pendiente").length;

  // ── Gráfica tendencia ─────────────────────────────────────────────────────
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

  // ── Agenda hoy ────────────────────────────────────────────────────────────
  const todayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === todayStr)
      .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [appointments, todayStr]
  );
  const pendingAppts = todayAppts.filter(a => a.status !== "completada");

  // ── Alertas de riesgo ─────────────────────────────────────────────────────
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

  // ── Consentimientos ───────────────────────────────────────────────────────
  const consentIssues = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .filter(p => {
        const cs = consentStatus(p);
        return cs === "pending" || cs === "expired" || cs === "expiring";
      }),
    [patients]
  );

  // ── Follow-ups ────────────────────────────────────────────────────────────
  const upcoming14 = new Date(todayDate);
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

  // ── Sesiones recientes ────────────────────────────────────────────────────
  const recentSess = useMemo(() =>
    [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [sessions]
  );

  // ── KPIs operativos ───────────────────────────────────────────────────────
  const activeCount = patients.filter(p => (p.status || "activo") === "activo").length;

  // ── Saldo pendiente ───────────────────────────────────────────────────────
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const pendingBalanceData = useMemo(() => {
    const pending     = payments.filter(p => p.status === "pendiente" && (p.date ? p.date.startsWith(currentMonthKey) : true));
    const total       = pending.reduce((s, p) => s + Number(p.amount || 0), 0);
    const patientIds  = [...new Set(pending.map(p => p.patientId).filter(Boolean))];
    const noIdCount   = pending.filter(p => !p.patientId).length;
    const uniqueCount = patientIds.length + (noIdCount > 0 ? 1 : 0);
    return {
      count:      Math.max(uniqueCount, pending.length > 0 ? 1 : 0),
      total,
      hasPending: pending.length > 0,
    };
  }, [payments, currentMonthKey]);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const periodLabel        = period === "month" ? "este mes" : period === "quarter" ? "este trimestre" : "este año";
  const pendingFut30       = appointments.filter(a => a.status === "pendiente" && a.date > todayStr && a.date <= future30Str).length;
  const hasSecondaryAlerts = consentIssues.length > 0 || followUps.length > 0 || overdueFollowUps.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200 }}>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ZONA 1 — AWARENESS: Saludo + fecha + chips de estado              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardHeader
        todayAppts={todayAppts}
        criticalAlerts={criticalAlerts}
        isMobile={isMobile}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ZONA 2 — URGENCIA: Alertas críticas (condicionales)               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <CriticalAlertsBanner
        criticalAlerts={criticalAlerts}
        patients={patients}
        onNavigate={onNavigate}
      />

      {pendingBalanceData.hasPending && (
        <PendingBalanceAlert
          pendingCount={pendingBalanceData.count}
          pendingTotal={pendingBalanceData.total}
          onNavigate={onNavigate}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ZONA 3 — ACCIÓN RÁPIDA: Quick bar + perfil                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <QuickBar
        onQuickNav={onQuickNav}
        onNewSession={onNewSession}
        isMobile={isMobile}
      />

      <ProfileSetupBar
        profile={profile}
        services={services}
        onNavigate={onNavigate}
        onQuickNav={onQuickNav}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ESTADO VACÍO — Sin pacientes registrados                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {patients.length === 0 ? (
        <WelcomeGuide onNavigate={onNavigate} />
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ZONA 4 — AGENDA DEL DÍA                                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <AgendaSection
            todayAppts={todayAppts}
            pendingAppts={pendingAppts}
            onNavigate={onNavigate}
            onStartSession={onStartSession}
            isMobile={isMobile}
          />

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ZONA 5 — VIGILANCIA: Riesgo clínico + Abandono                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <FadeUp delay={0.14} style={{ marginBottom: 36 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 20,
              }}
            >
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
          </FadeUp>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ZONA 6 — INTELIGENCIA FINANCIERA                              */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <FinancialSection
            period={period}
            setPeriod={setPeriod}
            periodIncome={periodIncome}
            projectedIncome={projectedIncome}
            avgTicket={avgTicket}
            periodSessions={periodSessions}
            pendingPay={pendingPay}
            pendingFut30={pendingFut30}
            activeCount={activeCount}
            todayAppts={todayAppts}
            pendingTasks={pendingTasks}
            trendData={trendData}
            periodLabel={periodLabel}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ZONA 7 — HISTORIAL: Sesiones recientes + Pendientes           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <FadeUp delay={0.22}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : hasSecondaryAlerts ? "1fr 1fr" : "1fr",
                gap: 20,
              }}
            >
              <RecentSessionsPanel
                sessions={recentSess}
                onNavigate={onNavigate}
              />
              {hasSecondaryAlerts && (
                <PendingPanel
                  consentIssues={consentIssues}
                  followUps={followUps}
                  overdueFollowUps={overdueFollowUps}
                  patients={patients}
                  todayStr={todayStr}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          </FadeUp>
        </>
      )}
    </div>
  );
}
