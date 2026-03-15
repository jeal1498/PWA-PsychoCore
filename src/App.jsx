import { useState, useMemo } from "react";
import { Menu, Brain } from "lucide-react";

import { T } from "./theme.js";
import { useIsMobile }          from "./hooks/useIsMobile.js";
import { useEncryptedStorage }  from "./hooks/useEncryptedStorage.js";
import { useAutoBackup }        from "./hooks/useAutoBackup.js";
import { clearCryptoKey }       from "./crypto/encryption.js";

import LockScreen from "./components/LockScreen.jsx";
import Sidebar    from "./components/Sidebar.jsx";

import Dashboard  from "./modules/Dashboard.jsx";
import Patients   from "./modules/Patients.jsx";
import Agenda     from "./modules/Agenda.jsx";
import Sessions   from "./modules/Sessions.jsx";
import Finance    from "./modules/Finance.jsx";
import Resources  from "./modules/Resources.jsx";
import Settings   from "./modules/Settings.jsx";

import {
  SAMPLE_PATIENTS, SAMPLE_APPOINTMENTS, SAMPLE_SESSIONS,
  SAMPLE_PAYMENTS, SAMPLE_RESOURCES, DEFAULT_PROFILE,
} from "./sampleData.js";

export default function App() {
  const [locked,       setLocked]       = useState(true);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const isMobile = useIsMobile();

  const [patients,     setPatients,     pLoaded]  = useEncryptedStorage("pc_patients",     SAMPLE_PATIENTS);
  const [appointments, setAppointments, aLoaded]  = useEncryptedStorage("pc_appointments", SAMPLE_APPOINTMENTS);
  const [sessions,     setSessions,     sLoaded]  = useEncryptedStorage("pc_sessions",     SAMPLE_SESSIONS);
  const [payments,     setPayments,     pyLoaded] = useEncryptedStorage("pc_payments",     SAMPLE_PAYMENTS);
  const [resources,    setResources,    rLoaded]  = useEncryptedStorage("pc_resources",    SAMPLE_RESOURCES);
  const [profile,      setProfile,      prLoaded] = useEncryptedStorage("pc_profile",      DEFAULT_PROFILE);

  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && rLoaded && prLoaded;

  const allData = useMemo(() => ({
    patients, appointments, sessions, payments, resources, profile,
  }), [patients, appointments, sessions, payments, resources, profile]);

  const { lastBackup, doBackup, fsSupported, fsHandle, requestFS } = useAutoBackup(
    locked ? null : allData
  );

  const onRestore = (data) => {
    if (data.patients)     setPatients(data.patients);
    if (data.appointments) setAppointments(data.appointments);
    if (data.sessions)     setSessions(data.sessions);
    if (data.payments)     setPayments(data.payments);
    if (data.resources)    setResources(data.resources);
    if (data.profile)      setProfile(data.profile);
  };

  const handleLock = () => { clearCryptoKey(); setLocked(true); setSidebarOpen(false); };

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  if (!dataLoaded) {
    return (
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/>
          <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Descifrando datos…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const mp = { patients, setPatients, appointments, setAppointments, sessions, setSessions, payments, setPayments, resources, setResources };

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":  return <Dashboard  {...mp} />;
      case "patients":   return <Patients   {...mp} />;
      case "agenda":     return <Agenda     {...mp} />;
      case "sessions":   return <Sessions   {...mp} />;
      case "finance":    return <Finance    {...mp} />;
      case "resources":  return <Resources  {...mp} />;
      case "settings":   return (
        <Settings
          profile={profile} setProfile={setProfile}
          allData={allData}
          lastBackup={lastBackup} doBackup={doBackup}
          fsSupported={fsSupported} fsHandle={fsHandle} requestFS={requestFS}
          onRestore={onRestore}
        />
      );
      default: return <Dashboard {...mp} />;
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, fontFamily:T.fB }}>
      {!isMobile && (
        <Sidebar active={activeModule} setActive={setActiveModule} onLock={handleLock} open profile={profile} onClose={() => {}} />
      )}
      {isMobile && (
        <Sidebar active={activeModule} setActive={setActiveModule} onLock={handleLock} open={sidebarOpen} onClose={() => setSidebarOpen(false)} profile={profile} />
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        {isMobile && (
          <div style={{ background:T.t, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, flexShrink:0, position:"sticky", top:0, zIndex:100 }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:9, width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", flexShrink:0 }}>
              <Menu size={20}/>
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:T.p, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Brain size={14} color="#fff" strokeWidth={1.5}/>
              </div>
              <span style={{ fontFamily:T.fH, fontSize:17, fontWeight:600, color:"#fff" }}>PsychoCore</span>
            </div>
          </div>
        )}
        <main style={{ flex:1, padding:isMobile?"20px 18px 32px":"36px 40px", overflowY:"auto" }}>
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
