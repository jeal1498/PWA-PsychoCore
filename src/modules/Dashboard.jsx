import { T } from "../theme.js";
import { todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, PageHeader } from "../components/ui/index.jsx";
import { Users, Calendar, TrendingUp, AlertCircle, Clock } from "lucide-react";

export default function Dashboard({ patients, appointments, sessions, payments }) {
  const todayStr   = fmt(todayDate);
  const monthStr   = fmt(todayDate).slice(0, 7);
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const monthIncome = payments.filter(p => p.status === "pagado" && p.date.startsWith(monthStr)).reduce((s,p) => s + Number(p.amount), 0);
  const pending     = payments.filter(p => p.status === "pendiente").length;
  const recentSessions = [...sessions].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);

  const stats = [
    { label:"Pacientes activos",  value: patients.length,     icon: Users,       color: T.p,   bg: T.pA   },
    { label:"Citas hoy",          value: todayAppts.length,   icon: Calendar,    color: T.acc, bg: T.accA },
    { label:"Ingresos este mes",  value: fmtCur(monthIncome), icon: TrendingUp,  color: T.suc, bg: T.sucA },
    { label:"Pagos pendientes",   value: pending,             icon: AlertCircle, color: T.war, bg: T.warA },
  ];

  return (
    <div>
      <PageHeader
        title={`Buenos días 🌿`}
        subtitle={todayDate.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", gap:14, marginBottom:28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:T.tm, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>{s.label}</div>
                <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:T.t }}>{s.value}</div>
              </div>
              <div style={{ width:42, height:42, borderRadius:12, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <s.icon size={20} color={s.color} strokeWidth={1.6} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:20 }}>
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, margin:"0 0 16px" }}>Citas de hoy</h3>
          {todayAppts.length === 0
            ? <div style={{ textAlign:"center", padding:"24px 0", color:T.tl, fontFamily:T.fB, fontSize:13 }}>Sin citas programadas</div>
            : todayAppts.map(a => (
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                <div style={{ width:42, height:42, borderRadius:12, background:T.pA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Clock size={18} color={T.p} strokeWidth={1.6} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:500, color:T.t }}>{a.patientName.split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{a.time} · {a.type}</div>
                </div>
                <Badge color={a.status==="completada"?T.suc:T.war} bg={a.status==="completada"?T.sucA:T.warA}>{a.status}</Badge>
              </div>
            ))
          }
        </Card>

        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, margin:"0 0 16px" }}>Sesiones recientes</h3>
          {recentSessions.map(s => {
            const MoodIcon = moodIcon(s.mood);
            const ps = progressStyle(s.progress);
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                <MoodIcon size={18} color={moodColor(s.mood)} strokeWidth={1.6} style={{ flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{s.patientName.split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{fmtDate(s.date)}</div>
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
