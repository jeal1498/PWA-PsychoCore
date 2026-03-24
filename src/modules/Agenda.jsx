import { useState, useMemo, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Trash2, Check, Plus, FileText, LayoutGrid, List, Clock, Repeat, MessageCircle, BookOpen, AlertTriangle, CalendarDays } from "lucide-react";
import { T, MONTHS_ES, DAYS_ES } from "../theme.js";
import { uid, todayDate, fmt, fmtDate } from "../utils.js";
import { Card, Modal, Input, Select, Btn, Badge, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import DynamicSummary from "../components/DynamicSummary.jsx";

// ── Configuración de estados de cita (Sección 2.6 y 4 del Flujo Clínico) ─────
const STATUS_CONFIG = {
  pendiente:          { label:"Pendiente",            color:T.war,  bg:T.warA  },
  completada:         { label:"Completada",           color:T.suc,  bg:T.sucA  },
  cancelada_paciente: { label:"Cancelada (paciente)", color:T.tl,   bg:T.bdrL  },
  cancelada_psicologa:{ label:"Cancelada (psicóloga)",color:"#6B5B9E", bg:"rgba(107,91,158,0.1)" },
  no_presentado:      { label:"No presentado",        color:"#C4622A", bg:"rgba(196,98,42,0.1)" },
};

// ── WhatsApp reminder ────────────────────────────────────────────────────────
const whatsappReminder = (appointment, patient, profile) => {
  const nombre    = patient?.name?.split(" ")[0] || appointment.patientName?.split(" ")[0] || "";
  const phone     = patient?.phone?.replace(/\D/g, "");
  const fecha     = fmtDate(appointment.date);
  const hora      = appointment.time;
  const tipo      = appointment.type || "consulta";
  const psicologa = profile?.name?.split(" ")[0] || "tu psicóloga";
  const clinica   = profile?.clinic ? ` en ${profile.clinic}` : "";

  if (!phone) return null;

  const msg = encodeURIComponent(
    `Hola ${nombre} 👋\n\nTe escribo para recordarte tu cita de *${tipo}* programada para:\n\n📅 *${fecha}* a las *${hora}*${clinica}\n\nSi necesitas reagendar o tienes alguna duda, no dudes en escribirme.\n\n¡Hasta pronto! 😊\n— ${psicologa}`
  );
  return `https://wa.me/52${phone}?text=${msg}`;
};

// ── Weekly availability helpers ───────────────────────────────────────────────
const WORK_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19];

// ── Mejora 1: horas para la Vista Día (08:00–20:00) ─────────────────────────
const DAY_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19,20];

// ── Schedule helpers ──────────────────────────────────────────────────────────
/**
 * Genera slots de 30 min dentro del horario configurado.
 * Fallback: 08:00–20:00 si no hay configuración.
 */
function buildTimeSlots(profile) {
  const start = profile?.workingStart;
  const end   = profile?.workingEnd;
  if (!start || !end || start >= end) {
    // Fallback 08:00–20:00
    const slots = [];
    for (let m = 8 * 60; m < 20 * 60; m += 30) {
      slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return slots;
  }
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  const slots = [];
  for (let m = startMin; m < endMin; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots.length > 0 ? slots : (() => {
    const fb = [];
    for (let m = 8 * 60; m < 20 * 60; m += 30)
      fb.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    return fb;
  })();
}

/**
 * Devuelve true si la hora (número entero) cae dentro del horario laboral configurado.
 */
function isHourActive(hour, profile) {
  const start = profile?.workingStart;
  const end   = profile?.workingEnd;
  if (!start || !end) return true; // sin configuración → todo activo
  const startH = parseInt(start.split(":")[0]);
  const endH   = parseInt(end.split(":")[0]);
  return hour >= startH && hour < endH;
}

function getWeekDays(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const nd = new Date(monday);
    nd.setDate(monday.getDate() + i);
    return nd;
  });
}

function apptHour(time) { return parseInt(time?.split(":")?.[0] || "0"); }

// ── Generate recurring appointments ──────────────────────────────────────────
function generateRecurring(base, frequency, occurrences, pt) {
  const results = [];
  const groupId = "rg" + uid();
  const [y, m, d] = base.date.split("-").map(Number);
  let current = new Date(y, m - 1, d);

  const stepDays = { semanal: 7, quincenal: 14, mensual: null };

  for (let i = 0; i < occurrences; i++) {
    const dateStr = fmt(current);
    results.push({
      ...base,
      id: "a" + uid(),
      date: dateStr,
      patientName: pt?.name || "",
      recurrenceGroupId: groupId,
      isRecurring: true,
    });

    if (frequency === "mensual") {
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    } else {
      current.setDate(current.getDate() + stepDays[frequency]);
    }
  }
  return results;
}

