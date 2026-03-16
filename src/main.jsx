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

// ── Detect patient portal route: /p/{phone} ───────────────────────────────────
const portalMatch = window.location.pathname.match(/^\/p\/(\d+)\/?$/);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {portalMatch
      ? <PatientPortal phone={portalMatch[1]}/>
      : <App />
    }
  </StrictMode>
);
