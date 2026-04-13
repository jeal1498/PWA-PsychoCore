// ─────────────────────────────────────────────────────────────────────────────
// src/components/Onboarding.jsx
// Onboarding rediseñado — 5 pasos optimizados.
// Cambios vs versión anterior:
//   · 5 pasos: Perfil+Especialidad / Sesiones / Disponibilidad / Tarifas / Listo
//   · Stepper en una sola fila sin overflow
//   · Sin texto "Paso # de #"
//   · "Otro" activa input de texto inline en especialidades y servicios
//   · Selector de país: solo bandera + código, sin "(MX)"
//   · Sin placeholder "Ej. Dra. Laura Martínez"
//   · Overlay cubre todo (sidebar invisible)
//   · Layout 100% responsivo con clamp() y dvh
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { T } from "../theme.js";

const TOTAL_STEPS = 5;

const SPECIALTIES = [
  "Psicología clínica",
  "Neuropsicología",
  "Terapia cognitivo-conductual",
  "Psicoterapia infantil",
  "Terapia de pareja",
  "Psicoanálisis",
  "Mindfulness",
  "Psicología forense",
  "Psicología organizacional",
  "Otro",
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

const COUNTRY_CODES = [
  { code: "+52", flag: "🇲🇽" },
  { code: "+1",  flag: "🇺🇸" },
  { code: "+1",  flag: "🇨🇦" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+57", flag: "🇨🇴" },
  { code: "+54", flag: "🇦🇷" },
  { code: "+56", flag: "🇨🇱" },
  { code: "+51", flag: "🇵🇪" },
  { code: "+58", flag: "🇻🇪" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+49", flag: "🇩🇪" },
  { code: "+33", flag: "🇫🇷" },
];

const PRESET_SERVICES = [
  { id: "ps_ind",   label: "Psicoterapia individual" },
  { id: "ps_inf",   label: "Psicoterapia infantil y juvenil" },
  { id: "ps_par",   label: "Terapia de pareja" },
  { id: "ps_fam",   label: "Terapia familiar" },
  { id: "ps_eval",  label: "Evaluación y diagnóstico" },
  { id: "ps_ori",   label: "Orientación a padres" },
  { id: "ps_grupo", label: "Psicoterapia de grupo" },
  { id: "ps_otro",  label: "Otro (personalizado)" },
];

// ── Estilos ───────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1100,
    background: "var(--bg)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    overflowY: "auto",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    minHeight: "100dvh",
    animation: "ob-fadeIn .2s ease",
  },
  container: {
    width: "100%",
    maxWidth: "min(520px, 100vw)",
    display: "flex", flexDirection: "column",
    paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
    paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
    paddingLeft: "env(safe-area-inset-left, 0px)",
    paddingRight: "env(safe-area-inset-right, 0px)",
    minHeight: "100dvh",
  },
  topbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 20px 14px",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 8 },
  logoIcon: {
    width: 28, height: 28, borderRadius: 8,
    background: T.p, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 14,
  },
  logoName: { fontFamily: T.fH, fontSize: 16, fontWeight: 600, color: T.t },
  skipAll: {
    background: "none", border: "none",
    fontFamily: T.fB, fontSize: 12, color: T.tl,
    cursor: "pointer", padding: "4px 8px",
  },
  stepperRow: {
    display: "flex", flexDirection: "row",
    justifyContent: "center", alignItems: "center",
    gap: "clamp(6px, 2.5vw, 14px)",
    padding: "0 20px 10px",
  },
  progressBar: {
    height: 3, background: T.bdrL,
    margin: "0 20px 16px", borderRadius: 99,
  },
  card: {
    background: T.card, borderRadius: 20,
    margin: "0 clamp(8px, 4vw, 16px)",
    padding: "clamp(18px, 5vw, 28px) clamp(14px, 5vw, 24px) clamp(14px, 4vw, 22px)",
    boxShadow: "0 4px 24px rgba(26,43,40,0.10), 0 1px 4px rgba(26,43,40,0.06)",
  },
  title: {
    fontFamily: T.fH,
    fontSize: "clamp(20px, 5.5vw, 26px)",
    fontWeight: 600, color: T.t,
    lineHeight: 1.2, marginBottom: 4,
  },
  divider: { width: 40, height: 3, background: T.p, borderRadius: 99, marginBottom: 16 },
  bodyText: { fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 12 },
  label: {
    display: "block", fontFamily: T.fB,
    fontSize: 12, fontWeight: 600, color: T.tm,
    marginBottom: 5, marginTop: 14,
    textTransform: "uppercase", letterSpacing: "0.04em",
  },
  input: {
    width: "100%", padding: "11px 13px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 15, color: T.t,
    background: "var(--bg)", outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "11px 13px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 14, color: T.t,
    background: "var(--bg)", outline: "none",
    resize: "none", minHeight: 80, lineHeight: 1.6,
    boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "11px 13px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 14, color: T.t,
    background: "var(--bg)", outline: "none",
    boxSizing: "border-box",
  },
  hint: { fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 4 },
  navRow: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginTop: 22, gap: 10,
  },
  btnBack: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "11px 18px", borderRadius: 100,
    border: `1.5px solid ${T.bdr}`, background: "transparent",
    fontFamily: T.fB, fontSize: 13, fontWeight: 600,
    color: T.tm, cursor: "pointer",
  },
  btnNext: {
    flex: 1, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 7,
    padding: "13px 20px", borderRadius: 100,
    border: "none", background: T.p, color: "#fff",
    fontFamily: T.fB, fontSize: 14, fontWeight: 700,
    cursor: "pointer", boxShadow: `0 4px 14px ${T.p}40`,
  },
};

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Chip({ label, selected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: "7px 13px", borderRadius: 100,
        border: `1.5px solid ${selected ? T.p : T.bdr}`,
        background: selected ? T.p : T.card,
        fontFamily: T.fB, fontSize: 13, fontWeight: 500,
        color: selected ? "#fff" : T.tm,
        cursor: "pointer", transition: "all .15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function RadioCard({ icon, title, desc, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "13px 15px", borderRadius: 12, cursor: "pointer",
        border: `1.5px solid ${selected ? T.p : T.bdr}`,
        background: selected ? T.pA : T.card,
        display: "flex", alignItems: "flex-start", gap: 12,
        transition: "all .15s", marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: selected ? T.p : T.t, marginBottom: 2 }}>{title}</div>
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
}

