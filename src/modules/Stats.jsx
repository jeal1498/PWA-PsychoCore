import { useMemo } from "react";
import { TrendingUp, Users, FileText, DollarSign, Activity, Award } from "lucide-react";
import { T, MONTHS_ES } from "../theme.js";
import { fmtCur, fmt, todayDate } from "../utils.js";
import { Card, PageHeader, Badge } from "../components/ui/index.jsx";

// ── Mini bar chart ────────────────────────────────────────────────────────────
function BarChart({ data, color, height = 80, showLabels = true }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{ fontSize:9, color:T.tl, fontFamily:T.fB, fontWeight:600 }}>
            {d.value > 0 ? d.value : ""}
          </div>
          <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background: color, opacity: d.value === 0 ? 0.15 : 0.85, transition:"height .4s ease", height: `${(d.value / max) * (height - 24)}px`, minHeight: d.value > 0 ? 4 : 0 }}/>
          {showLabels && <div style={{ fontSize:9, color:T.tl, fontFamily:T.fB, whiteSpace:"nowrap" }}>{d.label}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Donut / ring chart (SVG) ──────────────────────────────────────────────────
function DonutChart({ slices, size = 120 }) {
  const r = 42, cx = size/2, cy = size/2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.bdrL} strokeWidth={14}/>
      {slices.map((sl, i) => {
        const dash = (sl.value / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={sl.color} strokeWidth={14}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition:"stroke-dasharray .5s ease" }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily:T.fH, fontSize:22, fill:T.t, fontWeight:500 }}>{total}</text>
      <text x={cx} y={cy+16} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily:T.fB, fontSize:9, fill:T.tl }}>total</text>
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon:Icon, color, bg }) {
  return (
    <Card style={{ padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ width:40, height:40, borderRadius:11, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={18} color={color} strokeWidth={1.6}/>
        </div>
      </div>
      <div style={{ fontFamily:T.fH, fontSize:30, fontWeight:500, color:T.t, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>{sub}</div>}
      <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:6 }}>{label}</div>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Stats({ patients, appointments, sessions, payments }) {
  const now = new Date();

  // ── Last 6 months labels ──
  const last6 = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS_ES[d.getMonth()].slice(0,3) };
    });
  }, []);

  // ── Monthly income ──
  const incomeByMonth = useMemo(() =>
    last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      const val = payments.filter(p => p.status==="pagado" && p.date.startsWith(ms)).reduce((s,p) => s+Number(p.amount), 0);
      return { label:m.label, value:val };
    }), [last6, payments]);

  // ── Sessions by month ──
  const sessionsByMonth = useMemo(() =>
    last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      return { label:m.label, value: sessions.filter(s => s.date.startsWith(ms)).length };
    }), [last6, sessions]);

  // ── Patients by month (new) ──
  const newPatientsByMonth = useMemo(() =>
    last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      return { label:m.label, value: patients.filter(p => (p.createdAt||"").startsWith(ms)).length };
    }), [last6, patients]);

  // ── Diagnosis distribution ──
  const diagDist = useMemo(() => {
    const map = {};
    patients.forEach(p => {
      const key = (p.diagnosis||"Sin diagnóstico").split("—")[0].split("–")[0].trim().slice(0,30);
      map[key] = (map[key]||0) + 1;
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,6);
  }, [patients]);

  // ── Top patients by sessions ──
  const topPatients = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!map[s.patientId]) map[s.patientId] = { name:s.patientName, sessions:0, income:0 };
      map[s.patientId].sessions++;
    });
    payments.filter(p => p.status==="pagado").forEach(p => {
      if (map[p.patientId]) map[p.patientId].income += Number(p.amount);
    });
    return Object.values(map).sort((a,b) => b.sessions - a.sessions).slice(0,5);
  }, [sessions, payments]);

  // ── Status breakdown ──
  const statusCounts = useMemo(() => {
    const activo = patients.filter(p => (p.status||"activo")==="activo").length;
    const pausa  = patients.filter(p => p.status==="pausa").length;
    const alta   = patients.filter(p => p.status==="alta").length;
    return [
      { label:"Activos",   value:activo, color:T.suc },
      { label:"En pausa",  value:pausa,  color:T.war },
      { label:"Alta",      value:alta,   color:T.tl  },
    ].filter(s => s.value > 0);
  }, [patients]);

  // ── Progress distribution ──
  const progressDist = useMemo(() => {
    const map = { excelente:0, bueno:0, moderado:0, bajo:0 };
    sessions.forEach(s => { if (map[s.progress] !== undefined) map[s.progress]++; });
    return Object.entries(map).map(([k,v]) => ({ label:k, value:v }));
  }, [sessions]);

  // ── KPIs ──
  const thisMonth   = fmt(todayDate).slice(0,7);
  const monthIncome = payments.filter(p => p.status==="pagado" && p.date.startsWith(thisMonth)).reduce((s,p) => s+Number(p.amount), 0);
  const monthSess   = sessions.filter(s => s.date.startsWith(thisMonth)).length;
  const totalIncome = payments.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount), 0);
  const avgPerSession = sessions.length > 0 ? Math.round(totalIncome / sessions.length) : 0;
  const pendingAmount = payments.filter(p => p.status==="pendiente").reduce((s,p) => s+Number(p.amount), 0);

  const DIAG_COLORS = [T.p, T.acc, T.suc, "#6B5B9E", T.war, T.err];

  return (
    <div>
      <PageHeader title="Estadísticas" subtitle="Análisis de tu práctica clínica"/>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:14, marginBottom:28 }}>
        <StatCard label="Pacientes activos"    value={patients.filter(p=>(p.status||"activo")==="activo").length} icon={Users}      color={T.p}   bg={T.pA}   />
        <StatCard label="Sesiones este mes"    value={monthSess}                icon={FileText}   color={T.acc} bg={T.accA} />
        <StatCard label="Ingresos este mes"    value={fmtCur(monthIncome)}      icon={DollarSign} color={T.suc} bg={T.sucA} />
        <StatCard label="Ingreso por sesión"   value={fmtCur(avgPerSession)}    icon={TrendingUp} color={T.p}   bg={T.pA}   sub="promedio histórico" />
        <StatCard label="Por cobrar"           value={fmtCur(pendingAmount)}    icon={Activity}   color={T.war} bg={T.warA} />
        <StatCard label="Total sesiones"       value={sessions.length}          icon={Award}      color={T.acc} bg={T.accA} sub="histórico" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:20, marginBottom:20 }}>

        {/* Income chart */}
        <Card style={{ padding:24, gridColumn:"span 2" }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 4px" }}>Ingresos últimos 6 meses</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 20px" }}>Solo pagos confirmados</p>
          <BarChart data={incomeByMonth} color={T.p} height={120}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, fontFamily:T.fB, fontSize:12, color:T.tm }}>
            <span>Total 6M: <strong style={{color:T.t}}>{fmtCur(incomeByMonth.reduce((s,d)=>s+d.value,0))}</strong></span>
            <span>Promedio: <strong style={{color:T.t}}>{fmtCur(Math.round(incomeByMonth.reduce((s,d)=>s+d.value,0)/6))}</strong>/mes</span>
          </div>
        </Card>

        {/* Sessions chart */}
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 4px" }}>Sesiones por mes</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 20px" }}>Últimos 6 meses</p>
          <BarChart data={sessionsByMonth} color={T.acc} height={100}/>
        </Card>

        {/* New patients chart */}
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 4px" }}>Pacientes nuevos</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 20px" }}>Altas por mes</p>
          <BarChart data={newPatientsByMonth} color={T.suc} height={100}/>
        </Card>

        {/* Patient status donut */}
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 20px" }}>Estado de pacientes</h3>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <DonutChart slices={statusCounts} size={120}/>
            <div style={{ flex:1 }}>
              {statusCounts.map(s => (
                <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
                  <span style={{ fontFamily:T.fB, fontSize:13, color:T.t, flex:1 }}>{s.label}</span>
                  <span style={{ fontFamily:T.fH, fontSize:18, color:T.t, fontWeight:500 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Progress distribution */}
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 20px" }}>Progreso terapéutico</h3>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <DonutChart slices={progressDist.filter(p=>p.value>0).map((p,i) => ({
              ...p, color:[T.suc,T.p,T.war,T.err][i]
            }))} size={120}/>
            <div style={{ flex:1 }}>
              {progressDist.map((p, i) => {
                const colors = [T.suc, T.p, T.war, T.err];
                const pct = sessions.length > 0 ? Math.round((p.value/sessions.length)*100) : 0;
                return (
                  <div key={p.label} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontFamily:T.fB, fontSize:12, color:T.t, textTransform:"capitalize" }}>{p.label}</span>
                      <span style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>{p.value} ({pct}%)</span>
                    </div>
                    <div style={{ height:5, background:T.bdrL, borderRadius:9999, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:colors[i], borderRadius:9999, transition:"width .5s ease" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Diagnosis frequency */}
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 20px" }}>Diagnósticos frecuentes</h3>
          {diagDist.length === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin datos aún</div>
            : diagDist.map(([diag, count], i) => {
              const pct = Math.round((count / patients.length) * 100);
              return (
                <div key={diag} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:T.fB, fontSize:12, color:T.t }}>{diag}</span>
                    <span style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:6, background:T.bdrL, borderRadius:9999, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:DIAG_COLORS[i%DIAG_COLORS.length], borderRadius:9999, transition:"width .5s ease" }}/>
                  </div>
                </div>
              );
            })
          }
        </Card>

        {/* Top patients */}
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 20px" }}>Pacientes con más sesiones</h3>
          {topPatients.length === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin datos aún</div>
            : topPatients.map((p, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:T.fH, fontSize:13, color:T.p, fontWeight:600 }}>{i+1}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{(p.name||"").split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>{p.sessions} sesiones</div>
                </div>
                <div style={{ fontFamily:T.fH, fontSize:16, color:T.suc }}>{fmtCur(p.income)}</div>
              </div>
            ))
          }
        </Card>

      </div>
    </div>
  );
}
