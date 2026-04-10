import { T } from "../../theme.js";

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY COLOR CONSTANTS — semánticos clínicos, no tokens de tema
// ─────────────────────────────────────────────────────────────────────────────
export const SEV_LEVE    = "#7DBB8A"; export const SEV_LEVE_A    = "rgba(125,187,138,0.12)";
export const SEV_GRAVE   = "#C4622A"; export const SEV_GRAVE_A   = "rgba(196,98,42,0.10)";
export const AZUL        = "#5B8DB8"; export const AZUL_A        = "rgba(91,141,184,0.10)";
export const LAVANDA     = "#6B5B9E"; export const LAVANDA_A     = "rgba(107,91,158,0.10)";
export const MALVA       = "#9B6B9E"; export const MALVA_A       = "rgba(155,107,158,0.10)";
export const TEAL        = "#4A90A4"; export const TEAL_A        = "rgba(74,144,164,0.10)";
export const AMBAR       = "#B8900A"; export const AMBAR_A       = "rgba(184,144,10,0.10)";
export const NARANJA     = "#E87D3E"; export const NARANJA_A     = "rgba(232,125,62,0.10)";
export const VIOLETA     = "#7B68A8"; export const VIOLETA_A     = "rgba(123,104,168,0.10)";
export const CAFE        = "#C0843E"; export const CAFE_A        = "rgba(192,132,62,0.10)";
export const VERDE       = "#4CAF82"; export const VERDE_A       = "rgba(76,175,130,0.10)";
export const BOSQUE      = "#3A6B6E"; export const BOSQUE_A      = "rgba(58,107,110,0.10)";
export const BLANCO_SVG  = "#ffffff";

