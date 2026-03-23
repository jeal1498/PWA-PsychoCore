import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PatientPortal from "./modules/PatientPortal.jsx";
import { AppStateProvider } from "./context/AppStateContext.jsx";

// PWA update handler
import { registerSW } from "virtual:pwa-register";
registerSW({
  onNeedRefresh() { console.info("[PsychoCore] Nueva versión disponible. Actualizando..."); },
  onOfflineReady() { console.info("[PsychoCore] App lista para uso offline."); },
});

// ── ErrorBoundary — captura cualquier error del árbol y lo muestra en pantalla
// Elimina la "pantalla blanca silenciosa" en producción.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[PsychoCore] Error crítico:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#1E3535",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 16,
            padding: "28px 24px",
            maxWidth: 480,
            width: "100%",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Error al cargar la aplicación
            </div>
            <div style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              marginBottom: 20,
              lineHeight: 1.6,
            }}>
              Ocurrió un error inesperado. Por favor copia el mensaje de abajo y compártelo para diagnóstico.
            </div>
            <pre style={{
              background: "rgba(0,0,0,0.4)",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 11,
              color: "#ff8080",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              marginBottom: 20,
              maxHeight: 200,
            }}>
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack?.split("\n").slice(0, 6).join("\n")}
            </pre>
            <button
              onClick={() => {
                // Limpiar SW cache y recargar
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister());
                  });
                }
                caches.keys().then(keys => {
                  keys.forEach(k => caches.delete(k));
                }).finally(() => window.location.reload());
              }}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 100,
                background: "#fff",
                color: "#1E3535",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              🔄 Limpiar caché y reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Routing ───────────────────────────────────────────────────────────────────
const path = window.location.pathname;
const isPortal = /^\/p\/?$/.test(path);
const isApp = path.startsWith("/app") || path === "/" || (!isPortal);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      {isPortal
        ? <PatientPortal />
        : <AppStateProvider><App /></AppStateProvider>
      }
    </ErrorBoundary>
  </StrictMode>
);
