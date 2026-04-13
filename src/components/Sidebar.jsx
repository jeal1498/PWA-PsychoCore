// ─────────────────────────────────────────────────────────────────────────────
// src/components/Sidebar.jsx
// Tres variantes responsivas:
//   • Desktop  (≥900px) — sidebar completo 240px, fijo a la izquierda
//   • Tablet   (600–899px) — sidebar colapsado 64px, solo iconos + tooltips
//   • Móvil    (<600px) — bottom nav fija (los 4 módulos principales + "Más")
//               El drawer overlay anterior se elimina en favor de la bottom nav.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import {
  Home, Users, Calendar, FileText, DollarSign, LogOut,
  Brain, Settings, BarChart2, ShieldAlert, ClipboardList,
  Target, ScrollText, CheckSquare, MoreHorizontal,
} from "lucide-react";
import { T } from "../theme.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useIsWide }   from "../hooks/useIsWide.js";

// ── Paleta de la nueva propuesta visual ──────────────────────────────────────
const S = {
  bg:           "#141C1B",           // Sidebar background
  accent:       "#4AADA0",           // Teal activo
  accentDim:    "rgba(74,173,160,0.13)", // Fondo ítem activo
  accentGlow:   "rgba(74,173,160,0.35)", // Sombra logo
  fg:           "rgba(255,255,255,0.50)", // Texto inactivo
  fgHov:        "rgba(255,255,255,0.85)",
  fgActive:     "#4AADA0",
  divider:      "rgba(255,255,255,0.07)",
  footerBdr:    "rgba(255,255,255,0.06)",
  danger:       "#D95858",
  logoutHov:    "rgba(217,88,88,0.10)",
  logoutHovFg:  "#E07070",
};

// ── Grupos de navegación ─────────────────────────────────────────────────────
export const NAV_GROUPS = [
  {
    id: "clinical", label: "Clínica diaria",
    items: [
      { id: "dashboard", icon: Home,         label: "Inicio"      },
      { id: "agenda",    icon: Calendar,     label: "Agenda"      },
      { id: "sessions",  icon: FileText,     label: "Sesiones"    },
      { id: "patients",  icon: Users,        label: "Pacientes"   },
    ],
  },
  {
    id: "tools", label: "Herramientas clínicas",
    items: [
      { id: "risk",      icon: ShieldAlert,   label: "Riesgo",      alert: true },
      { id: "treatment", icon: Target,        label: "Tratamiento"  },
      { id: "scales",    icon: ClipboardList, label: "Escalas"      },
      { id: "tasks",     icon: CheckSquare,   label: "Tareas"       },
    ],
  },
  {
    id: "admin", label: "Gestión",
    items: [
      { id: "finance",  icon: DollarSign, label: "Finanzas"     },
      { id: "reports",  icon: ScrollText, label: "Informes"     },
      { id: "stats",    icon: BarChart2,  label: "Estadísticas" },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// Módulos visibles en bottom nav (móvil)
const BOTTOM_NAV_IDS = ["dashboard", "agenda", "sessions", "patients"];

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: botón de cerrar sesión (hover state aislado)
// ─────────────────────────────────────────────────────────────────────────────
function LogoutButton({ onSignOut, onClose }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => { onClose?.(); onSignOut?.(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 12px", borderRadius: 10,
        border: "none", cursor: "pointer", fontFamily: T.fB,
        fontSize: 13, fontWeight: 400,
        background: hov ? S.logoutHov : "transparent",
        color:      hov ? S.logoutHovFg : "rgba(255,255,255,0.28)",
        transition: "background .15s, color .15s",
      }}
    >
      <LogOut size={15} strokeWidth={1.8} />
      Cerrar sesión
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: ítem de nav con hover state aislado (desktop + tablet)
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({ id, icon: Icon, label, isActive, showDot, onClick, collapsed = false }) {
  const [hov, setHov] = useState(false);

  if (collapsed) {
    // Tablet: solo icono con tooltip nativo
    return (
      <button
        title={label}
        onClick={() => onClick(id)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 44, height: 40, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", border: "none",
          background: isActive ? S.accentDim : hov ? "rgba(255,255,255,0.06)" : "transparent",
          color:      isActive ? S.fgActive  : hov ? S.fgHov : S.fg,
          transition: "background .15s, color .15s",
          position: "relative", flexShrink: 0,
        }}
      >
        <Icon size={17} strokeWidth={1.8} />
        {showDot && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            width: 7, height: 7, borderRadius: "50%",
            background: S.danger, border: `1.5px solid ${S.bg}`,
          }} />
        )}
      </button>
    );
  }

  // Desktop: ítem completo con barra lateral activa
  return (
    <button
      onClick={() => onClick(id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "10px 12px", borderRadius: 10,
        border: "none", cursor: "pointer", fontFamily: T.fB,
        fontSize: 13.5, fontWeight: isActive ? 600 : 400,
        marginBottom: 1, textAlign: "left",
        background: isActive ? S.accentDim : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color:      isActive ? S.fgActive  : hov ? S.fgHov : S.fg,
        transition: "background .15s, color .15s",
        position: "relative",
      }}
    >
      {/* Barra lateral del ítem activo */}
      {isActive && (
        <span style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 3, height: 20, borderRadius: "0 3px 3px 0",
          background: S.accent,
        }} />
      )}
      <span style={{ display: "inline-flex", position: "relative", flexShrink: 0 }}>
        <Icon size={16} strokeWidth={1.8} />
        {showDot && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            width: 7, height: 7, borderRadius: "50%",
            background: S.danger, border: `1.5px solid ${S.bg}`,
          }} />
        )}
      </span>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: logo/marca del sidebar
