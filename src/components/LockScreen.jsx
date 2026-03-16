// ─────────────────────────────────────────────────────────────────────────────
// src/components/LockScreen.jsx
// Pantalla de autenticación con Google OAuth
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Brain } from "lucide-react";
import { T } from "../theme.js";
import { signInWithGoogle } from "../lib/supabase.js";

export default function LockScreen() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

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
      background: `linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.fB, padding: "24px",
    }}>
      <div style={{ textAlign: "center", color: "#fff", width: "100%", maxWidth: 360 }}>

        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(255,255,255,0.10)",
          border: "2px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <Brain size={36} strokeWidth={1.4} />
        </div>

        <div style={{ fontFamily: T.fH, fontSize: 38, fontWeight: 300, letterSpacing: "0.02em", marginBottom: 4 }}>
          PsychoCore
        </div>
        <div style={{ fontSize: 12, opacity: 0.5, letterSpacing: "0.1em", marginBottom: 48 }}>
          GESTIÓN CLÍNICA
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "32px 28px",
          backdropFilter: "blur(12px)",
        }}>
          <p style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.6, marginBottom: 28 }}>
            Inicia sesión con tu cuenta de Google para acceder a tu espacio clínico.
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%", padding: "14px 20px",
              borderRadius: 12, border: "none",
              background: loading ? "rgba(255,255,255,0.1)" : "#fff",
              color: loading ? "rgba(255,255,255,0.4)" : "#1A2B28",
              fontFamily: T.fB, fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              transition: "all .15s",
              boxShadow: loading ? "none" : "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  animation: "spin .8s linear infinite", flexShrink: 0,
                }}/>
                Conectando…
              </>
            ) : (
              <>
                {/* Google G logo */}
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          {error && (
            <p style={{ fontSize: 12, color: "#fca5a5", marginTop: 14, lineHeight: 1.4 }}>
              {error}
            </p>
          )}
        </div>

        <p style={{ fontSize: 11, opacity: 0.3, marginTop: 28, lineHeight: 1.6 }}>
          Solo psicólogos autorizados pueden acceder.{"\n"}
          Los datos del paciente están protegidos.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
