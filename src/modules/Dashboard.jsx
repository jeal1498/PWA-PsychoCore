import { T } from "../theme.js";
import { todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, PageHeader } from "../components/ui/index.jsx";
import { Users, Calendar, TrendingUp, AlertCircle, Clock, FileText, ArrowRight, ChevronRight, ShieldAlert } from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus } from "./Consent.jsx";
import { readPendingLogs } from "./SelfLog.jsx";

export default function Dashboard({ patients, appointments, sessions, payments, riskAssessments = [], treatmentPlans = [], onNavigate, onStartSession }) {
  const todayStr    = fmt(todayDate);
  const monthStr    = fmt(todayDate).slice(0, 7);
  const todayAppts  = appointments.filter(a => a.date === todayStr);
  const monthIncome = payments.filter(p => p.status === "pagado" && p.date.startsWith(monthStr)).reduce((s, p) => s + Number(p.amount), 0);
  const pending     = payments.filter(p => p.status === "pendiente").length;
  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const stats = [
    { label: "Pacientes activos", value: patients.filter(p => (p.status||"activo") === "activo").length, icon: Users,       color: T.p,   bg: T.pA,   module: "patients"  },
    { label: "Citas hoy",         value: todayAppts.length,   icon: Calendar,    color: T.acc, bg: T.accA, module: "agenda"    },
    { label: "Ingresos este mes", value: fmtCur(monthIncome), icon: TrendingUp,  color: T.suc, bg: T.sucA, module: "finance"   },
    { label: "Pagos pendientes",  value: pending,             icon: AlertCircle, color: T.war, bg: T.warA, module: "finance"   },
  ];

  return (
    <div>
      <PageHeader
        title="Buenos días 🌿"
        subtitle={todayDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      {/* KPIs — clickable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <Card key={s.label} onClick={() => onNavigate(s.module)}
            style={{ padding: 20, cursor: "pointer", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shM; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = T.sh;  e.currentTarget.style.transform = "translateY(0)"; }}
          >
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 20 }}>

        {/* Today's appointments — with "Start session" action */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: 0 }}>Citas de hoy</h3>
            <button onClick={() => onNavigate("agenda")}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, display: "flex", alignItems: "center", gap: 4, fontFamily: T.fB, fontSize: 12 }}>
              Ver agenda <ChevronRight size={13} />
            </button>
          </div>

          {todayAppts.length === 0
            ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <Calendar size={32} strokeWidth={1.2} style={{ color: T.tl, opacity: 0.4, marginBottom: 10 }} />
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl }}>Sin citas programadas para hoy</div>
                <button onClick={() => onNavigate("agenda")}
                  style={{ marginTop: 12, background: T.pA, border: "none", borderRadius: 9999, padding: "7px 16px", fontFamily: T.fB, fontSize: 12, color: T.p, cursor: "pointer", fontWeight: 600 }}>
                  + Agendar cita
                </button>
              </div>
            )
            : todayAppts.map(a => (
              <div key={a.id} style={{ borderBottom: `1px solid ${T.bdrL}`, paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: a.status === "completada" ? T.sucA : T.pA, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Clock size={17} color={a.status === "completada" ? T.suc : T.p} strokeWidth={1.6} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t }}>{a.patientName.split(" ").slice(0, 2).join(" ")}</div>
                    <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{a.time} · {a.type}</div>
                  </div>
                  <Badge color={a.status === "completada" ? T.suc : T.war} bg={a.status === "completada" ? T.sucA : T.warA}>
                    {a.status}
                  </Badge>
                </div>
                {/* Action button */}
                {a.status !== "completada" && (
                  <button
                    onClick={() => onStartSession(a)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.p}`, background: T.pA, color: T.p, fontFamily: T.fB, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.p; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.pA; e.currentTarget.style.color = T.p; }}
                  >
                    <FileText size={13} /> Iniciar sesión
                  </button>
                )}
              </div>
            ))
          }
        </Card>

        {/* Recent sessions */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: 0 }}>Sesiones recientes</h3>
            <button onClick={() => onNavigate("sessions")}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, display: "flex", alignItems: "center", gap: 4, fontFamily: T.fB, fontSize: 12 }}>
              Ver todas <ChevronRight size={13} />
            </button>
          </div>
          {recentSessions.length === 0
            ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, textAlign: "center", padding: "24px 0" }}>Sin sesiones registradas aún</div>
            : recentSessions.map(s => {
              const MoodIcon = moodIcon(s.mood);
              const ps = progressStyle(s.progress);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.bdrL}`, cursor: "pointer" }}
                  onClick={() => onNavigate("sessions")}
                >
                  <MoodIcon size={18} color={moodColor(s.mood)} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 500, color: T.t }}>{s.patientName.split(" ").slice(0, 2).join(" ")}</div>
                    <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{fmtDate(s.date)}</div>
                  </div>
                  <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                </div>
              );
            })
          }
        </Card>

        {/* Consent alerts */}
        {(() => {
          const activePatients = patients.filter(p => (p.status || "activo") === "activo");
          const consentIssues  = activePatients.filter(p => {
            const cs = consentStatus(p);
            return cs === "pending" || cs === "expired" || cs === "expiring";
          });
          if (consentIssues.length === 0) return null;
          return (
            <Card style={{ padding: 24, border: `1.5px solid rgba(184,144,10,0.25)`, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: T.warA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={16} color={T.war} strokeWidth={1.8}/>
                  </div>
                  <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.war, margin: 0 }}>Consentimientos pendientes</h3>
                </div>
                <button onClick={() => onNavigate("patients")} style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, display: "flex", alignItems: "center", gap: 4, fontFamily: T.fB, fontSize: 12 }}>
                  Ver pacientes <ChevronRight size={13}/>
                </button>
              </div>
              {consentIssues.slice(0, 4).map(p => {
                const cs    = consentStatus(p);
                const color = cs === "expired" ? T.err : cs === "expiring" ? T.acc : T.war;
                const bg    = cs === "expired" ? T.errA : cs === "expiring" ? T.accA : T.warA;
                const label = cs === "expired" ? "Vencido" : cs === "expiring" ? "Por vencer" : "Sin firmar";
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: bg, borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${color}40` }}>
                      <span style={{ fontFamily: T.fH, fontSize: 14, color }}>{p.name[0]}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t }}>{p.name.split(" ").slice(0, 2).join(" ")}</div>
                      {p.consent?.signedAt && cs === "expired" && (
                        <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>Último CI: {fmtDate(p.consent.signedAt.split("T")[0])}</div>
                      )}
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700, fontFamily: T.fB, color, background: `${color}15`, border: `1px solid ${color}40` }}>{label}</span>
                  </div>
                );
              })}
              {consentIssues.length > 4 && (
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 6, textAlign: "center" }}>+{consentIssues.length - 4} más</div>
              )}
            </Card>
          );
        })()}

        {/* Clinical alerts */}
        {(() => {
          const latestByPt = {};
          riskAssessments.forEach(a => {
            if (!latestByPt[a.patientId] || a.date > latestByPt[a.patientId].date) latestByPt[a.patientId] = a;
          });
          const alerts = Object.values(latestByPt).filter(a => a.riskLevel === "alto" || a.riskLevel === "inminente");
          if (alerts.length === 0) return null;
          return (
            <Card style={{ padding: 24, border: `1.5px solid rgba(184,80,80,0.25)`, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: T.errA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldAlert size={16} color={T.err} strokeWidth={1.8}/>
                  </div>
                  <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.err, margin: 0 }}>Alertas clínicas</h3>
                </div>
                <button onClick={() => onNavigate("risk")} style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, display: "flex", alignItems: "center", gap: 4, fontFamily: T.fB, fontSize: 12 }}>
                  Ver todas <ChevronRight size={13}/>
                </button>
              </div>
              {alerts.map(a => {
                const pt = patients.find(p => p.id === a.patientId);
                const rc = RISK_CONFIG[a.riskLevel];
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: T.errA, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${rc.color}` }}>
                      <span style={{ fontFamily: T.fH, fontSize: 15, color: rc.color }}>{pt?.name?.[0] || "?"}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t }}>{pt?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</div>
                      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>Última evaluación: {fmtDate(a.date)}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700, fontFamily: T.fB, color: rc.color, background: rc.bg, border: `1px solid ${rc.color}` }}>{rc.label}</span>
                  </div>
                );
              })}
            </Card>
          );
        })()}

        {/* Self-log pending alerts */}
        {(() => {
          const pending = readPendingLogs();
          if (pending.length === 0) return null;
          // Group by patient token
          const byToken = {};
          pending.forEach(log => {
            if (!byToken[log.patientToken]) byToken[log.patientToken] = 0;
            byToken[log.patientToken]++;
          });
          const patientsWithLogs = patients.filter(p =>
            p.selfLogToken && byToken[p.selfLogToken] > 0
          );
          if (patientsWithLogs.length === 0) return null;
          return (
            <Card style={{ padding: 24, border: `1.5px solid rgba(78,139,95,0.25)`, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: T.sucA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 16 }}>📋</span>
                  </div>
                  <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.suc, margin: 0 }}>Autorregistros pendientes</h3>
                </div>
                <button onClick={() => onNavigate("patients")} style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, display: "flex", alignItems: "center", gap: 4, fontFamily: T.fB, fontSize: 12 }}>
                  Ver pacientes <ChevronRight size={13}/>
                </button>
              </div>
              {patientsWithLogs.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: T.sucA, borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(78,139,95,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${T.suc}40` }}>
                    <span style={{ fontFamily: T.fH, fontSize: 14, color: T.suc }}>{p.name[0]}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t }}>{p.name.split(" ").slice(0,2).join(" ")}</div>
                    <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{byToken[p.selfLogToken]} registro{byToken[p.selfLogToken] > 1 ? "s" : ""} esperando revisión</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700, fontFamily: T.fB, color: T.suc, background: "rgba(78,139,95,0.15)", border: `1px solid ${T.suc}40` }}>
                    Nuevo
                  </span>
                </div>
              ))}
              {patientsWithLogs.length > 3 && (
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 6, textAlign: "center" }}>
                  +{patientsWithLogs.length - 3} más
                </div>
              )}
            </Card>
          );
        })()}

        {/* Follow-up post-alta alerts */}
        {(() => {
          const today = fmt(todayDate);
          // Citas de seguimiento post-alta pendientes (pasadas sin completar)
          const overdueFollowUps = appointments.filter(a =>
            a.type === "Seguimiento post-alta" &&
            a.status === "pendiente" &&
            a.date < today
          );
          // Citas de seguimiento post-alta próximas (próximos 14 días)
          const upcoming14 = new Date(todayDate);
          upcoming14.setDate(upcoming14.getDate() + 14);
          const upcomingFollowUps = appointments.filter(a =>
            a.type === "Seguimiento post-alta" &&
            a.status === "pendiente" &&
            a.date >= today &&
            a.date <= fmt(upcoming14)
          );
          if (overdueFollowUps.length === 0 && upcomingFollowUps.length === 0) return null;
          const allFollowUps = [
            ...overdueFollowUps.map(a => ({ ...a, overdue: true })),
            ...upcomingFollowUps.map(a => ({ ...a, overdue: false })),
          ].sort((a,b) => a.date.localeCompare(b.date)).slice(0, 4);
          return (
            <Card style={{ padding: 24, border: `1.5px solid rgba(91,141,184,0.3)`, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(91,141,184,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={16} color="#5B8DB8" strokeWidth={1.8}/>
                  </div>
                  <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: "#5B8DB8", margin: 0 }}>Seguimientos post-alta</h3>
                </div>
                <button onClick={() => onNavigate("agenda")} style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, display: "flex", alignItems: "center", gap: 4, fontFamily: T.fB, fontSize: 12 }}>
                  Ver agenda <ChevronRight size={13}/>
                </button>
              </div>
              {allFollowUps.map(a => {
                const pt = patients.find(p => p.id === a.patientId);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", background: a.overdue ? T.warA : "rgba(91,141,184,0.08)", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: a.overdue ? T.warA : "rgba(91,141,184,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${a.overdue ? T.war : "#5B8DB8"}40` }}>
                      <span style={{ fontFamily: T.fH, fontSize: 14, color: a.overdue ? T.war : "#5B8DB8" }}>{(pt?.name?.[0] || "?")}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t }}>{pt?.name?.split(" ").slice(0,2).join(" ") || "Paciente"}</div>
                      <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{fmtDate(a.date)}{a.followUpMonth ? ` · ${a.followUpMonth} mes${a.followUpMonth > 1 ? "es" : ""} post-alta` : ""}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700, fontFamily: T.fB, color: a.overdue ? T.war : "#5B8DB8", background: a.overdue ? T.warA : "rgba(91,141,184,0.12)", border: `1px solid ${a.overdue ? T.war : "#5B8DB8"}40` }}>
                      {a.overdue ? "Vencido" : "Próximo"}
                    </span>
                  </div>
                );
              })}
              {(overdueFollowUps.length + upcomingFollowUps.length) > 4 && (
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 6, textAlign: "center" }}>
                  +{overdueFollowUps.length + upcomingFollowUps.length - 4} más
                </div>
              )}
            </Card>
          );
        })()}

        {/* Quick access panel */}
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontFamily: T.fH, fontSize: 20, fontWeight: 500, color: T.t, margin: "0 0 16px" }}>Accesos rápidos</h3>
          {[
            { label: "Nuevo paciente",  sub: "Registrar expediente",      module: "patients",  color: T.p,   bg: T.pA,   icon: Users      },
            { label: "Agendar cita",    sub: "Abrir calendario",          module: "agenda",    color: T.acc, bg: T.accA, icon: Calendar   },
            { label: "Nueva sesión",    sub: "Registrar nota clínica",    module: "sessions",  color: T.suc, bg: T.sucA, icon: FileText   },
            { label: "Registrar pago",  sub: "Control de finanzas",       module: "finance",   color: T.war, bg: T.warA, icon: TrendingUp },
          ].map(item => (
            <button key={item.label} onClick={() => onNavigate(item.module)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", marginBottom: 4, transition: "background .13s" }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <item.icon size={16} color={item.color} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t }}>{item.label}</div>
                <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>{item.sub}</div>
              </div>
              <ArrowRight size={14} color={T.tl} />
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}
