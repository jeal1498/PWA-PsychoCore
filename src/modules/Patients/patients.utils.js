import { T } from "../../theme.js";
import { fmtDate, fmtCur, fmt, todayDate } from "../../utils.js";

// ── Lavanda (pareja / diagnóstico) ────────────────────────────────────────────
export const LAVANDA   = "#6B5B9E";
export const LAVANDA_A = "rgba(107,91,158,0.10)";

// ── WhatsApp green ────────────────────────────────────────────────────────────
export const WA   = "#25D366";
export const WA_A = "rgba(37,211,102,0.08)";

// ── Portal domain ─────────────────────────────────────────────────────────────
export const PORTAL_DOMAIN = "https://psychocore.vercel.app";

// ── Time slots helper for Primer Contacto (30-min, 08:00–20:00) ──────────────
export const PC_TIME_SLOTS = (() => {
  const slots = [];
  for (let m = 8 * 60; m < 20 * 60; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
})();

// ── Phone countries ───────────────────────────────────────────────────────────
export const PHONE_COUNTRIES = [
  { code:"+52",  flag:"🇲🇽", name:"México",       len:10 },
  { code:"+1",   flag:"🇺🇸", name:"EE.UU./CAN",   len:10 },
  { code:"+34",  flag:"🇪🇸", name:"España",        len:9  },
  { code:"+54",  flag:"🇦🇷", name:"Argentina",     len:10 },
  { code:"+57",  flag:"🇨🇴", name:"Colombia",      len:10 },
  { code:"+56",  flag:"🇨🇱", name:"Chile",         len:9  },
  { code:"+51",  flag:"🇵🇪", name:"Perú",          len:9  },
  { code:"+55",  flag:"🇧🇷", name:"Brasil",        len:11 },
  { code:"+44",  flag:"🇬🇧", name:"Reino Unido",   len:10 },
  { code:"+49",  flag:"🇩🇪", name:"Alemania",      len:10 },
];

// ── STATUS config ─────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  activo: { label:"Activo",   color:T.suc, bg:T.sucA },
  pausa:  { label:"En pausa", color:T.war, bg:T.warA },
  alta:   { label:"Alta",     color:T.tl,  bg:T.bdrL },
};

// ── TYPE config ───────────────────────────────────────────────────────────────
export const TYPE_CONFIG = {
  individual: { label:"Individual", color:T.p,     bg:T.pA      },
  pareja:     { label:"Pareja",     color:LAVANDA,  bg:LAVANDA_A },
  grupo:      { label:"Grupal",     color:T.acc,   bg:T.accA    },
};

// ── Service type labels ───────────────────────────────────────────────────────
export const SERVICE_TYPE_LABEL = {
  sesion:      "Sesión individual",
  evaluacion:  "Evaluación neuropsicológica",
  pareja:      "Terapia de pareja",
  grupo:       "Grupo / Taller",
  otro:        "Otro",
};

// ── Motivos de alta ───────────────────────────────────────────────────────────
export const MOTIVO_ALTA_OPTIONS = [
  { value: "logros",     label: "Objetivos terapéuticos logrados"  },
  { value: "voluntaria", label: "Alta voluntaria del paciente"      },
  { value: "derivacion", label: "Derivación a otro profesional"     },
  { value: "otros",      label: "Otros"                             },
];

// ── Anamnesis blank ───────────────────────────────────────────────────────────
export const ANAMNESIS_BLANK = {
  fechaPrimeraConsulta: "",
  motivoConsulta: "",
  observacionesIniciales: "",
  antMedicos: "",
  antPsiquiatricos: "",
  medicacionActual: "",
  sustancias: "ninguno",
  sustanciasOtro: "",
  historiaFamiliar: "",
  enfermedadesFamiliares: "",
  situacionLaboral: "",
  situacionFamiliar: "",
  redApoyo: "",
  impresionDiagnostica: "",
  hipotesisTrabajo: "",
};

