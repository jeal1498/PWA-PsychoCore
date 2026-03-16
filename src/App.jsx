import { useState, useMemo, useRef, useEffect } from "react";
import { Menu, Brain } from "lucide-react";
import { T } from "./theme.js";
import { useIsMobile }         from "./hooks/useIsMobile.js";
import { useEncryptedStorage } from "./hooks/useEncryptedStorage.js";
import { useAutoBackup }       from "./hooks/useAutoBackup.js";
import { useNotifications }    from "./hooks/useNotifications.js";
import { initCrypto, clearCryptoKey } from "./crypto/encryption.js";
import { supabase, signOut }   from "./lib/supabase.js";

import LockScreen       from "./components/LockScreen.jsx";
import SelfLogPage     from "./modules/SelfLog.jsx";
import Sidebar          from "./components/Sidebar.jsx";
import GlobalSearch     from "./components/GlobalSearch.jsx";
import NotificationBell from "./components/NotificationBell.jsx";

import Dashboard       from "./modules/Dashboard.jsx";
import Patients        from "./modules/Patients.jsx";
import Agenda          from "./modules/Agenda.jsx";
import Sessions        from "./modules/Sessions.jsx";
import Finance         from "./modules/Finance.jsx";
import Resources       from "./modules/Resources.jsx";
import Settings        from "./modules/Settings.jsx";
import Stats           from "./modules/Stats.jsx";
import RiskAssessment  from "./modules/RiskAssessment.jsx";
import Scales          from "./modules/Scales.jsx";
import TreatmentPlan   from "./modules/TreatmentPlan.jsx";
import Reports         from "./modules/Reports.jsx";
import Tasks           from "./modules/Tasks.jsx";

import {
  SAMPLE_PATIENTS, SAMPLE_APPOINTMENTS, SAMPLE_SESSIONS,
  SAMPLE_PAYMENTS, SAMPLE_RESOURCES, DEFAULT_PROFILE,
} from "./sampleData.js";

