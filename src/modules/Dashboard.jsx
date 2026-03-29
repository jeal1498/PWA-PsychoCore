// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — "Asistente de Preparación" / PsychoCore                    ║
// ║  Rediseño: Minimalismo cálido · Jerarquía clínica · Cero fatiga cognitiva   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect } from "react";
import { T, MONTHS_ES, DAYS_ES } from "../theme.js";
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
  UserX, ClipboardList, TrendingUp, Wifi, Play,
  AlertTriangle, FileSignature, NotebookPen,
} from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus, CONSENT_STATUS_CONFIG } from "./Consent.jsx";

// ── Keyframes ─────────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_dash_op_styles__) {
  window.__pc_dash_op_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes op-up {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes op-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes op-bar { from { width: 0%; } }
    @keyframes dash-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(78,139,95,0); }
      50%       { box-shadow: 0 0 0 5px rgba(78,139,95,0.12); }
    }
    @keyframes risk-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(184,80,80,0); }
      50%       { box-shadow: 0 0 0 6px rgba(184,80,80,0.15); }
    }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buen día";
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
    <div style={{ animation: `op-up 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}s both`, ...sx }}>
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
  return <div style={{ height: 1, background: T.bdrL, margin: "0 0" }} />;
}

function SectionLabel({ text, icon: Icon, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
      {Icon && <Icon size={11} color={color || T.tl} strokeWidth={2.2} />}
      <span style={{
        fontFamily: T.fB, fontSize: 10, fontWeight: 800,
        color: color || T.tl, textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {text}
      </span>
    </div>
  );
}

function Avatar({ name, size = 36, color = T.p, bg = T.pA }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: bg, border: `1.5px solid ${color}22`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontFamily: T.fH, fontSize: size * 0.38, fontWeight: 600, color, lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 0 — WELCOME BANNER
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeBanner({ todayAppts, urgentCount, profile, isMobile }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
  });
  // Capitalize first letter
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const displayName = profile?.name
    ? `Psic. ${profile.name.split(" ")[0]}`
    : "Psicólogo/a";
  const allSync = urgentCount === 0;

  return (
    <FadeUp delay={0} style={{ marginBottom: isMobile ? 20 : 24 }}>
      <div style={{
        borderRadius: isMobile ? 16 : 20,
        background: `linear-gradient(135deg, ${T.pA} 0%, ${T.card} 60%, ${T.accA} 100%)`,
        border: `1px solid ${T.bdrL}`,
        padding: isMobile ? "18px 20px" : "22px 28px",
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        flexDirection: isMobile ? "column" : "row",
      }}>
        {/* Left: greeting + date */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{
              fontFamily: T.fH,
              fontSize: isMobile ? 26 : 32,
              fontWeight: 500,
              color: T.t,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}>
              {greeting()}, {displayName}
            </h1>
          </div>
          <p style={{
            fontFamily: T.fB, fontSize: 13, color: T.tm,
            margin: 0, letterSpacing: "0.005em",
          }}>
            {dateFormatted}
          </p>
        </div>

        {/* Right: status pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {todayAppts.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.card, border: `1px solid ${T.bdrL}`,
              borderRadius: 9999, padding: "6px 12px",
            }}>
              <Calendar size={12} color={T.p} strokeWidth={2} />
              <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.t }}>
                {todayAppts.length} cita{todayAppts.length > 1 ? "s" : ""} hoy
              </span>
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: allSync ? T.sucA : T.warA,
            border: `1px solid ${allSync ? T.suc + "30" : T.war + "30"}`,
            borderRadius: 9999, padding: "6px 12px",
            animation: allSync ? "dash-pulse 3s ease infinite" : "none",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: allSync ? T.suc : T.war,
            }} />
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: allSync ? T.suc : T.war }}>
              {allSync ? "Todo sincronizado" : `${urgentCount} requiere${urgentCount > 1 ? "n" : ""} atención`}
            </span>
          </div>
        </div>
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — RADAR DE RIESGO
// ─────────────────────────────────────────────────────────────────────────────
function RiskRadar({ patients, sessions, riskAssessments, todayStr, onNavigate, isMobile }) {
  const threshold21 = useMemo(() => {
    const d = new Date(todayDate); d.setDate(d.getDate() - 21); return fmt(d);
  }, []);

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
      .slice(0, 3),
    [patients, lastSessionByPt, threshold21]
  );

  const latestByPt = useMemo(() => {
    const m = {};
    riskAssessments.forEach(a => { if (!m[a.patientId] || a.date > m[a.patientId].date) m[a.patientId] = a; });
    return m;
  }, [riskAssessments]);

  const riskItems = useMemo(() =>
    Object.values(latestByPt)
      .filter(a => a.riskLevel === "alto" || a.riskLevel === "medio" || a.riskLevel === "inminente")
      .sort((a, b) => {
        const ord = { inminente: 0, alto: 1, medio: 2 };
        return (ord[a.riskLevel] ?? 3) - (ord[b.riskLevel] ?? 3);
      })
      .slice(0, 4),
    [latestByPt]
  );

  const total = riskItems.length + absentPatients.length;

  if (total === 0) {
    return (
      <Card style={{ padding: isMobile ? "16px 18px" : "20px 22px", height: "100%" }}>
        <SectionLabel text="Radar de riesgo" icon={ShieldAlert} color={T.suc} />
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", borderRadius: 12,
          background: T.sucA, border: `1px solid ${T.suc}22`,
        }}>
          <CheckCircle2 size={18} color={T.suc} strokeWidth={1.8} />
          <div>
            <p style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, margin: 0 }}>Sin alertas activas</p>
            <p style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, margin: "2px 0 0" }}>Todos los pacientes en seguimiento regular.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      style={{
        padding: isMobile ? "16px 18px" : "20px 22px",
        border: riskItems.some(r => r.riskLevel === "inminente") ? `1.5px solid ${T.err}30` : undefined,
        animation: riskItems.some(r => r.riskLevel === "inminente") ? "risk-glow 2.5s ease infinite" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel text="Radar de riesgo" icon={ShieldAlert} color={T.err} />
        <SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {riskItems.map((a, idx) => {
          const pt = patients.find(p => p.id === a.patientId);
          const rc = RISK_CONFIG[a.riskLevel] || { label: a.riskLevel, color: T.war, bg: T.warA };
          const isLast = idx === riskItems.length - 1 && absentPatients.length === 0;
          return (
            <RiskRow
              key={a.id}
              name={pt?.name || "Paciente"}
              meta={`Evaluado ${fmtDate(a.date)}`}
              level={a.riskLevel}
              levelLabel={rc.label}
              levelColor={rc.color}
              levelBg={rc.bg}
              noSafetyPlan={!a.safetyPlan?.warningSignals}
              isLast={isLast}
              onClick={() => onNavigate("risk")}
            />
          );
        })}

        {absentPatients.length > 0 && riskItems.length > 0 && (
          <div style={{ padding: "8px 0" }}><Divider /></div>
        )}

        {absentPatients.map((p, idx) => {
          const days = p.lastSession ? daysBetween(p.lastSession, todayStr) : null;
          return (
            <AbsentRow
              key={p.id}
              name={p.name || "Paciente"}
              days={days}
              lastSession={p.lastSession}
              isLast={idx === absentPatients.length - 1}
              onClick={() => onNavigate("patients")}
            />
          );
        })}
      </div>
    </Card>
  );
}

function RiskRow({ name, meta, level, levelLabel, levelColor, levelBg, noSafetyPlan, isLast, onClick }) {
  const [hov, setHov] = useState(false);
  const isIminent = level === "inminente";
  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 10px", borderRadius: 10, cursor: "pointer",
          background: hov ? (isIminent ? `${levelColor}08` : T.cardAlt) : "transparent",
          transition: "background 0.15s ease",
          margin: "1px 0",
        }}
      >
        <Avatar name={name} size={32} color={levelColor} bg={levelBg} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.fH, fontSize: 15, fontWeight: 500, color: T.t,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}>
            {name.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 1 }}>
            {meta}{noSafetyPlan ? " · Sin plan de seguridad" : ""}
          </div>
        </div>
        <Badge color={levelColor} bg={levelBg} dot>{levelLabel}</Badge>
      </div>
      {!isLast && <Divider />}
    </>
  );
}

function AbsentRow({ name, days, lastSession, isLast, onClick }) {
  const [hov, setHov] = useState(false);
  const isVeryAbsent = days === null || days > 45;
  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 10px", borderRadius: 10, cursor: "pointer",
          background: hov ? T.cardAlt : "transparent",
          transition: "background 0.15s ease",
          margin: "1px 0",
        }}
      >
        <Avatar name={name} size={32} color={T.war} bg={T.warA} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.fH, fontSize: 15, fontWeight: 500, color: T.t,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}>
            {name.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 1 }}>
            {lastSession ? `Última sesión: ${fmtDate(lastSession)}` : "Sin sesiones registradas"}
          </div>
        </div>
        <Badge color={isVeryAbsent ? T.war : T.tl} bg={isVeryAbsent ? T.warA : T.bdrL} dot>
          {days !== null ? `${days}d` : "Nuevo"}
        </Badge>
      </div>
      {!isLast && <Divider />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 — HERO DE SESIÓN (Siguiente Paciente)
// ─────────────────────────────────────────────────────────────────────────────
function SessionHero({ todayAppts, sessions, onStartSession, onNavigate, isMobile }) {
  // Find the next pending appointment
  const nextPending = useMemo(() =>
    todayAppts.filter(a => a.status !== "completada")[0] || null,
    [todayAppts]
  );

  // Find last session for this patient
  const lastSession = useMemo(() => {
    if (!nextPending) return null;
    return sessions
      .filter(s => s.patientId === nextPending.patientId)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [nextPending, sessions]);

  const completedToday = todayAppts.filter(a => a.status === "completada").length;

  if (todayAppts.length === 0) {
    return (
      <Card style={{ padding: isMobile ? "22px 20px" : "28px 28px", display: "flex", flexDirection: "column", gap: 0, justifyContent: "center" }}>
        <SectionLabel text="Próxima sesión" icon={Play} color={T.p} />
        <EmptyState
          icon={Calendar}
          title="Sin citas hoy"
          desc="No hay consultas programadas para hoy."
          action={{ label: "Agendar cita", onClick: () => onNavigate("agenda") }}
        />
      </Card>
    );
  }

  if (!nextPending) {
    return (
      <Card style={{ padding: isMobile ? "22px 20px" : "28px 28px" }}>
        <SectionLabel text="Sesiones de hoy" icon={CheckCircle2} color={T.suc} />
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 20px", borderRadius: 14,
          background: T.sucA, border: `1px solid ${T.suc}25`,
        }}>
          <CheckCircle2 size={28} color={T.suc} strokeWidth={1.5} />
          <div>
            <p style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: 0, letterSpacing: "-0.01em" }}>
              Jornada completada
            </p>
            <p style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm, margin: "4px 0 0" }}>
              {completedToday} sesión{completedToday > 1 ? "es" : ""} documentada{completedToday > 1 ? "s" : ""} hoy. Bien hecho.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: isMobile ? "20px 20px" : "26px 28px", position: "relative", overflow: "hidden" }}>
      {/* Subtle background accent */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 160, height: 160, borderRadius: "50%",
        background: T.pA, opacity: 0.5, pointerEvents: "none",
      }} />

      <SectionLabel text="Próxima sesión" icon={Play} color={T.p} />

      {/* Time badge */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
        <div style={{
          flexShrink: 0, background: T.p, borderRadius: 14,
          padding: "10px 14px", textAlign: "center",
          minWidth: 56,
        }}>
          <div style={{ fontFamily: T.fB, fontSize: isMobile ? 20 : 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
            {nextPending.time?.split(":").slice(0, 2).join(":") || "—"}
          </div>
          {nextPending.time && (
            <div style={{ fontFamily: T.fB, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.65)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              HOY
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: T.fH,
            fontSize: isMobile ? 24 : 30,
            fontWeight: 500,
            color: T.t,
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {nextPending.patientName?.split(" ").slice(0, 3).join(" ") || "Paciente"}
          </h2>
          <p style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm, margin: 0 }}>
            {nextPending.type || "Consulta"}
          </p>
        </div>
      </div>

      {/* Last session summary */}
      {lastSession && (
        <div style={{
          background: T.cardAlt,
          border: `1px solid ${T.bdrL}`,
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <NotebookPen size={10} color={T.tl} strokeWidth={2} />
            <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Última sesión · {fmtDate(lastSession.date)}
            </span>
          </div>
          <p style={{
            fontFamily: T.fB, fontSize: 13, color: T.tm, margin: 0, lineHeight: 1.6,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {lastSession.notes || lastSession.summary || "Sin notas registradas de la sesión anterior."}
          </p>
        </div>
      )}

      {/* Progress: sessions done today */}
      {completedToday > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 9999, background: T.bdrL, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 9999, background: T.p,
              width: `${(completedToday / todayAppts.length) * 100}%`,
              transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
            }} />
          </div>
          <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, whiteSpace: "nowrap" }}>
            {completedToday}/{todayAppts.length} completadas
          </span>
        </div>
      )}

      <Btn
        variant="primary"
        onClick={() => onStartSession(nextPending)}
        style={{ width: "100%", justifyContent: "center", gap: 8, fontSize: 14, padding: "13px 20px" }}
      >
        <Play size={14} strokeWidth={2} fill="currentColor" />
        Iniciar sesión
      </Btn>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 — AGENDA DEL DÍA (Línea de Vida)
// ─────────────────────────────────────────────────────────────────────────────
function AgendaTimeline({ todayAppts, nextAppt, onStartSession, onNavigate, isMobile }) {
  if (todayAppts.length === 0) {
    return (
      <Card style={{ padding: isMobile ? "16px 18px" : "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <SectionLabel text="Agenda del día" icon={Calendar} />
          <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
        </div>
        {nextAppt ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 12,
            background: T.cardAlt, border: `1px solid ${T.bdrL}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: T.pA,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}>
              <Calendar size={13} color={T.p} strokeWidth={1.8} />
              <span style={{ fontFamily: T.fB, fontSize: 8, fontWeight: 700, color: T.p, marginTop: 1 }}>
                {new Date(nextAppt.date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short" }).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, margin: "0 0 2px" }}>Sin citas hoy · Próxima cita</p>
              <p style={{
                fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {nextAppt.patientName?.split(" ").slice(0, 2).join(" ")} — {fmtDate(nextAppt.date)}{nextAppt.time ? ` · ${nextAppt.time}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 0", textAlign: "center" }}>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, margin: 0 }}>Sin citas programadas</p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card style={{ padding: isMobile ? "16px 18px" : "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel text="Agenda del día" icon={Calendar} />
        <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {todayAppts.map((appt, idx) => (
          <AgendaRow
            key={appt.id}
            appt={appt}
            onStart={onStartSession}
            isLast={idx === todayAppts.length - 1}
            isFirst={idx === 0}
          />
        ))}
      </div>
    </Card>
  );
}

function AgendaRow({ appt, onStart, isLast, isFirst }) {
  const done = appt.status === "completada";
  const [hov, setHov] = useState(false);
  const isPending = !done;
  return (
    <div style={{
      display: "flex", alignItems: "stretch", gap: 0,
    }}>
      {/* Timeline column */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: 40, flexShrink: 0, marginRight: 12,
      }}>
        {/* Time dot */}
        <div style={{
          width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 14,
          background: done ? T.suc : isPending ? T.p : T.bdr,
          border: done ? `2px solid ${T.suc}40` : `2px solid ${T.p}30`,
          transition: "all 0.15s ease",
          zIndex: 1,
        }} />
        {/* Connector line */}
        {!isLast && (
          <div style={{
            flex: 1, width: 1.5, background: T.bdrL, minHeight: 16, marginTop: 2,
          }} />
        )}
      </div>

      {/* Content */}
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          padding: "10px 10px 10px 0",
          opacity: done ? 0.55 : 1, transition: "opacity 0.15s ease",
          borderRadius: 8,
        }}
      >
        <div style={{ flexShrink: 0, textAlign: "right", width: 42 }}>
          <span style={{
            fontFamily: T.fB, fontSize: 12.5, fontWeight: 700,
            color: done ? T.tl : T.p, letterSpacing: "0.01em",
          }}>
            {appt.time || "—"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.fH, fontSize: 15, fontWeight: 500, color: T.t,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}>
            {appt.patientName?.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 1 }}>{appt.type}</div>
        </div>
        {done ? (
          <Badge variant="success" dot>Completada</Badge>
        ) : (
          <Btn
            variant="ghost"
            small
            onClick={() => onStart(appt)}
            style={{
              fontSize: 11.5, padding: "5px 11px", gap: 4,
              opacity: hov ? 1 : 0.6, transition: "opacity 0.15s ease",
            }}
          >
            <Play size={10} strokeWidth={2} /> Iniciar
          </Btn>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 — CHECKLIST DE COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
function ComplianceChecklist({ patients, pendingTasks, sessions, onNavigate, isMobile }) {
  // Consentimientos con problema
  const consentIssues = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .filter(p => { const cs = consentStatus(p); return cs === "pending" || cs === "expired" || cs === "expiring"; })
      .slice(0, 3),
    [patients]
  );

  // Sesiones sin notas de cierre (heurístico: status completada pero sin notes)
  const unclosedSessions = useMemo(() =>
    sessions
      .filter(s => s.status === "completada" && !s.notes && !s.summary)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
    [sessions]
  );

  const totalIssues = consentIssues.length + unclosedSessions.length + (pendingTasks || 0);
  const allClear = totalIssues === 0;

  return (
    <Card style={{ padding: isMobile ? "16px 18px" : "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel text="Compliance" icon={ListChecks} color={allClear ? T.suc : T.war} />
        {!allClear && <Badge variant={allClear ? "success" : "warning"} dot>{totalIssues} pendiente{totalIssues > 1 ? "s" : ""}</Badge>}
      </div>

      {allClear ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", borderRadius: 10,
          background: T.sucA, border: `1px solid ${T.suc}22`,
        }}>
          <CheckCircle2 size={16} color={T.suc} strokeWidth={2} />
          <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.suc }}>Sin pendientes legales</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Consentimientos */}
          {consentIssues.map((p, idx) => {
            const cs = consentStatus(p);
            const cfg = CONSENT_STATUS_CONFIG[cs];
            return (
              <ComplianceItem
                key={p.id}
                icon={FileSignature}
                label={`${p.name?.split(" ")[0] || "Paciente"} — Consentimiento ${cfg?.label?.toLowerCase() || cs}`}
                color={cfg?.color || T.war}
                bg={cfg?.bg || T.warA}
                onClick={() => onNavigate("patients")}
              />
            );
          })}

          {/* Notas sin cerrar */}
          {unclosedSessions.map((s, idx) => {
            const patient = patients.find(p => p.id === s.patientId);
            return (
              <ComplianceItem
                key={s.id}
                icon={NotebookPen}
                label={`${patient?.name?.split(" ")[0] || "Paciente"} — Nota sin cerrar · ${fmtDate(s.date)}`}
                color={T.war}
                bg={T.warA}
                onClick={() => onNavigate("sessions")}
              />
            );
          })}

          {/* Tareas pendientes */}
          {(pendingTasks ?? 0) > 0 && (
            <ComplianceItem
              icon={ClipboardList}
              label={`${pendingTasks} tarea${pendingTasks > 1 ? "s" : ""} pendiente${pendingTasks > 1 ? "s" : ""}`}
              color={T.p}
              bg={T.pA}
              onClick={() => onNavigate("tasks")}
            />
          )}
        </div>
      )}
    </Card>
  );
}

function ComplianceItem({ icon: Icon, label, color, bg, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
        borderRadius: 10, cursor: "pointer",
        background: hov ? bg : T.cardAlt,
        border: `1px solid ${hov ? color + "30" : T.bdrL}`,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: `1px solid ${color}20`,
      }}>
        <Icon size={12} color={color} strokeWidth={2} />
      </div>
      <span style={{
        fontFamily: T.fB, fontSize: 12.5, fontWeight: 500, color: T.t,
        flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {label}
      </span>
      <ChevronRight size={12} color={T.tl} strokeWidth={2.5} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCIONES RÁPIDAS
// ─────────────────────────────────────────────────────────────────────────────
function QuickBar({ onQuickNav, onNewSession, isMobile }) {
  const actions = [
    { label: "Nueva nota clínica", icon: FileText,   color: T.suc, bg: T.sucA, handler: onNewSession,                       module: "sessions" },
    { label: "Agendar cita",       icon: Calendar,   color: T.p,   bg: T.pA,   handler: null,                                module: "agenda" },
    { label: "Registrar pago",     icon: DollarSign, color: T.war, bg: T.warA, handler: null,                                module: "finance" },
  ];
  return (
    <FadeUp delay={0.22}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
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
                display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 12,
                border: `1.5px solid ${hov ? a.color + "40" : T.bdrL}`,
                background: hov ? a.bg : T.card,
                cursor: "pointer", transition: "all .18s ease", fontFamily: T.fB, textAlign: "left",
                transform: hov ? "translateY(-1px)" : "none",
                boxShadow: hov ? `0 4px 14px rgba(26,43,40,0.07)` : "none",
                animation: `op-up 0.38s ease ${idx * 0.04}s both`,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: a.bg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s ease", transform: hov ? "scale(1.08)" : "scale(1)",
              }}>
                <ActionIcon size={14} color={a.color} strokeWidth={1.7} />
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
// PROFILE SETUP BAR (intacto, colapsado por defecto)
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
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: "100%", background: "none", border: "none", cursor: "pointer",
            padding: "10px 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ListChecks size={13} color={T.p} strokeWidth={1.8} />
            <span style={{ fontFamily: T.fB, fontSize: 12.5, fontWeight: 600, color: T.tm }}>Completa tu perfil</span>
            <Badge variant="default">{completed}/{total}</Badge>
          </div>
          {open ? <ChevronUp size={13} color={T.tl} /> : <ChevronDown size={13} color={T.tl} />}
        </button>
        <div style={{ padding: "0 16px", marginBottom: open ? 2 : 10 }}>
          <div style={{ height: 3, borderRadius: 9999, background: T.bdrL, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 9999, width: `${pct}%`, background: T.p,
              transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              animation: "op-bar 0.6s ease 0.2s both",
            }} />
          </div>
        </div>
        {open && (
          <div style={{ padding: "4px 16px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map(item => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.key}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                    borderRadius: 8, background: item.done ? T.sucA : T.cardAlt,
                    border: `1px solid ${item.done ? T.suc + "22" : T.bdrL}`,
                    opacity: item.done ? 0.65 : 1,
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: item.done ? `${T.suc}12` : T.pA,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.done
                      ? <CheckCircle2 size={11} color={T.suc} strokeWidth={2.2} />
                      : <ItemIcon size={11} color={T.p} strokeWidth={1.8} />}
                  </div>
                  <span style={{
                    flex: 1, fontFamily: T.fB, fontSize: 12.5,
                    color: item.done ? T.tl : T.t,
                    textDecoration: item.done ? "line-through" : "none",
                  }}>
                    {item.label}
                  </span>
                  {!item.done && (
                    <Btn variant="ghost" small onClick={() => handleConfigure(item.key)} style={{ fontSize: 11, padding: "3px 10px" }}>
                      Configurar
                    </Btn>
                  )}
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
// WELCOME GUIDE (sin cambios — sólo se muestra si no hay pacientes)
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
                  {step.btnLabel && (
                    <Btn variant="ghost" small onClick={() => onNavigate(step.module)} style={{ alignSelf: "flex-start", marginTop: "auto", color: step.color, borderColor: `${step.color}40` }}>
                      {step.btnLabel}
                    </Btn>
                  )}
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

  // ── Derived data (lógica Supabase intacta) ────────────────────────────────
  const todayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === todayStr)
      .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [appointments, todayStr]
  );

  const nextAppt = useMemo(() => {
    if (todayAppts.length > 0) return null;
    return appointments
      .filter(a => a.date > todayStr && a.status === "pendiente")
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))[0] || null;
  }, [appointments, todayStr, todayAppts]);

  const urgentCount = useMemo(() => {
    const latestByPt = {};
    riskAssessments.forEach(a => {
      if (!latestByPt[a.patientId] || a.date > latestByPt[a.patientId].date)
        latestByPt[a.patientId] = a;
    });
    const riskCount = Object.values(latestByPt).filter(
      a => a.riskLevel === "alto" || a.riskLevel === "inminente"
    ).length;
    const threshold21 = (() => { const d = new Date(todayDate); d.setDate(d.getDate() - 21); return fmt(d); })();
    const lastSessionByPt = {};
    sessions.forEach(s => {
      if (!lastSessionByPt[s.patientId] || s.date > lastSessionByPt[s.patientId])
        lastSessionByPt[s.patientId] = s.date;
    });
    const absentCount = patients
      .filter(p => (p.status || "activo") === "activo")
      .filter(p => { const last = lastSessionByPt[p.id]; return !last || last < threshold21; })
      .length;
    return riskCount + absentCount;
  }, [riskAssessments, sessions, patients]);

  // ── Layout helpers ────────────────────────────────────────────────────────
  const twoCol   = !isMobile;
  const gridGap  = isMobile ? 12 : 14;
  const outerPad = isMobile ? 0 : 0;

  return (
    <div style={{ maxWidth: 900, paddingBottom: 40 }}>

      {/* ── 0. WELCOME BANNER ─────────────────────────────────────────── */}
      <WelcomeBanner
        todayAppts={todayAppts}
        urgentCount={urgentCount}
        profile={profile}
        isMobile={isMobile}
      />

      {/* ── Profile setup (colapsado, sólo si incompleto) ─────────────── */}
      <ProfileSetupBar
        profile={profile}
        services={services}
        onNavigate={onNavigate}
        onQuickNav={onQuickNav}
      />

      {/* ── Content (empty state vs main) ─────────────────────────────── */}
      {patients.length === 0 ? (
        <WelcomeGuide onNavigate={onNavigate} />
      ) : (
        <>
          {/* ── FILA SUPERIOR: Radar + Hero ────────────────────────────── */}
          <FadeUp delay={0.06} style={{ marginBottom: gridGap }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: twoCol ? "1fr 1.15fr" : "1fr",
              gap: gridGap,
              alignItems: "start",
            }}>
              {/* RADAR DE RIESGO */}
              <RiskRadar
                patients={patients}
                sessions={sessions}
                riskAssessments={riskAssessments}
                todayStr={todayStr}
                onNavigate={onNavigate}
                isMobile={isMobile}
              />

              {/* HERO DE SESIÓN */}
              <SessionHero
                todayAppts={todayAppts}
                sessions={sessions}
                onStartSession={onStartSession}
                onNavigate={onNavigate}
                isMobile={isMobile}
              />
            </div>
          </FadeUp>

          {/* ── FLUJO DE TRABAJO: Agenda + Compliance ──────────────────── */}
          <FadeUp delay={0.14} style={{ marginBottom: gridGap }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: twoCol ? "1.15fr 1fr" : "1fr",
              gap: gridGap,
              alignItems: "start",
            }}>
              {/* AGENDA DEL DÍA */}
              <AgendaTimeline
                todayAppts={todayAppts}
                nextAppt={nextAppt}
                onStartSession={onStartSession}
                onNavigate={onNavigate}
                isMobile={isMobile}
              />

              {/* CHECKLIST DE COMPLIANCE */}
              <ComplianceChecklist
                patients={patients}
                pendingTasks={pendingTasks}
                sessions={sessions}
                onNavigate={onNavigate}
                isMobile={isMobile}
              />
            </div>
          </FadeUp>

          {/* ── ACCESO RÁPIDO ──────────────────────────────────────────── */}
          <QuickBar
            onQuickNav={onQuickNav}
            onNewSession={onNewSession}
            isMobile={isMobile}
          />
        </>
      )}
    </div>
  );
}
