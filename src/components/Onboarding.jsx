// ─────────────────────────────────────────────────────────────────────────────
// src/components/Onboarding.jsx
// Modal de configuración inicial — 8 pasos guiados para nuevos psicólogos.
// Se dispara al primer login cuando no hay pacientes registrados.
// Tokens: T de theme.js. Sin dependencias externas.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from "react";
import { T } from "../theme.js";

// ── Constantes ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 8;

const SOURCES = [
  { id: "google",    icon: "🔍", label: "Google" },
  { id: "bing",      icon: "🅱️", label: "Bing" },
  { id: "whatsapp",  icon: "💬", label: "WhatsApp" },
  { id: "instagram", icon: "📸", label: "Instagram" },
  { id: "facebook",  icon: "📘", label: "Facebook" },
  { id: "tiktok",    icon: "🎵", label: "TikTok" },
  { id: "twitter",   icon: "✖️", label: "X (Twitter)" },
  { id: "linkedin",  icon: "💼", label: "LinkedIn" },
  { id: "email",     icon: "✉️", label: "Email" },
  { id: "evento",    icon: "📅", label: "Evento o conferencia" },
  { id: "recomend",  icon: "🤝", label: "Recomendación" },
  { id: "otro",      icon: "💡", label: "Otro" },
];

const SPECIALTIES = [
  "Psicología clínica", "Neuropsicología", "Terapia cognitivo-conductual",
  "Psicoterapia infantil", "Terapia de pareja", "Psicoanálisis",
  "Mindfulness", "Psicología forense", "Psicología organizacional", "Otro",
];

const DAYS_CONFIG = [
  { key: "L",  label: "Lunes" },
  { key: "M",  label: "Martes" },
  { key: "Mi", label: "Miércoles" },
  { key: "J",  label: "Jueves" },
  { key: "V",  label: "Viernes" },
  { key: "S",  label: "Sábado" },
  { key: "D",  label: "Domingo" },
];

const DEFAULT_POLICY =
`El pago de la sesión deberá realizarse al inicio de cada cita.
En caso de cancelación, se requiere aviso con al menos 24 horas de anticipación para evitar cargo por sesión no asistida.
Las sesiones no canceladas a tiempo o a las que no se asista serán cobradas en su totalidad.`;

