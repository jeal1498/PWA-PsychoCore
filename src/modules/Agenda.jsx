import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Trash2, Check, Plus } from "lucide-react";
import { T, MONTHS_ES, DAYS_ES } from "../theme.js";
import { uid, todayDate, fmt } from "../utils.js";
import { Card, Modal, Input, Select, Btn, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

export default function Agenda({ appointments, setAppointments, patients }) {
  const [current,     setCurrent]     = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [showAdd,     setShowAdd]     = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ patientId:"", date:fmt(todayDate), time:"09:00", type:"Seguimiento", status:"pendiente" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();

  const year = current.getFullYear(), month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay+daysInMonth)/7)*7 }, (_, i) => {
    const d = i - firstDay + 1;
    return (d >= 1 && d <= daysInMonth) ? String(d).padStart(2,"0") : null;
  });

  const todayStr  = fmt(todayDate);
  const monthStr  = `${year}-${String(month+1).padStart(2,"0")}`;

  const apptsByDay = useMemo(() => {
    const map = {};
    appointments.filter(a => a.date.startsWith(monthStr)).forEach(a => {
      const d = a.date.split("-")[2];
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [appointments, monthStr]);

  const dayAppts    = selectedDay ? (apptsByDay[selectedDay]||[]) : [];
  const upcomingAppts = [...appointments].filter(a => a.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date)).slice(0,8);

  const save = () => {
    if (!form.patientId || !form.date) return;
    const pt = patients.find(p => p.id === form.patientId);
    setAppointments(prev => [...prev, { ...form, id:"a"+uid(), patientName: pt?.name||"" }]);
    setForm({ patientId:"", date:fmt(todayDate), time:"09:00", type:"Seguimiento", status:"pendiente" });
    setShowAdd(false);
  };

  const del    = id => setAppointments(prev => prev.filter(a => a.id !== id));
  const toggle = id => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: a.status==="completada"?"pendiente":"completada" } : a));

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Gestión de citas y disponibilidad"
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Nueva cita</Btn>} />

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr minmax(0,320px)", gap:20 }}>
        <Card style={{ padding:24 }}>
          {/* Month nav */}
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
              return (
                <div key={i} onClick={() => setSelectedDay(isSel ? null : d)}
                  style={{ textAlign:"center", padding:"8px 4px", borderRadius:10, cursor:"pointer", background:isSel?T.p:isToday?T.pA:"transparent", color:isSel?"#fff":isToday?T.p:T.t, fontFamily:T.fB, fontSize:13.5, fontWeight:isToday||isSel?600:400, transition:"all .12s", position:"relative" }}>
                  {d}
                  {appts && <div style={{ position:"absolute", bottom:3, left:"50%", transform:"translateX(-50%)", display:"flex", gap:2 }}>
                    {appts.slice(0,3).map((_,j) => <div key={j} style={{ width:4, height:4, borderRadius:"50%", background:isSel?"rgba(255,255,255,0.7)":T.acc }} />)}
                  </div>}
                </div>
              );
            })}
          </div>
          {selectedDay && (
            <div style={{ marginTop:20, borderTop:`1px solid ${T.bdrL}`, paddingTop:16 }}>
              <h4 style={{ fontFamily:T.fH, fontSize:18, color:T.t, margin:"0 0 12px" }}>{parseInt(selectedDay)} de {MONTHS_ES[month]}</h4>
              {dayAppts.length === 0 ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin citas este día</div>
                : dayAppts.map(a => (
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:10, background:T.cardAlt, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{a.patientName.split(" ").slice(0,2).join(" ")}</div>
                      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{a.time} · {a.type}</div>
                    </div>
                    <button onClick={() => toggle(a.id)} style={{ background:a.status==="completada"?T.sucA:T.warA, border:"none", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:a.status==="completada"?T.suc:T.war, fontWeight:600 }}>{a.status}</button>
                    <button onClick={() => del(a.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer" }}><Trash2 size={13}/></button>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card style={{ padding:24, alignSelf:"start" }}>
          <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 14px" }}>Próximas citas</h3>
          {upcomingAppts.length === 0 ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>No hay citas próximas</div>
            : upcomingAppts.map(a => (
              <div key={a.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontFamily:T.fH, fontSize:20, color:T.p, lineHeight:1 }}>{parseInt(a.date.split("-")[2])}</div>
                  <div style={{ fontSize:10, color:T.tl, fontFamily:T.fB }}>{MONTHS_ES[parseInt(a.date.split("-")[1])-1].slice(0,3)}</div>
                </div>
                <div>
                  <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:T.t }}>{a.patientName.split(" ").slice(0,2).join(" ")}</div>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{a.time} · {a.type}</div>
                </div>
              </div>
            ))}
        </Card>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva cita">
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha *" value={form.date} onChange={fld("date")} type="date" />
          <Input label="Hora" value={form.time} onChange={fld("time")} type="time" />
        </div>
        <Select label="Tipo" value={form.type} onChange={fld("type")}
          options={["Primera consulta","Seguimiento","Evaluación","Crisis","Cierre"].map(t => ({value:t,label:t}))} />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.date}><Check size={15}/> Guardar cita</Btn>
        </div>
      </Modal>
    </div>
  );
}
