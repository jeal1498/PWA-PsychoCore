import { fmt, daysAgo, daysAhead, todayDate } from "./utils.js";

export const SAMPLE_PATIENTS = [
  { id:"p1", name:"María González López",  age:34, phone:"998-123-4567", email:"maria@email.com",   diagnosis:"Trastorno de Ansiedad Generalizada",  reason:"Episodios de ansiedad recurrentes, dificultad para dormir", notes:"Paciente motivada, buen pronóstico",          createdAt:daysAgo(120) },
  { id:"p2", name:"Carlos Ramírez Torres", age:28, phone:"998-234-5678", email:"carlos@email.com",  diagnosis:"Depresión Mayor — Episodio moderado",   reason:"Aislamiento social, pérdida de trabajo",                   notes:"Requiere seguimiento semanal",               createdAt:daysAgo(60)  },
  { id:"p3", name:"Sofía Morales Vega",    age:42, phone:"998-345-6789", email:"sofia@email.com",   diagnosis:"TDAH — Tipo combinado",                 reason:"Dificultades de concentración en trabajo y hogar",         notes:"Evaluación neuropsicológica pendiente",     createdAt:daysAgo(30)  },
  { id:"p4", name:"Roberto Sánchez Cruz",  age:19, phone:"998-456-7890", email:"roberto@email.com", diagnosis:"En evaluación — Posible TOC",            reason:"Pensamientos intrusivos, rituales compulsivos",            notes:"Primera generación universitaria, alto estrés", createdAt:daysAgo(14) },
];

export const SAMPLE_APPOINTMENTS = [
  { id:"a1", patientId:"p1", patientName:"María González López",  date:daysAgo(7),      time:"10:00", type:"Seguimiento",     status:"completada" },
  { id:"a2", patientId:"p2", patientName:"Carlos Ramírez Torres", date:daysAgo(5),      time:"11:30", type:"Seguimiento",     status:"completada" },
  { id:"a3", patientId:"p3", patientName:"Sofía Morales Vega",    date:daysAgo(2),      time:"09:00", type:"Evaluación",      status:"completada" },
  { id:"a4", patientId:"p1", patientName:"María González López",  date:fmt(todayDate),  time:"10:00", type:"Seguimiento",     status:"pendiente"  },
  { id:"a5", patientId:"p4", patientName:"Roberto Sánchez Cruz",  date:fmt(todayDate),  time:"12:00", type:"Primera consulta",status:"pendiente"  },
  { id:"a6", patientId:"p2", patientName:"Carlos Ramírez Torres", date:daysAhead(3),    time:"11:30", type:"Seguimiento",     status:"pendiente"  },
  { id:"a7", patientId:"p3", patientName:"Sofía Morales Vega",    date:daysAhead(5),    time:"09:00", type:"Seguimiento",     status:"pendiente"  },
];

export const SAMPLE_SESSIONS = [
  { id:"s1", patientId:"p1", patientName:"María González López",  date:daysAgo(21), duration:50, mood:"moderado", progress:"bueno",     notes:"Trabajamos técnicas de respiración diafragmática. La paciente reporta menor frecuencia de ataques. Se asignó diario de pensamientos.", tags:["ansiedad","respiración"] },
  { id:"s2", patientId:"p1", patientName:"María González López",  date:daysAgo(14), duration:50, mood:"bueno",    progress:"excelente", notes:"Revisión del diario de pensamientos. Identifica patrones cognitivos negativos. Introducción a reestructuración cognitiva.",             tags:["TCC","cognición"]        },
  { id:"s3", patientId:"p2", patientName:"Carlos Ramírez Torres", date:daysAgo(12), duration:50, mood:"bajo",     progress:"moderado",  notes:"Resistencia a activación conductual. Exploración de creencias nucleares sobre fracaso. Psicoeducación sobre depresión.",               tags:["depresión","creencias"]  },
  { id:"s4", patientId:"p3", patientName:"Sofía Morales Vega",    date:daysAgo(9),  duration:60, mood:"bueno",    progress:"bueno",     notes:"Aplicación de Conners 3 completada. Discusión de estrategias de organización. La paciente mostró buena disposición.",                  tags:["TDAH","evaluación"]      },
  { id:"s5", patientId:"p1", patientName:"María González López",  date:daysAgo(7),  duration:50, mood:"bueno",    progress:"excelente", notes:"Consolidación de habilidades. Paciente reporta 80% de reducción en episodios. Iniciamos trabajo en asertividad.",                       tags:["asertividad","progreso"] },
  { id:"s6", patientId:"p2", patientName:"Carlos Ramírez Torres", date:daysAgo(5),  duration:50, mood:"moderado", progress:"bueno",     notes:"Avance notable. Retomó contacto con amigos. Planificación de actividades de placer para la semana.",                                    tags:["activación","social"]    },
];

export const SAMPLE_PAYMENTS = [
  { id:"pay1", patientId:"p1", patientName:"María González López",  date:daysAgo(21),    amount:900,  concept:"Sesión individual",           method:"Transferencia", status:"pagado"    },
  { id:"pay2", patientId:"p1", patientName:"María González López",  date:daysAgo(14),    amount:900,  concept:"Sesión individual",           method:"Efectivo",      status:"pagado"    },
  { id:"pay3", patientId:"p2", patientName:"Carlos Ramírez Torres", date:daysAgo(12),    amount:900,  concept:"Sesión individual",           method:"Transferencia", status:"pagado"    },
  { id:"pay4", patientId:"p3", patientName:"Sofía Morales Vega",    date:daysAgo(9),     amount:1500, concept:"Evaluación neuropsicológica", method:"Transferencia", status:"pagado"    },
  { id:"pay5", patientId:"p1", patientName:"María González López",  date:daysAgo(7),     amount:900,  concept:"Sesión individual",           method:"Efectivo",      status:"pagado"    },
  { id:"pay6", patientId:"p2", patientName:"Carlos Ramírez Torres", date:daysAgo(5),     amount:900,  concept:"Sesión individual",           method:"Transferencia", status:"pagado"    },
  { id:"pay7", patientId:"p4", patientName:"Roberto Sánchez Cruz",  date:fmt(todayDate), amount:1200, concept:"Primera consulta (90 min)",   method:"Pendiente",     status:"pendiente" },
];

export const SAMPLE_RESOURCES = [
  { id:"r1", title:"Registro de Pensamientos ABC",     type:"Ejercicio",      description:"Formulario para identificar situaciones, emociones y pensamientos automáticos. Ideal para TCC.",         tags:["TCC","cognición"],         url:"" },
  { id:"r2", title:"Técnica de Respiración 4-7-8",     type:"Técnica",        description:"Guía paso a paso de la respiración 4-7-8 para manejo de ansiedad aguda.",                                tags:["ansiedad","relajación"],   url:"" },
  { id:"r3", title:"Escala de Activación Conductual",  type:"Evaluación",     description:"Registro semanal de actividades y estado de ánimo para pacientes con depresión.",                        tags:["depresión","conductual"],  url:"" },
  { id:"r4", title:"Psicoeducación TDAH para adultos", type:"Psicoeducación", description:"Material informativo sobre síntomas, fortalezas y estrategias de manejo para TDAH en adultos.",          tags:["TDAH","psicoeducación"],  url:"" },
];

export const DEFAULT_PROFILE = {
  name: "",
  specialty: "",
  cedula: "",
  phone: "",
  email: "",
  clinic: "",
  initials: "",
};
