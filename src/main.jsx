import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PatientPortal from "./modules/PatientPortal.jsx";

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
    {isPortal ? <PatientPortal /> : <App />}
  </StrictMode>
);
