// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — "¿Qué hago ahora?" / PsychoCore                            ║
// ║  4 secciones: Hoy · Atención requerida · Mi práctica · Acceso rápido        ║
// ║  Diseñado para práctica privada solo, 3 momentos de uso distintos           ║
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
  Users, Calendar, Clock, FileText, ChevronRight,
  ShieldAlert, DollarSign, CheckCircle2, AlertCircle,
  ArrowRight, Sparkles, ListChecks, Camera, BadgeCheck,
  Briefcase, CalendarClock, ChevronDown, ChevronUp,
  UserX, ClipboardList, TrendingUp,
} from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus } from "./Consent.jsx";

// ── Keyframes — inyección única ───────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_dash_op_styles__) {
  window.__pc_dash_op_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes op-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes op-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes op-bar { from { width: 0%; } }
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

function daysBetween(dateStrA, dateStrB) {
  return Math.floor((new Date(dateStrB) - new Date(dateStrA)) / 86400000);
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
function FadeUp({ children, delay = 0, style: sx = {} }) {
  return (
    <div style={{ animation: `op-up 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}s both`, ...sx }}>
      {children}
    </div>
  );
}

function SeeAll({ label = "Ver todo", onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "none", border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 3,
        fontFamily: T.fB, fontSize: 12, fontWeight: 600, padding: 0,
        color: hov ? T.p : T.tl, transition: "color 0.15s ease", flexShrink: 0,
      }}
    >
      {label} <ChevronRight size={12} strokeWidth={2.5} />
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.bdrL }} />;
}

function SectionHead({ title, subtitle, action, delay = 0 }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 16, gap: 8, animation: `op-up 0.35s ease ${delay}s both`,
      }}
    >
      <div>
        <h2 style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────────────────────
function DashboardHeader({ todayAppts, urgentCount, isMobile }) {
  return (
    <FadeUp delay={0} style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: T.fH, fontSize: isMobile ? 30 : 38, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.022em", lineHeight: 1.1 }}>
            {greeting()} 🌿
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>
              {todayDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            {todayAppts.length > 0 && (
              <Badge variant="default" dot>{todayAppts.length} cita{todayAppts.length > 1 ? "s" : ""} hoy</Badge>
            )}
            {urgentCount > 0 && (
              <Badge variant="error" dot>{urgentCount} requiere{urgentCount > 1 ? "n" : ""} atención</Badge>
            )}
          </div>
        </div>
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 1 — HOY
// ─────────────────────────────────────────────────────────────────────────────
function ApptRow({ appt, onStart, isLast }) {
  const done = appt.status === "completada";
  const [hov, setHov] = useState(false);
  return (
    <>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", opacity: done ? 0.55 : 1, transition: "opacity 0.15s ease" }}
      >
        <div style={{ width: 52, flexShrink: 0, textAlign: "center" }}>
          <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: done ? T.tl : T.p, letterSpacing: "0.01em" }}>
            {appt.time || "—"}
          </span>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: done ? T.suc : hov ? T.p : T.bdr, transition: "background 0.15s ease" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {appt.patientName?.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, marginTop: 1 }}>{appt.type}</div>
        </div>
        {done ? (
          <Badge variant="success">✓</Badge>
        ) : (
          <Btn variant="ghost" small onClick={() => onStart(appt)} style={{ fontSize: 12, padding: "5px 12px", gap: 4, opacity: hov ? 1 : 0.65, transition: "opacity 0.15s ease" }}>
            <FileText size={11} strokeWidth={2} /> Sesión
          </Btn>
        )}
      </div>
      {!isLast && <Divider />}
    </>
  );
}

