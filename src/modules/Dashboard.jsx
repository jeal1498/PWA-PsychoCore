// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — v2 "Clínica de Autor" / PsychoCore                         ║
// ║  Dirección: Editorial médica de lujo. Tipografía dominante, datos que        ║
// ║  respiran, color quirúrgico. Unforgettable: Today Strip + Risk Bar.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect } from "react";
import { T, MONTHS_ES } from "../theme.js";
import { getAllAssignments } from "../lib/supabase.js";
import { bus } from "../lib/eventBus.js";
import {
  todayDate, fmt, fmtDate, fmtCur,
  moodIcon, moodColor, progressStyle,
} from "../utils.js";
import { Card, Badge, Btn, EmptyState } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, Calendar, TrendingUp, AlertCircle, Clock,
  FileText, ChevronRight, ShieldAlert, DollarSign,
  ClipboardList, Target, Activity, ArrowRight,
  Zap, CheckCircle2, ChevronDown, ChevronUp,
  Camera, BadgeCheck, Briefcase, CalendarClock,
  ListChecks, Sparkles, Plus, ArrowUpRight,
} from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus } from "./Consent.jsx";

// ── Colores fijos para SVG / Recharts ────────────────────────────────────────
const CC = {
  income:   "#2D9B91",
  sessions: "#6B5B9E",
  risk:     "#C4622A",
  warn:     "#B8900A",
};

