import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Users, Calendar, FileText, X, ArrowRight, DollarSign, ClipboardList, CalendarDays, UserCircle } from "lucide-react";
import { T } from "../theme.js";
import { fmtDate } from "../utils.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useAppState } from "../context/AppStateContext.jsx";

export default function GlobalSearch({ patients, appointments, sessions, payments = [], onNavigate }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const isMobile = useIsMobile();
  const { activePatientContext } = useAppState();

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const quickActions = [
    {
      id: "new-session",
      label: "Nueva sesión",
      hint: activePatientContext?.patientName ? `Para ${activePatientContext.patientName}` : "Abre la nota clínica con el contexto activo",
      icon: ClipboardList,
      action: () => { onNavigate("sessions", activePatientContext ? { ...activePatientContext, source: "quick-action", quickAction: "newSession" } : { quickAction: "newSession", source: "quick-action" }); setOpen(false); setQuery(""); },
    },
    {
      id: "register-payment",
      label: "Registrar pago",
      hint: activePatientContext?.patientName ? `Cobro de ${activePatientContext.patientName}` : "Abre Finanzas con el paciente activo",
      icon: DollarSign,
      action: () => { onNavigate("finance", activePatientContext ? { ...activePatientContext, source: "quick-action", quickAction: "newPayment" } : { quickAction: "newPayment", source: "quick-action" }); setOpen(false); setQuery(""); },
    },
  ];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const out = [];

    // Patients — se añade data: p para los botones de acción
    patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.diagnosis||"").toLowerCase().includes(q) ||
      (p.email||"").toLowerCase().includes(q)
    ).slice(0,4).forEach(p => out.push({
      type: "patient", icon: Users, label: p.name,
      sub: p.diagnosis || "Sin diagnóstico",
      color: T.p, bg: T.pA,
      action: () => { onNavigate("patients", p); setOpen(false); setQuery(""); },
      data: p,
    }));

    // Appointments
    appointments.filter(a =>
      a.patientName.toLowerCase().includes(q) ||
      (a.type||"").toLowerCase().includes(q)
    ).slice(0,3).forEach(a => out.push({
      type: "appointment", icon: Calendar, label: `${a.patientName.split(" ").slice(0,2).join(" ")}`,
      sub: `${fmtDate(a.date)} · ${a.time} · ${a.type}`,
      color: T.acc, bg: T.accA,
      action: () => { onNavigate("agenda", { patientId: a.patientId, patientName: a.patientName, source: "search" }); setOpen(false); setQuery(""); },
    }));

    // Sessions
    sessions.filter(s =>
      s.patientName.toLowerCase().includes(q) ||
      (s.notes||"").toLowerCase().includes(q) ||
      (s.tags||[]).some(t => t.toLowerCase().includes(q))
    ).slice(0,3).forEach(s => out.push({
      type: "session", icon: FileText, label: `Sesión — ${s.patientName.split(" ").slice(0,2).join(" ")}`,
      sub: `${fmtDate(s.date)} · ${s.notes.slice(0,60)}…`,
      color: T.suc, bg: T.sucA,
      action: () => { onNavigate("sessions", { patientId: s.patientId, patientName: s.patientName, source: "search" }); setOpen(false); setQuery(""); },
    }));

    // Payments — FASE 4
    payments.filter(p =>
      (p.patientName||"").toLowerCase().includes(q) ||
      (p.concept||"").toLowerCase().includes(q) ||
      (p.method||"").toLowerCase().includes(q)
    ).slice(0,2).forEach(p => out.push({
      type: "payment", icon: DollarSign,
      label: `${(p.patientName||"").split(" ").slice(0,2).join(" ")} · $${Number(p.amount||0).toLocaleString("es-MX")}`,
      sub: `${p.concept || "Pago"} · ${p.method || ""} · ${p.status === "pagado" ? "Pagado" : "Pendiente"}`,
      color: p.status === "pagado" ? T.suc : T.war,
      bg:    p.status === "pagado" ? T.sucA : T.warA,
      action: () => { onNavigate("finance", { patientId: p.patientId, patientName: p.patientName, source: "search" }); setOpen(false); setQuery(""); },
    }));

    return out;
  }, [query, patients, appointments, sessions, payments, onNavigate]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,0,0,0.06)", border: "none",
          borderRadius: 9, padding: isMobile ? "0 10px" : "0 14px", height: 40,
          cursor: "pointer", color: "rgba(0,0,0,0.45)",
          fontFamily: T.fB, fontSize: 13, transition: "background .15s",
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.10)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
      >
        <Search size={15} />
        {!isMobile && <span>Buscar</span>}
        {!isMobile && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }}>⌘K</span>}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => { setOpen(false); setQuery(""); }}
        style={{ position: "fixed", inset: 0, background: "rgba(26,43,40,0.55)", zIndex: 500 }} />

      {/* Search panel */}
      <div style={{
        position: "fixed", top: "12vh", left: "50%", transform: "translateX(-50%)",
        width: "min(560px, 92vw)", background: T.card,
        borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        zIndex: 501, overflow: "hidden",
      }}>
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${T.bdrL}` }}>
          <Search size={18} color={T.tl} strokeWidth={1.6} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar pacientes, citas, sesiones, pagos…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: T.fB, fontSize: 15, color: T.t, background: "transparent" }}
          />
          {query && (
            <button onClick={() => setQuery("")}
              style={{ background: T.bdrL, border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.tm, flexShrink: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {!query && (
          <div style={{ padding: "14px 20px 4px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:10 }}>
              <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                Acciones rápidas
              </div>
              {activePatientContext?.patientName && (
                <div style={{ padding:"4px 10px", borderRadius:9999, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:11, fontWeight:600 }}>
                  {activePatientContext.patientName}
                </div>
              )}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr", gap:8 }}>
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={action.action}
                    style={{
                      display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                      borderRadius:14, border:`1.5px solid ${T.bdrL}`, background:T.cardAlt,
                      cursor:"pointer", textAlign:"left",
                    }}
                  >
                    <div style={{ width:34, height:34, borderRadius:10, background:T.pA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={16} color={T.p} strokeWidth={1.7}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:700, color:T.t, marginBottom:2 }}>{action.label}</div>
                      <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, lineHeight:1.45 }}>{action.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results */}
        {query.length >= 2 && (
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {results.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", fontFamily: T.fB, fontSize: 13, color: T.tl }}>
                Sin resultados para «{query}»
              </div>
            ) : results.map((r, i) =>
              r.type === "patient"
                ? <PatientResultRow key={i} r={r} isMobile={isMobile} onNavigate={onNavigate} setOpen={setOpen} setQuery={setQuery} />
                : (
                  <button key={i} onClick={r.action}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${T.bdrL}`, transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <r.icon size={16} color={r.color} strokeWidth={1.6} />
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
                    </div>
                    <ArrowRight size={14} color={T.tl} style={{ flexShrink: 0 }} />
                  </button>
                )
            )}
          </div>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <div style={{ padding: "20px", fontFamily: T.fB, fontSize: 12, color: T.tl, textAlign: "center" }}>
            Escribe al menos 2 caracteres · <kbd style={{ background: T.bdrL, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>ESC</kbd> para cerrar
          </div>
        )}
      </div>
    </>
  );
}

