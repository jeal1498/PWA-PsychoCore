// ─────────────────────────────────────────────────────────────────────────────
// src/App.jsx — FASE 1 refactorizado
// Responsabilidad: Auth, UI shell, navegación y tema.
// El estado de datos (pacientes, sesiones, etc.) vive en AppStateContext.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Brain } from "lucide-react";
import { T } from "./theme.js";
import { useIsMobile }      from "./hooks/useIsMobile.js";
import { useIsWide }        from "./hooks/useIsWide.js";
import { useNotifications } from "./hooks/useNotifications.js";
import { useAppState }      from "./context/AppStateContext.jsx";
import { supabase, signOut, getOrCreatePsychologist, hasActiveAccess, trialDaysLeft } from "./lib/supabase.js";
import { emit } from "./lib/eventBus.js";

import LockScreen        from "./components/LockScreen.jsx";
import Onboarding        from "./components/Onboarding.jsx";
import PatientPortalComp from "./modules/PatientPortalSecure.jsx";
import Sidebar           from "./components/Sidebar.jsx";
import GlobalSearch      from "./components/GlobalSearch.jsx";
import NotificationBell  from "./components/NotificationBell.jsx";
import SyncToast         from "./components/SyncToast.jsx";

// Lazy loading — cada módulo se descarga solo cuando el usuario lo abre por primera vez
const Dashboard     = lazy(() => import("./modules/Dashboard/Dashboard.jsx"));
const Patients      = lazy(() => import("./modules/Patients/Patients.jsx"));
const Agenda        = lazy(() => import("./modules/Agenda/Agenda.jsx"));
const Sessions      = lazy(() => import("./modules/Sessions/Sessions.jsx"));
const Finance       = lazy(() => import("./modules/Finance/Finance.jsx"));
const Settings      = lazy(() => import("./modules/Settings/Settings.jsx"));
const Stats         = lazy(() => import("./modules/Stats/Stats.jsx"));
const RiskAssessment= lazy(() => import("./modules/RiskAssessment/RiskAssessment.jsx"));
const Scales        = lazy(() => import("./modules/Scales/Scales.jsx"));
const TreatmentPlan = lazy(() => import("./modules/TreatmentPlan/TreatmentPlan.jsx"));
const Reports       = lazy(() => import("./modules/Reports/Reports.jsx"));
const Tasks         = lazy(() => import("./modules/Tasks/Tasks.jsx"));

// ── Paleta del nuevo topbar ───────────────────────────────────────────────────
// Hereda T.* pero el header pasa a fondo blanco en todos los breakpoints.
const NAV_ACCENT = "#4AADA0";

// Mapa módulo → label legible para el breadcrumb del topbar
const MODULE_LABELS = {
  dashboard:  "Inicio",
  agenda:     "Agenda",
  sessions:   "Sesiones",
  patients:   "Pacientes",
  risk:       "Evaluación de riesgo",
  treatment:  "Plan de tratamiento",
  scales:     "Escalas",
  tasks:      "Tareas",
  finance:    "Finanzas",
  reports:    "Informes",
  stats:      "Estadísticas",
  settings:   "Configuración",
};

// Formato de fecha corta: "Lun 13 abr"
function formatShortDate() {
  const d = new Date();
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
    .replace(/^\w/, c => c.toUpperCase());
}

// ── Drawer "Más" para móvil ───────────────────────────────────────────────────
// Muestra los módulos que no caben en la bottom nav (herramientas + gestión).
import { NAV_GROUPS } from "./components/Sidebar.jsx";
const BOTTOM_NAV_IDS = ["dashboard", "agenda", "sessions", "patients"];

