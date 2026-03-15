import { T } from "../theme.js";
import { todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, PageHeader } from "../components/ui/index.jsx";
import { Users, Calendar, TrendingUp, AlertCircle, Clock, FileText, ArrowRight, ChevronRight, ShieldAlert } from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";

export default function Dashboard({ patients, appointments, sessions, payments, riskAssessments = [], onNavigate, onStartSession }) {
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