// ── Estilos base ──────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1100,
    background: "rgba(15,31,30,0.65)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "0 0 40px",
    backdropFilter: "blur(4px)",
    overflowY: "auto",
    animation: "ob-fadeIn .25s ease",
  },
  container: {
    width: "100%", maxWidth: 480,
    display: "flex", flexDirection: "column",
    paddingTop: 20,
  },
  topbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px 16px",
  },
  logoWrap:  { display: "flex", alignItems: "center", gap: 8 },
  logoIcon:  { width: 30, height: 30, borderRadius: 8, background: T.p, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 },
  logoName:  { fontFamily: T.fH, fontSize: 17, fontWeight: 600, color: T.t },
  skipAll:   { background: "none", border: "none", fontFamily: T.fB, fontSize: 12, color: T.tl, cursor: "pointer", padding: "4px 8px" },
  stepperRow:{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "0 24px 10px" },
  progressBar: { height: 3, background: T.bdrL, margin: "0 24px 14px", borderRadius: 99 },
  card: {
    background: T.card, borderRadius: 20, margin: "0 16px",
    padding: "24px 20px 20px",
    boxShadow: "0 4px 24px rgba(26,43,40,0.10), 0 1px 4px rgba(26,43,40,0.06)",
    animation: "ob-slideUp .3s ease",
  },
  title:    { fontFamily: T.fH, fontSize: 24, fontWeight: 600, color: T.t, lineHeight: 1.2, marginBottom: 4 },
  divider:  { width: 44, height: 3, background: T.p, borderRadius: 99, marginBottom: 18 },
  bodyText: { fontFamily: T.fB, fontSize: 14, color: T.tm, lineHeight: 1.6, marginBottom: 14 },
  label:    { display: "block", fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.tm, marginBottom: 6, marginTop: 14 },
  input:    { width: "100%", padding: "11px 13px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 15, color: T.t, background: "var(--bg)", outline: "none" },
  textarea: { width: "100%", padding: "11px 13px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: "var(--bg)", outline: "none", resize: "none", minHeight: 90, lineHeight: 1.6 },
  select:   { width: "100%", padding: "11px 13px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: "var(--bg)", outline: "none" },
  hint:     { fontFamily: T.fB, fontSize: 12, color: T.tl, marginTop: 5 },
  navRow:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 10 },
  btnBack:  { display: "flex", alignItems: "center", gap: 5, padding: "11px 18px", borderRadius: 100, border: `1.5px solid ${T.bdr}`, background: "transparent", fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.tm, cursor: "pointer" },
  btnNext:  { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 20px", borderRadius: 100, border: "none", background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${T.p}40` },
};

// ── Sub-componentes ───────────────────────────────────────────────────────────
function CheckboxItem({ icon, label, selected, onToggle }) {
  return (
    <div onClick={onToggle} style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 12px", borderRadius:10, cursor:"pointer", border:`1.5px solid ${selected?T.p:T.bdr}`, background:selected?T.pA:T.card, transition:"all .15s" }}>
      <div style={{ width:17, height:17, borderRadius:4, flexShrink:0, border:`2px solid ${selected?T.p:T.bdr}`, background:selected?T.p:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#fff" }}>{selected?"✓":""}</div>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:selected?600:400, color:selected?T.p:T.tm }}>{label}</span>
    </div>
  );
}

function RadioCard({ icon, title, desc, selected, onSelect }) {
  return (
    <div onClick={onSelect} style={{ padding:"14px 16px", borderRadius:12, cursor:"pointer", border:`1.5px solid ${selected?T.p:T.bdr}`, background:selected?T.pA:T.card, display:"flex", alignItems:"flex-start", gap:13, transition:"all .15s", marginBottom:8 }}>
      <span style={{ fontSize:22, lineHeight:1 }}>{icon}</span>
      <div>
        <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:selected?T.p:T.t, marginBottom:3 }}>{title}</div>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

function Chip({ label, selected, onToggle }) {
  return (
    <div onClick={onToggle} style={{ padding:"7px 14px", borderRadius:100, border:`1.5px solid ${selected?T.p:T.bdr}`, background:selected?T.p:T.card, fontFamily:T.fB, fontSize:13, fontWeight:500, color:selected?"#fff":T.tm, cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap" }}>
      {label}
    </div>
  );
}

function PillOption({ icon, label, selected, onSelect, last }) {
  return (
    <div onClick={onSelect} style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", borderBottom:last?"none":`1px solid ${T.bdrL}`, background:selected?T.pA:T.card, fontFamily:T.fB, fontSize:14, color:selected?T.p:T.tm, fontWeight:selected?700:400, transition:"background .15s" }}>
      <span style={{ fontSize:16 }}>{icon}</span> {label}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Onboarding({ onClose, onNavigate, services = [] }) {
  const [step, setStep] = useState(0);
  const fileInputRef    = useRef(null);

  // Estado formulario
  const [sources,         setSources]         = useState([]);
  const [name,            setName]            = useState("");
  const [avatarUrl,       setAvatarUrl]       = useState(null);
  const [phone,           setPhone]           = useState("");
  const [description,     setDescription]     = useState("");
  const [specialties,     setSpecialties]     = useState([]);
  const [agendaType,      setAgendaType]      = useState("publica");
  const [duration,        setDuration]        = useState("1 hora");
  const [modality,        setModality]        = useState("ambas");
  const [mapsAddress,     setMapsAddress]     = useState("");
  const [activeDays,      setActiveDays]      = useState({ L:true, M:false, Mi:false, J:false, V:true, S:false, D:false });
  const [schedule,        setSchedule]        = useState({
    L:  [{ start:"09:00", end:"17:00" }],
    M:  [{ start:"09:00", end:"17:00" }],
    Mi: [{ start:"09:00", end:"17:00" }],
    J:  [{ start:"09:00", end:"17:00" }],
    V:  [{ start:"09:00", end:"17:00" }],
    S:  [{ start:"09:00", end:"13:00" }],
    D:  [{ start:"09:00", end:"13:00" }],
  });
  const [selectedService, setSelectedService] = useState("");
  const [price,           setPrice]           = useState("");
  const [currency,        setCurrency]        = useState("MXN");
  const [showPrice,       setShowPrice]       = useState(true);
  const [payPolicy,       setPayPolicy]       = useState(DEFAULT_POLICY);
  const [gcalConnected,   setGcalConnected]   = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Iniciales dinámicas
  const initials = name.trim()
    ? name.trim().split(/\s+/).filter(w => w.length > 0).slice(0,2).map(w => w[0].toUpperCase()).join("")
    : "?";

  // Helpers
  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const toggleDay = (key) =>
    setActiveDays(prev => ({ ...prev, [key]: !prev[key] }));

  const addInterval = (dayKey) =>
    setSchedule(prev => ({ ...prev, [dayKey]: [...(prev[dayKey]||[]), { start:"09:00", end:"17:00" }] }));

  const removeInterval = (dayKey, idx) =>
    setSchedule(prev => ({ ...prev, [dayKey]: prev[dayKey].filter((_,i) => i !== idx) }));

  const updateInterval = (dayKey, idx, field, val) =>
    setSchedule(prev => ({ ...prev, [dayKey]: prev[dayKey].map((iv,i) => i===idx ? {...iv,[field]:val} : iv) }));

  const handleServiceSelect = (e) => {
    const id = e.target.value;
    setSelectedService(id);
    const svc = services.find(s => String(s.id) === id);
    if (svc?.price != null) setPrice(String(svc.price));
  };

  // Avatar
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Conexiones externas
  const handleConnectGcal = () => {
    const clientId = typeof import.meta !== "undefined" ? import.meta.env?.VITE_GOOGLE_CLIENT_ID : "";
    if (clientId) {
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=token&scope=https://www.googleapis.com/auth/calendar`;
      window.open(url, "_blank", "width=500,height=600");
    }
    setGcalConnected(v => !v);
  };

  const handleConnectStripe = () => {
    const clientId = typeof import.meta !== "undefined" ? import.meta.env?.VITE_STRIPE_CLIENT_ID : "";
    if (clientId) {
      const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write`;
      window.open(url, "_blank", "width=600,height=700");
    }
    setStripeConnected(v => !v);
  };

  const go = (dir) => {
    const next = step + dir;
    if (next < 0 || next >= TOTAL_STEPS) return;
    setStep(next);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const progress = (step / (TOTAL_STEPS - 1)) * 100;

  // Nav
  const Nav = ({ showBack = true }) => (
    <div style={S.navRow}>
      {showBack ? <button style={S.btnBack} onClick={() => go(-1)}>← Atrás</button> : <div />}
      {step < TOTAL_STEPS - 1 && <button style={S.btnNext} onClick={() => go(1)}>Siguiente →</button>}
    </div>
  );

  // Stepper
  const Stepper = () => (
    <div style={S.stepperRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const done = i < step, active = i === step;
        return (
          <div key={i} onClick={() => { if (i <= step) setStep(i); }} style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, cursor:i<=step?"pointer":"default", border:`2.5px solid ${done||active?T.p:T.bdr}`, background:done?T.p:T.card, color:done?"#fff":active?T.p:T.tl, boxShadow:active?`0 0 0 3px ${T.pA}`:"none", transition:"all .2s" }}>
            {done ? "✓" : i+1}
          </div>
        );
      })}
    </div>
  );

  // ── STEPS ─────────────────────────────────────────────────────────────────
  const steps = [

    // 0 — ¿Cómo te enteraste?
    <>
      <h2 style={S.title}>¿Cómo te enteraste de la plataforma?</h2>
      <div style={S.divider} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {SOURCES.map(s => (
          <CheckboxItem key={s.id} icon={s.icon} label={s.label}
            selected={sources.includes(s.id)}
            onToggle={() => toggle(sources, setSources, s.id)}
          />
        ))}
      </div>
      <Nav showBack={false} />
    </>,

    // 1 — Perfil
    <>
      <h2 style={S.title}>Empieza con tu perfil</h2>
      <div style={S.divider} />

      {/* Avatar con upload real */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileChange} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:18 }}>
        <div onClick={handleAvatarClick} style={{ width:84, height:84, borderRadius:"50%", background:avatarUrl?"transparent":T.p, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fH, fontSize:28, fontWeight:600, color:"#fff", position:"relative", cursor:"pointer", overflow:"hidden", border:`2.5px solid ${T.p}` }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : initials
          }
          <div style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:T.card, border:`2px solid ${T.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✏️</div>
        </div>
        <p style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:6 }}>Toca para subir tu foto</p>
      </div>

      <span style={S.label}>Nombre completo</span>
      <input style={S.input} type="text" placeholder="Ej. Dra. Laura Martínez" value={name} onChange={e => setName(e.target.value)} />

      <span style={S.label}>Celular</span>
      <div style={{ display:"flex", gap:10 }}>
        <div style={{ padding:"11px 13px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t, background:"var(--bg)", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>🇲🇽 +52 (MX) ⌄</div>
        <input style={{ ...S.input, flex:1 }} type="tel" placeholder="10 dígitos" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>
      <div style={{ marginTop:8, padding:"9px 12px", borderRadius:9, background:T.pA, border:`1px solid ${T.p}20`, display:"flex", gap:8, alignItems:"flex-start" }}>
        <span style={{ fontSize:14, flexShrink:0 }}>ℹ️</span>
        <p style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5, margin:0 }}>
          Tu número se usa para que tus pacientes puedan contactarte por WhatsApp y para enviarles recordatorios y tareas terapéuticas de forma automática.
        </p>
      </div>

      <span style={S.label}>Descripción</span>
      <textarea style={S.textarea} placeholder="Cuéntale a tus pacientes sobre ti…" value={description} onChange={e => setDescription(e.target.value)} />
      <Nav />
    </>,

    // 2 — Especialidad
    <>
      <h2 style={S.title}>Tu especialidad</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>Selecciona una o más áreas en las que trabajas.</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {SPECIALTIES.map(s => (
          <Chip key={s} label={s} selected={specialties.includes(s)} onToggle={() => toggle(specialties, setSpecialties, s)} />
        ))}
      </div>
      <Nav />
    </>,

    // 3 — Configurar sesiones
    <>
      <h2 style={S.title}>Configura cómo darás tus sesiones</h2>
      <div style={S.divider} />
      <span style={S.label}>¿De qué forma prefieres organizar tus sesiones?</span>
      <RadioCard icon="🔓" title="Pública" desc="Podrás compartir un link a tus pacientes para que agenden contigo" selected={agendaType==="publica"} onSelect={() => setAgendaType("publica")} />
      <RadioCard icon="🔒" title="Privada" desc="Solo tú podrás agendar sesiones con tus pacientes" selected={agendaType==="privada"} onSelect={() => setAgendaType("privada")} />

      <span style={{ ...S.label, marginTop:18 }}>¿Qué tiempo suelen durar tus sesiones?</span>
      <select style={S.select} value={duration} onChange={e => setDuration(e.target.value)}>
        {["30 min","45 min","1 hora","1.5 horas","2 horas"].map(d => <option key={d}>{d}</option>)}
      </select>

      <span style={{ ...S.label, marginTop:18 }}>¿Qué modalidad de sesiones sueles manejar?</span>
      <div style={{ border:`1.5px solid ${T.bdr}`, borderRadius:12, overflow:"hidden" }}>
        {[
          { v:"ambas",      ic:"🔀", lb:"Ambas" },
          { v:"virtual",    ic:"📹", lb:"Sólo virtual" },
          { v:"presencial", ic:"📍", lb:"Sólo presencial" },
        ].map(({ v,ic,lb }, idx, arr) => (
          <PillOption key={v} icon={ic} label={lb} selected={modality===v} onSelect={() => setModality(v)} last={idx===arr.length-1} />
        ))}
      </div>

      {(modality==="presencial" || modality==="ambas") && (
        <>
          <span style={S.label}>Dirección del consultorio</span>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>📍</span>
            <input style={{ ...S.input, paddingLeft:36 }} type="text" placeholder="Busca la dirección en Google Maps…" value={mapsAddress} onChange={e => setMapsAddress(e.target.value)} />
          </div>
          {mapsAddress && (
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(mapsAddress)}`} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:7, fontFamily:T.fB, fontSize:12, color:T.p, textDecoration:"none" }}>
              🗺️ Ver en Google Maps →
            </a>
          )}
        </>
      )}
      <Nav />
    </>,

    // 4 — Disponibilidad estilo Calendly
    <>
      <h2 style={S.title}>Planifica tu disponibilidad</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>Activa los días y configura los intervalos de horario de cada uno.</p>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {DAYS_CONFIG.map(({ key, label }) => {
          const isActive = activeDays[key];
          const intervals = schedule[key] || [];
          return (
            <div key={key} style={{ border:`1.5px solid ${isActive?T.p:T.bdr}`, borderRadius:12, background:isActive?T.pA:T.card, overflow:"hidden", transition:"all .2s" }}>
              {/* Header día */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {/* Toggle switch */}
                  <div onClick={() => toggleDay(key)} style={{ width:38, height:22, borderRadius:99, background:isActive?T.p:T.bdrL, position:"relative", cursor:"pointer", transition:"background .2s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:3, left:isActive?19:3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
                  </div>
                  <span style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:isActive?T.p:T.tl }}>{label}</span>
                </div>
                {isActive && (
                  <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                    {intervals.length} intervalo{intervals.length!==1?"s":""}
                  </span>
                )}
              </div>

              {/* Intervalos */}
              {isActive && (
                <div style={{ padding:"0 14px 12px", display:"flex", flexDirection:"column", gap:8 }}>
                  {intervals.map((iv, idx) => (
                    <div key={idx} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="time" value={iv.start} onChange={e => updateInterval(key,idx,"start",e.target.value)}
                        style={{ flex:1, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.bdr}`, background:T.card, fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t, outline:"none", textAlign:"center" }}
                      />
                      <span style={{ color:T.tl, fontSize:16 }}>→</span>
                      <input type="time" value={iv.end} onChange={e => updateInterval(key,idx,"end",e.target.value)}
                        style={{ flex:1, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${T.bdr}`, background:T.card, fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t, outline:"none", textAlign:"center" }}
                      />
                      {intervals.length > 1 && (
                        <button onClick={() => removeInterval(key,idx)} style={{ width:28, height:28, borderRadius:"50%", border:`1.5px solid ${T.bdr}`, background:"transparent", color:T.tl, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addInterval(key)} style={{ alignSelf:"flex-start", background:"none", border:"none", fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.p, cursor:"pointer", padding:"2px 0" }}>
                    + Agregar intervalo
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Nav />
    </>,

    // 5 — Tarifas y pagos
    <>
      <h2 style={S.title}>Configura tus tarifas y pagos</h2>
      <div style={S.divider} />

      {/* Divisa — arriba */}
      <span style={S.label}>Divisa aceptada</span>
      <select style={S.select} value={currency} onChange={e => setCurrency(e.target.value)}>
        {["MXN","USD","EUR","COP","ARS","CLP"].map(c => <option key={c}>{c}</option>)}
      </select>

      {/* Servicio + precio autocomplete */}
      <span style={{ ...S.label, marginTop:16 }}>Servicio</span>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, alignItems:"center" }}>
        <select style={S.select} value={selectedService} onChange={handleServiceSelect}>
          <option value="">— Selecciona un servicio —</option>
          {services.length > 0
            ? services.map(s => <option key={s.id} value={String(s.id)}>{s.name || s.nombre || "Servicio"}</option>)
            : <option disabled>Sin servicios registrados</option>
          }
        </select>
        <div style={{ padding:"11px 14px", borderRadius:10, border:`1.5px solid ${T.bdr}`, background:"var(--bg)", fontFamily:T.fB, fontSize:16, fontWeight:700, color:T.t, minWidth:90, textAlign:"center" }}>
          {price ? `$${parseFloat(price).toLocaleString("es-MX")}` : "—"}
        </div>
      </div>
      {services.length === 0 && (
        <p style={{ ...S.hint, marginTop:6 }}>Aún no tienes servicios. Puedes agregarlos desde Ajustes → Servicios.</p>
      )}

      {/* Costo manual */}
      <span style={{ ...S.label, marginTop:14 }}>Costo de la sesión ({currency})</span>
      <input style={{ ...S.input, fontSize:20, fontWeight:700 }} type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />

      {/* Mostrar precio */}
      <div onClick={() => setShowPrice(p => !p)} style={{ display:"flex", alignItems:"center", gap:10, marginTop:14, cursor:"pointer" }}>
        <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, border:`2px solid ${showPrice?T.p:T.bdr}`, background:showPrice?T.p:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", transition:"all .15s" }}>
          {showPrice?"✓":""}
        </div>
        <span style={{ fontFamily:T.fB, fontSize:13, color:T.tm, lineHeight:1.4 }}>¿Mostrar el precio de la sesión al paciente al agendar?</span>
      </div>

      {/* Política predeterminada editable */}
      <span style={{ ...S.label, marginTop:16 }}>Política de pago</span>
      <textarea style={{ ...S.textarea, minHeight:110 }} value={payPolicy} onChange={e => setPayPolicy(e.target.value)} />
      <p style={S.hint}>Puedes editar este texto según tus propias condiciones.</p>

      <Nav />
    </>,

    // 6 — Conectar aplicaciones
    <>
      <h2 style={S.title}>Conectar Aplicaciones</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>Potencia tu consulta conectando tus herramientas favoritas. Puedes hacerlo después desde Ajustes.</p>

      {/* Google Calendar */}
      <div style={{ border:`1.5px solid ${gcalConnected?T.p:T.bdr}`, borderRadius:14, padding:18, marginTop:4, background:gcalConnected?T.pA:T.card, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:10, transition:"all .2s" }}>
        <span style={{ fontSize:40 }}>📅</span>
        <div style={{ fontFamily:T.fB, fontSize:15, fontWeight:700, color:T.t }}>Google Calendar y Meet</div>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
          Conecta tu cuenta de Google para integrar con tu calendario. Sincroniza tus reservaciones y genera enlaces de reuniones virtuales con Google Meet.
        </div>
        <button onClick={handleConnectGcal} style={{ width:"100%", padding:"12px", borderRadius:10, border:gcalConnected?`1.5px solid ${T.p}`:"none", background:gcalConnected?"transparent":T.p, color:gcalConnected?T.p:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all .15s" }}>
          {gcalConnected ? "✓ Conectado — desconectar" : "Conectar con Google"}
        </button>
      </div>

      {/* Stripe */}
      <div style={{ border:`1.5px solid ${stripeConnected?T.p:T.bdr}`, borderRadius:14, padding:18, marginTop:14, background:stripeConnected?T.pA:T.card, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:10, transition:"all .2s" }}>
        <span style={{ fontSize:40 }}>💳</span>
        <div style={{ fontFamily:T.fB, fontSize:15, fontWeight:700, color:T.t }}>Stripe</div>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
          Recibe pagos en línea de tus pacientes directamente en tu cuenta. Genera cobros con tarjeta de crédito y débito de forma segura.
        </div>
        <button onClick={handleConnectStripe} style={{ width:"100%", padding:"12px", borderRadius:10, border:stripeConnected?`1.5px solid ${T.p}`:"none", background:stripeConnected?"transparent":T.p, color:stripeConnected?T.p:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all .15s" }}>
          {stripeConnected ? "✓ Conectado — desconectar" : "Conectar con Stripe"}
        </button>
      </div>

      <Nav />
    </>,

    // 7 — Finalizar
    <>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"20px 0 10px" }}>
        <span style={{ fontSize:60, marginBottom:18 }}>🎉</span>
        <h2 style={{ fontFamily:T.fH, fontSize:28, fontWeight:600, color:T.t, marginBottom:10, lineHeight:1.2 }}>
          ¡Todo listo{name ? `, ${name.trim().split(" ")[0]}` : ""}!
        </h2>
        <p style={{ fontFamily:T.fB, fontSize:15, color:T.tm, lineHeight:1.7, marginBottom:28, maxWidth:320 }}>
          Tu perfil ya está configurado. A partir de ahora puedes gestionar tus pacientes, sesiones y finanzas desde un solo lugar.
        </p>
        <button onClick={onClose} style={{ width:"100%", maxWidth:300, padding:"15px", borderRadius:100, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:`0 6px 20px ${T.p}40` }}>
          Ir a mi consulta →
        </button>
      </div>
    </>,
  ];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes ob-fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes ob-slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={S.overlay}>
        <div style={S.container}>

          <div style={S.topbar}>
            <div style={S.logoWrap}>
              <div style={S.logoIcon}>🧠</div>
              <span style={S.logoName}>PsychoCore</span>
            </div>
            <button style={S.skipAll} onClick={onClose}>Omitir todo</button>
          </div>

          <Stepper />

          <div style={S.progressBar}>
            <div style={{ height:"100%", background:T.p, borderRadius:99, width:`${progress}%`, transition:"width .4s ease" }} />
          </div>

          <div style={S.card}>{steps[step]}</div>

          <div style={{ textAlign:"center", marginTop:14, fontFamily:T.fB, fontSize:12, color:T.tl }}>
            {step === TOTAL_STEPS - 1 ? "Configuración completada" : `Paso ${step+1} de ${TOTAL_STEPS}`}
          </div>

        </div>
      </div>
    </>
  );
}
