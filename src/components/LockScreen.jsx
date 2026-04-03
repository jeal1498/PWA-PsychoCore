// ─────────────────────────────────────────────────────────────────────────────
// src/components/LockScreen.jsx
// Pantalla de autenticación con Google OAuth
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Brain } from "lucide-react";
import { T } from "../theme.js";
import { signInWithGoogle } from "../lib/supabase.js";

// Colores locales de la pantalla de login (independientes del tema claro/oscuro)
const C = {
  bg:          "#0D1F1E",
  primary:     "#4D8A8D",
  primaryRing: "rgba(77,138,141,0.45)",
  primaryGlow: "rgba(77,138,141,0.12)",
  primaryFill: "rgba(77,138,141,0.15)",
  cardBorder:  "rgba(77,138,141,0.20)",
  title:       "#F0EDE8",
  subtitle:    "#6BA8AB",
  bodyText:    "rgba(240,237,232,0.70)",
  legalText:   "rgba(240,237,232,0.45)",
  linkColor:   "#6BA8AB",
};

export default function LockScreen() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(() => {
    // Detectar error en URL (ej. ?error=server_error&error_description=...)
    const params = new URLSearchParams(window.location.search);
    const desc = params.get("error_description");
    if (desc) return decodeURIComponent(desc.replace(/\+/g, " "));
    return "";
  });

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Supabase redirige a Google; cuando vuelve, App.jsx detecta la sesión
    } catch (e) {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      // Fondo sólido profundo + glow radial sutil centrado arriba
      background: C.bg,
      backgroundImage: `radial-gradient(ellipse 70% 50% at 50% -10%, ${C.primaryGlow}, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.fB, padding: "24px",
    }}>
      <div style={{ textAlign: "center", color: C.title, width: "100%", maxWidth: 360 }}>

        {/* ── Icono / Logo ─────────────────────────────────────────────── */}
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: C.primaryFill,
          border: `2px solid ${C.primaryRing}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Brain size={44} strokeWidth={1.7} color={C.primary} />
        </div>

        {/* Wordmark */}
        <div style={{
          fontFamily: T.fH, fontSize: 38, fontWeight: 300,
          letterSpacing: "0.03em", color: C.title, marginBottom: 6,
        }}>
          PsychoCore
        </div>

        {/* Subtítulo — kerning ampliado, color explícito para WCAG AA ~4.6:1 */}
        <div style={{
          fontSize: 11, color: C.subtitle,
          letterSpacing: "0.22em", fontWeight: 500,
          marginBottom: 36,
        }}>
          GESTIÓN CLÍNICA
        </div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 20, padding: "28px 24px 22px",
          backdropFilter: "blur(12px)",
        }}>
          <p style={{
            fontSize: 14, color: C.bodyText,
            lineHeight: 1.65, marginBottom: 22,
          }}>
            Accede a tu espacio clínico de forma segura.
          </p>

          {/* Botón Google — forma píldora, Google Identity Guidelines 2024 */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%", padding: "13px 20px",
              borderRadius: 100, border: "none",
              background: loading ? "rgba(255,255,255,0.10)" : "#fff",
              color: loading ? "rgba(255,255,255,0.40)" : "#1A2B28",
              fontFamily: T.fB, fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "opacity .15s, box-shadow .15s",
              boxShadow: loading ? "none" : "0 2px 10px rgba(0,0,0,0.28)",
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.25)",
                  borderTopColor: "#fff",
                  animation: "spin .8s linear infinite", flexShrink: 0,
                }}/>
                Conectando…
              </>
            ) : (
              <>
                {/* Google G logo */}
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          {/* Error de autenticación */}
          {error && (
            <p style={{ fontSize: 12, color: "#fca5a5", marginTop: 14, lineHeight: 1.4 }}>
              {error}
            </p>
          )}

          {/* ── Cláusula legal de aceptación ─────────────────────────── */}
          <p style={{
            fontSize: 11, color: C.legalText,
            lineHeight: 1.65, marginTop: 16, marginBottom: 0,
          }}>
            Al continuar, aceptas los{" "}
            <a
              href="/terminos"
              style={{ color: C.linkColor, textDecoration: "underline", cursor: "pointer" }}
            >
              Términos y Condiciones
            </a>
            {" "}y la{" "}
            <a
              href="/privacidad"
              style={{ color: C.linkColor, textDecoration: "underline", cursor: "pointer" }}
            >
              Política de Privacidad
            </a>
            .
          </p>
        </div>

        {/* ── Footer legal + soporte ───────────────────────────────────── */}
        <div style={{ marginTop: 22 }}>
          <p style={{
            fontSize: 11, color: C.legalText,
            lineHeight: 1.7, marginBottom: 10,
          }}>
            Solo psicólogos autorizados pueden acceder.
            <br />
            Datos protegidos bajo NOM-024-SSA3-2010.
          </p>
          <a
            href="mailto:soporte@psychocore.mx"
            style={{
              fontSize: 11, color: C.linkColor,
              textDecoration: "none",
              borderBottom: "1px solid rgba(107,168,171,0.35)",
              paddingBottom: 1, cursor: "pointer",
            }}
          >
            ¿Problemas para ingresar? Soporte técnico
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
