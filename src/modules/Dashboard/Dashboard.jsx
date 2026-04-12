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
  Sparkles, Play, AlertTriangle, NotebookPen, UserPlus,
  BarChart2, CalendarPlus, CreditCard, FileBarChart2, Zap,
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
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap');

    @keyframes pc-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pc-bar   { from{width:0} }
    @keyframes pc-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes pc-glow  { 0%,100%{box-shadow:0 0 0 0 rgba(181,74,61,0)} 50%{box-shadow:0 0 0 5px rgba(181,74,61,.1)} }

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

// ── SHORTCUTS BAR ─────────────────────────────────────────────────────────────
// Barra de accesos directos — se integra visualmente con el fondo de la app
function ShortcutsBar({ onQuickNav, onNewSession, patients, bp }) {
  const has   = patients.length > 0;
  const isMob = bp === "mobile";

  const items = [
    { label:"Nuevo paciente", icon:UserPlus,     primary:true,  action:()=>onQuickNav("patients","add") },
    { label:"Agendar cita",   icon:CalendarPlus, primary:false, action:()=>onQuickNav("agenda","add") },
    { label:"Iniciar sesión", icon:Play,         primary:false, action:onNewSession, disabled:!has },
    null,
    { label:"Nota clínica",   icon:NotebookPen,  primary:false, action:()=>onQuickNav("sessions","add"), disabled:!has },
    { label:"Pago",           icon:CreditCard,   primary:false, action:()=>onQuickNav("finance","add") },
    { label:"Riesgo",         icon:Zap,          primary:false, action:()=>onQuickNav("risk","add"), disabled:!has },
    null,
    { label:"Reporte",        icon:FileBarChart2,primary:false, action:()=>onQuickNav("reports") },
  ];

  return (
    <div style={{
      display:"flex", alignItems:"center",
      padding: isMob ? "0 0 10px" : "0 0 12px",
      gap:5,
    }}>
      {/* Botones — scrollable en su propio contenedor flex */}
      <div className="pc-sc-bar" style={{
        display:"flex", alignItems:"center",
        gap:5, overflowX:"auto", flex:1,
      }}>
        {!isMob && (
          <span style={{
            fontSize:10, fontWeight:700, color:D.mist,
            letterSpacing:".09em", textTransform:"uppercase",
            marginRight:4, flexShrink:0, fontFamily:D.fB,
          }}>Accesos</span>
        )}
        {items.map((item, i) => {
          if (item === null) return !isMob
            ? <div key={i} style={{ width:1, height:16, background:D.border, margin:"0 2px", flexShrink:0 }}/>
            : null;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={item.primary ? "pc-sc-p" : "pc-sc"}
              disabled={item.disabled}
              onClick={item.action}
              style={{
                display:"inline-flex", alignItems:"center",
                gap:5, padding: isMob ? "5px 9px" : "5px 11px",
                borderRadius:7,
                border:`1px solid ${item.primary ? D.sage : D.border}`,
                background:item.primary ? D.sage : D.surface,
                fontFamily:D.fB, fontSize:11, fontWeight:600,
                color:item.primary ? "#fff" : D.slate,
                cursor:item.disabled ? "not-allowed" : "pointer",
                opacity:item.disabled ? 0.4 : 1,
                transition:"all .15s", whiteSpace:"nowrap", flexShrink:0,
              }}
            >
              <Icon size={12} strokeWidth={1.8}/>
              {/* Mobile: label solo en primario; secundarios solo ícono */}
              {(!isMob || item.primary) && item.label}
            </button>
          );
        })}
      </div>

      {/* Fecha mini — aprovecha el espacio vacío a la derecha en mobile */}
      {isMob && (
        <div style={{
          flexShrink:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          paddingLeft:10, borderLeft:`1px solid ${D.border}`,
          minWidth:36,
        }}>
          <span style={{
            fontFamily:D.fH, fontSize:18, color:D.stone,
            lineHeight:1, whiteSpace:"nowrap",
          }}>{new Date().getDate()}</span>
          <span style={{
            fontFamily:D.fB, fontSize:9, color:D.mist,
            fontWeight:700, letterSpacing:".07em",
            textTransform:"uppercase", whiteSpace:"nowrap", marginTop:1,
          }}>{new Date().toLocaleDateString("es-MX",{month:"short"}).replace(".","")}</span>
        </div>
      )}
    </div>
  );
}

