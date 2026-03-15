import { useState, useMemo } from "react";
import { FileText, Trash2, Printer, Tag, Check, Plus } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";

function printNote(session, patients) {
  const pt = patients.find(p => p.id === session.patientId);
  const w = window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Nota — ${session.patientName}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;max-width:720px;margin:48px auto;color:#1A2B28;line-height:1.6}
header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:32px}
h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#3A6B6E}
.subtitle{font-size:13px;color:#5A7270;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.field label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;font-weight:600;display:block;margin-bottom:4px}
.field p{font-size:15px}.notes{background:#F9F8F5;padding:20px;border-radius:10px;border-left:4px solid #3A6B6E;margin-bottom:24px}
.notes label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;font-weight:600;display:block;margin-bottom:10px}
.notes p{font-size:14px;line-height:1.75}
.tags{display:flex;gap:8px;flex-wrap:wrap}.tag{background:rgba(196,137,90,0.1);color:#C4895A;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600}
footer{margin-top:48px;padding-top:20px;border-top:1px solid #D8E2E0;font-size:12px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}</style></head><body>
<header><h1>Nota de Evolución Clínica</h1><p class="subtitle">PsychoCore · ${new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></header>
<div class="grid">
<div class="field"><label>Paciente</label><p>${session.patientName}</p></div>
<div class="field"><label>Fecha</label><p>${fmtDate(session.date)}</p></div>
<div class="field"><label>Duración</label><p>${session.duration} minutos</p></div>
<div class="field"><label>Estado de ánimo</label><p style="text-transform:capitalize">${session.mood}</p></div>
<div class="field"><label>Progreso</label><p style="text-transform:capitalize">${session.progress}</p></div>
${pt?.diagnosis?`<div class="field"><label>Diagnóstico</label><p>${pt.diagnosis}</p></div>`:""}
</div>
<div class="notes"><label>Notas clínicas</label><p>${session.notes}</p></div>
${(session.tags||[]).length?`<div style="margin-bottom:24px"><label style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;font-weight:600;display:block;margin-bottom:8px">Etiquetas</label><div class="tags">${session.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div></div>`:""}
<footer><span>PsychoCore</span><span>Documento confidencial</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

export default function Sessions({ sessions, setSessions, patients }) {
  const [filterPt, setFilterPt] = useState("");
  const [showAdd,  setShowAdd]  = useState(false);
  const [form, setForm] = useState({ patientId:"", date:fmt(todayDate), duration:50, mood:"moderado", progress:"bueno", notes:"", tags:"" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    sessions.filter(s => !filterPt || s.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [sessions, filterPt]);

  const save = () => {
    if (!form.patientId || !form.notes.trim()) return;
    const pt = patients.find(p => p.id === form.patientId);
    setSessions(prev => [...prev, { ...form, id:"s"+uid(), patientName:pt?.name||"", tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean) }]);
    setForm({ patientId:"", date:fmt(todayDate), duration:50, mood:"moderado", progress:"bueno", notes:"", tags:"" });
    setShowAdd(false);
  };

  const del = id => setSessions(prev => prev.filter(s => s.id !== id));

  return (
    <div>
      <PageHeader title="Notas de Sesión" subtitle={`${sessions.length} nota${sessions.length!==1?"s":""} registrada${sessions.length!==1?"s":""}`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Nueva nota</Btn>} />

      <div style={{ marginBottom:20 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <EmptyState icon={FileText} title="Sin notas" desc="Registra la evolución de tus pacientes con el botón de arriba" />
        : filtered.map(s => {
          const MI = moodIcon(s.mood); const ps = progressStyle(s.progress);
          return (
            <Card key={s.id} style={{ padding:22, marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:T.fH, fontSize:17, fontWeight:500, color:T.t }}>{s.patientName.split(" ").slice(0,2).join(" ")}</span>
                    <span style={{ fontSize:11, color:T.tl }}>·</span>
                    <span style={{ fontSize:13, color:T.tm, fontFamily:T.fB }}>{fmtDate(s.date)}</span>
                    <span style={{ fontSize:11, color:T.tl }}>·</span>
                    <span style={{ fontSize:12, color:T.tm, fontFamily:T.fB }}>{s.duration} min</span>
                  </div>
                  <p style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, margin:"0 0 12px", lineHeight:1.65 }}>{s.notes}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <MI size={14} color={moodColor(s.mood)}/>
                      <span style={{ fontSize:12, fontFamily:T.fB, color:moodColor(s.mood), fontWeight:600 }}>{s.mood}</span>
                    </div>
                    <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                    {(s.tags||[]).map(tag => <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={10}/>{tag}</Badge>)}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={() => printNote(s, patients)} title="Exportar PDF" style={{ background:T.bdrL, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tm }}><Printer size={15}/></button>
                  <button onClick={() => del(s.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:8 }}><Trash2 size={15}/></button>
                </div>
              </div>
            </Card>
          );
        })}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva nota de sesión" width={580}>
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date" />
          <Input label="Duración (min)" value={form.duration} onChange={fld("duration")} type="number" />
          <Select label="Progreso" value={form.progress} onChange={fld("progress")}
            options={["excelente","bueno","moderado","bajo"].map(p => ({value:p,label:p}))} />
        </div>
        <Select label="Estado de ánimo" value={form.mood} onChange={fld("mood")}
          options={["bueno","moderado","bajo"].map(p => ({value:p,label:p}))} />
        <Textarea label="Notas clínicas *" value={form.notes} onChange={fld("notes")} placeholder="Describe la sesión, intervenciones y respuesta del paciente..." rows={5} />
        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="TCC, ansiedad, respiración" />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.notes.trim()}><Check size={15}/> Guardar nota</Btn>
        </div>
      </Modal>
    </div>
  );
}
