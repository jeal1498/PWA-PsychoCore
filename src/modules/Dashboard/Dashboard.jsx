// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — Integrado al shell de la app                               ║
// ║  Sin Topbar / SideNav / BottomNav propios — los provee la app host          ║
// ║  Mobile (<640): KPIs 2col · stack vertical                                  ║
// ║  Tablet (640-1023): KPIs 2col · columna única                               ║
// ║  Desktop (≥1024): KPIs 4col · grid protagonista + soporte                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useState, useMemo, useEffect } from "react";
import { T } from "../../theme.js";
import { bus } from "../../lib/eventBus.js";
import { Card, Badge, Btn, EmptyState } from "../../components/ui/index.jsx";
import {
  Users, Calendar, FileText, DollarSign, CheckCircle2,
  Sparkles, AlertTriangle,
} from "lucide-react";
import { RISK_CONFIG } from "../RiskAssessment/riskAssessment.utils.js";
import { consentStatus } from "../Consent.jsx";
import { useDashboard } from "./useDashboard.js";
import {
  greeting, todayFormatted, daysBetween, resolveDisplayName,
  computeAbsentPatients, computeRiskItems, computeSidebarSummary,
  fmtDate, fmtCur,
} from "./dashboard.utils.js";

// ── Estilos globales ──────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_dash_v4__) {
  window.__pc_dash_v4__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap');

    @keyframes pc-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pc-bar   { from{width:0} }
    @keyframes pc-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes pc-glow  { 0%,100%{box-shadow:0 0 0 0 rgba(181,74,61,0)} 50%{box-shadow:0 0 0 5px rgba(181,74,61,.1)} }
    @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

    .pc-fu  { animation: pc-up .42s cubic-bezier(.22,1,.36,1) both; }
    .pc-d1  { animation-delay:.04s!important; }
    .pc-d2  { animation-delay:.08s!important; }
    .pc-d3  { animation-delay:.12s!important; }
    .pc-d4  { animation-delay:.16s!important; }
    .pc-d5  { animation-delay:.20s!important; }

    .pc-row:hover  { background:#F0ECE6!important; }
    .pc-kpi:hover  { transform:translateY(-1px)!important; box-shadow:0 4px 16px rgba(30,27,24,.06)!important; }
    .pc-lnk:hover  { color:#3D6B5A!important; }
    .pc-sc:hover   { background:#E4EEE9!important; border-color:#7AAE99!important; color:#3D6B5A!important; }
    .pc-sc-p:hover { background:#2e5344!important; }
    .pc-act:hover  { background:#8f590e!important; }

    /* Header gradient */
    .pc-header {
      background:linear-gradient(155deg,#243D33 0%,#3D6B5A 100%);
      padding:20px 20px 24px; position:relative; overflow:hidden;
      border-radius:14px; margin-bottom:2px;
    }
    .pc-header::before {
      content:''; position:absolute; top:-50px; right:-50px;
      width:200px; height:200px; border-radius:50%;
      background:rgba(255,255,255,.04); pointer-events:none;
    }
    .pc-header::after {
      content:''; position:absolute; bottom:-70px; left:-30px;
      width:240px; height:240px; border-radius:50%;
      background:rgba(255,255,255,.03); pointer-events:none;
    }
    /* Online/Offline badge */
    .pc-badge {
      display:inline-flex; align-items:center; gap:5px;
      border-radius:20px; padding:4px 12px;
      font-size:11px; font-weight:600; letter-spacing:.03em;
      backdrop-filter:blur(8px); animation:fadeUp .4s ease both;
    }
    .pc-badge-dot { width:6px; height:6px; border-radius:50%; }
    .pc-online  { background:rgba(125,206,160,.15); border:1px solid rgba(125,206,160,.35); color:#A8D5C0; }
    .pc-online  .pc-badge-dot { background:#7DCEA0; animation:pc-blink 2.2s ease infinite; }
    .pc-offline { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.45); }
    .pc-offline .pc-badge-dot { background:rgba(255,255,255,.3); }

    /* Shortcut cards */
    .pc-sc2 {
      display:flex; align-items:center; gap:10px;
      background:#fff; border:1px solid #EAE6E1; border-radius:13px;
      padding:12px 13px; cursor:pointer; text-align:left;
      transition:transform .15s, box-shadow .15s; width:100%;
    }
    .pc-sc2:hover  { transform:translateY(-1px); box-shadow:0 4px 16px rgba(30,25,20,.08); }
    .pc-sc2:active { transform:scale(.97); }

    /* Agenda rows */
    .pc-appt { display:flex; border-top:1px solid #F0EDE9; cursor:pointer; transition:background .12s; }
    .pc-appt:first-child { border-top:none; }
    .pc-appt:hover { background:#FDFBF8; }
    .pc-appt-active { background:#FFFBF4 !important; border-left:3px solid #C8860A; }

    /* Finance bar */
    .pc-fin-row  { display:grid; grid-template-columns:1fr 1fr 1fr; }
    .pc-fin-cell { padding:16px 12px; text-align:center; }
    .pc-fin-cell + .pc-fin-cell { border-left:1px solid #EAE6E1; }

    /* Attention tabs */
    .pc-attn-tab { padding:5px 12px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; }

    .pc-sc-bar::-webkit-scrollbar { display:none; }
    .pc-scroll::-webkit-scrollbar       { width:3px; }
    .pc-scroll::-webkit-scrollbar-thumb { background:#E4DDD6; border-radius:99px; }
  `;
  document.head.appendChild(s);
}

// ── Tokens — usan los colores del tema de la app cuando posible ───────────────
const D = {
  // Fondo transparente para integrarse al shell
  bg:      "transparent",
  surface: "#FDFBF8",
  alt:     "#F0ECE6",
  sage:    "#3D6B5A",
  sageL:   "#E4EEE9",
  sageM:   "#7AAE99",
  amber:   "#B8761E",
  amberL:  "#FBF0DC",
  coral:   "#B54A3D",
  coralL:  "#FAE8E6",
  stone:   "#1E1B18",
  slate:   "#5C5751",
  mist:    "#A8A29B",
  border:  "#E4DDD6",
  fH:      "'DM Serif Display',serif",
  fL:      "'Lora',serif",
  fB:      "'DM Sans',sans-serif",
};

// ── Hook breakpoint ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 640)  return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ── Primitivos ────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").slice(0,2).map(w => w[0]||"").join("").toUpperCase() || "?";
}

function Av({ name, size=32, color=D.sage, bg=D.sageL }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:bg, border:`1.5px solid ${color}33`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:D.fH, fontSize:size*.34, color, lineHeight:1,
    }}>{initials(name)}</div>
  );
}

function Tag({ children, color, bg }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", borderRadius:6,
      padding:"2px 8px", fontSize:10, fontWeight:700,
      whiteSpace:"nowrap", color, background:bg, fontFamily:D.fB,
    }}>{children}</span>
  );
}

function CardHd({ eyebrow, eyebrowColor, title, action, onAction }) {
  return (
    <div style={{
      padding:"13px 16px", borderBottom:`1px solid ${D.border}`,
      display:"flex", alignItems:"center", justifyContent:"space-between",
    }}>
      <div>
        <div style={{
          fontSize:10, fontWeight:700, letterSpacing:".09em",
          textTransform:"uppercase", color:eyebrowColor||D.mist,
          marginBottom:1, fontFamily:D.fB,
        }}>{eyebrow}</div>
        <div style={{ fontFamily:D.fH, fontSize:15, color:D.stone }}>{title}</div>
      </div>
      {action && (
        <button className="pc-lnk" onClick={onAction} style={{
          fontSize:11, fontWeight:600, color:D.mist,
          background:"none", border:"none", cursor:"pointer",
          fontFamily:D.fB, transition:"color .13s", flexShrink:0,
        }}>{action}</button>
      )}
    </div>
  );
}

// ── SHORTCUTS BAR — Grid 2×2 con tarjetas (DashboardPropuesta) ───────────────
function ShortcutsBar({ onQuickNav, onNewSession, patients, bp }) {
  const has = patients.length > 0;

  const items = [
    { icon:"👤", label:"Nuevo paciente", sub:"Registrar",   bg:"#EAF4EE", action:()=>onQuickNav("patients","add") },
    { icon:"📅", label:"Agendar cita",   sub:"Calendario",  bg:"#EDF2FB", action:()=>onQuickNav("agenda","add") },
    { icon:"▶",  label:"Iniciar sesión", sub:"En curso",    bg:"#FDF3E0", action:onNewSession, disabled:!has },
    { icon:"💳", label:"Registrar pago", sub:"Finanzas",    bg:"#F4F0FB", action:()=>onQuickNav("finance","add"), disabled:!has },
  ];

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr 1fr",
      gap:9, animation:"fadeUp .45s .1s ease both",
    }}>
      {items.map(item => (
        <button
          key={item.label}
          className="pc-sc2"
          disabled={item.disabled}
          onClick={item.action}
          style={{ opacity:item.disabled ? 0.45 : 1 }}
        >
          <div style={{
            width:34, height:34, borderRadius:9, flexShrink:0,
            background:item.bg, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:16,
          }}>{item.icon}</div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontFamily:D.fB, fontSize:11, fontWeight:600, color:D.stone, lineHeight:1.3 }}>{item.label}</div>
            <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist, marginTop:1 }}>{item.sub}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── SALUDO N0 — Header con gradiente (DashboardPropuesta) ────────────────────
function Welcome({ todayAppts, urgentCount, profile, googleUser, bp }) {
  const name   = resolveDisplayName(profile, googleUser);
  const isMob  = bp === "mobile";
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className="pc-header pc-fu">
      {/* Badge online/offline */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <div className={`pc-badge ${online ? "pc-online" : "pc-offline"}`}>
          <div className="pc-badge-dot"/>
          {online ? "Online" : "Offline"}
        </div>
      </div>

      {/* Fecha */}
      <div style={{
        fontSize:10, color:"rgba(255,255,255,.45)",
        letterSpacing:".07em", textTransform:"uppercase",
        marginBottom:5, fontFamily:D.fB,
      }}>{todayFormatted()}</div>

      {/* Saludo */}
      <div style={{
        fontFamily:D.fL, fontSize:isMob?21:25,
        fontWeight:400, color:"#fff", lineHeight:1.25,
      }}>
        {greeting()},&nbsp;
        <em style={{ fontStyle:"italic", color:"#A8D5C0" }}>{name}</em>
      </div>

      {/* Subtítulo */}
      <div style={{ fontFamily:D.fB, fontSize:12, color:"rgba(255,255,255,.5)", marginTop:6 }}>
        {todayAppts.length > 0
          ? `${todayAppts.length} cita${todayAppts.length>1?"s":""} hoy${urgentCount > 0 ? ` · ${urgentCount} alerta${urgentCount>1?"s":""}` : " · Todo en orden"}`
          : "Sin citas programadas hoy"}
      </div>
    </div>
  );
}

// ── KPIs N1 ───────────────────────────────────────────────────────────────────
function KpiStrip({ patients, sessions, todayAppts, urgentCount, payments, bp }) {
  const isMob = bp === "mobile";

  const { activePatients, completedToday, monthlyIncome } = useMemo(() => {
    const active = patients.filter(p => (p.status||"activo")==="activo").length;
    const compl  = todayAppts.filter(a => a.status==="completada").length;
    const now    = new Date();
    const mStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const income = payments
      .filter(p => p.date?.startsWith(mStr) && p.status==="pagado")
      .reduce((s,p) => s+(p.amount||0), 0);
    return { activePatients:active, completedToday:compl, monthlyIncome:income };
  }, [patients, todayAppts, payments]);

  const kpis = [
    { val:activePatients,                                   label:"Pacientes activos", icon:Users,         color:D.sage,  bg:D.sageL  },
    { val:`${completedToday}/${todayAppts.length}`,         label:"Sesiones hoy",      icon:CheckCircle2,  color:D.amber, bg:D.amberL },
    { val:urgentCount,                                      label:"Alertas activas",   icon:AlertTriangle, color:urgentCount>0?D.coral:D.sage, bg:urgentCount>0?D.coralL:D.sageL },
    { val:monthlyIncome>0?fmtCur(monthlyIncome):"—",        label:"Ingresos del mes",  icon:DollarSign,    color:D.sage,  bg:D.sageL, sm:true },
  ];

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns: isMob ? "repeat(2,1fr)" : "repeat(4,1fr)",
      gap:isMob ? 8 : 10,
    }}>
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className={`pc-kpi pc-fu pc-d${i+1}`} style={{
            background:D.surface, borderRadius:10, border:`1px solid ${D.border}`,
            padding:isMob?"11px 13px":"13px 16px",
            display:"flex", alignItems:"center", gap:isMob?9:12,
            transition:"transform .18s, box-shadow .18s", cursor:"default",
          }}>
            <div style={{
              width:isMob?30:34, height:isMob?30:34, borderRadius:8,
              background:k.bg, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Icon size={isMob?13:15} color={k.color} strokeWidth={1.8}/>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{
                fontFamily:D.fH,
                fontSize:k.sm?(isMob?15:18):(isMob?18:22),
                color:k.color, lineHeight:1, marginBottom:1,
              }}>{k.val}</div>
              <div style={{ fontFamily:D.fB, fontSize:isMob?9:10, color:D.mist, fontWeight:500, lineHeight:1.3 }}>{k.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AGENDA (protagonista) — Diseño DashboardPropuesta ────────────────────────
function AgendaWidget({ todayAppts, onStartSession, onNavigate, todayStr, nextAppt: nextApptProp, bp }) {
  const done = todayAppts.filter(a => a.status==="completada").length;

  const STATUS_MAP = {
    completada:          { label:"Completada", bg:"#EAF4EE", text:"#3D7A5E" },
    en_curso:            { label:"En curso",   bg:"#FDF3E0", text:"#A06A00" },
    pendiente:           { label:"Pendiente",  bg:"#F5F2EF", text:"#6B6560" },
    cancelada_paciente:  { label:"Cancelada",  bg:"#FAE8E6", text:"#B54A3D" },
    cancelada_psicologa: { label:"Cancelada",  bg:"#FAE8E6", text:"#B54A3D" },
    no_asistio:          { label:"No asistió", bg:"#FDF3E0", text:"#A06A00" },
  };

  if (todayAppts.length === 0) {
    return (
      <div style={{ background:D.surface, borderRadius:14, border:`1px solid ${D.border}`, overflow:"hidden" }}>
        <div style={{ padding:"13px 16px", borderBottom:`1px solid ${D.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontFamily:D.fB, fontSize:10, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:D.mist }}>🗓 Agenda de hoy</span>
          <button className="pc-lnk" onClick={()=>onNavigate("agenda")} style={{ fontSize:11, fontWeight:600, color:D.mist, background:"none", border:"none", cursor:"pointer", fontFamily:D.fB, transition:"color .13s" }}>Ver agenda →</button>
        </div>
        <div style={{ padding:"28px 18px", textAlign:"center" }}>
          <Calendar size={26} color={D.mist} strokeWidth={1.2} style={{ marginBottom:8 }}/>
          <p style={{ fontFamily:D.fB, fontSize:12, color:D.mist, margin:"0 0 12px" }}>No hay citas programadas.</p>
          <button onClick={()=>onNavigate("agenda")} style={{
            padding:"7px 16px", borderRadius:8, background:D.sage,
            color:"#fff", border:"none", fontFamily:D.fB, fontSize:12, fontWeight:600, cursor:"pointer",
          }}>Agendar cita</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:D.surface, borderRadius:14, border:`1px solid ${D.border}`, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${D.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:D.fB, fontSize:10, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:D.mist }}>
          🗓 Agenda de hoy · {done}/{todayAppts.length}
        </span>
        <button className="pc-lnk" onClick={()=>onNavigate("agenda")} style={{ fontSize:11, fontWeight:600, color:D.mist, background:"none", border:"none", cursor:"pointer", fontFamily:D.fB, transition:"color .13s" }}>Ver todo →</button>
      </div>

      {/* Citas */}
      {todayAppts.map((appt, i) => {
        const st     = STATUS_MAP[appt.status] || { label:appt.status, bg:D.alt, text:D.mist };
        const active = appt.status === "en_curso";
        const timeStr = appt.time || (appt.date ? appt.date.slice(11,16) : "");
        const [h, m]  = timeStr.split(":");
        const avBg    = active ? "#FDF3E0" : "#EAF4EE";
        const avClr   = active ? "#A06A00" : "#3D6B5A";

        return (
          <div
            key={appt.id||i}
            className={`pc-appt${active ? " pc-appt-active" : ""}`}
            onClick={()=>onStartSession&&onStartSession(appt)}
            style={{ alignItems:"center" }}
          >
            {/* Hora */}
            <div style={{ width:50, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"12px 4px" }}>
              <div style={{ fontFamily:D.fL, fontSize:15, color:active?"#A06A00":D.stone, lineHeight:1 }}>{h}</div>
              <div style={{ fontFamily:D.fB, fontSize:10, color:"#C5BFB9", fontWeight:500, marginTop:1 }}>{m}</div>
            </div>
            {/* Info */}
            <div style={{ flex:1, padding:"10px 12px", minWidth:0 }}>
              <div style={{ fontFamily:D.fB, fontSize:13, fontWeight:600, color:D.stone, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {appt.patientName||"Paciente"}
              </div>
              <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist, marginTop:2 }}>
                {appt.type||appt.serviceTitle||"Sesión"}
              </div>
            </div>
            {/* Derecha: avatar + badge */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", justifyContent:"center", padding:"10px 13px 10px 4px", gap:5, flexShrink:0 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:D.fL, fontSize:10, fontWeight:600, background:avBg, color:avClr, border:`1.5px solid ${avClr}22` }}>
                {initials(appt.patientName||"?")}
              </div>
              <div style={{ fontFamily:D.fB, fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20, whiteSpace:"nowrap", background:st.bg, color:st.text }}>
                {st.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* Siguiente cita */}
      {nextApptProp && (
        <div onClick={()=>onNavigate("agenda")} style={{
          display:"flex", alignItems:"center", gap:11,
          padding:"13px 14px", borderTop:`1px dashed ${D.border}`,
          background:"linear-gradient(90deg,#F2EEE9,#FDFBF8)",
          cursor:"pointer", transition:"background .15s",
        }}
        onMouseEnter={e=>e.currentTarget.style.background="#EDE9E3"}
        onMouseLeave={e=>e.currentTarget.style.background="linear-gradient(90deg,#F2EEE9,#FDFBF8)"}
        >
          <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:"#EDF2FB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>📆</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:D.fB, fontSize:9, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:D.mist, marginBottom:3 }}>Siguiente cita</div>
            <div style={{ fontFamily:D.fB, fontSize:13, fontWeight:600, color:D.stone }}>{nextApptProp.patientName||"Paciente"}</div>
            <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist, marginTop:2 }}>
              {nextApptProp.date} · {nextApptProp.time||""} · {nextApptProp.type||"Sesión"}
            </div>
          </div>
          <div style={{
            marginLeft:"auto", flexShrink:0,
            background:"#EDF2FB", color:"#3B5EA6", border:"1px solid #C8D6F5",
            fontFamily:D.fB, fontSize:10, fontWeight:700, padding:"4px 11px", borderRadius:20,
          }}>
            {(()=>{
              const days = nextApptProp.date ? daysBetween(todayStr, nextApptProp.date) : null;
              if (days===0) return "Hoy";
              if (days===1) return "Mañana";
              return days!=null ? `En ${days}d` : "Próximo";
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
function ComplianceChecklist({ patients, pendingTasks, sessions, onNavigate }) {
  const tasks = useMemo(() => {
    const r = [];
    patients.forEach(p => {
      const last = sessions.filter(s=>s.patientId===p.id).sort((a,b)=>b.date?.localeCompare(a.date))[0];
      if (last && !last.note) r.push({ label:`Nota — ${(p.name||"").split(" ")[0]}`, urgent:true });
      if (consentStatus(p)==="pendiente") r.push({ label:`Consentimiento — ${(p.name||"").split(" ")[0]}`, urgent:true });
    });
    (pendingTasks||[]).forEach(t => r.push({ label:t.label, urgent:false }));
    return r.slice(0,6);
  }, [patients, sessions, pendingTasks]);

  const [checked, setChecked] = useState({});
  const done  = Object.values(checked).filter(Boolean).length;
  const total = tasks.length;
  const pct   = total>0 ? Math.round(done/total*100) : 100;

  if (total===0) return null;

  return (
    <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, overflow:"hidden" }}>
      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${D.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:D.fB, fontSize:10, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:D.mist, marginBottom:1 }}>✅ Cumplimiento</div>
          <div style={{ fontFamily:D.fH, fontSize:15, color:D.stone }}>Tareas del día</div>
        </div>
        <span style={{ fontFamily:D.fB, fontSize:11, fontWeight:700, color:D.sage }}>{done}/{total}</span>
      </div>

      {tasks.map((t, i) => {
        const isDone = !!checked[i];
        return (
          <div key={i} className="pc-row" onClick={()=>setChecked(c=>({...c,[i]:!c[i]}))} style={{
            display:"flex", alignItems:"flex-start", gap:8,
            padding:"8px 16px",
            borderTop:i>0?`1px solid ${D.border}`:"none",
            cursor:"pointer", transition:"background .12s", opacity:isDone?.42:1,
          }}>
            <div style={{
              width:14, height:14, borderRadius:4, flexShrink:0, marginTop:1,
              border:`1.5px solid ${isDone?D.sage:t.urgent?D.coral:D.border}`,
              background:isDone?D.sage:"transparent",
              display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s",
            }}>
              {isDone && <span style={{ fontSize:8, color:"#fff" }}>✓</span>}
            </div>
            <span style={{
              fontFamily:D.fB, fontSize:12, color:D.stone, lineHeight:1.4, flex:1,
              textDecoration:isDone?"line-through":"none",
            }}>{t.label}</span>
            {t.urgent && !isDone && (
              <span style={{ fontFamily:D.fB, fontSize:10, fontWeight:700, color:D.coral, flexShrink:0, marginTop:2 }}>!</span>
            )}
          </div>
        );
      })}

      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px 11px", borderTop:`1px solid ${D.border}` }}>
        <div style={{ flex:1, height:3, background:D.border, borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", background:D.sage, borderRadius:99, width:`${pct}%`, transition:"width .4s ease" }}/>
        </div>
        <span style={{ fontFamily:D.fB, fontSize:10, fontWeight:700, color:D.sage, flexShrink:0 }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── NOTAS RECIENTES ───────────────────────────────────────────────────────────
function RecentNotes({ sessions, patients, onNavigate }) {
  const notes = useMemo(()=>
    sessions.filter(s=>s.note).sort((a,b)=>b.date?.localeCompare(a.date)).slice(0,3)
      .map(s=>{
        const pt=patients.find(p=>p.id===s.patientId);
        return { name:pt?.name||"Paciente", date:fmtDate(s.date), preview:(s.note||"").slice(0,50) };
      }),
  [sessions,patients]);

  if (notes.length===0) return null;

  return (
    <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, overflow:"hidden" }}>
      <CardHd eyebrow="📝 Notas clínicas" title="Recientes" action="Ver todas →" onAction={()=>onNavigate("sessions")}/>
      {notes.map((n, i) => (
        <div key={i} className="pc-row" onClick={()=>onNavigate("sessions")} style={{
          display:"flex", gap:8, padding:"8px 16px",
          borderTop:i>0?`1px solid ${D.border}`:"none",
          cursor:"pointer", transition:"background .12s",
        }}>
          <Av name={n.name} size={24}/>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:D.fB, fontSize:12, fontWeight:600, color:D.stone }}>{n.name}</div>
            <div style={{ fontFamily:D.fB, fontSize:11, color:D.mist, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.preview}…</div>
            <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist, marginTop:1 }}>{n.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FINANCE BAR — Mes en números (DashboardPropuesta) ────────────────────────
function FinanceBar({ patients, sessions, payments, onNavigate }) {
  const { activePatients, thisMonthSessions, monthlyIncome } = useMemo(
    ()=>computeSidebarSummary({patients,sessions,payments}),
    [patients,sessions,payments]
  );
  const attendance = useMemo(()=>{
    const now = new Date();
    const mStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const monthlySess = sessions.filter(s=>s.date?.startsWith(mStr));
    const comp = monthlySess.filter(s=>s.status==="completada").length;
    return monthlySess.length>0 ? Math.round(comp/monthlySess.length*100) : 0;
  }, [sessions]);

  return (
    <div style={{ background:D.surface, borderRadius:14, border:`1px solid ${D.border}`, overflow:"hidden" }}>
      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${D.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:D.fB, fontSize:10, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:D.mist }}>📈 Mes en números</span>
        <button className="pc-lnk" onClick={()=>onNavigate("reports")} style={{ fontSize:11, fontWeight:600, color:D.mist, background:"none", border:"none", cursor:"pointer", fontFamily:D.fB, transition:"color .13s" }}>Reportes →</button>
      </div>
      <div className="pc-fin-row">
        <div className="pc-fin-cell">
          <div style={{ fontFamily:D.fL, fontSize:17, color:D.stone, lineHeight:1 }}>{monthlyIncome>0?fmtCur(monthlyIncome):"—"}</div>
          <div style={{ fontFamily:D.fB, fontSize:9, color:D.mist, fontWeight:600, marginTop:4, letterSpacing:".05em", textTransform:"uppercase" }}>Ingresos</div>
        </div>
        <div className="pc-fin-cell">
          <div style={{ fontFamily:D.fL, fontSize:17, color:D.stone, lineHeight:1 }}>{thisMonthSessions}</div>
          <div style={{ fontFamily:D.fB, fontSize:9, color:D.mist, fontWeight:600, marginTop:4, letterSpacing:".05em", textTransform:"uppercase" }}>Sesiones</div>
        </div>
        <div className="pc-fin-cell">
          <div style={{ fontFamily:D.fL, fontSize:17, color:D.stone, lineHeight:1 }}>{attendance}%</div>
          <div style={{ fontFamily:D.fB, fontSize:9, color:D.mist, fontWeight:600, marginTop:4, letterSpacing:".05em", textTransform:"uppercase" }}>Asistencia</div>
        </div>
      </div>
    </div>
  );
}

// ── ATENCIÓN REQUERIDA — Tabs unificados (DashboardPropuesta) ─────────────────
function AttentionWidget({ patients, sessions, riskAssessments, pendingTasks, todayStr, onNavigate }) {
  const [tab, setTab] = useState("risk");

  const riskItems = useMemo(()=>computeRiskItems(riskAssessments),[riskAssessments]);
  const absent    = useMemo(()=>computeAbsentPatients({patients,sessions}),[patients,sessions]);

  // Pendientes: consentimientos + planes + ausentes
  const pendingList = useMemo(()=>{
    const noConsent = patients.filter(p => {
      try { return consentStatus(p)==="pendiente"; } catch { return false; }
    }).length;
    const list = [];
    if (noConsent>0)     list.push({ label:"Consentimientos sin firmar",        count:noConsent,          icon:"📄", color:D.coral, bg:D.coralL });
    if (pendingTasks>0)  list.push({ label:"Planes de tratamiento incompletos", count:pendingTasks,       icon:"📋", color:D.amber, bg:D.amberL });
    if (absent.length>0) list.push({ label:"Pacientes sin sesión reciente",     count:absent.length,      icon:"👤", color:"#5C6B8A", bg:"#EDF2FB" });
    return list;
  }, [patients, sessions, pendingTasks, absent]);

  const totalPending = pendingList.reduce((s,p)=>s+p.count, 0);
  const riskCount    = riskItems.length + absent.length;

  if (riskCount===0 && totalPending===0) return null;

  const tabs = [
    { key:"risk",    label:`Radar de riesgo (${riskCount})` },
    { key:"pending", label:`Pendientes (${totalPending})` },
  ];

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {tabs.map(t=>(
          <button
            key={t.key}
            className="pc-attn-tab"
            onClick={()=>setTab(t.key)}
            style={{
              border:"1px solid",
              background: tab===t.key ? D.sage    : "#fff",
              color:      tab===t.key ? "#fff"    : D.mist,
              borderColor:tab===t.key ? D.sage    : D.border,
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab==="risk" && (
        <div style={{ background:D.surface, borderRadius:14, border:`1px solid ${D.border}`, overflow:"hidden" }}>
          {riskItems.length===0 && absent.length===0
            ? <div style={{ padding:22, textAlign:"center", fontFamily:D.fB, fontSize:12, color:D.mist }}>Sin alertas de riesgo activas ✓</div>
            : <>
              {riskItems.map((a,i)=>{
                const pt=patients.find(p=>p.id===a.patientId);
                const isHigh=a.riskLevel==="inminente"||a.riskLevel==="alto";
                const bg = isHigh?D.coralL:D.amberL;
                const cl = isHigh?D.coral:D.amber;
                return (
                  <div key={a.id||i} className="pc-row" onClick={()=>onNavigate("risk")} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderTop:i>0?`1px solid ${D.border}`:"none", cursor:"pointer", transition:"background .12s" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:D.fL, fontSize:11, fontWeight:600, background:bg, color:cl, border:`1.5px solid ${cl}22`, flexShrink:0 }}>
                      {initials(pt?.name||"P")}
                    </div>
                    <div>
                      <div style={{ fontFamily:D.fB, fontSize:12, fontWeight:600, color:D.stone }}>{(pt?.name||"Paciente").split(" ").slice(0,2).join(" ")}</div>
                      <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist, marginTop:1 }}>Evaluado {fmtDate(a.date)}</div>
                    </div>
                    <div style={{ marginLeft:"auto", fontFamily:D.fB, fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20, background:bg, color:cl, flexShrink:0 }}>
                      {a.riskLevel?.charAt(0).toUpperCase()+(a.riskLevel?.slice(1)||"")}
                    </div>
                  </div>
                );
              })}
              {absent.map((p,i)=>{
                const days=p.lastSession?daysBetween(p.lastSession,todayStr):null;
                return (
                  <div key={p.id||i} className="pc-row" onClick={()=>onNavigate("patients")} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderTop:`1px solid ${D.border}`, cursor:"pointer", transition:"background .12s" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:D.fL, fontSize:11, fontWeight:600, background:D.amberL, color:D.amber, border:`1.5px solid ${D.amber}22`, flexShrink:0 }}>
                      {initials(p.name||"")}
                    </div>
                    <div>
                      <div style={{ fontFamily:D.fB, fontSize:12, fontWeight:600, color:D.stone }}>{(p.name||"Paciente").split(" ").slice(0,2).join(" ")}</div>
                      <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist, marginTop:1 }}>Sin sesión reciente</div>
                    </div>
                    <div style={{ marginLeft:"auto", fontFamily:D.fB, fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20, background:D.amberL, color:D.amber, flexShrink:0 }}>
                      {days!=null?`${days}d`:"21d+"}
                    </div>
                  </div>
                );
              })}
            </>
          }
        </div>
      )}

      {tab==="pending" && (
        <div style={{ background:D.surface, borderRadius:14, border:`1px solid ${D.border}`, overflow:"hidden" }}>
          {pendingList.length===0
            ? <div style={{ padding:22, textAlign:"center", fontFamily:D.fB, fontSize:12, color:D.mist }}>Sin tareas pendientes ✓</div>
            : pendingList.map((p,i)=>(
              <div key={p.label} className="pc-row" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderTop:i>0?`1px solid ${D.border}`:"none", transition:"background .12s" }}>
                <div style={{ width:32, height:32, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, background:p.bg, flexShrink:0 }}>{p.icon}</div>
                <div style={{ fontFamily:D.fB, fontSize:12, fontWeight:500, color:D.stone, flex:1, lineHeight:1.3 }}>{p.label}</div>
                <div style={{ fontFamily:D.fB, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:p.bg, color:p.color, flexShrink:0 }}>{p.count}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── WELCOME GUIDE (sin pacientes) ─────────────────────────────────────────────
function WelcomeGuide({ onNavigate, bp }) {
  const isMob = bp === "mobile";
  const steps = [
    { num:1, title:"Registra tu primer paciente", desc:"Agrega datos, historial y motivo de consulta.", icon:Users,    color:D.sage,  bg:D.sageL,  btn:"Nuevo paciente", mod:"patients" },
    { num:2, title:"Agenda su primera cita",      desc:"Programa la sesión inicial en el calendario.",  icon:Calendar, color:D.amber, bg:D.amberL, btn:"Ir a Agenda",    mod:"agenda"   },
    { num:3, title:"Registro automático",         desc:"PsychoCore enviará confirmación automáticamente.", icon:FileText,color:D.mist,bg:D.alt,    btn:null,             mod:null       },
  ];
  return (
    <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, padding:isMob?"24px 16px":"36px 28px", textAlign:"center" }}>
      <div style={{ width:44, height:44, borderRadius:11, background:D.sageL, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
        <Sparkles size={19} color={D.sage} strokeWidth={1.5}/>
      </div>
      <h2 style={{ fontFamily:D.fH, fontSize:isMob?20:24, fontWeight:400, color:D.stone, margin:"0 0 6px" }}>¡Bienvenido a PsychoCore!</h2>
      <p style={{ fontFamily:D.fB, fontSize:12, color:D.mist, margin:"0 auto 20px", maxWidth:340, lineHeight:1.7 }}>
        Sigue estos pasos para comenzar a gestionar tu práctica clínica.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:isMob?"1fr":"repeat(3,1fr)", gap:10, textAlign:"left" }}>
        {steps.map(step=>{
          const Icon=step.icon;
          return (
            <div key={step.num} style={{ background:D.alt, border:`1px solid ${D.border}`, borderRadius:10, padding:"13px 12px", display:"flex", flexDirection:"column", gap:7 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:step.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={12} color={step.color} strokeWidth={1.8}/>
              </div>
              <p style={{ fontFamily:D.fB, fontSize:12, fontWeight:600, color:D.stone, margin:0 }}>{step.title}</p>
              <p style={{ fontFamily:D.fB, fontSize:11, color:D.mist, lineHeight:1.5, margin:0 }}>{step.desc}</p>
              {step.btn && (
                <button onClick={()=>onNavigate(step.mod)} style={{
                  marginTop:"auto", padding:"5px 10px", borderRadius:6,
                  background:step.bg, border:`1px solid ${step.color}33`,
                  color:step.color, fontFamily:D.fB, fontSize:11, fontWeight:600, cursor:"pointer",
                }}>{step.btn}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// Sin Topbar / SideNav / BottomNav propios — la app host los provee
// Este componente ocupa el 100% del área de contenido que le asigna la app
// ══════════════════════════════════════════════════════════════════════════════
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
  const bp = useBreakpoint();

  const {
    isMobile, isWide, gridGap, todayStr,
    pendingTasks, todayAppts, nextAppt, urgentCount,
  } = useDashboard({ patients, appointments, sessions, payments, riskAssessments, assignments });

  const hasPatients = patients.length > 0;
  const isMob = bp === "mobile";
  const isTab = bp === "tablet";
  const isDsk = bp === "desktop";

  const pad = isMob ? "12px 14px" : isTab ? "16px 20px" : "20px 28px";
  const gap = isMob ? 10 : 12;

  return (
    // Sin background propio: hereda el fondo del shell de la app
    <div className="pc-scroll" style={{
      width:"100%", height:"100%",
      overflowY:"auto",
      padding:pad,
      display:"flex", flexDirection:"column", gap,
      fontFamily:D.fB, boxSizing:"border-box",
    }}>

      {/* N0: Saludo */}
      <Welcome
        todayAppts={todayAppts} urgentCount={urgentCount}
        profile={profile} googleUser={googleUser} bp={bp}
      />

      {/* Shortcuts — sin fondo de barra, integrados al flujo */}
      <ShortcutsBar
        onQuickNav={onQuickNav} onNewSession={onNewSession}
        patients={patients} bp={bp}
      />

      {/* N1: KPIs */}
      {hasPatients && (
        <KpiStrip
          patients={patients} sessions={sessions}
          todayAppts={todayAppts} urgentCount={urgentCount}
          payments={payments} bp={bp}
        />
      )}

      {/* N2: Contenido principal */}
      {!hasPatients ? (
        <WelcomeGuide onNavigate={onNavigate} bp={bp}/>

      ) : (isMob || isTab) ? (
        /* Mobile & Tablet: columna única */
        <div className="pc-fu pc-d3" style={{ display:"flex", flexDirection:"column", gap }}>
          <AgendaWidget
            todayAppts={todayAppts} onStartSession={onStartSession}
            onNavigate={onNavigate} todayStr={todayStr}
            nextAppt={nextAppt} bp={bp}
          />
          <FinanceBar patients={patients} sessions={sessions} payments={payments} onNavigate={onNavigate}/>
          <AttentionWidget
            patients={patients} sessions={sessions} riskAssessments={riskAssessments}
            pendingTasks={pendingTasks} todayStr={todayStr} onNavigate={onNavigate}
          />
          {isTab && (
            <RecentNotes sessions={sessions} patients={patients} onNavigate={onNavigate}/>
          )}
        </div>

      ) : (
        /* Desktop: grid protagonista + soporte */
        <div className="pc-fu pc-d3" style={{
          display:"grid", gridTemplateColumns:"1fr 300px",
          gap:14, alignItems:"start",
        }}>
          <AgendaWidget
            todayAppts={todayAppts} onStartSession={onStartSession}
            onNavigate={onNavigate} todayStr={todayStr}
            nextAppt={nextAppt} bp={bp}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="pc-fu pc-d2">
              <FinanceBar patients={patients} sessions={sessions} payments={payments} onNavigate={onNavigate}/>
            </div>
            <div className="pc-fu pc-d3">
              <AttentionWidget
                patients={patients} sessions={sessions} riskAssessments={riskAssessments}
                pendingTasks={pendingTasks} todayStr={todayStr} onNavigate={onNavigate}
              />
            </div>
            <div className="pc-fu pc-d4">
              <RecentNotes sessions={sessions} patients={patients} onNavigate={onNavigate}/>
            </div>
            <div className="pc-fu pc-d5">
              <ComplianceChecklist patients={patients} pendingTasks={pendingTasks} sessions={sessions} onNavigate={onNavigate}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
