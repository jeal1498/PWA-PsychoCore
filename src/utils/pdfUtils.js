/**
 * pdfUtils.js — Automatización Documental PsychoCore
 * Etapa 4: Generación de documentos clínicos formales
 * Cumplimiento: NOM-004-SSA3 (expediente clínico)
 *
 * Exports:
 *   printNotaEvolucion(session, patient, profile, riskAssessments, sessionNumber, noteFormats)
 *   printConsentimientoInformado(patient, profile)
 *   printPlanSeguridad(safetyPlan, patient, profile, riskLevel)
 *   printReferralLetter(patient, session, profile, formData)
 */

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (CSS vars no funcionan en ventanas print; valores hardcoded)
// Corresponden al "clinical zen" palette de PsychoCore
// ─────────────────────────────────────────────────────────────────────────────
const CLR = {
  primary:      "#3A6B6E",
  primaryLight: "rgba(58,107,110,0.08)",
  accent:       "#C4895A",
  accentLight:  "rgba(196,137,90,0.10)",
  text:         "#1A2B28",
  textMid:      "#5A7270",
  textLight:    "#9BAFAD",
  border:       "#D8E2E0",
  borderLight:  "#EDF1F0",
  card:         "#F9F8F5",
  white:        "#FFFFFF",
  error:        "#B85050",
  errorLight:   "rgba(184,80,80,0.07)",
  warn:         "#B8900A",
  warnLight:    "rgba(184,144,10,0.08)",
  success:      "#4E8B5F",
  successLight: "rgba(78,139,95,0.09)",
};

