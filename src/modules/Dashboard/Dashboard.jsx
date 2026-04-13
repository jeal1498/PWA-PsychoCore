// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Dashboard.jsx — Diseño adoptado de DashboardPropuesta                      ║
// ║  Layout: header full-width · shortcuts 2×2 · secciones con d-sec           ║
// ║  Sin Topbar / SideNav / BottomNav propios — los provee la app host          ║
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

// ── Estilos globales (clases .d-* de DashboardPropuesta) ─────────────────────
if (typeof document !== "undefined" && !window.__pcd__) {
  window.__pcd__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes pc-bar { from{width:0} }

    /* ── CSS Variables: light (default) ── */
    :root {
      --d-bg:        #FDFBF8;
      --d-bg2:       #F5F2EE;
      --d-bg3:       #F0ECE6;
      --d-surface:   #fff;
      --d-bdr:       #EAE6E1;
      --d-bdr2:      #E4DDD6;
      --d-txt:       #1E1B18;
      --d-txt2:      #2B2825;
      --d-muted:     #A8A29B;
      --d-accent:    #3D6B5A;
      --d-hover:     #FDFBF8;
      --d-kpi-bg:    #FDFBF8;
      --d-next-bg:   linear-gradient(90deg,#F2EEE9,#FDFBF8);
      --d-next-hover:#EDE9E3;
      --d-next-bdr:  #D4CFC9;
      --d-scroll:    #E4DDD6;
    }
    /* ── CSS Variables: dark ── */
    [data-theme="dark"] {
      --d-bg:        #111614;
      --d-bg2:       #1C2120;
      --d-bg3:       #222927;
      --d-surface:   #1C2120;
      --d-bdr:       #2A3330;
      --d-bdr2:      #2F3A37;
      --d-txt:       #EAE6E0;
      --d-txt2:      #C8C2BA;
      --d-muted:     #5A6B67;
      --d-accent:    #7DBFA0;
      --d-hover:     #222927;
      --d-kpi-bg:    #1C2120;
      --d-next-bg:   linear-gradient(90deg,#1C2120,#222927);
      --d-next-hover:#263330;
      --d-next-bdr:  #2A3330;
      --d-scroll:    #2A3330;
    }

    .d-root { font-family:'DM Sans',sans-serif; width:100%; min-height:100%; overflow-y:auto; padding-bottom:40px; box-sizing:border-box; background:var(--d-bg); margin:0; }

    /* Header */
    .d-header { background:var(--d-bg); padding:24px 20px 22px; position:relative; overflow:hidden; }
    .d-date  { font-size:10px; color:var(--d-muted); letter-spacing:.07em; text-transform:uppercase; margin-bottom:5px; }
    .d-greet { font-family:'Lora',serif; font-size:23px; font-weight:400; color:var(--d-txt); line-height:1.25; animation:fadeUp .45s .06s ease both; }
    .d-greet em { font-style:italic; color:var(--d-accent); }

    /* Shortcuts grid — 4 cols, icono arriba */
    .d-shortcuts { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:12px 16px 16px; animation:fadeUp .45s .1s ease both; }
    .d-sc {
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px;
      background:var(--d-bg2); border:none; outline:none; border-radius:13px;
      padding:14px 6px 12px; cursor:pointer; text-align:center;
      transition:transform .15s, box-shadow .15s;
    }
    .d-sc:hover  { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,.12); }
    .d-sc:active { transform:scale(.97); }
    .d-sc:disabled { opacity:.45; cursor:default; }
    .d-sc-ico  { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:17px; }
    .d-sc-name { font-size:10px; font-weight:600; color:var(--d-txt2); line-height:1.3; }
    .d-sc-sub  { font-size:10px; color:var(--d-muted); margin-top:1px; }

    /* Sections */
    .d-sec     { padding:0 20px; margin-bottom:20px; animation:fadeUp .45s ease both; }
    .d-sec-hd  { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .d-sec-lbl { font-size:10px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--d-muted); }
    .d-sec-btn { font-size:11px; font-weight:600; color:var(--d-accent); background:none; border:none; cursor:pointer; }
    .d-divider { height:1px; background:var(--d-bdr); margin:0 20px 20px; }

    /* KPI strip */
    .d-kpis    { display:grid; gap:8px; padding:0 20px; margin-bottom:20px; animation:fadeUp .45s .08s ease both; }
    .d-kpi     { background:var(--d-kpi-bg); border:none; border-radius:10px; padding:11px 13px; display:flex; align-items:center; gap:9px; transition:transform .18s, box-shadow .18s; }
    .d-kpi:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,.1); }
    .d-kpi-ico { border-radius:8px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .d-kpi-val { font-family:'Lora',serif; color:var(--d-txt); line-height:1; }
    .d-kpi-lbl { font-size:10px; color:var(--d-muted); margin-top:2px; }

    /* Agenda */
    .d-agenda { background:var(--d-surface); border:1px solid var(--d-bdr); border-radius:14px; overflow:hidden; }
    .d-appt   { display:flex; border-top:1px solid var(--d-bdr); cursor:pointer; transition:background .12s; }
    .d-appt:first-child { border-top:none; }
    .d-appt:hover { background:var(--d-hover); }
    .d-active { background:#2A2010 !important; border-left:3px solid #C8860A; }
    .d-next-up { background:rgba(94,207,160,.06) !important; border-left:3px solid #5ECFA0; cursor:pointer; }

    /* Scrollable agenda — sin scrollbar visible */
    .d-agenda-scroll { overflow-y:auto; overflow-x:hidden; }
    .d-agenda-scroll::-webkit-scrollbar { display:none; }
    .d-agenda-scroll { -ms-overflow-style:none; scrollbar-width:none; }
    .d-time   { width:50px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px 4px; }
    .d-time-h { font-family:'Lora',serif; font-size:15px; color:var(--d-txt2); line-height:1; }
    .d-time-m { font-size:10px; color:var(--d-muted); font-weight:500; margin-top:1px; }
    .d-active .d-time-h { color:#C8860A; }
    .d-abody  { flex:1; padding:10px 12px; min-width:0; }
    .d-aname  { font-size:13px; font-weight:600; color:var(--d-txt2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .d-atype  { font-size:10px; color:var(--d-muted); margin-top:2px; }
    .d-aright { display:flex; flex-direction:column; align-items:flex-end; justify-content:center; padding:10px 13px 10px 4px; gap:5px; flex-shrink:0; }
    .d-av     { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Lora',serif; font-size:10px; font-weight:600; }
    .d-stag   { font-size:9px; font-weight:700; padding:2px 7px; border-radius:20px; white-space:nowrap; }

    /* Next appointment banner */
    .d-next   {
      display:flex; align-items:center; gap:11px;
      padding:13px 14px; border-top:1px dashed var(--d-next-bdr);
      background:var(--d-next-bg);
      cursor:pointer; transition:background .15s;
    }
    .d-next:hover { background:var(--d-next-hover); }
    .d-next-ico     { width:38px; height:38px; border-radius:10px; flex-shrink:0; background:#EDF2FB; display:flex; align-items:center; justify-content:center; font-size:17px; }
    .d-next-eyebrow { font-size:9px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--d-muted); margin-bottom:3px; }
    .d-next-name    { font-size:13px; font-weight:600; color:var(--d-txt2); }
    .d-next-meta    { font-size:10px; color:var(--d-muted); margin-top:2px; }
    .d-next-pill    {
      margin-left:auto; flex-shrink:0;
      background:#EDF2FB; color:#3B5EA6; border:1px solid #C8D6F5;
      font-size:10px; font-weight:700; padding:4px 11px; border-radius:20px;
    }

    /* Finance */
    .d-finance  { background:var(--d-surface); border:1px solid var(--d-bdr); border-radius:14px; overflow:hidden; }
    .d-fin-row  { display:grid; grid-template-columns:1fr 1fr 1fr; }
    .d-fin-cell { padding:16px 12px; text-align:center; }
    .d-fin-cell + .d-fin-cell { border-left:1px solid var(--d-bdr); }
    .d-fin-val  { font-family:'Lora',serif; font-size:17px; color:var(--d-txt2); line-height:1; }
    .d-fin-lbl  { font-size:9px; color:var(--d-muted); font-weight:600; margin-top:4px; letter-spacing:.05em; text-transform:uppercase; }

    /* Attention widget */
    .d-alert { background:var(--d-surface); border:1px solid var(--d-bdr); border-radius:14px; overflow:hidden; }
    .d-attn-tab { padding:5px 12px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; border:1px solid; }
    .d-rrow  { display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid var(--d-bdr); cursor:pointer; transition:background .12s; }
    .d-rrow:first-child { border-top:none; }
    .d-rrow:hover { background:var(--d-hover); }
    .d-rav   { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Lora',serif; font-size:11px; font-weight:600; flex-shrink:0; }
    .d-rname { font-size:12px; font-weight:600; color:var(--d-txt2); }
    .d-rlast { font-size:10px; color:var(--d-muted); margin-top:1px; }
    .d-rtag  { margin-left:auto; font-size:9px; font-weight:700; padding:3px 9px; border-radius:20px; flex-shrink:0; }
    .d-prow  { display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid var(--d-bdr); }
    .d-prow:first-child { border-top:none; }
    .d-pico  { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
    .d-plbl  { font-size:12px; font-weight:500; color:var(--d-txt2); flex:1; line-height:1.3; }
    .d-pcnt  { font-size:11px; font-weight:700; padding:2px 9px; border-radius:20px; flex-shrink:0; }
    .d-empty { padding:22px; text-align:center; font-size:12px; color:var(--d-muted); }

    /* Recent notes */
    .d-nrow  { display:flex; gap:8px; padding:8px 16px; border-top:1px solid var(--d-bdr2); cursor:pointer; transition:background .12s; }
    .d-nrow:first-child { border-top:none; }
    .d-nrow:hover { background:var(--d-bg3); }

    /* Welcome guide */
    .d-wstep { background:var(--d-bg3); border:1px solid var(--d-bdr2); border-radius:10px; padding:13px 12px; display:flex; flex-direction:column; gap:7px; }

    /* Scrollbar */
    .d-root::-webkit-scrollbar       { width:3px; }
    .d-root::-webkit-scrollbar-thumb { background:var(--d-scroll); border-radius:99px; }
  `;
  document.head.appendChild(s);
}

// ── Frases motivacionales (rotan por día del año) ─────────────────────────────
const MOTIVATIONAL_PHRASES = [
  "Tu presencia marca la diferencia en cada consulta.",
  "Cada sesión es una semilla de cambio.",
  "Escuchar con atención es la mayor forma de cuidar.",
  "Tu trabajo transforma vidas, aunque no siempre lo veas.",
  "Hoy es un buen día para hacer el bien.",
  "La empatía que ofreces regresa multiplicada.",
  "Cada avance, por pequeño que sea, importa.",
  "Eres parte fundamental del bienestar de tus pacientes.",
  "Tu dedicación construye confianza, sesión a sesión.",
  "Hoy tienes la oportunidad de cambiar algo para siempre.",
  "El apoyo que brindas vale más de lo que imaginas.",
  "Cada historia que escuchas merece ser escuchada.",
  "Tu vocación es uno de los regalos más valiosos.",
  "La salud mental importa, y tú eres parte de eso.",
  "Cada consulta es un espacio seguro que tú creas.",
  "Ser testigo del progreso ajeno es un privilegio.",
  "Tu trabajo de hoy tendrá ecos en los años por venir.",
  "La constancia en el cuidado construye vidas mejores.",
  "Eres guía en momentos donde otros se sienten perdidos.",
  "El impacto de tu trabajo se mide en bienestar, no en cifras.",
  "Hoy, como siempre, estás justo donde debes estar.",
  "La escucha activa es el primer paso hacia la sanación.",
  "Tu práctica es un refugio para quienes más lo necesitan.",
  "Cada paciente que avanza es un logro compartido.",
  "El cuidado genuino siempre encuentra su camino.",
  "Detrás de cada consulta hay una historia que vale la pena.",
  "Tu trabajo no termina en la sesión; vive en cada paciente.",
  "Hoy tienes todo lo necesario para hacer un gran trabajo.",
  "La paciencia que ofreces es en sí misma una cura.",
  "Confía en tu formación, tu intuición y tu corazón.",
  "Un día a la vez, y cada día cuenta.",
];

function getDailyPhrase() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff  = now - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return MOTIVATIONAL_PHRASES[dayOfYear % MOTIVATIONAL_PHRASES.length];
}
const STATUS = {
  completada:          { label:"Completada", bg:"#EAF4EE", text:"#3D7A5E" },
  en_curso:            { label:"En curso",   bg:"#FDF3E0", text:"#A06A00" },
  pendiente:           { label:"Pendiente",  bg:"#F5F2EF", text:"#6B6560" },
  cancelada_paciente:  { label:"Cancelada",  bg:"#FAE8E6", text:"#B54A3D" },
  cancelada_psicologa: { label:"Cancelada",  bg:"#FAE8E6", text:"#B54A3D" },
  no_asistio:          { label:"No asistió", bg:"#FDF3E0", text:"#A06A00" },
};

// ── Primitivos ────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").slice(0,2).map(w => w[0]||"").join("").toUpperCase() || "?";
}

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

// ══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════════════════════════════

// ── HEADER ────────────────────────────────────────────────────────────────────
function Header({ profile, googleUser, todayAppts, urgentCount }) {
  const name = resolveDisplayName(profile, googleUser);

  const subtitle = todayAppts.length > 0
    ? `${todayAppts.length} cita${todayAppts.length>1?"s":""} hoy${urgentCount>0 ? ` · ${urgentCount} alerta${urgentCount>1?"s":""}` : " · Todo en orden"}`
    : getDailyPhrase();

  return (
    <div className="d-header">
      <div className="d-date">{todayFormatted()}</div>
      <div className="d-greet">
        {greeting()},&nbsp;<em>{name}</em>
      </div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--d-muted)", marginTop:6, fontStyle: todayAppts.length===0 ? "italic" : "normal" }}>
        {subtitle}
      </div>
    </div>
  );
}

// ── SHORTCUTS 2×2 → 4 columnas verticales ────────────────────────────────────
function Shortcuts({ onQuickNav, onNewSession, patients }) {
  const has = patients.length > 0;
  const items = [
    { icon:"👤", label:"Nuevo paciente",  bg:"#EAF4EE", onClick:()=>onQuickNav("patients","add") },
    { icon:"📅", label:"Agendar cita",    bg:"#EDF2FB", onClick:()=>onQuickNav("agenda","add") },
    { icon:"▶",  label:"Iniciar sesión",  bg:"#FDF3E0", onClick:onNewSession,                    disabled:!has },
    { icon:"💳", label:"Registrar pago",  bg:"#F4F0FB", onClick:()=>onQuickNav("finance","add"), disabled:!has },
  ];
  return (
    <div className="d-shortcuts">
      {items.map(item => (
        <button
          key={item.label}
          className="d-sc"
          disabled={item.disabled}
          onClick={item.onClick}
        >
          <div className="d-sc-ico" style={{ background:item.bg }}>{item.icon}</div>
          <div className="d-sc-name">{item.label}</div>
        </button>
      ))}
    </div>
  );
}

// ── KPI STRIP ─────────────────────────────────────────────────────────────────
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
    { val:activePatients,                            label:"Pacientes activos", icon:Users,         color:"#3D6B5A", bg:"#E4EEE9" },
    { val:`${completedToday}/${todayAppts.length}`,  label:"Sesiones hoy",      icon:CheckCircle2,  color:"#B8761E", bg:"#FBF0DC" },
    { val:urgentCount,                               label:"Alertas activas",   icon:AlertTriangle, color:urgentCount>0?"#B54A3D":"#3D6B5A", bg:urgentCount>0?"#FAE8E6":"#E4EEE9" },
    { val:monthlyIncome>0?fmtCur(monthlyIncome):"—", label:"Ingresos del mes",  icon:DollarSign,    color:"#3D6B5A", bg:"#E4EEE9", sm:true },
  ];

  const cols = isMob ? "repeat(2,1fr)" : "repeat(4,1fr)";
  const size = isMob ? 30 : 34;
  const iconSize = isMob ? 13 : 15;

  return (
    <div className="d-kpis" style={{ gridTemplateColumns:cols }}>
      {kpis.map((k,i) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="d-kpi">
            <div className="d-kpi-ico" style={{ width:size, height:size, background:k.bg }}>
              <Icon size={iconSize} color={k.color} strokeWidth={1.8}/>
            </div>
            <div style={{ minWidth:0 }}>
              <div className="d-kpi-val" style={{ fontSize:k.sm?(isMob?15:18):(isMob?18:22) }}>{k.val}</div>
              <div className="d-kpi-lbl">{k.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AGENDA ────────────────────────────────────────────────────────────────────
function AgendaSection({ todayAppts, nextAppt, todayStr, onStartSession, onNavigate, bp }) {
  const completadas = todayAppts.filter(a => a.status==="completada").length;

  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nextPendingId = useMemo(() => {
    const pending = todayAppts
      .filter(a => a.status === "pendiente")
      .map(a => { const [h,m] = (a.time||"00:00").split(":").map(Number); return { ...a, mins: h*60+m }; })
      .filter(a => a.mins >= nowMins)
      .sort((a,b) => a.mins - b.mins);
    return pending[0]?.id ?? null;
  }, [todayAppts, nowMins]);

  // Altura: muestra N filas completas + media fila para insinuar scroll
  // Cada fila ~68px. Mobile: 3.4 filas → ~231px. Tablet/desktop: 5.5 → ~374px
  const ROW_H  = 68;
  const isMob  = !bp || bp === "mobile";
  const maxH   = isMob ? ROW_H * 3.4 : ROW_H * 5.5;

  return (
    <div className="d-sec" style={{ animationDelay:".14s" }}>
      <div className="d-sec-hd">
        <span className="d-sec-lbl">🗓 Agenda de hoy · {completadas}/{todayAppts.length}</span>
        <button className="d-sec-btn" onClick={()=>onNavigate("agenda")}>Ver todo →</button>
      </div>

      <div className="d-agenda">
        {todayAppts.length === 0 ? (
          <div className="d-empty">Sin citas para hoy ✓</div>
        ) : (
          <div className="d-agenda-scroll" style={{ maxHeight: maxH }}>
            {todayAppts.map(appt => {
              const isNext = appt.id === nextPendingId;
              const active = appt.status === "en_curso";
              const st     = STATUS[appt.status] || STATUS.pendiente;
              const [h, m] = (appt.time||"00:00").split(":");

              const tagBg  = isNext ? "#1A3A28" : active ? "#FDF3E0" : st.bg;
              const tagClr = isNext ? "#5ECFA0" : active ? "#A06A00" : st.text;
              const tagLbl = isNext ? "Abrir"   : st.label;

              return (
                <div
                  key={appt.id}
                  className={`d-appt${active ? " d-active" : isNext ? " d-next-up" : ""}`}
                  onClick={()=>(isNext || active) ? onStartSession?.(appt) : onNavigate("agenda")}
                >
                  <div className="d-time">
                    <div className="d-time-h" style={isNext ? { color:"#5ECFA0" } : {}}>{h}</div>
                    <div className="d-time-m">{m}</div>
                  </div>
                  <div className="d-abody">
                    <div className="d-aname">{appt.patientName || appt.patient || "Paciente"}</div>
                    <div className="d-atype">{appt.type || appt.service || ""}</div>
                  </div>
                  <div className="d-aright" style={{ justifyContent:"center" }}>
                    <div className="d-stag" style={{ background:tagBg, color:tagClr, fontSize:isNext?10:9, padding:isNext?"4px 11px":"2px 7px", fontWeight:700 }}>{tagLbl}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Siguiente cita */}
        {nextAppt && (
          <div className="d-next" onClick={()=>onNavigate("agenda")}>
            <div className="d-next-ico">📆</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="d-next-eyebrow">Siguiente cita</div>
              <div className="d-next-name">{nextAppt.patientName || nextAppt.patient || "Paciente"}</div>
              <div className="d-next-meta">
                {nextAppt.date} · {nextAppt.time} · {nextAppt.type || nextAppt.service || ""}
              </div>
            </div>
            {nextAppt.date && (
              <div className="d-next-pill">
                {(()=>{
                  const days = daysBetween(todayStr, nextAppt.date);
                  if (days===0) return "Hoy";
                  if (days===1) return "Mañana";
                  return `En ${days}d`;
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MES EN NÚMEROS ────────────────────────────────────────────────────────────
function FinanceSection({ patients, sessions, payments, onNavigate }) {
  const { thisMonthSessions, monthlyIncome } = useMemo(
    ()=>computeSidebarSummary({patients,sessions,payments}),
    [patients,sessions,payments]
  );
  const attendance = useMemo(()=>{
    const now  = new Date();
    const mStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const monthlySess = sessions.filter(s=>s.date?.startsWith(mStr));
    const comp = monthlySess.filter(s=>s.status==="completada").length;
    return monthlySess.length>0 ? Math.round(comp/monthlySess.length*100) : 0;
  }, [sessions]);

  return (
    <div className="d-sec" style={{ animationDelay:".20s" }}>
      <div className="d-sec-hd">
        <span className="d-sec-lbl">📈 Mes en números</span>
        <button className="d-sec-btn" onClick={()=>onNavigate("reports")}>Reportes →</button>
      </div>
      <div className="d-finance">
        <div className="d-fin-row">
          <div className="d-fin-cell">
            <div className="d-fin-val">{monthlyIncome>0?fmtCur(monthlyIncome):"—"}</div>
            <div className="d-fin-lbl">Ingresos</div>
          </div>
          <div className="d-fin-cell">
            <div className="d-fin-val">{thisMonthSessions}</div>
            <div className="d-fin-lbl">Sesiones</div>
          </div>
          <div className="d-fin-cell">
            <div className="d-fin-val">{attendance}%</div>
            <div className="d-fin-lbl">Asistencia</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ATENCIÓN REQUERIDA ────────────────────────────────────────────────────────
function AttentionSection({ patients, sessions, riskAssessments, pendingTasks, todayStr, onNavigate }) {
  const [tab, setTab] = useState("risk");

  const riskItems = useMemo(()=>computeRiskItems(riskAssessments),[riskAssessments]);
  const absent    = useMemo(()=>computeAbsentPatients({patients,sessions}),[patients,sessions]);

  const pendingList = useMemo(()=>{
    const noConsent = patients.filter(p => {
      try { return consentStatus(p)==="pendiente"; } catch { return false; }
    }).length;
    const list = [];
    if (noConsent>0)     list.push({ label:"Consentimientos sin firmar",        count:noConsent,     icon:"📄", color:"#B54A3D", bg:"#FAE8E6" });
    if (pendingTasks>0)  list.push({ label:"Planes de tratamiento incompletos", count:pendingTasks,  icon:"📋", color:"#A06A00", bg:"#FDF3E0" });
    if (absent.length>0) list.push({ label:"Pacientes sin sesión reciente",     count:absent.length, icon:"👤", color:"#5C6B8A", bg:"#EDF2FB" });
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
    <div className="d-sec" style={{ animationDelay:".26s" }}>
      <div className="d-sec-hd">
        <span className="d-sec-lbl">⚠️ Atención requerida</span>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className="d-attn-tab"
            onClick={()=>setTab(t.key)}
            style={{
              background:  tab===t.key ? "#3D6B5A" : "#fff",
              color:       tab===t.key ? "#fff"    : "#A8A29B",
              borderColor: tab===t.key ? "#3D6B5A" : "#EAE6E1",
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab==="risk" && (
        <div className="d-alert">
          {riskItems.length===0 && absent.length===0
            ? <div className="d-empty">Sin alertas de riesgo activas ✓</div>
            : <>
              {riskItems.map((a,i)=>{
                const pt     = patients.find(p=>p.id===a.patientId);
                const isHigh = a.riskLevel==="inminente"||a.riskLevel==="alto";
                const bg     = isHigh?"#FAE8E6":"#FDF3E0";
                const cl     = isHigh?"#B54A3D":"#A06A00";
                return (
                  <div key={a.id||i} className="d-rrow" onClick={()=>onNavigate("risk")}>
                    <div className="d-rav" style={{ background:bg, color:cl, border:`1.5px solid ${cl}22` }}>
                      {initials(pt?.name||"P")}
                    </div>
                    <div>
                      <div className="d-rname">{(pt?.name||"Paciente").split(" ").slice(0,2).join(" ")}</div>
                      <div className="d-rlast">Evaluado {fmtDate(a.date)}</div>
                    </div>
                    <div className="d-rtag" style={{ background:bg, color:cl }}>
                      {a.riskLevel?.charAt(0).toUpperCase()+(a.riskLevel?.slice(1)||"")}
                    </div>
                  </div>
                );
              })}
              {absent.map((p,i)=>{
                const days = p.lastSession ? daysBetween(p.lastSession,todayStr) : null;
                return (
                  <div key={p.id||i} className="d-rrow" onClick={()=>onNavigate("patients")}>
                    <div className="d-rav" style={{ background:"#FBF0DC", color:"#B8761E", border:"1.5px solid #B8761E22" }}>
                      {initials(p.name||"")}
                    </div>
                    <div>
                      <div className="d-rname">{(p.name||"Paciente").split(" ").slice(0,2).join(" ")}</div>
                      <div className="d-rlast">Sin sesión reciente</div>
                    </div>
                    <div className="d-rtag" style={{ background:"#FBF0DC", color:"#B8761E" }}>
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
        <div className="d-alert">
          {pendingList.length===0
            ? <div className="d-empty">Sin tareas pendientes ✓</div>
            : pendingList.map(p => (
              <div key={p.label} className="d-prow">
                <div className="d-pico" style={{ background:p.bg }}>{p.icon}</div>
                <div className="d-plbl">{p.label}</div>
                <div className="d-pcnt" style={{ background:p.bg, color:p.color }}>{p.count}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── WELCOME GUIDE (sin pacientes) ─────────────────────────────────────────────
function WelcomeGuide({ onNavigate }) {
  const steps = [
    { num:1, title:"Registra tu primer paciente", desc:"Agrega datos, historial y motivo de consulta.", icon:Users,    color:"#3D6B5A", bg:"#E4EEE9", btn:"Nuevo paciente", mod:"patients" },
    { num:2, title:"Agenda su primera cita",      desc:"Programa la sesión inicial en el calendario.",  icon:Calendar, color:"#B8761E", bg:"#FBF0DC", btn:"Ir a Agenda",    mod:"agenda"   },
    { num:3, title:"Registro automático",         desc:"PsychoCore enviará confirmación automáticamente.", icon:FileText, color:"#A8A29B", bg:"#F0ECE6", btn:null,            mod:null       },
  ];
  return (
    <div className="d-sec">
      <div style={{ background:"var(--d-bg)", borderRadius:12, border:"1px solid var(--d-bdr2)", padding:"36px 28px", textAlign:"center" }}>
        <div style={{ width:44, height:44, borderRadius:11, background:"var(--d-bg3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
          <Sparkles size={19} color="var(--d-accent)" strokeWidth={1.5}/>
        </div>
        <h2 style={{ fontFamily:"'Lora',serif", fontSize:24, fontWeight:400, color:"var(--d-txt)", margin:"0 0 6px" }}>¡Bienvenido a PsychoCore!</h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--d-muted)", margin:"0 auto 20px", maxWidth:340, lineHeight:1.7 }}>
          Sigue estos pasos para comenzar a gestionar tu práctica clínica.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, textAlign:"left" }}>
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="d-wstep">
                <div style={{ width:28, height:28, borderRadius:7, background:step.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={12} color={step.color} strokeWidth={1.8}/>
                </div>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:"var(--d-txt)", margin:0 }}>{step.title}</p>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"var(--d-muted)", lineHeight:1.5, margin:0 }}>{step.desc}</p>
                {step.btn && (
                  <button
                    onClick={()=>onNavigate(step.mod)}
                    style={{ marginTop:"auto", padding:"5px 10px", borderRadius:6, background:step.bg, border:`1px solid ${step.color}33`, color:step.color, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, cursor:"pointer" }}
                  >{step.btn}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
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
    isMobile, todayStr,
    pendingTasks, todayAppts, nextAppt, urgentCount,
  } = useDashboard({ patients, appointments, sessions, payments, riskAssessments, assignments });

  const hasPatients = patients.length > 0;

  return (
    <div className="d-root">

      {/* HEADER */}
      <Header
        profile={profile}
        googleUser={googleUser}
        todayAppts={todayAppts}
        urgentCount={urgentCount}
      />

      {/* AGENDA — primer lugar */}
      <AgendaSection
        todayAppts={todayAppts}
        nextAppt={nextAppt}
        todayStr={todayStr}
        onStartSession={onStartSession}
        onNavigate={onNavigate}
        bp={bp}
      />

      {/* ACCESOS DIRECTOS */}
      <Shortcuts
        onQuickNav={onQuickNav}
        onNewSession={onNewSession}
        patients={patients}
      />

      {!hasPatients ? (
        /* Sin pacientes: guía de bienvenida */
        <WelcomeGuide onNavigate={onNavigate}/>

      ) : (
        <>
          {/* KPIs */}
          <KpiStrip
            patients={patients}
            sessions={sessions}
            todayAppts={todayAppts}
            urgentCount={urgentCount}
            payments={payments}
            bp={bp}
          />

          {/* MES EN NÚMEROS */}
          <FinanceSection
            patients={patients}
            sessions={sessions}
            payments={payments}
            onNavigate={onNavigate}
          />

          {/* ATENCIÓN REQUERIDA */}
          <AttentionSection
            patients={patients}
            sessions={sessions}
            riskAssessments={riskAssessments}
            pendingTasks={pendingTasks}
            todayStr={todayStr}
            onNavigate={onNavigate}
          />
        </>
      )}

    </div>
  );
}
