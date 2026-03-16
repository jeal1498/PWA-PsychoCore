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
const isApp    = /^\/app(\/.*)?$/.test(path);

// Si es raíz (/), redirigir a landing estática no es necesario aquí
// porque Vercel sirve landing.html directamente para /
// Este bundle solo se ejecuta cuando Vercel lo sirve para /app y /p

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isPortal ? <PatientPortal /> : <App />}
  </StrictMode>
);