function TodaySection({ todayAppts, nextAppt, onNavigate, onStartSession, isMobile }) {
  const pendingCount = todayAppts.filter(a => a.status !== "completada").length;
  return (
    <FadeUp delay={0.06} style={{ marginBottom: 16 }}>
      <Card style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <h2 style={{ fontFamily: T.fH, fontSize: isMobile ? 22 : 26, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.015em" }}>Hoy</h2>
            {pendingCount > 0 && <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, margin: "3px 0 0" }}>{pendingCount} pendiente{pendingCount > 1 ? "s" : ""} de documentar</p>}
          </div>
          <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
        </div>

        {todayAppts.length === 0 ? (
          <div style={{ paddingTop: 14 }}>
            {nextAppt ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: T.cardAlt, border: `1px solid ${T.bdrL}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.pA, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar size={14} color={T.p} strokeWidth={1.8} />
                  <span style={{ fontFamily: T.fB, fontSize: 8.5, fontWeight: 700, color: T.p, marginTop: 1 }}>
                    {new Date(nextAppt.date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short" }).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, margin: "0 0 2px" }}>Sin citas hoy · Próxima cita</p>
                  <p style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {nextAppt.patientName?.split(" ").slice(0, 2).join(" ")} — {fmtDate(nextAppt.date)}{nextAppt.time ? ` a las ${nextAppt.time}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState icon={Calendar} title="Sin citas hoy" desc="No hay consultas programadas." action={{ label: "Agendar cita", onClick: () => onNavigate("agenda") }} />
            )}
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {todayAppts.map((a, idx) => (
              <ApptRow key={a.id} appt={a} onStart={onStartSession} isLast={idx === todayAppts.length - 1} />
            ))}
          </div>
        )}
      </Card>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 2 — ATENCIÓN REQUERIDA
// Ausentes + Riesgo + Seguimientos en un solo panel
// ─────────────────────────────────────────────────────────────────────────────
function AttentionRow({ avatar, name, meta, badge, badgeColor, badgeBg, badgeVariant, onClick, isLast, urgency }) {
  const [hov, setHov] = useState(false);
  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", cursor: onClick ? "pointer" : "default", opacity: hov && onClick ? 0.72 : 1, transition: "opacity 0.15s ease" }}
      >
        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: urgency ? `${T.war}18` : T.cardAlt, border: `1.5px solid ${urgency ? T.war + "35" : T.bdrL}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: T.fH, fontSize: 13, color: urgency ? T.war : T.tm }}>{avatar}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 1 }}>{meta}</div>
        </div>
        {badge && (badgeVariant
          ? <Badge variant={badgeVariant}>{badge}</Badge>
          : <Badge color={badgeColor} bg={badgeBg}>{badge}</Badge>
        )}
      </div>
      {!isLast && <Divider />}
    </>
  );
}

function AttentionBlock({ label, color, icon: Icon, items, children }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon size={11} color={color} strokeWidth={2.4} />
        <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <Badge color={color} bg={`${color}15`}>{items.length}</Badge>
      </div>
      {children}
    </div>
  );
}

function AttentionSection({ patients, sessions, riskAssessments, appointments, todayStr, onNavigate, isMobile }) {
  const threshold21 = useMemo(() => { const d = new Date(todayDate); d.setDate(d.getDate() - 21); return fmt(d); }, []);

  const lastSessionByPt = useMemo(() => {
    const m = {};
    sessions.forEach(s => { if (!m[s.patientId] || s.date > m[s.patientId]) m[s.patientId] = s.date; });
    return m;
  }, [sessions]);

  const absentPatients = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .map(p => ({ ...p, lastSession: lastSessionByPt[p.id] || null }))
      .filter(p => !p.lastSession || p.lastSession < threshold21)
      .sort((a, b) => { if (!a.lastSession) return -1; if (!b.lastSession) return 1; return a.lastSession.localeCompare(b.lastSession); })
      .slice(0, 4),
    [patients, lastSessionByPt, threshold21]
  );

  const latestByPt = useMemo(() => {
    const m = {};
    riskAssessments.forEach(a => { if (!m[a.patientId] || a.date > m[a.patientId].date) m[a.patientId] = a; });
    return m;
  }, [riskAssessments]);

  const riskItems = useMemo(() =>
    Object.values(latestByPt)
      .filter(a => a.riskLevel === "alto" || a.riskLevel === "inminente")
      .sort((a, b) => (a.riskLevel === "inminente" ? -1 : 1))
      .slice(0, 3),
    [latestByPt]
  );

  const upcoming14 = useMemo(() => { const d = new Date(todayDate); d.setDate(d.getDate() + 14); return fmt(d); }, []);

  const followUpItems = useMemo(() =>
    appointments
      .filter(a => a.type === "Seguimiento post-alta" && a.status === "pendiente" && a.date <= upcoming14)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3),
    [appointments, upcoming14]
  );

  const totalUrgent = absentPatients.length + riskItems.length + followUpItems.length;

  if (totalUrgent === 0) {
    return (
      <FadeUp delay={0.1} style={{ marginBottom: 16 }}>
        <Card style={{ padding: "20px 24px" }}>
          <SectionHead title="Atención requerida" />
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: T.sucA, border: `1px solid ${T.suc}22` }}>
            <CheckCircle2 size={20} color={T.suc} strokeWidth={1.8} />
            <div>
              <p style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, margin: 0 }}>Todo en orden</p>
              <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, margin: "2px 0 0" }}>Sin ausentes, sin riesgo activo, sin seguimientos vencidos.</p>
            </div>
          </div>
        </Card>
      </FadeUp>
    );
  }

  return (
    <FadeUp delay={0.1} style={{ marginBottom: 16 }}>
      <Card style={{ padding: "20px 24px" }}>
        <SectionHead
          title="Atención requerida"
          subtitle={`${totalUrgent} situacion${totalUrgent > 1 ? "es" : ""} pendientes`}
          action={riskItems.length > 0 ? <SeeAll label="Evaluaciones" onClick={() => onNavigate("risk")} /> : undefined}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <AttentionBlock label="Sin sesión reciente" color={T.war} icon={UserX} items={absentPatients}>
            {absentPatients.map((p, idx) => {
              const days = p.lastSession ? daysBetween(p.lastSession, todayStr) : null;
              const urgent = days === null || days > 45;
              return (
                <AttentionRow key={p.id} avatar={p.name?.[0] || "?"} name={p.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  meta={p.lastSession ? `Última sesión: ${fmtDate(p.lastSession)}` : "Sin sesiones registradas"}
                  badge={days !== null ? `${days}d` : "Nuevo"} badgeColor={urgent ? T.war : T.tl} badgeBg={urgent ? T.warA : T.bdrL}
                  urgency={urgent} onClick={() => onNavigate("patients")} isLast={idx === absentPatients.length - 1}
                />
              );
            })}
          </AttentionBlock>

          {absentPatients.length > 0 && riskItems.length > 0 && <Divider />}

          <AttentionBlock label="Riesgo clínico" color={T.err} icon={ShieldAlert} items={riskItems}>
            {riskItems.map((a, idx) => {
              const pt = patients.find(p => p.id === a.patientId);
              const rc = RISK_CONFIG[a.riskLevel] || {};
              return (
                <AttentionRow key={a.id} avatar={pt?.name?.[0] || "?"} name={pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  meta={`Evaluado: ${fmtDate(a.date)} · ${a.safetyPlan?.warningSignals ? "Con plan de seguridad" : "Sin plan de seguridad"}`}
                  badge={rc.label || a.riskLevel} badgeColor={rc.color} badgeBg={rc.bg}
                  urgency={a.riskLevel === "inminente"} onClick={() => onNavigate("risk")} isLast={idx === riskItems.length - 1}
                />
              );
            })}
          </AttentionBlock>

          {(riskItems.length > 0 || absentPatients.length > 0) && followUpItems.length > 0 && <Divider />}

          <AttentionBlock label="Seguimiento post-alta" color="#5B8DB8" icon={ClipboardList} items={followUpItems}>
            {followUpItems.map((a, idx) => {
              const pt = patients.find(p => p.id === a.patientId);
              const overdue = a.date < todayStr;
              const color = overdue ? T.war : "#5B8DB8";
              return (
                <AttentionRow key={a.id} avatar={pt?.name?.[0] || "?"} name={pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}
                  meta={overdue ? `Vencido desde ${fmtDate(a.date)}` : `Programado ${fmtDate(a.date)}`}
                  badge={overdue ? "Vencido" : "Próximo"} badgeColor={color} badgeBg={`${color}15`}
                  urgency={overdue} onClick={() => onNavigate("agenda")} isLast={idx === followUpItems.length - 1}
                />
              );
            })}
          </AttentionBlock>

        </div>
      </Card>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 3 — MI PRÁCTICA
// ─────────────────────────────────────────────────────────────────────────────
function StatTile({ label, value, icon: Icon, color, bg, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ padding: "12px 14px", borderRadius: 12, background: hov ? bg : T.cardAlt, border: `1px solid ${hov ? color + "28" : T.bdrL}`, cursor: "pointer", transition: "all 0.18s ease" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon size={12} color={color} strokeWidth={1.9} />
        <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function PracticeSection({ patients, payments, sessions, appointments, pendingTasks, onNavigate, isMobile }) {
  const currentMonthKey = useMemo(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; }, []);

  const monthIncome = useMemo(() =>
    payments.filter(p => p.status === "pagado" && p.date?.startsWith(currentMonthKey)).reduce((s, p) => s + Number(p.amount || 0), 0),
    [payments, currentMonthKey]
  );

  const historicAvg = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const total = payments.filter(p => p.status === "pagado" && months.some(k => p.date?.startsWith(k))).reduce((s, p) => s + Number(p.amount || 0), 0);
    return Math.round(total / 6);
  }, [payments]);

  const incomeVsAvg = historicAvg > 0 ? Math.round(((monthIncome - historicAvg) / historicAvg) * 100) : null;
  const activeCount = patients.filter(p => (p.status || "activo") === "activo").length;
  const pendingPayCount = payments.filter(p => p.status === "pendiente").length;
  const consentIssues = useMemo(() =>
    patients.filter(p => (p.status || "activo") === "activo").filter(p => { const cs = consentStatus(p); return cs === "pending" || cs === "expired" || cs === "expiring"; }).length,
    [patients]
  );

  return (
    <FadeUp delay={0.14} style={{ marginBottom: 16 }}>
      <Card style={{ padding: "20px 24px" }}>
        <SectionHead title="Mi práctica" action={<SeeAll label="Ver finanzas" onClick={() => onNavigate("finance")} />} />

        {/* Ingreso del mes — número principal */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, paddingBottom: 18, borderBottom: `1px solid ${T.bdrL}`, marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: T.fB, fontSize: 10.5, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
              Ingresos este mes
            </p>
            <div style={{ fontFamily: T.fH, fontSize: isMobile ? 38 : 46, fontWeight: 500, color: T.t, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {fmtCur(monthIncome)}
            </div>
          </div>
          {incomeVsAvg !== null && (
            <div style={{ paddingBottom: 4 }}>
              <Badge variant={incomeVsAvg >= 0 ? "success" : "warning"} dot>
                {incomeVsAvg >= 0 ? "+" : ""}{incomeVsAvg}% vs promedio
              </Badge>
            </div>
          )}
        </div>

        {/* Stats secundarios */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
          <StatTile label="Pacientes activos" value={activeCount} icon={Users} color={T.p} bg={T.pA} onClick={() => onNavigate("patients")} />
          <StatTile label="Pagos pendientes" value={pendingPayCount} icon={AlertCircle} color={pendingPayCount > 0 ? T.war : T.suc} bg={pendingPayCount > 0 ? T.warA : T.sucA} onClick={() => onNavigate("finance")} />
          <StatTile label="Consentimientos" value={consentIssues} icon={FileText} color={consentIssues > 0 ? T.war : T.suc} bg={consentIssues > 0 ? T.warA : T.sucA} onClick={() => onNavigate("patients")} />
          <StatTile label="Tareas pend." value={pendingTasks ?? "…"} icon={ClipboardList} color={T.p} bg={T.pA} onClick={() => onNavigate("tasks")} />
        </div>
      </Card>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 4 — ACCESO RÁPIDO (3 acciones, sin sectionhead)
// ─────────────────────────────────────────────────────────────────────────────
function QuickBar({ onQuickNav, onNewSession, isMobile }) {
  const actions = [
    { label: "Nueva nota clínica", icon: FileText,   color: T.suc, bg: T.sucA, handler: onNewSession, module: "sessions" },
    { label: "Agendar cita",       icon: Calendar,   color: T.p,   bg: T.pA,   handler: null,         module: "agenda" },
    { label: "Registrar pago",     icon: DollarSign, color: T.war, bg: T.warA, handler: null,         module: "finance" },
  ];
  return (
    <FadeUp delay={0.2}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 8 }}>
        {actions.map((a, idx) => {
          const [hov, setHov] = useState(false);
          const ActionIcon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => a.handler ? a.handler() : onQuickNav(a.module, "add")}
              onMouseEnter={() => setHov(true)}
              onMouseLeave={() => setHov(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
                border: `1.5px solid ${hov ? a.color + "40" : T.bdrL}`, background: hov ? a.bg : T.card,
                cursor: "pointer", transition: "all .18s ease", fontFamily: T.fB, textAlign: "left",
                transform: hov ? "translateY(-1px)" : "none", boxShadow: hov ? `0 4px 14px rgba(26,43,40,0.07)` : "none",
                animation: `op-up 0.38s ease ${idx * 0.04}s both`,
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: a.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s ease", transform: hov ? "scale(1.07)" : "scale(1)" }}>
                <ActionIcon size={15} color={a.color} strokeWidth={1.7} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: hov ? T.t : T.tm }}>{a.label}</span>
            </button>
          );
        })}
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SETUP — Colapsado por defecto
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSetupBar({ profile = {}, services = [], onNavigate, onQuickNav }) {
  const [open, setOpen] = useState(false);
  const ITEM_TAB = { photo: "profile", cedula: "profile", services: "services", schedule: "horario" };
  const handleConfigure = (key) => {
    const tab = ITEM_TAB[key] || "profile";
    if (onQuickNav) onQuickNav("settings", null, tab); else onNavigate("settings");
  };
  const items = useMemo(() => [
    { key: "photo",    label: "Foto de perfil",            icon: Camera,        done: !!(profile?.photo || profile?.avatar) },
    { key: "cedula",   label: "Número de cédula",          icon: BadgeCheck,    done: !!(profile?.cedula) },
    { key: "services", label: "Al menos un servicio",      icon: Briefcase,     done: services.length > 0 },
    { key: "schedule", label: "Horario de disponibilidad", icon: CalendarClock, done: !!(profile?.schedule?.workDays?.length > 0) },
  ], [profile, services]);
  const completed = items.filter(i => i.done).length;
  const total = items.length;
  if (completed === total) return null;
  const pct = Math.round((completed / total) * 100);

  return (
    <FadeUp delay={0.03} style={{ marginBottom: 16 }}>
      <div style={{ background: T.card, border: `1px solid ${T.bdrL}`, borderRadius: 12, overflow: "hidden" }}>
        <button onClick={() => setOpen(v => !v)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ListChecks size={13} color={T.p} strokeWidth={1.8} />
            <span style={{ fontFamily: T.fB, fontSize: 12.5, fontWeight: 600, color: T.tm }}>Completa tu perfil</span>
            <Badge variant="default">{completed}/{total}</Badge>
          </div>
          {open ? <ChevronUp size={13} color={T.tl} /> : <ChevronDown size={13} color={T.tl} />}
        </button>
        <div style={{ padding: "0 16px", marginBottom: open ? 2 : 10 }}>
          <div style={{ height: 3, borderRadius: 9999, background: T.bdrL, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 9999, width: `${pct}%`, background: T.p, transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)", animation: "op-bar 0.6s ease 0.2s both" }} />
          </div>
        </div>
        {open && (
          <div style={{ padding: "4px 16px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map(item => {
              const ItemIcon = item.icon;
              return (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: item.done ? T.sucA : T.cardAlt, border: `1px solid ${item.done ? T.suc + "22" : T.bdrL}`, opacity: item.done ? 0.65 : 1 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: item.done ? `${T.suc}12` : T.pA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.done ? <CheckCircle2 size={11} color={T.suc} strokeWidth={2.2} /> : <ItemIcon size={11} color={T.p} strokeWidth={1.8} />}
                  </div>
                  <span style={{ flex: 1, fontFamily: T.fB, fontSize: 12.5, color: item.done ? T.tl : T.t, textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                  {!item.done && <Btn variant="ghost" small onClick={() => handleConfigure(item.key)} style={{ fontSize: 11, padding: "3px 10px" }}>Configurar</Btn>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME GUIDE
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    { num: 1, title: "Registra tu primer paciente", desc: "Agrega sus datos, historial y motivo de consulta.", icon: Users, color: T.p, bg: T.pA, btnLabel: "Nuevo paciente", module: "patients" },
    { num: 2, title: "Agenda su primera cita", desc: "Programa la sesión inicial en el calendario.", icon: Calendar, color: T.acc, bg: T.accA, btnLabel: "Ir a Agenda", module: "agenda" },
    { num: 3, title: "Mensaje de bienvenida", desc: "PsychoCore enviará la confirmación automáticamente.", icon: FileText, color: T.suc, bg: T.sucA, btnLabel: null, module: null },
  ];
  return (
    <FadeUp delay={0.1}>
      <Card style={{ padding: "40px 32px 36px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: T.pA, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Sparkles size={26} color={T.p} strokeWidth={1.5} />
        </div>
        <h2 style={{ fontFamily: T.fH, fontSize: 30, fontWeight: 500, color: T.t, margin: "0 0 8px", letterSpacing: "-0.02em" }}>¡Bienvenido a PsychoCore!</h2>
        <p style={{ fontFamily: T.fB, fontSize: 14, color: T.tm, margin: "0 auto 28px", maxWidth: 420, lineHeight: 1.7 }}>Sigue estos pasos para comenzar a gestionar tu práctica clínica.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, textAlign: "left" }}>
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <FadeUp key={step.num} delay={0.12 + idx * 0.07}>
                <div style={{ background: T.cardAlt, border: `1.5px solid ${T.bdrL}`, borderRadius: 14, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden", height: "100%" }}>
                  <div style={{ position: "absolute", top: -8, right: 8, fontFamily: T.fH, fontSize: 80, fontWeight: 700, color: `${step.color}07`, lineHeight: 1, userSelect: "none" }}>{step.num}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: step.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${step.color}20` }}>
                      <StepIcon size={15} color={step.color} strokeWidth={1.8} />
                    </div>
                    <span style={{ fontFamily: T.fB, fontSize: 9.5, fontWeight: 800, color: step.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>Paso {step.num}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 700, color: T.t, margin: "0 0 4px" }}>{step.title}</p>
                    <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                  </div>
                  {step.btnLabel && <Btn variant="ghost" small onClick={() => onNavigate(step.module)} style={{ alignSelf: "flex-start", marginTop: "auto", color: step.color, borderColor: `${step.color}40` }}>{step.btnLabel}</Btn>}
                </div>
              </FadeUp>
            );
          })}
        </div>
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

  const todayAppts = useMemo(() =>
    appointments.filter(a => a.date === todayStr).sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [appointments, todayStr]
  );

  const nextAppt = useMemo(() => {
    if (todayAppts.length > 0) return null;
    return appointments.filter(a => a.date > todayStr && a.status === "pendiente")
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))[0] || null;
  }, [appointments, todayStr, todayAppts]);

  const urgentCount = useMemo(() => {
    const latestByPt = {};
    riskAssessments.forEach(a => { if (!latestByPt[a.patientId] || a.date > latestByPt[a.patientId].date) latestByPt[a.patientId] = a; });
    const riskCount = Object.values(latestByPt).filter(a => a.riskLevel === "alto" || a.riskLevel === "inminente").length;
    const threshold21 = (() => { const d = new Date(todayDate); d.setDate(d.getDate() - 21); return fmt(d); })();
    const lastSessionByPt = {};
    sessions.forEach(s => { if (!lastSessionByPt[s.patientId] || s.date > lastSessionByPt[s.patientId]) lastSessionByPt[s.patientId] = s.date; });
    const absentCount = patients.filter(p => (p.status || "activo") === "activo").filter(p => { const last = lastSessionByPt[p.id]; return !last || last < threshold21; }).length;
    return riskCount + absentCount;
  }, [riskAssessments, sessions, patients]);

  return (
    <div style={{ maxWidth: 860 }}>

      <DashboardHeader todayAppts={todayAppts} urgentCount={urgentCount} isMobile={isMobile} />

      <ProfileSetupBar profile={profile} services={services} onNavigate={onNavigate} onQuickNav={onQuickNav} />

      {patients.length === 0 ? (
        <WelcomeGuide onNavigate={onNavigate} />
      ) : (
        <>
          {/* 1 — Hoy */}
          <TodaySection todayAppts={todayAppts} nextAppt={nextAppt} onNavigate={onNavigate} onStartSession={onStartSession} isMobile={isMobile} />

          {/* 2 — Atención requerida */}
          <AttentionSection patients={patients} sessions={sessions} riskAssessments={riskAssessments} appointments={appointments} todayStr={todayStr} onNavigate={onNavigate} isMobile={isMobile} />

          {/* 3 — Mi práctica */}
          <PracticeSection patients={patients} payments={payments} sessions={sessions} appointments={appointments} pendingTasks={pendingTasks} onNavigate={onNavigate} isMobile={isMobile} />

          {/* 4 — Acceso rápido */}
          <QuickBar onQuickNav={onQuickNav} onNewSession={onNewSession} isMobile={isMobile} />
        </>
      )}
    </div>
  );
}