// ─────────────────────────────────────────────────────────────────────────────
function SidebarLogo({ collapsed = false }) {
  const iconStyle = {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: `linear-gradient(135deg, ${S.accent} 0%, #2E8A7D 100%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 2px 8px ${S.accentGlow}`,
  };

  return (
    <div style={{
      padding: collapsed ? "20px 0 16px" : "22px 20px 18px",
      display: "flex", alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: 11,
      borderBottom: `1px solid ${S.divider}`,
      marginBottom: 8, flexShrink: 0,
    }}>
      <div style={iconStyle}>
        <Brain size={18} color="#fff" strokeWidth={1.5} />
      </div>
      {!collapsed && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>
            PsychoCore
          </div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginTop: 2 }}>
            Gestión clínica
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: pie de sidebar — perfil + ajustes + cerrar sesión
// ─────────────────────────────────────────────────────────────────────────────
function SidebarFooter({ profile, googleUser, active, onNav, onSignOut, onClose, collapsed = false }) {
  const googleName  = googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || "";
  const displayName = profile?.name || googleName || "Psicólogo/a";
  const displaySpec = profile?.specialty
    || (Array.isArray(profile?.specialties) && profile.specialties.length > 0 ? profile.specialties[0] : "Psicología clínica");
  const initials    = profile?.initials
    || (displayName !== "Psicólogo/a" ? displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PS");
  const avatarUrl   = profile?.avatarUrl || null;

  const [hovCard, setHovCard] = useState(false);

  const avatarEl = (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      background: `linear-gradient(135deg, ${S.accent} 0%, #2E8A7D 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ fontFamily: T.fH, fontSize: 13, color: "#fff", fontWeight: 600 }}>{initials}</span>
      }
    </div>
  );

  if (collapsed) {
    return (
      <div style={{ padding: "10px 0 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderTop: `1px solid ${S.footerBdr}`, flexShrink: 0 }}>
        <button
          title={displayName}
          onClick={() => onNav("settings")}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, borderRadius: "50%", opacity: hovCard ? 0.75 : 1, transition: "opacity .15s" }}
          onMouseEnter={() => setHovCard(true)}
          onMouseLeave={() => setHovCard(false)}
        >
          {avatarEl}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px 10px 20px", flexShrink: 0, borderTop: `1px solid ${S.footerBdr}` }}>
      <button
        onClick={() => onNav("settings")}
        onMouseEnter={() => setHovCard(true)}
        onMouseLeave={() => setHovCard(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 12px", borderRadius: 10,
          border: "none", cursor: "pointer", marginBottom: 2,
          background: hovCard || active === "settings" ? "rgba(255,255,255,0.07)" : "transparent",
          transition: "background .15s",
        }}
      >
        {avatarEl}
        <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
          <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displayName}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displaySpec}
          </div>
        </div>
        <Settings size={14} color="rgba(255,255,255,0.35)" />
      </button>
      <LogoutButton onSignOut={onSignOut} onClose={onClose} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: Bottom Nav (solo móvil)
// ─────────────────────────────────────────────────────────────────────────────
function BottomNav({ active, onNav, riskAlert }) {
  const bottomItems = NAV_ITEMS.filter(i => BOTTOM_NAV_IDS.includes(i.id));
  const hasMore = !BOTTOM_NAV_IDS.includes(active);  // el módulo activo no está en bottom nav
  const moreActive = hasMore;

  // "Más" abre la sección activa ya renderizada; el drawer se gestiona desde App
  return (
    <nav style={{
      height: 62, background: "#fff",
      borderTop: "1px solid rgba(0,0,0,0.07)",
      display: "flex", alignItems: "center",
      justifyContent: "space-around", padding: "0 6px",
      flexShrink: 0,
      boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
    }}>
      {bottomItems.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <BnItem key={id} id={id} icon={Icon} label={label} isActive={isActive} onNav={onNav} />
        );
      })}
      {/* "Más" — accede a secciones secundarias */}
      <BnItem
        id="__more__"
        icon={MoreHorizontal}
        label="Más"
        isActive={moreActive}
        onNav={() => onNav("__more__")}
        showDot={riskAlert}
      />
    </nav>
  );
}

// BnItem aislado para hover state
function BnItem({ id, icon: Icon, label, isActive, onNav, showDot }) {
  const [hov, setHov] = useState(false);
  const accent = S.accent;
  return (
    <button
      onClick={() => onNav(id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 4, padding: "6px 10px",
        borderRadius: 12, cursor: "pointer", flex: 1,
        border: "none",
        background: isActive ? `rgba(74,173,160,0.09)` : hov ? "rgba(0,0,0,0.03)" : "transparent",
        color: isActive ? accent : "rgba(0,0,0,0.4)",
        transition: "background .15s, color .15s",
        position: "relative",
      }}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span style={{ fontFamily: T.fB, fontSize: 9.5, fontWeight: isActive ? 600 : 500 }}>
        {label}
      </span>
      {showDot && (
        <span style={{
          position: "absolute", top: 6,
          right: "calc(50% - 14px)",
          width: 6, height: 6, borderRadius: "50%",
          background: S.danger,
        }} />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal exportado
// ─────────────────────────────────────────────────────────────────────────────
export default function Sidebar({
  active,
  setActive,
  open,          // solo usado en desktop/tablet para compatibilidad; móvil ignora
  onClose,
  profile,
  googleUser,
  riskAlert = false,
  onSignOut,
  // Nueva prop para el módulo "Más" en bottom nav
  onOpenMore,
}) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  // Tablet: ancho < 900px y no móvil (<600px)
  // Los hooks useIsMobile/useIsWide deben quedar tal como están en el proyecto.
  // Definimos tablet como: !isMobile && !isWide (ancho medio).
  // Si isWide = ≥1100px y isMobile = <600px, tablet = 600–1099px.
  const isTablet = !isMobile && !isWide;

  // Escape para cerrar sidebar en desktop/tablet si estuviera en un drawer futuro
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && open) onClose?.(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const handleNav = (id) => {
    if (id === "__more__") {
      onOpenMore?.();
      return;
    }
    setActive(id);
    if (isMobile) onClose?.();
  };

  // ── MÓVIL: solo bottom nav; el resto de App.jsx renderiza sin sidebar lateral
  if (isMobile) {
    return <BottomNav active={active} onNav={handleNav} riskAlert={riskAlert} />;
  }

  // ── TABLET: sidebar icon-only 64px
  if (isTablet) {
    return (
      <aside style={{
        width: 64,
        background: S.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0,
        // Gradiente ambiental sutil
        backgroundImage: `radial-gradient(ellipse 200% 60% at 50% 0%, rgba(74,173,160,0.09) 0%, transparent 50%)`,
      }}>
        <SidebarLogo collapsed />

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0", gap: 2, width: "100%", overflowY: "auto", scrollbarWidth: "none" }}>
          {NAV_GROUPS.map((group, gi) => (
            <React.Fragment key={group.id}>
              {gi > 0 && (
                <div style={{ width: 28, height: 1, background: S.divider, margin: "6px 0", flexShrink: 0 }} />
              )}
              {group.items.map(({ id, icon: Icon, label, alert }) => (
                <NavItem
                  key={id} id={id} icon={Icon} label={label}
                  isActive={active === id}
                  showDot={alert && riskAlert}
                  onClick={handleNav}
                  collapsed
                />
              ))}
            </React.Fragment>
          ))}
        </nav>

        <SidebarFooter
          profile={profile} googleUser={googleUser}
          active={active} onNav={handleNav}
          onSignOut={onSignOut} onClose={onClose}
          collapsed
        />
      </aside>
    );
  }

  // ── DESKTOP: sidebar completo 240px
  const sidebarW = isWide ? 248 : 220;

  return (
    <aside style={{
      width: sidebarW, background: S.bg,
      display: "flex", flexDirection: "column",
      flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0,
      backgroundImage: `
        radial-gradient(ellipse 180% 70% at 50% 0%, rgba(74,173,160,0.08) 0%, transparent 55%),
        radial-gradient(ellipse 120% 50% at 10% 100%, rgba(74,173,160,0.04) 0%, transparent 50%)
      `,
    }}>
      <SidebarLogo />

      <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto", minHeight: 0, scrollbarWidth: "none" }}>
        {NAV_GROUPS.map((group, gi) => (
          <React.Fragment key={group.id}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.20)",
              padding: gi === 0 ? "6px 12px 5px" : "14px 12px 5px",
            }}>
              {group.label}
            </div>
            {group.items.map(({ id, icon: Icon, label, alert }) => (
              <NavItem
                key={id} id={id} icon={Icon} label={label}
                isActive={active === id}
                showDot={alert && riskAlert}
                onClick={handleNav}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      <SidebarFooter
        profile={profile} googleUser={googleUser}
        active={active} onNav={handleNav}
        onSignOut={onSignOut} onClose={onClose}
      />
    </aside>
  );
}
