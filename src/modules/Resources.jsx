import { useState, useMemo } from "react";
import { BookOpen, Search, Trash2, Tag, Check, Plus } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, RESOURCE_TYPE_COLORS } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";

export default function Resources({ resources, setResources }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search,  setSearch]  = useState("");
  const [form, setForm] = useState({ title:"", type:"Ejercicio", description:"", url:"", tags:"" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    resources.filter(r =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description||"").toLowerCase().includes(search.toLowerCase()) ||
      (r.tags||[]).some(t => t.toLowerCase().includes(search.toLowerCase()))
    ), [resources, search]);

  const save = () => {
    if (!form.title.trim()) return;
    setResources(prev => [...prev, { ...form, id:"r"+uid(), tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean), createdAt:fmt(todayDate) }]);
    setForm({ title:"", type:"Ejercicio", description:"", url:"", tags:"" });
    setShowAdd(false);
  };

  const del = id => setResources(prev => prev.filter(r => r.id !== id));

  return (
    <div>
      <PageHeader title="Recursos" subtitle={`${resources.length} material${resources.length!==1?"es":""} en biblioteca`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Agregar recurso</Btn>} />

      <div style={{ position:"relative", marginBottom:20 }}>
        <Search size={16} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:T.tl, pointerEvents:"none" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, descripción o etiqueta..."
          style={{ width:"100%", padding:"11px 14px 11px 42px", border:`1.5px solid ${T.bdr}`, borderRadius:12, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }} />
      </div>

      {filtered.length === 0 ? <EmptyState icon={BookOpen} title="Biblioteca vacía" desc="Agrega ejercicios, técnicas y materiales para compartir con tus pacientes" />
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:14 }}>
          {filtered.map(r => {
            const tc = RESOURCE_TYPE_COLORS[r.type] || RESOURCE_TYPE_COLORS.Otro;
            return (
              <Card key={r.id} style={{ padding:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <Badge color={tc.c} bg={tc.bg}>{r.type}</Badge>
                  <button onClick={() => del(r.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer" }}><Trash2 size={14}/></button>
                </div>
                <h3 style={{ fontFamily:T.fH, fontSize:19, fontWeight:500, color:T.t, margin:"0 0 8px", lineHeight:1.3 }}>{r.title}</h3>
                {r.description && <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 12px", lineHeight:1.6 }}>{r.description}</p>}
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:T.p, fontFamily:T.fB, textDecoration:"none", display:"block", marginBottom:10 }}>Abrir enlace →</a>}
                {(r.tags||[]).length > 0 && <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>{r.tags.map(tag => <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={10}/>{tag}</Badge>)}</div>}
              </Card>
            );
          })}
        </div>
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar recurso">
        <Input label="Título *" value={form.title} onChange={fld("title")} placeholder="Ej. Registro de Pensamientos ABC" />
        <Select label="Tipo" value={form.type} onChange={fld("type")}
          options={Object.keys(RESOURCE_TYPE_COLORS).map(t => ({value:t,label:t}))} />
        <Textarea label="Descripción" value={form.description} onChange={fld("description")} placeholder="Para qué sirve este recurso..." rows={3} />
        <Input label="Enlace (opcional)" value={form.url} onChange={fld("url")} placeholder="https://..." />
        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="ansiedad, TCC, adultos" />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.title.trim()}><Check size={15}/> Guardar recurso</Btn>
        </div>
      </Modal>
    </div>
  );
}
