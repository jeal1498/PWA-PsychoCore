// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — UI y subcomponentes visuales / PsychoCore                  ║
// ║  Rediseño: Minimalismo cálido · Jerarquía clínica · Cero fatiga cognitiva   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo } from "react";
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
  UserPlus, BarChart2,
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
function WelcomeBanner({ todayAppts, urgentCount, profile, googleUser, isMobile }) {
  const displayName = resolveDisplayName(profile, googleUser);
  const dateFormatted = todayFormatted();
  const allSync = urgentCount === 0;

  return (
    <FadeUp delay={0} style={{ marginBottom: isMobile ? 12 : 16 }}>
      <div style={{
        borderRadius: isMobile ? 16 : 18,
        background: `linear-gradient(135deg, ${T.pA} 0%, ${T.card} 60%, ${T.accA} 100%)`,
        border: `1px solid ${T.bdrL}`,
        padding: isMobile ? "18px 18px 16px" : "22px 28px",
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 12 : 20,
      }}>
        {/* Left */}
        <div>
          <h1 style={{
            fontFamily: T.fH,
            fontSize: isMobile ? 26 : 32,
            fontWeight: 500,
            color: T.t,
            margin: "0 0 4px",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
          }}>
            {greeting()},<br style={{ display: isMobile ? "block" : "none" }} /> {displayName}
          </h1>
          <p style={{
            fontFamily: T.fB, fontSize: isMobile ? 12 : 13,
            color: T.tm, margin: 0, letterSpacing: "0.005em",
          }}>
            {dateFormatted}
          </p>
        </div>

        {/* Right: status pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          {todayAppts.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.card, border: `1px solid ${T.bdrL}`,
              borderRadius: 9999, padding: "5px 11px",
            }}>
              <Calendar size={11} color={T.p} strokeWidth={2} />
              <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.t }}>
                {todayAppts.length} cita{todayAppts.length > 1 ? "s" : ""} hoy
              </span>
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: allSync ? T.sucA : T.warA,
            border: `1px solid ${allSync ? T.suc + "30" : T.war + "30"}`,
            borderRadius: 9999, padding: "5px 11px",
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
// STAT STRIP — solo desktop
// ─────────────────────────────────────────────────────────────────────────────
function StatStrip({ patients, sessions, todayAppts, urgentCount, payments, isMobile }) {
  if (isMobile) return null;

  const { activePatients, completedToday, monthlyIncome } = useMemo(
    () => {
      const active   = patients.filter(p => (p.status || "activo") === "activo").length;
      const compl    = todayAppts.filter(a => a.status === "completada").length;
      const now      = new Date();
      const mStr     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const income   = payments
        .filter(p => p.date?.startsWith(mStr) && p.status === "pagado")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return { activePatients: active, completedToday: compl, monthlyIncome: income };
    },
    [patients, todayAppts, payments]
  );

  const stats = [
    { label: "Pacientes activos",  value: activePatients,                                    icon: Users,         color: T.p,                           bg: T.pA   },
    { label: "Sesiones hoy",       value: `${completedToday}/${todayAppts.length}`,           icon: CheckCircle2,  color: T.suc,                         bg: T.sucA },
    { label: "Alertas activas",    value: urgentCount,                                        icon: AlertTriangle, color: urgentCount > 0 ? T.war : T.suc, bg: urgentCount > 0 ? T.warA : T.sucA },
    { label: "Ingresos este mes",  value: monthlyIncome > 0 ? fmtCur(monthlyIncome) : "—",   icon: DollarSign,    color: T.acc,                         bg: T.accA, small: true },
  ];

  return (
    <FadeUp delay={0.04} style={{ marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{
              background: T.card, border: `1px solid ${T.bdrL}`, borderRadius: 14,
              padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
              animation: `op-up 0.4s ease ${0.04 + i * 0.04}s both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: s.bg, border: `1px solid ${s.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={13} color={s.color} strokeWidth={1.8} />
                </div>
              </div>
              <div style={{
                fontFamily: T.fH, fontSize: s.small ? 22 : 28, fontWeight: 500,
                color: T.t, letterSpacing: "-0.02em", lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tl, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — RADAR DE RIESGO
// ─────────────────────────────────────────────────────────────────────────────
function RiskRadar({ patients, sessions, riskAssessments, todayStr, onNavigate, isMobile }) {
  const absentPatients = useMemo(() =>
    computeAbsentPatients({ patients, sessions }),
    [patients, sessions]
  );

  const riskItems = useMemo(() =>
    computeRiskItems(riskAssessments),
    [riskAssessments]
  );

  const total       = riskItems.length + absentPatients.length;
  const hasImminent = riskItems.some(r => r.riskLevel === "inminente");

  if (total === 0) {
    return (
      <Card style={{ padding: isMobile ? "16px 18px" : "20px 22px", height: "100%" }}>
        <SectionLabel text="Radar de riesgo" icon={ShieldAlert} color={T.suc} />
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px", borderRadius: 12,
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
    <Card style={{
      padding: isMobile ? "16px 18px" : "20px 22px",
      border: hasImminent ? `1.5px solid ${T.err}30` : undefined,
      animation: hasImminent ? "risk-glow 2.5s ease infinite" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel text="Radar de riesgo" icon={ShieldAlert} color={T.err} />
        <SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {riskItems.map((a, idx) => {
          const pt   = patients.find(p => p.id === a.patientId);
          const rc   = RISK_CONFIG[a.riskLevel] || { label: a.riskLevel, color: T.war, bg: T.warA };
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
// 2 — HOY WIDGET
// ─────────────────────────────────────────────────────────────────────────────
function HoyWidget({ todayAppts, sessions, nextAppt, onStartSession, onNavigate, isMobile }) {
  if (todayAppts.length === 0) {
    return (
      <Card style={{ padding: isMobile ? "20px 18px" : "26px 28px" }}>
        <SectionLabel text="Hoy" icon={CalendarDays} color={T.p} />
        <EmptyState
          icon={Calendar}
          title="Sin citas hoy"
          desc="No hay consultas programadas."
          action={{ label: "Agendar cita", onClick: () => onNavigate("agenda") }}
        />
      </Card>
    );
  }

  const todayFmt = todayWidgetTitle();
  const sorted   = [...todayAppts].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  return (
    <Card style={{ padding: isMobile ? "16px" : "22px 26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionLabel text={todayFmt} icon={CalendarDays} color={T.p} />
        <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")} />
      </div>
      {sorted.map((appt, i) => {
        const isPending = appt.status !== "completada"
          && appt.status !== "cancelada_paciente"
          && appt.status !== "cancelada_psicologa";
        const cfg     = HOY_STATUS_CFG[appt.status] || HOY_STATUS_CFG.pendiente;
        const isFirst = i === 0;
        return (
          <div key={appt.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 10,
            marginBottom: i < sorted.length - 1 ? 6 : 0,
            background: isPending && isFirst ? T.pA : "transparent",
            border: isPending && isFirst ? `1px solid ${T.p}22` : "1px solid transparent",
          }}>
            <Avatar name={appt.patientName} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {appt.patientName?.split(" ").slice(0, 2).join(" ")}
              </div>
              <div style={{ fontSize: 11, color: T.tl }}>
                {appt.time}{appt.type ? ` · ${appt.type}` : ""}
              </div>
            </div>
            <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
            {isPending && (
              <button
                onClick={() => onStartSession(appt)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8, border: "none",
                  cursor: "pointer", background: T.p, color: T.onPrimary ?? T.card,
                  fontFamily: T.fB, fontSize: 12, fontWeight: 600, flexShrink: 0,
                }}
              >
                ▶ Iniciar
              </button>
            )}
          </div>
        );
      })}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 — COMPLIANCE CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
function ComplianceChecklist({ patients, pendingTasks, sessions, onNavigate, isMobile }) {
  const consentIssues = useMemo(() =>
    patients
      .filter(p => (p.status || "activo") === "activo")
      .filter(p => { const cs = consentStatus(p); return cs === "pending" || cs === "expired" || cs === "expiring"; })
      .slice(0, 3),
    [patients]
  );

  const unclosedSessions = useMemo(() =>
    sessions
      .filter(s => s.status === "completada" && !s.notes && !s.summary)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
    [sessions]
  );

  const totalIssues = consentIssues.length + unclosedSessions.length + (pendingTasks || 0);
  const allClear    = totalIssues === 0;

  return (
    <Card style={{ padding: isMobile ? "16px 18px" : "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel text="Compliance" icon={ListChecks} color={allClear ? T.suc : T.war} />
        {!allClear && (
          <Badge variant={allClear ? "success" : "warning"} dot>
            {totalIssues} pendiente{totalIssues > 1 ? "s" : ""}
          </Badge>
        )}
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
          {consentIssues.map((p) => {
            const cs  = consentStatus(p);
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

          {unclosedSessions.map((s) => {
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
        width: 27, height: 27, borderRadius: 7, background: bg,
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
// ACCIONES RÁPIDAS — QuickBar (móvil/tablet)
// ─────────────────────────────────────────────────────────────────────────────
function ActionButton({ action: a, isMobile, idx, onClick }) {
  const [hov, setHov] = useState(false);
  const ActionIcon = a.icon;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: isMobile ? 7 : 8, padding: isMobile ? "14px 6px" : "16px 10px",
        borderRadius: 13, border: `1.5px solid ${hov ? a.color + "40" : T.bdrL}`,
        background: hov ? a.bg : T.card, cursor: "pointer", transition: "all .18s ease",
        fontFamily: T.fB, textAlign: "center",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? T.shM : "none",
        animation: `op-up 0.38s ease ${idx * 0.05}s both`,
        minWidth: 0, overflow: "hidden",
      }}
    >
      <div style={{
        width: isMobile ? 34 : 36, height: isMobile ? 34 : 36,
        borderRadius: 9, background: a.bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform 0.15s ease",
        transform: hov ? "scale(1.1)" : "scale(1)",
      }}>
        <ActionIcon size={15} color={a.color} strokeWidth={1.7} />
      </div>
      <span style={{
        fontSize: isMobile ? 11 : 12, fontWeight: 600,
        color: hov ? T.t : T.tm, lineHeight: 1.3,
        width: "100%", textAlign: "center", wordBreak: "break-word",
      }}>
        {a.label}
      </span>
    </button>
  );
}

function QuickBar({ onQuickNav, onNewSession, isMobile }) {
  const actions = [
    { label: "Nuevo Paciente",  icon: UserPlus,   color: T.p,   bg: T.pA,   module: "patients" },
    { label: "Agendar Cita",    icon: Calendar,   color: T.suc, bg: T.sucA, module: "agenda"   },
    { label: "Registrar Pago",  icon: DollarSign, color: T.war, bg: T.warA, module: "finance"  },
    { label: "Reporte Mensual", icon: BarChart2,  color: T.acc, bg: T.accA, module: "reports"  },
  ];
  return (
    <FadeUp delay={0.08}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: isMobile ? 6 : 10, marginBottom: isMobile ? 10 : 14,
      }}>
        {actions.map((a, idx) => (
          <ActionButton
            key={a.label}
            action={a}
            isMobile={isMobile}
            idx={idx}
            onClick={() => onQuickNav(a.module, "add")}
          />
        ))}
      </div>
    </FadeUp>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK SIDEBAR — columna derecha exclusiva de layout wide (≥1280px)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarActionButton({ action: a, idx }) {
  const [hov, setHov] = useState(false);
  const ActionIcon = a.icon;
  return (
    <button
      onClick={a.handler}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
        borderRadius: 10, border: `1.5px solid ${hov ? a.color + "40" : T.bdrL}`,
        background: hov ? a.bg : "transparent", cursor: "pointer",
        transition: "all .16s ease", fontFamily: T.fB, textAlign: "left",
        animation: `op-up 0.35s ease ${idx * 0.04}s both`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: a.bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <ActionIcon size={13} color={a.color} strokeWidth={1.7} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: hov ? T.t : T.tm, flex: 1 }}>
        {a.label}
      </span>
      <ChevronRight size={12} color={hov ? a.color : T.tl} strokeWidth={2.5} />
    </button>
  );
}

function QuickSidebar({ onQuickNav, onNewSession, patients, sessions, payments }) {
  const actions = [
    { label: "Nueva nota clínica", icon: FileText,   color: T.suc, bg: T.sucA, handler: onNewSession                       },
    { label: "Agendar cita",       icon: Calendar,   color: T.p,   bg: T.pA,   handler: () => onQuickNav("agenda",  "add") },
    { label: "Registrar pago",     icon: DollarSign, color: T.war, bg: T.warA, handler: () => onQuickNav("finance", "add") },
    { label: "Nuevo paciente",     icon: Users,      color: T.acc, bg: T.accA, handler: () => onQuickNav("patients","add") },
  ];

  const { activePatients, thisMonthSessions, monthlyIncome } = useMemo(
    () => computeSidebarSummary({ patients, sessions, payments }),
    [patients, sessions, payments]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Acciones rápidas */}
      <div style={{
        background: T.card, border: `1px solid ${T.bdrL}`,
        borderRadius: 16, padding: "16px 16px 12px",
      }}>
        <SectionLabel text="Acciones rápidas" icon={Sparkles} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {actions.map((a, idx) => (
            <SidebarActionButton key={a.label} action={a} idx={idx} />
          ))}
        </div>
      </div>

      {/* Resumen del mes */}
      <div style={{
        background: T.card, border: `1px solid ${T.bdrL}`,
        borderRadius: 16, padding: "16px 16px 14px",
      }}>
        <SectionLabel text="Resumen del mes" icon={TrendingUp} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Pacientes activos",    value: activePatients,                                                       icon: Users,      color: T.p   },
            { label: "Sesiones realizadas",  value: thisMonthSessions,                                                    icon: FileText,   color: T.suc },
            { label: "Ingresos cobrados",    value: monthlyIncome > 0 ? fmtCur(monthlyIncome) : "—",                     icon: DollarSign, color: T.acc, small: true },
          ].map(s => {
            const StatIcon = s.icon;
            return (
              <div key={s.label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 10,
                background: T.bg, border: `1px solid ${T.bdrL}`,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: s.color + "14",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <StatIcon size={12} color={s.color} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, lineHeight: 1 }}>{s.label}</div>
                </div>
                <div style={{
                  fontFamily: T.fH, fontSize: s.small ? 16 : 20, fontWeight: 500,
                  color: T.t, letterSpacing: "-0.02em", lineHeight: 1, flexShrink: 0,
                }}>
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SETUP BAR
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
  const total     = items.length;
  if (completed === total) return null;
  const pct = Math.round((completed / total) * 100);

  return (
    <FadeUp delay={0.03} style={{ marginBottom: 12 }}>
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
// WELCOME GUIDE (sin pacientes)
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    { num: 1, title: "Registra tu primer paciente", desc: "Agrega sus datos, historial y motivo de consulta.", icon: Users,     color: T.p,   bg: T.pA,   btnLabel: "Nuevo paciente", module: "patients" },
    { num: 2, title: "Agenda su primera cita",      desc: "Programa la sesión inicial en el calendario.",     icon: Calendar,  color: T.acc, bg: T.accA, btnLabel: "Ir a Agenda",    module: "agenda"   },
    { num: 3, title: "Mensaje de bienvenida",       desc: "PsychoCore enviará la confirmación automáticamente.", icon: FileText, color: T.suc, bg: T.sucA, btnLabel: null, module: null },
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

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>

      {/* ── 0. WELCOME BANNER ─────────────────────────────────────────── */}
      <WelcomeBanner
        todayAppts={todayAppts}
        urgentCount={urgentCount}
        profile={profile}
        googleUser={googleUser}
        isMobile={isMobile}
      />

      {/* ── ACCIONES RÁPIDAS — posición fija: siempre debajo del banner ── */}
      {patients.length > 0 && !isWide && (
        <QuickBar
          onQuickNav={onQuickNav}
          onNewSession={onNewSession}
          isMobile={isMobile}
        />
      )}

      {/* ── Content (main) ────────────────────────────────────────────── */}
      {patients.length === 0 ? (
        <></>
      ) : (
        <>
          {/* ── STAT STRIP — solo desktop ──────────────────────────────── */}
          <StatStrip
            patients={patients}
            sessions={sessions}
            todayAppts={todayAppts}
            urgentCount={urgentCount}
            payments={payments}
            isMobile={isMobile}
          />

          {/* ── MÓVIL: apilado vertical ────────────────────────────────── */}
          {isMobile && (
            <>
              <FadeUp delay={0.06} style={{ marginBottom: gridGap }}>
                <HoyWidget
                  todayAppts={todayAppts}
                  sessions={sessions}
                  nextAppt={nextAppt}
                  onStartSession={onStartSession}
                  onNavigate={onNavigate}
                  isMobile={isMobile}
                />
              </FadeUp>
              <FadeUp delay={0.12} style={{ marginBottom: gridGap }}>
                <RiskRadar
                  patients={patients}
                  sessions={sessions}
                  riskAssessments={riskAssessments}
                  todayStr={todayStr}
                  onNavigate={onNavigate}
                  isMobile={isMobile}
                />
              </FadeUp>
              <FadeUp delay={0.20} style={{ marginBottom: gridGap }}>
                <ComplianceChecklist
                  patients={patients}
                  pendingTasks={pendingTasks}
                  sessions={sessions}
                  onNavigate={onNavigate}
                  isMobile={isMobile}
                />
              </FadeUp>
            </>
          )}

          {/* ── TABLET / DESKTOP 768–1279px: Grid 2 col ──────────────── */}
          {!isMobile && !isWide && (
            <>
              <FadeUp delay={0.06} style={{ marginBottom: gridGap }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: gridGap, alignItems: "start" }}>
                  <RiskRadar
                    patients={patients}
                    sessions={sessions}
                    riskAssessments={riskAssessments}
                    todayStr={todayStr}
                    onNavigate={onNavigate}
                    isMobile={isMobile}
                  />
                  <HoyWidget
                    todayAppts={todayAppts}
                    sessions={sessions}
                    nextAppt={nextAppt}
                    onStartSession={onStartSession}
                    onNavigate={onNavigate}
                    isMobile={isMobile}
                  />
                </div>
              </FadeUp>
              <FadeUp delay={0.14} style={{ marginBottom: gridGap }}>
                <ComplianceChecklist
                  patients={patients}
                  pendingTasks={pendingTasks}
                  sessions={sessions}
                  onNavigate={onNavigate}
                  isMobile={isMobile}
                />
              </FadeUp>
            </>
          )}

          {/* ── WIDE ≥1280px: Grid 3 col ──────────────────────────────── */}
          {!isMobile && isWide && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.55fr 1fr", gap: 18, alignItems: "start" }}>
              {/* Columna izquierda — vigilancia clínica */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <FadeUp delay={0.06}>
                  <RiskRadar
                    patients={patients}
                    sessions={sessions}
                    riskAssessments={riskAssessments}
                    todayStr={todayStr}
                    onNavigate={onNavigate}
                    isMobile={false}
                  />
                </FadeUp>
                <FadeUp delay={0.10}>
                  <ComplianceChecklist
                    patients={patients}
                    pendingTasks={pendingTasks}
                    sessions={sessions}
                    onNavigate={onNavigate}
                    isMobile={false}
                  />
                </FadeUp>
              </div>

              {/* Columna central — acción principal del día */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <FadeUp delay={0.08}>
                  <HoyWidget
                    todayAppts={todayAppts}
                    sessions={sessions}
                    nextAppt={nextAppt}
                    onStartSession={onStartSession}
                    onNavigate={onNavigate}
                    isMobile={false}
                  />
                </FadeUp>
              </div>

              {/* Columna derecha — acciones rápidas + resumen */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <FadeUp delay={0.10}>
                  <QuickSidebar
                    onQuickNav={onQuickNav}
                    onNewSession={onNewSession}
                    patients={patients}
                    sessions={sessions}
                    payments={payments}
                  />
                </FadeUp>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
