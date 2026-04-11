// ─────────────────────────────────────────────────────────────────────────────
// src/App.jsx — FASE 1 refactorizado
// Responsabilidad: Auth, UI shell, navegación y tema.
// El estado de datos (pacientes, sesiones, etc.) vive en AppStateContext.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Menu, Brain } from "lucide-react";
import { T } from "./theme.js";
import { useIsMobile }      from "./hooks/useIsMobile.js";
import { useIsWide }        from "./hooks/useIsWide.js";
import { useNotifications } from "./hooks/useNotifications.js";
import { useAppState }      from "./context/AppStateContext.jsx";
import { supabase, signOut, getOrCreatePsychologist, hasActiveAccess, trialDaysLeft } from "./lib/supabase.js";
import { emit } from "./lib/eventBus.js";

import LockScreen       from "./components/LockScreen.jsx";
import PatientPortalComp from "./modules/PatientPortalSecure.jsx";
import Onboarding       from "./components/Onboarding.jsx";
import Sidebar          from "./components/Sidebar.jsx";
import GlobalSearch     from "./components/GlobalSearch.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import SyncToast       from "./components/SyncToast.jsx";

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
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
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
      return {
        patientId,
        patientName,
        source: data.source || "ui",
        updatedAt: new Date().toISOString(),
      };
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
    }, 2000);
    return () => clearTimeout(t);
  }, [dataLoaded, user, patients.length]);

  const handleOnboardingClose = () => {
    if (user) localStorage.setItem(`pc_onboarding_done_${user.id}`, "1");
    setShowOnboarding(false);
  };

  // ── Notificaciones ───────────────────────────────────────────────────────
  const { notifications, dismiss, dismissAll } = useNotifications(user ? appointments : [], user ? assignments : []);

  // ── Navegación ───────────────────────────────────────────────────────────
  const navTo = (mod) => {
    setActiveModule(mod);
    setOpenAction(null);
    setSessionPrefill(null);
    window.history.pushState({ module: mod }, "", window.location.pathname);
  };

  // FIX D3: quickNav ahora acepta un payload opcional para pasar datos extra al módulo destino
  // Uso desde Dashboard: quickNav("finance", null, null, { openCobroId: payment.id })
  const quickNav = (mod, action, tab, payload) => {
    setActiveModule(mod);
    setOpenAction({ module: mod, action, ts: Date.now(), payload: payload || null });
    if (mod === "settings" && tab) setSettingsTab(tab);
    if (mod !== "sessions") setSessionPrefill(null);
    if (payload) syncActivePatientContext(payload);
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
      // Guard: no actuar si el foco está en un input/textarea/select
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "s" && activeModule === "sessions") {
        e.preventDefault();
        emit.sessionSave();
      }
      if (e.key === "n") {
        e.preventDefault();
        handleNewSession();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeModule]);

  // ── Handlers de sesión ───────────────────────────────────────────────────

  // FIX D6: guard — validar que appt y appt.patientId existan antes de setear prefill
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

  const handleLock = async () => { await signOut(); setSidebarOpen(false); };

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
      case "dashboard":   return <Dashboard {...mp} profile={profile} googleUser={user} onNavigate={navTo} onQuickNav={quickNav} onStartSession={handleStartSession} onNewSession={handleNewSession}/>;
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
      // FIX D3: pasa openCobroId desde openAction.payload al módulo Finance
      case "finance":     return <Finance
        {...mp}
        key={openAction?.module==="finance"  ? openAction.ts : "f"}
        autoOpen={openAction?.module==="finance"  ? openAction.action : null}
        openCobroId={openAction?.module==="finance" ? openAction.payload?.openCobroId : null}
        profile={profile}
      />;
      case "tasks":       return <Tasks patients={patients} sessions={sessions} onNavigate={navTo} profile={profile}/>;
      case "stats":       return <Stats patients={patients} appointments={appointments} sessions={sessions} payments={payments} services={services} riskAssessments={riskAssessments} scaleResults={scaleResults}/>;
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
      default: return <Dashboard {...mp} profile={profile} googleUser={user} onNavigate={navTo} onQuickNav={quickNav} onStartSession={handleStartSession} onNewSession={handleNewSession}/>;
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
              style={{ display:"block", width:"100%", padding:"15px", borderRadius:100, background:"#fff", color:"#1E3535", fontFamily:T.fB, fontSize:15, fontWeight:700, textDecoration:"none", textAlign:"center", transition:"all .2s" }}>
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
  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:T.fB }}>
      {!isMobile && <Sidebar active={activeModule} setActive={navTo} open profile={profile} googleUser={user} onClose={() => {}} riskAlert={riskAlert} onSignOut={handleLock}/>}
      {isMobile  && <Sidebar active={activeModule} setActive={navTo} open={sidebarOpen} onClose={() => setSidebarOpen(false)} profile={profile} googleUser={user} riskAlert={riskAlert} onSignOut={handleLock}/>}

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0 }}>

        {showOnboarding && (
          <Onboarding
            onClose={handleOnboardingClose}
            onNavigate={(module) => { navTo(module); handleOnboardingClose(); }}
          />
        )}

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

        <div style={{ background:T.nav, padding:"0 18px", height:56, display:"flex", alignItems:"center", gap:12, flexShrink:0, zIndex:100 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:9, width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", flexShrink:0 }}>
              <Menu size={20}/>
            </button>
          )}
          {isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:T.p, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Brain size={13} color="#fff" strokeWidth={1.5}/>
              </div>
              <span style={{ fontFamily:T.fH, fontSize:16, fontWeight:600, color:"#fff" }}>PsychoCore</span>
            </div>
          )}
          {!isMobile && <div style={{ flex:1 }}/>}
          <GlobalSearch patients={patients} appointments={appointments} sessions={sessions} payments={payments} onNavigate={handleGlobalNav}/>
          <NotificationBell notifications={notifications} dismiss={dismiss} dismissAll={dismissAll}/>
        </div>

        <main style={{ flex:1, padding:isMobile?"20px 18px 32px":isWide?"40px 56px":"36px 40px", overflowY:"auto", minHeight:0 }}>
          <Suspense fallback={
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, animation:"spin 0.8s linear infinite" }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          }>
            {renderModule()}
          </Suspense>
        </main>
      </div>
      <SyncToast />
    </div>
  );
}