// ── Keyframes ────────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_dash2_styles__) {
  window.__pc_dash2_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes d2-up {
      from { opacity:0; transform:translateY(18px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes d2-in {
      from { opacity:0; }
      to   { opacity:1; }
    }
    @keyframes d2-left {
      from { opacity:0; transform:translateX(-16px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes d2-scale {
      from { opacity:0; transform:scale(0.94); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes d2-bar {
      from { width:0; }
    }
    @keyframes d2-risk-fill {
      from { width:0; }
    }
    @keyframes d2-ticker {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes d2-pulse {
      0%,100% { opacity:1; }
      50%      { opacity:0.35; }
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
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: MONTHS_ES[d.getMonth()].slice(0, 3),
    };
  });
}

function getPeriodStart(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (period === "month")   return `${y}-${String(m+1).padStart(2,"0")}-01`;
  if (period === "quarter") return `${y}-${String(Math.floor(m/3)*3+1).padStart(2,"0")}-01`;
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
// PRIMITIVOS
// ─────────────────────────────────────────────────────────────────────────────

/** Wrapper de animación configurable */
function Anim({ children, anim = "d2-up", delay = 0, style: sx = {} }) {
  return (
    <div style={{
      animation: `${anim} 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
      ...sx,
    }}>
      {children}
    </div>
  );
}

/** Línea divisora */
function HR({ vertical = false, style: sx = {} }) {
  return (
    <div style={vertical
      ? { width:1, alignSelf:"stretch", background:T.bdrL, flexShrink:0, ...sx }
      : { height:1, background:T.bdrL, ...sx }
    } />
  );
}

/** Etiqueta all-caps de sección */
function Label({ children, color, style: sx = {} }) {
  return (
    <span style={{
      fontFamily:T.fB, fontSize:10, fontWeight:800,
      letterSpacing:"0.1em", textTransform:"uppercase",
      color: color || T.tl, ...sx,
    }}>
      {children}
    </span>
  );
}

/** "Ver todo" — texto + flecha, sin borde */
function SeeAll({ label = "Ver todo", onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background:"none", border:"none", cursor:"pointer",
        display:"inline-flex", alignItems:"center", gap:3,
        fontFamily:T.fB, fontSize:11.5, fontWeight:600, padding:0,
        color: h ? T.p : T.tl, transition:"color 0.15s",
      }}>
      {label} <ArrowUpRight size={11} strokeWidth={2.5} />
    </button>
  );
}

/** Encabezado de widget */
function WidgetHead({ title, subtitle, action, size = "md" }) {
  const fs = size === "lg" ? 24 : 19;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom: subtitle ? 12 : 14, gap:8 }}>
      <div>
        <h3 style={{ fontFamily:T.fH, fontSize:fs, fontWeight:500, color:T.t, margin:0, letterSpacing:"-0.01em", lineHeight:1.2 }}>
          {title}
        </h3>
        {subtitle && <p style={{ fontFamily:T.fB, fontSize:11, color:T.tl, margin:"3px 0 0" }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink:0, marginTop:2 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY STRIP — Novedad principal del rediseño
// Banda horizontal densa: 5 métricas del día como encabezado de diario
// financiero. Primera cosa que lee el psicólogo, en un vistazo.
// ─────────────────────────────────────────────────────────────────────────────
function TodayStrip({ todayAppts, activeCount, criticalAlerts, pendingTasks, periodIncome, isMobile }) {
  const doneAppts = todayAppts.filter(a => a.status === "completada");

  const metrics = [
    {
      value: todayAppts.length,
      label: "citas hoy",
      sub: doneAppts.length > 0 ? `${doneAppts.length} completadas` : "programadas",
      color: T.acc,
      alert: todayAppts.filter(a => a.status !== "completada").length > 0,
    },
    {
      value: activeCount,
      label: "pacientes activos",
      sub: "en seguimiento",
      color: T.p,
      alert: false,
    },
    {
      value: criticalAlerts.length,
      label: "alertas clínicas",
      sub: criticalAlerts.length > 0 ? "requieren atención" : "sin alertas",
      color: criticalAlerts.length > 0 ? T.err : T.suc,
      alert: criticalAlerts.length > 0,
    },
    {
      value: pendingTasks ?? "—",
      label: "tareas pend.",
      sub: "asignadas",
      color: T.tm,
      alert: false,
    },
    {
      value: fmtCur(periodIncome),
      label: "ingresos mes",
      sub: "confirmados",
      color: CC.income,
      alert: false,
      isWide: true,
    },
  ];

  // Móvil: grid 2 columnas
  if (isMobile) {
    return (
      <Anim anim="d2-up" delay={0.05} style={{ marginBottom:28 }}>
        <div style={{
          background:T.card, border:`1px solid ${T.bdrL}`,
          borderRadius:16, overflow:"hidden",
          display:"grid", gridTemplateColumns:"1fr 1fr",
        }}>
          {metrics.slice(0,4).map((m, i) => (
            <div key={i} style={{
              padding:"16px 14px",
              borderRight: i%2===0 ? `1px solid ${T.bdrL}` : "none",
              borderBottom: i<2 ? `1px solid ${T.bdrL}` : "none",
            }}>
              <div style={{ fontFamily:T.fH, fontSize:26, fontWeight:500, color:m.alert?m.color:T.t, lineHeight:1, marginBottom:4, letterSpacing:"-0.02em" }}>
                {m.value}
              </div>
              <Label color={T.tl}>{m.label}</Label>
            </div>
          ))}
        </div>
      </Anim>
    );
  }

  return (
    <Anim anim="d2-up" delay={0.05} style={{ marginBottom:32 }}>
      <div style={{
        background:T.card,
        border:`1px solid ${T.bdrL}`,
        borderRadius:18,
        display:"flex",
        overflow:"hidden",
      }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            flex: m.isWide ? 1.5 : 1,
            padding:"22px 24px",
            borderRight: i < metrics.length-1 ? `1px solid ${T.bdrL}` : "none",
            animation:`d2-ticker 0.4s ease ${0.08+i*0.06}s both`,
            position:"relative",
          }}>
            {/* Punto pulsante de alerta */}
            {m.alert && (
              <div style={{
                position:"absolute", top:14, right:14,
                width:7, height:7, borderRadius:"50%",
                background:m.color,
                animation:"d2-pulse 2s ease-in-out infinite",
              }} />
            )}
            <div style={{
              fontFamily:T.fH,
              fontSize: m.isWide ? 26 : 32,
              fontWeight:500,
              color: m.alert ? m.color : T.t,
              lineHeight:1, marginBottom:7,
              letterSpacing:"-0.025em",
            }}>
              {m.value}
            </div>
            <Label color={T.tl}>{m.label}</Label>
            <div style={{ fontFamily:T.fB, fontSize:11, color:m.alert?m.color:T.tl, marginTop:4, opacity:0.85 }}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>
    </Anim>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER — Saludo editorial
// ─────────────────────────────────────────────────────────────────────────────
function DashHeader({ isMobile, criticalAlerts, todayAppts }) {
  const dayStr = todayDate.toLocaleDateString("es-MX", {
    weekday:"long", day:"numeric", month:"long",
  });
  const dayFormatted = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);

  return (
    <Anim anim="d2-up" delay={0} style={{ marginBottom:22 }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{
            fontFamily:T.fB, fontSize:11, fontWeight:600,
            color:T.tl, letterSpacing:"0.06em", textTransform:"uppercase",
            marginBottom:5,
          }}>
            {dayFormatted}
          </div>
          <h1 style={{
            fontFamily:T.fH,
            fontSize: isMobile ? 36 : 48,
            fontWeight:500, color:T.t, margin:0,
            letterSpacing:"-0.025em", lineHeight:1.05,
          }}>
            {greeting()}
          </h1>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingBottom:4 }}>
          {todayAppts.length > 0 && <Badge variant="default" dot>{todayAppts.length} cita{todayAppts.length>1?"s":""} hoy</Badge>}
          {criticalAlerts.length > 0 && <Badge variant="error" dot>{criticalAlerts.length} alerta{criticalAlerts.length>1?"s":""}</Badge>}
          {criticalAlerts.length === 0 && todayAppts.length === 0 && <Badge variant="success" dot>Jornada tranquila</Badge>}
        </div>
      </div>
    </Anim>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS CRÍTICAS — Banda izquierda de urgencia
// ─────────────────────────────────────────────────────────────────────────────
function CriticalBand({ criticalAlerts, patients, onNavigate }) {
  if (criticalAlerts.length === 0) return null;
  const imminent = criticalAlerts.filter(a => a.riskLevel === "inminente");
  const high     = criticalAlerts.filter(a => a.riskLevel === "alto");

  return (
    <Anim anim="d2-left" delay={0.03} style={{ marginBottom:16 }}>
      <div style={{
        background:`linear-gradient(135deg, ${T.errA} 0%, rgba(184,80,80,0.03) 100%)`,
        border:`1px solid rgba(184,80,80,0.18)`,
        borderLeft:`3px solid ${T.err}`,
        borderRadius:14, padding:"14px 18px",
        display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:14, flexWrap:"wrap",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <ShieldAlert size={14} color={T.err} strokeWidth={2} />
          <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.err }}>
            Alertas clínicas activas
          </span>
          <div style={{ display:"flex", gap:5 }}>
            {imminent.length > 0 && <Badge variant="error" dot>{imminent.length} inminente{imminent.length>1?"s":""}</Badge>}
            {high.length > 0 && <Badge variant="warning" dot>{high.length} alto{high.length>1?"s":""}</Badge>}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {criticalAlerts.slice(0,4).map(a => {
              const pt = patients.find(p => p.id === a.patientId);
              const rc = RISK_CONFIG[a.riskLevel] || {};
              return (
                <span key={a.id} onClick={() => onNavigate("risk")}
                  style={{
                    display:"inline-flex", alignItems:"center", gap:5,
                    padding:"3px 10px 3px 6px",
                    background:T.card, borderRadius:9999,
                    border:`1px solid ${rc.color||T.err}25`,
                    fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t,
                    cursor:"pointer",
                  }}>
                  <span style={{ width:18,height:18,borderRadius:"50%",background:rc.bg,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontFamily:T.fH, fontSize:10, color:rc.color }}>{pt?.name?.[0]||"?"}</span>
                  </span>
                  {pt?.name?.split(" ")[0]||"Paciente"}
                </span>
              );
            })}
            {criticalAlerts.length > 4 && (
              <span style={{ fontFamily:T.fB, fontSize:12, color:T.err, fontWeight:700, cursor:"pointer" }}
                onClick={() => onNavigate("risk")}>
                +{criticalAlerts.length-4} →
              </span>
            )}
          </div>
        </div>
        <SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />
      </div>
    </Anim>
  );
}

function BalanceBand({ count, total, onNavigate }) {
  if (count === 0) return null;
  return (
    <Anim anim="d2-in" delay={0.04} style={{ marginBottom:16 }}>
      <div style={{
        background:T.warA, border:`1px solid rgba(185,144,10,0.15)`,
        borderLeft:`3px solid ${T.war}`,
        borderRadius:14, padding:"11px 18px",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <AlertCircle size={13} color={T.war} strokeWidth={2.2} />
          <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.war }}>
            {count} paciente{count!==1?"s":""} con saldo pendiente —{" "}
            <span style={{ fontWeight:800 }}>{fmtCur(total)}</span>
          </span>
        </div>
        <Btn variant="ghost" small onClick={() => onNavigate("finance")}
          style={{ color:T.war, borderColor:`${T.war}40`, fontSize:11.5 }}>
          Ver finanzas <ArrowRight size={11} />
        </Btn>
      </div>
    </Anim>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS — Reimaginadas: texto-first, estilo barra de comandos
// ─────────────────────────────────────────────────────────────────────────────
function QuickBar({ onQuickNav, onNewSession, isMobile }) {
  const actions = [
    { label:"Nuevo paciente",  icon:Users,      hint:"ctrl+P", module:"patients", handler:null },
    { label:"Agendar cita",    icon:Calendar,   hint:"ctrl+A", module:"agenda",   handler:null },
    { label:"Registrar nota",  icon:FileText,   hint:"ctrl+N", module:"sessions", handler:onNewSession },
    { label:"Registrar pago",  icon:DollarSign, hint:"ctrl+$", module:"finance",  handler:null },
  ];
  return (
    <Anim anim="d2-up" delay={0.08} style={{ marginBottom:28 }}>
      <div style={{
        background:T.card, border:`1px solid ${T.bdrL}`,
        borderRadius:16, display:"flex", overflow:"hidden",
        flexWrap: isMobile ? "wrap" : "nowrap",
      }}>
        {actions.map((a, i) => <QuickBtn key={a.label} action={a} onQuickNav={onQuickNav} index={i} total={actions.length} isMobile={isMobile} />)}
      </div>
    </Anim>
  );
}

function QuickBtn({ action: a, onQuickNav, index, total, isMobile }) {
  const [hover, setHover] = useState(false);
  const isLast = index === total - 1;
  return (
    <button
      onClick={() => a.handler ? a.handler() : onQuickNav(a.module, "add")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: isMobile ? "1 1 50%" : 1,
        display:"flex", alignItems:"center", gap:10,
        padding: isMobile ? "14px 16px" : "16px 20px",
        background: hover ? T.cardAlt : "transparent",
        border:"none",
        borderRight: !isMobile && !isLast ? `1px solid ${T.bdrL}` : "none",
        borderBottom: isMobile && index < 2 ? `1px solid ${T.bdrL}` : "none",
        cursor:"pointer", transition:"background 0.18s ease",
        textAlign:"left",
        animation:`d2-up 0.38s ease ${0.08+index*0.04}s both`,
      }}
    >
      <div style={{
        width:30, height:30, borderRadius:8, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: hover ? T.pA : T.bdrL,
        transition:"background 0.18s ease",
      }}>
        <a.icon size={13} color={hover?T.p:T.tm} strokeWidth={1.8} style={{ transition:"color 0.18s" }} />
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{
          fontFamily:T.fB, fontSize:13, fontWeight:600,
          color: hover ? T.t : T.tm,
          transition:"color 0.18s", whiteSpace:"nowrap",
        }}>
          {a.label}
        </div>
        {!isMobile && (
          <div style={{ fontFamily:"monospace", fontSize:10, color:T.tl, marginTop:1, opacity:0.6 }}>
            {a.hint}
          </div>
        )}
      </div>
      {hover && (
        <Plus size={12} color={T.p} strokeWidth={2.5}
          style={{ marginLeft:"auto", flexShrink:0, animation:"d2-in 0.15s ease" }} />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENDA DEL DÍA — Fila de cita rediseñada con hora Cormorant
// ─────────────────────────────────────────────────────────────────────────────
function ApptRow({ appt, onStart, index }) {
  const done = appt.status === "completada";
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => !done && setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display:"flex", alignItems:"center", gap:14,
        padding:"13px 18px",
        background: h ? T.cardAlt : "transparent",
        borderRadius:12, opacity: done ? 0.55 : 1,
        transition:"background 0.18s ease",
        animation:`d2-up 0.4s ease ${index*0.06}s both`,
      }}
    >
      {/* Hora — tipografía Cormorant, prominente */}
      <div style={{ width:48, flexShrink:0, textAlign:"right" }}>
        <span style={{ fontFamily:T.fH, fontSize:21, fontWeight:500, color:done?T.tl:T.p, lineHeight:1 }}>
          {appt.time || "—"}
        </span>
      </div>

      {/* Línea vertical de status */}
      <div style={{
        width:2, alignSelf:"stretch",
        background: done ? T.sucA : h ? T.p : T.bdrL,
        borderRadius:2, flexShrink:0,
        transition:"background 0.2s ease", minHeight:36,
      }} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {appt.patientName?.split(" ").slice(0,2).join(" ")}
        </div>
        <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:2 }}>
          {appt.type}
        </div>
      </div>

      {done
        ? <Badge variant="success" dot>Completada</Badge>
        : <Btn variant="ghost" small onClick={() => onStart(appt)} style={{ gap:5, fontSize:12, padding:"6px 14px" }}>
            <FileText size={11} strokeWidth={2} /> Iniciar
          </Btn>
      }
    </div>
  );
}

function AgendaWidget({ todayAppts, pendingAppts, onNavigate, onStartSession, isMobile }) {
  return (
    <Anim anim="d2-up" delay={0.1} style={{ marginBottom:32 }}>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 20px 14px",
          borderBottom:`1px solid ${T.bdrL}`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:3, height:22, borderRadius:2, background:T.acc, flexShrink:0 }} />
            <div>
              <h2 style={{ fontFamily:T.fH, fontSize:isMobile?22:25, fontWeight:500, color:T.t, margin:0, letterSpacing:"-0.01em" }}>
                Agenda de hoy
              </h2>
              {pendingAppts.length > 0 && (
                <p style={{ fontFamily:T.fB, fontSize:11, color:T.tl, margin:"2px 0 0" }}>
                  {pendingAppts.length} cita{pendingAppts.length>1?"s":""} por documentar
                </p>
              )}
            </div>
          </div>
          <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
        </div>
        {todayAppts.length === 0 ? (
          <EmptyState icon={Calendar} title="Sin citas hoy" desc="No hay consultas programadas para este día."
            action={{ label:"Agendar cita", onClick:() => onNavigate("agenda") }} />
        ) : (
          <div style={{ padding:"6px 0 8px" }}>
            {todayAppts.map((a, i) => <ApptRow key={a.id} appt={a} onStart={onStartSession} index={i} />)}
          </div>
        )}
      </Card>
    </Anim>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARRA DE RIESGO SEGMENTADA — Visualización expresiva y nueva
// ─────────────────────────────────────────────────────────────────────────────
function RiskBar({ counts, total }) {
  if (total === 0) return null;
  const segments = [
    { key:"inminente", color:T.err },
    { key:"alto",      color:T.war },
    { key:"moderado",  color:T.acc },
  ].filter(s => counts[s.key] > 0);

  const atRisk = segments.reduce((a, s) => a + counts[s.key], 0);
  const safe   = total - atRisk;

  return (
    <div style={{ marginBottom:18 }}>
      {/* Barra segmentada */}
      <div style={{ display:"flex", height:5, borderRadius:9999, overflow:"hidden", gap:2, marginBottom:9 }}>
        {segments.map(s => (
          <div key={s.key} style={{
            flex:counts[s.key], background:s.color, borderRadius:9999,
            animation:"d2-risk-fill 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both",
            opacity:0.8,
          }} />
        ))}
        {safe > 0 && (
          <div style={{ flex:safe, background:T.bdrL, borderRadius:9999 }} />
        )}
      </div>
      {/* Leyenda */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {segments.map(s => (
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:7,height:7,borderRadius:"50%",background:s.color,flexShrink:0 }} />
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
              <strong style={{ color:T.t, fontWeight:700 }}>{counts[s.key]}</strong>{" "}
              {s.key}
            </span>
          </div>
        ))}
        {safe > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:7,height:7,borderRadius:"50%",background:T.bdrL,flexShrink:0 }} />
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
              <strong style={{ color:T.t, fontWeight:700 }}>{safe}</strong> seguros
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIGILANCIA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
function RiskWidget({ patients, riskAssessments, onNavigate }) {
  const latestByPt = useMemo(() => {
    const m = {};
    riskAssessments.forEach(a => { if (!m[a.patientId]||a.date>m[a.patientId].date) m[a.patientId]=a; });
    return m;
  }, [riskAssessments]);

  const vigilance = useMemo(() =>
    Object.values(latestByPt)
      .filter(a => ["inminente","alto","moderado"].includes(a.riskLevel))
      .sort((a,b) => ({ inminente:0, alto:1, moderado:2 }[a.riskLevel]??9) - ({ inminente:0, alto:1, moderado:2 }[b.riskLevel]??9)),
    [latestByPt]
  );

  const counts = useMemo(() => {
    const c = { inminente:0, alto:0, moderado:0 };
    vigilance.forEach(a => { if (c[a.riskLevel]!==undefined) c[a.riskLevel]++; });
    return c;
  }, [vigilance]);

  const totalEvaluated = Object.keys(latestByPt).length;

  return (
    <Card style={{ padding:22, borderTop:`2px solid ${T.err}18` }}>
      <WidgetHead
        title="Vigilancia Clínica"
        subtitle={totalEvaluated > 0 ? `${vigilance.length} de ${totalEvaluated} pacientes evaluados en seguimiento` : undefined}
        action={<SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />}
      />
      <RiskBar counts={counts} total={totalEvaluated} />
      {vigilance.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Sin vigilancia activa" desc="Todos los pacientes evaluados están en niveles seguros." />
      ) : (
        <div style={{ display:"flex", flexDirection:"column" }}>
          {vigilance.slice(0,5).map((a, i) => {
            const pt = patients.find(p => p.id === a.patientId);
            const rc = RISK_CONFIG[a.riskLevel] || {};
            return (
              <div key={a.id}>
                <div
                  onClick={() => onNavigate("risk")}
                  onMouseEnter={e => e.currentTarget.style.opacity="0.72"}
                  onMouseLeave={e => e.currentTarget.style.opacity="1"}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", cursor:"pointer", transition:"opacity 0.15s", animation:`d2-up 0.35s ease ${i*0.05}s both` }}
                >
                  <div style={{ width:34,height:34,borderRadius:"50%",flexShrink:0,background:rc.bg||T.cardAlt,border:`2px solid ${rc.color||T.bdr}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontFamily:T.fH, fontSize:14, color:rc.color||T.t }}>{pt?.name?.[0]||"?"}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {pt?.name?.split(" ").slice(0,2).join(" ")||"Paciente"}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:1 }}>
                      {fmtDate(a.date)}{a.safetyPlan?.warningSignals ? <span style={{ color:T.suc }}> · Plan activo</span> : <span style={{ color:T.war }}> · Sin plan</span>}
                    </div>
                  </div>
                  <Badge color={rc.color} bg={rc.bg}>{rc.label||a.riskLevel}</Badge>
                </div>
                {i < vigilance.slice(0,5).length-1 && <HR />}
              </div>
            );
          })}
          {vigilance.length > 5 && (
            <button onClick={() => onNavigate("risk")} style={{ background:"none",border:"none",cursor:"pointer",fontFamily:T.fB,fontSize:12,color:T.p,padding:"8px 0 0",textAlign:"center" }}>
              +{vigilance.length-5} más →
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIESGO DE ABANDONO — Días como número Cormorant grande
// ─────────────────────────────────────────────────────────────────────────────
function AbandonoWidget({ patients, sessions, onNavigate }) {
  const threshold21 = useMemo(() => {
    const d = new Date(todayDate); d.setDate(d.getDate()-21); return fmt(d);
  }, []);

  const lastSession = useMemo(() => {
    const m = {};
    sessions.forEach(s => { if (!m[s.patientId]||s.date>m[s.patientId]) m[s.patientId]=s.date; });
    return m;
  }, [sessions]);

  const daysSince = d => d ? Math.floor((new Date(todayDate)-new Date(d))/86400000) : null;

  const inactive = useMemo(() =>
    patients
      .filter(p => (p.status||"activo")==="activo")
      .map(p => ({ ...p, lastSession:lastSession[p.id]||null }))
      .filter(p => !p.lastSession || p.lastSession < threshold21)
      .sort((a,b) => a.lastSession ? b.lastSession ? a.lastSession.localeCompare(b.lastSession) : 1 : -1),
    [patients, lastSession, threshold21]
  );

  return (
    <Card style={{ padding:22 }}>
      <WidgetHead
        title="Riesgo de abandono"
        subtitle="Pacientes activos sin sesión en +21 días"
        action={
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {inactive.length > 0 && <Badge variant="warning" dot>{inactive.length}</Badge>}
            <SeeAll label="Pacientes" onClick={() => onNavigate("patients")} />
          </div>
        }
      />
      {inactive.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Actividad saludable" desc="Todos los pacientes activos tienen sesiones recientes." />
      ) : (
        <div style={{ display:"flex", flexDirection:"column" }}>
          {inactive.slice(0,5).map((p, i) => {
            const days   = daysSince(p.lastSession);
            const urgent = !p.lastSession || (days !== null && days > 45);
            return (
              <div key={p.id}>
                <div
                  onClick={() => onNavigate("patients")}
                  onMouseEnter={e => e.currentTarget.style.opacity="0.72"}
                  onMouseLeave={e => e.currentTarget.style.opacity="1"}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", cursor:"pointer", transition:"opacity 0.15s", animation:`d2-up 0.35s ease ${i*0.05}s both` }}
                >
                  <div style={{ width:34,height:34,borderRadius:"50%",background:urgent?`${T.war}18`:T.bdrL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontFamily:T.fH, fontSize:14, color:urgent?T.war:T.tm }}>{p.name?.[0]||"?"}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {p.name?.split(" ").slice(0,2).join(" ")||"Paciente"}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:1 }}>
                      {p.lastSession ? `Última: ${fmtDate(p.lastSession)}` : "Sin sesiones"}
                    </div>
                  </div>
                  {/* Días como número grande Cormorant */}
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:T.fH, fontSize:24, fontWeight:500, color:urgent?T.war:T.tl, lineHeight:1 }}>
                      {days !== null ? days : "—"}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl }}>días</div>
                  </div>
                </div>
                {i < inactive.slice(0,5).length-1 && <HR />}
              </div>
            );
          })}
          {inactive.length > 5 && (
            <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, textAlign:"center", margin:"8px 0 0" }}>
              +{inactive.length-5} pacientes más
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALUD FINANCIERA
// ─────────────────────────────────────────────────────────────────────────────
function PeriodFilter({ value, onChange }) {
  const opts = [{ id:"month",label:"Mes" },{ id:"quarter",label:"Trimestre" },{ id:"year",label:"Año" }];
  return (
    <div style={{ display:"flex", gap:2, background:T.cardAlt, borderRadius:9999, padding:"3px", border:`1px solid ${T.bdrL}` }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          padding:"5px 14px", borderRadius:9999, fontFamily:T.fB, fontSize:12, fontWeight:600,
          cursor:"pointer", transition:"all .18s ease", border:"none",
          background:value===o.id?T.card:"transparent", color:value===o.id?T.t:T.tl,
          boxShadow:value===o.id?`0 1px 4px rgba(26,43,40,0.08)`:"none",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:T.card,border:`1px solid ${T.bdr}`,borderRadius:12,padding:"10px 14px",fontFamily:T.fB,fontSize:12,boxShadow:`0 8px 28px rgba(26,43,40,0.14)` }}>
      <div style={{ fontFamily:T.fH,fontSize:15,color:T.t,marginBottom:8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",background:p.color,flexShrink:0 }} />
          <span style={{ color:T.tl }}>{p.name}:</span>
          <span style={{ fontWeight:700,color:T.t }}>{p.dataKey==="ingresos"?fmtCur(p.value):p.value}</span>
        </div>
      ))}
    </div>
  );
}

