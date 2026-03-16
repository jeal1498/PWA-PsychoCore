// ─────────────────────────────────────────────────────────────────────────────
// src/lib/taskTemplates.js
// Catálogo de plantillas de tareas terapéuticas
// ─────────────────────────────────────────────────────────────────────────────

export const TASK_TEMPLATES = {

  diario_emociones: {
    id:          "diario_emociones",
    title:       "Diario de Emociones",
    icon:        "📔",
    category:    "Autoconocimiento",
    description: "Registro de emociones del día, su intensidad y el contexto en que aparecieron.",
    fields: [
      { key: "emocion",       label: "¿Qué emoción sentiste con más fuerza hoy?",    type: "text",     placeholder: "Ej. tristeza, alegría, enojo, miedo..." },
      { key: "intensidad",    label: "Intensidad de esa emoción (1 = leve, 10 = muy intensa)", type: "scale10" },
      { key: "situacion",     label: "¿Qué pasó justo antes de sentirla?",           type: "textarea", placeholder: "Describe brevemente la situación..." },
      { key: "pensamiento",   label: "¿Qué pensabas en ese momento?",                type: "textarea", placeholder: "El primer pensamiento que llegó a tu mente..." },
      { key: "reaccion",      label: "¿Cómo reaccionaste?",                          type: "textarea", placeholder: "¿Qué hiciste o dejaste de hacer?" },
    ],
  },

  registro_ansiedad: {
    id:          "registro_ansiedad",
    title:       "Registro de Ansiedad",
    icon:        "📊",
    category:    "Ansiedad",
    description: "Seguimiento de episodios de ansiedad: detonantes, síntomas y estrategias usadas.",
    fields: [
      { key: "fecha_hora",    label: "¿Cuándo ocurrió?",                             type: "text",     placeholder: "Ej. lunes por la tarde, en el trabajo..." },
      { key: "detonante",     label: "¿Qué lo detonó?",                              type: "textarea", placeholder: "Situación, persona, pensamiento..." },
      { key: "nivel",         label: "Nivel de ansiedad en ese momento (1-10)",      type: "scale10" },
      { key: "sintomas",      label: "¿Qué síntomas notaste en tu cuerpo?",          type: "textarea", placeholder: "Taquicardia, tensión, respiración rápida..." },
      { key: "estrategia",    label: "¿Qué hiciste para calmarte?",                  type: "textarea", placeholder: "¿Funcionó? ¿Qué tan bien?" },
      { key: "nivel_despues", label: "Nivel de ansiedad al final (1-10)",            type: "scale10" },
    ],
  },

  relacion_quiero: {
    id:          "relacion_quiero",
    title:       "Lo que quiero y no quiero en una relación",
    icon:        "💞",
    category:    "Relaciones",
    description: "Reflexión sobre los valores y límites en las relaciones afectivas.",
    fields: [
      { key: "quiero",        label: "¿Qué SÍ quiero en una relación?",              type: "textarea", placeholder: "Escribe todo lo que se te venga a la mente, sin filtros..." },
      { key: "no_quiero",     label: "¿Qué NO quiero en una relación?",              type: "textarea", placeholder: "Cosas que ya viviste o que sabes que no tolerarías..." },
      { key: "por_que",       label: "¿Qué crees que te enseñó a querer o no querer eso?", type: "textarea", placeholder: "Puede ser una experiencia, una persona, algo que observaste..." },
      { key: "disponible",    label: "¿Sientes que hoy puedes pedir lo que quieres?", type: "choice",  options: ["Sí, con facilidad", "A veces, depende", "Me cuesta mucho", "No, casi nunca"] },
    ],
  },

  virtudes_defectos: {
    id:          "virtudes_defectos",
    title:       "Virtudes y Áreas de Mejora",
    icon:        "⚖️",
    category:    "Autoconocimiento",
    description: "Exploración honesta de fortalezas personales y aspectos a trabajar.",
    fields: [
      { key: "virtudes",      label: "¿Cuáles son tus virtudes o fortalezas?",       type: "textarea", placeholder: "Escribe al menos 5... aunque te cueste creerlas 😊" },
      { key: "evidencia",     label: "Elige una virtud y da un ejemplo real de cuándo la mostraste", type: "textarea", placeholder: "No tiene que ser algo grande..." },
      { key: "mejora",        label: "¿Qué áreas de ti mismo/a te gustaría mejorar?", type: "textarea", placeholder: "Sin juzgarte, con honestidad..." },
      { key: "paso",          label: "Elige un área de mejora: ¿cuál sería el paso más pequeño que podrías dar esta semana?", type: "textarea", placeholder: "Algo concreto y alcanzable..." },
    ],
  },

  bienestar_personal: {
    id:          "bienestar_personal",
    title:       "Cosas para Sentirme Bien",
    icon:        "🌿",
    category:    "Bienestar",
    description: "Inventario personal de actividades y recursos que generan bienestar.",
    fields: [
      { key: "cosas_bien",    label: "¿Qué cosas te hacen sentir bien contigo mismo/a?", type: "textarea", placeholder: "Actividades, lugares, rutinas, pequeños momentos..." },
      { key: "frecuencia",    label: "¿Con qué frecuencia haces esas cosas?",         type: "choice",  options: ["Casi todos los días", "Algunas veces a la semana", "Rara vez", "Casi nunca"] },
      { key: "barrera",       label: "¿Qué te impide hacerlas más seguido?",          type: "textarea", placeholder: "Tiempo, energía, culpa, no sé..." },
      { key: "compromiso",    label: "Elige UNA cosa de la lista y comprométete a hacerla antes de la próxima sesión. ¿Cuál será?", type: "text", placeholder: "Escribe aquí tu compromiso..." },
    ],
  },

  actividades_sociales: {
    id:          "actividades_sociales",
    title:       "Cosas que Disfruto con los Demás",
    icon:        "🤝",
    category:    "Relaciones",
    description: "Exploración de vínculos positivos y actividades compartidas significativas.",
    fields: [
      { key: "actividades",   label: "¿Qué cosas disfrutas hacer con otras personas?", type: "textarea", placeholder: "Comer, platicar, ver películas, hacer ejercicio juntos..." },
      { key: "con_quien",     label: "¿Con quién(es) te sientes más cómodo/a siendo tú mismo/a?", type: "textarea", placeholder: "Puedes escribir el nombre o simplemente 'mi amiga', 'mi hermano'..." },
      { key: "ultima_vez",    label: "¿Cuándo fue la última vez que hiciste algo que disfrutaras con alguien?", type: "textarea", placeholder: "¿Cómo te sentiste?" },
      { key: "quiero_mas",    label: "¿Hay algo que te gustaría hacer más seguido con otros?", type: "textarea", placeholder: "Sin importar si se ve 'posible' o no ahora mismo..." },
    ],
  },

  autobiografia: {
    id:          "autobiografia",
    title:       "Autobiografía: Logros y Metas",
    icon:        "📖",
    category:    "Crecimiento Personal",
    description: "Narrativa personal de logros alcanzados y sueños por cumplir.",
    fields: [
      { key: "logros",        label: "¿Qué cosas has logrado en tu vida de las que te sientas orgulloso/a?", type: "textarea", placeholder: "Pueden ser grandes o pequeñas. Todo cuenta..." },
      { key: "supero",        label: "¿Qué obstáculo o momento difícil has superado?", type: "textarea", placeholder: "¿Qué aprendiste de eso?" },
      { key: "metas",         label: "¿Qué te gustaría lograr en los próximos años?", type: "textarea", placeholder: "En cualquier área: personal, profesional, relaciones, salud..." },
      { key: "primera_meta",  label: "Si tuvieras que elegir una meta para empezar, ¿cuál sería y por qué?", type: "textarea", placeholder: "La que más te emocione o la que más necesites..." },
      { key: "recurso",       label: "¿Qué cualidad tuya te puede ayudar a alcanzarla?", type: "text",     placeholder: "Una fortaleza que ya tienes..." },
    ],
  },

};

/** Retorna todas las plantillas como array */
export const TEMPLATES_LIST = Object.values(TASK_TEMPLATES);

/** Retorna una plantilla por id */
export const getTemplate = (id) => TASK_TEMPLATES[id] || null;

/** Categorías únicas */
export const TASK_CATEGORIES = [...new Set(TEMPLATES_LIST.map(t => t.category))];
