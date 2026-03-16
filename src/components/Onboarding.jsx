// ─────────────────────────────────────────────────────────────────────────────
// src/components/Onboarding.jsx
// Modal de bienvenida para nuevos psicólogos — aparece solo la primera vez
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { T } from "../theme.js";

const STEPS = [
  {
    emoji: "👋",
    title: "Bienvenida a PsychoCore",
    sub: "Tu espacio clínico ya está listo. En menos de 5 minutos tendrás todo configurado.",
    desc: "PsychoCore centraliza tus expedientes, sesiones, tareas para pacientes y finanzas en un solo lugar — accesible desde cualquier dispositivo.",
    cta: "Empezar configuración",
    action: null,
  },
  {
    emoji: "👤",
    title: "Paso 1 — Configura tu perfil",
    sub: "Tu nombre y especialidad aparecerán en los reportes y cartas que generes.",
    desc: "Ve a Ajustes → Perfil y completa tu nombre completo, especialidad y cédula profesional. Solo toma 1 minuto.",
    cta: "Ir a Ajustes",
    action: "settings",
    skip: "Hacerlo después",
  },
  {
    emoji: "🧑‍⚕️",
    title: "Paso 2 — Agrega tu primer paciente",
    sub: "Todo parte desde el expediente del paciente.",
    desc: "Crea el expediente de un paciente con su nombre, teléfono y diagnóstico. El teléfono es importante para poder enviarle tareas terapéuticas.",
    cta: "Ir a Pacientes",
    action: "patients",
    skip: "Hacerlo después",
  },
  {
    emoji: "📋",
    title: "Paso 3 — Registra tu primera sesión",
    sub: "Al terminar una sesión puedes asignar tareas que el paciente completa desde su celular.",
    desc: "En el módulo Sesiones registra la nota clínica, y al final selecciona una o más tareas terapéuticas para asignarle al paciente. Se le enviará un WhatsApp automáticamente.",
    cta: "Ir a Sesiones",
    action: "sessions",
    skip: "Explorar por mi cuenta",
  },
];

export default function Onboarding({ onClose, onNavigate }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const handleCta = () => {
    if (current.action) {
      onNavigate(current.action);
    }
    if (isLast) {
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    if (isLast) { onClose(); return; }
    setStep(s => s + 1);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(26,43,40,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, backdropFilter: "blur(4px)",
      animation: "fadeIn .25s ease",
    }}>
      <div style={{
        background: T.card, borderRadius: 24, width: "100%", maxWidth: 480,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(26,43,40,0.25), 0 0 0 1px rgba(58,107,110,0.1)",
        animation: "slideUp .3s ease",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: T.bdrL }}>
          <div style={{
            height: "100%", background: T.p,
            width: `${step === 0 ? 0 : progress}%`,
            transition: "width .4s ease",
          }}/>
        </div>

        {/* Content */}
        <div style={{ padding: "36px 36px 28px" }}>
          {/* Step indicator */}
          {step > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {STEPS.slice(1).map((_, i) => (
                <div key={i} style={{
                  height: 4, flex: 1, borderRadius: 9999,
                  background: i < step ? T.p : T.bdrL,
                  transition: "background .3s",
                }}/>
              ))}
            </div>
          )}

          {/* Emoji */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: step === 0 ? T.p : T.pA,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, marginBottom: 20,
          }}>
            {current.emoji}
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: T.fH, fontSize: 26, fontWeight: 600,
            color: T.t, lineHeight: 1.2, marginBottom: 8,
          }}>
            {current.title}
          </h2>

          {/* Subtitle */}
          <p style={{
            fontFamily: T.fB, fontSize: 14, fontWeight: 600,
            color: T.p, marginBottom: 12,
          }}>
            {current.sub}
          </p>

          {/* Description */}
          <p style={{
            fontFamily: T.fB, fontSize: 14, color: T.tm,
            lineHeight: 1.7, marginBottom: 28,
          }}>
            {current.desc}
          </p>

          {/* Tips for step 0 */}
          {step === 0 && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 10, marginBottom: 28,
            }}>
              {[
                { icon: "⚙️", text: "Configura tu perfil" },
                { icon: "🧑‍⚕️", text: "Agrega pacientes" },
                { icon: "📋", text: "Registra sesiones" },
                { icon: "✅", text: "Asigna tareas" },
              ].map(({ icon, text }) => (
                <div key={text} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: T.pA, border: `1px solid ${T.p}20`,
                }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.p }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {/* Back button */}
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  style={{
                    padding: "12px 18px", borderRadius: 100,
                    border: `1.5px solid ${T.bdr}`, background: "transparent",
                    fontFamily: T.fB, fontSize: 14, color: T.tm, cursor: "pointer",
                    transition: "all .15s",
                  }}>
                  ← Atrás
                </button>
              )}
              {/* Skip */}
              {current.skip && (
                <button onClick={handleSkip}
                  style={{
                    padding: "12px 16px", borderRadius: 100,
                    border: "none", background: "transparent",
                    fontFamily: T.fB, fontSize: 13, color: T.tl, cursor: "pointer",
                    transition: "color .15s",
                  }}>
                  {current.skip}
                </button>
              )}
            </div>

            {/* Primary CTA */}
            <button onClick={handleCta}
              style={{
                padding: "13px 24px", borderRadius: 100, border: "none",
                background: T.p, color: "#fff",
                fontFamily: T.fB, fontSize: 14, fontWeight: 700,
                cursor: "pointer", transition: "all .15s",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: `0 4px 14px ${T.p}40`,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              {current.cta}
              {!isLast && <span>→</span>}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 36px 20px",
          borderTop: `1px solid ${T.bdrL}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>
            {step === 0 ? "Configuración inicial" : `Paso ${step} de ${STEPS.length - 1}`}
          </span>
          <button onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: T.fB, fontSize: 12, color: T.tl,
              transition: "color .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = T.tm}
            onMouseLeave={e => e.currentTarget.style.color = T.tl}
          >
            Omitir todo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}