// ─────────────────────────────────────────────────────────────────────────────
// SCALE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const SCALES = {
  PHQ9: {
    id: "PHQ9",
    name: "PHQ-9",
    fullName: "Patient Health Questionnaire-9",
    domain: "Depresión",
    color: AZUL,
    bg: AZUL_A,
    maxScore: 27,
    responseLabels: ["Para nada", "Varios días", "Más de la mitad", "Casi todos los días"],
    questions: [
      "Poco interés o placer en hacer las cosas",
      "Sentirse decaído/a, deprimido/a o sin esperanza",
      "Dificultad para quedarse o permanecer dormido/a, o dormir demasiado",
      "Sentirse cansado/a o con poca energía",
      "Tener poco apetito o comer en exceso",
      "Sentirse mal sobre sí mismo/a, sentirse fracasado/a, o que ha fallado a sí mismo/a o a su familia",
      "Dificultad para concentrarse en cosas como leer el periódico o ver la televisión",
      "Moverse o hablar tan despacio que otras personas lo notaron, o lo contrario: estar tan inquieto/a que ha estado moviéndose mucho más de lo normal",
      "Pensamientos de que sería mejor estar muerto/a, o de hacerse daño de alguna manera",
    ],
    severity: [
      { max: 4,  label: "Mínima",    color: T.suc,      bg: T.sucA     },
      { max: 9,  label: "Leve",      color: SEV_LEVE,   bg: SEV_LEVE_A },
      { max: 14, label: "Moderada",  color: T.war,      bg: T.warA     },
      { max: 19, label: "Mod-grave", color: SEV_GRAVE,  bg: SEV_GRAVE_A},
      { max: 27, label: "Grave",     color: T.err,      bg: T.errA     },
    ],
    clinicalNote: "Puntuación ≥ 10 sugiere depresión mayor. Ítem 9 (ideación suicida) requiere evaluación inmediata independientemente del total.",
  },

  GAD7: {
    id: "GAD7",
    name: "GAD-7",
    fullName: "Generalized Anxiety Disorder-7",
    domain: "Ansiedad",
    color: AMBAR,
    bg: AMBAR_A,
    maxScore: 21,
    responseLabels: ["Para nada", "Varios días", "Más de la mitad", "Casi todos los días"],
    questions: [
      "Sentirse nervioso/a, ansioso/a o con los nervios de punta",
      "No poder dejar de preocuparse o no poder controlar la preocupación",
      "Preocuparse demasiado por diferentes cosas",
      "Dificultad para relajarse",
      "Estar tan inquieto/a que es difícil permanecer sentado/a",
      "Molestarse o ponerse irritable fácilmente",
      "Sentir miedo como si algo terrible pudiera pasar",
    ],
    severity: [
      { max: 4,  label: "Mínima",   color: T.suc,     bg: T.sucA     },
      { max: 9,  label: "Leve",     color: SEV_LEVE,  bg: SEV_LEVE_A },
      { max: 14, label: "Moderada", color: T.war,     bg: T.warA     },
      { max: 21, label: "Grave",    color: T.err,     bg: T.errA     },
    ],
    clinicalNote: "Puntuación ≥ 10 sugiere trastorno de ansiedad generalizada que amerita evaluación adicional.",
  },

  BAI: {
    id: "BAI",
    name: "BAI",
    fullName: "Beck Anxiety Inventory",
    domain: "Ansiedad somática",
    color: MALVA,
    bg: MALVA_A,
    maxScore: 63,
    responseLabels: ["Para nada", "Levemente", "Moderadamente", "Severamente"],
    questions: [
      "Entumecimiento u hormigueo",
      "Sensación de calor",
      "Temblor en las piernas",
      "Incapacidad de relajarse",
      "Miedo a que ocurra lo peor",
      "Mareo o aturdimiento",
      "Palpitaciones o aceleración del corazón",
      "Inestabilidad",
      "Aterrorizado/a",
      "Nerviosismo",
      "Sensación de ahogo",
      "Temblores en las manos",
      "Temblor generalizado",
      "Miedo a perder el control",
      "Dificultad para respirar",
      "Miedo a morir",
      "Asustado/a",
      "Indigestión o malestar abdominal",
      "Sensación de desmayo",
      "Rubor facial",
      "Sudoración (no debida al calor)",
    ],
    severity: [
      { max: 7,  label: "Mínima",   color: T.suc,     bg: T.sucA     },
      { max: 15, label: "Leve",     color: SEV_LEVE,  bg: SEV_LEVE_A },
      { max: 25, label: "Moderada", color: T.war,     bg: T.warA     },
      { max: 63, label: "Grave",    color: T.err,     bg: T.errA     },
    ],
    clinicalNote: "Evalúa síntomas somáticos de ansiedad durante la última semana. Complementa al GAD-7.",
  },

  PCL5: {
    id: "PCL5",
    name: "PCL-5",
    fullName: "PTSD Checklist for DSM-5",
    domain: "Trauma / TEPT",
    color: LAVANDA,
    bg: LAVANDA_A,
    maxScore: 80,
    responseLabels: ["Para nada", "Un poco", "Moderadamente", "Bastante", "Extremadamente"],
    questions: [
      "Recuerdos angustiantes repetitivos, involuntarios e intrusivos del evento traumático",
      "Sueños angustiantes recurrentes relacionados con el evento traumático",
      "Actuar o sentirse como si el evento traumático estuviera ocurriendo de nuevo",
      "Sentirse muy angustiado/a ante recordatorios internos o externos del evento",
      "Tener reacciones físicas fuertes ante recordatorios del evento",
      "Evitar recuerdos, pensamientos o sentimientos relacionados con el evento",
      "Evitar recordatorios externos del evento (personas, lugares, conversaciones, actividades, objetos, situaciones)",
      "No poder recordar aspectos importantes del evento traumático",
      "Creencias o expectativas negativas y persistentes sobre uno mismo, los demás o el mundo",
      "Culparse persistentemente a uno mismo o a otros por el evento o sus consecuencias",
      "Sentimientos negativos intensos y persistentes (miedo, horror, ira, culpa o vergüenza)",
      "Pérdida de interés en actividades que antes disfrutaba",
      "Sentirse distante o alejado/a de otras personas",
      "Incapacidad para experimentar emociones positivas",
      "Comportamiento irritable, arrebatos de ira o agresión",
      "Conductas imprudentes o autodestructivas",
      "Estar en un estado de alerta exagerado",
      "Sobresaltarse fácilmente",
      "Dificultad para concentrarse",
      "Problemas para dormir",
    ],
    severity: [
      { max: 32, label: "Subclínico", color: T.suc, bg: T.sucA },
      { max: 80, label: "Clínico",    color: T.err, bg: T.errA },
    ],
    clinicalNote: "Punto de corte sugerido ≥ 33 para TEPT probable. No es diagnóstico — requiere evaluación clínica.",
  },

  // ── DASS-21 ─────────────────────────────────────────────────────────────────
  DASS21: {
    id: "DASS21",
    scaleType: "dass",
    name: "DASS-21",
    fullName: "Depression Anxiety Stress Scales – 21",
    domain: "Depresión / Ansiedad / Estrés",
    color: TEAL,
    bg: TEAL_A,
    maxScore: 63,
    responseLabels: ["No me aplicó", "Me aplicó un poco", "Me aplicó bastante", "Me aplicó mucho"],
    questions: [
      "Me costó mucho relajarme",
      "Me di cuenta que tenía la boca seca",
      "No podía sentir ningún sentimiento positivo",
      "Se me hizo difícil respirar (ej. respiración rápida, falta de aliento sin hacer esfuerzo físico)",
      "Se me hizo difícil tomar iniciativa para hacer cosas",
      "Reaccioné de manera exagerada en ciertas situaciones",
      "Sentí que mis manos temblaban",
      "Sentí que estaba muy nervioso/a",
      "Estaba preocupado/a por situaciones en las cuales podría entrar en pánico y hacer el ridículo",
      "Sentí que no tenía nada que esperar",
      "Me noté agitado/a",
      "Me fue difícil relajarme",
      "Me sentí triste y deprimido/a",
      "Fui intolerante con todo lo que me impedía hacer lo que estaba haciendo",
      "Sentí que estaba al borde del pánico",
      "No pude entusiasmarme por nada",
      "Sentí que como persona no tenía mucho valor",
      "Sentí que estaba bastante irritable",
      "Fui muy consciente de la acción de mi corazón sin haber hecho esfuerzo físico",
      "Me sentí asustado/a sin tener una buena razón para ello",
      "Sentí que la vida no tenía sentido",
    ],
    subscales: {
      depression: {
        label: "Depresión", color: AZUL, bg: AZUL_A,
        items: [2, 4, 9, 12, 15, 16, 20],
        severity: [
          { max: 9,  label: "Normal",    color: T.suc,     bg: T.sucA      },
          { max: 13, label: "Leve",      color: SEV_LEVE,  bg: SEV_LEVE_A  },
          { max: 20, label: "Moderada",  color: T.war,     bg: T.warA      },
          { max: 27, label: "Grave",     color: SEV_GRAVE, bg: SEV_GRAVE_A },
          { max: 42, label: "Muy grave", color: T.err,     bg: T.errA      },
        ],
      },
      anxiety: {
        label: "Ansiedad", color: T.war, bg: T.warA,
        items: [1, 3, 6, 8, 14, 18, 19],
        severity: [
          { max: 7,  label: "Normal",    color: T.suc,     bg: T.sucA      },
          { max: 9,  label: "Leve",      color: SEV_LEVE,  bg: SEV_LEVE_A  },
          { max: 14, label: "Moderada",  color: T.war,     bg: T.warA      },
          { max: 19, label: "Grave",     color: SEV_GRAVE, bg: SEV_GRAVE_A },
          { max: 42, label: "Muy grave", color: T.err,     bg: T.errA      },
        ],
      },
      stress: {
        label: "Estrés", color: T.acc, bg: T.accA,
        items: [0, 5, 7, 10, 11, 13, 17],
        severity: [
          { max: 14, label: "Normal",    color: T.suc,     bg: T.sucA      },
          { max: 18, label: "Leve",      color: SEV_LEVE,  bg: SEV_LEVE_A  },
          { max: 25, label: "Moderada",  color: T.war,     bg: T.warA      },
          { max: 33, label: "Grave",     color: SEV_GRAVE, bg: SEV_GRAVE_A },
          { max: 42, label: "Muy grave", color: T.err,     bg: T.errA      },
        ],
      },
    },
    severity: [
      { max: 21, label: "Normal-leve", color: T.suc, bg: T.sucA },
      { max: 35, label: "Moderada",    color: T.war, bg: T.warA },
      { max: 63, label: "Grave",       color: T.err, bg: T.errA },
    ],
    clinicalNote: "Evalúa Depresión, Ansiedad y Estrés. Puntuación de subescala = suma de 7 ítems × 2. Ver desglose por subescala para interpretación clínica completa.",
  },

  // ── ASRS-v1.1 ───────────────────────────────────────────────────────────────
  ASRS: {
    id: "ASRS",
    scaleType: "asrs",
    name: "ASRS-v1.1",
    fullName: "Adult ADHD Self-Report Scale v1.1",
    domain: "TDAH adultos",
    color: NARANJA,
    bg: NARANJA_A,
    maxScore: 72,
    responseLabels: ["Nunca", "Rara vez", "A veces", "A menudo", "Con mucha frecuencia"],
    partAItems: [0, 1, 2, 3, 4, 5],
    partAThresholds: [2, 2, 2, 3, 3, 3],
    questions: [
      "¿Con qué frecuencia tiene dificultades para terminar los detalles finales de un proyecto una vez que las partes más difíciles han sido hechas?",
      "¿Con qué frecuencia tiene dificultades para poner las cosas en orden cuando tiene que hacer una tarea que requiere organización?",
      "¿Con qué frecuencia tiene problemas para recordar citas o compromisos?",
      "Cuando tiene una tarea que requiere mucho pensamiento, ¿con qué frecuencia evita o pospone su comienzo?",
      "¿Con qué frecuencia juguetea o se mueve en su asiento con sus manos o sus pies cuando tiene que estar sentado/a por mucho tiempo?",
      "¿Con qué frecuencia se siente excesivamente activo/a o compelido/a a hacer cosas, como si lo/la manejara un motor?",
      "¿Con qué frecuencia comete errores por descuido cuando trabaja en un proyecto difícil o repetitivo?",
      "¿Con qué frecuencia tiene dificultades para mantener su atención cuando hace un trabajo aburrido o repetitivo?",
      "¿Con qué frecuencia tiene dificultades para concentrarse en lo que la gente le dice, incluso cuando le están hablando directamente?",
      "¿Con qué frecuencia extravía o tiene dificultades para encontrar las cosas en su hogar o en su trabajo?",
      "¿Con qué frecuencia se distrae con la actividad o el ruido a su alrededor?",
      "¿Con qué frecuencia se levanta de su asiento en reuniones u otras situaciones donde se supone que debe permanecer sentado/a?",
      "¿Con qué frecuencia se siente inquieto/a o agitado/a?",
      "¿Con qué frecuencia tiene dificultades para relajarse en su tiempo libre?",
      "¿Con qué frecuencia se siente incómodo/a cuando está sin nada que hacer?",
      "¿Con qué frecuencia habla demasiado cuando está en una situación social?",
      "¿Con qué frecuencia termina las oraciones de las personas antes de que puedan terminarlas ellas?",
      "¿Con qué frecuencia tiene dificultades para esperar su turno?",
    ],
    severity: [
      { max: 23, label: "Bajo",     color: T.suc, bg: T.sucA },
      { max: 47, label: "Moderado", color: T.war, bg: T.warA },
      { max: 72, label: "Alto",     color: T.err, bg: T.errA },
    ],
    clinicalNote: "Parte A (ítems 1–6): cribado positivo si ≥4 ítems superan el umbral. No es diagnóstico — requiere evaluación clínica estructurada. Discutir resultado con el paciente.",
  },

  // ── ISI ─────────────────────────────────────────────────────────────────────
  ISI: {
    id: "ISI",
    name: "ISI",
    fullName: "Insomnia Severity Index",
    domain: "Insomnio",
    color: VIOLETA,
    bg: VIOLETA_A,
    maxScore: 28,
    responseLabels: ["Ninguno/a", "Leve", "Moderado/a", "Grave", "Muy grave"],
    questions: [
      "Dificultad para quedarse dormido/a",
      "Dificultad para seguir dormido/a (despertares nocturnos)",
      "Despertar demasiado temprano",
      "¿Cuán satisfecho/a está con su patrón de sueño? (0=Muy satisfecho → 4=Muy insatisfecho)",
      "¿En qué medida su problema de sueño interfiere en su vida diaria (cansancio, concentración, humor, rendimiento)?",
      "¿En qué medida resultan perceptibles para los demás las consecuencias de su problema de sueño?",
      "¿Cuánta preocupación le causa su problema de sueño?",
    ],
    severity: [
      { max: 7,  label: "Sin insomnio", color: T.suc,    bg: T.sucA     },
      { max: 14, label: "Subclínico",   color: SEV_LEVE, bg: SEV_LEVE_A },
      { max: 21, label: "Moderado",     color: T.war,    bg: T.warA     },
      { max: 28, label: "Grave",        color: T.err,    bg: T.errA     },
    ],
    clinicalNote: "≥15 indica insomnio clínico moderado que amerita intervención. El ISI evalúa la gravedad, el malestar y el impacto del insomnio en las últimas 2 semanas.",
  },

  // ── AUDIT ───────────────────────────────────────────────────────────────────
  AUDIT: {
    id: "AUDIT",
    scaleType: "audit",
    name: "AUDIT",
    fullName: "Alcohol Use Disorders Identification Test",
    domain: "Consumo de alcohol",
    color: CAFE,
    bg: CAFE_A,
    maxScore: 40,
    responseLabels: ["Nunca", "Mensualmente o menos", "2–4 veces al mes", "2–3 veces/semana", "≥4 veces/semana"],
    customItemOptions: {
      8: [{ value: 0, label: "No" }, { value: 2, label: "Sí, pero no en el último año" }, { value: 4, label: "Sí, en el último año" }],
      9: [{ value: 0, label: "No" }, { value: 2, label: "Sí, pero no en el último año" }, { value: 4, label: "Sí, en el último año" }],
    },
    questions: [
      "¿Con qué frecuencia consume alguna bebida alcohólica?",
      "¿Cuántas bebidas alcohólicas suele tomar en un día normal de consumo?",
      "¿Con qué frecuencia toma 6 o más bebidas en una misma ocasión?",
      "En el último año, ¿con qué frecuencia no pudo parar de beber una vez que había empezado?",
      "En el último año, ¿con qué frecuencia no pudo hacer lo que se esperaba de usted por haber bebido?",
      "En el último año, ¿con qué frecuencia necesitó beber en ayunas para recuperarse del día anterior?",
      "En el último año, ¿con qué frecuencia tuvo remordimientos o culpa después de haber bebido?",
      "En el último año, ¿con qué frecuencia no recordó lo que pasó la noche anterior por haber bebido?",
      "¿Usted u otra persona ha resultado herido/a por su consumo de alcohol?",
      "¿Un familiar, amigo, médico u otro profesional ha mostrado preocupación por su consumo o le ha sugerido dejar de beber?",
    ],
    severity: [
      { max: 7,  label: "Bajo riesgo",     color: T.suc,    bg: T.sucA     },
      { max: 15, label: "Riesgo moderado", color: SEV_LEVE, bg: SEV_LEVE_A },
      { max: 19, label: "Uso perjudicial", color: T.war,    bg: T.warA     },
      { max: 40, label: "Dependencia",     color: T.err,    bg: T.errA     },
    ],
    clinicalNote: "≥8 uso de riesgo · ≥16 perjudicial · ≥20 probable dependencia. Ítems 9–10 puntúan 0/2/4. Intervención breve recomendada con puntuación 8–15.",
  },

  // ── ORS ─────────────────────────────────────────────────────────────────────
  ORS: {
    id: "ORS",
    scaleType: "analog",
    name: "ORS",
    fullName: "Outcome Rating Scale",
    domain: "Resultados terapéuticos",
    color: VERDE,
    bg: VERDE_A,
    maxScore: 40,
    itemMax: 10,
    responseLabels: [],
    questions: [
      "Bienestar individual — ¿Cómo me siento conmigo mismo/a?",
      "Bienestar interpersonal — ¿Cómo van mis relaciones más cercanas?",
      "Bienestar social — ¿Cómo me va en el trabajo / escuela / vida comunitaria?",
      "Bienestar general — ¿Cómo va todo en mi vida en general?",
    ],
    itemLabels: [["Mal", "Bien"], ["Mal", "Bien"], ["Mal", "Bien"], ["Mal", "Bien"]],
    severity: [
      { max: 24, label: "Rango clínico",   color: T.err, bg: T.errA },
      { max: 40, label: "Rango funcional", color: T.suc, bg: T.sucA },
    ],
    clinicalNote: "Aplicar al inicio de cada sesión. <25 indica necesidad de atención clínica. Un cambio ≥5 pts entre sesiones es clínicamente significativo.",
  },

  // ── SRS ─────────────────────────────────────────────────────────────────────
  SRS: {
    id: "SRS",
    scaleType: "analog",
    name: "SRS",
    fullName: "Session Rating Scale",
    domain: "Alianza terapéutica",
    color: BOSQUE,
    bg: BOSQUE_A,
    maxScore: 40,
    itemMax: 10,
    responseLabels: [],
    questions: [
      "Relación — ¿Me sentí escuchado/a, comprendido/a y respetado/a?",
      "Metas y temas — Trabajamos y hablamos sobre lo que quería trabajar",
      "Enfoque o método — El enfoque del/la terapeuta se adapta a mí",
      "General — En general, la sesión de hoy fue lo que necesitaba",
    ],
    itemLabels: [
      ["No me sentí escuchado/a", "Me sentí escuchado/a"],
      ["No hablamos de lo que quería", "Hablamos de lo que quería"],
      ["El enfoque no me encajó", "El enfoque me encajó"],
      ["Algo importante faltó", "Fue lo que necesitaba"],
    ],
    severity: [
      { max: 35, label: "Alianza baja",  color: T.war, bg: T.warA },
      { max: 40, label: "Alianza buena", color: T.suc, bg: T.sucA },
    ],
    clinicalNote: "Aplicar al final de cada sesión. <36 sugiere que la alianza terapéutica necesita conversación. Discutir el resultado con el paciente cuando sea bajo.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export function getSeverity(scaleId, score) {
  const scale = SCALES[scaleId];
  if (!scale) return null;
  return scale.severity.find(s => score <= s.max) || scale.severity[scale.severity.length - 1];
}

