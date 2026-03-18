import { useState, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import { Menu, Brain } from "lucide-react";
import { T } from "./theme.js";
import { useIsMobile }         from "./hooks/useIsMobile.js";
import { useSupabaseStorage }  from "./hooks/useSupabaseStorage.js";
import { useNotifications }    from "./hooks/useNotifications.js";
import { supabase, signOut, getOrCreatePsychologist, hasActiveAccess, trialDaysLeft } from "./lib/supabase.js";

import LockScreen       from "./components/LockScreen.jsx";
import Onboarding       from "./components/Onboarding.jsx";
import Sidebar          from "./components/Sidebar.jsx";
import GlobalSearch     from "./components/GlobalSearch.jsx";
import NotificationBell from "./components/NotificationBell.jsx";

// Lazy loading — cada módulo se descarga solo cuando el usuario lo abre por primera vez
const Dashboard     = lazy(() => import("./modules/Dashboard.jsx"));
const Patients      = lazy(() => import("./modules/Patients.jsx"));
const Agenda        = lazy(() => import("./modules/Agenda.jsx"));
const Sessions      = lazy(() => import("./modules/Sessions.jsx"));
const Finance       = lazy(() => import("./modules/Finance.jsx"));
const Settings      = lazy(() => import("./modules/Settings.jsx"));
const Stats         = lazy(() => import("./modules/Stats.jsx"));
const RiskAssessment= lazy(() => import("./modules/RiskAssessment.jsx"));
const Scales        = lazy(() => import("./modules/Scales.jsx"));
const TreatmentPlan = lazy(() => import("./modules/TreatmentPlan.jsx"));
const Reports       = lazy(() => import("./modules/Reports.jsx"));
const Tasks         = lazy(() => import("./modules/Tasks.jsx"));

import { DEFAULT_PROFILE } from "./sampleData.js";

export default function App() {
  const [user,              setUser]              = useState(null);
  const [authLoading,       setAuthLoading]       = useState(true);
  const [psychologist,      setPsychologist]      = useState(null);
  const [psychologistLoaded, setPsychologistLoaded] = useState(false);
  const [activeModule,  setActiveModule]  = useState("dashboard");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [sessionPrefill,setSessionPrefill]= useState(null);
  // "auto" | "dark" | "light"
  const [darkPref, setDarkPref] = useState(() => localStorage.getItem("pc_dark_pref") || "auto");
  // systemDark como estado reactivo — se actualiza cuando el SO cambia el tema
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const darkMode = darkPref === "auto" ? systemDark : darkPref === "dark";
  const isMobile      = useIsMobile();
  const patientsNavRef= useRef(null);

  // ── Supabase Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    // Verificar sesión existente al montar (necesario en móvil donde
    // onAuthStateChange puede no dispararse si el token ya existe)
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

    // Escuchar cambios posteriores (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return; // ya manejado por getSession arriba
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

    // Timeout de seguridad — si en 8s no resuelve, salimos del loading
    const timeout = setTimeout(() => setAuthLoading(false), 8000);

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("pc_dark_pref", darkPref);
  }, [darkMode, darkPref]);

  // Listen to system preference changes in real time
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

  const [patients,     setPatients,     pLoaded]  = useSupabaseStorage("pc_patients",         []);
  const [appointments, setAppointments, aLoaded]  = useSupabaseStorage("pc_appointments",     []);
  const [sessions,     setSessions,     sLoaded]  = useSupabaseStorage("pc_sessions",         []);
  const [payments,     setPayments,     pyLoaded] = useSupabaseStorage("pc_payments",         []);
  const [profile,          setProfile,          prLoaded]  = useSupabaseStorage("pc_profile",           DEFAULT_PROFILE);
  const [riskAssessments,  setRiskAssessments,  raLoaded]  = useSupabaseStorage("pc_risk_assessments",  []);
  const [scaleResults,     setScaleResults,     scLoaded]  = useSupabaseStorage("pc_scale_results",     []);
  const [treatmentPlans,   setTreatmentPlans,   tpLoaded]  = useSupabaseStorage("pc_treatment_plans",   []);
  const [interSessions,    setInterSessions,    isLoaded]  = useSupabaseStorage("pc_inter_sessions",    []);
  const [medications,      setMedications,      medLoaded] = useSupabaseStorage("pc_medications",       []);
  const [services,         setServices]                        = useSupabaseStorage("pc_services",           []);

  // Muestra la app en cuanto cargue el primer dato crítico (pacientes o perfil).
  // El resto llega en segundo plano sin bloquear el render.
  const dataReady = pLoaded || prLoaded;
  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && prLoaded && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded;

  // Timeout de seguridad: si en 8s dataReady sigue false (red lenta, token
  // expirado que tarda en refreshear), pasamos igual al dashboard con datos vacíos.
  const [dataTimedOut, setDataTimedOut] = useState(false);
  useEffect(() => {
    if (dataReady) { setDataTimedOut(false); return; }
    const t = setTimeout(() => setDataTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [dataReady]);

  const allData = useMemo(() => ({ patients, appointments, sessions, payments, profile, riskAssessments, scaleResults, treatmentPlans, interSessions, medications }),
    [patients, appointments, sessions, payments, profile, riskAssessments, scaleResults, treatmentPlans, interSessions, medications]);

  // ── Onboarding: mostrar solo si es nuevo psicólogo ────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!dataLoaded || !user) return;
    const key = `pc_onboarding_done_${user.id}`;
    if (localStorage.getItem(key)) return;
    // Mostrar si no tiene pacientes (cuenta nueva)
    if (patients.length === 0) {
      setShowOnboarding(true);
    }
  }, [dataLoaded, user, patients.length]);

  const handleOnboardingClose = () => {
    if (user) localStorage.setItem(`pc_onboarding_done_${user.id}`, "1");
    setShowOnboarding(false);
  };

  const { notifications, dismiss, dismissAll } = useNotifications(user ? appointments : []);

  const handleGlobalNav = (module, data) => {
    setActiveModule(module);
    if (module === "patients" && data && patientsNavRef.current)
      setTimeout(() => patientsNavRef.current?.(data), 80);
  };

  const handleStartSession = (appt) => {
    setSessionPrefill({ patientId: appt.patientId, date: appt.date });
    setActiveModule("sessions");
    setOpenAction(null);
  };

  // "Nueva nota" desde accesos rápidos — prefill vacío abre el modal directamente
  const handleNewSession = () => {
    const today = new Date().toISOString().split("T")[0];
    setSessionPrefill({ patientId: "", date: today, _empty: true });
    setActiveModule("sessions");
    setOpenAction(null);
  };

  const handleLock = async () => { await signOut(); setSidebarOpen(false); };

  const riskAlert = riskAssessments.some(a => {
    const latest = riskAssessments.filter(r => r.patientId === a.patientId).sort((x,y) => y.date.localeCompare(x.date))[0];
    return latest?.id === a.id && (a.riskLevel === "alto" || a.riskLevel === "inminente");
  });

  const [openAction, setOpenAction] = useState(null);

  const navTo = (mod) => {
    setActiveModule(mod);
    setOpenAction(null);
    setSessionPrefill(null); // always clear so Sessions shows the list
    window.history.pushState({ module: mod }, "", window.location.pathname);
  };

  const quickNav = (mod, action) => {
    setActiveModule(mod);
    setOpenAction({ module: mod, action, ts: Date.now() });
    if (mod !== "sessions") setSessionPrefill(null);
    window.history.pushState({ module: mod }, "", window.location.pathname);
  };

  // Handle Android/browser back button — navigate to dashboard instead of leaving
  useEffect(() => {
    const handlePop = () => {
      setActiveModule("dashboard");
      setOpenAction(null);
      setSessionPrefill(null);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <LockScreen />;

  // ── Trial expirado ───────────────────────────────────────────────────────
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

  const mp = { patients, setPatients, appointments, setAppointments, sessions, setSessions, payments, setPayments, riskAssessments, setRiskAssessments, scaleResults, setScaleResults, treatmentPlans, setTreatmentPlans, interSessions, setInterSessions, medications, setMedications };

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":   return <Dashboard {...mp} onNavigate={navTo} onQuickNav={quickNav} onStartSession={handleStartSession} onNewSession={handleNewSession}/>;
      case "patients":    return <Patients  {...mp} key={openAction?.module==="patients" ? openAction.ts : "p"} autoOpen={openAction?.module==="patients" ? openAction.action : null} onQuickNav={patientsNavRef} profile={profile}/>;
      case "agenda":      return <Agenda    {...mp} key={openAction?.module==="agenda"   ? openAction.ts : "a"} autoOpen={openAction?.module==="agenda"   ? openAction.action : null} profile={profile}/>;
      case "sessions":    return <Sessions  {...mp} key={JSON.stringify(sessionPrefill)} profile={profile} prefill={sessionPrefill}/>;
      case "finance":     return <Finance   {...mp} key={openAction?.module==="finance"  ? openAction.ts : "f"} autoOpen={openAction?.module==="finance"  ? openAction.action : null} profile={profile}/>;
      case "tasks":       return <Tasks patients={patients}/>;
      case "stats":       return <Stats     patients={patients} appointments={appointments} sessions={sessions} payments={payments}/>;
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
          }}
        />
      );
      default: return <Dashboard {...mp} onNavigate={navTo} onStartSession={handleStartSession}/>;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:T.fB }}>
      {!isMobile && <Sidebar active={activeModule} setActive={navTo} onLock={handleLock} open profile={profile} onClose={() => {}} riskAlert={riskAlert}/>}
      {isMobile  && <Sidebar active={activeModule} setActive={navTo} onLock={handleLock} open={sidebarOpen} onClose={() => setSidebarOpen(false)} profile={profile} riskAlert={riskAlert}/>}

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0 }}>

        {/* ── Onboarding ───────────────────────────────────────────────────── */}
        {showOnboarding && (
          <Onboarding
            onClose={handleOnboardingClose}
            onNavigate={(module) => { navTo(module); handleOnboardingClose(); }}
          />
        )}

        {/* ── Banner de trial ────────────────────────────────────────────── */}
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
          <GlobalSearch patients={patients} appointments={appointments} sessions={sessions} onNavigate={handleGlobalNav}/>

          <NotificationBell notifications={notifications} dismiss={dismiss} dismissAll={dismissAll}/>
        </div>

        <main style={{ flex:1, padding:isMobile?"20px 18px 32px":"36px 40px", overflowY:"auto", minHeight:0 }}>
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
    </div>
  );
}