// ── SALUDO N0 ─────────────────────────────────────────────────────────────────
function Welcome({ todayAppts, urgentCount, profile, googleUser, bp }) {
  const name  = resolveDisplayName(profile, googleUser);
  const isMob = bp === "mobile";

  return (
    <div className="pc-fu" style={{
      display:"flex",
      flexDirection:"row",
      alignItems:"flex-start",
      justifyContent:"space-between",
      gap:8,
    }}>
      {/* Saludo + subtítulo */}
      <div style={{ flex:1, minWidth:0 }}>
        <h1 style={{
          fontFamily:D.fH, fontSize:isMob?20:24,
          fontWeight:400, color:D.stone, lineHeight:1.1, margin:0,
        }}>
          {greeting()}, <span style={{ color:D.sage }}>{name}</span>
        </h1>
        <p style={{ fontFamily:D.fB, fontSize:12, color:D.mist, marginTop:3, margin:"3px 0 0" }}>
          {todayAppts.length > 0
            ? `${todayAppts.length} cita${todayAppts.length>1?"s":""} hoy${urgentCount > 0 ? ` · ${urgentCount} alerta${urgentCount>1?"s":""}` : " · Todo en orden"}`
            : "Sin citas programadas hoy"}
        </p>
      </div>

      {/* Badges — siempre arriba a la derecha */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
        <div style={{
          display:"flex", alignItems:"center", gap:5,
          padding:"4px 10px", borderRadius:7,
          background:D.sageL, fontFamily:D.fB, fontSize:11, fontWeight:600, color:D.sage,
        }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:D.sage, animation:"pc-blink 2s ease infinite" }}/>
          Sincronizado
        </div>
        {urgentCount > 0 && (
          <div style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"4px 10px", borderRadius:7,
            background:D.amberL, fontFamily:D.fB, fontSize:11, fontWeight:600, color:D.amber,
          }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:D.amber, animation:"pc-blink 2s ease infinite" }}/>
            {urgentCount} alerta{urgentCount>1?"s":""}
          </div>
        )}
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

