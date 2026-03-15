import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// PWA update handler — registers Service Worker via vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    // Silently update — no intrusive prompt
    // Para mostrar un banner de actualización, implementarlo aquí
    console.info("[PsychoCore] Nueva versión disponible. Actualizando...");
  },
  onOfflineReady() {
    console.info("[PsychoCore] App lista para uso offline.");
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
