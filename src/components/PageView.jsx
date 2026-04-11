import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { T } from "../theme.js";

/**
 * PageView — reemplaza los modales con una página de pantalla completa.
 *
 * Props:
 *   open       {boolean}   — muestra u oculta la página
 *   onClose    {function}  — callback al presionar "Atrás" o Escape
 *   title      {string}    — título del encabezado
 *   backLabel  {string}    — etiqueta del botón atrás (default: "Atrás")
 *   children   {ReactNode} — contenido de la página
 *   maxWidth   {number}    — ancho máximo del contenido (default: 720)
 *   actions    {ReactNode} — botones opcionales en el encabezado (esquina derecha)
 */
export function PageView({
  open,
  onClose,
  title,
  backLabel = "Atrás",
  children,
  maxWidth = 720,
  actions,
}) {
  // Escape cierra la página
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Scroll al tope al abrir
  useEffect(() => {
    if (open) window.scrollTo({ top: 0, behavior: "instant" });
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: T.bg,
        zIndex: 900,
        overflowY: "auto",
        animation: "pc-fadeSlideUp 0.22s ease",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: T.card,
          borderBottom: `1px solid ${T.bdrL}`,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          height: 56,
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.p,
            fontFamily: T.fB,
            fontSize: 14,
            fontWeight: 500,
            padding: "6px 0",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
          {backLabel}
        </button>

        <div
          style={{
            width: 1,
            height: 20,
            background: T.bdrL,
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontFamily: T.fH,
            fontSize: 20,
            fontWeight: 600,
            color: T.t,
            letterSpacing: "-0.01em",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>

        {actions && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {/* ── Contenido ── */}
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "32px 24px 64px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