export default function App() {
  const [user,          setUser]          = useState(null);
  const [authLoading,   setAuthLoading]   = useState(true);
  const [activeModule,  setActiveModule]  = useState("dashboard");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [sessionPrefill,setSessionPrefill]= useState(null);
  const [darkMode,      setDarkMode]      = useState(() => localStorage.getItem("pc_dark") === "1");
  const isMobile      = useIsMobile();
  const patientsNavRef= useRef(null);

  // ── Supabase Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    // onAuthStateChange handles EVERYTHING including OAuth redirects:
    // INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await initCrypto(session.user.id);
        setUser(session.user);
        // Limpiar params de error/token de la URL sin recargar
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else {
        clearCryptoKey();
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("pc_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  const [patients,     setPatients,     pLoaded]  = useEncryptedStorage("pc_patients",     SAMPLE_PATIENTS);
  const [appointments, setAppointments, aLoaded]  = useEncryptedStorage("pc_appointments", SAMPLE_APPOINTMENTS);
  const [sessions,     setSessions,     sLoaded]  = useEncryptedStorage("pc_sessions",     SAMPLE_SESSIONS);
  const [payments,     setPayments,     pyLoaded] = useEncryptedStorage("pc_payments",     SAMPLE_PAYMENTS);
  const [resources,        setResources,        rLoaded]   = useEncryptedStorage("pc_resources",         SAMPLE_RESOURCES);
  const [profile,          setProfile,          prLoaded]  = useEncryptedStorage("pc_profile",           DEFAULT_PROFILE);
  const [riskAssessments,  setRiskAssessments,  raLoaded]  = useEncryptedStorage("pc_risk_assessments",  []);
  const [scaleResults,     setScaleResults,     scLoaded]  = useEncryptedStorage("pc_scale_results",     []);
  const [treatmentPlans,   setTreatmentPlans,   tpLoaded]  = useEncryptedStorage("pc_treatment_plans",   []);
  const [interSessions,    setInterSessions,    isLoaded]  = useEncryptedStorage("pc_inter_sessions",    []);
  const [medications,      setMedications,      medLoaded] = useEncryptedStorage("pc_medications",       []);

  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && rLoaded && prLoaded && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded;

  const allData = useMemo(() => ({ patients, appointments, sessions, payments, resources, profile, riskAssessments, scaleResults, treatmentPlans, interSessions, medications }),
    [patients, appointments, sessions, payments, resources, profile, riskAssessments, scaleResults, treatmentPlans, interSessions, medications]);

  const { lastBackup, doBackup, fsSupported, fsHandle, requestFS } = useAutoBackup(user ? allData : null);
  const { notifications, dismiss, dismissAll } = useNotifications(user ? appointments : []);

  const onRestore = (data) => {
    if (data.patients)         setPatients(data.patients);
    if (data.appointments)     setAppointments(data.appointments);
    if (data.sessions)         setSessions(data.sessions);
    if (data.payments)         setPayments(data.payments);
    if (data.resources)        setResources(data.resources);
    if (data.profile)          setProfile(data.profile);
    if (data.riskAssessments)  setRiskAssessments(data.riskAssessments);
    if (data.scaleResults)     setScaleResults(data.scaleResults);
    if (data.treatmentPlans)   setTreatmentPlans(data.treatmentPlans);
    if (data.interSessions)    setInterSessions(data.interSessions);
    if (data.medications)      setMedications(data.medications);
  };

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

  // ── Self-log mode: render patient page without PIN ────────────────────────
  const selfLogToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("selflog");
  }, []);

  if (selfLogToken) return <SelfLogPage token={selfLogToken}/>;

  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <LockScreen />;

  if (!dataLoaded) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/>
        <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Descifrando datos…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const mp = { patients, setPatients, appointments, setAppointments, sessions, setSessions, payments, setPayments, resources, setResources, riskAssessments, setRiskAssessments, scaleResults, setScaleResults, treatmentPlans, setTreatmentPlans, interSessions, setInterSessions, medications, setMedications };

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":   return <Dashboard {...mp} onNavigate={navTo} onQuickNav={quickNav} onStartSession={handleStartSession} onNewSession={handleNewSession}/>;
      case "patients":    return <Patients  {...mp} key={openAction?.module==="patients" ? openAction.ts : "p"} autoOpen={openAction?.module==="patients" ? openAction.action : null} onQuickNav={patientsNavRef} profile={profile} resources={resources}/>;
      case "agenda":      return <Agenda    {...mp} key={openAction?.module==="agenda"   ? openAction.ts : "a"} autoOpen={openAction?.module==="agenda"   ? openAction.action : null}/>;
      case "sessions":    return <Sessions  {...mp} key={JSON.stringify(sessionPrefill)} profile={profile} prefill={sessionPrefill}/>;
      case "finance":     return <Finance   {...mp} key={openAction?.module==="finance"  ? openAction.ts : "f"} autoOpen={openAction?.module==="finance"  ? openAction.action : null} profile={profile}/>;
      case "resources":   return <Resources resources={resources} setResources={setResources} patients={patients}/>;
      case "tasks":       return <Tasks patients={patients}/>;
      case "stats":       return <Stats     patients={patients} appointments={appointments} sessions={sessions} payments={payments}/>;
      case "risk":        return <RiskAssessment riskAssessments={riskAssessments} setRiskAssessments={setRiskAssessments} patients={patients} profile={profile}/>;
      case "scales":      return <Scales    scaleResults={scaleResults} setScaleResults={setScaleResults} patients={patients} profile={profile}/>;
      case "treatment":   return <TreatmentPlan treatmentPlans={treatmentPlans} setTreatmentPlans={setTreatmentPlans} patients={patients} sessions={sessions} profile={profile} scaleResults={scaleResults} setAppointments={setAppointments}/>;
      case "reports":     return <Reports patients={patients} sessions={sessions} scaleResults={scaleResults} treatmentPlans={treatmentPlans} riskAssessments={riskAssessments} profile={profile}/>;
      case "settings":    return (
        <Settings profile={profile} setProfile={setProfile} allData={allData}
          lastBackup={lastBackup} doBackup={doBackup}
          fsSupported={fsSupported} fsHandle={fsHandle} requestFS={requestFS}
          onRestore={onRestore}
          darkMode={darkMode} setDarkMode={setDarkMode}
          setPatients={setPatients} patients={patients}/>
      );
      default: return <Dashboard {...mp} onNavigate={navTo} onStartSession={handleStartSession}/>;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:T.fB }}>
      {!isMobile && <Sidebar active={activeModule} setActive={navTo} onLock={handleLock} open profile={profile} onClose={() => {}} riskAlert={riskAlert}/>}
      {isMobile  && <Sidebar active={activeModule} setActive={navTo} onLock={handleLock} open={sidebarOpen} onClose={() => setSidebarOpen(false)} profile={profile} riskAlert={riskAlert}/>}

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0 }}>
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
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