// ── AGENDA (protagonista) ─────────────────────────────────────────────────────
function AgendaWidget({ todayAppts, onStartSession, onNavigate, todayStr, bp }) {
  const isMob  = bp === "mobile";
  const inProg = todayAppts.find(a => a.status==="en_curso");
  const done   = todayAppts.filter(a => a.status==="completada").length;
  const pct    = todayAppts.length>0 ? Math.round(done/todayAppts.length*100) : 0;

  const sSt = s => ({
    completada:          { label:"Completada", color:D.sage,  bg:D.sageL  },
    en_curso:            { label:"En curso",   color:D.amber, bg:D.amberL },
    pendiente:           { label:"Pendiente",  color:D.mist,  bg:D.alt    },
    cancelada_paciente:  { label:"Cancelada",  color:D.coral, bg:D.coralL },
    cancelada_psicologa: { label:"Cancelada",  color:D.coral, bg:D.coralL },
    no_asistio:          { label:"No asistió", color:D.amber, bg:D.amberL },
  }[s] || { label:s, color:D.mist, bg:D.alt });

  const rSt = r => ({
    inminente:{ label:"● Inmin.", color:D.coral, bg:D.coralL },
    alto:     { label:"Alto",    color:D.coral, bg:D.coralL },
    medio:    { label:"Medio",   color:D.amber, bg:D.amberL },
  }[r]);

  if (todayAppts.length === 0) {
    return (
      <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, overflow:"hidden" }}>
        <CardHd eyebrow="🗓 Agenda de hoy" title="Sin citas"/>
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
    <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, overflow:"hidden" }}>
      <CardHd
        eyebrow="🗓 Agenda de hoy"
        title={`${todayAppts.length} cita${todayAppts.length>1?"s":""}`}
        action="Ver agenda →"
        onAction={()=>onNavigate("agenda")}
      />

      {inProg && (
        <div style={{ padding:"7px 16px", borderBottom:`1px solid ${D.border}`, background:`${D.amber}06` }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:D.fB, fontSize:10, color:D.amber, fontWeight:600, marginBottom:3 }}>
            <span>▶ En curso · {inProg.patientName||"Paciente"}</span>
            <span>{pct}% del día</span>
          </div>
          <div style={{ height:3, background:D.amberL, borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", background:D.amber, borderRadius:99, width:`${pct}%`, animation:"pc-bar .9s ease both .3s" }}/>
          </div>
        </div>
      )}

      {todayAppts.map((appt, i) => {
        const sc  = sSt(appt.status);
        const rc  = rSt(appt.riskLevel);
        const cur = appt.status==="en_curso";
        const timeStr = appt.time || (appt.date ? appt.date.slice(11,16) : "");

        return (
          <div
            key={appt.id||i}
            className="pc-row"
            onClick={()=>onStartSession&&onStartSession(appt)}
            style={{
              display:"flex", alignItems:"center", gap:10,
              padding:isMob?"10px 14px":"11px 16px",
              borderTop:i>0?`1px solid ${D.border}`:"none",
              borderLeft:`3px solid ${cur?D.amber:"transparent"}`,
              background:cur?`${D.amber}05`:"transparent",
              cursor:"pointer", transition:"background .12s",
            }}
          >
            <span style={{
              fontFamily:D.fB, fontSize:11, fontWeight:600,
              color:cur?D.amber:D.mist, width:32, flexShrink:0,
              fontVariantNumeric:"tabular-nums",
            }}>{timeStr}</span>

            {!isMob && (
              <Av name={appt.patientName||"?"} size={30}
                color={cur?D.amber:D.sage} bg={cur?D.amberL:D.sageL}
              />
            )}

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:D.fB, fontSize:isMob?12:13, fontWeight:600, color:D.stone, lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {appt.patientName||"Paciente"}
              </div>
              {!isMob && (
                <div style={{ fontFamily:D.fB, fontSize:11, color:D.mist, marginTop:1 }}>
                  {appt.type||appt.serviceTitle||"Sesión"}
                </div>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              {!isMob && rc && <Tag color={rc.color} bg={rc.bg}>{rc.label}</Tag>}
              {!isMob && appt.consentStatus==="pendiente" && (
                <Tag color={D.coral} bg={D.coralL}>Sin consent.</Tag>
              )}
              <Tag color={sc.color} bg={sc.bg}>{sc.label}</Tag>
              {cur && (
                <button
                  className="pc-act"
                  onClick={e=>{e.stopPropagation();onStartSession&&onStartSession(appt);}}
                  style={{
                    padding:isMob?"4px 8px":"5px 10px", borderRadius:6, border:"none",
                    background:D.amber, color:"#fff", fontFamily:D.fB,
                    fontSize:10, fontWeight:700, cursor:"pointer",
                    transition:"background .13s", whiteSpace:"nowrap",
                  }}
                >{isMob?"Ver":"Ver sesión"}</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── RISK RADAR ────────────────────────────────────────────────────────────────
function RiskRadar({ patients, sessions, riskAssessments, todayStr, onNavigate }) {
  const absent    = useMemo(()=>computeAbsentPatients({patients,sessions}),[patients,sessions]);
  const riskItems = useMemo(()=>computeRiskItems(riskAssessments),[riskAssessments]);
  const hasImm    = riskItems.some(r=>r.riskLevel==="inminente");

  const rSt = r => ({
    inminente:{ label:"● Inminente", color:D.coral, bg:D.coralL },
    alto:     { label:"Alto",        color:D.coral, bg:D.coralL },
    medio:    { label:"Medio",       color:D.amber, bg:D.amberL },
  }[r] || { label:r, color:D.mist, bg:D.alt });

  if (riskItems.length===0 && absent.length===0) {
    return (
      <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, overflow:"hidden" }}>
        <CardHd eyebrow="⚠ Radar de riesgo" eyebrowColor={D.sage} title="Sin alertas"/>
        <div style={{ padding:"12px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 12px", borderRadius:9, background:D.sageL, border:`1px solid ${D.sage}22` }}>
            <CheckCircle2 size={14} color={D.sage} strokeWidth={1.8}/>
            <p style={{ fontFamily:D.fB, fontSize:12, color:D.slate, margin:0 }}>Todos en seguimiento regular.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background:D.surface, borderRadius:12,
      border:`1px solid ${hasImm?`${D.coral}40`:D.border}`,
      overflow:"hidden",
      animation:hasImm?"pc-glow 2.5s ease infinite":"none",
    }}>
      <CardHd
        eyebrow="⚠ Radar de riesgo" eyebrowColor={D.coral}
        title="Vigilancia clínica"
        action="Ver todos →" onAction={()=>onNavigate("risk")}
      />

      {riskItems.map((a, i) => {
        const pt = patients.find(p=>p.id===a.patientId);
        const rs = rSt(a.riskLevel);
        return (
          <div key={a.id||i} className="pc-row" onClick={()=>onNavigate("risk")} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"9px 16px",
            borderTop:i>0?`1px solid ${D.border}`:"none",
            cursor:"pointer", transition:"background .12s",
          }}>
            <Av name={pt?.name||"P"} size={26}
              color={a.riskLevel==="inminente"?D.coral:D.amber}
              bg={a.riskLevel==="inminente"?D.coralL:D.amberL}
            />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:D.fB, fontSize:12, fontWeight:600, color:D.stone }}>
                {(pt?.name||"Paciente").split(" ").slice(0,2).join(" ")}
              </div>
              <div style={{ fontFamily:D.fB, fontSize:10, color:D.mist }}>Evaluado {fmtDate(a.date)}</div>
            </div>
            <Tag color={rs.color} bg={rs.bg}>{rs.label}</Tag>
          </div>
        );
      })}

      {absent.length>0 && (
        <div style={{ background:D.amberL, borderTop:`1px solid ${D.border}`, padding:"9px 16px" }}>
          <div style={{ fontFamily:D.fB, fontSize:9, fontWeight:700, color:D.amber, letterSpacing:".08em", textTransform:"uppercase", marginBottom:7 }}>
            ⏰ Sin sesión +21 días
          </div>
          {absent.map((p, i) => {
            const days = p.lastSession ? daysBetween(p.lastSession, todayStr) : null;
            return (
              <div key={p.id||i} className="pc-row" onClick={()=>onNavigate("patients")} style={{
                display:"flex", alignItems:"center", gap:7,
                marginTop:i>0?5:0, cursor:"pointer", borderRadius:6,
                padding:"2px 4px", transition:"background .12s",
              }}>
                <div style={{
                  width:20, height:20, borderRadius:"50%", flexShrink:0,
                  background:"#C8862A20", display:"flex", alignItems:"center",
                  justifyContent:"center", fontFamily:D.fH, fontSize:7, color:D.amber,
                }}>{initials(p.name||"")}</div>
                <span style={{ fontFamily:D.fB, fontSize:11, color:D.stone, flex:1 }}>
                  {(p.name||"Paciente").split(" ").slice(0,2).join(" ")}
                </span>
                <span style={{ fontFamily:D.fB, fontSize:11, fontWeight:700, color:D.amber }}>
                  {days!=null?`${days}d`:"Sin sesión"}
                </span>
              </div>
            );
          })}
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

// ── RESUMEN MENSUAL ───────────────────────────────────────────────────────────
function MonthlySummary({ patients, sessions, payments, onNavigate }) {
  const { activePatients, thisMonthSessions, monthlyIncome } = useMemo(
    ()=>computeSidebarSummary({patients,sessions,payments}),
    [patients,sessions,payments]
  );
  const rows = [
    { label:"Pacientes activos",   val:activePatients,                             bar:Math.min(activePatients/30,1)    },
    { label:"Sesiones realizadas", val:thisMonthSessions,                           bar:Math.min(thisMonthSessions/60,1) },
    { label:"Ingresos cobrados",   val:monthlyIncome>0?fmtCur(monthlyIncome):"—", bar:.7, sm:true                     },
  ];
  return (
    <div style={{ background:D.surface, borderRadius:12, border:`1px solid ${D.border}`, overflow:"hidden" }}>
      <CardHd eyebrow="📈 Resumen del mes" title="Métricas" action="Reportes →" onAction={()=>onNavigate("reports")}/>
      {rows.map((r,i)=>(
        <div key={r.label} className="pc-row" style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 16px", borderTop:i>0?`1px solid ${D.border}`:"none",
          transition:"background .12s",
        }}>
          <span style={{ fontFamily:D.fB, fontSize:11, color:D.slate }}>{r.label}</span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:40, height:3, background:D.border, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", background:D.sageM, borderRadius:99, width:`${r.bar*100}%`, animation:`pc-bar .8s ease both ${.3+i*.1}s` }}/>
            </div>
            <span style={{ fontFamily:r.sm?D.fB:D.fH, fontSize:r.sm?12:14, fontWeight:r.sm?700:400, color:D.stone }}>{r.val}</span>
          </div>
        </div>
      ))}
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
            onNavigate={onNavigate} todayStr={todayStr} bp={bp}
          />
          <RiskRadar
            patients={patients} sessions={sessions}
            riskAssessments={riskAssessments} todayStr={todayStr}
            onNavigate={onNavigate}
          />
          <ComplianceChecklist
            patients={patients} pendingTasks={pendingTasks}
            sessions={sessions} onNavigate={onNavigate}
          />
          {isTab && (
            <>
              <RecentNotes sessions={sessions} patients={patients} onNavigate={onNavigate}/>
              <MonthlySummary patients={patients} sessions={sessions} payments={payments} onNavigate={onNavigate}/>
            </>
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
            onNavigate={onNavigate} todayStr={todayStr} bp={bp}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="pc-fu pc-d2">
              <RiskRadar patients={patients} sessions={sessions} riskAssessments={riskAssessments} todayStr={todayStr} onNavigate={onNavigate}/>
            </div>
            <div className="pc-fu pc-d3">
              <ComplianceChecklist patients={patients} pendingTasks={pendingTasks} sessions={sessions} onNavigate={onNavigate}/>
            </div>
            <div className="pc-fu pc-d4">
              <RecentNotes sessions={sessions} patients={patients} onNavigate={onNavigate}/>
            </div>
            <div className="pc-fu pc-d5">
              <MonthlySummary patients={patients} sessions={sessions} payments={payments} onNavigate={onNavigate}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