// ─── Row especializado para resultados tipo "patient" ──────────────────────────
function PatientResultRow({ r, isMobile, onNavigate, setOpen, setQuery }) {
  const [hovered, setHovered] = useState(false);

  const btnStyle = {
    background: T.bdrL,
    border: "1px solid " + T.bdr,
    borderRadius: 7,
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: 13,
    transition: "background .12s",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  };

  const close = () => { setOpen(false); setQuery(""); };

  const showActions = isMobile || hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", padding: "12px 20px",
        borderBottom: `1px solid ${T.bdrL}`,
        background: hovered ? T.bg : "transparent",
        transition: "background .12s",
        boxSizing: "border-box",
      }}
    >
      {/* Área clickeable principal → abre expediente */}
      <div
        onClick={r.action}
        style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", overflow: "hidden" }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <r.icon size={16} color={r.color} strokeWidth={1.6} />
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
        </div>
      </div>

      {/* Botones de acción — visibles en hover (desktop) o siempre (mobile) */}
      <div style={{
        display: "flex", gap: 5, flexShrink: 0,
        opacity: showActions ? 1 : 0,
        pointerEvents: showActions ? "auto" : "none",
        transition: "opacity .15s",
      }}>
        {/* Nueva sesión */}
        <button
          title="Nueva sesión"
          onClick={e => { e.stopPropagation(); onNavigate("sessions"); close(); }}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.background = T.bdr}
          onMouseLeave={e => e.currentTarget.style.background = T.bdrL}
        >
          <ClipboardList size={14} color={T.tl} strokeWidth={1.6} />
        </button>

        {/* Ver agenda */}
        <button
          title="Ver agenda"
          onClick={e => { e.stopPropagation(); onNavigate("agenda"); close(); }}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.background = T.bdr}
          onMouseLeave={e => e.currentTarget.style.background = T.bdrL}
        >
          <CalendarDays size={14} color={T.tl} strokeWidth={1.6} />
        </button>

        {/* Abrir expediente */}
        <button
          title="Abrir expediente"
          onClick={e => { e.stopPropagation(); onNavigate("patients", r.data); close(); }}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.background = T.bdr}
          onMouseLeave={e => e.currentTarget.style.background = T.bdrL}
        >
          <UserCircle size={14} color={T.tl} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
