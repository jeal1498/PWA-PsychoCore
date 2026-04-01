import { useMemo, useState } from "react";
import { TrendingUp, Users, FileText, DollarSign, Activity, Award, UserCheck, Calendar, XCircle, BarChart2, ShieldAlert, ClipboardCheck, HeartPulse } from "lucide-react";
import { T, MONTHS_ES } from "../theme.js";
import { fmtCur, fmt, todayDate } from "../utils.js";
import { Card, PageHeader, Badge, Select, EmptyState } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useIsWide }   from "../hooks/useIsWide.js";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

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

// ── Multi-series bar chart ────────────────────────────────────────────────────
function MultiBarChart({ data, series, height = 100 }) {
  const max = Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1);
  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:4, height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{ display:"flex", gap:2, alignItems:"flex-end", width:"100%" }}>
              {series.map(s => (
                <div key={s.key} style={{ flex:1, borderRadius:"3px 3px 0 0",
                  background: s.color, opacity: (d[s.key]||0) === 0 ? 0.12 : 0.85,
                  height: `${((d[s.key]||0) / max) * (height - 18)}px`, minHeight:(d[s.key]||0)>0?3:0,
                  transition:"height .4s ease" }}/>
              ))}
            </div>
            <div style={{ fontSize:8.5, color:T.tl, fontFamily:T.fB, whiteSpace:"nowrap" }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
        {series.map(s => (
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:s.color }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>{s.label}</span>
          </div>
        ))}
      </div>
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

