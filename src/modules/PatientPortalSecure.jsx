import { useEffect, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import LegacyPatientPortal from "./PatientPortal.jsx";
import { exchangePortalToken, getPortalSession } from "../lib/supabase.js";

const P = {
  bg: "#F4F2EE",
  card: "#FFFFFF",
  p: "#3A6B6E",
  t: "#1A2B28",
  tm: "#5A7270",
  tl: "#9BAFAD",
  bdr: "#D8E2E0",
  err: "#B85050",
  errA: "rgba(184,80,80,0.08)",
  fH: '"Cormorant Garamond", Georgia, serif',
  fB: '"DM Sans", system-ui, sans-serif',
};

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `3px solid ${P.bdr}`,
          borderTopColor: P.p,
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function AccessRequired({ error, onRetry }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        fontFamily: P.fB,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              background: "rgba(58,107,110,0.10)",
              border: "2px solid rgba(58,107,110,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <Brain size={38} strokeWidth={1.6} color={P.p} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#5A8A8D",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Tu espacio terapéutico
          </div>
          <h1
            style={{
              fontFamily: P.fH,
              fontSize: 34,
              fontWeight: 300,
              color: P.t,
              margin: "0 0 8px",
            }}
          >
            Mi Espacio
          </h1>
          <p style={{ fontSize: 13, color: "#3D5C59", lineHeight: 1.65, margin: 0 }}>
            Este portal ahora requiere un enlace temporal y seguro compartido por tu psicólogo(a).
          </p>
        </div>

        <div
          style={{
            background: P.card,
            borderRadius: 20,
            padding: "24px 22px 20px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          }}
        >
          {error && (
            <div
              style={{
                background: P.errA,
                border: "1px solid rgba(184,80,80,0.18)",
                borderRadius: 10,
                padding: "10px 13px",
                marginBottom: 14,
                fontSize: 12,
                color: "#7A3030",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={onRetry}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 100,
              border: "none",
              background: P.p,
              color: "#fff",
              fontFamily: P.fB,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(58,107,110,0.32)",
            }}
          >
            <RefreshCw size={16} />
            Reintentar acceso
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PatientPortalSecure() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const ticket = params.get("t");

        if (ticket) {
          await exchangePortalToken(ticket);
        }

        const session = await getPortalSession();
        const phone = session?.patient?.phone;
        if (!phone) {
          throw new Error("No se pudo resolver la sesión del portal.");
        }

        if (cancelled) return;

        window.history.replaceState({}, "", "/p");
        setReady(true);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setReady(false);
        setError(
          err?.message?.includes("expired") || err?.message?.includes("Invalid")
            ? "Tu enlace ya no es válido o expiró. Pide a tu psicólogo(a) un nuevo acceso seguro."
            : "Abre el enlace temporal y seguro que te compartió tu psicólogo(a)."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (ready) return <LegacyPatientPortal />;
  if (!error) return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: P.fB,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "rgba(58,107,110,0.10)",
          border: "2px solid rgba(58,107,110,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <Brain size={32} strokeWidth={1.6} color={P.p} />
      </div>
      <Spinner />
      <p style={{ fontSize: 14, color: P.tm, marginTop: 10 }}>Verificando tu acceso seguroâ€¦</p>
    </div>
  );

  return <AccessRequired error={error} onRetry={() => window.location.reload()} />;
}

