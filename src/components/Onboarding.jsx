// ─────────────────────────────────────────────────────────────────────────────
// src/components/Onboarding.jsx
// Modal de configuración inicial — 8 pasos guiados para nuevos psicólogos.
// Se dispara al primer login cuando no hay pacientes registrados.
// Tokens: T de theme.js. Sin dependencias externas.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
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

// Códigos de país para el selector de celular
const COUNTRY_CODES = [
  { code: "+52", flag: "🇲🇽", country: "MX" },
  { code: "+1",  flag: "🇺🇸", country: "US" },
  { code: "+1",  flag: "🇨🇦", country: "CA" },
  { code: "+34", flag: "🇪🇸", country: "ES" },
  { code: "+57", flag: "🇨🇴", country: "CO" },
  { code: "+54", flag: "🇦🇷", country: "AR" },
  { code: "+56", flag: "🇨🇱", country: "CL" },
  { code: "+51", flag: "🇵🇪", country: "PE" },
  { code: "+58", flag: "🇻🇪", country: "VE" },
  { code: "+593", flag: "🇪🇨", country: "EC" },
  { code: "+502", flag: "🇬🇹", country: "GT" },
  { code: "+503", flag: "🇸🇻", country: "SV" },
  { code: "+504", flag: "🇭🇳", country: "HN" },
  { code: "+505", flag: "🇳🇮", country: "NI" },
  { code: "+506", flag: "🇨🇷", country: "CR" },
  { code: "+507", flag: "🇵🇦", country: "PA" },
  { code: "+591", flag: "🇧🇴", country: "BO" },
  { code: "+595", flag: "🇵🇾", country: "PY" },
  { code: "+598", flag: "🇺🇾", country: "UY" },
  { code: "+55",  flag: "🇧🇷", country: "BR" },
  { code: "+44",  flag: "🇬🇧", country: "GB" },
  { code: "+49",  flag: "🇩🇪", country: "DE" },
  { code: "+33",  flag: "🇫🇷", country: "FR" },
  { code: "+39",  flag: "🇮🇹", country: "IT" },
];

// Servicios predefinidos para psicólogos
const PRESET_SERVICES = [
  { id: "ps_ind",    label: "Psicoterapia individual" },
  { id: "ps_inf",    label: "Psicoterapia infantil y juvenil" },
  { id: "ps_par",    label: "Terapia de pareja" },
  { id: "ps_fam",    label: "Terapia familiar" },
  { id: "ps_eval",   label: "Evaluación y diagnóstico" },
  { id: "ps_ori",    label: "Orientación a padres" },
  { id: "ps_grupo",  label: "Psicoterapia de grupo" },
  { id: "ps_otro",   label: "Otro (personalizado)" },
];

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