// ── Gauge (arc) SVG ──────────────────────────────────────────────────────────
function GaugeChart({ value, max = 100, color, size = 110, label }) {
  const pct = Math.min(value / max, 1);
  const r = 38, cx = size/2, cy = size * 0.62;
  const startAngle = -Math.PI * 0.85;
  const endAngle   = Math.PI * 0.85;
  const range = endAngle - startAngle;
  const angle  = startAngle + range * pct;
  const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
  const px = cx + r * Math.cos(angle),       py = cy + r * Math.sin(angle);
  const largeArc = pct > 0.5 ? 1 : 0;
  const trackD  = `M${x1},${y1} A${r},${r} 0 1 1 ${x2},${y2}`;
  const fillD   = pct > 0 ? `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${px},${py}` : "";
  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
      <path d={trackD} fill="none" stroke={T.bdrL} strokeWidth={10} strokeLinecap="round"/>
      {fillD && <path d={fillD} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" style={{ transition:"all .6s ease" }}/>}
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily:T.fH, fontSize:22, fill:T.t, fontWeight:500 }}>{Math.round(pct * 100)}%</text>
      {label && <text x={cx} y={cy + 11} textAnchor="middle" style={{ fontFamily:T.fB, fontSize:9, fill:T.tl }}>{label}</text>}
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon:Icon, color, bg }) {
  return (
    <Card style={{ padding:"14px 12px" }}>
      <div style={{ width:32, height:32, borderRadius:9, background:bg,
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
        <Icon size={15} color={color} strokeWidth={1.7}/>
      </div>
      <div style={{ fontFamily:T.fH, fontSize:24, fontWeight:500, color:T.t, lineHeight:1, marginBottom:3 }}>{value}</div>
      {sub && <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, marginBottom:1 }}>{sub}</div>}
      <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:600, color:T.tl,
        letterSpacing:"0.04em", whiteSpace:"nowrap", overflow:"hidden",
        textOverflow:"ellipsis" }}>{label}</div>
    </Card>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ icon:Icon, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, marginTop:28, paddingBottom:10, borderBottom:`1.5px solid ${T.bdrL}` }}>
      <div style={{ width:32, height:32, borderRadius:9, background:T.pA, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={15} color={T.p} strokeWidth={1.8}/>
      </div>
      <div>
        <div style={{ fontFamily:T.fH, fontSize:19, fontWeight:600, color:T.t }}>{title}</div>
        {sub && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Attendance heatmap (SVG puro) ─────────────────────────────────────────────
function AttendanceHeatmap({ sessions, months = 12 }) {
  // Build a map: "YYYY-WW" → count
  const weekMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!s.date) return;
      const d = new Date(s.date + "T12:00:00");
      // ISO week key: year + week-of-year
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [sessions]);

  // Generate weeks from (today - months*~4.33 weeks) to today
  const today = new Date();
  const totalWeeks = Math.round(months * 4.34);
  const weeks = useMemo(() => {
    const result = [];
    for (let i = totalWeeks - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      // normalize to Monday of that week
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const jan1 = new Date(monday.getFullYear(), 0, 1);
      const week = Math.ceil(((monday - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      const key = `${monday.getFullYear()}-${String(week).padStart(2, "0")}`;
      result.push({ key, date: new Date(monday) });
    }
    return result;
  }, [totalWeeks]);

  // Month label positions
  const monthLabels = useMemo(() => {
    const seen = new Set();
    const labels = [];
    weeks.forEach((w, i) => {
      const m = w.date.getMonth();
      const y = w.date.getFullYear();
      const key = `${y}-${m}`;
      if (!seen.has(key)) {
        seen.add(key);
        labels.push({ index: i, label: MONTHS_ES[m].slice(0, 3) });
      }
    });
    return labels;
  }, [weeks]);

  const CELL = 14;
  const GAP  = 2;
  const STEP = CELL + GAP;
  const svgW = weeks.length * STEP;
  const svgH = CELL + 20; // 20px for month labels above

  function cellColor(count) {
    if (!count) return "#2a3d38"; // fallback neutral dark — will be overridden by bdrL in light mode
    if (count === 1) return "#5DCAA5";
    if (count === 2) return "#1D9E75";
    return "#0F6E56";
  }

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: "block", minWidth: svgW }}
      >
        {/* Month labels */}
        {monthLabels.map(({ index, label }) => (
          <text
            key={label + index}
            x={index * STEP}
            y={11}
            style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fill: "#8a9e98" }}
          >
            {label}
          </text>
        ))}
        {/* Cells */}
        {weeks.map((w, i) => {
          const count = weekMap[w.key] || 0;
          return (
            <rect
              key={w.key}
              x={i * STEP}
              y={18}
              width={CELL}
              height={CELL}
              rx={3}
              ry={3}
              fill={count === 0 ? "#dce8e4" : cellColor(count)}
              style={{ transition: "fill .3s" }}
            >
              <title>{`${w.date.toLocaleDateString("es-MX", { day:"numeric", month:"short" })}: ${count} sesión${count !== 1 ? "es" : ""}`}</title>
            </rect>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, flexWrap:"wrap" }}>
        <span style={{ fontFamily:T.fB, fontSize:10, color:"#8a9e98" }}>Menos</span>
        {[0, 1, 2, 3].map(n => (
          <div
            key={n}
            style={{
              width: CELL, height: CELL, borderRadius: 3,
              background: n === 0 ? "#dce8e4" : cellColor(n),
            }}
          />
        ))}
        <span style={{ fontFamily:T.fB, fontSize:10, color:"#8a9e98" }}>Más</span>
      </div>
    </div>
  );
}

// ── Tooltip custom para recharts ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const PROG_LABEL = { 3:"Mejora", 2:"Estable", 1:"Retroceso" };
  const val = payload[0]?.value;
  return (
    <div style={{
      background: "#1a2b28",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: "8px 14px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
    }}>
      <div style={{ fontFamily: T.fB, fontSize: 11, color: "#8a9e98", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: T.fH, fontSize: 17, color: "#fff", fontWeight: 500, lineHeight: 1 }}>
        {val != null ? (PROG_LABEL[val] || val) : "—"}
      </div>
    </div>
  );
}

