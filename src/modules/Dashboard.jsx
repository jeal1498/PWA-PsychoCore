import { T } from "../theme.js";
import { todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import {
  Users, Calendar, TrendingUp, AlertCircle, Clock,
  FileText, ChevronRight, ShieldAlert, DollarSign, Plus,
} from "lucide-react";
import { RISK_CONFIG } from "./RiskAssessment.jsx";
import { consentStatus } from "./Consent.jsx";
import { readPendingLogs } from "./SelfLog.jsx";

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function SeeAll({ label = "Ver todo", onClick }) {
  return (
    <button onClick={onClick}
      style={{ background:"none", border:"none", cursor:"pointer", color:T.tl,
        display:"flex", alignItems:"center", gap:3,
        fontFamily:T.fB, fontSize:12, padding:0, flexShrink:0 }}
      onMouseEnter={e => e.currentTarget.style.color = T.p}
      onMouseLeave={e => e.currentTarget.style.color = T.tl}>
      {label} <ChevronRight size={12}/>
    </button>
  );
}

function SectionHead({ title, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
      <h3 style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, margin:0 }}>{title}</h3>
      {action}
    </div>
  );
}

function KpiCard({ label, value, icon:Icon, color, bg, onClick }) {
  return (
    <Card onClick={onClick}
      style={{ padding:"16px 18px", cursor:"pointer", transition:"all .15s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shM; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.sh;  e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <div>
          <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl,
            letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
          <div style={{ fontFamily:T.fH, fontSize:28, fontWeight:500, color:T.t, lineHeight:1 }}>{value}</div>
        </div>
        <div style={{ width:40, height:40, borderRadius:11, background:bg,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={18} color={color} strokeWidth={1.6}/>
        </div>
      </div>
    </Card>
  );
}

function ApptCard({ appt, onStart }) {
  const done = appt.status === "completada";
  return (
    <div style={{ background: done ? T.cardAlt : T.card,
      border:`1.5px solid ${done ? T.bdrL : T.bdr}`,
      borderRadius:14, padding:"16px 18px",
      opacity: done ? 0.7 : 1, transition:"all .15s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: done ? 0 : 12 }}>
        <div style={{ width:44, height:44, borderRadius:12,
          background: done ? T.sucA : T.pA,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Clock size={19} color={done ? T.suc : T.p} strokeWidth={1.5}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:T.fB, fontSize:15, fontWeight:600, color:T.t,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {appt.patientName.split(" ").slice(0,2).join(" ")}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:1 }}>
            {appt.time && <span style={{ marginRight:8 }}>🕐 {appt.time}</span>}
            {appt.type && <span>{appt.type}</span>}
          </div>
        </div>
        <Badge color={done ? T.suc : T.p} bg={done ? T.sucA : T.pA}>
          {done ? "Completada" : "Pendiente"}
        </Badge>
      </div>
      {!done && (
        <button onClick={() => onStart(appt)}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7,
            width:"100%", padding:"10px", borderRadius:10,
            border:`1.5px solid ${T.p}`, background:T.pA,
            color:T.p, fontFamily:T.fB, fontSize:13, fontWeight:700,
            cursor:"pointer", transition:"all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background=T.p; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background=T.pA; e.currentTarget.style.color=T.p; }}>
          <FileText size={14}/> Iniciar sesión
        </button>
      )}
    </div>
  );
}

function QuickBar({ onNavigate, isMobile }) {
  const actions = [
    { label:"Nuevo paciente", icon:Users,      color:T.p,   bg:T.pA,   module:"patients" },
    { label:"Agendar cita",   icon:Calendar,   color:T.acc, bg:T.accA, module:"agenda"   },
    { label:"Nueva nota",     icon:FileText,   color:T.suc, bg:T.sucA, module:"sessions" },
    { label:"Registrar pago", icon:DollarSign, color:T.war, bg:T.warA, module:"finance"  },
  ];
  return (
    <div style={{ display:"grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap:10, marginBottom:24 }}>
      {actions.map(a => (
        <button key={a.label} onClick={() => onNavigate(a.module)}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
            borderRadius:12, border:`1.5px solid ${T.bdrL}`, background:T.card,
            cursor:"pointer", textAlign:"left", transition:"all .15s", fontFamily:T.fB }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background=a.bg; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdrL; e.currentTarget.style.background=T.card; }}>
          <div style={{ width:34, height:34, borderRadius:9, background:a.bg,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <a.icon size={15} color={a.color} strokeWidth={1.7}/>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:T.t, lineHeight:1.2 }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Dashboard({
  patients, appointments, sessions, payments,
  riskAssessments = [], treatmentPlans = [],
  onNavigate, onStartSession,
}) {
  const isMobile  = useIsMobile();
  const todayStr  = fmt(todayDate);
  const monthStr  = todayStr.slice(0, 7);

  const todayAppts   = appointments.filter(a => a.date === todayStr)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const pendingAppts = todayAppts.filter(a => a.status !== "completada");
  const monthIncome  = payments
    .filter(p => p.status === "pagado" && p.date.startsWith(monthStr))
    .reduce((s, p) => s + Number(p.amount), 0);
  const pendingPay  = payments.filter(p => p.status === "pendiente").length;
  const activeCount = patients.filter(p => (p.status || "activo") === "activo").length;
  const recentSess  = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const latestByPt = {};
  riskAssessments.forEach(a => {
    if (!latestByPt[a.patientId] || a.date > latestByPt[a.patientId].date)
      latestByPt[a.patientId] = a;
  });
  const riskAlerts = Object.values(latestByPt)
    .filter(a => a.riskLevel === "alto" || a.riskLevel === "inminente");

  const consentIssues = patients
    .filter(p => (p.status || "activo") === "activo")
    .filter(p => { const cs = consentStatus(p); return cs === "pending" || cs === "expired" || cs === "expiring"; });

  const pendingLogs = readPendingLogs();
  const byToken = {};
  pendingLogs.forEach(l => { byToken[l.patientToken] = (byToken[l.patientToken] || 0) + 1; });
  const patientsWithLogs = patients.filter(p => p.selfLogToken && byToken[p.selfLogToken] > 0);

  const upcoming14 = new Date(todayDate);
  upcoming14.setDate(upcoming14.getDate() + 14);
  const followUps = appointments.filter(a =>
    a.type === "Seguimiento post-alta" && a.status === "pendiente" &&
    a.date >= todayStr && a.date <= fmt(upcoming14)
  );
  const overdueFollowUps = appointments.filter(a =>
    a.type === "Seguimiento post-alta" && a.status === "pendiente" && a.date < todayStr
  );

  const summaryParts = [];
  if (todayAppts.length > 0)
    summaryParts.push(`${todayAppts.length} cita${todayAppts.length > 1 ? "s" : ""} hoy`);
  if (riskAlerts.length > 0)
    summaryParts.push(`${riskAlerts.length} alerta${riskAlerts.length > 1 ? "s" : ""} clínica${riskAlerts.length > 1 ? "s" : ""}`);
  if (consentIssues.length > 0)
    summaryParts.push(`${consentIssues.length} CI pendiente${consentIssues.length > 1 ? "s" : ""}`);

  const hasSecondaryAlerts =
    consentIssues.length > 0 || patientsWithLogs.length > 0 ||
    followUps.length > 0 || overdueFollowUps.length > 0;

  return (
    <div>

      {/* 1. HEADER */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:T.fH, fontSize: isMobile ? 28 : 34,
          fontWeight:500, color:T.t, lineHeight:1.1, marginBottom:4 }}>
          {greeting()} 🌿
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>
            {todayDate.toLocaleDateString("es-MX", {
              weekday:"long", day:"numeric", month:"long", year:"numeric"
            })}
          </span>
          {summaryParts.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {summaryParts.map((s, i) => (
                <span key={i} style={{ padding:"2px 10px", borderRadius:9999,
                  background: s.includes("alerta") ? T.errA : T.pA,
                  color: s.includes("alerta") ? T.err : T.p,
                  fontFamily:T.fB, fontSize:11.5, fontWeight:700 }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. ALERTAS CRÍTICAS */}
      {riskAlerts.length > 0 && (
        <div style={{ marginBottom:20, background:T.errA,
          border:`1.5px solid ${T.err}40`, borderRadius:14, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <ShieldAlert size={17} color={T.err} strokeWidth={1.8}/>
              <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.err,
                textTransform:"uppercase", letterSpacing:"0.07em" }}>
                Alertas clínicas activas
              </span>
            </div>
            <SeeAll label="Ver evaluaciones" onClick={() => onNavigate("risk")}/>
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px,1fr))",
            gap:8 }}>
            {riskAlerts.map(a => {
              const pt = patients.find(p => p.id === a.patientId);
              const rc = RISK_CONFIG[a.riskLevel];
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"10px 14px", background:T.card, borderRadius:10,
                  border:`1.5px solid ${rc.color}40` }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:rc.bg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, border:`2px solid ${rc.color}` }}>
                    <span style={{ fontFamily:T.fH, fontSize:15, color:rc.color }}>
                      {pt?.name?.[0] || "?"}
                    </span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {pt?.name?.split(" ").slice(0,2).join(" ") || "Paciente"}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>
                      Evaluado: {fmtDate(a.date)}
                    </div>
                  </div>
                  <span style={{ padding:"3px 10px", borderRadius:9999, fontSize:11,
                    fontWeight:700, fontFamily:T.fB, color:rc.color, background:rc.bg,
                    border:`1px solid ${rc.color}`, flexShrink:0 }}>
                    {rc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. KPIs */}
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))",
        gap:12, marginBottom:20 }}>
        <KpiCard label="Pacientes activos" value={activeCount}
          icon={Users} color={T.p} bg={T.pA} onClick={() => onNavigate("patients")}/>
        <KpiCard label="Citas hoy" value={todayAppts.length}
          icon={Calendar} color={T.acc} bg={T.accA} onClick={() => onNavigate("agenda")}/>
        <KpiCard label="Ingresos este mes" value={fmtCur(monthIncome)}
          icon={TrendingUp} color={T.suc} bg={T.sucA} onClick={() => onNavigate("finance")}/>
        <KpiCard label="Pagos pendientes" value={pendingPay}
          icon={AlertCircle} color={T.war} bg={T.warA} onClick={() => onNavigate("finance")}/>
      </div>

      {/* 4. CITAS DE HOY */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <h2 style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:T.t, margin:0 }}>
              Citas de hoy
            </h2>
            {pendingAppts.length > 0 && (
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2 }}>
                {pendingAppts.length} pendiente{pendingAppts.length > 1 ? "s" : ""} por documentar
              </div>
            )}
          </div>
          <SeeAll label="Ver agenda" onClick={() => onNavigate("agenda")}/>
        </div>

        {todayAppts.length === 0 ? (
          <Card style={{ padding:28, textAlign:"center" }}>
            <Calendar size={34} strokeWidth={1.2}
              style={{ color:T.tl, opacity:0.35, marginBottom:10 }}/>
            <div style={{ fontFamily:T.fB, fontSize:13.5, color:T.tl, marginBottom:14 }}>
              Sin citas programadas para hoy
            </div>
            <button onClick={() => onNavigate("agenda")}
              style={{ background:T.pA, border:"none", borderRadius:9999,
                padding:"8px 18px", fontFamily:T.fB, fontSize:13,
                color:T.p, cursor:"pointer", fontWeight:700 }}>
              + Agendar cita
            </button>
          </Card>
        ) : (
          <div style={{ display:"grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px,1fr))",
            gap:12 }}>
            {todayAppts.map(a => (
              <ApptCard key={a.id} appt={a} onStart={onStartSession}/>
            ))}
          </div>
        )}
      </div>

      {/* 5. ACCIONES RÁPIDAS */}
      <QuickBar onNavigate={onNavigate} isMobile={isMobile}/>

      {/* 6. GRID SECUNDARIO */}
      <div style={{ display:"grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px,1fr))",
        gap:20 }}>

        {/* Sesiones recientes */}
        <Card style={{ padding:24 }}>
          <SectionHead title="Sesiones recientes"
            action={<SeeAll label="Ver todas" onClick={() => onNavigate("sessions")}/>}/>
          {recentSess.length === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl,
                textAlign:"center", padding:"20px 0" }}>
                Sin sesiones registradas aún
              </div>
            : recentSess.map(s => {
              const MoodIcon = moodIcon(s.mood);
              const ps = progressStyle(s.progress);
              return (
                <div key={s.id} onClick={() => onNavigate("sessions")}
                  style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"10px 0", borderBottom:`1px solid ${T.bdrL}`, cursor:"pointer" }}>
                  <MoodIcon size={17} color={moodColor(s.mood)} strokeWidth={1.6}
                    style={{ flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {s.patientName.split(" ").slice(0,2).join(" ")}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                      {fmtDate(s.date)}
                    </div>
                  </div>
                  <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                </div>
              );
            })
          }
        </Card>

        {/* Alertas secundarias agrupadas */}
        {hasSecondaryAlerts && (
          <Card style={{ padding:24 }}>
            <SectionHead title="Pendientes" action={null}/>

            {consentIssues.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700,
                    color:T.war, textTransform:"uppercase", letterSpacing:"0.07em" }}>
                    ⚠ Consentimientos
                  </span>
                  <SeeAll label="Ver" onClick={() => onNavigate("patients")}/>
                </div>
                {consentIssues.slice(0,3).map(p => {
                  const cs = consentStatus(p);
                  const color = cs === "expired" ? T.err : cs === "expiring" ? T.acc : T.war;
                  const label = cs === "expired" ? "Vencido" : cs === "expiring" ? "Por vencer" : "Sin firmar";
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"7px 10px", borderRadius:9, background:`${color}10`, marginBottom:5 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%",
                        background:`${color}20`, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0, border:`1.5px solid ${color}40` }}>
                        <span style={{ fontFamily:T.fH, fontSize:12, color }}>{p.name[0]}</span>
                      </div>
                      <span style={{ fontFamily:T.fB, fontSize:13, color:T.t, flex:1,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {p.name.split(" ").slice(0,2).join(" ")}
                      </span>
                      <span style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color, flexShrink:0 }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
                {consentIssues.length > 3 && (
                  <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"center", marginTop:2 }}>
                    +{consentIssues.length - 3} más
                  </div>
                )}
              </div>
            )}

            {patientsWithLogs.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700,
                    color:T.suc, textTransform:"uppercase", letterSpacing:"0.07em" }}>
                    📋 Autorregistros
                  </span>
                  <SeeAll label="Ver" onClick={() => onNavigate("patients")}/>
                </div>
                {patientsWithLogs.slice(0,3).map(p => (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"7px 10px", borderRadius:9, background:T.sucA, marginBottom:5 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%",
                      background:"rgba(78,139,95,0.15)", display:"flex", alignItems:"center",
                      justifyContent:"center", flexShrink:0, border:`1.5px solid ${T.suc}40` }}>
                      <span style={{ fontFamily:T.fH, fontSize:12, color:T.suc }}>{p.name[0]}</span>
                    </div>
                    <span style={{ fontFamily:T.fB, fontSize:13, color:T.t, flex:1,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {p.name.split(" ").slice(0,2).join(" ")}
                    </span>
                    <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.suc, flexShrink:0 }}>
                      {byToken[p.selfLogToken]} nuevo{byToken[p.selfLogToken] > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(overdueFollowUps.length > 0 || followUps.length > 0) && (
              <div>
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700,
                    color:"#5B8DB8", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                    📅 Post-alta
                  </span>
                  <SeeAll label="Ver" onClick={() => onNavigate("agenda")}/>
                </div>
                {[...overdueFollowUps, ...followUps].slice(0,3).map(a => {
                  const pt = patients.find(p => p.id === a.patientId);
                  const overdue = a.date < todayStr;
                  return (
                    <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"7px 10px", borderRadius:9,
                      background: overdue ? T.warA : "rgba(91,141,184,0.08)", marginBottom:5 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%",
                        background: overdue ? T.warA : "rgba(91,141,184,0.15)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0, border:`1.5px solid ${overdue ? T.war : "#5B8DB8"}40` }}>
                        <span style={{ fontFamily:T.fH, fontSize:12,
                          color: overdue ? T.war : "#5B8DB8" }}>
                          {pt?.name?.[0] || "?"}
                        </span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.fB, fontSize:13, color:T.t,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {pt?.name?.split(" ").slice(0,2).join(" ") || "Paciente"}
                        </div>
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>
                          {fmtDate(a.date)}
                        </div>
                      </div>
                      <span style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, flexShrink:0,
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

      {/* FAB móvil */}
      {isMobile && (
        <button onClick={() => onNavigate("sessions")}
          style={{ position:"fixed", bottom:24, right:20, zIndex:150,
            width:54, height:54, borderRadius:"50%",
            background:T.p, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 20px rgba(58,107,110,0.40)",
            transition:"transform .15s" }}
          onMouseEnter={e => e.currentTarget.style.transform="scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
          <Plus size={24} color="#fff" strokeWidth={2}/>
        </button>
      )}
    </div>
  );
}
