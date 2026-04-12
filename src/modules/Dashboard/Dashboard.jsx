// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — Rediseño con jerarquía visual clara                        ║
// ║  Paleta: "Calm Authority" · DM Serif Display + DM Sans                      ║
// ║  Jerarquía: N0 saludo → N1 KPIs → N2 Agenda (protagonista) + soporte        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect } from "react";
import { T } from "../../theme.js";
import { bus } from "../../lib/eventBus.js";
import { Card, Badge, Btn, EmptyState } from "../../components/ui/index.jsx";
import {
  Users, Calendar, CalendarDays, FileText, ChevronRight,
  ShieldAlert, DollarSign, CheckCircle2,
  Sparkles, ListChecks, Camera, BadgeCheck,
  Briefcase, CalendarClock, ChevronDown, ChevronUp,
  ClipboardList, TrendingUp, Play,
  AlertTriangle, FileSignature, NotebookPen,
  UserPlus, BarChart2, Search, Bell, HelpCircle,
  Plus, CalendarPlus, CreditCard, FileBarChart2, Zap,
} from "lucide-react";
import { RISK_CONFIG } from "../RiskAssessment/riskAssessment.utils.js";
import { consentStatus, CONSENT_STATUS_CONFIG } from "../Consent.jsx";
import { useDashboard } from "./useDashboard.js";
import {
  greeting,
  todayFormatted,
  todayWidgetTitle,
  daysBetween,
  resolveDisplayName,
  HOY_STATUS_CFG,
  computeAbsentPatients,
  computeRiskItems,
  computeSidebarSummary,
  fmtDate,
  fmtCur,
} from "./dashboard.utils.js";