// ── Discharge form blank ──────────────────────────────────────────────────────
export const BLANK_ALTA = {
  observaciones:     "",
  recomendaciones:   "",
  motivo:            "logros",
  genInforme:        true,
  genCarta:          false,
  referProfessional: "",
};

// ── CIE-11 codes ──────────────────────────────────────────────────────────────
export const CIE11_CODES = [
  { code: "6A00",   label: "TDAH, presentación combinada" },
  { code: "6A01",   label: "TDAH, predominio inatento" },
  { code: "6A02",   label: "TDAH, predominio hiperactivo-impulsivo" },
  { code: "6A06",   label: "Trastorno del espectro autista" },
  { code: "6A20",   label: "Esquizofrenia" },
  { code: "6A23",   label: "Trastorno esquizoafectivo" },
  { code: "6A24",   label: "Trastorno delirante" },
  { code: "6A60",   label: "Episodio depresivo mayor, leve" },
  { code: "6A61",   label: "Episodio depresivo mayor, moderado" },
  { code: "6A62",   label: "Episodio depresivo mayor, grave" },
  { code: "6A70",   label: "Trastorno depresivo recurrente" },
  { code: "6A71",   label: "Trastorno distímico (distimia)" },
  { code: "6A80",   label: "Trastorno bipolar tipo I" },
  { code: "6A81",   label: "Trastorno bipolar tipo II" },
  { code: "6A82",   label: "Trastorno ciclotímico" },
  { code: "6B00",   label: "Trastorno de ansiedad generalizada (TAG)" },
  { code: "6B01",   label: "Trastorno de pánico" },
  { code: "6B02",   label: "Agorafobia" },
  { code: "6B03",   label: "Fobia específica" },
  { code: "6B04",   label: "Fobia social (trastorno de ansiedad social)" },
  { code: "6B05",   label: "Trastorno de ansiedad por separación" },
  { code: "6B20",   label: "Trastorno obsesivo-compulsivo (TOC)" },
  { code: "6B21",   label: "Dismorfofobia (trastorno dismórfico corporal)" },
  { code: "6B22",   label: "Hipocondría" },
  { code: "6B25",   label: "Tricotilomanía" },
  { code: "6B40",   label: "Trastorno de estrés postraumático (TEPT)" },
  { code: "6B41",   label: "Trastorno de estrés agudo" },
  { code: "6B43",   label: "Trastorno de adaptación" },
  { code: "6B44",   label: "TEPT complejo" },
  { code: "6B60",   label: "Trastorno disociativo de identidad" },
  { code: "6B61",   label: "Amnesia disociativa" },
  { code: "6B65",   label: "Despersonalización/desrealización" },
  { code: "6B80",   label: "Anorexia nerviosa" },
  { code: "6B81",   label: "Bulimia nerviosa" },
  { code: "6B82",   label: "Trastorno de atracones" },
  { code: "6C70",   label: "Trastorno explosivo intermitente" },
  { code: "6C72",   label: "Cleptomanía" },
  { code: "6C73",   label: "Piromanía" },
  { code: "6C40",   label: "Trastorno por consumo de alcohol" },
  { code: "6C43",   label: "Trastorno por consumo de cannabis" },
  { code: "6C45",   label: "Trastorno por consumo de estimulantes" },
  { code: "6C46",   label: "Trastorno por consumo de sedantes/hipnóticos" },
  { code: "6D10",   label: "Trastorno de personalidad, leve" },
  { code: "6D11",   label: "Trastorno de personalidad, moderado" },
  { code: "6D12",   label: "Trastorno de personalidad, grave" },
  { code: "6D10.0", label: "Trastorno límite de la personalidad" },
  { code: "6D10.1", label: "Trastorno de personalidad obsesivo-compulsivo" },
  { code: "6D10.2", label: "Trastorno de personalidad ansioso-evitativo" },
  { code: "6D10.3", label: "Trastorno de personalidad dependiente" },
  { code: "6C20",   label: "Trastorno de síntomas somáticos" },
  { code: "6C21",   label: "Trastorno de conversión / síntomas neurológicos funcionales" },
  { code: "7A00",   label: "Insomnio crónico" },
  { code: "7A01",   label: "Hipersomnia idiopática" },
  { code: "QE50",   label: "Duelo complicado" },
  { code: "QE84",   label: "Problema relacionado con el trabajo o empleo" },
  { code: "PF20",   label: "Problema de relación de pareja" },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Calcula edad a partir de fecha de nacimiento "YYYY-MM-DD" */
export function calcAge(birthdate) {
  if (!birthdate) return "";
  const today = new Date();
  const bd    = new Date(birthdate + "T12:00");
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age >= 0 ? age : "";
}

/** Genera el HTML del expediente para impresión */
export function buildExpedienteHtml(patient, sessions, payments, profile) {
  const ptS = sessions.filter(s => s.patientId === patient.id).sort((a,b) => a.date.localeCompare(b.date));
  const ptP = payments.filter(p => p.patientId === patient.id);
  const totalPaid = ptP.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount), 0);
  const today = new Date().toLocaleDateString("es-MX",{year:"numeric",month:"long",day:"numeric"});
  return `<!doctype html><html><head><meta charset="utf-8"><title>Expediente — ${patient.name}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#1A2B28;line-height:1.65}
h1{font-size:28px;font-weight:400;margin-bottom:4px}h2{font-size:17px;font-weight:600;border-bottom:1px solid #D8E2E0;padding-bottom:6px;margin:28px 0 14px}
.meta{color:#5A7270;font-size:14px;margin-bottom:20px}.chip{display:inline-block;padding:2px 8px;border-radius:4px;background:#EDF1F0;font-size:12px;font-family:monospace;margin-right:6px}
.sess{border-bottom:1px solid #EDF1F0;padding:12px 0}.date{font-weight:600;font-size:15px}.notes{color:#5A7270;margin-top:4px;font-size:14px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;text-align:right}
</style></head><body>
<h1>${patient.name}</h1>
<div class="meta">${patient.age ? patient.age+" años · " : ""}Expediente generado el ${today}${profile?.name ? " · " + profile.name : ""}</div>
${patient.diagnosis ? `<div><span class="chip">${patient.cie11Code||"Dx"}</span>${patient.diagnosis}</div>` : ""}
${patient.reason ? `<h2>Motivo de consulta</h2><p>${patient.reason}</p>` : ""}
<h2>Sesiones (${ptS.length})</h2>
${ptS.map(s => `<div class="sess"><div class="date">${fmtDate(s.date)} · ${s.duration} min · ${s.progress||""} · ${s.mood||""}</div><div class="notes">${(s.notes||"").replace(/\[(?:S|D|A|P|B|I|R)\]\s*/g,"")}</div></div>`).join("")}
<h2>Resumen financiero</h2>
<p>Total pagado: <strong>$${totalPaid.toLocaleString("es-MX")}</strong> en ${ptP.filter(p=>p.status==="pagado").length} registros</p>
<div class="footer"><span>${patient.name} · ${today}</span></div>
</body></html>`;
}

/** Abre ventana de impresión del expediente */
export function exportExpediente(patient, sessions, payments, profile) {
  const w = window.open("","_blank");
  w.document.write(buildExpedienteHtml(patient, sessions, payments, profile));
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ── SVG sparkline path helpers ────────────────────────────────────────────────
export const MOOD_VAL  = { bueno: 2, moderado: 1, bajo: 0 };
export const MOOD_LBL  = { 2:"Bueno", 1:"Moderado", 0:"Bajo" };
export const MOOD_CLR  = { 2: "var(--success)", 1: "var(--warn)", 0: "var(--error)" };
export const PROG_VAL  = { excelente:4, bueno:3, moderado:2, bajo:1 };

/**
 * Builds an SVG `d` path string from arrays of x/y coordinates.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {string}
 */
export function buildSvgPath(xs, ys) {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
}