// ── Selector de código de país ────────────────────────────────────────────────
function CountryCodePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = COUNTRY_CODES.find(c => c.country === value.country) || COUNTRY_CODES[0];

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding:"11px 13px", border:`1.5px solid ${open ? T.p : T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t, background:"var(--bg)", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, cursor:"pointer", userSelect:"none", transition:"border-color .15s" }}
      >
        {selected.flag} {selected.code} ({selected.country}) ⌄
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:200, background:T.card, border:`1.5px solid ${T.bdr}`, borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,.15)", minWidth:200, maxHeight:240, overflowY:"auto" }}>
          {COUNTRY_CODES.map((c, i) => (
            <div
              key={`${c.country}-${i}`}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:8, cursor:"pointer", background: c.country === selected.country ? T.pA : "transparent", fontFamily:T.fB, fontSize:14, color: c.country === selected.country ? T.p : T.t, fontWeight: c.country === selected.country ? 600 : 400, transition:"background .1s" }}
            >
              <span style={{ fontSize:18 }}>{c.flag}</span>
              <span>{c.code}</span>
              <span style={{ color:T.tl, fontSize:12 }}>({c.country})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de servicio agregado ──────────────────────────────────────────────
function ServiceCard({ svc, currency, onRemove, onUpdatePrice }) {
  return (
    <div style={{ border:`1.5px solid ${T.p}`, borderRadius:14, padding:"14px 16px", background:T.pA, marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:T.p }}>{svc.label}</span>
        <button onClick={onRemove} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:T.tl, padding:"2px 6px" }}>✕</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div>
          <span style={{ display:"block", fontFamily:T.fB, fontSize:11, fontWeight:600, color:T.tm, marginBottom:5 }}>📍 Presencial ({currency})</span>
          <input
            type="number"
            placeholder="0.00"
            value={svc.pricePresencial}
            onChange={e => onUpdatePrice("pricePresencial", e.target.value)}
            style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:15, fontWeight:700, color:T.t, background:"var(--bg)", outline:"none", boxSizing:"border-box" }}
          />
        </div>
        <div>
          <span style={{ display:"block", fontFamily:T.fB, fontSize:11, fontWeight:600, color:T.tm, marginBottom:5 }}>📹 Virtual ({currency})</span>
          <input
            type="number"
            placeholder="0.00"
            value={svc.priceVirtual}
            onChange={e => onUpdatePrice("priceVirtual", e.target.value)}
            style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:15, fontWeight:700, color:T.t, background:"var(--bg)", outline:"none", boxSizing:"border-box" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Onboarding({ onClose, onNavigate }) {
  const [step, setStep] = useState(0);
  const fileInputRef    = useRef(null);

  // Estado formulario
  const [sources,         setSources]         = useState([]);
  const [name,            setName]            = useState("");
  const [avatarUrl,       setAvatarUrl]       = useState(null);
  const [countryCode,     setCountryCode]     = useState(COUNTRY_CODES[0]);
  const [phone,           setPhone]           = useState("");
  const [description,     setDescription]     = useState("");
  const [specialties,     setSpecialties]     = useState([]);
  const [agendaType,      setAgendaType]      = useState("publica");
  const [duration,        setDuration]        = useState("1 hora");
  const [modality,        setModality]        = useState("ambas");
  const [mapsLink,        setMapsLink]        = useState("");
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
  // Servicios con precios duales
  const [addedServices,   setAddedServices]   = useState([]);
  const [selectedPreset,  setSelectedPreset]  = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
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

  // Servicios
  const handleAddService = () => {
    if (!selectedPreset) return;
    const isCustom = selectedPreset === "ps_otro";
    const label = isCustom
      ? (customServiceName.trim() || "Servicio personalizado")
      : PRESET_SERVICES.find(s => s.id === selectedPreset)?.label || "";
    const newSvc = {
      id: `svc_${Date.now()}`,
      label,
      pricePresencial: "",
      priceVirtual: "",
    };
    setAddedServices(prev => [...prev, newSvc]);
    setSelectedPreset("");
    setCustomServiceName("");
  };

  const handleRemoveService = (id) =>
    setAddedServices(prev => prev.filter(s => s.id !== id));

  const handleUpdateServicePrice = (id, field, val) =>
    setAddedServices(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));

  // Avatar
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Conexiones externas — OAuth real
  const handleConnectGcal = () => {
    if (gcalConnected) {
      setGcalConnected(false);
      return;
    }
    const clientId = typeof import.meta !== "undefined" ? import.meta.env?.VITE_GOOGLE_CLIENT_ID : "";
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID no configurado");
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/google/callback");
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
    );
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=consent`;
    const popup = window.open(url, "google_auth", "width=500,height=600,left=200,top=100");

    // Escucha el callback del popup
    const listener = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        setGcalConnected(true);
        window.removeEventListener("message", listener);
        popup?.close();
      }
    };
    window.addEventListener("message", listener);

    // Fallback: polling por si no se implementa postMessage aún
    const poll = setInterval(() => {
      try {
        if (popup?.closed) {
          clearInterval(poll);
          window.removeEventListener("message", listener);
        }
      } catch (_) {}
    }, 500);
  };

  const handleConnectStripe = () => {
    if (stripeConnected) {
      setStripeConnected(false);
      return;
    }
    const clientId = typeof import.meta !== "undefined" ? import.meta.env?.VITE_STRIPE_CLIENT_ID : "";
    if (!clientId) {
      console.warn("VITE_STRIPE_CLIENT_ID no configurado");
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/stripe/callback");
    const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}`;
    const popup = window.open(url, "stripe_auth", "width=600,height=700,left=200,top=100");

    const listener = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "STRIPE_AUTH_SUCCESS") {
        setStripeConnected(true);
        window.removeEventListener("message", listener);
        popup?.close();
      }
    };
    window.addEventListener("message", listener);

    const poll = setInterval(() => {
      try {
        if (popup?.closed) {
          clearInterval(poll);
          window.removeEventListener("message", listener);
        }
      } catch (_) {}
    }, 500);
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

    // 1 — Perfil (CORREGIDO: selector de país funcional, sin bloque informativo)
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
        <CountryCodePicker value={countryCode} onChange={setCountryCode} />
        <input style={{ ...S.input, flex:1 }} type="tel" placeholder="10 dígitos" value={phone} onChange={e => setPhone(e.target.value)} />
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

    // 3 — Configurar sesiones (CORREGIDO: campo dirección → link de Google Maps)
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
          <span style={S.label}>Link de Google Maps del consultorio</span>
          <input
            style={S.input}
            type="url"
            placeholder="Pega aquí el link de Google Maps de tu consultorio"
            value={mapsLink}
            onChange={e => setMapsLink(e.target.value)}
          />
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:7, fontFamily:T.fB, fontSize:12, color:T.p, textDecoration:"none" }}>
              🗺️ Ver consultorio en Google Maps →
            </a>
          )}
          <p style={S.hint}>Abre Google Maps, busca tu consultorio, toca "Compartir" y copia el link.</p>
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

    // 5 — Tarifas y pagos (REDISEÑADO: servicios predefinidos con precio dual)
    <>
      <h2 style={S.title}>Configura tus tarifas y pagos</h2>
      <div style={S.divider} />

      {/* Divisa */}
      <span style={S.label}>Divisa aceptada</span>
      <select style={S.select} value={currency} onChange={e => setCurrency(e.target.value)}>
        {["MXN","USD","EUR","COP","ARS","CLP"].map(c => <option key={c}>{c}</option>)}
      </select>

      {/* Agregar servicios */}
      <span style={{ ...S.label, marginTop:18 }}>Servicios ofrecidos</span>
      <p style={{ ...S.hint, marginTop:0, marginBottom:10 }}>Selecciona un servicio de la lista y agrégalo con su tarifa.</p>

      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <select
          style={{ ...S.select, flex:1 }}
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
        >
          <option value="">— Selecciona un servicio —</option>
          {PRESET_SERVICES.filter(ps => !addedServices.find(a => a.label === ps.label && ps.id !== "ps_otro")).map(ps => (
            <option key={ps.id} value={ps.id}>{ps.label}</option>
          ))}
        </select>
        <button
          onClick={handleAddService}
          disabled={!selectedPreset}
          style={{ padding:"11px 18px", borderRadius:10, border:"none", background:selectedPreset?T.p:T.bdrL, color:selectedPreset?"#fff":T.tl, fontFamily:T.fB, fontSize:14, fontWeight:700, cursor:selectedPreset?"pointer":"default", flexShrink:0, transition:"all .15s" }}
        >
          + Agregar
        </button>
      </div>

      {/* Campo personalizado si seleccionó "Otro" */}
      {selectedPreset === "ps_otro" && (
        <div style={{ marginTop:10 }}>
          <input
            style={S.input}
            type="text"
            placeholder="Nombre del servicio personalizado…"
            value={customServiceName}
            onChange={e => setCustomServiceName(e.target.value)}
          />
        </div>
      )}

      {/* Tarjetas de servicios agregados */}
      {addedServices.length > 0 && (
        <div style={{ marginTop:16 }}>
          {addedServices.map(svc => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              currency={currency}
              onRemove={() => handleRemoveService(svc.id)}
              onUpdatePrice={(field, val) => handleUpdateServicePrice(svc.id, field, val)}
            />
          ))}
        </div>
      )}

      {addedServices.length === 0 && (
        <div style={{ marginTop:12, padding:"16px", borderRadius:12, border:`1.5px dashed ${T.bdr}`, textAlign:"center" }}>
          <p style={{ fontFamily:T.fB, fontSize:13, color:T.tl, margin:0 }}>Aún no has agregado servicios. Selecciona uno de la lista y toca "+ Agregar".</p>
        </div>
      )}

      {/* Mostrar precio */}
      <div onClick={() => setShowPrice(p => !p)} style={{ display:"flex", alignItems:"center", gap:10, marginTop:18, cursor:"pointer" }}>
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

    // 6 — Conectar aplicaciones (CORREGIDO: OAuth real para Google y Stripe)
    <>
      <h2 style={S.title}>Conectar Aplicaciones</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>Potencia tu consulta conectando tus herramientas favoritas. Puedes hacerlo después desde Ajustes.</p>

      {/* Google Calendar */}
      <div style={{ border:`1.5px solid ${gcalConnected?T.p:T.bdr}`, borderRadius:14, padding:18, marginTop:4, background:gcalConnected?T.pA:T.card, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:10, transition:"all .2s" }}>
        <span style={{ fontSize:40 }}>📅</span>
        <div style={{ fontFamily:T.fB, fontSize:15, fontWeight:700, color:T.t }}>Google Calendar y Meet</div>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
          Conecta tu cuenta de Google para sincronizar tu calendario y generar enlaces de reuniones con Google Meet.
        </div>
        <button
          onClick={handleConnectGcal}
          style={{ width:"100%", padding:"12px", borderRadius:10, border:gcalConnected?`1.5px solid ${T.p}`:"none", background:gcalConnected?"transparent":T.p, color:gcalConnected?T.p:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all .15s" }}
        >
          {gcalConnected ? "✓ Conectado — desconectar" : "Conectar con Google"}
        </button>
      </div>

      {/* Stripe */}
      <div style={{ border:`1.5px solid ${stripeConnected?T.p:T.bdr}`, borderRadius:14, padding:18, marginTop:14, background:stripeConnected?T.pA:T.card, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:10, transition:"all .2s" }}>
        <span style={{ fontSize:40 }}>💳</span>
        <div style={{ fontFamily:T.fB, fontSize:15, fontWeight:700, color:T.t }}>Stripe</div>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
          Recibe pagos en línea de tus pacientes directamente en tu cuenta. Cobra con tarjeta de crédito y débito de forma segura.
        </div>
        <button
          onClick={handleConnectStripe}
          style={{ width:"100%", padding:"12px", borderRadius:10, border:stripeConnected?`1.5px solid ${T.p}`:"none", background:stripeConnected?"transparent":T.p, color:stripeConnected?T.p:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, cursor:"pointer", transition:"all .15s" }}
        >
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