// ── Inyección de estilos globales ────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_dash_v2_styles__) {
  window.__pc_dash_v2_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap');

    @keyframes pc-fadeUp {
      from { opacity:0; transform:translateY(12px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes pc-barIn { from { width:0; } }
    @keyframes pc-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes pc-glow  {
      0%,100% { box-shadow:0 0 0 0 rgba(181,74,61,0); }
      50%     { box-shadow:0 0 0 6px rgba(181,74,61,.12); }
    }

    .pc-fu  { animation: pc-fadeUp .45s cubic-bezier(.22,1,.36,1) both; }
    .pc-d1  { animation-delay:.05s!important; }
    .pc-d2  { animation-delay:.10s!important; }
    .pc-d3  { animation-delay:.15s!important; }
    .pc-d4  { animation-delay:.20s!important; }
    .pc-d5  { animation-delay:.25s!important; }

    /* Nav */
    .pc-nav-btn:hover  { background:rgba(255,255,255,.10)!important; }
    .pc-nav-btn.active { background:rgba(255,255,255,.18)!important; }
    .pc-nav-btn:hover .pc-nl { color:rgba(255,255,255,.8)!important; }

    /* Tooltip */
    .pc-nav-btn[data-tip]:hover::after {
      content:attr(data-tip);
      position:absolute; left:calc(100% + 8px); top:50%; transform:translateY(-50%);
      background:#1E1B18; color:#fff;
      font-size:11px; font-weight:600; white-space:nowrap;
      padding:4px 10px; border-radius:6px; pointer-events:none; z-index:9999;
      box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:'DM Sans',sans-serif;
    }
    .pc-nav-btn[data-tip]:hover::before {
      content:''; position:absolute; left:calc(100% + 4px); top:50%; transform:translateY(-50%);
      border:4px solid transparent; border-right-color:#1E1B18;
      pointer-events:none; z-index:9999;
    }

    /* Shortcuts */
    .pc-sc:hover { background:#E4EEE9!important; border-color:#7AAE99!important; color:#3D6B5A!important; }
    .pc-sc-primary:hover { background:#2e5344!important; }

    /* Rows */
    .pc-ag-row:hover    { background:#F0ECE6!important; }
    .pc-risk-row:hover  { background:#F0ECE6!important; }
    .pc-task-row:hover  { background:#F0ECE6!important; }
    .pc-note-row:hover  { background:#F0ECE6!important; }
    .pc-stat-row:hover  { background:#F0ECE6!important; }
    .pc-kpi:hover { transform:translateY(-1px)!important; box-shadow:0 5px 18px rgba(30,27,24,.06)!important; }

    /* Scrollbar */
    .pc-content::-webkit-scrollbar { width:4px; }
    .pc-content::-webkit-scrollbar-thumb { background:#E4DDD6; border-radius:99px; }
    .pc-shortcuts::-webkit-scrollbar { display:none; }
  `;
  document.head.appendChild(s);
}

// ── Tokens de diseño (independientes del theme heredado) ─────────────────────
const D = {
  bg:         "#F4F1ED",
  surface:    "#FDFBF8",
  surfaceAlt: "#F0ECE6",
  sage:       "#3D6B5A",
  sageL:      "#E4EEE9",
  sageM:      "#7AAE99",
  amber:      "#B8761E",
  amberL:     "#FBF0DC",
  coral:      "#B54A3D",
  coralL:     "#FAE8E6",
  stone:      "#1E1B18",
  slate:      "#5C5751",
  mist:       "#A8A29B",
  border:     "#E4DDD6",
  fH:         "'DM Serif Display', serif",
  fB:         "'DM Sans', sans-serif",
};

// ── Helpers de presentación ──────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

function Av({ name, size = 32, color = D.sage, bg = D.sageL }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: bg, border: `1.5px solid ${color}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: D.fH, fontSize: size * 0.34, color, lineHeight: 1,
    }}>
      {initials(name)}
    </div>
  );
}

function Tag({ children, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      borderRadius: 6, padding: "2px 8px",
      fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
      color, background: bg, fontFamily: D.fB,
    }}>
      {children}
    </span>
  );
}

function CardHeader({ eyebrow, eyebrowColor, title, action, onAction }) {
  return (
    <div style={{
      padding: "14px 18px", borderBottom: `1px solid ${D.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".09em",
          textTransform: "uppercase", color: eyebrowColor || D.mist,
          marginBottom: 1, fontFamily: D.fB,
        }}>{eyebrow}</div>
        <div style={{ fontFamily: D.fH, fontSize: 16, color: D.stone }}>{title}</div>
      </div>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 11, fontWeight: 600, color: D.mist,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: D.fB, transition: "color .13s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = D.sage}
          onMouseLeave={e => e.currentTarget.style.color = D.mist}
        >{action}</button>
      )}
    </div>
  );
}

// ── 0 — BARRA DE ACCESOS DIRECTOS ───────────────────────────────────────────
function ShortcutsBar({ onQuickNav, onNewSession, patients }) {
  const hasPatients = patients.length > 0;
  const items = [
    { label: "Nuevo paciente",   icon: UserPlus,      primary: true,  action: () => onQuickNav("patients", "add") },
    { label: "Agendar cita",     icon: CalendarPlus,  primary: false, action: () => onQuickNav("agenda", "add") },
    { label: "Iniciar sesión",   icon: Play,          primary: false, action: onNewSession, disabled: !hasPatients },
    null, // divider
    { label: "Nota clínica",     icon: NotebookPen,   primary: false, action: () => onQuickNav("sessions", "add"), disabled: !hasPatients },
    { label: "Registrar pago",   icon: CreditCard,    primary: false, action: () => onQuickNav("finance", "add") },
    { label: "Evaluar riesgo",   icon: Zap,           primary: false, action: () => onQuickNav("risk", "add"), disabled: !hasPatients },
    null,
    { label: "Reporte mensual",  icon: FileBarChart2, primary: false, action: () => onQuickNav("reports") },
  ];

  return (
    <div className="pc-shortcuts" style={{
      height: 50, flexShrink: 0,
      background: D.surface, borderBottom: `1px solid ${D.border}`,
      display: "flex", alignItems: "center", padding: "0 24px", gap: 6,
      overflowX: "auto",
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: D.mist,
        letterSpacing: ".09em", textTransform: "uppercase",
        marginRight: 6, flexShrink: 0, fontFamily: D.fB,
      }}>Accesos</span>

      {items.map((item, i) => {
        if (item === null) return (
          <div key={i} style={{ width: 1, height: 18, background: D.border, margin: "0 2px", flexShrink: 0 }} />
        );
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className={item.primary ? "pc-sc-primary" : "pc-sc"}
            disabled={item.disabled}
            onClick={item.action}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 13px", borderRadius: 7,
              border: `1px solid ${item.primary ? D.sage : D.border}`,
              background: item.primary ? D.sage : D.surface,
              fontFamily: D.fB, fontSize: 12, fontWeight: 600,
              color: item.primary ? "#fff" : D.slate,
              cursor: item.disabled ? "not-allowed" : "pointer",
              opacity: item.disabled ? 0.45 : 1,
              transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <Icon size={13} strokeWidth={1.8} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── 1 — TOPBAR ───────────────────────────────────────────────────────────────
function Topbar({ profile, googleUser, urgentCount }) {
  const displayName = resolveDisplayName(profile, googleUser);
  const dateStr     = todayFormatted();

  return (
    <div style={{
      height: 54, flexShrink: 0,
      background: D.surface, borderBottom: `1px solid ${D.border}`,
      display: "flex", alignItems: "center", padding: "0 24px", gap: 12,
    }}>
      <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: D.fH, fontSize: 17, color: D.stone }}>Dashboard</span>
        <span style={{ fontSize: 11, color: D.mist, fontFamily: D.fB }}>{dateStr}</span>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        background: D.bg, border: `1px solid ${D.border}`,
        borderRadius: 8, padding: "5px 11px",
      }}>
        <Search size={13} color={D.mist} strokeWidth={1.8} />
        <input
          placeholder="Buscar paciente, sesión…"
          style={{
            border: "none", background: "transparent", outline: "none",
            fontFamily: D.fB, fontSize: 12, color: D.stone, width: 170,
          }}
        />
        <span style={{
          fontSize: 10, color: D.mist,
          border: `1px solid ${D.border}`, borderRadius: 4, padding: "1px 5px",
          fontFamily: D.fB,
        }}>⌘K</span>
      </div>

      {/* Notificaciones */}
      <div style={{ position: "relative" }}>
        <button style={{
          width: 32, height: 32, borderRadius: 7, border: `1px solid ${D.border}`,
          background: "transparent", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer",
        }}>
          <Bell size={14} color={D.slate} strokeWidth={1.8} />
        </button>
        {urgentCount > 0 && (
          <div style={{
            position: "absolute", top: 5, right: 5,
            width: 6, height: 6, borderRadius: "50%",
            background: D.coral, border: `1.5px solid ${D.surface}`,
          }} />
        )}
      </div>

      <button style={{
        width: 32, height: 32, borderRadius: 7, border: `1px solid ${D.border}`,
        background: "transparent", display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer",
      }}>
        <HelpCircle size={14} color={D.slate} strokeWidth={1.8} />
      </button>
    </div>
  );
}

// ── 2 — SALUDO (N0) ──────────────────────────────────────────────────────────
function Welcome({ todayAppts, urgentCount, profile, googleUser }) {
  const displayName = resolveDisplayName(profile, googleUser);
  const allSync     = urgentCount === 0;
  const current     = todayAppts.filter(a => a.status === "en_curso" || a.status === "pendiente").length;

  return (
    <div className="pc-fu" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <h1 style={{
          fontFamily: D.fH, fontSize: 24, fontWeight: 400,
          color: D.stone, lineHeight: 1.1, margin: 0,
        }}>
          {greeting()}, <span style={{ color: D.sage }}>{displayName}</span>
        </h1>
        <p style={{ fontFamily: D.fB, fontSize: 12, color: D.mist, marginTop: 3 }}>
          {todayAppts.length > 0
            ? `${todayAppts.length} cita${todayAppts.length > 1 ? "s" : ""} hoy${urgentCount > 0 ? ` · ${urgentCount} alerta${urgentCount > 1 ? "s" : ""} clínica${urgentCount > 1 ? "s" : ""}` : " · Todo en orden"}`
            : "Sin citas programadas hoy"}
        </p>
      </div>
      <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 11px", borderRadius: 7,
          background: D.sageL, fontFamily: D.fB,
          fontSize: 11, fontWeight: 600, color: D.sage,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: D.sage, animation: "pc-blink 2s ease infinite",
          }} />
          Sincronizado
        </div>
        {urgentCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 7,
            background: D.amberL, fontFamily: D.fB,
            fontSize: 11, fontWeight: 600, color: D.amber,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: D.amber, animation: "pc-blink 2s ease infinite",
            }} />
            {urgentCount} alerta{urgentCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3 — KPIs (N1) ────────────────────────────────────────────────────────────
function KpiStrip({ patients, sessions, todayAppts, urgentCount, payments }) {
  const { activePatients, completedToday, monthlyIncome } = useMemo(() => {
    const active  = patients.filter(p => (p.status || "activo") === "activo").length;
    const compl   = todayAppts.filter(a => a.status === "completada").length;
    const now     = new Date();
    const mStr    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const income  = payments
      .filter(p => p.date?.startsWith(mStr) && p.status === "pagado")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return { activePatients: active, completedToday: compl, monthlyIncome: income };
  }, [patients, todayAppts, payments]);

  const kpis = [
    { val: activePatients,                                   label: "Pacientes activos",  icon: Users,         color: D.sage,  bg: D.sageL  },
    { val: `${completedToday}/${todayAppts.length}`,         label: "Sesiones hoy",       icon: CheckCircle2,  color: D.amber, bg: D.amberL },
    { val: urgentCount,                                      label: "Alertas activas",    icon: AlertTriangle, color: urgentCount > 0 ? D.coral : D.sage, bg: urgentCount > 0 ? D.coralL : D.sageL },
    { val: monthlyIncome > 0 ? fmtCur(monthlyIncome) : "—", label: "Ingresos del mes",   icon: DollarSign,    color: D.sage,  bg: D.sageL, small: true },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className={`pc-kpi pc-fu pc-d${i + 1}`} style={{
            background: D.surface, borderRadius: 11, border: `1px solid ${D.border}`,
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
            transition: "transform .18s, box-shadow .18s", cursor: "default",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: k.bg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon size={16} color={k.color} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{
                fontFamily: D.fH, fontSize: k.small ? 18 : 22,
                color: k.color, lineHeight: 1, marginBottom: 1,
              }}>{k.val}</div>
              <div style={{ fontFamily: D.fB, fontSize: 10, color: D.mist, fontWeight: 500 }}>{k.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4 — AGENDA DEL DÍA (protagonista) ───────────────────────────────────────
function AgendaWidget({ todayAppts, sessions, nextAppt, onStartSession, onNavigate, todayStr }) {
  const inProgress = todayAppts.find(a => a.status === "en_curso");
  const completed  = todayAppts.filter(a => a.status === "completada").length;
  const progress   = todayAppts.length > 0 ? Math.round((completed / todayAppts.length) * 100) : 0;

  // Config de colores por status
  const statusStyle = (s) => ({
    completada:          { label: "Completada",  color: D.sage,  bg: D.sageL   },
    en_curso:            { label: "En curso",    color: D.amber, bg: D.amberL  },
    pendiente:           { label: "Pendiente",   color: D.mist,  bg: D.surfaceAlt },
    cancelada_paciente:  { label: "Cancelada",   color: D.coral, bg: D.coralL  },
    cancelada_psicologa: { label: "Cancelada",   color: D.coral, bg: D.coralL  },
    no_asistio:          { label: "No asistió",  color: D.amber, bg: D.amberL  },
  }[s] || { label: s, color: D.mist, bg: D.surfaceAlt });

  const riskStyle = (r) => ({
    inminente: { label: "● Inminente", color: D.coral, bg: D.coralL },
    alto:      { label: "Riesgo alto", color: D.coral, bg: D.coralL },
    medio:     { label: "Riesgo medio",color: D.amber, bg: D.amberL },
    bajo:      { label: "Riesgo bajo", color: D.sage,  bg: D.sageL  },
  }[r]);

  if (todayAppts.length === 0) {
    return (
      <div style={{
        background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`,
        overflow: "hidden",
      }}>
        <CardHeader eyebrow="🗓 Agenda de hoy" title="Sin citas programadas" />
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <Calendar size={32} color={D.mist} strokeWidth={1.2} style={{ marginBottom: 12 }} />
          <p style={{ fontFamily: D.fB, fontSize: 13, color: D.mist }}>No hay citas para hoy.</p>
          <button
            onClick={() => onNavigate("agenda")}
            style={{
              marginTop: 12, padding: "7px 16px", borderRadius: 8,
              background: D.sage, color: "#fff", border: "none",
              fontFamily: D.fB, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >Agendar cita</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`, overflow: "hidden" }}>
      <CardHeader
        eyebrow="🗓 Agenda de hoy"
        title={`${todayAppts.length} cita${todayAppts.length > 1 ? "s" : ""} programada${todayAppts.length > 1 ? "s" : ""}`}
        action="Ver agenda completa →"
        onAction={() => onNavigate("agenda")}
      />

      {/* Barra de sesión en curso */}
      {inProgress && (
        <div style={{
          padding: "9px 18px", borderBottom: `1px solid ${D.border}`,
          background: `${D.amber}07`,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: D.fB, fontSize: 11, color: D.amber, fontWeight: 600, marginBottom: 4,
          }}>
            <span>▶ En curso · {inProgress.patientName || "Paciente"}</span>
            <span>{inProgress.time || ""}</span>
          </div>
          <div style={{ height: 3, background: D.amberL, borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, background: D.amber,
              width: `${progress}%`,
              animation: "pc-barIn .9s ease both .3s",
            }} />
          </div>
        </div>
      )}

      {/* Filas de citas */}
      {todayAppts.map((appt, i) => {
        const sc  = statusStyle(appt.status);
        const rc  = riskStyle(appt.riskLevel);
        const cur = appt.status === "en_curso";
        const hasConsent = appt.consentStatus !== "pendiente" && appt.consentStatus !== undefined;
        const timeStr = appt.time || (appt.date ? appt.date.slice(11, 16) : "");

        return (
          <div
            key={appt.id || i}
            className="pc-ag-row"
            onClick={() => onStartSession && onStartSession(appt)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 18px",
              borderTop: i > 0 ? `1px solid ${D.border}` : "none",
              borderLeft: `3px solid ${cur ? D.amber : "transparent"}`,
              background: cur ? `${D.amber}06` : "transparent",
              cursor: "pointer", transition: "background .12s",
            }}
          >
            <span style={{
              fontFamily: D.fB, fontSize: 11, fontWeight: 600,
              color: cur ? D.amber : D.mist,
              width: 34, flexShrink: 0, fontVariantNumeric: "tabular-nums",
            }}>{timeStr}</span>

            <Av
              name={appt.patientName || "?"}
              size={32}
              color={cur ? D.amber : D.sage}
              bg={cur ? D.amberL : D.sageL}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: D.fB, fontSize: 13, fontWeight: 600, color: D.stone, lineHeight: 1.2 }}>
                {appt.patientName || "Paciente"}
              </div>
              <div style={{ fontFamily: D.fB, fontSize: 11, color: D.mist, marginTop: 1 }}>
                {appt.type || appt.serviceTitle || "Sesión"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {rc && <Tag color={rc.color} bg={rc.bg}>{rc.label}</Tag>}
              {appt.consentStatus === "pendiente" && (
                <Tag color={D.coral} bg={D.coralL}>Sin consentimiento</Tag>
              )}
              <Tag color={sc.color} bg={sc.bg}>{sc.label}</Tag>
              {cur && (
                <button
                  onClick={e => { e.stopPropagation(); onStartSession && onStartSession(appt); }}
                  style={{
                    padding: "5px 11px", borderRadius: 6, border: "none",
                    background: D.amber, color: "#fff",
                    fontFamily: D.fB, fontSize: 11, fontWeight: 700,
                    cursor: "pointer", transition: "background .13s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#8f590e"}
                  onMouseLeave={e => e.currentTarget.style.background = D.amber}
                >Ver sesión</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 5 — RADAR DE RIESGO (secundario) ────────────────────────────────────────
function RiskRadar({ patients, sessions, riskAssessments, todayStr, onNavigate }) {
  const absentPatients = useMemo(() => computeAbsentPatients({ patients, sessions }), [patients, sessions]);
  const riskItems      = useMemo(() => computeRiskItems(riskAssessments), [riskAssessments]);
  const total          = riskItems.length + absentPatients.length;
  const hasImminent    = riskItems.some(r => r.riskLevel === "inminente");

  const riskStyle = (level) => ({
    inminente: { label: "● Inminente", color: D.coral, bg: D.coralL },
    alto:      { label: "Alto",        color: D.coral, bg: D.coralL },
    medio:     { label: "Medio",       color: D.amber, bg: D.amberL },
    bajo:      { label: "Bajo",        color: D.sage,  bg: D.sageL  },
  }[level] || { label: level, color: D.mist, bg: D.surfaceAlt });

  if (total === 0) {
    return (
      <div style={{ background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`, overflow: "hidden" }}>
        <CardHeader eyebrow="⚠ Radar de riesgo" eyebrowColor={D.sage} title="Sin alertas activas" />
        <div style={{ padding: "16px 18px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 10,
            background: D.sageL, border: `1px solid ${D.sage}22`,
          }}>
            <CheckCircle2 size={16} color={D.sage} strokeWidth={1.8} />
            <p style={{ fontFamily: D.fB, fontSize: 12, color: D.slate, margin: 0 }}>
              Todos los pacientes en seguimiento regular.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: D.surface, borderRadius: 13,
      border: `1px solid ${hasImminent ? `${D.coral}44` : D.border}`,
      overflow: "hidden",
      animation: hasImminent ? "pc-glow 2.5s ease infinite" : "none",
    }}>
      <CardHeader
        eyebrow="⚠ Radar de riesgo"
        eyebrowColor={D.coral}
        title="Vigilancia clínica"
        action="Ver todos →"
        onAction={() => onNavigate("risk")}
      />

      {riskItems.map((a, i) => {
        const pt = patients.find(p => p.id === a.patientId);
        const rs = riskStyle(a.riskLevel);
        return (
          <div key={a.id || i} className="pc-risk-row" style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 18px",
            borderTop: i > 0 ? `1px solid ${D.border}` : "none",
            cursor: "pointer", transition: "background .12s",
          }} onClick={() => onNavigate("risk")}>
            <Av name={pt?.name || "P"} size={28}
              color={a.riskLevel === "inminente" ? D.coral : D.amber}
              bg={a.riskLevel === "inminente" ? D.coralL : D.amberL}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: D.fB, fontSize: 12, fontWeight: 600, color: D.stone }}>
                {(pt?.name || "Paciente").split(" ").slice(0, 2).join(" ")}
              </div>
              <div style={{ fontFamily: D.fB, fontSize: 10, color: D.mist }}>
                Evaluado {fmtDate(a.date)}
              </div>
            </div>
            <Tag color={rs.color} bg={rs.bg}>{rs.label}</Tag>
          </div>
        );
      })}

      {/* Zona de ausentes */}
      {absentPatients.length > 0 && (
        <div style={{ background: D.amberL, borderTop: `1px solid ${D.border}`, padding: "10px 18px" }}>
          <div style={{
            fontFamily: D.fB, fontSize: 9, fontWeight: 700,
            color: D.amber, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 7,
          }}>⏰ Sin sesión +21 días</div>
          {absentPatients.map((p, i) => {
            const days = p.lastSession ? daysBetween(p.lastSession, todayStr) : null;
            return (
              <div key={p.id || i} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: i > 0 ? 5 : 0 }}
                onClick={() => onNavigate("patients")} className="pc-risk-row">
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: "#C8862A20", display: "flex", alignItems: "center",
                  justifyContent: "center", fontFamily: D.fH, fontSize: 8, color: D.amber,
                }}>
                  {initials(p.name || "")}
                </div>
                <span style={{ fontFamily: D.fB, fontSize: 11, color: D.stone, flex: 1 }}>
                  {(p.name || "Paciente").split(" ").slice(0, 2).join(" ")}
                </span>
                <span style={{ fontFamily: D.fB, fontSize: 11, fontWeight: 700, color: D.amber }}>
                  {days != null ? `${days}d` : "Sin sesión"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 6 — CHECKLIST DE CUMPLIMIENTO (terciario) ────────────────────────────────
function ComplianceChecklist({ patients, pendingTasks, sessions, onNavigate }) {
  const tasks = useMemo(() => {
    const result = [];
    patients.forEach(p => {
      const lastSession = sessions
        .filter(s => s.patientId === p.id)
        .sort((a, b) => b.date?.localeCompare(a.date))[0];
      if (lastSession && !lastSession.note) {
        result.push({ label: `Nota de sesión — ${(p.name || "").split(" ")[0]}`, urgent: true, action: () => onNavigate("sessions") });
      }
      if (consentStatus(p) === "pendiente") {
        result.push({ label: `Consentimiento — ${(p.name || "").split(" ")[0]}`, urgent: true, action: () => onNavigate("patients") });
      }
    });
    (pendingTasks || []).forEach(t => result.push({ label: t.label, urgent: false, action: () => onNavigate(t.module || "patients") }));
    return result.slice(0, 6);
  }, [patients, sessions, pendingTasks]);

  const [checked, setChecked] = useState({});
  const doneCount = Object.values(checked).filter(Boolean).length;
  const total     = tasks.length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 100;

  if (total === 0) return null;

  return (
    <div style={{ background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`, overflow: "hidden" }}>
      <div style={{
        padding: "14px 18px", borderBottom: `1px solid ${D.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: D.fB, fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: D.mist, marginBottom: 1 }}>
            ✅ Cumplimiento clínico
          </div>
          <div style={{ fontFamily: D.fH, fontSize: 16, color: D.stone }}>Tareas del día</div>
        </div>
        <span style={{ fontFamily: D.fB, fontSize: 11, fontWeight: 700, color: D.sage }}>
          {doneCount}/{total}
        </span>
      </div>

      {tasks.map((t, i) => {
        const done = !!checked[i];
        return (
          <div
            key={i}
            className="pc-task-row"
            onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
            style={{
              display: "flex", alignItems: "flex-start", gap: 9,
              padding: "8px 18px",
              borderTop: i > 0 ? `1px solid ${D.border}` : "none",
              cursor: "pointer", transition: "background .12s",
              opacity: done ? 0.42 : 1,
            }}
          >
            <div style={{
              width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
              border: `1.5px solid ${done ? D.sage : t.urgent ? D.coral : D.border}`,
              background: done ? D.sage : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .12s",
            }}>
              {done && <span style={{ fontSize: 8, color: "#fff" }}>✓</span>}
            </div>
            <span style={{
              fontFamily: D.fB, fontSize: 12, color: D.stone,
              lineHeight: 1.4, flex: 1,
              textDecoration: done ? "line-through" : "none",
            }}>{t.label}</span>
            {t.urgent && !done && (
              <span style={{ fontFamily: D.fB, fontSize: 10, fontWeight: 700, color: D.coral, flexShrink: 0, marginTop: 2 }}>!</span>
            )}
          </div>
        );
      })}

      {/* Barra de progreso */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 18px 12px", borderTop: `1px solid ${D.border}` }}>
        <div style={{ flex: 1, height: 3, background: D.border, borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: D.sage, borderRadius: 99,
            width: `${pct}%`, transition: "width .4s ease",
            animation: "pc-barIn .8s ease both .2s",
          }} />
        </div>
        <span style={{ fontFamily: D.fB, fontSize: 11, fontWeight: 700, color: D.sage, flexShrink: 0 }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── 7 — NOTAS RECIENTES (terciario) ─────────────────────────────────────────
function RecentNotes({ sessions, patients, onNavigate }) {
  const notes = useMemo(() => {
    return sessions
      .filter(s => s.note)
      .sort((a, b) => b.date?.localeCompare(a.date))
      .slice(0, 3)
      .map(s => {
        const pt = patients.find(p => p.id === s.patientId);
        return { name: pt?.name || "Paciente", date: fmtDate(s.date), preview: s.note?.slice(0, 50) || "" };
      });
  }, [sessions, patients]);

  if (notes.length === 0) return null;

  return (
    <div style={{ background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`, overflow: "hidden" }}>
      <CardHeader
        eyebrow="📝 Notas clínicas"
        title="Recientes"
        action="Ver todas →"
        onAction={() => onNavigate("sessions")}
      />
      {notes.map((n, i) => (
        <div
          key={i}
          className="pc-note-row"
          onClick={() => onNavigate("sessions")}
          style={{
            display: "flex", gap: 9,
            padding: "8px 18px",
            borderTop: i > 0 ? `1px solid ${D.border}` : "none",
            cursor: "pointer", transition: "background .12s",
          }}
        >
          <Av name={n.name} size={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: D.fB, fontSize: 12, fontWeight: 600, color: D.stone }}>{n.name}</div>
            <div style={{
              fontFamily: D.fB, fontSize: 11, color: D.mist,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{n.preview}…</div>
            <div style={{ fontFamily: D.fB, fontSize: 10, color: D.mist, marginTop: 1 }}>{n.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 8 — RESUMEN MENSUAL (terciario) ─────────────────────────────────────────
function MonthlySummary({ patients, sessions, payments, onNavigate }) {
  const { activePatients, thisMonthSessions, monthlyIncome } = useMemo(
    () => computeSidebarSummary({ patients, sessions, payments }),
    [patients, sessions, payments]
  );

  const rows = [
    { label: "Pacientes activos",   val: activePatients,                               bar: Math.min(activePatients / 30, 1) },
    { label: "Sesiones realizadas", val: thisMonthSessions,                            bar: Math.min(thisMonthSessions / 60, 1) },
    { label: "Ingresos cobrados",   val: monthlyIncome > 0 ? fmtCur(monthlyIncome) : "—", bar: 0.7, small: true },
  ];

  return (
    <div style={{ background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`, overflow: "hidden" }}>
      <CardHeader
        eyebrow="📈 Resumen del mes"
        title="Métricas"
        action="Ver reportes →"
        onAction={() => onNavigate("reports")}
      />
      {rows.map((r, i) => (
        <div key={r.label} className="pc-stat-row" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 18px",
          borderTop: i > 0 ? `1px solid ${D.border}` : "none",
          transition: "background .12s",
        }}>
          <span style={{ fontFamily: D.fB, fontSize: 11, color: D.slate }}>{r.label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 46, height: 3, background: D.border, borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: D.sageM, borderRadius: 99,
                width: `${r.bar * 100}%`,
                animation: `pc-barIn .8s ease both ${.3 + i * .1}s`,
              }} />
            </div>
            <span style={{
              fontFamily: r.small ? D.fB : D.fH,
              fontSize: r.small ? 12 : 14,
              fontWeight: r.small ? 700 : 400,
              color: D.stone,
            }}>{r.val}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 9 — WELCOME GUIDE (sin pacientes) ───────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    { num: 1, title: "Registra tu primer paciente", desc: "Agrega sus datos, historial y motivo de consulta.", icon: Users, color: D.sage, bg: D.sageL, btnLabel: "Nuevo paciente", module: "patients" },
    { num: 2, title: "Agenda su primera cita",      desc: "Programa la sesión inicial en el calendario.",       icon: Calendar, color: D.amber, bg: D.amberL, btnLabel: "Ir a Agenda", module: "agenda" },
    { num: 3, title: "Registro automático",         desc: "PsychoCore enviará la confirmación automáticamente.", icon: FileText, color: D.mist, bg: D.surfaceAlt, btnLabel: null, module: null },
  ];

  return (
    <div style={{
      background: D.surface, borderRadius: 13, border: `1px solid ${D.border}`,
      padding: "40px 32px 36px", textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: D.sageL,
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
      }}>
        <Sparkles size={22} color={D.sage} strokeWidth={1.5} />
      </div>
      <h2 style={{ fontFamily: D.fH, fontSize: 28, fontWeight: 400, color: D.stone, margin: "0 0 8px" }}>
        ¡Bienvenido a PsychoCore!
      </h2>
      <p style={{ fontFamily: D.fB, fontSize: 13, color: D.mist, margin: "0 auto 28px", maxWidth: 380, lineHeight: 1.7 }}>
        Sigue estos pasos para comenzar a gestionar tu práctica clínica.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 10, textAlign: "left" }}>
        {steps.map(step => {
          const StepIcon = step.icon;
          return (
            <div key={step.num} style={{
              background: D.bg, border: `1px solid ${D.border}`,
              borderRadius: 12, padding: "16px 14px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: step.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <StepIcon size={14} color={step.color} strokeWidth={1.8} />
              </div>
              <p style={{ fontFamily: D.fB, fontSize: 13, fontWeight: 600, color: D.stone, margin: 0 }}>{step.title}</p>
              <p style={{ fontFamily: D.fB, fontSize: 11, color: D.mist, lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
              {step.btnLabel && (
                <button onClick={() => onNavigate(step.module)} style={{
                  marginTop: "auto", padding: "6px 12px", borderRadius: 7,
                  background: step.bg, border: `1px solid ${step.color}33`,
                  color: step.color, fontFamily: D.fB, fontSize: 11, fontWeight: 600,
                  cursor: "pointer",
                }}>{step.btnLabel}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
export default function Dashboard({
  patients        = [],
  appointments    = [],
  sessions        = [],
  payments        = [],
  riskAssessments = [],
  treatmentPlans  = [],
  services        = [],
  assignments     = [],
  profile         = {},
  googleUser      = null,
  onNavigate,
  onQuickNav,
  onStartSession,
  onNewSession,
}) {
  const {
    isMobile,
    isWide,
    gridGap,
    todayStr,
    pendingTasks,
    todayAppts,
    nextAppt,
    urgentCount,
  } = useDashboard({
    patients,
    appointments,
    sessions,
    payments,
    riskAssessments,
    assignments,
  });

  const hasPatients = patients.length > 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", minHeight: 0, background: D.bg,
      fontFamily: D.fB,
    }}>
      {/* ── Topbar ──────────────────────────────────────────────── */}
      <Topbar
        profile={profile}
        googleUser={googleUser}
        urgentCount={urgentCount}
      />

      {/* ── Barra de accesos directos ───────────────────────────── */}
      <ShortcutsBar
        onQuickNav={onQuickNav}
        onNewSession={onNewSession}
        patients={patients}
      />

      {/* ── Área de contenido scrolleable ───────────────────────── */}
      <div className="pc-content" style={{
        flex: 1, overflowY: "auto",
        padding: isMobile ? "16px" : "20px 24px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* N0: Saludo */}
        <Welcome
          todayAppts={todayAppts}
          urgentCount={urgentCount}
          profile={profile}
          googleUser={googleUser}
        />

        {/* N1: KPIs — solo si hay pacientes */}
        {hasPatients && (
          <KpiStrip
            patients={patients}
            sessions={sessions}
            todayAppts={todayAppts}
            urgentCount={urgentCount}
            payments={payments}
          />
        )}

        {/* Sin pacientes: guía de bienvenida */}
        {!hasPatients ? (
          <WelcomeGuide onNavigate={onNavigate} />
        ) : isMobile ? (
          /* ── MÓVIL: apilado ───────────────────────────────────── */
          <div className="pc-fu" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <AgendaWidget
              todayAppts={todayAppts}
              sessions={sessions}
              nextAppt={nextAppt}
              onStartSession={onStartSession}
              onNavigate={onNavigate}
              todayStr={todayStr}
            />
            <RiskRadar
              patients={patients}
              sessions={sessions}
              riskAssessments={riskAssessments}
              todayStr={todayStr}
              onNavigate={onNavigate}
            />
            <ComplianceChecklist
              patients={patients}
              pendingTasks={pendingTasks}
              sessions={sessions}
              onNavigate={onNavigate}
            />
          </div>
        ) : (
          /* ── DESKTOP: Grid protagonista + soporte ─────────────── */
          <div className="pc-fu pc-d3" style={{
            display: "grid",
            gridTemplateColumns: isWide ? "1fr 320px" : "1fr 300px",
            gap: 14,
            alignItems: "start",
          }}>
            {/* Protagonista: agenda */}
            <AgendaWidget
              todayAppts={todayAppts}
              sessions={sessions}
              nextAppt={nextAppt}
              onStartSession={onStartSession}
              onNavigate={onNavigate}
              todayStr={todayStr}
            />

            {/* Soporte: columna derecha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="pc-fu pc-d2">
                <RiskRadar
                  patients={patients}
                  sessions={sessions}
                  riskAssessments={riskAssessments}
                  todayStr={todayStr}
                  onNavigate={onNavigate}
                />
              </div>
              <div className="pc-fu pc-d3">
                <ComplianceChecklist
                  patients={patients}
                  pendingTasks={pendingTasks}
                  sessions={sessions}
                  onNavigate={onNavigate}
                />
              </div>
              <div className="pc-fu pc-d4">
                <RecentNotes
                  sessions={sessions}
                  patients={patients}
                  onNavigate={onNavigate}
                />
              </div>
              <div className="pc-fu pc-d5">
                <MonthlySummary
                  patients={patients}
                  sessions={sessions}
                  payments={payments}
                  onNavigate={onNavigate}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