function MoreDrawer({ active, onNav, onClose, profile, googleUser, onSignOut, riskAlert }) {
  const googleName  = googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || "";
  const displayName = profile?.name || googleName || "Psicólogo/a";
  const displaySpec = profile?.specialty || "Psicología clínica";
  const initials    = profile?.initials
    || (displayName !== "Psicólogo/a" ? displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PS");
  const avatarUrl   = profile?.avatarUrl || null;

  const secondaryGroups = NAV_GROUPS.filter(g => g.id !== "clinical");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 299,
          background: "rgba(0,0,0,0.45)",
          animation: "fadeIn .2s ease",
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 300,
        background: "#141C1B",
        borderRadius: "20px 20px 0 0",
        padding: "12px 16px 40px",
        animation: "slideUp .25s cubic-bezier(.4,0,.2,1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" }} />

        {/* Perfil */}
        <button
          onClick={() => { onNav("settings"); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "12px 14px", borderRadius: 14,
            border: "none", cursor: "pointer",
            background: active === "settings" ? "rgba(74,173,160,0.13)" : "rgba(255,255,255,0.05)",
            marginBottom: 16,
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
            background: `linear-gradient(135deg, ${NAV_ACCENT} 0%, #2E8A7D 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontFamily: T.fH, fontSize: 14, color: "#fff", fontWeight: 600 }}>{initials}</span>
            }
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: "#fff" }}>{displayName}</div>
            <div style={{ fontFamily: T.fB, fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>{displaySpec}</div>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: T.fB }}>Configuración →</span>
        </button>

        {/* Grupos secundarios */}
        {secondaryGroups.map(group => (
          <div key={group.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", padding: "0 4px 8px" }}>
              {group.label}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {group.items.map(({ id, icon: Icon, label, alert }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => { onNav(id); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 14px", borderRadius: 12,
                      border: "none", cursor: "pointer", fontFamily: T.fB,
                      fontSize: 13.5, fontWeight: isActive ? 600 : 400,
                      background: isActive ? "rgba(74,173,160,0.15)" : "rgba(255,255,255,0.06)",
                      color: isActive ? NAV_ACCENT : "rgba(255,255,255,0.65)",
                      position: "relative",
                    }}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {label}
                    {alert && riskAlert && (
                      <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#D95858" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Cerrar sesión */}
        <button
          onClick={() => { onClose(); onSignOut(); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "12px", borderRadius: 12, marginTop: 4,
            border: "none", cursor: "pointer", fontFamily: T.fB,
            fontSize: 13.5, color: "rgba(255,255,255,0.35)",
            background: "transparent",
          }}
        >
          Cerrar sesión
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>
    </>
  );
}

export default function App() {
  // ── Estado de contexto ───────────────────────────────────────────────────
  const {
    patients,        setPatients,
    appointments,    setAppointments,
    sessions,        setSessions,
    payments,        setPayments,
    profile,         setProfile,
    riskAssessments, setRiskAssessments,
    scaleResults,    setScaleResults,
    treatmentPlans,  setTreatmentPlans,
    interSessions,   setInterSessions,
    medications,     setMedications,
    services,        setServices,
    assignments,
    activePatientContext, setActivePatientContext,
    dataReady,
    dataLoaded,
    dataTimedOut,
    authReady,
    allData,
    mp,
  } = useAppState();

  const [user,               setUser]               = useState(null);
  const [authLoading,        setAuthLoading]        = useState(true);
  const [psychologist,       setPsychologist]       = useState(null);
  const [psychologistLoaded, setPsychologistLoaded] = useState(false);
  const [activeModule,  setActiveModule]  = useState(
    () => localStorage.getItem("pc_last_module") || "dashboard"
  );
  // sidebarOpen ya no controla el drawer móvil (se eliminó),
  // pero lo mantenemos por si algún módulo hijo lo referencia.
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [moreOpen,      setMoreOpen]      = useState(false);   // drawer "Más" en móvil
  const [sessionPrefill,setSessionPrefill]= useState(null);
  const [openAction,    setOpenAction]    = useState(null);
  const [settingsTab,   setSettingsTab]   = useState("profile");

  const [darkPref, setDarkPref] = useState(() => localStorage.getItem("pc_dark_pref") || "auto");
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const darkMode = darkPref === "auto" ? systemDark : darkPref === "dark";

  const isMobile      = useIsMobile();
  const isWide        = useIsWide();
  const patientsNavRef= useRef(null);

  const syncActivePatientContext = (data) => {
    if (!data) return;
    const patientId = data.patientId || data.id || data.patient_id || null;
    if (!patientId) return;
    const patientName = data.patientName || data.name || "";
    setActivePatientContext(prev => {
      if (prev?.patientId === patientId && prev?.patientName === patientName) return prev;
      return { patientId, patientName, source: data.source || "ui", updatedAt: new Date().toISOString() };
    });
  };

  // ── Supabase Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const psyData = await getOrCreatePsychologist(session.user.id);
          setPsychologist(psyData);
        } catch (e) {
          console.error("Trial check error:", e);
        }
        setPsychologistLoaded(true);
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (session?.user) {
        setUser(session.user);
        try {
          const psyData = await getOrCreatePsychologist(session.user.id);
          setPsychologist(psyData);
        } catch (e) {
          console.error("Trial check error:", e);
        }
        setPsychologistLoaded(true);
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else {
        setUser(null);
        setPsychologist(null);
        setPsychologistLoaded(false);
      }
      setAuthLoading(false);
    });

    const timeout = setTimeout(() => setAuthLoading(false), 8000);
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  // ── Persistir módulo activo ──────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("pc_last_module", activeModule);
  }, [activeModule]);

  // ── Tema ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("pc_dark_pref", darkPref);
  }, [darkMode, darkPref]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setSystemDark(mq.matches);
      if (darkPref === "auto") {
        document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [darkPref]);

  // ── Onboarding ───────────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!dataLoaded || !user) return;
    const key = `pc_onboarding_done_${user.id}`;
    if (localStorage.getItem(key)) return;
    const t = setTimeout(() => {
      if (patients.length === 0) setShowOnboarding(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [dataLoaded, user, patients.length]);

  const handleOnboardingClose = (data) => {
    if (user) localStorage.setItem(`pc_onboarding_done_${user.id}`, "1");
    if (data) {
      setProfile(prev => ({
        ...prev,
        name:         data.name         || prev.name,
        phone:        data.phone        || prev.phone,
        email:        data.email        || prev.email,
        cedula:       data.cedula       || prev.cedula,
        rfc:          data.rfc          || prev.rfc,
        clinic:       data.clinic       || prev.clinic,
        address:      data.address      || prev.address,
        description:  data.description  || prev.description,
        avatarUrl:    data.avatarUrl    || prev.avatarUrl,
        specialty:    data.specialty    || (Array.isArray(data.specialties) ? data.specialties[0] : "") || prev.specialty,
        specialties:  data.specialties  || prev.specialties,
        initials:     data.initials     || prev.initials,
        agendaType:   data.agendaType   || prev.agendaType,
        duration:     data.duration     || prev.duration,
        durationMin:  data.durationMin  ?? prev.durationMin,
        modality:     data.modality     || prev.modality,
        mapsLink:     data.mapsLink     || prev.mapsLink,
        activeDays:   data.activeDays   || prev.activeDays,
        schedule:     data.schedule     || prev.schedule,
        workingDays:  data.workingDays  || prev.workingDays,
        workingStart: data.workingStart || prev.workingStart,
        workingEnd:   data.workingEnd   || prev.workingEnd,
        currency:     data.currency     || prev.currency,
        currencies:   data.currencies   || prev.currencies,
        showPrice:    data.showPrice    !== undefined ? data.showPrice : prev.showPrice,
        payPolicy:    data.payPolicy    || prev.payPolicy,
        sources:      data.sources      || prev.sources,
      }));
      if (data.services && data.services.length > 0) setServices(data.services);
    }
    setShowOnboarding(false);
  };

  // ── Notificaciones ───────────────────────────────────────────────────────
  const { notifications, dismiss, dismissAll } = useNotifications(user ? appointments : [], user ? assignments : []);

  // ── Navegación ───────────────────────────────────────────────────────────
  const navTo = (mod) => {
    setActiveModule(mod);
    setOpenAction(null);
    setSessionPrefill(null);
    setMoreOpen(false);
    window.history.pushState({ module: mod }, "", window.location.pathname);
  };

  const quickNav = (mod, action, tab, payload) => {
    setActiveModule(mod);
    setOpenAction({ module: mod, action, ts: Date.now(), payload: payload || null });
    if (mod === "settings" && tab) setSettingsTab(tab);
    if (mod !== "sessions") setSessionPrefill(null);
    if (payload) syncActivePatientContext(payload);
    setMoreOpen(false);
    window.history.pushState({ module: mod }, "", window.location.pathname);
  };

  const handleGlobalNav = (module, data) => {
    if (module === "sessions" && data?.quickAction === "newSession") {
      syncActivePatientContext(data);
      handleNewSession(data);
      return;
    }
    if (module === "finance" && data?.quickAction === "newPayment") {
      syncActivePatientContext(data);
      quickNav("finance", "add", null, data);
      return;
    }
    setActiveModule(module);
    syncActivePatientContext(data);
    if (module === "patients" && data && patientsNavRef.current)
      setTimeout(() => patientsNavRef.current?.(data), 80);
  };

  // Android / browser back button
  useEffect(() => {
    const handlePop = () => {
      setActiveModule("dashboard");
      setOpenAction(null);
      setSessionPrefill(null);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // ── Atajos de teclado globales ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "s" && activeModule === "sessions") { e.preventDefault(); emit.sessionSave(); }
      if (e.key === "n") { e.preventDefault(); handleNewSession(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeModule]);

  // ── Handlers de sesión ───────────────────────────────────────────────────
  const handleStartSession = (appt) => {
    if (!appt?.patientId) return;
    setSessionPrefill({
      patientId: appt.patientId,
      date: appt.date,
      serviceId: appt.serviceId || "",
      serviceName: appt.type || "",
      modality: appt.modality || "",
    });
    syncActivePatientContext(appt);
    setActiveModule("sessions");
    setOpenAction(null);
  };

  const handleNewSession = (context = activePatientContext) => {
    const today = new Date().toISOString().split("T")[0];
    setSessionPrefill(context?.patientId
      ? { patientId: context.patientId, patientName: context.patientName || "", date: today }
      : { patientId: "", date: today, _empty: true });
    setActiveModule("sessions");
    setOpenAction(null);
  };

  const handleLock = async () => { await signOut(); setSidebarOpen(false); setMoreOpen(false); };

  // ── Alerta de riesgo para sidebar ────────────────────────────────────────
  const riskAlert = riskAssessments.some(a => {
    const latest = riskAssessments
      .filter(r => r.patientId === a.patientId)
      .sort((x, y) => y.date.localeCompare(x.date))[0];
    return latest?.id === a.id && (a.riskLevel === "alto" || a.riskLevel === "inminente");
  });

  // ── Render de módulos ────────────────────────────────────────────────────
  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":   return <Dashboard {...mp} profile={profile} googleUser={user} onNavigate={navTo} onQuickNav={quickNav} onStartSession={handleStartSession} onNewSession={handleNewSession} onSignOut={handleLock}/>;
      case "patients":    return <Patients  {...mp} key={openAction?.module==="patients" ? openAction.ts : "p"} autoOpen={openAction?.module==="patients" ? openAction.action : null} onQuickNav={patientsNavRef} profile={profile}/>;
      case "agenda":      return <Agenda    {...mp} key={openAction?.module==="agenda"   ? openAction.ts : "a"} autoOpen={openAction?.module==="agenda"   ? openAction.action : null} profile={profile} onStartSession={handleStartSession} onPrimerContacto={() => quickNav("patients", "add")} onNavigate={(module, data, tab) => {
                                if (module === "settings") {
                                  if (tab) setSettingsTab(tab);
                                  navTo("settings");
                                  return;
                                }
                                navTo(module);
                              }}/>;
      case "sessions":    return <Sessions  {...mp} key={JSON.stringify(sessionPrefill)} profile={profile} prefill={sessionPrefill} onNavigate={navTo}/>;
      case "finance":     return <Finance
        {...mp}
        key={openAction?.module==="finance"  ? openAction.ts : "f"}
        autoOpen={openAction?.module==="finance"  ? openAction.action : null}
        openCobroId={openAction?.module==="finance" ? openAction.payload?.openCobroId : null}
        profile={profile}
      />;
      case "tasks":       return <Tasks patients={patients} sessions={sessions} onNavigate={navTo} profile={profile}/>;
      case "stats":       return <Stats patients={patients} appointments={appointments} sessions={sessions} payments={payments} services={services} riskAssessments={riskAssessments} scaleResults={scaleResults} profile={profile}/>;
      case "risk":        return <RiskAssessment riskAssessments={riskAssessments} setRiskAssessments={setRiskAssessments} patients={patients} profile={profile}/>;
      case "scales":      return <Scales    scaleResults={scaleResults} setScaleResults={setScaleResults} patients={patients} profile={profile}/>;
      case "treatment":   return <TreatmentPlan treatmentPlans={treatmentPlans} setTreatmentPlans={setTreatmentPlans} patients={patients} sessions={sessions} profile={profile} scaleResults={scaleResults} setAppointments={setAppointments}/>;
      case "reports":     return <Reports patients={patients} sessions={sessions} scaleResults={scaleResults} treatmentPlans={treatmentPlans} riskAssessments={riskAssessments} profile={profile}/>;
      case "settings":    return (
        <Settings profile={profile} setProfile={setProfile}
          darkMode={darkPref} setDarkMode={setDarkPref}
          setPatients={setPatients} patients={patients}
          googleUser={user}
          psychologist={psychologist}
          allData={allData}
          services={services} setServices={setServices}
          initialTab={settingsTab}
          onRestore={(data) => {
            if (data.patients)        setPatients(data.patients);
            if (data.appointments)    setAppointments(data.appointments);
            if (data.sessions)        setSessions(data.sessions);
            if (data.payments)        setPayments(data.payments);
            if (data.profile)         setProfile(data.profile);
            if (data.riskAssessments) setRiskAssessments(data.riskAssessments);
            if (data.scaleResults)    setScaleResults(data.scaleResults);
            if (data.treatmentPlans)  setTreatmentPlans(data.treatmentPlans);
            if (data.interSessions)   setInterSessions(data.interSessions);
            if (data.medications)     setMedications(data.medications);
            if (data.services)        setServices(data.services);
          }}
        />
      );
      default: return <Dashboard {...mp} profile={profile} googleUser={user} onNavigate={navTo} onQuickNav={quickNav} onStartSession={handleStartSession} onNewSession={handleNewSession} onSignOut={handleLock}/>;
    }
  };

  // ── Guards de renderizado ────────────────────────────────────────────────
  if (window.location.pathname === "/portal" || window.location.pathname === "/p") {
    return <PatientPortalComp />;
  }

  if (authLoading || !authReady) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <LockScreen />;

  if (psychologistLoaded && psychologist && !hasActiveAccess(psychologist)) {
    return (
      <div style={{ minHeight:"100vh", background:`linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:T.fB }}>
        <div style={{ textAlign:"center", color:"#fff", maxWidth:400 }}>
          <div style={{ fontSize:56, marginBottom:20 }}>⏰</div>
          <div style={{ fontFamily:T.fH, fontSize:36, fontWeight:300, marginBottom:12 }}>Tu prueba gratuita ha terminado</div>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.65)", lineHeight:1.7, marginBottom:36 }}>
            Tus 30 días de prueba han concluido. Suscríbete para seguir accediendo a todos tus expedientes y funcionalidades.
          </p>
          <div style={{ background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.15)", borderRadius:20, padding:"28px 24px", marginBottom:20 }}>
            <div style={{ fontFamily:T.fH, fontSize:56, fontWeight:300, color:"#fff", lineHeight:1 }}><sup style={{ fontSize:22, opacity:.6 }}>$</sup>299<span style={{ fontSize:20, opacity:.4 }}>/mes</span></div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", margin:"6px 0 20px" }}>MXN · Cancela cuando quieras</div>
            <a href="mailto:soporte@psychocore.app?subject=Suscripción PsychoCore"
              style={{ display:"block", width:"100%", padding:"15px", borderRadius:100, background:"#fff", color:"#1E3535", fontFamily:T.fB, fontSize:15, fontWeight:700, textDecoration:"none", textAlign:"center" }}>
              Suscribirme ahora →
            </a>
          </div>
          <button onClick={() => signOut()} style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", fontFamily:T.fB, fontSize:13, cursor:"pointer" }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!dataReady && !dataTimedOut) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/>
        <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Cargando…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Render principal ─────────────────────────────────────────────────────
  // En móvil la Sidebar exporta solo la BottomNav; el layout es columna.
  // En tablet/desktop la Sidebar ocupa la izquierda; el layout es fila.
  const pageLabel = MODULE_LABELS[activeModule] || activeModule;

  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      height: "100vh",
      background: T.bg,
      fontFamily: T.fB,
    }}>

      {/* ── Sidebar (desktop/tablet lateral | móvil se monta al final como bottom nav) */}
      {!isMobile && (
        <Sidebar
          active={activeModule}
          setActive={navTo}
          open
          profile={profile}
          googleUser={user}
          onClose={() => {}}
          riskAlert={riskAlert}
          onSignOut={handleLock}
        />
      )}

      {/* ── Columna principal ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>

        {showOnboarding && (
          <Onboarding
            onClose={handleOnboardingClose}
            onNavigate={(module, data) => { handleOnboardingClose(data); navTo(module); }}
          />
        )}

        {/* Banner de trial */}
        {psychologist?.subscription_status === "trial" && trialDaysLeft(psychologist) <= 7 && trialDaysLeft(psychologist) > 0 && (
          <div style={{ background: trialDaysLeft(psychologist) <= 3 ? "#B85050" : "#B8900A", padding:"9px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexShrink:0 }}>
            <span style={{ fontFamily:T.fB, fontSize:13, color:"#fff" }}>
              ⏰ Tu prueba gratuita vence en <strong>{trialDaysLeft(psychologist)} día{trialDaysLeft(psychologist)!==1?"s":""}</strong>. Suscríbete para no perder el acceso.
            </span>
            <a href="mailto:soporte@psychocore.app?subject=Suscripción PsychoCore"
              style={{ padding:"5px 14px", borderRadius:100, background:"#fff", color:"#1E3535", fontFamily:T.fB, fontSize:12, fontWeight:700, textDecoration:"none", flexShrink:0 }}>
              Suscribirme →
            </a>
          </div>
        )}

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <header style={{
          height: isMobile ? 52 : 58,
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: isMobile ? "none" : "flex",
          alignItems: "center",
          padding: isMobile ? "0 14px" : "0 22px",
          gap: 12,
          flexShrink: 0,
          position: "relative",
          zIndex: 1000,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          color: "#1E3535",
        }}>

          {/* Móvil: logo + nombre de app */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${NAV_ACCENT} 0%, #2E8A7D 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 2px 6px rgba(74,173,160,0.35)`,
              }}>
                <Brain size={14} color="#fff" strokeWidth={1.5} />
              </div>
              <span style={{ fontFamily: T.fH, fontSize: 17, color: T.t, fontWeight: 400 }}>PsychoCore</span>
            </div>
          )}

          {/* Desktop/Tablet: título del módulo activo + fecha */}
          {!isMobile && (
            <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: T.fH, fontSize: 21, color: T.t, fontWeight: 400, lineHeight: 1 }}>
                {pageLabel}
              </span>
              <span style={{ fontSize: 12, color: T.tl, fontWeight: 400 }}>
                {formatShortDate()}
              </span>
            </div>
          )}

          {/* Búsqueda — pill en desktop, icono en móvil */}
          {!isMobile ? (
            <GlobalSearch
              patients={patients}
              appointments={appointments}
              sessions={sessions}
              payments={payments}
              onNavigate={handleGlobalNav}
            />
          ) : (
            // Wrapper para GlobalSearch en móvil: solo muestra el trigger icon
            <GlobalSearch
              patients={patients}
              appointments={appointments}
              sessions={sessions}
              payments={payments}
              onNavigate={handleGlobalNav}
            />
          )}

          {/* Notificaciones */}
          <NotificationBell
            notifications={notifications}
            dismiss={dismiss}
            dismissAll={dismissAll}
          />
        </header>

        {/* ── CONTENIDO ─────────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          padding: activeModule === "dashboard"
            ? (isMobile ? "0 0 72px" : 0)
            : isMobile
              ? "20px 16px 88px"
              : isWide
                ? "40px 56px"
                : "36px 40px",
          overflowY: "auto",
          minHeight: 0,
        }}>
          <Suspense fallback={
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, animation:"spin 0.8s linear infinite" }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          }>
            {renderModule()}
          </Suspense>
        </main>

        {/* ── BOTTOM NAV (solo móvil) ────────────────────────────────────── */}
        {isMobile && (
          <Sidebar
            active={activeModule}
            setActive={navTo}
            open={false}
            profile={profile}
            googleUser={user}
            onClose={() => {}}
            riskAlert={riskAlert}
            onSignOut={handleLock}
            onOpenMore={() => setMoreOpen(true)}
          />
        )}
      </div>

      {/* ── Drawer "Más" en móvil ─────────────────────────────────────────── */}
      {isMobile && moreOpen && (
        <MoreDrawer
          active={activeModule}
          onNav={navTo}
          onClose={() => setMoreOpen(false)}
          profile={profile}
          googleUser={user}
          onSignOut={handleLock}
          riskAlert={riskAlert}
        />
      )}

      <SyncToast />
    </div>
  );
}
