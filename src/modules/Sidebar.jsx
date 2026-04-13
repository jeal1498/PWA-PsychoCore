import React, { useEffect } from "react";
import { Home, Users, Calendar, FileText, DollarSign, LogOut, Brain, Settings, BarChart2, ShieldAlert, ClipboardList, Target, ScrollText, CheckSquare } from "lucide-react";
import { T } from "../theme.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useIsWide }   from "../hooks/useIsWide.js";

export const NAV_GROUPS = [
  {
    id: 'clinical', label: 'Clínica diaria',
    items: [
      { id:'dashboard', icon:Home,         label:'Inicio'     },
      { id:'agenda',    icon:Calendar,     label:'Agenda'     },
      { id:'sessions',  icon:FileText,     label:'Sesiones'   },
      { id:'patients',  icon:Users,        label:'Pacientes'  },
    ]
  },
  {
    id: 'tools', label: 'Herramientas clínicas',
    items: [
      { id:'risk',      icon:ShieldAlert,   label:'Riesgo',      alert:true },
      { id:'treatment', icon:Target,        label:'Tratamiento' },
      { id:'scales',    icon:ClipboardList, label:'Escalas'     },
      { id:'tasks',     icon:CheckSquare,   label:'Tareas'      },
    ]
  },
  {
    id: 'admin', label: 'Gestión',
    items: [
      { id:'finance',  icon:DollarSign, label:'Finanzas'      },
      { id:'reports',  icon:ScrollText, label:'Informes'      },
      { id:'stats',    icon:BarChart2,  label:'Estadísticas'  },
    ]
  }
];
// Export de compatibilidad — no rompe imports externos
export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ── LogoutButton ──────────────────────────────────────────────────────────────
// Subcomponente aislado para evitar el hover-state inline sobre el padre
function LogoutButton({ onSignOut, onClose }) {
  const [hov, setHov] = React.useState(false);

  const handleClick = () => {
    if (onClose) onClose();
    if (onSignOut) onSignOut();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 12px", borderRadius: 10,
        border: "none", cursor: "pointer", fontFamily: T.fB,
        fontSize: 13, fontWeight: 400,
        background: hov ? "rgba(224,82,82,0.10)" : "transparent",
        color: hov ? "#E05252" : "rgba(255,255,255,0.35)",
        transition: "background .15s, color .15s",
      }}
    >
      <LogOut size={15} strokeWidth={1.8}/>
      Cerrar sesión
    </button>
  );
}

export default function Sidebar({ active, setActive, open, onClose, profile, googleUser, riskAlert = false, onSignOut }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const handleNav = (id) => { setActive(id); if (isMobile) onClose(); };

  // Fallback chain: perfil guardado → nombre Google OAuth → placeholder
  const googleName = googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || "";
  const displayName = profile?.name || googleName || "Psicólogo/a";
  const displaySpec = profile?.specialty ||
    (Array.isArray(profile?.specialties) && profile.specialties.length > 0
      ? profile.specialties[0]
      : "Psicólogo Clínico");
  const initials = profile?.initials
    || (displayName && displayName !== "Psicólogo/a"
        ? displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
        : "PS");
  const avatarUrl = profile?.avatarUrl || null;

  const sidebarStyle = isMobile
    ? { position:"fixed", top:0, left:0, bottom:0, zIndex:1100, width:260, background:T.nav, display:"flex", flexDirection:"column", transform:open?"translateX(0)":"translateX(-100%)", transition:"transform .28s cubic-bezier(.4,0,.2,1)", boxShadow:open?"4px 0 32px rgba(0,0,0,0.25)":"none" }
    : { width: isWide ? 248 : 220, background:T.nav, display:"flex", flexDirection:"column", flexShrink:0, minHeight:"100vh", position:"sticky", top:0 };

  return (
    <>
      {isMobile && (
        <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1099, background:"rgba(0,0,0,0.45)", opacity:open?1:0, pointerEvents:open?"auto":"none", transition:"opacity .28s ease" }}/>
      )}

      <aside style={sidebarStyle}>
        <div style={{ padding:"24px 20px 20px", display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:T.p, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Brain size={18} color="#fff" strokeWidth={1.5}/>
            </div>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:18, fontWeight:600, color:"#fff" }}>PsychoCore</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontFamily:T.fB, letterSpacing:"0.08em" }}>GESTIÓN CLÍNICA</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"0 12px", overflowY:"auto", minHeight:0 }}>
          {NAV_GROUPS.map((group, gi) => (
            <React.Fragment key={group.id}>
              <div style={{
                fontSize:9, fontWeight:800, letterSpacing:'0.13em',
                textTransform:'uppercase', color:'rgba(255,255,255,0.25)',
                padding: gi === 0 ? '6px 14px 4px' : '14px 14px 4px'
              }}>
                {group.label}
              </div>
              {group.items.map(({ id, icon:Icon, label, alert }) => {
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
            </React.Fragment>
          ))}
        </nav>

        <div style={{ padding:"10px 12px 16px", flexShrink:0 }}>
          <div style={{ height:1, background:"rgba(255,255,255,0.08)", marginBottom:12 }}/>
          <button onClick={() => handleNav("settings")}
            style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:active==="settings"?"rgba(255,255,255,0.08)":"transparent", transition:"all .15s", marginBottom:2 }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background=active==="settings"?"rgba(255,255,255,0.08)":"transparent"}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.p, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontFamily:T.fH, fontSize:13, color:"#fff", fontWeight:600 }}>{initials}</span>
              }
            </div>
            <div style={{ flex:1, textAlign:"left", overflow:"hidden" }}>
              <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayName}</div>
              <div style={{ fontFamily:T.fB, fontSize:11, color:"rgba(255,255,255,0.4)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displaySpec}</div>
            </div>
            <Settings size={14} color="rgba(255,255,255,0.4)"/>
          </button>

          <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"2px 0" }}/>

          <LogoutButton onSignOut={onSignOut} onClose={isMobile ? onClose : undefined} />
        </div>
      </aside>
    </>
  );
}