// Colores por nivel de riesgo
const RISK_CLR = {
  alto:      "#C4622A",
  moderado:  "#B8900A",
  bajo:      "#4E8B5F",
  inminente: "#B85050",
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOGRAFÍA COMPARTIDA (inyectada en cada doc)
// ─────────────────────────────────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: abrir ventana e imprimir con delay
// ─────────────────────────────────────────────────────────────────────────────
function openAndPrint(html, title = "PsychoCore") {
  const w = window.open("", "_blank");
  if (!w) { alert("El navegador bloqueó la ventana emergente. Permite pop-ups para esta página."); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${title}</title>${html}</head>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: pie de página con datos del profesional (NOM-004 obligatorio)
// ─────────────────────────────────────────────────────────────────────────────
function buildFooterHTML(profile, folio = null, pageLabel = "") {
  const right = [
    folio      ? `Folio: ${folio}` : null,
    pageLabel  || null,
    "PsychoCore · Documento Confidencial",
  ].filter(Boolean).join(" · ");
  return `
    <div class="pc-footer">
      <span>${profileIdLine(profile)}</span>
      <span>${right}</span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: encabezado institucional compartido
// ─────────────────────────────────────────────────────────────────────────────
function buildHeaderHTML(profile, docTitle, docSubtitle = "", badgeHTML = "") {
  const subtitle = docSubtitle || todayLong();
  return `
    <header class="pc-header">
      <div class="pc-header-left">
        <div class="pc-header-clinic">${profile?.clinic || "Consultorio Psicológico"}</div>
        <h1 class="pc-header-title">${docTitle}</h1>
        <p class="pc-header-sub" style="text-transform:capitalize">${subtitle}</p>
      </div>
      <div class="pc-header-right">
        ${badgeHTML}
        ${profile?.name   ? `<div style="font-size:13px;font-weight:600;color:${CLR.text};margin-bottom:3px">${profile.name}</div>` : ""}
        ${profile?.cedula ? `<div class="pc-cedula">Cédula Prof. ${profile.cedula}</div>` : ""}
        ${profile?.specialty ? `<div class="pc-cedula">${profile.specialty}</div>` : ""}
      </div>
    </header>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS BASE compartidos por todos los documentos
// ─────────────────────────────────────────────────────────────────────────────
function baseStyles(extraCSS = "") {
  return `
<style>
${FONT_IMPORT}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: 'DM Sans', system-ui, sans-serif;
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 48px;
  color: ${CLR.text};
  font-size: 13.5px;
  line-height: 1.65;
  background: #fff;
}

/* ── Header institucional ── */
.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 3px solid ${CLR.primary};
  padding-bottom: 20px;
  margin-bottom: 32px;
  gap: 20px;
}
.pc-header-clinic {
  font-size: 11px;
  font-weight: 700;
  color: ${CLR.textLight};
  text-transform: uppercase;
  letter-spacing: 0.09em;
  margin-bottom: 6px;
}
.pc-header-title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 30px;
  font-weight: 600;
  color: ${CLR.primary};
  line-height: 1.15;
  margin-bottom: 5px;
}
.pc-header-sub {
  font-size: 12px;
  color: ${CLR.textMid};
  text-transform: capitalize;
}
.pc-header-right {
  text-align: right;
  flex-shrink: 0;
}
.pc-cedula {
  font-size: 11px;
  color: ${CLR.textLight};
  margin-top: 6px;
  white-space: nowrap;
}

/* ── Grid de datos del paciente ── */
.pc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}
.pc-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}
.pc-field label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${CLR.textLight};
  margin-bottom: 4px;
}
.pc-field p {
  font-size: 14px;
  font-weight: 500;
  color: ${CLR.text};
  line-height: 1.4;
}

/* ── Separador de sección ── */
.pc-section {
  margin-bottom: 24px;
}
.pc-section-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${CLR.textLight};
  margin-bottom: 10px;
  padding-bottom: 7px;
  border-bottom: 1px solid ${CLR.borderLight};
}
.pc-section-body {
  background: ${CLR.card};
  padding: 16px 20px;
  border-radius: 10px;
  border-left: 4px solid ${CLR.primary};
  font-size: 13.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  min-height: 36px;
  color: ${CLR.text};
}

/* ── Badges ── */
.pc-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.pc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 22px;
}

/* ── Pie de página ── */
.pc-footer {
  margin-top: 48px;
  padding-top: 14px;
  border-top: 1px solid ${CLR.border};
  font-size: 10.5px;
  color: ${CLR.textLight};
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

/* ── Firma ── */
.pc-sig-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  margin-top: 48px;
}
.pc-sig-line {
  border-top: 1px solid ${CLR.text};
  padding-top: 8px;
  margin-top: 52px;
}
.pc-sig-name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 16px;
  font-weight: 500;
  color: ${CLR.text};
}
.pc-sig-detail {
  font-size: 11px;
  color: ${CLR.textMid};
  margin-top: 2px;
}

/* ── Watermark / NOM disclaimer ── */
.pc-nom {
  font-size: 10px;
  color: ${CLR.textLight};
  padding: 8px 14px;
  background: ${CLR.card};
  border-radius: 6px;
  border: 1px solid ${CLR.borderLight};
  margin-bottom: 28px;
  text-align: center;
}

/* ── Alerta de riesgo ── */
.pc-risk-banner {
  padding: 16px 20px;
  border-radius: 10px;
  margin: 20px 0;
  border-width: 2px;
  border-style: solid;
  page-break-inside: avoid;
}
.pc-risk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-bottom: 10px;
}
.pc-risk-table td { padding: 5px 0; }
.pc-risk-table td:first-child { color: ${CLR.textMid}; width: 46%; }
.pc-risk-table td:last-child { font-weight: 600; text-transform: capitalize; }

/* ── Tabla de consentimiento ── */
.pc-consent-box {
  background: ${CLR.card};
  border-radius: 10px;
  padding: 18px 22px;
  margin-bottom: 20px;
  border-left: 4px solid ${CLR.primary};
  font-size: 13px;
  line-height: 1.8;
}
.pc-consent-clause {
  margin-bottom: 16px;
}
.pc-consent-clause strong {
  color: ${CLR.primary};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  display: block;
  margin-bottom: 5px;
}

/* ── Contactos de emergencia ── */
.pc-contacts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 14px;
}
.pc-contact-card {
  background: ${CLR.card};
  border-radius: 10px;
  padding: 14px 16px;
  border-left: 4px solid ${CLR.primary};
}
.pc-contact-card.urgency { border-left-color: ${CLR.error}; }
.pc-contact-card label {
  font-size: 10px;
  font-weight: 700;
  color: ${CLR.textLight};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
  margin-bottom: 6px;
}
.pc-contact-card strong {
  font-size: 15px;
  display: block;
  margin-bottom: 3px;
  color: ${CLR.text};
}
.pc-contact-card span { font-size: 12px; color: ${CLR.textMid}; }

@media print {
  body { margin: 0; padding: 24px 32px; }
  .no-print { display: none !important; }
}
${extraCSS}
</style>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE FECHA — evitan desfases de timezone con el formato ISO "YYYY-MM-DD"
// ─────────────────────────────────────────────────────────────────────────────

/** "2026-03-23" → "23 de marzo de 2026" */
function fmtDateStr(dateStr) {
  if (!dateStr) return "—";
  try {
    const parts = String(dateStr).split("-").map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return String(dateStr);
    const [y, m, d] = parts;
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return String(dateStr); }
}

/** Hoy largo: "lunes, 23 de marzo de 2026" */
function todayLong() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/** Hoy corto: "23 de marzo de 2026" */
function todayShort() {
  return new Date().toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Línea de identificación profesional (NOM-004-SSA3 §4.1 obligatorio)
// Incluye: nombre, especialidad, cédula profesional, cédula de especialidad,
// institución/consultorio. Se usa en encabezado y pie de todos los documentos.
// ─────────────────────────────────────────────────────────────────────────────
function profileIdLine(profile) {
  return [
    profile?.name      || "Psicólogo/a Clínico/a",
    profile?.specialty || null,
    profile?.cedula    ? `Céd. Prof. ${profile.cedula}`   : null,
    profile?.cedulaEsp ? `Céd. Esp. ${profile.cedulaEsp}` : null,
    profile?.clinic    || null,
    profile?.phone     ? `Tel. ${profile.phone}`          : null,
  ].filter(Boolean).join(" · ");
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTA DE EVOLUCIÓN CLÍNICA
// Cumplimiento NOM-004-SSA3 §4.2: identificación, padecimiento actual,
// diagnóstico, plan terapéutico, notas de evolución.
// ─────────────────────────────────────────────────────────────────────────────
export function printNotaEvolucion(session, patient, profile, riskAssessments = [], sessionNumber = null, noteFormats = null) {

  // ── Formato de nota (SOAP / DAP / BIRP / libre) ───────────────────────────
  const fd = noteFormats
    ? (noteFormats[session.noteFormat] || noteFormats.libre)
    : { id: "libre", label: "Libre", color: CLR.textMid, bg: CLR.card, fields: null };

  // ── Folio ─────────────────────────────────────────────────────────────────
  const folio = sessionNumber ? `S-${String(sessionNumber).padStart(4, "0")}` : null;

  // ── Sección estructurada de notas ─────────────────────────────────────────
  let structuredHTML = "";
  if (fd.fields && session.structured) {
    structuredHTML = fd.fields
      .filter(f => session.structured[f.key]?.trim())
      .map(f => `
        <div class="pc-section">
          <div class="pc-section-label" style="color:${fd.color}">${f.label}</div>
          <div class="pc-section-body" style="border-left-color:${fd.color}">${session.structured[f.key]}</div>
        </div>`)
      .join("");
  } else {
    structuredHTML = `
      <div class="pc-section">
        <div class="pc-section-label">Notas clínicas</div>
        <div class="pc-section-body">${session.notes || "Sin notas registradas."}</div>
      </div>`;
  }

  // ── Badge del formato ─────────────────────────────────────────────────────
  const fmtBadgeHTML = fd.id !== "libre"
    ? `<span class="pc-badge" style="background:${fd.bg};color:${fd.color};border:1.5px solid ${fd.color}30">${fd.label}</span>`
    : "";

  // ── Sección de riesgo (obligatoria si hubo indicadores) ───────────────────
  // PRIVACIDAD: las notas privadas NUNCA se incluyen en documentos exportables.
  const sessionRisk = riskAssessments.find(ra => ra.sessionId === session.id);
  const hasCrisisIndicators = sessionRisk && (
    sessionRisk.suicidalIdeation === "activa" ||
    sessionRisk.suicidalIdeation === "pasiva" ||
    sessionRisk.selfHarm === "activa" ||
    sessionRisk.harmToOthers
  );
  const riskClr  = RISK_CLR[sessionRisk?.riskLevel] || CLR.warn;
  const riskHTML = hasCrisisIndicators ? `
    <div class="pc-risk-banner" style="background:${CLR.errorLight};border-color:${riskClr}40">
      <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:${riskClr};margin-bottom:12px">
        ⚠️ Evaluación de Riesgo — Sección Obligatoria (NOM-004-SSA3)
      </div>
      <span class="pc-badge" style="background:${riskClr}18;color:${riskClr};border:1.5px solid ${riskClr}44;margin-bottom:14px">
        Riesgo ${(sessionRisk.riskLevel || "—").toUpperCase()}
      </span>
      <table class="pc-risk-table" style="margin-top:12px">
        <tr><td>Ideación suicida</td><td>${sessionRisk.suicidalIdeation || "Ninguna"}</td></tr>
        <tr><td>Autolesiones</td><td>${sessionRisk.selfHarm || "Ninguna"}</td></tr>
        <tr><td>Riesgo a terceros</td><td>${sessionRisk.harmToOthers ? "Sí" : "No"}</td></tr>
        ${sessionRisk.clinicalNotes
          ? `<tr><td style="vertical-align:top">Notas de riesgo</td><td style="font-size:12.5px;line-height:1.6">${sessionRisk.clinicalNotes}</td></tr>`
          : ""}
      </table>
      <div style="font-size:10.5px;color:${CLR.textLight};border-top:1px solid ${CLR.borderLight};padding-top:9px;margin-top:12px">
        Plan de seguridad: ${sessionRisk.safetyPlan?.warningSignals ? "✓ Elaborado en esta sesión" : "⚠ Pendiente de elaborar"} ·
        Las Notas de Supervisión Privadas NO están incluidas en este documento.
      </div>
    </div>` : "";

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagsHTML = (session.tags || []).length
    ? `<div class="pc-tags">${(session.tags).map(t =>
        `<span class="pc-badge" style="background:${CLR.accentLight};color:${CLR.accent};border:1px solid ${CLR.accent}30">${t}</span>`
      ).join("")}</div>`
    : "";

  // ── Diagnóstico (del expediente del paciente) ──────────────────────────────
  const dxHTML = patient?.diagnosis
    ? `<div class="pc-field"><label>Diagnóstico presuntivo</label><p>${patient.diagnosis}${patient.cie11Code ? ` (${patient.cie11Code})` : ""}</p></div>`
    : "";

  // ── Folio HTML ────────────────────────────────────────────────────────────
  const folioHTML = folio
    ? `<div class="pc-field"><label>Folio de sesión</label><p style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:${CLR.primary}">${folio}</p></div>`
    : "";

  const html = `
${baseStyles()}
<body>
  ${buildHeaderHTML(profile, "Nota de Evolución Clínica", todayLong(), fmtBadgeHTML)}
  <div class="pc-nom">NOM-004-SSA3-2012 · Del expediente clínico · Documento confidencial generado por PsychoCore</div>
  <div class="pc-grid">
    ${folioHTML}
    <div class="pc-field"><label>Paciente</label><p>${session.patientName || patient?.name || "—"}</p></div>
    <div class="pc-field"><label>Fecha</label><p>${fmtDateStr(session.date)}</p></div>
    <div class="pc-field"><label>Duración</label><p>${session.duration || "—"} minutos</p></div>
    <div class="pc-field"><label>Estado de ánimo</label><p style="text-transform:capitalize">${session.mood || "—"}</p></div>
    <div class="pc-field"><label>Progreso terapéutico</label><p style="text-transform:capitalize">${session.progress || "—"}</p></div>
    ${dxHTML}
    ${patient?.age ? `<div class="pc-field"><label>Edad</label><p>${patient.age} años</p></div>` : ""}
  </div>
  ${structuredHTML}
  ${riskHTML}
  ${tagsHTML}
  ${buildFooterHTML(profile, folio, "Notas de supervisión privadas excluidas · Documento confidencial")}
</body>`;

  openAndPrint(html, `Nota Evolución — ${session.patientName || patient?.name}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENTIMIENTO INFORMADO
// Cumplimiento NOM-004-SSA3 §5: carta de consentimiento bajo información.
// Se pre-llena con los datos del paciente para agilizar la primera sesión.
// ─────────────────────────────────────────────────────────────────────────────
export function printConsentimientoInformado(patient, profile) {
  const today = todayShort();
  const therapistTitle = profile?.specialty || "Psicólogo/a Clínico/a";
  const clinicName     = profile?.clinic    || "Consultorio Psicológico";

  const html = `
${baseStyles(`
.ci-clause strong { color: ${CLR.primary}; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; display: block; margin-bottom: 5px; }
.ci-check-line { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; font-size: 13px; line-height: 1.65; }
.ci-check-box { width: 16px; height: 16px; border: 1.5px solid ${CLR.border}; border-radius: 4px; flex-shrink: 0; margin-top: 3px; }
`)}
<body>
  ${buildHeaderHTML(profile, "Carta de Consentimiento Informado", `Elaborado en: ${clinicName}`, "")}
  <div class="pc-nom">Documento requerido por NOM-004-SSA3-2012 §5 · Consentimiento bajo información · PsychoCore</div>

  <div class="pc-grid-2" style="margin-bottom:24px">
    <div class="pc-field"><label>Nombre del paciente</label>
      <p style="border-bottom:1px solid ${CLR.border};padding-bottom:3px;min-height:22px">${patient?.name || ""}</p></div>
    <div class="pc-field"><label>Fecha de nacimiento / Edad</label>
      <p style="border-bottom:1px solid ${CLR.border};padding-bottom:3px;min-height:22px">${patient?.birthDate || ""}${patient?.age ? ` · ${patient.age} años` : ""}</p></div>
    <div class="pc-field"><label>Responsable / Tutor (menores de edad)</label>
      <p style="border-bottom:1px solid ${CLR.border};padding-bottom:3px;min-height:22px"></p></div>
    <div class="pc-field"><label>Fecha del documento</label>
      <p style="font-weight:600">${today}</p></div>
  </div>

  <div class="pc-section">
    <div class="pc-section-label">Profesional responsable del tratamiento</div>
    <div class="pc-consent-box">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div><label style="font-size:10px;font-weight:700;color:${CLR.textLight};text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Nombre</label>
          <p style="font-size:14px;font-weight:500">${profile?.name || "—"}</p></div>
        <div><label style="font-size:10px;font-weight:700;color:${CLR.textLight};text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Cédula Profesional</label>
          <p style="font-size:14px;font-weight:600;color:${CLR.primary}">${profile?.cedula || "—"}</p></div>
        <div><label style="font-size:10px;font-weight:700;color:${CLR.textLight};text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Especialidad</label>
          <p style="font-size:14px">${therapistTitle}</p></div>
        <div><label style="font-size:10px;font-weight:700;color:${CLR.textLight};text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:4px">Consultorio</label>
          <p style="font-size:14px">${clinicName}</p></div>
      </div>
    </div>
  </div>

  <div class="pc-section">
    <div class="pc-section-label">Propósito del tratamiento y naturaleza de los servicios</div>
    <div class="pc-consent-box">
      <div class="ci-clause">
        <strong>1. Naturaleza del servicio</strong>
        Recibiré atención psicológica/neuropsicológica profesional que puede incluir evaluación diagnóstica, psicoterapia individual, de pareja o grupal, orientación psicológica, o una combinación de estas. El/la ${therapistTitle} utilizará métodos y técnicas basados en evidencia científica.
      </div>
      <div class="ci-clause">
        <strong>2. Objetivos del tratamiento</strong>
        Los objetivos específicos serán acordados conjuntamente entre el profesional y yo (y/o mi representante legal), podrán modificarse según el avance y serán revisados periódicamente durante las sesiones.
      </div>
      <div class="ci-clause">
        <strong>3. Frecuencia y duración de las sesiones</strong>
        Cada sesión tiene una duración aproximada de 50 minutos. La frecuencia será acordada de manera individual. El tratamiento puede extenderse desde algunas semanas hasta meses o años, dependiendo del caso y los objetivos.
      </div>
      <div class="ci-clause">
        <strong>4. Honorarios y política de cancelación</strong>
        Los honorarios pactados serán cubiertos en la forma y periodicidad acordadas. En caso de no poder asistir, se notificará con al menos 24 horas de anticipación para evitar el cobro de la sesión.
      </div>
    </div>
  </div>

  <div class="pc-section">
    <div class="pc-section-label">Confidencialidad y sus límites (NOM-004-SSA3 §4.3 y Código Ético del Psicólogo)</div>
    <div class="pc-consent-box">
      <div class="ci-clause">
        <strong>5. Confidencialidad</strong>
        Toda la información compartida durante las sesiones es estrictamente confidencial y no será divulgada a terceros sin mi consentimiento escrito, salvo en las siguientes excepciones contempladas por la ley y la ética profesional:
      </div>
      <div class="ci-check-line"><div class="ci-check-box"></div><span>Cuando exista riesgo inminente de que yo me cause daño grave a mí mismo/a o a otras personas.</span></div>
      <div class="ci-check-line"><div class="ci-check-box"></div><span>Cuando existan indicios de abuso, maltrato o negligencia hacia menores de edad o personas en situación de vulnerabilidad.</span></div>
      <div class="ci-check-line"><div class="ci-check-box"></div><span>Cuando sea requerido por orden judicial o mandato legal.</span></div>
      <div class="ci-check-line" style="margin-top:8px"><div class="ci-check-box"></div><span>Autorizo que mis datos de salud sean utilizados para fines de supervisión clínica o educación, siempre en forma anonimizada.</span></div>
    </div>
  </div>

  <div class="pc-section">
    <div class="pc-section-label">Derechos del paciente</div>
    <div class="pc-consent-box">
      <div class="ci-check-line"><div class="ci-check-box"></div><span>Tengo derecho a recibir información clara sobre mi diagnóstico, tratamiento, pronóstico y opciones terapéuticas.</span></div>
      <div class="ci-check-line"><div class="ci-check-box"></div><span>Puedo revocar este consentimiento y concluir el tratamiento en el momento que lo decida, sin perjuicio de los servicios ya prestados.</span></div>
      <div class="ci-check-line"><div class="ci-check-box"></div><span>En caso de ser derivado/a a otro especialista, seré informado/a con anticipación.</span></div>
      <div class="ci-check-line"><div class="ci-check-box"></div><span>Tengo derecho a acceder a mi expediente clínico conforme a lo establecido en la Ley General de Salud y la NOM-004-SSA3-2012.</span></div>
    </div>
  </div>

  <div class="pc-section-label" style="margin-top:8px">Declaración de consentimiento</div>
  <div class="pc-consent-box" style="margin-bottom:0">
    He leído o se me ha explicado el contenido de este documento. Comprendo su alcance y doy mi consentimiento libre, voluntario e informado para recibir el tratamiento psicológico/neuropsicológico descrito. Acepto las condiciones de confidencialidad y el ejercicio de mis derechos como paciente.
  </div>

  <div class="pc-sig-grid" style="margin-top:40px">
    <div>
      <div class="pc-sig-line">
        <p class="pc-sig-name">${patient?.name || "Nombre del paciente"}</p>
        <p class="pc-sig-detail">Paciente / Representante legal</p>
        ${patient?.curp ? `<p class="pc-sig-detail">CURP: ${patient.curp}</p>` : ""}
      </div>
    </div>
    <div>
      <div class="pc-sig-line">
        <p class="pc-sig-name">${profile?.name || "Nombre del profesional"}</p>
        <p class="pc-sig-detail">${therapistTitle}</p>
        ${profile?.cedula ? `<p class="pc-sig-detail">Cédula Profesional: ${profile.cedula}</p>` : ""}
      </div>
    </div>
  </div>

  ${buildFooterHTML(profile, null, "Consentimiento Informado · NOM-004-SSA3-2012")}
</body>`;

  openAndPrint(html, `Consentimiento Informado — ${patient?.name || "Paciente"}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DE SEGURIDAD PERSONAL
// Solo se genera cuando hubo indicadores de riesgo en la evaluación.
// Documento para entregar al paciente antes de que salga de sesión.
// ─────────────────────────────────────────────────────────────────────────────
export function printPlanSeguridad(safetyPlan, patient, profile, riskLevel = "moderado") {
  const today = todayShort();
  const riskClr   = RISK_CLR[riskLevel] || CLR.warn;
  const riskLabel = ({ alto:"Alto", moderado:"Moderado", bajo:"Bajo", inminente:"Inminente" })[riskLevel] || "Moderado";

  const sp = safetyPlan || {};

  const html = `
${baseStyles(`
.sp-warn-box { background:${CLR.errorLight}; border:1.5px solid ${CLR.error}30; border-radius:10px; padding:14px 18px; margin-bottom:24px; font-size:12.5px; color:${CLR.error}; font-weight:500; line-height:1.65; }
`)}
<body>
  ${buildHeaderHTML(
    profile,
    "Plan de Seguridad Personal",
    `Elaborado el ${today} · ${profile?.clinic || "Consultorio Psicológico"}`,
    `<span class="pc-badge" style="background:${riskClr}18;color:${riskClr};border:1.5px solid ${riskClr}44">Riesgo ${riskLabel}</span>`
  )}

  <div class="pc-grid" style="margin-bottom:20px">
    <div class="pc-field"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
    <div class="pc-field"><label>Fecha</label><p>${today}</p></div>
    <div class="pc-field"><label>Terapeuta</label><p>${profile?.name || "—"}</p></div>
  </div>

  <div class="sp-warn-box">
    ⚠️ Este plan fue elaborado porque se detectaron indicadores de riesgo durante la sesión. Úsalo cuando notes las señales de advertencia que reconociste en terapia. <strong>Ante una crisis, contacta a las personas indicadas abajo o acude a urgencias de inmediato.</strong>
  </div>

  <div class="pc-section">
    <div class="pc-section-label">1 · Señales de advertencia — ¿Cuándo usar este plan?</div>
    <div class="pc-section-body" style="border-left-color:${riskClr};min-height:60px">${sp.warningSignals || "No especificado en esta sesión."}</div>
  </div>

  <div class="pc-section">
    <div class="pc-section-label">2 · Estrategias de afrontamiento personal</div>
    <div class="pc-section-body" style="min-height:60px">${sp.copingStrategies || "No especificado en esta sesión."}</div>
  </div>

  ${sp.reasonsToLive ? `
  <div class="pc-section">
    <div class="pc-section-label">3 · Razones para vivir / Motivos de esperanza</div>
    <div class="pc-section-body" style="border-left-color:${CLR.success};min-height:44px">${sp.reasonsToLive}</div>
  </div>` : ""}

  <div class="pc-section">
    <div class="pc-section-label">4 · Red de apoyo en crisis — Personas a contactar</div>
    <div class="pc-contacts">
      ${sp.supportContacts || (sp.familyContact) ? `
      <div class="pc-contact-card">
        <label>Familiar / persona de confianza</label>
        <strong>${sp.familyContact || sp.supportContacts?.split("—")[0]?.trim() || "—"}</strong>
        <span>${sp.familyPhone || sp.supportContacts?.split("—")[1]?.trim() || ""}</span>
      </div>` : ""}
      ${sp.professionalContacts || sp.professionalContact ? `
      <div class="pc-contact-card urgency">
        <label>Profesional de salud mental / crisis</label>
        <strong>${sp.professionalContact || sp.professionalContacts?.split("—")[0]?.trim() || "—"}</strong>
        <span>${sp.professionalPhone || sp.professionalContacts?.split("—")[1]?.trim() || ""}</span>
      </div>` : ""}
      <div class="pc-contact-card urgency">
        <label>Línea de crisis — México (gratuita 24h)</label>
        <strong>SAPTEL: 55 5259-8121</strong>
        <span>Atención en crisis emocionales y suicidio</span>
      </div>
      <div class="pc-contact-card urgency">
        <label>Emergencias médicas y seguridad</label>
        <strong>911</strong>
        <span>Urgencias — disponible todo México</span>
      </div>
    </div>
  </div>

  ${sp.environmentSafety ? `
  <div class="pc-section">
    <div class="pc-section-label">5 · Seguridad del entorno — Acciones de reducción de acceso a medios</div>
    <div class="pc-section-body" style="min-height:40px">${sp.environmentSafety}</div>
  </div>` : ""}

  <div class="pc-sig-grid">
    <div>
      <div class="pc-sig-line">
        <p class="pc-sig-name">${patient?.name || "Paciente"}</p>
        <p class="pc-sig-detail">Firma / Acuerdo verbal de compromiso</p>
      </div>
    </div>
    <div>
      <div class="pc-sig-line">
        <p class="pc-sig-name">${profile?.name || "Terapeuta"}</p>
        <p class="pc-sig-detail">${profile?.specialty || "Psicólogo/a Clínico/a"}${profile?.cedula ? ` · Céd. ${profile.cedula}` : ""}</p>
      </div>
    </div>
  </div>

  ${buildFooterHTML(profile, null, "Plan de Seguridad Personal · Confidencial")}
</body>`;

  openAndPrint(html, `Plan de Seguridad — ${patient?.name || "Paciente"}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTA DE DERIVACIÓN (movida desde Sessions.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export function printReferralLetter(patient, session, profile, formData) {
  const today = todayShort();

  const html = `
${baseStyles()}
<body>
  <div class="pc-header">
    <div class="pc-header-left">
      <div class="pc-header-clinic">${profile?.clinic || "Consultorio Psicológico"}</div>
      <h1 class="pc-header-title">Carta de Derivación</h1>
      ${profile?.name ? `<p class="pc-header-sub">${profile.name}${profile.specialty ? " · " + profile.specialty : ""}</p>` : ""}
      ${profile?.cedula ? `<p class="pc-header-sub">Cédula profesional: ${profile.cedula}</p>` : ""}
      ${profile?.phone ? `<p class="pc-header-sub">Tel: ${profile.phone}</p>` : ""}
    </div>
    <div class="pc-header-right" style="font-size:13px;color:${CLR.textMid};">${today}</div>
  </div>

  <p style="margin-bottom:16px;line-height:1.8">Por medio de la presente, me permito referir al/a la paciente:</p>

  <div class="pc-consent-box" style="margin-bottom:20px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><strong style="display:block;margin-bottom:3px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:${CLR.textLight}">Nombre</strong>${patient?.name || ""}</div>
      <div><strong style="display:block;margin-bottom:3px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:${CLR.textLight}">Edad</strong>${patient?.age ? patient.age + " años" : "N/D"}</div>
      ${patient?.diagnosis ? `<div style="grid-column:span 2"><strong style="display:block;margin-bottom:3px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:${CLR.textLight}">Diagnóstico</strong>${patient.diagnosis}</div>` : ""}
      <div><strong style="display:block;margin-bottom:3px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:${CLR.textLight}">Tiempo en tratamiento</strong>${session ? `Desde ${fmtDateStr(session.date)}` : "N/D"}</div>
    </div>
  </div>

  <p style="margin-bottom:16px;line-height:1.8">${formData.reason || "El/la paciente requiere evaluación y atención especializada."}</p>
  ${formData.specialist ? `<p style="margin-bottom:16px;line-height:1.8">Se deriva al servicio de <strong>${formData.specialist}</strong>.</p>` : ""}
  ${formData.notes ? `<p style="margin-bottom:16px;line-height:1.8">${formData.notes}</p>` : ""}
  <p style="margin-bottom:20px;line-height:1.8">Agradezco de antemano la atención prestada y quedo a disposición para cualquier información adicional.</p>
  <p style="margin-bottom:32px">Atentamente,</p>

  <div style="width:260px">
    <div class="pc-sig-line">
      <p class="pc-sig-name">${profile?.name || "Psicólogo/a"}</p>
      <p class="pc-sig-detail">${profile?.specialty || "Psicólogo/a Clínico/a"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</p>
      ${profile?.clinic ? `<p class="pc-sig-detail">${profile.clinic}</p>` : ""}
    </div>
  </div>

  ${buildFooterHTML(profile, null, "Carta de Derivación")}
</body>`;

  openAndPrint(html, `Carta Derivación — ${patient?.name}`);
}
