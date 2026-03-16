import { useState, useRef, useEffect, useCallback } from "react";
import { PenLine, Trash2, Printer, Check, ChevronDown, ChevronUp } from "lucide-react";
import { T } from "../theme.js";
import { fmtDate } from "../utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// VIGENCIA
// ─────────────────────────────────────────────────────────────────────────────
export const CONSENT_VALIDITY_MONTHS = 12;

export function consentStatus(patient) {
  const c = patient?.consent;
  if (!c?.signed || !c?.signedAt) return "pending";   // sin firmar
  const signed = new Date(c.signedAt);
  const months  = (Date.now() - signed.getTime()) / (1000 * 60 * 60 * 24 * 30.5);
  if (months > CONSENT_VALIDITY_MONTHS) return "expired";  // vencido >12 meses
  if (months > CONSENT_VALIDITY_MONTHS - 1) return "expiring"; // por vencer <1 mes
  return "valid";
}

export const CONSENT_STATUS_CONFIG = {
  pending:  { label: "Pendiente de firma", color: T.war,  bg: T.warA,  icon: "⏳" },
  expiring: { label: "Por vencer",         color: T.acc,  bg: T.accA,  icon: "⚠️" },
  expired:  { label: "Vencido",            color: T.err,  bg: T.errA,  icon: "🔴" },
  valid:    { label: "Vigente",            color: T.suc,  bg: T.sucA,  icon: "✅" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECCIONES DEFAULT DEL CONSENTIMIENTO
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_CONSENT_SECTIONS = {
  naturaleza: `La psicoterapia es un proceso de tratamiento basado en la relación profesional entre el/la terapeuta y el/la paciente. A diferencia de los medicamentos, la psicoterapia requiere participación activa y puede implicar hablar sobre situaciones difíciles o incómodas. La terapia puede generar cambios positivos significativos, aunque también puede implicar trabajo emocional intenso durante el proceso.`,

  confidencialidad: `Todo lo que se comparta en sesión es estrictamente confidencial y está protegido por el secreto profesional y las leyes aplicables. Esta confidencialidad tiene límites en los siguientes casos: (1) cuando exista riesgo inminente para la vida del paciente o de terceros; (2) cuando haya indicios de abuso o negligencia hacia menores de edad; (3) cuando una autoridad judicial lo requiera mediante orden escrita. En estos casos, el/la terapeuta notificará al paciente siempre que sea posible antes de revelar información.`,

  honorarios: `Los honorarios por sesión son los acordados al inicio del tratamiento. El pago se realiza por sesión o de acuerdo al esquema convenido. Política de cancelación: las citas canceladas con menos de 24 horas de anticipación o las inasistencias sin aviso podrán ser cobradas. El/la terapeuta se compromete a notificar con anticipación cualquier cambio en los honorarios.`,

  duracion: `La frecuencia habitual de las sesiones es semanal, aunque esto puede variar según las necesidades clínicas. La duración de cada sesión es de 50 minutos. La duración total del tratamiento dependerá de los objetivos establecidos y del progreso observado, y será revisada periódicamente. El/la paciente puede solicitar la terminación del tratamiento en cualquier momento.`,

  derechos: `El/la paciente tiene derecho a: recibir información clara sobre el diagnóstico, el plan de tratamiento y los progresos; hacer preguntas en cualquier momento; obtener una segunda opinión de otro profesional; terminar el tratamiento cuando lo considere conveniente; ser tratado/a con respeto y dignidad; acceder a su expediente clínico en los términos que la ley establece.`,

  digital: `Para la gestión del expediente clínico se utiliza PsychoCore, una aplicación que almacena los datos de forma cifrada en el dispositivo del/la terapeuta, sin transmisión a servidores externos. El/la paciente consiente el uso de esta herramienta para el registro de notas clínicas, pagos y seguimiento del tratamiento, en el entendido de que sus datos están protegidos con cifrado AES-256 y no son compartidos con terceros.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS DE FIRMA
// ─────────────────────────────────────────────────────────────────────────────
function SignatureCanvas({ onSigned, onClear, hasSignature }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef({ x: 0, y: 0 });

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    drawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1A2B28";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    // Solo notificar si hay contenido real (no canvas vacío)
    const ctx   = canvas.getContext("2d");
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasInk = data.some((v, i) => i % 4 === 3 && v > 0);
    if (hasInk) onSigned(canvas.toDataURL("image/png"));
  }, [onSigned]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }, [onClear]);

  return (
    <div>
      <div style={{ position: "relative", border: `2px dashed ${hasSignature ? T.suc : T.bdr}`, borderRadius: 12, background: hasSignature ? T.sucA : T.bg, overflow: "hidden", transition: "all .2s" }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={140}
          style={{ display: "block", width: "100%", height: 140, cursor: "crosshair", touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ textAlign: "center" }}>
              <PenLine size={22} color={T.tl} strokeWidth={1.5} style={{ marginBottom: 6 }}/>
              <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>Firma aquí</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>Dibuja tu firma con el dedo o el mouse</span>
        <button onClick={clear} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 12, color: T.tm }}>
          <Trash2 size={12}/> Borrar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENT SECTION VIEWER (acordeón)
// ─────────────────────────────────────────────────────────────────────────────
const SECTION_LABELS = {
  naturaleza:       "1. Naturaleza del proceso terapéutico",
  confidencialidad: "2. Confidencialidad y sus límites",
  honorarios:       "3. Honorarios y política de cancelación",
  duracion:         "4. Duración estimada del tratamiento",
  derechos:         "5. Derechos del paciente",
  digital:          "6. Uso de herramientas digitales",
};

function ConsentSectionAccordion({ sections, onEdit, readOnly = false }) {
  const [openKey, setOpenKey] = useState(null);

  return (
    <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, overflow: "hidden" }}>
      {Object.entries(SECTION_LABELS).map(([key, label], idx) => {
        const isOpen = openKey === key;
        const text   = sections[key] || DEFAULT_CONSENT_SECTIONS[key];
        return (
          <div key={key} style={{ borderBottom: idx < Object.keys(SECTION_LABELS).length - 1 ? `1px solid ${T.bdrL}` : "none" }}>
            <button
              onClick={() => setOpenKey(isOpen ? null : key)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 16px", background: isOpen ? T.pA : T.card, border: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 13, fontWeight: isOpen ? 600 : 400, color: isOpen ? T.p : T.t, transition: "background .15s", textAlign: "left", gap: 8 }}
            >
              <span>{label}</span>
              {isOpen ? <ChevronUp size={14} color={T.tm}/> : <ChevronDown size={14} color={T.tl}/>}
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                {readOnly ? (
                  <p style={{ fontFamily: T.fB, fontSize: 13, color: T.t, lineHeight: 1.75, margin: 0 }}>{text}</p>
                ) : (
                  <textarea
                    value={text}
                    onChange={e => onEdit(key, e.target.value)}
                    rows={5}
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.bg, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function printConsentPDF({ patient, consent, profile }) {
  const w      = window.open("", "_blank");
  const today  = new Date(consent.signedAt).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time   = new Date(consent.signedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const secs   = consent.sections || {};

  const sectionHTML = Object.entries(SECTION_LABELS).map(([key, label]) => {
    const text = secs[key] || DEFAULT_CONSENT_SECTIONS[key];
    return `
    <div class="section">
      <div class="section-title">${label}</div>
      <p>${text}</p>
    </div>`;
  }).join("");

  const signatureBlock = consent.signatureDataUrl
    ? `<div class="sig-box">
        <img src="${consent.signatureDataUrl}" style="max-width:280px;max-height:80px;display:block;margin-bottom:6px" alt="Firma del paciente"/>
        <div class="sig-line"></div>
        <div class="sig-name">${consent.signedBy === "guardian" && consent.guardianName ? consent.guardianName : patient.name}</div>
        ${consent.signedBy === "guardian" && consent.guardianName ? `<div class="sig-role">Tutor/a legal de: ${patient.name}</div>` : ""}
        <div class="sig-meta">Firmado digitalmente el ${today} a las ${time}</div>
      </div>`
    : `<div class="sig-box">
        <div style="width:280px;border-top:1px solid #1A2B28;padding-top:8px;margin-top:56px">
          <div class="sig-name">${patient.name}</div>
          <div class="sig-meta">${today}</div>
        </div>
      </div>`;

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Consentimiento Informado — ${patient.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.7}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:3px}
.org p{font-size:12px;color:#5A7270;margin-top:2px}
.doc-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#3A6B6E;margin-bottom:8px}
.patient-block{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:#F9F8F5;padding:14px 18px;border-radius:10px;margin-bottom:28px}
.patient-block label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;margin-bottom:2px}
.patient-block p{font-size:13px;font-weight:500}
.section{margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #EDF1F0}
.section:last-of-type{border-bottom:none}
.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#3A6B6E;margin-bottom:8px}
.section p{color:#1A2B28;line-height:1.75}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:40px;padding-top:24px;border-top:2px solid #D8E2E0}
.sig-box{}
.sig-line{border-top:1px solid #1A2B28;margin-top:56px;margin-bottom:6px}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:500}
.sig-role{font-size:11px;color:#5A7270;margin-top:2px}
.sig-meta{font-size:11px;color:#9BAFAD;margin-top:3px}
.validity-badge{display:inline-block;padding:4px 14px;border-radius:9999px;background:rgba(78,139,95,0.1);color:#4E8B5F;font-size:11px;font-weight:700;margin-bottom:20px;letter-spacing:.04em}
footer{margin-top:40px;padding-top:14px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0;max-width:none}@page{margin:18mm}}
</style></head><body>

<div class="letterhead">
  <div class="org">
    <h1>${profile?.clinic || "Consultorio Psicológico"}</h1>
    <p>${profile?.name || ""}${profile?.specialty ? " · " + profile.specialty : ""}</p>
    ${profile?.cedula ? `<p>Cédula profesional: ${profile.cedula}</p>` : ""}
  </div>
  <div style="text-align:right;font-size:12px;color:#5A7270">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;margin-bottom:3px">Fecha de emisión</div>
    <div style="font-size:13px;font-weight:500;color:#1A2B28">${today}</div>
  </div>
</div>

<div class="doc-title">Consentimiento Informado para Psicoterapia</div>
<div class="validity-badge">✓ Vigente por ${CONSENT_VALIDITY_MONTHS} meses · Versión ${consent.version || 1}</div>

<div class="patient-block">
  <div><label>Paciente</label><p>${patient.name}</p></div>
  <div><label>Edad</label><p>${patient.age ? patient.age + " años" : "—"}</p></div>
  ${patient.diagnosis ? `<div><label>Diagnóstico</label><p>${patient.cie11Code ? patient.cie11Code + " · " : ""}${patient.diagnosis}</p></div>` : "<div></div>"}
</div>

<p style="margin-bottom:20px;color:#5A7270;font-size:13px">Yo, <strong style="color:#1A2B28">${consent.signedBy === "guardian" && consent.guardianName ? consent.guardianName + " en calidad de tutor/a legal de " + patient.name : patient.name}</strong>, habiendo leído y comprendido la información contenida en este documento, otorgo mi consentimiento informado para recibir servicios de psicoterapia bajo las siguientes condiciones:</p>

${sectionHTML}

<div class="sig-area">
  ${signatureBlock}
  <div>
    <div style="width:280px;border-top:1px solid #1A2B28;padding-top:8px;margin-top:56px">
      <div class="sig-name">${profile?.name || "Psicólogo/a"}</div>
      <div class="sig-role">${profile?.specialty || "Psicólogo/a Clínico/a"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
      <div class="sig-meta">${today}</div>
    </div>
  </div>
</div>

<footer>
  <span>PsychoCore · Consentimiento Informado</span>
  <span>Documento confidencial · ${patient.name}</span>
</footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — ConsentBlock (se embebe en el perfil del paciente)
// ─────────────────────────────────────────────────────────────────────────────
export default function ConsentBlock({ patient, onUpdate, profile }) {
  const consent  = patient?.consent || {};
  const status   = consentStatus(patient);
  const cfg      = CONSENT_STATUS_CONFIG[status];
  const [mode, setMode] = useState("view"); // "view" | "sign" | "edit"

  // firma temporal (antes de confirmar)
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [signedBy,   setSignedBy]   = useState("patient");
  const [guardian,   setGuardian]   = useState("");
  const [sections,   setSections]   = useState(consent.sections || {});

  // Al abrir mode=sign, resetear estado temporal
  useEffect(() => {
    if (mode === "sign") {
      setSigDataUrl(null);
      setSignedBy("patient");
      setGuardian("");
      setSections(consent.sections || {});
    }
  }, [mode]);

  const saveSignature = () => {
    const newConsent = {
      signed:          true,
      signedAt:        new Date().toISOString(),
      signedBy,
      guardianName:    signedBy === "guardian" ? guardian : "",
      version:         (consent.version || 0) + 1,
      signatureDataUrl: sigDataUrl,
      sections:        { ...DEFAULT_CONSENT_SECTIONS, ...sections },
    };
    onUpdate(newConsent);
    setMode("view");
  };

  const saveSections = () => {
    onUpdate({ ...consent, sections: { ...DEFAULT_CONSENT_SECTIONS, ...sections } });
    setMode("view");
  };

  const revokeConsent = () => {
    onUpdate({ ...consent, signed: false, signedAt: null, signatureDataUrl: null });
    setMode("view");
  };

  // ── VIEW MODE ─────────────────────────────────────────────────────────────
  if (mode === "view") {
    return (
      <div style={{ padding: "12px 14px", background: cfg.bg, borderRadius: 10, marginBottom: 10, border: `1.5px solid ${cfg.color}30` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: consent.signed ? 8 : 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
              Consentimiento informado
            </div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: cfg.color, fontWeight: 600 }}>
              {cfg.icon} {cfg.label}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
            {consent.signed && (
              <button onClick={() => printConsentPDF({ patient, consent, profile })}
                title="Imprimir PDF"
                style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: T.tm }}>
                <Printer size={12}/>
              </button>
            )}
            <button onClick={() => setMode("edit")}
              title="Editar secciones"
              style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: T.tm }}>
              <ChevronDown size={12}/>
            </button>
            <button
              onClick={() => setMode("sign")}
              style={{ background: cfg.color, border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: "#fff", fontFamily: T.fB, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <PenLine size={11}/>{consent.signed ? "Renovar" : "Firmar"}
            </button>
          </div>
        </div>

        {consent.signed && consent.signedAt && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>
              Firmado el {new Date(consent.signedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              {" a las "}
              {new Date(consent.signedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              {consent.signedBy === "guardian" && consent.guardianName && (
                <span style={{ color: T.tl }}> · Tutor: {consent.guardianName}</span>
              )}
              {" · "}
              <span style={{ fontWeight: 600 }}>v{consent.version || 1}</span>
            </div>
            {(status === "expired" || status === "expiring") && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: status === "expired" ? T.errA : T.warA, borderRadius: 7, fontFamily: T.fB, fontSize: 11, color: status === "expired" ? T.err : T.war, fontWeight: 600 }}>
                {status === "expired" ? "⚠ Renovación requerida — más de 12 meses desde la última firma" : "⚠ Renovar próximamente — vence en menos de 1 mes"}
              </div>
            )}
            {consent.signatureDataUrl && (
              <div style={{ marginTop: 8 }}>
                <img src={consent.signatureDataUrl} alt="Firma" style={{ maxHeight: 40, maxWidth: 160, opacity: 0.7, display: "block" }}/>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── EDIT MODE (secciones sin refirmar) ────────────────────────────────────
  if (mode === "edit") {
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1.5px solid ${T.bdr}`, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: T.pA, borderBottom: `1px solid ${T.bdrL}` }}>
          <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.p, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Editar secciones del consentimiento
          </span>
          <button onClick={() => setMode("view")} style={{ background: "none", border: "none", cursor: "pointer", color: T.tm, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 12, padding: "8px 12px", background: T.warA, borderRadius: 8, border: `1px solid ${T.war}30` }}>
            <strong style={{ color: T.war }}>Nota:</strong> Editar el texto no requiere nueva firma, pero si realizas cambios sustanciales se recomienda obtener una nueva firma del paciente.
          </div>
          <ConsentSectionAccordion
            sections={{ ...DEFAULT_CONSENT_SECTIONS, ...(consent.sections || {}), ...sections }}
            onEdit={(key, val) => setSections(prev => ({ ...prev, [key]: val }))}
            readOnly={false}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => setMode("view")} style={{ padding: "8px 16px", background: T.bdrL, border: "none", borderRadius: 9999, fontFamily: T.fB, fontSize: 13, color: T.tm, cursor: "pointer" }}>Cancelar</button>
            <button onClick={saveSections} style={{ padding: "8px 16px", background: T.p, border: "none", borderRadius: 9999, fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <Check size={13}/> Guardar cambios
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SIGN MODE ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1.5px solid ${T.p}`, overflow: "hidden", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: T.pA, borderBottom: `1px solid ${T.bdrL}` }}>
        <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.p, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          <PenLine size={12} style={{ display: "inline", marginRight: 5 }}/>
          Obtener firma de consentimiento
        </span>
        <button onClick={() => setMode("view")} style={{ background: "none", border: "none", cursor: "pointer", color: T.tm, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Secciones para revisión */}
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 10 }}>
          El paciente debe revisar las siguientes secciones antes de firmar:
        </div>
        <ConsentSectionAccordion
          sections={{ ...DEFAULT_CONSENT_SECTIONS, ...(consent.sections || {}), ...sections }}
          onEdit={(key, val) => setSections(prev => ({ ...prev, [key]: val }))}
          readOnly={false}
        />

        {/* Firmante */}
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>¿Quién firma?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "patient",  l: "Paciente" },
              { v: "guardian", l: "Tutor/a legal" },
            ].map(({ v, l }) => {
              const on = signedBy === v;
              return (
                <button key={v} onClick={() => setSignedBy(v)}
                  style={{ flex: 1, padding: "9px 12px", border: `2px solid ${on ? T.p : T.bdr}`, borderRadius: 10, background: on ? T.pA : "transparent", fontFamily: T.fB, fontSize: 13, fontWeight: on ? 700 : 400, color: on ? T.p : T.tm, cursor: "pointer", transition: "all .15s" }}>
                  {l}
                </button>
              );
            })}
          </div>
          {signedBy === "guardian" && (
            <input
              value={guardian}
              onChange={e => setGuardian(e.target.value)}
              placeholder="Nombre completo del tutor/a legal..."
              style={{ marginTop: 8, width: "100%", padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.bg, outline: "none", boxSizing: "border-box" }}
            />
          )}
        </div>

        {/* Canvas de firma */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Firma digital
          </div>
          <SignatureCanvas
            onSigned={setSigDataUrl}
            onClear={() => setSigDataUrl(null)}
            hasSignature={!!sigDataUrl}
          />
        </div>

        {/* Confirmación */}
        <div style={{ padding: "10px 14px", background: T.pA, borderRadius: 10, marginBottom: 16, fontFamily: T.fB, fontSize: 12, color: T.p, lineHeight: 1.6 }}>
          Al firmar, <strong>{signedBy === "guardian" && guardian ? guardian : patient.name}</strong> declara haber leído y comprendido el contenido de este consentimiento informado y acepta sus términos.
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMode("view")} style={{ padding: "9px 16px", background: T.bdrL, border: "none", borderRadius: 9999, fontFamily: T.fB, fontSize: 13, color: T.tm, cursor: "pointer" }}>Cancelar</button>
            {consent.signed && (
              <button onClick={revokeConsent} style={{ padding: "9px 16px", background: T.errA, border: "none", borderRadius: 9999, fontFamily: T.fB, fontSize: 12, color: T.err, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Trash2 size={12}/> Revocar
              </button>
            )}
          </div>
          <button
            onClick={saveSignature}
            disabled={!sigDataUrl || (signedBy === "guardian" && !guardian.trim())}
            style={{ padding: "9px 20px", background: sigDataUrl && (signedBy !== "guardian" || guardian.trim()) ? T.suc : T.bdr, border: "none", borderRadius: 9999, fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: sigDataUrl ? "#fff" : T.tl, cursor: sigDataUrl ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 5, transition: "all .2s" }}>
            <Check size={14}/> Confirmar firma
          </button>
        </div>
      </div>
    </div>
  );
}
