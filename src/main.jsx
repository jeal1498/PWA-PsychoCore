import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PatientPortal from "./modules/PatientPortal.jsx";

// PWA update handler — registers Service Worker via vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    console.info("[PsychoCore] Nueva versión disponible. Actualizando...");
  },
  onOfflineReady() {
    console.info("[PsychoCore] App lista para uso offline.");
  },
});

// ── Detect patient portal route: /p ──────────────────────────────────────────
const isPortal = window.location.pathname.match(/^\/p\/?$/);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isPortal ? <PatientPortal /> : <App />}
  </StrictMode>
);
