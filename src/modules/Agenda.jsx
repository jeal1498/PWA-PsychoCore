import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Trash2, Check, Plus, FileText, LayoutGrid, List, Clock, Repeat } from "lucide-react";
import { T, MONTHS_ES, DAYS_ES } from "../theme.js";
import { uid, todayDate, fmt, fmtDate } from "../utils.js";
import { Card, Modal, Input, Select, Btn, Badge, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

// ── Weekly availability helpers ───────────────────────────────────────────────
const WORK_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19];

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
function WeeklyView({ appointments, weekAnchor, setWeekAnchor, onOpenQuick, today }) {
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
  const totalSlots = 6 * WORK_HOURS.length;
  const busySlots  = Object.keys(apptMap).length;
  const freeSlots  = totalSlots - busySlots;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={prevWeek} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:7, cursor:"pointer", color:T.tm }}><ChevronLeft size={15}/></button>
          <span style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>{startStr} — {endStr}</span>
          <button onClick={nextWeek} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:7, cursor:"pointer", color:T.tm }}><ChevronRight size={15}/></button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontFamily:T.fB, fontSize:12, color:T.suc, background:T.sucA, padding:"4px 10px", borderRadius:9999, fontWeight:600 }}>
            {freeSlots} huecos libres
          </span>
          <button onClick={thisWeek} style={{ fontFamily:T.fB, fontSize:12, color:T.p, background:T.pA, border:"none", borderRadius:9999, padding:"4px 12px", cursor:"pointer", fontWeight:600 }}>
            Esta semana
          </button>
        </div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth:560 }}>
          <div style={{ display:"grid", gridTemplateColumns:`60px repeat(6, 1fr)`, gap:4, marginBottom:4 }}>
            <div/>
            {weekDays.map((d, i) => {
              const ds = fmt(d);
              const isToday = ds === todayStr;
              return (
                <div key={i} style={{ textAlign:"center", padding:"6px 4px", borderRadius:8, background:isToday?T.pA:"transparent" }}>
                  <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl, letterSpacing:"0.06em" }}>
                    {["LUN","MAR","MIÉ","JUE","VIE","SÁB"][i]}
                  </div>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:isToday?T.p:T.t, fontWeight:isToday?600:400 }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          {WORK_HOURS.map(hour => (
            <div key={hour} style={{ display:"grid", gridTemplateColumns:`60px repeat(6, 1fr)`, gap:4, marginBottom:3 }}>
              <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, paddingTop:6, textAlign:"right", paddingRight:8 }}>
                {hour}:00
              </div>
              {weekDays.map((d, di) => {
                const key = `${fmt(d)}_${hour}`;
                const slot = apptMap[key];
                const isToday = fmt(d) === todayStr;
                if (slot) {
                  return (
                    <div key={di} style={{ background:T.p, borderRadius:8, padding:"4px 6px", minHeight:34 }}>
                      {slot.map(a => (
                        <div key={a.id} style={{ fontFamily:T.fB, fontSize:10, color:"#fff", fontWeight:500, lineHeight:1.3, display:"flex", alignItems:"center", gap:3 }}>
                          {a.isRecurring && <Repeat size={8} style={{ opacity:0.7, flexShrink:0 }}/>}
                          {a.patientName.split(" ")[0]} · {a.time}
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={di} style={{ background:isToday?"rgba(58,107,110,0.04)":T.bdrL+"44", borderRadius:8, minHeight:34, border:`1px dashed ${T.bdrL}`, opacity:0.6 }}/>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
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
export default function Agenda({ appointments, setAppointments, sessions, setSessions, patients, autoOpen }) {
  const [view,          setView]          = useState("month");
  const [current,       setCurrent]       = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [weekAnchor,    setWeekAnchor]    = useState(new Date(todayDate));
  const [showAdd,       setShowAdd]       = useState(autoOpen === "add");
  const [selectedDay,   setSelectedDay]   = useState(null);
  const [quickSession,  setQuickSession]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null); // appt to confirm delete

  const blankForm = { patientId:"", date:fmt(todayDate), time:"09:00", type:"Seguimiento", status:"pendiente" };
  const [form, setForm] = useState(blankForm);

  // Recurrence state
  const [recurring,     setRecurring]     = useState(false);
  const [recFrequency,  setRecFrequency]  = useState("semanal");
  const [recOccurrences,setRecOccurrences]= useState(8);

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

  // Count recurring series for the header stat
  const recurringCount = useMemo(() => {
    const groups = new Set(appointments.filter(a => a.isRecurring).map(a => a.recurrenceGroupId));
    return groups.size;
  }, [appointments]);

  const save = () => {
    if (!form.patientId || !form.date) return;
    const pt = patients.find(p => p.id === form.patientId);

    if (recurring) {
      const batch = generateRecurring(form, recFrequency, recOccurrences, pt);
      setAppointments(prev => [...prev, ...batch]);
    } else {
      setAppointments(prev => [...prev, { ...form, id:"a"+uid(), patientName: pt?.name || "" }]);
    }

    setForm(blankForm);
    setRecurring(false);
    setRecFrequency("semanal");
    setRecOccurrences(8);
    setShowAdd(false);
  };

  // Delete one vs. all in series
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

  // Frequency label
  const freqLabel = { semanal:"semana", quincenal:"2 semanas", mensual:"mes" };

  return (
    <div>
      <PageHeader title="Agenda"
        subtitle={`${appointments.length} cita${appointments.length!==1?"s":""} registrada${appointments.length!==1?"s":""}${recurringCount > 0 ? ` · ${recurringCount} serie${recurringCount!==1?"s":""} recurrente${recurringCount!==1?"s":""}` : ""}`}
        action={
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ display:"flex", background:T.bdrL, borderRadius:10, padding:3, gap:2 }}>
              {[{id:"month",icon:LayoutGrid,tip:"Mes"},{id:"week",icon:List,tip:"Semana"}].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} title={v.tip}
                  style={{ background:view===v.id?T.card:"transparent", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:view===v.id?T.p:T.tl, transition:"all .15s" }}>
                  <v.icon size={15}/>
                </button>
              ))}
            </div>
            <Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Nueva cita</Btn>
          </div>
        }
      />

      {view === "week" && (
        <Card style={{ padding:24 }}>
          <WeeklyView appointments={appointments} weekAnchor={weekAnchor} setWeekAnchor={setWeekAnchor} onOpenQuick={openQuickSession} today={todayDate}/>
        </Card>
      )}

      {view === "month" && (
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr minmax(0,320px)", gap:20 }}>
          <Card style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tm }}><ChevronLeft size={16}/></button>
              <span style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:T.t }}>{MONTHS_ES[month]} {year}</span>
              <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} style={{ background:T.bdrL, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tm }}><ChevronRight size={16}/></button>
            </div>
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
                const hasRecurring = appts?.some(a => a.isRecurring);
                return (
                  <div key={i} onClick={() => setSelectedDay(isSel ? null : d)}
                    style={{ textAlign:"center", padding:"8px 4px", borderRadius:10, cursor:"pointer", background:isSel?T.p:isToday?T.pA:"transparent", color:isSel?"#fff":isToday?T.p:T.t, fontFamily:T.fB, fontSize:13.5, fontWeight:isToday||isSel?600:400, transition:"all .12s", position:"relative" }}>
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

            {selectedDay && (
              <div style={{ marginTop:20, borderTop:`1px solid ${T.bdrL}`, paddingTop:16 }}>
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
                        <button onClick={() => toggle(a.id)} style={{ background:a.status==="completada"?T.sucA:T.warA, border:"none", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:a.status==="completada"?T.suc:T.war, fontWeight:600 }}>{a.status}</button>
                        <button onClick={() => confirmDelete(a)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer" }}><Trash2 size={13}/></button>
                      </div>
                      {a.status !== "completada" && (
                        <button onClick={() => openQuickSession(a)}
                          style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"8px 12px", borderRadius:8, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", justifyContent:"center", transition:"all .15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background=T.p; e.currentTarget.style.color="#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background=T.pA; e.currentTarget.style.color=T.p; }}>
                          <FileText size={13}/> Registrar nota de sesión
                        </button>
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
              : upcomingAppts.map(a => (
                <div key={a.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                  <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontFamily:T.fH, fontSize:20, color:T.p, lineHeight:1 }}>{parseInt(a.date.split("-")[2])}</div>
                    <div style={{ fontSize:10, color:T.tl, fontFamily:T.fB }}>{MONTHS_ES[parseInt(a.date.split("-")[1])-1].slice(0,3)}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:T.t, display:"flex", alignItems:"center", gap:5 }}>
                      {a.patientName.split(" ").slice(0,2).join(" ")}
                      {a.isRecurring && <Repeat size={10} color={T.p} style={{ opacity:0.6 }}/>}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, display:"flex", alignItems:"center", gap:4 }}>
                      {a.time} · {a.type}
                      {a.type === "Seguimiento post-alta" && (
                        <span style={{ padding:"1px 6px", borderRadius:9999, background:"rgba(91,141,184,0.12)", color:"#5B8DB8", fontSize:10, fontWeight:700 }}>
                          {a.followUpMonth ? `${a.followUpMonth}m` : "Post-alta"}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.date === todayStr && (
                    <button onClick={() => openQuickSession(a)} title="Registrar sesión"
                      style={{ background:T.pA, border:"none", borderRadius:8, padding:"6px 8px", cursor:"pointer", color:T.p }}>
                      <FileText size={14}/>
                    </button>
                  )}
                </div>
              ))
            }
          </Card>
        </div>
      )}

      {/* ── New appointment modal ──────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setRecurring(false); }} title="Nueva cita" width={520}>
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha *" value={form.date} onChange={fld("date")} type="date"/>
          <Input label="Hora"    value={form.time} onChange={fld("time")} type="time"/>
        </div>
        <Select label="Tipo" value={form.type} onChange={fld("type")}
          options={["Primera consulta","Seguimiento","Evaluación","Crisis","Cierre","Seguimiento post-alta"].map(t => ({value:t,label:t}))}/>

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
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setRecurring(false); }}>Cancelar</Btn>
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
    </div>
  );
}