// DASS-21: calcula puntajes de subescala (raw × 2) y sus severidades
export function getDASS21Subscores(answers) {
  if (!answers || answers.length < 21) return null;
  const scale = SCALES.DASS21;
  const result = {};
  Object.entries(scale.subscales).forEach(([key, sub]) => {
    const raw    = sub.items.reduce((s, i) => s + (answers[i] ?? 0), 0);
    const scaled = raw * 2;
    const sev    = sub.severity.find(s => scaled <= s.max) || sub.severity[sub.severity.length - 1];
    result[key]  = { raw, scaled, sev, label: sub.label, color: sub.color, bg: sub.bg };
  });
  return result;
}

// ASRS: calcula si Parte A es positiva (≥4 ítems superan umbral)
export function getASRSPartA(answers) {
  if (!answers) return null;
  const scale     = SCALES.ASRS;
  const positives = scale.partAItems.filter(i => (answers[i] ?? 0) >= scale.partAThresholds[i]);
  return { positives: positives.length, threshold: 4, positive: positives.length >= 4 };
}

// Normaliza scaleId a clave exacta de SCALES (tolera variantes con guiones, puntos, sufijos)
export function normalizeScaleId(id) {
  if (!id) return id;
  const key = id.toUpperCase().replace(/[-._]/g, "").replace("V1", "").replace("1", "");
  const SCALE_KEYS = Object.keys(SCALES);
  return SCALE_KEYS.find(k => key.includes(k) || k.includes(key)) || id;
}