function FinKpi({ label, value, icon:Icon, color, bg, sub, tag, onClick, delay=0 }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ animation:`d2-up 0.4s ease ${delay}s both` }}
      onMouseEnter={() => onClick&&setH(true)} onMouseLeave={() => setH(false)}>
      <Card onClick={onClick} style={{
        padding:"18px 20px", cursor:onClick?"pointer":"default",
        borderLeft:`3px solid ${color}`,
        transform:h&&onClick?"translateY(-2px)":"none",
        boxShadow:h&&onClick?`0 10px 32px rgba(26,43,40,0.11)`:T.sh,
        transition:"box-shadow 0.22s ease, transform 0.2s ease",
      }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ width:30,height:30,borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon size={13} color={color} strokeWidth={1.8} />
            </div>
            <Label>{label}</Label>
          </div>
          {tag && <span style={{ padding:"2px 9px",borderRadius:9999,fontSize:10.5,fontWeight:700,fontFamily:T.fB,color,background:bg }}>{tag}</span>}
        </div>
        <div style={{ fontFamily:T.fH,fontSize:26,fontWeight:500,color:T.t,lineHeight:1,marginBottom:2,letterSpacing:"-0.02em" }}>{value}</div>
        {sub && <div style={{ fontFamily:T.fB,fontSize:11,color:T.tm,marginTop:4 }}>{sub}</div>}
      </Card>
    </div>
  );
}