// ── Weekly view ───────────────────────────────────────────────────────────────
// Recibe `profile` para marcar visualmente las horas fuera de horario
function WeeklyView({ appointments, weekAnchor, setWeekAnchor, onOpenQuick, today, profile }) {
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);
  const todayStr = fmt(today);

  const apptMap = useMemo(() => {
    const map = {};
    const weekFmts = weekDays.map(d => fmt(d));
    appointments.filter(a => weekFmts.includes(a.date)).forEach(a => {
      const key = `${a.date}_${apptHour(a.time)}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments, weekDays]);

  const prevWeek = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); };
  const nextWeek = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); };
  const thisWeek = () => setWeekAnchor(new Date(today));

  const startStr = weekDays[0].toLocaleDateString("es-MX", { day:"numeric", month:"short" });
  const endStr   = weekDays[5].toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" });
  const busySlots = Object.keys(apptMap).length;

  const activeHours = new Set();
  Object.keys(apptMap).forEach(key => {
    const h = parseInt(key.split("_")[1]);
    activeHours.add(h - 1);
    activeHours.add(h);
    activeHours.add(h + 1);
  });
  const visibleHours = busySlots > 0
    ? WORK_HOURS.filter(h => activeHours.has(h))
    : WORK_HOURS.filter(h => h >= 9 && h <= 18);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={prevWeek} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:7, cursor:"pointer", color:T.tm }}><ChevronLeft size={15}/></button>
          <span style={{ fontFamily:T.fH, fontSize:17, color:T.t }}>{startStr} — {endStr}</span>
          <button onClick={nextWeek} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:7, cursor:"pointer", color:T.tm }}><ChevronRight size={15}/></button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {busySlots > 0 && (
            <span style={{ fontFamily:T.fB, fontSize:12, color:T.p, background:T.pA,
              padding:"3px 10px", borderRadius:9999, fontWeight:600 }}>
              {busySlots} cita{busySlots !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={thisWeek}
            style={{ fontFamily:T.fB, fontSize:12, color:T.tm, background:T.bdrL,
              border:"none", borderRadius:9999, padding:"3px 12px", cursor:"pointer", fontWeight:600 }}>
            Hoy
          </button>
        </div>
      </div>

      <div style={{ position:"relative" }}>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ minWidth:480 }}>
            {/* Cabecera de días */}
            <div style={{ display:"grid", gridTemplateColumns:"44px repeat(6, 1fr)", gap:3, marginBottom:4, position:"sticky", top:0, background:T.card, zIndex:1 }}>
              <div/>
              {weekDays.map((d, i) => {
                const ds = fmt(d);
                const isToday = ds === todayStr;
                const dayCitas = Object.keys(apptMap).filter(k => k.startsWith(ds)).length;
                return (
                  <div key={i} style={{ textAlign:"center", padding:"5px 2px", borderRadius:8,
                    background:isToday ? T.pA : "transparent" }}>
                    <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.tl, letterSpacing:"0.06em" }}>
                      {["LUN","MAR","MIÉ","JUE","VIE","SÁB"][i]}
                    </div>
                    <div style={{ fontFamily:T.fH, fontSize:17, color:isToday?T.p:T.t, fontWeight:isToday?600:400, lineHeight:1.2 }}>
                      {d.getDate()}
                    </div>
                    {dayCitas > 0 && (
                      <div style={{ width:5, height:5, borderRadius:"50%", background:isToday?"#fff":T.acc,
                        margin:"2px auto 0" }}/>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Filas de horas — solo las activas */}
            {visibleHours.map((hour, idx) => {
              const prevHour = visibleHours[idx - 1];
              const hasGap = prevHour !== undefined && hour - prevHour > 1;
              // ── Indicador 4: hora fuera del horario configurado ──────────
              const inactive = !isHourActive(hour, profile);
              return (
                <div key={hour}>
                  {hasGap && (
                    <div style={{ display:"grid", gridTemplateColumns:"44px repeat(6, 1fr)", gap:3, marginBottom:3 }}>
                      <div style={{ fontFamily:T.fB, fontSize:9, color:T.tl, textAlign:"right", paddingRight:6, paddingTop:4 }}>···</div>
                      {weekDays.map((_, di) => (
                        <div key={di} style={{ height:8, background:T.bdrL+"33", borderRadius:4 }}/>
                      ))}
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"44px repeat(6, 1fr)", gap:3, marginBottom:3 }}>
                    <div style={{ fontFamily:T.fB, fontSize:10,
                      color: inactive ? T.tl : T.tl,
                      paddingTop:5, textAlign:"right", paddingRight:6,
                      opacity: inactive ? 0.5 : 1 }}>
                      {hour}:00
                    </div>
                    {weekDays.map((d, di) => {
                      const key = `${fmt(d)}_${hour}`;
                      const slot = apptMap[key];
                      const isToday = fmt(d) === todayStr;
                      if (slot) {
                        return (
                          <div key={di} onClick={() => onOpenQuick(slot[0])}
                            style={{ background:T.p, borderRadius:8, padding:"5px 5px",
                              minHeight:36, cursor:"pointer", transition:"opacity .13s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                            onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                            {slot.map(a => (
                              <div key={a.id} style={{ fontFamily:T.fB, fontSize:10, color:"#fff",
                                fontWeight:600, lineHeight:1.3, display:"flex", alignItems:"center", gap:2,
                                overflow:"hidden" }}>
                                {a.isRecurring && <Repeat size={7} style={{ opacity:0.7, flexShrink:0 }}/>}
                                {/* ── Mejora 2: indicador compacto en Vista Semana ─────── */}
                                {a.reminderSent && (
                                  <Check size={7} color="#25D366" style={{ flexShrink:0 }}/>
                                )}
                                <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {a.patientName.split(" ")[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      // ── Slot vacío: fondo diferente si está fuera de horario ─
                      return (
                        <div key={di} style={{
                          background: inactive
                            ? T.bdrL          // fondo apagado para horas inactivas
                            : isToday ? "rgba(58,107,110,0.03)" : "transparent",
                          borderRadius:8, minHeight:36,
                          border:`1px solid ${inactive ? T.bdrL : T.bdrL}`,
                          opacity: inactive ? 0.55 : 1,
                        }}/>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
          background:`linear-gradient(90deg, transparent, ${T.card})`,
          width:24, height:"100%", pointerEvents:"none" }}/>
      </div>
    </div>
  );
}

// ── Mejora 1: Vista Día ───────────────────────────────────────────────────────
function DayView({ appointments, selectedDayView, setSelectedDayView, onOpenQuick, onOpenStatusModal, onConfirmDelete, onNewAppt, patients, profile, markReminderSent, today }) {
  const todayStr = fmt(today);

  const dayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === selectedDayView)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDayView]
  );

  const apptByHour = useMemo(() => {
    const map = {};
    dayAppts.forEach(a => {
      const h = apptHour(a.time);
      if (!map[h]) map[h] = [];
      map[h].push(a);
    });
    return map;
  }, [dayAppts]);

  const prevDay = () => {
    const d = new Date(selectedDayView + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDayView(fmt(d));
  };
  const nextDay = () => {
    const d = new Date(selectedDayView + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDayView(fmt(d));
  };
  const goToday = () => setSelectedDayView(fmt(today));

  const isToday   = selectedDayView === todayStr;
  const dateObj   = new Date(selectedDayView + "T12:00:00");
  const dayLabel  = dateObj.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <Card style={{ padding:24 }}>
      {/* ── Navegación de día ─── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={prevDay} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:7, cursor:"pointer", color:T.tm }}>
            <ChevronLeft size={15}/>
          </button>
          <span style={{ fontFamily:T.fH, fontSize:17, color:isToday ? T.p : T.t, textTransform:"capitalize" }}>
            {dayLabel}
          </span>
          <button onClick={nextDay} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:7, cursor:"pointer", color:T.tm }}>
            <ChevronRight size={15}/>
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {dayAppts.length > 0 && (
            <span style={{ fontFamily:T.fB, fontSize:12, color:T.p, background:T.pA,
              padding:"3px 10px", borderRadius:9999, fontWeight:600 }}>
              {dayAppts.length} cita{dayAppts.length !== 1 ? "s" : ""}
            </span>
          )}
          {!isToday && (
            <button onClick={goToday}
              style={{ fontFamily:T.fB, fontSize:12, color:T.tm, background:T.bdrL,
                border:"none", borderRadius:9999, padding:"3px 12px", cursor:"pointer", fontWeight:600 }}>
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline de horas ─── */}
      <div>
        {DAY_HOURS.map(hour => {
          const slot     = apptByHour[hour];
          const hasAppts = slot && slot.length > 0;
          const timeStr  = `${String(hour).padStart(2, "0")}:00`;

          return (
            <div key={hour} style={{ display:"flex", gap:12, alignItems:"flex-start",
              borderBottom:`1px solid ${T.bdrL}33`, minHeight: hasAppts ? "auto" : 44 }}>

              {/* Etiqueta de hora */}
              <div style={{ width:44, flexShrink:0, paddingTop:13, fontFamily:T.fB,
                fontSize:11, color:T.tl, textAlign:"right" }}>
                {timeStr}
              </div>

              {/* Contenido */}
              <div style={{ flex:1, paddingTop: hasAppts ? 8 : 0, paddingBottom: hasAppts ? 8 : 0 }}>
                {hasAppts ? (
                  slot.map(a => {
                    const pt   = patients.find(p => p.id === a.patientId);
                    const url  = !a.reminderSent && a.status !== "completada"
                      ? whatsappReminder(a, pt, profile)
                      : null;
                    const scfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendiente;
                    return (
                      <div key={a.id} style={{ padding:"12px 14px", borderRadius:12, background:T.cardAlt,
                        marginBottom:6, border:`1px solid ${T.bdrL}` }}>

                        {/* Fila principal: info + estado + eliminar */}
                        <div style={{ display:"flex", alignItems:"center", gap:10,
                          marginBottom: a.status !== "completada" ? 10 : 0 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t,
                              display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <span style={{ fontFamily:T.fB, fontSize:12, color:T.p, fontWeight:700 }}>
                                {a.time}
                              </span>
                              {a.patientName.split(" ").slice(0, 2).join(" ")}
                              {a.isRecurring && (
                                <span style={{ display:"inline-flex", alignItems:"center", gap:3,
                                  padding:"1px 7px", borderRadius:9999, background:T.pA, color:T.p,
                                  fontSize:10, fontWeight:700 }}>
                                  <Repeat size={9}/>Serie
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2 }}>
                              {a.type}
                              {a.modality ? ` · ${a.modality === "presencial" ? "🏢 Presencial" : "💻 Virtual"}` : ""}
                            </div>
                          </div>
                          <button onClick={() => onOpenStatusModal(a)}
                            style={{ background:scfg.bg, border:"none", borderRadius:8, padding:"4px 10px",
                              cursor:"pointer", fontSize:11, fontFamily:T.fB, color:scfg.color,
                              fontWeight:600, maxWidth:140, whiteSpace:"nowrap",
                              overflow:"hidden", textOverflow:"ellipsis" }}>
                            {scfg.label}
                          </button>
                          <button onClick={() => onConfirmDelete(a)}
                            style={{ background:"none", border:"none", color:T.tl, cursor:"pointer" }}>
                            <Trash2 size={13}/>
                          </button>
                        </div>

                        {/* Botones de acción */}
                        {a.status !== "completada" && (
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={() => onOpenQuick(a)}
                              style={{ flex:1, display:"flex", alignItems:"center", gap:6,
                                padding:"8px 12px", borderRadius:8, border:`1.5px solid ${T.p}`,
                                background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12,
                                fontWeight:600, cursor:"pointer", justifyContent:"center", transition:"all .15s" }}
                              onMouseEnter={e => { e.currentTarget.style.background=T.p; e.currentTarget.style.color="#fff"; }}
                              onMouseLeave={e => { e.currentTarget.style.background=T.pA; e.currentTarget.style.color=T.p; }}>
                            <FileText size={13}/> Abrir
                            </button>

                            {/* ── Mejora 2: indicador / botón recordatorio en Vista Día ── */}
                            {a.reminderSent ? (
                              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px",
                                borderRadius:8, border:"1.5px solid #25D36640", background:"#25D36615",
                                color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600 }}>
                                <Check size={12}/> Recordatorio enviado
                              </div>
                            ) : url ? (
                              <a href={url} target="_blank" rel="noreferrer"
                                onClick={() => markReminderSent(a.id)}
                                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px",
                                  borderRadius:8, border:"1.5px solid #25D366", background:"#25D36620",
                                  color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600,
                                  cursor:"pointer", textDecoration:"none", transition:"all .15s" }}>
                                <MessageCircle size={13}/> Recordatorio
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Slot vacío — clic para nueva cita con fecha/hora pre-rellenadas */
                  <div
                    onClick={() => onNewAppt(selectedDayView, timeStr)}
                    style={{ minHeight:44, cursor:"pointer", borderRadius:8, transition:"background .12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.pA; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteConfirm({ appt, onDeleteOne, onDeleteAll, onCancel }) {
  if (!appt) return null;
  return (
    <Modal open={!!appt} onClose={onCancel} title="Eliminar cita" width={420}>
      <div style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, marginBottom:20, lineHeight:1.6 }}>
        <strong>{appt.patientName?.split(" ").slice(0,2).join(" ")}</strong> — {fmtDate(appt.date)} · {appt.time}
        {appt.isRecurring && (
          <div style={{ marginTop:10, padding:"10px 14px", background:T.warA, borderRadius:10, color:T.war, fontSize:13, fontWeight:500 }}>
            Esta cita forma parte de una serie recurrente.
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
        <Btn onClick={onDeleteOne}>Eliminar solo esta cita</Btn>
        {appt.isRecurring && (
          <Btn variant="danger" onClick={onDeleteAll}>Eliminar toda la serie</Btn>
        )}
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Main Agenda component ─────────────────────────────────────────────────────
export default function Agenda({ appointments = [], setAppointments, sessions = [], setSessions, patients = [], profile, autoOpen, services = [], onNavigate, riskAssessments = [], scaleResults = [], treatmentPlans = [], interSessions = [], taskAssignments = [] }) {
  const [view,          setView]          = useState("month");
  const [current,       setCurrent]       = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [weekAnchor,    setWeekAnchor]    = useState(new Date(todayDate));
  const [showAdd,       setShowAdd]       = useState(false);
  const [calCollapsed,  setCalCollapsed]  = useState(false);

  // ── Mejora 1: estado del día seleccionado para Vista Día ─────────────────
  const [selectedDayView, setSelectedDayView] = useState(fmt(todayDate));

  // ── Mejora 3: sugerencia de siguiente cita ───────────────────────────────
  const [nextApptSuggestion, setNextApptSuggestion] = useState(null);

  useEffect(() => {
    if (autoOpen === "add") setShowAdd(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!showAdd) { setShowModalityPicker(false); return; }
    const opt = appointmentTypeOptions.find(o => (o.label || o) === form.type);
    const svc = opt?.serviceId ? services.find(s => s.id === opt.serviceId) : null;
    if (svc?.modality === "ambas" && !form.modality) {
      setShowModalityPicker(true);
    }
  }, [showAdd]);

  const [selectedDay,   setSelectedDay]   = useState(null);
  const [quickSession,  setQuickSession]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  // ── Punto de entrada inteligente — Resumen / Admisión ───────────────────────
  const [summaryTarget,  setSummaryTarget]  = useState(null); // { patient, appointment }
  const [admisionTarget, setAdmisionTarget] = useState(null); // { appt, patient }

  // ── Cancelaciones / cambio de estado (Sección 4 del Flujo Clínico) ─────────
  const [statusTarget,  setStatusTarget]  = useState(null);
  const [statusForm,    setStatusForm]    = useState({ status:"", motivo:"", reagendar:false, newDate:"", newTime:"" });
  const sfStatus = k => v => setStatusForm(f => ({ ...f, [k]: v }));

  const openStatusModal = (appt) => {
    setStatusTarget(appt);
    setStatusForm({ status: appt.status || "pendiente", motivo:"", reagendar:false,
      newDate: fmt(todayDate), newTime: appt.time || "09:00" });
  };

  const saveStatus = () => {
    if (!statusTarget) return;
    setAppointments(prev => prev.map(a => {
      if (a.id !== statusTarget.id) return a;
      const updated = { ...a, status: statusForm.status, cancelMotivo: statusForm.motivo };
      return updated;
    }));
    if (statusForm.reagendar && statusForm.newDate) {
      const newAppt = {
        ...statusTarget,
        id:      "a" + uid(),
        date:    statusForm.newDate,
        time:    statusForm.newTime,
        status:  "pendiente",
        isRecurring: false,
        recurrenceGroupId: null,
        cancelMotivo: null,
      };
      setAppointments(prev => [...prev, newAppt]);
    }
    setStatusTarget(null);
  };

  const whatsappCancel = (appt, patient) => {
    const nombre    = patient?.name?.split(" ")[0] || "";
    const phone     = patient?.phone?.replace(/\D/g, "");
    const fecha     = fmtDate(appt.date);
    const psicologa = profile?.name?.split(" ")[0] || "tu psicóloga";
    if (!phone) return null;
    const msg = encodeURIComponent(
      `Hola ${nombre} 🙏\n\nLamentamos informarte que necesitamos reprogramar tu sesión del *${fecha}*. Por favor escríbenos para coordinar una nueva fecha. Disculpa los inconvenientes.\n\n— ${psicologa}`
    );
    return `https://wa.me/52${phone}?text=${msg}`;
  };

  // Build type options from services + clinical fallback
  const SERVICE_TYPE_LABEL = { sesion:"Sesión individual", evaluacion:"Evaluación", pareja:"Terapia de pareja", grupo:"Grupo / Taller", otro:"Otro" };
  const CLINICAL_FALLBACK = ["Primera consulta","Seguimiento","Evaluación","Crisis","Cierre","Seguimiento post-alta"];
  const appointmentTypeOptions = services.length > 0
    ? services.filter(s => s.type !== "paquete").map(s => ({ label: s.name || SERVICE_TYPE_LABEL[s.type] || s.type, serviceId: s.id, modality: s.modality }))
    : CLINICAL_FALLBACK.map(t => ({ label: t, serviceId: null, modality: null }));

  const blankForm = { patientId:"", date:fmt(todayDate), time:"09:00", type: appointmentTypeOptions[0]?.label || "Seguimiento", serviceId:"", modality:"", status:"pendiente" };
  const [form, setForm] = useState(blankForm);
  const [showModalityPicker, setShowModalityPicker] = useState(false);

  // ── Validación de fecha y conflicto ──────────────────────────────────────
  const [dateError,     setDateError]     = useState("");
  const [conflictError, setConflictError] = useState("");

  // Slots horarios derivados del perfil
  const timeSlots = useMemo(() => buildTimeSlots(profile), [profile?.workingStart, profile?.workingEnd]);

  // Manejador de cambio de fecha con validación de días hábiles
  const handleDateChange = (value) => {
    setDateError("");
    if (!value) { fld("date")(""); return; }
    const workingDays = profile?.workingDays ?? [1,2,3,4,5];
    if (workingDays.length > 0) {
      const dayOfWeek = new Date(value + "T12:00:00").getDay();
      if (!workingDays.includes(dayOfWeek)) {
        setDateError("Este día no está en tu horario de trabajo. Ajusta tu horario en Configuración si necesitas hacer una excepción.");
        fld("date")("");
        return;
      }
    }
    fld("date")(value);
  };

  // Manejador de cambio de hora — limpia el error de conflicto
  const handleTimeChange = (value) => {
    setConflictError("");
    fld("time")(value);
  };

  const handleTypeChange = (label) => {
    const opt = appointmentTypeOptions.find(o => (o.label || o) === label);
    const svc = opt?.serviceId ? services.find(s => s.id === opt.serviceId) : null;
    if (svc?.modality === "ambas") {
      setForm(f => ({ ...f, type: label, serviceId: svc.id, modality: "" }));
      setShowModalityPicker(true);
    } else {
      setForm(f => ({ ...f, type: label, serviceId: svc?.id || "", modality: svc?.modality || "" }));
      setShowModalityPicker(false);
    }
  };

  // Recurrence state
  const [recurring,      setRecurring]      = useState(false);
  const [recFrequency,   setRecFrequency]   = useState("semanal");
  const [recOccurrences, setRecOccurrences] = useState(8);

  const [sessionForm, setSessionForm] = useState({ duration:50, mood:"moderado", progress:"bueno", notes:"", tags:"" });
  const fld  = k => v => setForm(f => ({ ...f, [k]: v }));
  const sfld = k => v => setSessionForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();

  const year = current.getFullYear(), month = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - firstDay + 1;
    return (d >= 1 && d <= daysInMonth) ? String(d).padStart(2, "0") : null;
  });

  const todayStr = fmt(todayDate);
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const apptsByDay = useMemo(() => {
    const map = {};
    appointments.filter(a => a.date.startsWith(monthStr)).forEach(a => {
      const d = a.date.split("-")[2];
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [appointments, monthStr]);

  const dayAppts      = selectedDay ? (apptsByDay[selectedDay] || []) : [];
  const upcomingAppts = [...appointments].filter(a => a.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 8);

  const recurringCount = useMemo(() => {
    const groups = new Set(appointments.filter(a => a.isRecurring).map(a => a.recurrenceGroupId));
    return groups.size;
  }, [appointments]);

  // ── Mejora 2: marcar recordatorio enviado ───────────────────────────────
  const markReminderSent = (id) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, reminderSent: true } : a));
  };

  // ── Mejora 1: abrir modal de nueva cita con fecha/hora pre-rellenadas ───
  const openAddWithPreset = (date, time) => {
    setForm(f => ({ ...f, date, time }));
    setShowAdd(true);
  };

  // ── Mejora 3: guardar cita con lógica de sugerencia ──────────────────────
  const save = () => {
    if (!form.patientId || !form.date) return;

    // ── Validación de conflicto de horario ────────────────────────────────
    if (!recurring) {
      const conflict = appointments.find(a => a.date === form.date && a.time === form.time);
      if (conflict) {
        const conflictName = conflict.patientName?.split(" ").slice(0, 2).join(" ") || "otro paciente";
        setConflictError(`Ya tienes una cita a esa hora con ${conflictName}. Elige otro horario.`);
        return;
      }
    }

    const pt = patients.find(p => p.id === form.patientId);

    if (recurring) {
      const batch = generateRecurring(form, recFrequency, recOccurrences, pt);
      setAppointments(prev => [...prev, ...batch]);
    } else {
      const newAppt = { ...form, id:"a"+uid(), patientName: pt?.name || "" };
      setAppointments(prev => [...prev, newAppt]);

      // Verificar si hay patrón de misma hora para sugerir siguiente cita
      const patientHistory = appointments.filter(a =>
        a.patientId === form.patientId && !a.isRecurring
      );
      const hasTimePattern = patientHistory.some(a => a.time === form.time);

      if (hasTimePattern && patientHistory.length >= 1) {
        const [y, m, d] = form.date.split("-").map(Number);
        const nextDate = new Date(y, m - 1, d);
        nextDate.setDate(nextDate.getDate() + 7);
        setNextApptSuggestion({
          patientId:   form.patientId,
          patientName: pt?.name || "",
          date:        fmt(nextDate),
          time:        form.time,
          type:        form.type,
          serviceId:   form.serviceId,
          modality:    form.modality,
        });
      }
    }

    setForm(blankForm);
    setShowModalityPicker(false);
    setRecurring(false);
    setRecFrequency("semanal");
    setRecOccurrences(8);
    setDateError("");
    setConflictError("");
    setShowAdd(false);
  };

  // ── Mejora 3: confirmar cita sugerida ────────────────────────────────────
  const confirmNextAppt = () => {
    if (!nextApptSuggestion) return;
    setAppointments(prev => [...prev, {
      ...nextApptSuggestion,
      id:     "a" + uid(),
      status: "pendiente",
    }]);
    setNextApptSuggestion(null);
  };

  const confirmDelete = (appt) => setDeleteTarget(appt);

  const deleteOne = () => {
    setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const deleteAll = () => {
    setAppointments(prev => prev.filter(a => a.recurrenceGroupId !== deleteTarget.recurrenceGroupId));
    setDeleteTarget(null);
  };

  const toggle = id => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "completada" ? "pendiente" : "completada" } : a));

  const openQuickSession = (appt) => {
    setQuickSession(appt);
    setSessionForm({ duration:50, mood:"moderado", progress:"bueno", notes:"", tags:"" });
  };

  // ── WhatsApp para consentimiento informado ───────────────────────────────
  const whatsappConsent = (patient) => {
    const nombre   = patient?.name?.split(" ")[0] || "";
    const phone    = patient?.phone?.replace(/\D/g, "");
    const psicologa = profile?.name?.split(" ")[0] || "tu psicóloga";
    if (!phone) return null;
    const msg = encodeURIComponent(
      `Hola ${nombre} 👋\n\nPara iniciar nuestro proceso terapéutico, necesito que firmes el *Consentimiento Informado*. Por favor escríbeme para coordinarlo antes o durante nuestra primera sesión.\n\n¡Gracias! 😊\n— ${psicologa}`
    );
    return `https://wa.me/52${phone}?text=${msg}`;
  };

  // ── Punto de entrada inteligente ─────────────────────────────────────────
  // Detecta si el paciente tiene sesiones previas:
  //   Con sesiones  → abre DynamicSummary (contexto clínico previo a la sesión)
  //   Sin sesiones  → abre modal de Protocolo de Admisión (primera vez)
  const handleOpenAppt = (appt) => {
    const pt = patients.find(p => p.id === appt.patientId);
    const hasSessions = sessions.some(s => s.patientId === appt.patientId);
    if (hasSessions) {
      setSummaryTarget({ patient: pt, appointment: appt });
    } else {
      setAdmisionTarget({ appt, patient: pt });
    }
  };

  const saveQuickSession = () => {
    if (!quickSession || !sessionForm.notes.trim()) return;
    setSessions(prev => [...prev, {
      ...sessionForm, id:"s"+uid(),
      patientId: quickSession.patientId, patientName: quickSession.patientName,
      date: quickSession.date,
      tags: sessionForm.tags.split(",").map(t => t.trim()).filter(Boolean),
    }]);
    toggle(quickSession.id);
    setQuickSession(null);
  };

  const freqLabel = { semanal:"semana", quincenal:"2 semanas", mensual:"mes" };

  return (
    <div>
      <PageHeader title="Agenda"
        subtitle={`${appointments.length} cita${appointments.length!==1?"s":""} registrada${appointments.length!==1?"s":""}${recurringCount > 0 ? ` · ${recurringCount} serie${recurringCount!==1?"s":""} recurrente${recurringCount!==1?"s":""}` : ""}`}
        action={
          <div style={{ display:"flex", gap:8 }}>
            {/* ── Mejora 1: toggle con tres vistas Mes / Semana / Día ── */}
            <div style={{ display:"flex", background:T.bdrL, borderRadius:10, padding:3, gap:2 }}>
              {[
                { id:"month", icon:LayoutGrid, tip:"Mes"    },
                { id:"week",  icon:List,       tip:"Semana" },
                { id:"day",   icon:CalendarDays,tip:"Día"   },
              ].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} title={v.tip}
                  style={{ background:view===v.id?T.card:"transparent", border:"none", borderRadius:8,
                    padding:"6px 10px", cursor:"pointer",
                    color:view===v.id?T.p:T.tl, transition:"all .15s" }}>
                  <v.icon size={15}/>
                </button>
              ))}
            </div>
            <Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Nueva cita</Btn>
          </div>
        }
      />

      {/* ── Vista Semana ────────────────────────────────────────────────────── */}
      {view === "week" && (
        <Card style={{ padding:24 }}>
          <WeeklyView
            appointments={appointments}
            weekAnchor={weekAnchor}
            setWeekAnchor={setWeekAnchor}
            onOpenQuick={handleOpenAppt}
            today={todayDate}
            profile={profile}
          />
        </Card>
      )}

      {/* ── Mejora 1: Vista Día ─────────────────────────────────────────────── */}
      {view === "day" && (
        <DayView
          appointments={appointments}
          selectedDayView={selectedDayView}
          setSelectedDayView={setSelectedDayView}
          onOpenQuick={handleOpenAppt}
          onOpenStatusModal={openStatusModal}
          onConfirmDelete={confirmDelete}
          onNewAppt={openAddWithPreset}
          patients={patients}
          profile={profile}
          markReminderSent={markReminderSent}
          today={todayDate}
        />
      )}

      {/* ── Vista Mes ───────────────────────────────────────────────────────── */}
      {view === "month" && (
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr minmax(0,320px)", gap:20 }}>
          <Card style={{ padding:0, overflow:"hidden" }}>
            {/* Header del calendario */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom: calCollapsed ? "none" : `1px solid ${T.bdrL}` }}>
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tm }}><ChevronLeft size={16}/></button>
              <button onClick={() => isMobile && setCalCollapsed(c => !c)}
                style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor: isMobile ? "pointer" : "default" }}>
                <span style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t }}>{MONTHS_ES[month]} {year}</span>
                {isMobile && <ChevronRight size={14} color={T.tl} style={{ transform: calCollapsed ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .2s" }}/>}
              </button>
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tm }}><ChevronRight size={16}/></button>
            </div>

            <div style={{ display: calCollapsed ? "none" : "block", padding:"16px 20px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
                {DAYS_ES.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.06em", padding:"6px 0" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                {cells.map((d, i) => {
                  if (!d) return <div key={i}/>;
                  const dateStr = `${monthStr}-${d}`;
                  const isToday = dateStr === todayStr;
                  const isSel   = d === selectedDay;
                  const appts   = apptsByDay[d];
                  return (
                    <div key={i} onClick={() => {
                        setSelectedDay(isSel ? null : d);
                        // ── Mejora 1: sincronizar con selectedDayView ──
                        setSelectedDayView(dateStr);
                      }}
                      style={{ textAlign:"center", padding:"8px 4px", borderRadius:10, cursor:"pointer",
                        background:isSel?T.p:isToday?T.pA:"transparent",
                        color:isSel?"#fff":isToday?T.p:T.t,
                        fontFamily:T.fB, fontSize:13.5, fontWeight:isToday||isSel?600:400,
                        transition:"all .12s", position:"relative" }}>
                      {d}
                      {appts && <div style={{ position:"absolute", bottom:3, left:"50%", transform:"translateX(-50%)", display:"flex", gap:2 }}>
                        {appts.slice(0,3).map((a,j) => (
                          <div key={j} style={{ width:4, height:4, borderRadius:"50%", background:isSel?"rgba(255,255,255,0.7)":a.isRecurring?T.p:T.acc }}/>
                        ))}
                      </div>}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              {recurringCount > 0 && (
                <div style={{ marginTop:16, display:"flex", gap:14, paddingTop:12, borderTop:`1px solid ${T.bdrL}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:T.acc }}/>
                    <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>Cita única</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:T.p }}/>
                    <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>Recurrente</span>
                  </div>
                </div>
              )}
            </div>{/* fin del div colapsable */}

            {selectedDay && (
              <div style={{ padding:"16px 20px", borderTop:`1px solid ${T.bdrL}` }}>
                <h4 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 12px" }}>{parseInt(selectedDay)} de {MONTHS_ES[month]}</h4>
                {dayAppts.length === 0
                  ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin citas — día libre</div>
                  : dayAppts.map(a => (
                    <div key={a.id} style={{ padding:"12px 14px", borderRadius:12, background:T.cardAlt, marginBottom:8, border:`1px solid ${T.bdrL}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: a.status !== "completada" ? 10 : 0 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t, display:"flex", alignItems:"center", gap:6 }}>
                            {a.patientName.split(" ").slice(0,2).join(" ")}
                            {a.isRecurring && (
                              <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 7px", borderRadius:9999, background:T.pA, color:T.p, fontSize:10, fontWeight:700 }}>
                                <Repeat size={9}/>Serie
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
                            {a.time} · {a.type}
                            {a.type === "Seguimiento post-alta" && (
                              <span style={{ padding:"1px 6px", borderRadius:9999, background:"rgba(91,141,184,0.12)", color:"#5B8DB8", fontSize:10, fontWeight:700 }}>
                                {a.followUpMonth ? `${a.followUpMonth}m` : "Post-alta"}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => openStatusModal(a)} style={{
                            background: STATUS_CONFIG[a.status]?.bg || T.warA,
                            border:"none", borderRadius:8, padding:"4px 10px",
                            cursor:"pointer", fontSize:11, fontFamily:T.fB,
                            color: STATUS_CONFIG[a.status]?.color || T.war,
                            fontWeight:600, maxWidth:140, whiteSpace:"nowrap",
                            overflow:"hidden", textOverflow:"ellipsis",
                          }}>
                            {STATUS_CONFIG[a.status]?.label || a.status}
                          </button>
                        <button onClick={() => confirmDelete(a)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer" }}><Trash2 size={13}/></button>
                      </div>
                      {a.status !== "completada" && (
                        <div style={{ display:"flex", gap:8, marginTop:8 }}>
                          <button onClick={() => handleOpenAppt(a)}
                            style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", justifyContent:"center", transition:"all .15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background=T.p; e.currentTarget.style.color="#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.background=T.pA; e.currentTarget.style.color=T.p; }}>
                            <FileText size={13}/> Abrir
                          </button>

                          {/* ── Mejora 2: indicador / botón recordatorio en Vista Mes ── */}
                          {a.reminderSent ? (
                            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px",
                              borderRadius:8, border:"1.5px solid #25D36640", background:"#25D36615",
                              color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600 }}>
                              <Check size={12}/> Recordatorio enviado
                            </div>
                          ) : (() => {
                            const pt  = patients.find(p => p.id === a.patientId);
                            const url = whatsappReminder(a, pt, profile);
                            return url ? (
                              <a href={url} target="_blank" rel="noreferrer"
                                onClick={() => markReminderSent(a.id)}
                                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8, border:"1.5px solid #25D366", background:"#25D36620", color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", textDecoration:"none", transition:"all .15s" }}>
                                <MessageCircle size={13}/> Recordatorio
                              </a>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            )}
          </Card>

          <Card style={{ padding:24, alignSelf:"start" }}>
            <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 14px" }}>Próximas citas</h3>
            {upcomingAppts.length === 0
              ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>No hay citas próximas</div>
              : (() => {
                  const groups = [];
                  let lastDate = null;
                  upcomingAppts.forEach(a => {
                    if (a.date !== lastDate) {
                      groups.push({ date: a.date, appts: [a] });
                      lastDate = a.date;
                    } else {
                      groups[groups.length - 1].appts.push(a);
                    }
                  });
                  return groups.map(g => {
                    const isToday = g.date === todayStr;
                    const dayNum  = parseInt(g.date.split("-")[2]);
                    const monIdx  = parseInt(g.date.split("-")[1]) - 1;
                    const label   = isToday ? "Hoy" : `${dayNum} ${MONTHS_ES[monIdx].slice(0,3)}`;
                    return (
                      <div key={g.date} style={{ marginBottom:16 }}>
                        {/* Encabezado de día */}
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                          <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700,
                            color: isToday ? T.p : T.tl,
                            textTransform:"uppercase", letterSpacing:"0.07em" }}>
                            {label}
                          </span>
                          <div style={{ flex:1, height:1, background:T.bdrL }}/>
                        </div>
                        {/* Citas del día */}
                        {g.appts.map(a => {
                          const pt  = patients.find(p => p.id === a.patientId);
                          const url = a.status !== "completada" && !a.reminderSent ? whatsappReminder(a, pt, profile) : null;
                          return (
                            <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10,
                              padding:"8px 10px", borderRadius:10, marginBottom:6,
                              background: a.status === "completada" ? T.cardAlt : T.card,
                              border:`1px solid ${T.bdrL}`,
                              opacity: a.status === "completada" ? 0.6 : 1 }}>
                              {/* Hora */}
                              <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700,
                                color: a.status === "completada" ? T.tl : T.p,
                                flexShrink:0, width:38, textAlign:"center" }}>
                                {a.time}
                              </span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:T.t,
                                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {a.patientName.split(" ").slice(0,2).join(" ")}
                                </div>
                                <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>
                                  {a.type}
                                </div>
                              </div>
                              {/* Acciones */}
                              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                                {a.status !== "completada" && (
                                  <button onClick={() => handleOpenAppt(a)}
                                    title="Abrir sesión"
                                    style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px",
                                      borderRadius:7, border:`1px solid ${T.p}`, background:T.pA,
                                      color:T.p, fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                                    <FileText size={11}/> Abrir
                                  </button>
                                )}
                                {/* ── Mejora 2: indicador compacto en Próximas citas ── */}
                                {a.reminderSent ? (
                                  <div title="Recordatorio enviado"
                                    style={{ display:"flex", alignItems:"center", padding:"5px 7px",
                                      borderRadius:7, border:"1px solid #25D36640",
                                      background:"#25D36615", color:"#25D366" }}>
                                    <Check size={13}/>
                                  </div>
                                ) : url ? (
                                  <a href={url} target="_blank" rel="noreferrer"
                                    title="Recordatorio WhatsApp"
                                    onClick={() => markReminderSent(a.id)}
                                    style={{ display:"flex", alignItems:"center", padding:"5px 7px",
                                      borderRadius:7, border:"1px solid #25D36640",
                                      background:"#25D36615", color:"#25D366",
                                      textDecoration:"none" }}>
                                    <MessageCircle size={13}/>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()
            }
          </Card>
        </div>
      )}

      {/* ── New appointment modal ──────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setRecurring(false); setDateError(""); setConflictError(""); }} title="Nueva cita" width={520}>
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>

        {/* ── Fecha con validación de días hábiles ─────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom: dateError ? 4 : 16 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm,
              marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Fecha *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => handleDateChange(e.target.value)}
              style={{ width:"100%", padding:"10px 14px",
                border:`1.5px solid ${dateError ? T.err : T.bdr}`,
                borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
                background:T.card, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          {/* ── Hora como <select> de slots del horario configurado ──── */}
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm,
              marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Hora
            </label>
            <select
              value={form.time}
              onChange={e => handleTimeChange(e.target.value)}
              style={{ width:"100%", padding:"10px 14px",
                border:`1.5px solid ${conflictError ? T.err : T.bdr}`,
                borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
                background:T.card, outline:"none", boxSizing:"border-box",
                appearance:"none", WebkitAppearance:"none", cursor:"pointer" }}
            >
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error de día no hábil */}
        {dateError && (
          <div style={{ marginBottom:14, padding:"8px 12px",
            background:T.errA, borderRadius:8,
            fontFamily:T.fB, fontSize:12, color:T.err, lineHeight:1.5 }}>
            {dateError}
          </div>
        )}

        {/* Error de conflicto de horario */}
        {conflictError && (
          <div style={{ marginBottom:14, padding:"8px 12px",
            background:T.errA, borderRadius:8,
            fontFamily:T.fB, fontSize:12, color:T.err, lineHeight:1.5,
            display:"flex", alignItems:"flex-start", gap:6 }}>
            <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>
            {conflictError}
          </div>
        )}

        <Select label="Tipo de cita" value={form.type} onChange={handleTypeChange}
          options={appointmentTypeOptions.map(o => ({ value: o.label || o, label: o.label || o }))}/>
        {showModalityPicker && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8 }}>
            <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, marginBottom:8 }}>¿Modalidad de la cita?</div>
            <div style={{ display:"flex", gap:8 }}>
              {[{mod:"presencial",icon:"🏢",label:"Presencial"},{mod:"virtual",icon:"💻",label:"Virtual"}].map(({mod,icon,label}) => {
                const sel = form.modality === mod;
                return (
                  <button key={mod} onClick={() => { setForm(f => ({ ...f, modality:mod })); setShowModalityPicker(false); }}
                    style={{ flex:1, padding:"8px", borderRadius:9, cursor:"pointer", fontFamily:T.fB, fontSize:12, fontWeight:600, transition:"all .15s",
                      border:`1.5px solid ${sel ? T.p : T.bdr}`, background:sel ? T.pA : T.card, color:sel ? T.p : T.t }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {form.modality && !showModalityPicker && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:-6, marginBottom:8, paddingLeft:2 }}>
            {form.modality === "presencial" ? "🏢 Presencial" : "💻 Virtual"}
            {" · "}
            <span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => setShowModalityPicker(true)}>Cambiar</span>
          </div>
        )}

        {/* ── Recurrence section ─────────────────────────────────────── */}
        <div style={{ border:`1.5px solid ${recurring ? T.p : T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <button onClick={() => setRecurring(r => !r)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", background:recurring?T.pA:T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:13, fontWeight:600, color:recurring?T.p:T.tm, transition:"all .15s" }}>
            <span style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Repeat size={14}/> Cita recurrente
              {recurring && (
                <span style={{ padding:"1px 8px", borderRadius:9999, background:T.p, color:"#fff", fontSize:10, fontWeight:700 }}>
                  {recOccurrences} citas · c/{freqLabel[recFrequency]}
                </span>
              )}
            </span>
            <span style={{ fontFamily:T.fB, fontSize:12, color:recurring?T.p:T.tl }}>{recurring?"Activado":"Opcional"}</span>
          </button>

          {recurring && (
            <div style={{ padding:"16px", background:T.card, borderTop:`1px solid ${T.bdrL}` }}>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:14 }}>
                Se crearán <strong>{recOccurrences}</strong> citas automáticamente a partir de la fecha seleccionada.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>Frecuencia</label>
                  <div style={{ display:"flex", gap:6 }}>
                    {[{ v:"semanal", l:"Semanal" }, { v:"quincenal", l:"Quincenal" }, { v:"mensual", l:"Mensual" }].map(({ v, l }) => {
                      const on = recFrequency === v;
                      return (
                        <button key={v} onClick={() => setRecFrequency(v)}
                          style={{ flex:1, padding:"8px 4px", border:`1.5px solid ${on?T.p:T.bdr}`, borderRadius:9, background:on?T.pA:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:11.5, fontWeight:on?700:400, color:on?T.p:T.tm, transition:"all .13s", textAlign:"center" }}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>Número de citas</label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={() => setRecOccurrences(n => Math.max(2, n - 1))}
                      style={{ width:32, height:32, borderRadius:8, background:T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:16, color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ fontFamily:T.fH, fontSize:22, color:T.t, minWidth:32, textAlign:"center", fontWeight:500 }}>{recOccurrences}</span>
                    <button onClick={() => setRecOccurrences(n => Math.min(52, n + 1))}
                      style={{ width:32, height:32, borderRadius:8, background:T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:16, color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                </div>
              </div>

              {/* Preview of dates */}
              {form.patientId && form.date && (() => {
                const preview = generateRecurring(form, recFrequency, Math.min(3, recOccurrences), patients.find(p => p.id === form.patientId));
                const remaining = recOccurrences - preview.length;
                return (
                  <div style={{ marginTop:14, padding:"10px 14px", background:T.pA, borderRadius:10 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>Vista previa</div>
                    {preview.map((a, i) => (
                      <div key={i} style={{ fontFamily:T.fB, fontSize:12, color:T.t, marginBottom:3 }}>
                        {i + 1}. {fmtDate(a.date)} · {a.time}
                      </div>
                    ))}
                    {remaining > 0 && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:3 }}>…y {remaining} cita{remaining!==1?"s":""} más</div>}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setRecurring(false); setDateError(""); setConflictError(""); }}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.date}>
            <Check size={15}/> {recurring ? `Crear ${recOccurrences} citas` : "Guardar cita"}
          </Btn>
        </div>
      </Modal>

      {/* ── Quick session modal ────────────────────────────────────────── */}
      <Modal open={!!quickSession} onClose={() => setQuickSession(null)} title="Nota de sesión rápida" width={520}>
        {quickSession && (
          <>
            <div style={{ padding:"12px 16px", background:T.pA, borderRadius:10, marginBottom:20 }}>
              <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.p }}>{quickSession.patientName?.split(" ").slice(0,2).join(" ")}</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{fmtDate(quickSession.date)} · {quickSession.time} · {quickSession.type}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Input label="Duración (min)" value={sessionForm.duration} onChange={sfld("duration")} type="number"/>
              <Select label="Progreso" value={sessionForm.progress} onChange={sfld("progress")}
                options={["excelente","bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
              <Select label="Ánimo" value={sessionForm.mood} onChange={sfld("mood")}
                options={["bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Notas clínicas *</label>
              <textarea value={sessionForm.notes} onChange={e => sfld("notes")(e.target.value)} rows={4}
                placeholder="Describe el contenido de la sesión..."
                style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <Input label="Etiquetas (separadas por coma)" value={sessionForm.tags} onChange={sfld("tags")} placeholder="TCC, ansiedad"/>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => setQuickSession(null)}>Cancelar</Btn>
              <Btn onClick={saveQuickSession} disabled={!sessionForm.notes.trim()}><Check size={15}/> Guardar y completar cita</Btn>
            </div>
          </>
        )}
      </Modal>

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      <DeleteConfirm appt={deleteTarget} onDeleteOne={deleteOne} onDeleteAll={deleteAll} onCancel={() => setDeleteTarget(null)}/>

      {/* ── Modal cambio de estado / cancelación (Sección 4) ────────────── */}
      <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title="Estado de la cita" width={460}>
        {statusTarget && (() => {
          const pt = patients.find(p => p.id === statusTarget.patientId);
          const cancelUrl = statusForm.status === "cancelada_psicologa" ? whatsappCancel(statusTarget, pt) : null;
          const isCancelled = statusForm.status === "cancelada_paciente" || statusForm.status === "cancelada_psicologa";
          const isNoShow = statusForm.status === "no_presentado";

          return (
            <>
              {/* Info de la cita */}
              <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:16,
                border:`1px solid ${T.p}25`, fontFamily:T.fB }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:T.p }}>
                  {statusTarget.patientName?.split(" ").slice(0,2).join(" ")}
                </div>
                <div style={{ fontSize:12, color:T.tm, marginTop:2 }}>
                  {fmtDate(statusTarget.date)} · {statusTarget.time} · {statusTarget.type}
                </div>
              </div>

              {/* Selector de estado */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                  Estado
                </label>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const selected = statusForm.status === key;
                    return (
                      <button key={key} onClick={() => sfStatus("status")(key)}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                          borderRadius:10, border:`1.5px solid ${selected ? cfg.color : T.bdr}`,
                          background: selected ? cfg.bg : "transparent",
                          cursor:"pointer", fontFamily:T.fB, fontSize:13,
                          fontWeight: selected ? 700 : 400,
                          color: selected ? cfg.color : T.t,
                          transition:"all .13s", textAlign:"left" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%",
                          background: selected ? cfg.color : T.bdr, flexShrink:0 }}/>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Motivo (solo para cancelaciones y no presentado) */}
              {(isCancelled || isNoShow) && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                    textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                    Motivo {isCancelled ? "de cancelación" : "de inasistencia"} (opcional)
                  </label>
                  <textarea value={statusForm.motivo} onChange={e => sfStatus("motivo")(e.target.value)}
                    rows={2} placeholder="Registra el motivo para el historial clínico..."
                    style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                      borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t,
                      background:T.card, outline:"none", resize:"vertical",
                      boxSizing:"border-box" }}/>
                </div>
              )}

              {/* Reagendar toggle (solo en cancelaciones) */}
              {isCancelled && (
                <div style={{ marginBottom:14 }}>
                  <button onClick={() => sfStatus("reagendar")(!statusForm.reagendar)}
                    style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
                      padding:"10px 14px", borderRadius:10, border:`1.5px solid ${statusForm.reagendar ? T.p : T.bdr}`,
                      background: statusForm.reagendar ? T.pA : "transparent",
                      cursor:"pointer", fontFamily:T.fB, fontSize:13,
                      color: statusForm.reagendar ? T.p : T.t, fontWeight: statusForm.reagendar ? 700 : 400,
                      transition:"all .13s" }}>
                    <BookOpen size={14} color={statusForm.reagendar ? T.p : T.tl}/>
                    Reagendar automáticamente
                    {statusForm.reagendar && (
                      <span style={{ marginLeft:"auto", fontSize:10, background:T.p,
                        color:"#fff", padding:"1px 7px", borderRadius:9999, fontWeight:700 }}>
                        Activo
                      </span>
                    )}
                  </button>

                  {statusForm.reagendar && (
                    <div style={{ marginTop:10, padding:"12px 14px", background:T.cardAlt,
                      borderRadius:10, border:`1px solid ${T.bdrL}`,
                      display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <Input label="Nueva fecha" value={statusForm.newDate}
                        onChange={sfStatus("newDate")} type="date"/>
                      <Input label="Nueva hora" value={statusForm.newTime}
                        onChange={sfStatus("newTime")} type="time"/>
                    </div>
                  )}
                </div>
              )}

              {/* Alerta no presentado */}
              {isNoShow && (
                <div style={{ padding:"10px 14px", background:"rgba(196,98,42,0.08)",
                  border:"1px solid rgba(196,98,42,0.25)", borderRadius:10, marginBottom:14,
                  fontFamily:T.fB, fontSize:12, color:"#C4622A", display:"flex", gap:8 }}>
                  <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
                  Quedará registrado en el historial del expediente y en las Estadísticas de tasa de asistencia.
                </div>
              )}

              {/* Botones de acción */}
              <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
                {cancelUrl && (
                  <a href={cancelUrl} target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                      borderRadius:9, border:"1.5px solid #25D36640",
                      background:"#25D36615", color:"#25D366", fontFamily:T.fB,
                      fontSize:12, fontWeight:600, textDecoration:"none" }}>
                    <MessageCircle size={13}/> Avisar al paciente
                  </a>
                )}
                <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
                  <Btn variant="ghost" onClick={() => setStatusTarget(null)}>Cancelar</Btn>
                  <Btn onClick={saveStatus} disabled={!statusForm.status}>
                    <Check size={15}/> Guardar
                  </Btn>
                </div>
              </div>
            </>
          );
        })()}
      </Modal>

      {/* ── Modal DynamicSummary — paciente con sesiones previas ────────── */}
      {summaryTarget && (
        <DynamicSummary
          open={!!summaryTarget}
          onClose={() => setSummaryTarget(null)}
          onContinue={() => {
            openQuickSession(summaryTarget.appointment);
            setSummaryTarget(null);
          }}
          patient={summaryTarget.patient}
          appointment={summaryTarget.appointment}
          sessions={sessions}
          taskAssignments={taskAssignments}
          scaleResults={scaleResults}
          riskAssessments={riskAssessments}
          treatmentPlans={treatmentPlans}
          interSessions={interSessions}
        />
      )}

      {/* ── Modal Protocolo de Admisión — primera vez ────────────────────── */}
      {admisionTarget && (() => {
        const { appt, patient: pt } = admisionTarget;
        const consentSigned = pt?.consent?.signed;
        const consentUrl = !consentSigned && pt?.phone
          ? whatsappConsent(pt)
          : null;
        return (
          <Modal open={!!admisionTarget} onClose={() => setAdmisionTarget(null)}
            title="Protocolo de Admisión" width={480}>

            {/* Encabezado del paciente */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
              background:T.pA, borderRadius:12, marginBottom:18, border:`1px solid ${T.p}25` }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:T.p,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:T.fH, fontSize:16, color:"#fff" }}>
                  {pt?.name?.[0] || "?"}
                </span>
              </div>
              <div>
                <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:T.t }}>
                  {pt?.name?.split(" ").slice(0,2).join(" ") || "Paciente"}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                  {fmtDate(appt.date)} · {appt.time} · {appt.type}
                </div>
              </div>
              <span style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:9999,
                background:"rgba(58,107,110,0.12)", color:T.p,
                fontFamily:T.fB, fontSize:10, fontWeight:700 }}>
                Primera sesión
              </span>
            </div>

            {/* Consentimiento Informado */}
            <div style={{ padding:"12px 14px", borderRadius:10, marginBottom:14,
              background: consentSigned ? T.sucA : T.warA,
              border:`1.5px solid ${consentSigned ? T.suc+"50" : T.war+"60"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: consentSigned ? 0 : 10 }}>
                <span style={{ fontSize:16 }}>{consentSigned ? "✅" : "⚠️"}</span>
                <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:700,
                  color: consentSigned ? T.suc : T.war }}>
                  {consentSigned ? "Consentimiento Informado firmado" : "Consentimiento pendiente de firma"}
                </span>
              </div>
              {!consentSigned && (
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:T.fB, fontSize:12, color:T.war, lineHeight:1.5 }}>
                    Es recomendable obtener el CI antes de iniciar el proceso terapéutico.
                  </span>
                  {consentUrl && (
                    <a href={consentUrl} target="_blank" rel="noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px",
                        borderRadius:9, border:"1.5px solid #25D36660",
                        background:"#25D36618", color:"#25D366",
                        fontFamily:T.fB, fontSize:12, fontWeight:700,
                        textDecoration:"none", whiteSpace:"nowrap" }}>
                      <MessageCircle size={13}/> Enviar por WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {onNavigate && (
                <button
                  onClick={() => { setAdmisionTarget(null); onNavigate("patients", pt, "anamnesis"); }}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px",
                    borderRadius:11, border:`1.5px solid ${T.bdr}`,
                    background:T.cardAlt, fontFamily:T.fB, fontSize:13,
                    fontWeight:600, color:T.t, cursor:"pointer", transition:"all .13s",
                    textAlign:"left" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.t; }}>
                  <BookOpen size={15} color={T.p}/>
                  <div>
                    <div>Ir a Anamnesis</div>
                    <div style={{ fontSize:11, fontWeight:400, color:T.tm, marginTop:1 }}>
                      Completa el expediente antes de la sesión
                    </div>
                  </div>
                </button>
              )}
              <button
                onClick={() => { openQuickSession(appt); setAdmisionTarget(null); }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                  padding:"12px 16px", borderRadius:11, border:"none",
                  background:T.p, color:"#fff", fontFamily:T.fB,
                  fontSize:13, fontWeight:700, cursor:"pointer", transition:"opacity .13s" }}
                onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                <FileText size={14}/> Continuar a sesión
              </button>
              <button
                onClick={() => setAdmisionTarget(null)}
                style={{ padding:"9px", borderRadius:11, border:`1px solid ${T.bdrL}`,
                  background:"transparent", fontFamily:T.fB, fontSize:12,
                  color:T.tl, cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* ── Mejora 3: Banner de sugerencia de siguiente cita ────────────── */}
      {nextApptSuggestion && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          zIndex:9999, background:T.card,
          border:`1.5px solid ${T.p}`, borderRadius:16,
          padding:"18px 22px",
          boxShadow:"0 8px 36px rgba(0,0,0,0.16)",
          maxWidth:420, width:"calc(100% - 48px)",
          animation:"fadeSlideUp .2s ease",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:T.pA,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <CalendarDays size={18} color={T.p}/>
            </div>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:15, color:T.t, marginBottom:3 }}>
                ¿Agendar siguiente cita?
              </div>
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, lineHeight:1.5 }}>
                <strong style={{ color:T.t }}>
                  {nextApptSuggestion.patientName.split(" ").slice(0,2).join(" ")}
                </strong>
                {" — "}
                {fmtDate(nextApptSuggestion.date)} a las {nextApptSuggestion.time}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={confirmNextAppt} style={{ flex:1 }}>
              <Check size={14}/> Confirmar
            </Btn>
            <Btn variant="ghost" onClick={() => setNextApptSuggestion(null)} style={{ flex:1 }}>
              Omitir
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
