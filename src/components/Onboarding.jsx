// ─────────────────────────────────────────────────────────────────────────────
// src/components/Onboarding.jsx
// Modal de configuración inicial — 8 pasos guiados para nuevos psicólogos.
// Se dispara al primer login cuando no hay pacientes registrados.
// Tokens: T de theme.js. Sin dependencias externas.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
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

const DAYS = ["L", "M", "Mi", "J", "V", "S", "D"];

// ── Estilos base reutilizables ────────────────────────────────────────────────
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
  logoWrap: { display: "flex", alignItems: "center", gap: 8 },
  logoIcon: {
    width: 30, height: 30, borderRadius: 8,
    background: T.p,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 15,
  },
  logoName: {
    fontFamily: T.fH, fontSize: 17, fontWeight: 600, color: T.t,
  },
  skipAll: {
    background: "none", border: "none",
    fontFamily: T.fB, fontSize: 12, color: T.tl,
    cursor: "pointer", padding: "4px 8px",
  },
  stepperRow: {
    display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
    padding: "0 24px 10px",
  },
  progressBar: {
    height: 3, background: T.bdrL, margin: "0 24px 14px", borderRadius: 99,
  },
  card: {
    background: T.card, borderRadius: 20,
    margin: "0 16px",
    padding: "24px 20px 20px",
    boxShadow: "0 4px 24px rgba(26,43,40,0.10), 0 1px 4px rgba(26,43,40,0.06)",
    animation: "ob-slideUp .3s ease",
  },
  title: {
    fontFamily: T.fH, fontSize: 24, fontWeight: 600,
    color: T.t, lineHeight: 1.2, marginBottom: 4,
  },
  divider: {
    width: 44, height: 3, background: T.p,
    borderRadius: 99, marginBottom: 18,
  },
  bodyText: {
    fontFamily: T.fB, fontSize: 14, color: T.tm, lineHeight: 1.6,
    marginBottom: 14,
  },
  label: {
    display: "block",
    fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.tm,
    marginBottom: 6, marginTop: 14,
  },
  input: {
    width: "100%", padding: "11px 13px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 15, color: T.t,
    background: T.bg || "var(--bg)",
    outline: "none",
  },
  textarea: {
    width: "100%", padding: "11px 13px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 14, color: T.t,
    background: T.bg || "var(--bg)",
    outline: "none", resize: "none", minHeight: 80, lineHeight: 1.6,
  },
  select: {
    width: "100%", padding: "11px 13px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 14, color: T.t,
    background: T.bg || "var(--bg)",
    outline: "none",
  },
  hint: {
    fontFamily: T.fB, fontSize: 12, color: T.tl, marginTop: 5,
  },
  navRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 24, gap: 10,
  },
  btnBack: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "11px 18px", borderRadius: 100,
    border: `1.5px solid ${T.bdr}`, background: "transparent",
    fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.tm,
    cursor: "pointer",
  },
  btnNext: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: "13px 20px", borderRadius: 100,
    border: "none", background: T.p, color: "#fff",
    fontFamily: T.fB, fontSize: 14, fontWeight: 700,
    cursor: "pointer",
    boxShadow: `0 4px 14px ${T.p}40`,
  },
};

// ── Sub-componentes reutilizables ─────────────────────────────────────────────