function PillOption({ icon, label, selected, onSelect, last }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "12px 15px", display: "flex", alignItems: "center",
        gap: 10, cursor: "pointer",
        borderBottom: last ? "none" : `1px solid ${T.bdrL}`,
        background: selected ? T.pA : T.card,
        fontFamily: T.fB, fontSize: 14,
        color: selected ? T.p : T.tm,
        fontWeight: selected ? 700 : 400,
        transition: "background .15s",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span> {label}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 38, height: 22, borderRadius: 99,
        background: on ? T.p : T.bdrL,
        position: "relative", cursor: "pointer",
        transition: "background .2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: on ? 19 : 3, width: 16, height: 16,
        borderRadius: "50%", background: "#fff",
        transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
      }} />
    </div>
  );
}

// Selector de país compacto: solo bandera + código
function CountryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "11px 12px",
          border: `1.5px solid ${open ? T.p : T.bdr}`,
          borderRadius: 10, fontFamily: T.fB, fontSize: 14,
          color: T.t, background: "var(--bg)",
          display: "flex", alignItems: "center", gap: 5,
          cursor: "pointer", userSelect: "none",
          transition: "border-color .15s", whiteSpace: "nowrap",
        }}
      >
        {value.flag} {value.code} <span style={{ color: T.tl, fontSize: 12 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: T.card, border: `1.5px solid ${T.bdr}`,
          borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          minWidth: 120, maxHeight: 220, overflowY: "auto",
        }}>
          {COUNTRY_CODES.map((c, i) => (
            <div
              key={i}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{
                padding: "9px 13px", display: "flex", alignItems: "center",
                gap: 7, cursor: "pointer",
                background: c.code === value.code && c.flag === value.flag ? T.pA : "transparent",
                fontFamily: T.fB, fontSize: 13,
                color: c.code === value.code && c.flag === value.flag ? T.p : T.t,
                fontWeight: c.code === value.code && c.flag === value.flag ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 17 }}>{c.flag}</span>
              <span>{c.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ svc, currency, onRemove, onUpdatePrice }) {
  return (
    <div style={{
      border: `1.5px solid ${T.p}`, borderRadius: 14,
      padding: "13px 15px", background: T.pA, marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.p }}>{svc.label}</span>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: T.tl, padding: "2px 6px" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <span style={{ display: "block", fontFamily: T.fB, fontSize: 11, fontWeight: 600, color: T.tm, marginBottom: 4 }}>📍 Presencial ({currency})</span>
          <input
            type="number" placeholder="0.00"
            value={svc.pricePresencial}
            onChange={e => onUpdatePrice("pricePresencial", e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t, background: "var(--bg)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <span style={{ display: "block", fontFamily: T.fB, fontSize: 11, fontWeight: 600, color: T.tm, marginBottom: 4 }}>📹 Virtual ({currency})</span>
          <input
            type="number" placeholder="0.00"
            value={svc.priceVirtual}
            onChange={e => onUpdatePrice("priceVirtual", e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t, background: "var(--bg)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Onboarding({ onClose, onNavigate }) {
  const [step, setStep] = useState(0);
  const fileInputRef = useRef(null);

  // Paso 1 — Perfil + Especialidad
  const [name,           setName]           = useState("");
  const [avatarUrl,      setAvatarUrl]      = useState(null);
  const [countryCode,    setCountryCode]    = useState(COUNTRY_CODES[0]);
  const [phone,          setPhone]          = useState("");
  const [description,    setDescription]    = useState("");
  const [specialties,    setSpecialties]    = useState([]);
  const [otherSpecialty, setOtherSpecialty] = useState("");

  // Paso 2 — Sesiones
  const [agendaType, setAgendaType] = useState("publica");
  const [duration,   setDuration]   = useState("1 hora");
  const [modality,   setModality]   = useState("ambas");
  const [mapsLink,   setMapsLink]   = useState("");

  // Paso 3 — Disponibilidad
  const [activeDays, setActiveDays] = useState({ L:true, M:false, Mi:false, J:false, V:true, S:false, D:false });
  const [schedule,   setSchedule]   = useState({
    L:  [{ start: "09:00", end: "17:00" }],
    M:  [{ start: "09:00", end: "17:00" }],
    Mi: [{ start: "09:00", end: "17:00" }],
    J:  [{ start: "09:00", end: "17:00" }],
    V:  [{ start: "09:00", end: "17:00" }],
    S:  [{ start: "09:00", end: "13:00" }],
    D:  [{ start: "09:00", end: "13:00" }],
  });

  // Paso 4 — Tarifas
  const [addedServices,     setAddedServices]     = useState([]);
  const [selectedPreset,    setSelectedPreset]    = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [currency,          setCurrency]          = useState("MXN");
  const [showPrice,         setShowPrice]         = useState(true);
  const [payPolicy,         setPayPolicy]         = useState(DEFAULT_POLICY);

  const initials = name.trim()
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("")
    : "?";

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggleChip = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const toggleDay = (key) =>
    setActiveDays(prev => ({ ...prev, [key]: !prev[key] }));

  const addInterval = (dayKey) =>
    setSchedule(prev => ({ ...prev, [dayKey]: [...(prev[dayKey] || []), { start: "09:00", end: "17:00" }] }));

  const removeInterval = (dayKey, idx) =>
    setSchedule(prev => ({ ...prev, [dayKey]: prev[dayKey].filter((_, i) => i !== idx) }));

  const updateInterval = (dayKey, idx, field, val) =>
    setSchedule(prev => ({ ...prev, [dayKey]: prev[dayKey].map((iv, i) => i === idx ? { ...iv, [field]: val } : iv) }));

  const handleAddService = () => {
    if (!selectedPreset) return;
    const isCustom = selectedPreset === "ps_otro";
    const label = isCustom
      ? (customServiceName.trim() || "Servicio personalizado")
      : PRESET_SERVICES.find(s => s.id === selectedPreset)?.label || "";
    setAddedServices(prev => [...prev, { id: `svc_${Date.now()}`, label, pricePresencial: "", priceVirtual: "" }]);
    setSelectedPreset("");
    setCustomServiceName("");
  };

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const collectData = () => ({
    name,
    phone: `${countryCode.code} ${phone}`.trim(),
    description,
    specialties: specialties.includes("Otro") && otherSpecialty.trim()
      ? [...specialties.filter(s => s !== "Otro"), otherSpecialty.trim()]
      : specialties,
    avatarUrl,
    agendaType,
    duration,
    modality,
    mapsLink,
    activeDays,
    schedule,
    services: addedServices,
    currency,
    showPrice,
    payPolicy,
    workingDays: Object.entries(activeDays)
      .filter(([, v]) => v)
      .map(([k]) => ({ L:1, M:2, Mi:3, J:4, V:5, S:6, D:0 }[k]))
      .filter(n => n !== undefined),
    workingStart: schedule.L?.[0]?.start || "09:00",
    workingEnd:   schedule.L?.[0]?.end   || "17:00",
  });

  const go = (dir) => {
    const next = step + dir;
    if (next < 0 || next >= TOTAL_STEPS) return;
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = (step / (TOTAL_STEPS - 1)) * 100;

  // ── Stepper ───────────────────────────────────────────────────────────────────
  const Stepper = () => (
    <div style={S.stepperRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const done = i < step, active = i === step;
        return (
          <div
            key={i}
            onClick={() => { if (i <= step) setStep(i); }}
            style={{
              width: "clamp(28px, 8vw, 36px)",
              height: "clamp(28px, 8vw, 36px)",
              borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "clamp(11px, 3vw, 13px)", fontWeight: 700,
              cursor: i <= step ? "pointer" : "default",
              border: `2.5px solid ${done || active ? T.p : T.bdr}`,
              background: done ? T.p : T.card,
              color: done ? "#fff" : active ? T.p : T.tl,
              boxShadow: active ? `0 0 0 3px ${T.pA}` : "none",
              transition: "all .2s",
            }}
          >
            {done ? "✓" : i + 1}
          </div>
        );
      })}
    </div>
  );

  // ── Nav ───────────────────────────────────────────────────────────────────────
  const Nav = ({ showBack = true, onNext, nextLabel = "Siguiente →" }) => (
    <div style={S.navRow}>
      {showBack
        ? <button style={S.btnBack} onClick={() => go(-1)}>← Atrás</button>
        : <div />
      }
      <button style={S.btnNext} onClick={onNext || (() => go(1))}>
        {nextLabel}
      </button>
    </div>
  );

  // ── PASOS ─────────────────────────────────────────────────────────────────────
  const steps = [

    // ── Paso 1: Perfil + Especialidad ──────────────────────────────────────────
    <>
      <h2 style={S.title}>Tu perfil</h2>
      <div style={S.divider} />

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
        <div
          onClick={handleAvatarClick}
          style={{
            width: 76, height: 76, borderRadius: "50%",
            background: avatarUrl ? "transparent" : T.p,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: T.fH, fontSize: 26, fontWeight: 600, color: "#fff",
            position: "relative", cursor: "pointer", overflow: "hidden",
            border: `2.5px solid ${T.p}`,
          }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials
          }
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 24, height: 24, borderRadius: "50%",
            background: T.card, border: `2px solid ${T.bdr}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
          }}>✏️</div>
        </div>
        <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 5 }}>Toca para subir tu foto</p>
      </div>

      <span style={S.label}>Nombre completo</span>
      <input style={S.input} type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />

      <span style={S.label}>Celular</span>
      <div style={{ display: "flex", gap: 8 }}>
        <CountryPicker value={countryCode} onChange={setCountryCode} />
        <input style={{ ...S.input, flex: 1 }} type="tel" placeholder="10 dígitos" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      <span style={S.label}>Descripción</span>
      <textarea style={S.textarea} placeholder="Cuéntale a tus pacientes sobre ti…" value={description} onChange={e => setDescription(e.target.value)} />

      <span style={{ ...S.label, marginTop: 16 }}>Especialidades</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2 }}>
        {SPECIALTIES.map(s => (
          <Chip key={s} label={s} selected={specialties.includes(s)} onToggle={() => toggleChip(specialties, setSpecialties, s)} />
        ))}
      </div>
      {specialties.includes("Otro") && (
        <input
          style={{ ...S.input, marginTop: 10 }}
          type="text"
          placeholder="Escribe tu especialidad…"
          value={otherSpecialty}
          onChange={e => setOtherSpecialty(e.target.value)}
          autoFocus
        />
      )}

      <Nav showBack={false} />
    </>,

    // ── Paso 2: Sesiones ───────────────────────────────────────────────────────
    <>
      <h2 style={S.title}>Tus sesiones</h2>
      <div style={S.divider} />

      <span style={S.label}>¿Cómo organizas tus sesiones?</span>
      <RadioCard icon="🔓" title="Agenda pública" desc="Comparte un link para que tus pacientes agenden contigo" selected={agendaType === "publica"} onSelect={() => setAgendaType("publica")} />
      <RadioCard icon="🔒" title="Agenda privada" desc="Solo tú puedes agendar sesiones" selected={agendaType === "privada"} onSelect={() => setAgendaType("privada")} />

      <span style={{ ...S.label, marginTop: 16 }}>Duración habitual</span>
      <select style={S.select} value={duration} onChange={e => setDuration(e.target.value)}>
        {["30 min", "45 min", "1 hora", "1.5 horas", "2 horas"].map(d => <option key={d}>{d}</option>)}
      </select>

      <span style={{ ...S.label, marginTop: 16 }}>Modalidad</span>
      <div style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden" }}>
        {[
          { v: "ambas",      ic: "🔀", lb: "Presencial y virtual" },
          { v: "virtual",    ic: "📹", lb: "Solo virtual" },
          { v: "presencial", ic: "📍", lb: "Solo presencial" },
        ].map(({ v, ic, lb }, idx, arr) => (
          <PillOption key={v} icon={ic} label={lb} selected={modality === v} onSelect={() => setModality(v)} last={idx === arr.length - 1} />
        ))}
      </div>

      {(modality === "presencial" || modality === "ambas") && (
        <>
          <span style={S.label}>Link de Google Maps del consultorio</span>
          <input
            style={S.input} type="url"
            placeholder="Pega aquí el link de Google Maps"
            value={mapsLink} onChange={e => setMapsLink(e.target.value)}
          />
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontFamily: T.fB, fontSize: 12, color: T.p, textDecoration: "none" }}>
              🗺️ Ver en Google Maps →
            </a>
          )}
          <p style={S.hint}>Abre Google Maps, busca tu consultorio, toca "Compartir" y copia el link.</p>
        </>
      )}

      <Nav />
    </>,

    // ── Paso 3: Disponibilidad ─────────────────────────────────────────────────
    <>
      <h2 style={S.title}>Disponibilidad</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>Activa los días y configura tus horarios.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {DAYS_CONFIG.map(({ key, label }) => {
          const isActive = activeDays[key];
          const intervals = schedule[key] || [];
          return (
            <div
              key={key}
              style={{
                border: `1.5px solid ${isActive ? T.p : T.bdr}`,
                borderRadius: 12,
                background: isActive ? T.pA : T.card,
                overflow: "hidden", transition: "all .2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Toggle on={isActive} onToggle={() => toggleDay(key)} />
                  <span style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: isActive ? T.p : T.tl }}>{label}</span>
                </div>
                {isActive && (
                  <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>
                    {intervals.length} intervalo{intervals.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {isActive && (
                <div style={{ padding: "0 13px 11px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {intervals.map((iv, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <input type="time" value={iv.start} onChange={e => updateInterval(key, idx, "start", e.target.value)}
                        style={{ flex: 1, padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${T.bdr}`, background: T.card, fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, outline: "none", textAlign: "center" }}
                      />
                      <span style={{ color: T.tl }}>→</span>
                      <input type="time" value={iv.end} onChange={e => updateInterval(key, idx, "end", e.target.value)}
                        style={{ flex: 1, padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${T.bdr}`, background: T.card, fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, outline: "none", textAlign: "center" }}
                      />
                      {intervals.length > 1 && (
                        <button onClick={() => removeInterval(key, idx)}
                          style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tl, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addInterval(key)}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.p, cursor: "pointer", padding: "2px 0" }}>
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

    // ── Paso 4: Tarifas ────────────────────────────────────────────────────────
    <>
      <h2 style={S.title}>Tarifas y servicios</h2>
      <div style={S.divider} />

      <span style={S.label}>Divisa</span>
      <select style={S.select} value={currency} onChange={e => setCurrency(e.target.value)}>
        {["MXN", "USD", "EUR", "COP", "ARS", "CLP"].map(c => <option key={c}>{c}</option>)}
      </select>

      <span style={{ ...S.label, marginTop: 16 }}>Servicios ofrecidos</span>
      <p style={{ ...S.hint, marginTop: 0, marginBottom: 9 }}>Selecciona un servicio y agrégalo con su tarifa.</p>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <select style={{ ...S.select, flex: 1 }} value={selectedPreset} onChange={e => setSelectedPreset(e.target.value)}>
          <option value="">— Selecciona —</option>
          {PRESET_SERVICES.filter(ps => !addedServices.find(a => a.label === ps.label && ps.id !== "ps_otro")).map(ps => (
            <option key={ps.id} value={ps.id}>{ps.label}</option>
          ))}
        </select>
        <button
          onClick={handleAddService}
          disabled={!selectedPreset}
          style={{
            padding: "11px 16px", borderRadius: 10, border: "none",
            background: selectedPreset ? T.p : T.bdrL,
            color: selectedPreset ? "#fff" : T.tl,
            fontFamily: T.fB, fontSize: 13, fontWeight: 700,
            cursor: selectedPreset ? "pointer" : "default",
            flexShrink: 0, transition: "all .15s",
          }}
        >
          + Agregar
        </button>
      </div>

      {selectedPreset === "ps_otro" && (
        <input
          style={{ ...S.input, marginTop: 9 }} type="text"
          placeholder="Nombre del servicio…"
          value={customServiceName} onChange={e => setCustomServiceName(e.target.value)}
          autoFocus
        />
      )}

      {addedServices.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {addedServices.map(svc => (
            <ServiceCard
              key={svc.id} svc={svc} currency={currency}
              onRemove={() => setAddedServices(prev => prev.filter(s => s.id !== svc.id))}
              onUpdatePrice={(field, val) => setAddedServices(prev => prev.map(s => s.id === svc.id ? { ...s, [field]: val } : s))}
            />
          ))}
        </div>
      )}

      {addedServices.length === 0 && (
        <div style={{ marginTop: 10, padding: 14, borderRadius: 12, border: `1.5px dashed ${T.bdr}`, textAlign: "center" }}>
          <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, margin: 0 }}>Agrega al menos un servicio con su tarifa.</p>
        </div>
      )}

      <div onClick={() => setShowPrice(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer" }}>
        <div style={{
          width: 19, height: 19, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${showPrice ? T.p : T.bdr}`,
          background: showPrice ? T.p : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "#fff", transition: "all .15s",
        }}>
          {showPrice ? "✓" : ""}
        </div>
        <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.4 }}>
          Mostrar precio al paciente al agendar
        </span>
      </div>

      <span style={{ ...S.label, marginTop: 14 }}>Política de pago</span>
      <textarea style={{ ...S.textarea, minHeight: 100 }} value={payPolicy} onChange={e => setPayPolicy(e.target.value)} />
      <p style={S.hint}>Puedes personalizar este texto según tus condiciones.</p>

      <Nav />
    </>,

    // ── Paso 5: Listo ──────────────────────────────────────────────────────────
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "24px 0 12px" }}>
        <span style={{ fontSize: 56, marginBottom: 16 }}>🎉</span>
        <h2 style={{ fontFamily: T.fH, fontSize: "clamp(24px, 6vw, 30px)", fontWeight: 600, color: T.t, marginBottom: 10, lineHeight: 1.2 }}>
          ¡Todo listo{name ? `, ${name.trim().split(" ")[0]}` : ""}!
        </h2>
        <p style={{ fontFamily: T.fB, fontSize: 14, color: T.tm, lineHeight: 1.7, marginBottom: 24, maxWidth: 300 }}>
          Tu perfil está configurado. Ya puedes gestionar tus pacientes, sesiones y finanzas desde un solo lugar.
        </p>

        {(name || specialties.length > 0 || addedServices.length > 0) && (
          <div style={{
            width: "100%", maxWidth: 320,
            background: T.pA, borderRadius: 16,
            padding: "16px 18px", marginBottom: 24, textAlign: "left",
          }}>
            {name && <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 6 }}>👤 <strong style={{ color: T.t }}>{name}</strong></div>}
            {specialties.length > 0 && (
              <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 6 }}>
                🧠 {[...specialties.filter(s => s !== "Otro"), ...(specialties.includes("Otro") && otherSpecialty ? [otherSpecialty] : [])].join(", ")}
              </div>
            )}
            {modality && (
              <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 6 }}>
                📅 {duration} · {modality === "ambas" ? "Presencial y virtual" : modality === "virtual" ? "Solo virtual" : "Solo presencial"}
              </div>
            )}
            {addedServices.length > 0 && (
              <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
                💼 {addedServices.length} servicio{addedServices.length !== 1 ? "s" : ""} configurado{addedServices.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onClose(collectData())}
          style={{
            width: "100%", maxWidth: 300, padding: "15px",
            borderRadius: 100, border: "none",
            background: T.p, color: "#fff",
            fontFamily: T.fB, fontSize: 15, fontWeight: 700,
            cursor: "pointer", boxShadow: `0 6px 20px ${T.p}40`,
          }}
        >
          Ir a mi consulta →
        </button>
      </div>
    </>,
  ];

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes ob-fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ob-slideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div style={S.overlay}>
        <div style={S.container}>

          <div style={S.topbar}>
            <div style={S.logoWrap}>
              <div style={S.logoIcon}>🧠</div>
              <span style={S.logoName}>PsychoCore</span>
            </div>
            <button style={S.skipAll} onClick={() => onClose(null)}>Omitir</button>
          </div>

          <Stepper />

          <div style={S.progressBar}>
            <div style={{ height: "100%", background: T.p, borderRadius: 99, width: `${progress}%`, transition: "width .4s ease" }} />
          </div>

          <div style={S.card} key={step}>
            {steps[step]}
          </div>

        </div>
      </div>
    </>
  );
}
