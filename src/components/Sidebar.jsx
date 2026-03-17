import { useEffect } from "react";
import { Home, Users, Calendar, FileText, DollarSign, X, Brain, Settings, BarChart2, ShieldAlert, ClipboardList, Target, ScrollText, CheckSquare } from "lucide-react";
import { T } from "../theme.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

export const NAV_ITEMS = [
  { id:"dashboard",  icon:Home,           label:"Inicio"            },
  { id:"patients",   icon:Users,          label:"Pacientes"         },
  { id:"agenda",     icon:Calendar,       label:"Agenda"            },
  { id:"sessions",   icon:FileText,       label:"Sesiones"          },
  { id:"tasks",      icon:CheckSquare,    label:"Tareas"            },
  { id:"treatment",  icon:Target,         label:"Tratamiento"       },
  { id:"scales",     icon:ClipboardList,  label:"Escalas"           },
  { id:"risk",       icon:ShieldAlert,    label:"Riesgo", alert:true },
  { id:"reports",    icon:ScrollText,     label:"Informes"          },
  { id:"finance",    icon:DollarSign,     label:"Finanzas"          },
  { id:"stats",      icon:BarChart2,      label:"Estadísticas"      },
];

export default function Sidebar({ active, setActive, onLock, open, onClose, profile, riskAlert = false }) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const handleNav = (id) => { setActive(id); if (isMobile) onClose(); };

  const initials = profile?.initials || (profile?.name ? profile.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : "PS");
  const displayName = profile?.name || "Psicólogo/a";
  const displaySpec = profile?.specialty || "Psicólogo Clínico";

  const sidebarStyle = isMobile
    ? { position:"fixed", top:0, left:0, bottom:0, zIndex:200, width:260, background:T.nav, display:"flex", flexDirection:"column", transform:open?"translateX(0)":"translateX(-100%)", transition:"transform .28s cubic-bezier(.4,0,.2,1)", boxShadow:open?"4px 0 32px rgba(0,0,0,0.25)":"none" }
    : { width:220, background:T.nav, display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh", position:"sticky", top:0 };

  return (
    <>
      {isMobile && (
        <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:199, background:"rgba(0,0,0,0.45)", opacity:open?1:0, pointerEvents:open?"auto":"none", transition:"opacity .28s ease" }}/>
      )}

      <aside style={sidebarStyle}>
        <div style={{ padding:"24px 20px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:T.p, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Brain size={18} color="#fff" strokeWidth={1.5}/>
            </div>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:18, fontWeight:600, color:"#fff" }}>PsychoCore</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontFamily:T.fB, letterSpacing:"0.08em" }}>GESTIÓN CLÍNICA</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(255,255,255,0.7)", flexShrink:0 }}>
              <X size={16}/>
            </button>
          )}
        </div>

        <nav style={{ flex:1, padding:"0 12px", overflowY:"auto", minHeight:0 }}>
          {NAV_ITEMS.map(({ id, icon:Icon, label, alert }) => {
            const isActive = active === id;
            const showDot  = alert && riskAlert;
            return (
              <button key={id} onClick={() => handleNav(id)}
                style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 14px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:13.5, fontWeight:isActive?600:400, marginBottom:2, transition:"all .15s", background:isActive?T.p:"transparent", color:isActive?"#fff":"rgba(255,255,255,0.50)", position:"relative" }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="#fff"; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.50)"; } }}>
                <span style={{ position:"relative", display:"inline-flex" }}>
                  <Icon size={16} strokeWidth={1.8}/>
                  {showDot && (
                    <span style={{ position:"absolute", top:-3, right:-3, width:7, height:7, borderRadius:"50%", background:"#E05252", border:"1.5px solid #1A2B28" }}/>
                  )}
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding:"12px 12px 24px", flexShrink:0 }}>
          <div style={{ height:1, background:"rgba(255,255,255,0.08)", marginBottom:12 }}/>
          <button onClick={() => handleNav("settings")}
            style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:active==="settings"?"rgba(255,255,255,0.08)":"transparent", transition:"all .15s", marginBottom:4 }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background=active==="settings"?"rgba(255,255,255,0.08)":"transparent"}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.p, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontFamily:T.fH, fontSize:13, color:"#fff", fontWeight:600 }}>{initials}</span>
            </div>
            <div style={{ flex:1, textAlign:"left", overflow:"hidden" }}>
              <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayName}</div>
              <div style={{ fontFamily:T.fB, fontSize:11, color:"rgba(255,255,255,0.4)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displaySpec}</div>
            </div>
            <Settings size={14} color="rgba(255,255,255,0.4)"/>
          </button>

        </div>
      </aside>
    </>
  );
}
