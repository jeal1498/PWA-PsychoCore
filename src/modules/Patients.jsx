import { useState, useMemo } from "react";
import { Users, Search, Trash2, Phone, Mail, ChevronLeft, Tag, Check, Plus } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

export default function Patients({ patients, setPatients, sessions, payments }) {
  const [search,   setSearch]   = useState("");
  const [showAdd,  setShowAdd]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name:"", age:"", phone:"", email:"", diagnosis:"", reason:"", notes:"" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();

  const filtered = useMemo(() =>
    patients.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis||"").toLowerCase().includes(search.toLowerCase())
    ), [patients, search]);

  const save = () => {
    if (!form.name.trim()) return;
    setPatients(prev => [...prev, { ...form, id:"p"+uid(), createdAt:fmt(todayDate) }]);
    setForm({ name:"", age:"", phone:"", email:"", diagnosis:"", reason:"", notes:"" });
    setShowAdd(false);
  };

  const del = id => { setPatients(prev => prev.filter(p => p.id !== id)); if (selected?.id === id) setSelected(null); };

  if (selected) {
    const ptSessions = sessions.filter(s => s.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const ptPayments = payments.filter(p => p.patientId === selected.id);
    const totalPaid  = ptPayments.filter(p => p.status === "pagado").reduce((s,p) => s+Number(p.amount), 0);
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:T.p, fontFamily:T.fB, fontSize:13, cursor:"pointer", marginBottom:20, padding:0 }}>
          <ChevronLeft size={16} /> Volver a pacientes
        </button>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,300px) 1fr", gap:20, alignItems:"start" }}>
          <Card style={{ padding:24 }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
              <span style={{ fontFamily:T.fH, fontSize:26, color:T.p }}>{selected.name[0]}</span>
            </div>
            <h2 style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:T.t, margin:"0 0 4px" }}>{selected.name}</h2>
            <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 18px" }}>{selected.age ? `${selected.age} años · ` : ""}Desde {fmtDate(selected.createdAt)}</p>
            <div style={{ borderTop:`1px solid ${T.bdrL}`, paddingTop:16 }}>
              {selected.phone && <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, fontFamily:T.fB, fontSize:13, color:T.tm }}><Phone size={14}/>{selected.phone}</div>}
              {selected.email && <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, fontFamily:T.fB, fontSize:13, color:T.tm }}><Mail size={14}/>{selected.email}</div>}
            </div>
            {selected.diagnosis && <div style={{ marginTop:16, padding:14, background:T.pA, borderRadius:10 }}><div style={{ fontSize:10, fontWeight:700, color:T.p, letterSpacing:"0.08em", marginBottom:6, textTransform:"uppercase" }}>Diagnóstico</div><div style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{selected.diagnosis}</div></div>}
            {selected.reason    && <div style={{ marginTop:12, padding:14, background:T.cardAlt, borderRadius:10 }}><div style={{ fontSize:10, fontWeight:700, color:T.tm, letterSpacing:"0.08em", marginBottom:6, textTransform:"uppercase" }}>Motivo de consulta</div><div style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{selected.reason}</div></div>}
            <div style={{ marginTop:18, display:"flex", justifyContent:"space-around", paddingTop:16, borderTop:`1px solid ${T.bdrL}` }}>
              <div style={{ textAlign:"center" }}><div style={{ fontFamily:T.fH, fontSize:28, color:T.p, lineHeight:1 }}>{ptSessions.length}</div><div style={{ fontSize:11, color:T.tm, marginTop:4 }}>Sesiones</div></div>
              <div style={{ textAlign:"center" }}><div style={{ fontFamily:T.fH, fontSize:24, color:T.suc, lineHeight:1 }}>{fmtCur(totalPaid)}</div><div style={{ fontSize:11, color:T.tm, marginTop:4 }}>Total pagado</div></div>
            </div>
          </Card>
          <Card style={{ padding:24 }}>
            <h3 style={{ fontFamily:T.fH, fontSize:20, margin:"0 0 16px", color:T.t }}>Historial de sesiones</h3>
            {ptSessions.length === 0 ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"16px 0" }}>Sin sesiones registradas aún</div>
              : ptSessions.map(s => {
                const MI = moodIcon(s.mood); const ps = progressStyle(s.progress);
                return (
                  <div key={s.id} style={{ borderBottom:`1px solid ${T.bdrL}`, paddingBottom:16, marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{fmtDate(s.date)} · {s.duration} min</span>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <MI size={14} color={moodColor(s.mood)} />
                        <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                      </div>
                    </div>
                    <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 8px", lineHeight:1.65 }}>{s.notes}</p>
                    {(s.tags||[]).length > 0 && <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{s.tags.map(t => <Badge key={t} color={T.acc} bg={T.accA}><Tag size={10}/>{t}</Badge>)}</div>}
                  </div>
                );
              })}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Pacientes" subtitle={`${patients.length} paciente${patients.length!==1?"s":""} registrado${patients.length!==1?"s":""}`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Nuevo paciente</Btn>} />
      <div style={{ position:"relative", marginBottom:20 }}>
        <Search size={16} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:T.tl, pointerEvents:"none" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o diagnóstico..."
          style={{ width:"100%", padding:"11px 14px 11px 42px", border:`1.5px solid ${T.bdr}`, borderRadius:12, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }} />
      </div>
      {filtered.length === 0 ? <EmptyState icon={Users} title="Sin pacientes" desc="Agrega tu primer paciente con el botón de arriba" />
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:14 }}>
          {filtered.map(p => (
            <Card key={p.id} onClick={() => setSelected(p)} style={{ padding:20, cursor:"pointer" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = T.shM}
              onMouseLeave={e => e.currentTarget.style.boxShadow = T.sh}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:T.fH, fontSize:20, color:T.p }}>{p.name[0]}</span>
                </div>
                <button onClick={e => { e.stopPropagation(); del(p.id); }} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:4 }}><Trash2 size={14}/></button>
              </div>
              <div style={{ fontFamily:T.fH, fontSize:18, fontWeight:500, color:T.t, marginBottom:2 }}>{p.name.split(" ").slice(0,2).join(" ")}</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:10 }}>{p.age ? `${p.age} años · ` : ""}Desde {fmtDate(p.createdAt)}</div>
              {p.diagnosis && <Badge>{p.diagnosis.split("—")[0].trim()}</Badge>}
            </Card>
          ))}
        </div>
      }
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo paciente">
        <Input label="Nombre completo *" value={form.name} onChange={fld("name")} placeholder="Ej. María González López" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Edad" value={form.age} onChange={fld("age")} type="number" />
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-123-4567" />
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} type="email" />
        <Input label="Diagnóstico" value={form.diagnosis} onChange={fld("diagnosis")} placeholder="Ej. Trastorno de Ansiedad Generalizada" />
        <Textarea label="Motivo de consulta" value={form.reason} onChange={fld("reason")} rows={2} />
        <Textarea label="Notas adicionales" value={form.notes} onChange={fld("notes")} rows={2} />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.name.trim()}><Check size={15}/> Guardar paciente</Btn>
        </div>
      </Modal>
    </div>
  );
}
