import { useState, useMemo } from "react";
import { DollarSign, Trash2, TrendingUp, AlertCircle, CheckCircle, Check, Plus } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur } from "../utils.js";
import { Card, Badge, Modal, Input, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";

export default function Finance({ payments, setPayments, patients }) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [filterPt, setFilterPt] = useState("");
  const [form, setForm] = useState({ patientId:"", date:fmt(todayDate), amount:"", concept:"Sesión individual", method:"Transferencia", status:"pagado" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    payments.filter(p => !filterPt || p.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [payments, filterPt]);

  const monthStr    = fmt(todayDate).slice(0,7);
  const monthIncome = payments.filter(p => p.status==="pagado" && p.date.startsWith(monthStr)).reduce((s,p)=>s+Number(p.amount),0);
  const totalPaid   = filtered.filter(p => p.status==="pagado").reduce((s,p)=>s+Number(p.amount),0);
  const totalPend   = filtered.filter(p => p.status==="pendiente").reduce((s,p)=>s+Number(p.amount),0);

  const save = () => {
    if (!form.patientId || !form.amount) return;
    const pt = patients.find(p => p.id === form.patientId);
    setPayments(prev => [...prev, { ...form, id:"pay"+uid(), patientName:pt?.name||"" }]);
    setForm({ patientId:"", date:fmt(todayDate), amount:"", concept:"Sesión individual", method:"Transferencia", status:"pagado" });
    setShowAdd(false);
  };

  const del    = id => setPayments(prev => prev.filter(p => p.id !== id));
  const toggle = id => setPayments(prev => prev.map(p => p.id===id ? {...p, status:p.status==="pagado"?"pendiente":"pagado"} : p));

  const stats = [
    { label:"Ingresos este mes",  value:fmtCur(monthIncome), icon:TrendingUp,  color:T.suc, bg:T.sucA },
    { label:"Cobrado (filtro)",   value:fmtCur(totalPaid),   icon:CheckCircle, color:T.p,   bg:T.pA   },
    { label:"Por cobrar (filtro)",value:fmtCur(totalPend),   icon:AlertCircle, color:T.war, bg:T.warA },
  ];

  return (
    <div>
      <PageHeader title="Finanzas" subtitle="Control de ingresos y estados de cuenta"
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Registrar pago</Btn>} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:16, marginBottom:28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:T.tm, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontFamily:T.fH, fontSize:28, fontWeight:500, color:T.t }}>{s.value}</div>
              </div>
              <div style={{ width:42, height:42, borderRadius:12, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <s.icon size={20} color={s.color} strokeWidth={1.6}/>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom:16 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      <Card>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 110px 100px 140px 110px 90px", gap:12 }}>
          {["Paciente","Fecha","Monto","Concepto","Método","Estado"].map(h => (
            <span key={h} style={{ fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botón de arriba" />
          : filtered.map(p => (
            <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 110px 100px 140px 110px 90px", gap:12, padding:"14px 20px", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
              <span style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{p.patientName.split(" ").slice(0,2).join(" ")}</span>
              <span style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>{fmtDate(p.date)}</span>
              <span style={{ fontFamily:T.fH, fontSize:16, color:T.t, fontWeight:500 }}>{fmtCur(p.amount)}</span>
              <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{p.concept}</span>
              <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{p.method}</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <button onClick={() => toggle(p.id)} style={{ background:p.status==="pagado"?T.sucA:T.warA, border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>{p.status}</button>
                <button onClick={() => del(p.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer" }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Registrar pago">
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date" />
          <Input label="Monto (MXN) *" value={form.amount} onChange={fld("amount")} type="number" placeholder="900" />
        </div>
        <Select label="Concepto" value={form.concept} onChange={fld("concept")}
          options={["Sesión individual","Evaluación neuropsicológica","Primera consulta (90 min)","Pareja / Familia","Taller / Grupo","Otro"].map(c=>({value:c,label:c}))} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Select label="Método" value={form.method} onChange={fld("method")}
            options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m=>({value:m,label:m}))} />
          <Select label="Estado" value={form.status} onChange={fld("status")}
            options={[{value:"pagado",label:"Pagado"},{value:"pendiente",label:"Pendiente"}]} />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.amount}><Check size={15}/> Guardar pago</Btn>
        </div>
      </Modal>
    </div>
  );
}