// ── Therapeutic adherence section ─────────────────────────────────────────────
function AdherenciaSection({ patients, sessions, isMobile }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // Patients activos options
  const activePatients = useMemo(
    () => patients.filter(p => (p.status || "activo") === "activo"),
    [patients]
  );

  const patientOptions = useMemo(() => [
    { value: "", label: "— Seleccionar paciente —" },
    ...activePatients.map(p => ({ value: p.id, label: (p.name || "Sin nombre").split(" ").slice(0, 3).join(" ") })),
  ], [activePatients]);

  // Last 10 sessions of selected patient, mapped to progress numeric
  const progressData = useMemo(() => {
    if (!selectedPatientId) return [];
    const PROG_MAP = { mejora: 3, estable: 2, retroceso: 1 };
    return sessions
      .filter(s => s.patientId === selectedPatientId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((s, i) => ({
        name: `S${i + 1}`,
        date: s.date,
        progreso: PROG_MAP[s.progress] ?? null,
      }));
  }, [selectedPatientId, sessions]);

  const heatmapMonths = isMobile ? 6 : 12;

  return (
    <>
      <SectionTitle
        icon={HeartPulse}
        title="Adherencia terapéutica"
        sub="Mapa de asistencia e hilo de progreso por paciente"
      />

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:16, marginBottom:20 }}>

        {/* ── Heatmap ── */}
        <Card style={{ padding:24, gridColumn: isMobile ? "1" : "1 / -1" }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 4px" }}>
            Mapa de asistencia
          </h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 16px" }}>
            Últimos {heatmapMonths} meses · intensidad por semana
          </p>
          <AttendanceHeatmap sessions={sessions} months={heatmapMonths} />
        </Card>

        {/* ── Selector + AreaChart ── */}
        <Card style={{ padding:24, gridColumn: isMobile ? "1" : "1 / -1" }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 16px" }}>
            Progreso terapéutico por paciente
          </h3>

          <Select
            label="Paciente"
            value={selectedPatientId}
            onChange={setSelectedPatientId}
            options={patientOptions}
          />

          {!selectedPatientId ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 16px", color:T.tl }}>
              <HeartPulse size={36} strokeWidth={1.2} style={{ marginBottom:12, opacity:0.3 }}/>
              <div style={{ fontFamily:T.fH, fontSize:18, color:T.tm, marginBottom:6, textAlign:"center" }}>
                Sin paciente seleccionado
              </div>
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>
                Selecciona un paciente para ver su progreso terapéutico
              </div>
            </div>
          ) : progressData.length === 0 ? (
            <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"20px 0" }}>
              Este paciente no tiene sesiones con progreso registrado.
            </div>
          ) : (
            <>
              {/* Y-axis tick labels reference */}
              <div style={{ display:"flex", gap:16, marginBottom:12, flexWrap:"wrap" }}>
                {[
                  { v:3, label:"Mejora",    c:"#2D9B91" },
                  { v:2, label:"Estable",   c:"#8a9e98" },
                  { v:1, label:"Retroceso", c:"#c97a7a" },
                ].map(item => (
                  <div key={item.v} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:item.c }}/>
                    <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={progressData} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="gradProg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2D9B91" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2D9B91" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis
                    dataKey="name"
                    tick={{ fontFamily:"system-ui", fontSize:11, fill:"#8a9e98" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[1, 3]}
                    ticks={[1, 2, 3]}
                    tickFormatter={v => ["", "Ret.", "Est.", "Mej."][v] || ""}
                    tick={{ fontFamily:"system-ui", fontSize:10, fill:"#8a9e98" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke:"rgba(45,155,145,0.2)", strokeWidth:2 }}/>
                  <Area
                    type="monotone"
                    dataKey="progreso"
                    stroke="#2D9B91"
                    strokeWidth={2.5}
                    fill="url(#gradProg)"
                    dot={{ fill:"#2D9B91", strokeWidth:0, r:4 }}
                    activeDot={{ fill:"#2D9B91", stroke:"#fff", strokeWidth:2, r:6 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:8 }}>
                Últimas {progressData.length} sesión{progressData.length !== 1 ? "es" : ""} con progreso registrado
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Stats({ patients = [], appointments = [], sessions = [], payments = [], services = [], riskAssessments = [], scaleResults = [] }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();
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

  // ── New patients by month ──
  const newPatientsByMonth = useMemo(() =>
    last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      return { label:m.label, value: patients.filter(p => (p.createdAt||"").startsWith(ms)).length };
    }), [last6, patients]);

  // ── Diagnosis distribution ──
  const diagDist = useMemo(() => {
    const map = {};
    patients.forEach(p => {
      const key = (p.diagnosis||"Sin diagnóstico").split("—")[0].split("–")[0].split("(")[0].trim().slice(0,45);
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

  // ── Income by service type ──
  const incomeByService = useMemo(() => {
    if (!services.length) return [];
    const map = {};
    payments.filter(p => p.status === "pagado").forEach(p => {
      const key = p.concept || "Otro";
      map[key] = (map[key] || 0) + Number(p.amount);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 6).map(([label, value]) => ({ label: label.length > 20 ? label.slice(0,18)+"…" : label, value }));
  }, [payments, services]);

  // ── Presencial vs Virtual breakdown ──
  const modalityBreakdown = useMemo(() => {
    const presencial = payments.filter(p => p.status === "pagado" && p.modality === "presencial").reduce((s,p) => s+Number(p.amount), 0);
    const virtual    = payments.filter(p => p.status === "pagado" && p.modality === "virtual").reduce((s,p) => s+Number(p.amount), 0);
    const sinDato    = payments.filter(p => p.status === "pagado" && !p.modality).reduce((s,p) => s+Number(p.amount), 0);
    return [
      { label:"Presencial", value:presencial, color:T.suc },
      { label:"Virtual",    value:virtual,    color:T.p   },
      ...(sinDato > 0 ? [{ label:"Sin dato", value:sinDato, color:T.tl }] : []),
    ].filter(d => d.value > 0);
  }, [payments]);

  // ── ① TASA DE ALTA ───────────────────────────────────────────────────────
  const totalPatients  = patients.length;
  const altaPatients   = patients.filter(p => p.status === "alta").length;
  const activoPatients = patients.filter(p => (p.status||"activo") === "activo").length;
  const tasaAlta       = totalPatients > 0 ? (altaPatients / totalPatients) * 100 : 0;

  const altaByMonth = useMemo(() => {
    const altaPats = patients.filter(p => p.status === "alta");
    return last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      const count = altaPats.filter(p => {
        const lastSess = [...sessions.filter(s => s.patientId === p.id)].sort((a,b) => b.date.localeCompare(a.date))[0];
        return lastSess?.date?.startsWith(ms);
      }).length;
      return { label:m.label, value:count };
    });
  }, [last6, patients, sessions]);

  const avgSessActivo = useMemo(() => {
    const pats = patients.filter(p => (p.status||"activo") === "activo");
    if (!pats.length) return 0;
    const total = pats.reduce((acc, p) => acc + sessions.filter(s => s.patientId === p.id).length, 0);
    return Math.round(total / pats.length);
  }, [patients, sessions]);

  const avgSessAlta = useMemo(() => {
    const pats = patients.filter(p => p.status === "alta");
    if (!pats.length) return 0;
    const total = pats.reduce((acc, p) => acc + sessions.filter(s => s.patientId === p.id).length, 0);
    return Math.round(total / pats.length);
  }, [patients, sessions]);

  // ── ② ADHERENCIA ────────────────────────────────────────────────────────
  const pastAppts = appointments.filter(a => a.date < fmt(todayDate));
  const completedAppts  = pastAppts.filter(a => a.status === "completed" || a.status === "realizada" ||
    sessions.some(s => s.patientId === a.patientId && s.date === a.date));
  const cancelledAppts  = pastAppts.filter(a => a.status === "cancelled" || a.status === "cancelada");
  const noShowAppts     = pastAppts.filter(a => a.status === "no-show" || a.status === "inasistencia");

  const totalPast       = pastAppts.length;
  const adherencia      = totalPast > 0 ? (completedAppts.length / totalPast) * 100 : 0;
  const tasaCancelacion = totalPast > 0 ? (cancelledAppts.length / totalPast) * 100 : 0;
  const tasaNoShow      = totalPast > 0 ? (noShowAppts.length / totalPast) * 100 : 0;

  const adherenciaByMonth = useMemo(() =>
    last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      const sched     = appointments.filter(a => a.date.startsWith(ms)).length;
      const realiz    = sessions.filter(s => s.date.startsWith(ms)).length;
      const cancelled = appointments.filter(a => a.date.startsWith(ms) && (a.status==="cancelled"||a.status==="cancelada")).length;
      return { label:m.label, completed:realiz, cancelled, pending: Math.max(0, sched - realiz - cancelled) };
    }), [last6, appointments, sessions]);

  // ── ③ CANCELACIONES ──────────────────────────────────────────────────────
  const cancByPatient = useMemo(() => {
    const map = {};
    appointments
      .filter(a => a.status === "cancelled" || a.status === "cancelada")
      .forEach(a => {
        const name = patients.find(p => p.id === a.patientId)?.name || a.patientName || "Desconocido";
        map[a.patientId] = { name, count: (map[a.patientId]?.count || 0) + 1 };
      });
    return Object.values(map).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [appointments, patients]);

  const cancByMonth = useMemo(() =>
    last6.map(m => {
      const ms = `${m.year}-${String(m.month+1).padStart(2,"0")}`;
      return {
        label: m.label,
        value: appointments.filter(a => a.date.startsWith(ms) && (a.status==="cancelled"||a.status==="cancelada")).length,
      };
    }), [last6, appointments]);

  const DIAG_COLORS = [T.p, T.acc, T.suc, "#6B5B9E", T.war, T.err];

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader title="Estadísticas" subtitle="Análisis de tu práctica clínica"/>

      {/* ══ KPI row ══════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:14, marginBottom:8 }}>
        <StatCard label="Pacientes activos"    value={activoPatients}           icon={Users}      color={T.p}   bg={T.pA}   />
        <StatCard label="Sesiones este mes"    value={monthSess}                icon={FileText}   color={T.acc} bg={T.accA} />
        <StatCard label="Ingresos este mes"    value={fmtCur(monthIncome)}      icon={DollarSign} color={T.suc} bg={T.sucA} />
        <StatCard label="Por sesión"   value={fmtCur(avgPerSession)}    icon={TrendingUp} color={T.p}   bg={T.pA}   sub="promedio histórico" />
        <StatCard label="Por cobrar"           value={fmtCur(pendingAmount)}    icon={Activity}   color={T.war} bg={T.warA} />
        <StatCard label="Total sesiones"       value={sessions.length}          icon={Award}      color={T.acc} bg={T.accA} sub="histórico" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px,1fr))", gap:20, marginBottom:20 }}>

        {/* Income chart */}
        <Card style={{ padding:24, gridColumn: isMobile ? "span 1" : "span 2" }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 4px" }}>Ingresos últimos 6 meses</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 20px" }}>Solo pagos confirmados</p>
          <BarChart data={incomeByMonth} color={T.p} height={120}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, fontFamily:T.fB, fontSize:12, color:T.tm }}>
            <span>Total 6M: <strong style={{color:T.t}}>{fmtCur(incomeByMonth.reduce((s,d)=>s+d.value,0))}</strong></span>
            <span>Promedio: <strong style={{color:T.t}}>{fmtCur(Math.round(incomeByMonth.reduce((s,d)=>s+d.value,0)/6))}</strong>/mes</span>
          </div>
        </Card>

        {/* Income by service type */}
        {incomeByService.length > 0 && (
          <Card style={{ padding:24 }}>
            <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 4px" }}>Ingresos por servicio</h3>
            <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 16px" }}>Solo pagos confirmados</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {incomeByService.map(({ label, value }) => {
                const max = incomeByService[0]?.value || 1;
                const pct = Math.round((value / max) * 100);
                return (
                  <div key={label}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontFamily:T.fB, fontSize:12, color:T.t, marginBottom:4 }}>
                      <span style={{ color:T.tm }}>{label}</span>
                      <strong>{fmtCur(value)}</strong>
                    </div>
                    <div style={{ height:6, borderRadius:99, background:T.bdrL, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, borderRadius:99, background:T.p, transition:"width .4s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Presencial vs Virtual */}
        {modalityBreakdown.length > 1 && (
          <Card style={{ padding:24 }}>
            <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 4px" }}>Presencial vs Virtual</h3>
            <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 16px" }}>Ingresos por modalidad</p>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <DonutChart slices={modalityBreakdown} size={100}/>
              <div style={{ flex:1 }}>
                {modalityBreakdown.map(d => (
                  <div key={d.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:d.color }}/>
                      <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{d.label}</span>
                    </div>
                    <strong style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{fmtCur(d.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

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
                    <span style={{ fontFamily:T.fB, fontSize:12, color:T.t, flex:1, paddingRight:8 }}>{diag}</span>
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
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>{p.sessions} {p.sessions === 1 ? "sesión" : "sesiones"}</div>
                </div>
                <div style={{ fontFamily:T.fH, fontSize:16, color:T.suc }}>{fmtCur(p.income)}</div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ① TASA DE ALTA TERAPÉUTICA
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionTitle icon={UserCheck} title="Tasa de alta terapéutica" sub="Pacientes que completaron el tratamiento"/>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px,1fr))", gap:16, marginBottom:20 }}>

        <Card style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <GaugeChart value={tasaAlta} max={100} color={T.suc} size={110} label={`${altaPatients}/${totalPatients}`}/>
            <div>
              <h3 style={{ fontFamily:T.fH, fontSize:17, color:T.t, margin:"0 0 4px" }}>Alta acumulada</h3>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
                {altaPatients} paciente{altaPatients!==1?"s":""} con alta<br/>de {totalPatients} registrados
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 4px" }}>Altas por mes</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 16px" }}>Basado en última sesión del paciente</p>
          <BarChart data={altaByMonth} color={T.suc} height={90}/>
        </Card>

        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 20px" }}>Sesiones promedio</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              { label:"Pacientes activos",  value:avgSessActivo, color:T.p,   bg:T.pA   },
              { label:"Pacientes con alta", value:avgSessAlta,   color:T.suc, bg:T.sucA },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:item.bg, borderRadius:12 }}>
                <span style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{item.label}</span>
                <span style={{ fontFamily:T.fH, fontSize:28, color:item.color, fontWeight:500, lineHeight:1 }}>
                  {item.value} <span style={{ fontSize:13, color:T.tl }}>ses.</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ② ADHERENCIA AL TRATAMIENTO
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionTitle icon={Calendar} title="Adherencia al tratamiento" sub="Asistencia a citas programadas"/>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px,1fr))", gap:16, marginBottom:20 }}>

        <Card style={{ padding:"16px 20px" }}>
          {totalPast === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"16px 0" }}>Sin citas pasadas registradas</div>
            : <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <GaugeChart value={adherencia} max={100} color={adherencia>=75?T.suc:adherencia>=50?T.war:T.err} size={110} label={`${completedAppts.length}/${totalPast}`}/>
                <div>
                  <h3 style={{ fontFamily:T.fH, fontSize:17, color:T.t, margin:"0 0 4px" }}>Tasa de asistencia</h3>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
                    {completedAppts.length} citas realizadas<br/>de {totalPast} pasadas
                  </div>
                </div>
              </div>
          }
        </Card>

        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 20px" }}>Desglose de citas pasadas</h3>
          {totalPast === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin datos aún</div>
            : [
              { label:"Realizadas",    value:completedAppts.length,   pct:Math.round(adherencia),      color:T.suc },
              { label:"Canceladas",    value:cancelledAppts.length,   pct:Math.round(tasaCancelacion), color:T.war },
              { label:"Inasistencias", value:noShowAppts.length,      pct:Math.round(tasaNoShow),      color:T.err },
            ].map(row => (
              <div key={row.label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{row.label}</span>
                  <span style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>{row.value} ({row.pct}%)</span>
                </div>
                <div style={{ height:6, background:T.bdrL, borderRadius:9999, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${row.pct}%`, background:row.color, borderRadius:9999, transition:"width .6s ease" }}/>
                </div>
              </div>
            ))
          }
        </Card>

        <Card style={{ padding:24, gridColumn: isMobile ? "span 1" : "span 1" }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 4px" }}>Asistencia por mes</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 16px" }}>Últimos 6 meses</p>
          <MultiBarChart
            data={adherenciaByMonth}
            series={[
              { key:"completed", color:T.suc,  label:"Realizadas" },
              { key:"cancelled", color:T.war,  label:"Canceladas" },
            ]}
            height={100}
          />
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ③ CANCELACIONES
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionTitle icon={XCircle} title="Cancelaciones" sub="Frecuencia y distribución por paciente"/>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px,1fr))", gap:16, marginBottom:32 }}>

        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 4px" }}>Cancelaciones por mes</h3>
          <p style={{ fontFamily:T.fB, fontSize:12, color:T.tl, margin:"0 0 16px" }}>Últimos 6 meses</p>
          <BarChart data={cancByMonth} color={T.war} height={90}/>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:10 }}>
            Total 6M: <strong style={{color:T.t}}>{cancByMonth.reduce((s,d)=>s+d.value,0)}</strong> cancelaciones
          </div>
        </Card>

        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 20px" }}>Pacientes con más cancelaciones</h3>
          {cancByPatient.length === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin cancelaciones registradas</div>
            : cancByPatient.map((p, i) => {
              const ptTotal = appointments.filter(a => a.status === "cancelled" || a.status === "cancelada").filter(a => a.patientId === Object.keys(
                appointments.reduce((m,a) => { if (a.status==="cancelled"||a.status==="cancelada") m[a.patientId]=(m[a.patientId]||0)+1; return m; }, {})
              )[i]).length;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:T.warA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:T.fH, fontSize:13, color:T.war, fontWeight:600 }}>{i+1}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{(p.name||"").split(" ").slice(0,2).join(" ")}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:T.fH, fontSize:20, color:T.war, fontWeight:500, lineHeight:1 }}>{p.count}</div>
                    <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl }}>cancel.</div>
                  </div>
                </div>
              );
            })
          }
        </Card>

        {/* ══ SECCIÓN CLÍNICA — FASE 4 ══════════════════════════════════════ */}
        {(riskAssessments.length > 0 || scaleResults.length > 0) && (
          <>
            <div style={{ gridColumn: "1 / -1" }}>
              <SectionTitle icon={ShieldAlert} title="Clínico" sub="Riesgo y escalas psicométricas"/>
            </div>

            {riskAssessments.length > 0 && (() => {
              const latestByPt = {};
              riskAssessments.forEach(r => {
                if (!latestByPt[r.patientId] || r.date > latestByPt[r.patientId].date)
                  latestByPt[r.patientId] = r;
              });
              const latest = Object.values(latestByPt);
              const levels = [
                { key:"inminente", label:"Inminente", color:"#B85050", bg:"rgba(184,80,80,0.12)"  },
                { key:"alto",      label:"Alto",       color:"#D97706", bg:"rgba(217,119,6,0.12)"  },
                { key:"moderado",  label:"Moderado",   color:"#B8900A", bg:"rgba(184,144,10,0.12)" },
                { key:"bajo",      label:"Bajo",       color:T.suc,    bg:T.sucA                   },
              ];
              return (
                <Card style={{ padding:24 }}>
                  <h3 style={{ fontFamily:T.fH, fontSize:16, color:T.t, margin:"0 0 16px" }}>
                    Distribución de riesgo <span style={{ fontSize:12, color:T.tl, fontFamily:T.fB }}>· último registro por paciente</span>
                  </h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {levels.map(lv => {
                      const count = latest.filter(r => r.riskLevel === lv.key).length;
                      const pct   = latest.length ? Math.round((count / latest.length) * 100) : 0;
                      return (
                        <div key={lv.key}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.t }}>{lv.label}</span>
                            <span style={{ fontFamily:T.fB, fontSize:12, color:lv.color, fontWeight:700 }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height:8, borderRadius:9999, background:T.bdrL, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:lv.color, borderRadius:9999, transition:"width .6s ease" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:14, padding:"8px 12px", background:T.cardAlt, borderRadius:10, fontFamily:T.fB, fontSize:11.5, color:T.tl }}>
                    {latest.length} paciente{latest.length !== 1 ? "s" : ""} evaluado{latest.length !== 1 ? "s" : ""} · {riskAssessments.length} evaluación{riskAssessments.length !== 1 ? "es" : ""} en total
                  </div>
                </Card>
              );
            })()}

            {scaleResults.length > 0 && (() => {
              const byScale = {};
              scaleResults.forEach(r => {
                const k = r.scaleName || r.scaleId || "Sin nombre";
                byScale[k] = (byScale[k] || 0) + 1;
              });
              const sorted = Object.entries(byScale).sort((a,b) => b[1]-a[1]).slice(0,6);
              const maxVal  = sorted[0]?.[1] || 1;
              return (
                <Card style={{ padding:24 }}>
                  <h3 style={{ fontFamily:T.fH, fontSize:16, color:T.t, margin:"0 0 16px" }}>
                    Escalas más aplicadas
                    <span style={{ fontSize:12, color:T.tl, fontFamily:T.fB }}> · {scaleResults.length} aplicación{scaleResults.length !== 1 ? "es" : ""} total</span>
                  </h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {sorted.map(([name, count]) => {
                      const pct = Math.round((count / maxVal) * 100);
                      return (
                        <div key={name}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.t, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"70%" }}>{name}</span>
                            <span style={{ fontFamily:T.fB, fontSize:12, color:T.p, fontWeight:700, flexShrink:0 }}>{count}×</span>
                          </div>
                          <div style={{ height:7, borderRadius:9999, background:T.bdrL, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:T.p, borderRadius:9999, opacity:0.7, transition:"width .6s ease" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })()}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ④ ADHERENCIA TERAPÉUTICA (heatmap + progreso por paciente)
      ══════════════════════════════════════════════════════════════════════ */}
      <AdherenciaSection patients={patients} sessions={sessions} isMobile={isMobile} />

      {/* ══════════════════════════════════════════════════════════════════════
          RESUMEN OPERATIVO
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px,1fr))", gap:16, marginBottom:32 }}>
        <Card style={{ padding:24 }}>
          <h3 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 20px" }}>Resumen operativo</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[
              { label:"Citas totales agendadas", value:appointments.length,                     color:T.p,   bg:T.pA   },
              { label:"Citas canceladas",         value:cancelledAppts.length,                  color:T.war, bg:T.warA },
              { label:"Inasistencias",            value:noShowAppts.length,                     color:T.err, bg:T.errA },
              { label:"Pacientes en alta",        value:altaPatients,                           color:T.suc, bg:T.sucA },
              { label:"Sesiones promedio/alta",   value:`${avgSessAlta} ses.`,                  color:T.tl,  bg:T.bdrL },
              { label:"Ingreso promedio/sesión",  value:fmtCur(avgPerSession),                  color:T.suc, bg:T.sucA },
            ].map(row => (
              <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:row.bg, borderRadius:10 }}>
                <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.t }}>{row.label}</span>
                <span style={{ fontFamily:T.fH, fontSize:18, color:row.color, fontWeight:500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
