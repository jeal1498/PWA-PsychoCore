import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PatientPortal from "./modules/PatientPortal.jsx";
import { AppStateProvider } from "./context/AppStateContext.jsx"; // FASE 1

// PWA update handler
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() { console.info("[PsychoCore] Nueva versión disponible. Actualizando..."); },
  onOfflineReady() { console.info("[PsychoCore] App lista para uso offline."); },
});

// ── Routing ──────────────────────────────────────────────────────────────────
const path = window.location.pathname;

const isPortal = /^\/p\/?$/.test(path);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* FASE 1 — AppStateProvider envuelve solo la app principal.
        PatientPortal es público y no necesita el estado del psicólogo. */}
    {isPortal
      ? <PatientPortal />
      : <AppStateProvider><App /></AppStateProvider>
    }
  </StrictMode>
);