function CheckboxItem({ icon, label, selected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
        border: `1.5px solid ${selected ? T.p : T.bdr}`,
        background: selected ? T.pA : T.card,
        transition: "all .15s",
      }}
    >
      <div style={{
        width: 17, height: 17, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${selected ? T.p : T.bdr}`,
        background: selected ? T.p : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: "#fff",
      }}>
        {selected ? "✓" : ""}
      </div>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{
        fontFamily: T.fB, fontSize: 13, fontWeight: selected ? 600 : 400,
        color: selected ? T.p : T.tm,
      }}>
        {label}
      </span>
    </div>
  );
}

function RadioCard({ icon, title, desc, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "14px 16px", borderRadius: 12, cursor: "pointer",
        border: `1.5px solid ${selected ? T.p : T.bdr}`,
        background: selected ? T.pA : T.card,
        display: "flex", alignItems: "flex-start", gap: 13,
        transition: "all .15s", marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{
          fontFamily: T.fB, fontSize: 14, fontWeight: 700,
          color: selected ? T.p : T.t, marginBottom: 3,
        }}>{title}</div>
        <div style={{
          fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.5,
        }}>{desc}</div>
      </div>
    </div>
  );
}

function Chip({ label, selected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: "7px 14px", borderRadius: 100,
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

function PillOption({ icon, label, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer", borderBottom: `1px solid ${T.bdrL}`,
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

function IntCard({ icon, title, desc, connected, onToggle }) {
  return (
    <div style={{
      border: `1.5px solid ${connected ? T.p : T.bdr}`,
      borderRadius: 14, padding: 18,
      background: connected ? T.pA : T.card,
      display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center", gap: 10, marginTop: 14,
      transition: "all .2s",
    }}>
      <span style={{ fontSize: 38 }}>{icon}</span>
      <div style={{ fontFamily: T.fB, fontSize: 15, fontWeight: 700, color: T.t }}>{title}</div>
      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.5 }}>{desc}</div>
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: "11px",
          borderRadius: 10, border: connected ? `1.5px solid ${T.p}` : "none",
          background: connected ? "transparent" : T.p,
          color: connected ? T.p : "#fff",
          fontFamily: T.fB, fontSize: 14, fontWeight: 700,
          cursor: "pointer", transition: "all .15s",
        }}
      >
        {connected ? "✓ Conectado" : "Conectar"}
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Onboarding({ onClose, onNavigate }) {
  const [step, setStep] = useState(0);

  // Estado del formulario
  const [sources,     setSources]     = useState([]);
  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [description, setDescription] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [agendaType,  setAgendaType]  = useState("publica");
  const [duration,    setDuration]    = useState("1 hora");
  const [modality,    setModality]    = useState("ambas");
  const [location,    setLocation]    = useState("");
  const [days,        setDays]        = useState(["L"]);
  const [startTime,   setStartTime]   = useState("09:00");
  const [endTime,     setEndTime]     = useState("19:00");
  const [price,       setPrice]       = useState("");
  const [currency,    setCurrency]    = useState("MXN");
  const [showPrice,   setShowPrice]   = useState(true);
  const [payPolicy,   setPayPolicy]   = useState("");
  const [gcal,        setGcal]        = useState(false);
  const [stripe,      setStripe]      = useState(false);

  // Helpers
  const toggle = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleDay = (d) => toggle(days, setDays, d);

  const go = (dir) => {
    const next = step + dir;
    if (next < 0 || next >= TOTAL_STEPS) return;
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = (step / (TOTAL_STEPS - 1)) * 100;

  // ── NAV BUTTONS ───────────────────────────────────────────────────────────
  const Nav = ({ showBack = true }) => (
    <div style={S.navRow}>
      {showBack
        ? <button style={S.btnBack} onClick={() => go(-1)}>← Atrás</button>
        : <div />
      }
      {step < TOTAL_STEPS - 1 && (
        <button style={S.btnNext} onClick={() => go(1)}>
          Siguiente →
        </button>
      )}
    </div>
  );

  // ── STEPPER ───────────────────────────────────────────────────────────────
  const Stepper = () => (
    <div style={S.stepperRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const done   = i < step;
        const active = i === step;
        return (
          <div
            key={i}
            onClick={() => { if (i <= step) setStep(i); }}
            style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              cursor: i <= step ? "pointer" : "default",
              border: `2.5px solid ${done ? T.p : active ? T.p : T.bdr}`,
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

  // ── STEPS ─────────────────────────────────────────────────────────────────

  const steps = [
    // 0 — ¿Cómo te enteraste?
    <>
      <h2 style={S.title}>¿Cómo te enteraste de la plataforma?</h2>
      <div style={S.divider} />
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
      }}>
        {SOURCES.map(s => (
          <CheckboxItem
            key={s.id}
            icon={s.icon}
            label={s.label}
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
      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: T.p,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.fH, fontSize: 26, fontWeight: 600, color: "#fff",
          position: "relative", cursor: "pointer",
        }}>
          {name
            ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
            : "JE"
          }
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 26, height: 26, borderRadius: "50%",
            background: T.card, border: `2px solid ${T.bdr}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12,
          }}>✏️</div>
        </div>
      </div>
      <span style={S.label}>Nombre completo</span>
      <input
        style={S.input} type="text"
        placeholder="Ej. Dra. Laura Martínez"
        value={name} onChange={e => setName(e.target.value)}
      />
      <span style={S.label}>Celular</span>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{
          padding: "11px 13px", border: `1.5px solid ${T.bdr}`, borderRadius: 10,
          fontFamily: T.fB, fontSize: 14, color: T.t,
          background: T.bg || "var(--bg)", whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: 6,
        }}>🇲🇽 +52 (MX) ⌄</div>
        <input
          style={{ ...S.input, flex: 1 }} type="tel"
          placeholder="10 dígitos"
          value={phone} onChange={e => setPhone(e.target.value)}
        />
      </div>
      <p style={S.hint}>¿Para qué se usa tu número? ℹ️</p>
      <span style={S.label}>Descripción</span>
      <textarea
        style={S.textarea}
        placeholder="Cuéntale a tus pacientes sobre ti…"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Nav />
    </>,

    // 2 — Especialidad
    <>
      <h2 style={S.title}>Tu especialidad</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>Selecciona una o más áreas en las que trabajas.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SPECIALTIES.map(s => (
          <Chip
            key={s} label={s}
            selected={specialties.includes(s)}
            onToggle={() => toggle(specialties, setSpecialties, s)}
          />
        ))}
      </div>
      <Nav />
    </>,

    // 3 — Configurar sesiones
    <>
      <h2 style={S.title}>Configura cómo darás tus sesiones</h2>
      <div style={S.divider} />
      <span style={S.label}>¿De qué forma prefieres organizar tus sesiones?</span>
      <RadioCard
        icon="🔓" title="Pública"
        desc="Podrás compartir un link a tus pacientes para que agenden contigo"
        selected={agendaType === "publica"}
        onSelect={() => setAgendaType("publica")}
      />
      <RadioCard
        icon="🔒" title="Privada"
        desc="Solo tú podrás agendar sesiones con tus pacientes"
        selected={agendaType === "privada"}
        onSelect={() => setAgendaType("privada")}
      />
      <span style={{ ...S.label, marginTop: 18 }}>¿Qué tiempo suelen durar tus sesiones?</span>
      <select style={S.select} value={duration} onChange={e => setDuration(e.target.value)}>
        {["30 min", "45 min", "1 hora", "1.5 horas", "2 horas"].map(d => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <span style={{ ...S.label, marginTop: 18 }}>¿Qué modalidad de sesiones sueles manejar?</span>
      <div style={{ border: `1.5px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden" }}>
        {[
          { v: "ambas",      ic: "🔀", lb: "Ambas" },
          { v: "virtual",    ic: "📹", lb: "Sólo virtual" },
          { v: "presencial", ic: "📍", lb: "Sólo presencial" },
        ].map(({ v, ic, lb }, idx, arr) => (
          <PillOption
            key={v} icon={ic} label={lb}
            selected={modality === v}
            onSelect={() => setModality(v)}
          />
        ))}
      </div>
      {(modality === "presencial" || modality === "ambas") && (
        <>
          <span style={S.label}>Describe cómo llegar al lugar de las sesiones</span>
          <textarea
            style={S.textarea}
            placeholder="Ej. Consultorio 3, Blvd. Kukulcán km 12…"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </>
      )}
      <Nav />
    </>,

    // 4 — Disponibilidad
    <>
      <h2 style={S.title}>Planifica tu disponibilidad</h2>
      <div style={S.divider} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: T.fB, fontSize: 15, fontWeight: 700, color: T.t }}>Modo básico</span>
        <button style={{
          padding: "7px 16px", borderRadius: 100,
          background: T.pA, color: T.p, border: "none",
          fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Modo avanzado ℹ️</button>
      </div>
      <div style={{
        border: `1.5px solid ${T.bdr}`, borderRadius: 14, padding: 16,
        background: T.card,
      }}>
        {/* Time range */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 9, border: "none",
              background: T.pA, fontFamily: T.fB, fontSize: 17, fontWeight: 700,
              color: T.t, textAlign: "center", outline: "none",
            }}
          />
          <span style={{ color: T.tl, fontSize: 20, fontWeight: 300 }}>→</span>
          <input
            type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 9, border: "none",
              background: T.pA, fontFamily: T.fB, fontSize: 17, fontWeight: 700,
              color: T.t, textAlign: "center", outline: "none",
            }}
          />
          <span style={{ color: T.tl, fontSize: 18, cursor: "pointer", paddingLeft: 4 }}>✕</span>
        </div>
        <p style={{
          textAlign: "center", color: T.p, fontSize: 13, fontWeight: 600,
          marginTop: 14, cursor: "pointer", fontFamily: T.fB,
        }}>+ Agregar intervalo</p>
        <div style={{ height: 1, background: T.bdrL, margin: "14px 0" }} />
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
          textTransform: "uppercase", color: T.tl, marginBottom: 10, fontFamily: T.fB,
        }}>Días activos</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {DAYS.map(d => (
            <div
              key={d}
              onClick={() => toggleDay(d)}
              style={{
                padding: "9px 0", borderRadius: 9, textAlign: "center",
                border: `1.5px solid ${days.includes(d) ? T.p : T.bdr}`,
                background: days.includes(d) ? T.p : T.card,
                fontFamily: T.fB, fontSize: 12, fontWeight: 700,
                color: days.includes(d) ? "#fff" : T.tl,
                cursor: "pointer", transition: "all .15s",
              }}
            >{d}</div>
          ))}
        </div>
      </div>
      <Nav />
    </>,

    // 5 — Tarifas
    <>
      <h2 style={S.title}>Configura tus tarifas y pagos</h2>
      <div style={S.divider} />
      <span style={S.label}>Costo de la sesión</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
        <input
          style={{ ...S.input, fontSize: 20, fontWeight: 700 }}
          type="number" placeholder="0.00"
          value={price} onChange={e => setPrice(e.target.value)}
        />
        <select
          style={{ ...S.select, width: "auto", minWidth: 90 }}
          value={currency} onChange={e => setCurrency(e.target.value)}
        >
          {["MXN","USD","EUR","COP","ARS","CLP"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <span style={S.label}>Política de pago</span>
      <textarea
        style={S.textarea}
        placeholder="Describe tu política de pago…"
        value={payPolicy}
        onChange={e => setPayPolicy(e.target.value)}
      />
      <div
        onClick={() => setShowPrice(p => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          marginTop: 14, cursor: "pointer",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${showPrice ? T.p : T.bdr}`,
          background: showPrice ? T.p : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#fff", transition: "all .15s",
        }}>
          {showPrice ? "✓" : ""}
        </div>
        <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.4 }}>
          ¿Mostrar el precio de la sesión al paciente al agendar?
        </span>
      </div>
      <Nav />
    </>,

    // 6 — Conectar apps
    <>
      <h2 style={S.title}>Conectar Aplicaciones</h2>
      <div style={S.divider} />
      <p style={S.bodyText}>
        Potencia tu consulta conectando tus herramientas favoritas. Puedes hacerlo después desde Ajustes.
      </p>
      <IntCard
        icon="📅"
        title="Google Calendar y Meet"
        desc="Conecta tu cuenta de Google para integrar con tu calendario. Sincroniza tus reservaciones y genera enlaces de reuniones virtuales con Google Meet."
        connected={gcal}
        onToggle={() => setGcal(v => !v)}
      />
      <IntCard
        icon="💳"
        title="Stripe"
        desc="Recibe pagos en línea de tus pacientes directamente en tu cuenta. Genera cobros con tarjeta de crédito y débito de forma segura."
        connected={stripe}
        onToggle={() => setStripe(v => !v)}
      />
      <Nav />
    </>,

    // 7 — Finalizar
    <>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "20px 0 10px",
      }}>
        <span style={{ fontSize: 60, marginBottom: 18 }}>🎉</span>
        <h2 style={{
          fontFamily: T.fH, fontSize: 28, fontWeight: 600, color: T.t,
          marginBottom: 10, lineHeight: 1.2,
        }}>
          ¡Todo listo!
        </h2>
        <p style={{
          fontFamily: T.fB, fontSize: 15, color: T.tm, lineHeight: 1.7,
          marginBottom: 28, maxWidth: 320,
        }}>
          Tu perfil ya está configurado. A partir de ahora puedes gestionar tus pacientes, sesiones y finanzas desde un solo lugar.
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%", maxWidth: 300, padding: "15px",
            borderRadius: 100, border: "none",
            background: T.p, color: "#fff",
            fontFamily: T.fB, fontSize: 15, fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 6px 20px ${T.p}40`,
          }}
        >
          Ir a mi consulta →
        </button>
      </div>
    </>,
  ];

  return (
    <>
      <style>{`
        @keyframes ob-fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes ob-slideUp {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>

      <div style={S.overlay}>
        <div style={S.container}>

          {/* Top bar */}
          <div style={S.topbar}>
            <div style={S.logoWrap}>
              <div style={S.logoIcon}>🧠</div>
              <span style={S.logoName}>PsychoCore</span>
            </div>
            <button style={S.skipAll} onClick={onClose}>Omitir todo</button>
          </div>

          {/* Stepper */}
          <Stepper />

          {/* Progress bar */}
          <div style={S.progressBar}>
            <div style={{
              height: "100%", background: T.p, borderRadius: 99,
              width: `${progress}%`, transition: "width .4s ease",
            }} />
          </div>

          {/* Card */}
          <div style={S.card}>
            {steps[step]}
          </div>

          {/* Footer */}
          <div style={{
            textAlign: "center", marginTop: 14,
            fontFamily: T.fB, fontSize: 12, color: T.tl,
          }}>
            {step === TOTAL_STEPS - 1
              ? "Configuración completada"
              : `Paso ${step + 1} de ${TOTAL_STEPS}`}
          </div>

        </div>
      </div>
    </>
  );
}