function OpKpi({ label, value, icon:Icon, color, bg, onClick, delay=0 }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ animation:`d2-up 0.4s ease ${delay}s both` }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <Card onClick={onClick} style={{
        padding:"16px 18px", cursor:onClick?"pointer":"default",
        transform:h&&onClick?"translateY(-2px)":"none",
        boxShadow:h&&onClick?`0 10px 28px rgba(26,43,40,0.1)`:T.sh,
        transition:"box-shadow 0.22s ease, transform 0.2s ease",
        border:`1px solid ${h&&onClick?T.bdr:T.bdrL}`,
      }}>
        <div style={{ width:32,height:32,borderRadius:9,background:bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>
          <Icon size={13} color={color} strokeWidth={1.8} />
        </div>
        <div style={{ fontFamily:T.fH,fontSize:28,fontWeight:500,color:T.t,lineHeight:1,marginBottom:4,letterSpacing:"-0.02em" }}>{value}</div>
        <Label>{label}</Label>
      </Card>
    </div>
  );
}

function FinancialSection({ period, setPeriod, periodIncome, projectedIncome, avgTicket, periodSessions, pendingPay, pendingFut30, activeCount, todayAppts, pendingTasks, trendData, periodLabel, isMobile, onNavigate }) {
  return (
    <Anim anim="d2-up" delay={0.18} style={{ marginBottom:36 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <h2 style={{ fontFamily:T.fH,fontSize:isMobile?24:28,fontWeight:500,color:T.t,margin:0,letterSpacing:"-0.015em" }}>
          Salud Financiera
        </h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:10 }}>
        <FinKpi label="Ingresos" value={fmtCur(periodIncome)} icon={TrendingUp} color={CC.income} bg={`${CC.income}18`} sub={periodLabel} delay={0} onClick={() => onNavigate("finance")} />
        <FinKpi label="Proyección" value={fmtCur(projectedIncome)} icon={Zap} color={CC.sessions} bg={`${CC.sessions}15`} sub="próx. 30 días" tag={pendingFut30>0?`${pendingFut30} citas`:null} delay={0.04} />
        <FinKpi label="Ticket prom." value={avgTicket>0?fmtCur(avgTicket):"—"} icon={Target} color="#5B8DB8" bg="rgba(91,141,184,0.12)" sub={`${periodSessions.length} sesiones`} delay={0.08} />
        <FinKpi label="Pagos pend." value={pendingPay} icon={AlertCircle} color={T.war} bg={T.warA} sub={pendingPay>0?"sin confirmar":"al día ✓"} delay={0.12} onClick={() => onNavigate("finance")} />
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:12 }}>
        <OpKpi label="Pacientes activos" value={activeCount} icon={Users} color={T.p} bg={T.pA} delay={0} onClick={() => onNavigate("patients")} />
        <OpKpi label="Citas hoy" value={todayAppts.length} icon={Calendar} color={T.acc} bg={T.accA} delay={0.04} onClick={() => onNavigate("agenda")} />
        <OpKpi label="Sesiones período" value={periodSessions.length} icon={Activity} color={CC.sessions} bg={`${CC.sessions}15`} delay={0.08} onClick={() => onNavigate("sessions")} />
        <OpKpi label="Tareas pend." value={pendingTasks??"…"} icon={ClipboardList} color={T.p} bg={T.pA} delay={0.12} onClick={() => onNavigate("tasks")} />
      </div>
      <Card style={{ padding:"22px 20px 12px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
          <h3 style={{ fontFamily:T.fH,fontSize:19,fontWeight:500,color:T.t,margin:0,letterSpacing:"-0.01em" }}>
            Tendencia — 6 meses
          </h3>
          <div style={{ display:"flex",gap:14 }}>
            {[{color:CC.income,label:"Ingresos"},{color:CC.sessions,label:"Sesiones"}].map(l=>(
              <div key={l.label} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <div style={{ width:7,height:7,borderRadius:2,background:l.color }} />
                <span style={{ fontFamily:T.fB,fontSize:11,color:T.tl }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={isMobile?160:200}>
          <AreaChart data={trendData} margin={{ top:4,right:4,left:isMobile?-24:0,bottom:0 }}>
            <defs>
              <linearGradient id="gI2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CC.income}   stopOpacity={0.2}  />
                <stop offset="95%" stopColor={CC.income}   stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CC.sessions} stopOpacity={0.18} />
                <stop offset="95%" stopColor={CC.sessions} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.07)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontFamily:"DM Sans,sans-serif",fontSize:11,fill:"#999" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="income" orientation="left" tick={{ fontFamily:"DM Sans,sans-serif",fontSize:10,fill:"#999" }} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`} />
            <YAxis yAxisId="sessions" orientation="right" tick={{ fontFamily:"DM Sans,sans-serif",fontSize:10,fill:"#999" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke:"rgba(150,150,150,0.12)",strokeWidth:1 }} />
            <Area yAxisId="income"   type="monotone" dataKey="ingresos" name="Ingresos"  stroke={CC.income}   strokeWidth={2.2} fill="url(#gI2)" dot={{ r:3,fill:CC.income,   strokeWidth:0 }} activeDot={{ r:5 }} />
            <Area yAxisId="sessions" type="monotone" dataKey="sesiones" name="Sesiones" stroke={CC.sessions} strokeWidth={2}   fill="url(#gS2)" dot={{ r:3,fill:CC.sessions, strokeWidth:0 }} activeDot={{ r:5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </Anim>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESIONES RECIENTES
// ─────────────────────────────────────────────────────────────────────────────
function RecentWidget({ sessions: recent, onNavigate }) {
  return (
    <Card style={{ padding:22 }}>
      <WidgetHead title="Sesiones recientes" action={<SeeAll label="Ver todas" onClick={() => onNavigate("sessions")} />} />
      {recent.length === 0 ? (
        <EmptyState icon={FileText} title="Sin sesiones aún" desc="Las notas aparecerán aquí al registrar tu primera consulta." />
      ) : (
        <div style={{ display:"flex",flexDirection:"column" }}>
          {recent.map((s,i) => {
            const MI = moodIcon(s.mood);
            const ps = progressStyle(s.progress);
            return (
              <div key={s.id}>
                <div onClick={() => onNavigate("sessions")}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.72"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                  style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",cursor:"pointer",transition:"opacity 0.15s",animation:`d2-up 0.35s ease ${i*0.05}s both` }}>
                  <div style={{ width:30,height:30,borderRadius:8,background:T.cardAlt,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <MI size={14} color={moodColor(s.mood)} strokeWidth={1.7} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontFamily:T.fB,fontSize:13.5,fontWeight:500,color:T.t,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                      {s.patientName?.split(" ").slice(0,2).join(" ")}
                    </div>
                    <div style={{ fontFamily:T.fB,fontSize:11,color:T.tl }}>{fmtDate(s.date)}</div>
                  </div>
                  <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                </div>
                {i<recent.length-1 && <HR />}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDIENTES (consentimientos + follow-ups)
// ─────────────────────────────────────────────────────────────────────────────
function PendingWidget({ consentIssues, followUps, overdueFollowUps, patients, todayStr, onNavigate }) {
  const has = consentIssues.length>0||followUps.length>0||overdueFollowUps.length>0;
  if (!has) return null;
  return (
    <Card style={{ padding:22 }}>
      <WidgetHead title="Pendientes" />
      {consentIssues.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <Label color={T.war}>Consentimientos</Label>
            <SeeAll label="Ver" onClick={() => onNavigate("patients")} />
          </div>
          <div style={{ display:"flex",flexDirection:"column" }}>
            {consentIssues.slice(0,3).map((p,i) => {
              const cs=consentStatus(p);
              const color=cs==="expired"?T.err:cs==="expiring"?T.acc:T.war;
              const lbl=cs==="expired"?"Vencido":cs==="expiring"?"Por vencer":"Sin firmar";
              return (
                <div key={p.id}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0" }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:`${color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <span style={{ fontFamily:T.fH,fontSize:11,color }}>{p.name[0]}</span>
                    </div>
                    <span style={{ fontFamily:T.fB,fontSize:13,color:T.t,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                      {p.name.split(" ").slice(0,2).join(" ")}
                    </span>
                    <Badge color={color} bg={`${color}12`}>{lbl}</Badge>
                  </div>
                  {i<consentIssues.slice(0,3).length-1 && <HR />}
                </div>
              );
            })}
            {consentIssues.length>3 && <p style={{ fontFamily:T.fB,fontSize:11,color:T.tl,textAlign:"center",margin:"4px 0 0" }}>+{consentIssues.length-3} más</p>}
          </div>
        </div>
      )}
      {(overdueFollowUps.length>0||followUps.length>0) && (
        <div>
          {consentIssues.length>0 && <HR style={{ margin:"0 0 14px" }} />}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <Label color="#5B8DB8">Post-alta</Label>
            <SeeAll label="Ver" onClick={() => onNavigate("agenda")} />
          </div>
          <div style={{ display:"flex",flexDirection:"column" }}>
            {[...overdueFollowUps,...followUps].slice(0,4).map((a,i) => {
              const pt=patients.find(p=>p.id===a.patientId);
              const ov=a.date<todayStr;
              const color=ov?T.war:"#5B8DB8";
              return (
                <div key={a.id}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0" }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:`${color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <span style={{ fontFamily:T.fH,fontSize:11,color }}>{pt?.name?.[0]||"?"}</span>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontFamily:T.fB,fontSize:13,color:T.t,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                        {pt?.name?.split(" ").slice(0,2).join(" ")||"Paciente"}
                      </div>
                      <div style={{ fontFamily:T.fB,fontSize:10.5,color:T.tl }}>{fmtDate(a.date)}</div>
                    </div>
                    <Badge color={color} bg={`${color}12`}>{ov?"Vencido":"Próximo"}</Badge>
                  </div>
                  {i<[...overdueFollowUps,...followUps].slice(0,4).length-1 && <HR />}
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
// PROFILE SETUP BAR
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSetupBar({ profile={}, services=[], onNavigate, onQuickNav }) {
  const [open, setOpen] = useState(true);
  const TAB = { photo:"profile", cedula:"profile", services:"services", schedule:"horario" };
  const go  = key => { const t=TAB[key]||"profile"; onQuickNav?onQuickNav("settings",null,t):onNavigate("settings"); };
  const items = useMemo(() => [
    { key:"photo",    label:"Foto de perfil",            icon:Camera,        done:!!(profile?.photo||profile?.avatar) },
    { key:"cedula",   label:"Número de cédula",          icon:BadgeCheck,    done:!!(profile?.cedula) },
    { key:"services", label:"Al menos un servicio",      icon:Briefcase,     done:services.length>0 },
    { key:"schedule", label:"Horario de disponibilidad", icon:CalendarClock, done:!!(profile?.schedule?.workDays?.length>0) },
  ], [profile, services]);
  const done = items.filter(i=>i.done).length;
  if (done===items.length) return null;
  const pct = Math.round((done/items.length)*100);
  return (
    <Anim anim="d2-up" delay={0.06} style={{ marginBottom:24 }}>
      <div style={{ background:T.card,border:`1px solid ${T.bdrL}`,borderRadius:14,overflow:"hidden" }}>
        <button onClick={() => setOpen(v=>!v)} style={{ width:"100%",background:"none",border:"none",cursor:"pointer",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <ListChecks size={14} color={T.p} strokeWidth={1.8} />
            <span style={{ fontFamily:T.fB,fontSize:13,fontWeight:600,color:T.t }}>Completa tu perfil</span>
            <Badge variant="default">{done} de {items.length}</Badge>
          </div>
          {open?<ChevronUp size={14} color={T.tl} />:<ChevronDown size={14} color={T.tl} />}
        </button>
        <div style={{ padding:"0 16px",marginBottom:open?2:12 }}>
          <div style={{ height:3,borderRadius:9999,background:T.bdrL,overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:9999,width:`${pct}%`,background:T.p,transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)",animation:"d2-bar 0.6s ease 0.2s both" }} />
          </div>
        </div>
        {open && (
          <div style={{ padding:"4px 16px 14px" }}>
            {items.map(item => {
              const II = item.icon;
              return (
                <div key={item.key} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,background:item.done?T.sucA:T.cardAlt,border:`1px solid ${item.done?T.suc+"20":T.bdrL}`,marginBottom:5,opacity:item.done?0.65:1 }}>
                  <div style={{ width:26,height:26,borderRadius:7,flexShrink:0,background:item.done?`${T.suc}12`:T.pA,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {item.done?<CheckCircle2 size={12} color={T.suc} strokeWidth={2.2} />:<II size={12} color={T.p} strokeWidth={1.8} />}
                  </div>
                  <span style={{ flex:1,fontFamily:T.fB,fontSize:12.5,color:item.done?T.tl:T.t,textDecoration:item.done?"line-through":"none" }}>
                    {item.label}
                  </span>
                  {!item.done && <Btn variant="ghost" small onClick={() => go(item.key)} style={{ fontSize:11,padding:"3px 10px" }}>Configurar</Btn>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Anim>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME GUIDE
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    { num:1,title:"Registra tu primer paciente",desc:"Datos, historial y motivo de consulta.",icon:Users,   color:T.p,  bg:T.pA,  btn:"Nuevo paciente",mod:"patients" },
    { num:2,title:"Agenda su primera cita",      desc:"Programa la sesión en el calendario.", icon:Calendar,color:T.acc,bg:T.accA,btn:"Ir a Agenda",   mod:"agenda" },
    { num:3,title:"PsychoCore hace el resto",    desc:"Confirmación automática al paciente.", icon:FileText,color:T.suc,bg:T.sucA,btn:null,           mod:null },
  ];
  return (
    <Anim anim="d2-scale" delay={0.1}>
      <Card style={{ padding:"48px 36px 44px",textAlign:"center" }}>
        <div style={{ width:64,height:64,borderRadius:18,background:T.pA,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px" }}>
          <Sparkles size={28} color={T.p} strokeWidth={1.5} />
        </div>
        <h2 style={{ fontFamily:T.fH,fontSize:34,fontWeight:500,color:T.t,margin:"0 0 10px",letterSpacing:"-0.02em" }}>
          ¡Bienvenido a PsychoCore!
        </h2>
        <p style={{ fontFamily:T.fB,fontSize:14,color:T.tm,margin:"0 auto 36px",maxWidth:440,lineHeight:1.7 }}>
          Sigue estos tres pasos para comenzar a gestionar tu práctica clínica.
        </p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:28,textAlign:"left" }}>
          {steps.map((step,i) => {
            const SI = step.icon;
            return (
              <Anim key={step.num} anim="d2-up" delay={0.14+i*0.08}>
                <div style={{ background:T.cardAlt,border:`1px solid ${T.bdrL}`,borderRadius:14,padding:"20px 16px",display:"flex",flexDirection:"column",gap:10,position:"relative",overflow:"hidden",height:"100%" }}>
                  <div style={{ position:"absolute",top:-6,right:8,fontFamily:T.fH,fontSize:80,fontWeight:700,color:`${step.color}06`,lineHeight:1,userSelect:"none" }}>{step.num}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:34,height:34,borderRadius:9,background:step.bg,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${step.color}18` }}>
                      <SI size={15} color={step.color} strokeWidth={1.8} />
                    </div>
                    <Label color={step.color}>Paso {step.num}</Label>
                  </div>
                  <div>
                    <div style={{ fontFamily:T.fB,fontSize:13.5,fontWeight:700,color:T.t,marginBottom:4 }}>{step.title}</div>
                    <div style={{ fontFamily:T.fB,fontSize:12,color:T.tm,lineHeight:1.6 }}>{step.desc}</div>
                  </div>
                  {step.btn && <Btn variant="ghost" small onClick={() => onNavigate(step.mod)} style={{ alignSelf:"flex-start",marginTop:"auto",color:step.color,borderColor:`${step.color}38` }}>{step.btn}</Btn>}
                </div>
              </Anim>
            );
          })}
        </div>
        <p style={{ fontFamily:T.fB,fontSize:11.5,color:T.tl,margin:0 }}>
          Consulta esta guía en <strong style={{ color:T.tm }}>Configuración → Ayuda</strong>.
        </p>
      </Card>
    </Anim>
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

  const periodStart = useMemo(() => getPeriodStart(period), [period]);
  const isInPeriod  = d => d >= periodStart && d <= todayStr;

  const periodPayments = useMemo(() => payments.filter(p=>p.status==="pagado"&&isInPeriod(p.date)), [payments,periodStart,todayStr]);
  const periodIncome   = useMemo(() => periodPayments.reduce((s,p)=>s+Number(p.amount||0),0), [periodPayments]);
  const periodSessions = useMemo(() => sessions.filter(s=>isInPeriod(s.date)), [sessions,periodStart,todayStr]);
  const avgTicket      = periodSessions.length > 0 ? Math.round(periodIncome/periodSessions.length) : 0;

  const future30Str = useMemo(() => { const d=new Date(todayDate); d.setDate(d.getDate()+30); return fmt(d); }, []);
  const projectedIncome = useMemo(() => {
    const pending = appointments.filter(a=>a.status==="pendiente"&&a.date>todayStr&&a.date<=future30Str);
    return pending.length*(avgTicket||0);
  }, [appointments,todayStr,future30Str,avgTicket]);

  const pendingPay  = payments.filter(p=>p.status==="pendiente").length;
  const trendData   = useMemo(() =>
    getLast6Months().map(({key,label}) => ({
      label,
      ingresos: payments.filter(p=>p.status==="pagado"&&p.date.startsWith(key)).reduce((s,p)=>s+Number(p.amount||0),0),
      sesiones: sessions.filter(s=>s.date.startsWith(key)).length,
    })), [payments,sessions]);

  const todayAppts  = useMemo(() => appointments.filter(a=>a.date===todayStr).sort((a,b)=>(a.time||"").localeCompare(b.time||"")), [appointments,todayStr]);
  const pendingAppts= todayAppts.filter(a=>a.status!=="completada");

  const latestByPt  = useMemo(() => {
    const m={}; riskAssessments.forEach(a=>{ if(!m[a.patientId]||a.date>m[a.patientId].date) m[a.patientId]=a; }); return m;
  }, [riskAssessments]);
  const criticalAlerts = useMemo(() => Object.values(latestByPt).filter(a=>a.riskLevel==="alto"||a.riskLevel==="inminente"), [latestByPt]);

  const consentIssues = useMemo(() =>
    patients.filter(p=>(p.status||"activo")==="activo").filter(p=>{ const cs=consentStatus(p); return cs==="pending"||cs==="expired"||cs==="expiring"; }),
    [patients]
  );

  const upcoming14 = new Date(todayDate); upcoming14.setDate(upcoming14.getDate()+14);
  const followUps  = useMemo(() => appointments.filter(a=>a.type==="Seguimiento post-alta"&&a.status==="pendiente"&&a.date>=todayStr&&a.date<=fmt(upcoming14)), [appointments,todayStr]);
  const overdueFollowUps = useMemo(() => appointments.filter(a=>a.type==="Seguimiento post-alta"&&a.status==="pendiente"&&a.date<todayStr), [appointments,todayStr]);

  const recentSess  = useMemo(() => [...sessions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6), [sessions]);
  const activeCount = patients.filter(p=>(p.status||"activo")==="activo").length;

  const currentMonthKey = useMemo(() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; },[]);
  const pendingBalanceData = useMemo(() => {
    const pending = payments.filter(p=>p.status==="pendiente"&&(p.date?p.date.startsWith(currentMonthKey):true));
    const total   = pending.reduce((s,p)=>s+Number(p.amount||0),0);
    const ids     = [...new Set(pending.map(p=>p.patientId).filter(Boolean))];
    const noId    = pending.filter(p=>!p.patientId).length;
    const count   = Math.max(ids.length+(noId>0?1:0),pending.length>0?1:0);
    return { count,total,hasPending:pending.length>0 };
  },[payments,currentMonthKey]);

  const periodLabel  = period==="month"?"este mes":period==="quarter"?"este trimestre":"este año";
  const pendingFut30 = appointments.filter(a=>a.status==="pendiente"&&a.date>todayStr&&a.date<=future30Str).length;
  const hasSecondary = consentIssues.length>0||followUps.length>0||overdueFollowUps.length>0;

  return (
    <div style={{ maxWidth:1200 }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <DashHeader isMobile={isMobile} criticalAlerts={criticalAlerts} todayAppts={todayAppts} />

      {/* ══ TODAY STRIP — Snapshot del día en una sola banda ════════════════ */}
      <TodayStrip
        todayAppts={todayAppts}
        activeCount={activeCount}
        criticalAlerts={criticalAlerts}
        pendingTasks={pendingTasks}
        periodIncome={periodIncome}
        isMobile={isMobile}
      />

      {/* ══ ALERTAS URGENTES ════════════════════════════════════════════════ */}
      <CriticalBand criticalAlerts={criticalAlerts} patients={patients} onNavigate={onNavigate} />
      {pendingBalanceData.hasPending && (
        <BalanceBand count={pendingBalanceData.count} total={pendingBalanceData.total} onNavigate={onNavigate} />
      )}

      {/* ══ QUICK ACTIONS ═══════════════════════════════════════════════════ */}
      <QuickBar onQuickNav={onQuickNav} onNewSession={onNewSession} isMobile={isMobile} />

      {/* ══ PERFIL ══════════════════════════════════════════════════════════ */}
      <ProfileSetupBar profile={profile} services={services} onNavigate={onNavigate} onQuickNav={onQuickNav} />

      {/* ══ ESTADO VACÍO ════════════════════════════════════════════════════ */}
      {patients.length === 0 ? (
        <WelcomeGuide onNavigate={onNavigate} />
      ) : (
        <>
          {/* ══ AGENDA ════════════════════════════════════════════════════ */}
          <AgendaWidget
            todayAppts={todayAppts}
            pendingAppts={pendingAppts}
            onNavigate={onNavigate}
            onStartSession={onStartSession}
            isMobile={isMobile}
          />

          {/* ══ VIGILANCIA: Riesgo + Abandono ═════════════════════════════ */}
          <Anim anim="d2-up" delay={0.14} style={{ marginBottom:32 }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:18 }}>
              <RiskWidget patients={patients} riskAssessments={riskAssessments} onNavigate={onNavigate} />
              <AbandonoWidget patients={patients} sessions={sessions} onNavigate={onNavigate} />
            </div>
          </Anim>

          {/* ══ FINANZAS ══════════════════════════════════════════════════ */}
          <FinancialSection
            period={period} setPeriod={setPeriod}
            periodIncome={periodIncome} projectedIncome={projectedIncome}
            avgTicket={avgTicket} periodSessions={periodSessions}
            pendingPay={pendingPay} pendingFut30={pendingFut30}
            activeCount={activeCount} todayAppts={todayAppts}
            pendingTasks={pendingTasks} trendData={trendData}
            periodLabel={periodLabel} isMobile={isMobile}
            onNavigate={onNavigate}
          />

          {/* ══ HISTORIAL + PENDIENTES ════════════════════════════════════ */}
          <Anim anim="d2-up" delay={0.22}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":hasSecondary?"1fr 1fr":"1fr", gap:18 }}>
              <RecentWidget sessions={recentSess} onNavigate={onNavigate} />
              {hasSecondary && (
                <PendingWidget
                  consentIssues={consentIssues} followUps={followUps}
                  overdueFollowUps={overdueFollowUps} patients={patients}
                  todayStr={todayStr} onNavigate={onNavigate}
                />
              )}
            </div>
          </Anim>
        </>
      )}
    </div>
  );
}
