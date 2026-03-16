import { useState, useMemo, useRef, useEffect } from "react";
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

import Dashboard       from "./modules/Dashboard.jsx";
import Patients        from "./modules/Patients.jsx";
import Agenda          from "./modules/Agenda.jsx";
import Sessions        from "./modules/Sessions.jsx";
import Finance         from "./modules/Finance.jsx";
import Settings        from "./modules/Settings.jsx";
import Stats           from "./modules/Stats.jsx";
import RiskAssessment  from "./modules/RiskAssessment.jsx";
import Scales          from "./modules/Scales.jsx";
import TreatmentPlan   from "./modules/TreatmentPlan.jsx";
import Reports         from "./modules/Reports.jsx";
import Tasks           from "./modules/Tasks.jsx";

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
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const darkMode = darkPref === "auto" ? systemDark : darkPref === "dark";
  const isMobile      = useIsMobile();
  const patientsNavRef= useRef(null);

  // ── Supabase Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    // onAuthStateChange handles EVERYTHING including OAuth redirects:
    // INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("pc_dark_pref", darkPref);
  }, [darkMode, darkPref]);

  // Listen to system preference changes in real time
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
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

  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && prLoaded && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded;

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

  if (!dataLoaded) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/>
        <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Descifrando datos…</div>
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
          {/* Soporte WhatsApp */}
          <a href="https://wa.me/529831348558?text=Hola%2C%20necesito%20ayuda%20con%20PsychoCore"
            target="_blank" rel="noreferrer"
            title="Soporte por WhatsApp"
            style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 13px", borderRadius:9999, background:"rgba(37,211,102,0.12)", border:"1.5px solid rgba(37,211,102,0.25)", color:"#128C7E", textDecoration:"none", fontFamily:T.fB, fontSize:12.5, fontWeight:600, transition:"all .15s", flexShrink:0 }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(37,211,102,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(37,211,102,0.12)"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            {!isMobile && "Soporte"}
          </a>
          <NotificationBell notifications={notifications} dismiss={dismiss} dismissAll={dismissAll}/>
        </div>

        <main style={{ flex:1, padding:isMobile?"20px 18px 32px":"36px 40px", overflowY:"auto", minHeight:0 }}>
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
