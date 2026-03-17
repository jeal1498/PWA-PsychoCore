import { useState, useMemo, useEffect } from "react";
import { DollarSign, Trash2, TrendingUp, AlertCircle, CheckCircle, Check, Plus, Printer, Download, FileText } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur } from "../utils.js";
import { Card, Modal, Input, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

// ─────────────────────────────────────────────────────────────────────────────
// FOLIO GENERATOR — YYYY-NNNN
// ─────────────────────────────────────────────────────────────────────────────
function nextFolio(payments) {
  const year   = new Date().getFullYear();
  const prefix = String(year) + "-";
  const folios = payments
    .map(p => p.folio)
    .filter(f => f && f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ""), 10))
    .filter(n => !isNaN(n));
  const next = folios.length > 0 ? Math.max(...folios) + 1 : 1;
  return prefix + String(next).padStart(4, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF: RECIBO DE PAGO
// ─────────────────────────────────────────────────────────────────────────────
function printRecibo(payment, patient, profile) {
  const w     = window.open("", "_blank");
  const today = new Date(payment.date + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const folio = payment.folio || "—";
  const amount = Number(payment.amount);
  const amountFmt = amount.toLocaleString("es-MX", { minimumFractionDigits: 2 });

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Recibo ${folio} — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:580px;margin:48px auto;color:#1A2B28;font-size:13px;line-height:1.6}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#3A6B6E;margin-bottom:3px}
.org p{font-size:11px;color:#5A7270;margin-top:2px}
.folio-block{text-align:right}
.folio-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#9BAFAD;margin-bottom:4px}
.folio-num{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#3A6B6E}
.badge-pagado{display:inline-block;padding:3px 12px;border-radius:9999px;background:rgba(78,139,95,0.1);color:#4E8B5F;font-size:11px;font-weight:700;margin-top:6px;letter-spacing:.04em}
.section{margin-bottom:20px}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#9BAFAD;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.info-box{background:#F9F8F5;padding:11px 14px;border-radius:8px}
.info-box label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;margin-bottom:2px}
.info-box p{font-size:13px;font-weight:500}
.amount-block{background:#F9F8F5;border-radius:12px;padding:20px 24px;margin:20px 0;display:flex;justify-content:space-between;align-items:center;border-left:4px solid #3A6B6E}
.amount-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD}
.amount-value{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:500;color:#3A6B6E;line-height:1}
.amount-cur{font-size:16px;color:#5A7270;margin-right:4px}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
.sig-line{border-top:1px solid #1A2B28;padding-top:7px;margin-top:50px}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:500}
.sig-meta{font-size:11px;color:#5A7270;margin-top:2px}
.disclaimer{margin-top:28px;padding:12px 16px;background:rgba(58,107,110,0.05);border-radius:8px;font-size:11px;color:#9BAFAD;line-height:1.6}
footer{margin-top:32px;padding-top:14px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0;max-width:none}@page{margin:15mm}}
</style></head><body>

<div class="header">
  <div class="org">
    <h1>${profile?.clinic || "Consultorio Psicológico"}</h1>
    <p>${profile?.name || ""}${profile?.specialty ? " · " + profile.specialty : ""}</p>
    ${profile?.cedula ? `<p>Cédula profesional: ${profile.cedula}</p>` : ""}
    ${profile?.rfc    ? `<p>RFC: ${profile.rfc}</p>` : ""}
    ${profile?.phone  ? `<p>Tel: ${profile.phone}</p>` : ""}
  </div>
  <div class="folio-block">
    <div class="folio-label">Recibo No.</div>
    <div class="folio-num">${folio}</div>
    <div class="badge-pagado">✓ ${payment.status === "pagado" ? "PAGADO" : "PENDIENTE"}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Datos del paciente</div>
  <div class="info-grid">
    <div class="info-box"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
    <div class="info-box"><label>Fecha de pago</label><p>${today}</p></div>
  </div>
</div>

<div class="amount-block">
  <div>
    <div class="amount-label">Importe total</div>
    <div style="font-size:13px;color:#5A7270;margin-top:4px">${payment.concept}</div>
  </div>
  <div style="text-align:right">
    <div class="amount-value"><span class="amount-cur">$</span>${amountFmt}</div>
    <div style="font-size:11px;color:#9BAFAD;margin-top:4px">MXN · ${payment.method}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Detalle del servicio</div>
  <div class="info-grid">
    <div class="info-box"><label>Concepto</label><p>${payment.concept}</p></div>
    <div class="info-box"><label>Método de pago</label><p>${payment.method}</p></div>
  </div>
</div>

<div class="disclaimer">
  Este recibo ampara el pago de los servicios psicológicos descritos. No es comprobante fiscal (CFDI). 
  ${profile?.rfc ? "RFC del prestador: <strong>" + profile.rfc + "</strong>." : "Solicite factura al prestador de servicios si requiere comprobante fiscal."}
</div>

<div class="sig-area">
  <div>
    <div class="sig-line">
      <div class="sig-name">${patient?.name || "Paciente"}</div>
      <div class="sig-meta">Recibió servicios · ${today}</div>
    </div>
  </div>
  <div>
    <div class="sig-line">
      <div class="sig-name">${profile?.name || "Terapeuta"}</div>
      <div class="sig-meta">${profile?.specialty || "Psicólogo/a"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
    </div>
  </div>
</div>

<footer>
  <span>PsychoCore · Recibo de pago</span>
  <span>Folio ${folio} · Documento confidencial</span>
</footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV: EXPORTACIÓN FISCAL
// ─────────────────────────────────────────────────────────────────────────────
function exportCSV(payments, year, profile) {
  const yearStr = String(year);
  const rows = payments
    .filter(p => p.date.startsWith(yearStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const headers = ["Folio","Fecha","Paciente","Concepto","Monto (MXN)","Método","Estado","RFC Prestador","Terapeuta"];
  const lines = [
    headers.join(","),
    ...rows.map(p => [
      p.folio || "",
      p.date,
      `"${(p.patientName || "").replace(/"/g, '""')}"`,
      `"${(p.concept || "").replace(/"/g, '""')}"`,
      Number(p.amount).toFixed(2),
      p.method || "",
      p.status || "",
      profile?.rfc || "",
      `"${(profile?.name || "").replace(/"/g, '""')}"`,
    ].join(","))
  ];

  const csv  = "\uFEFF" + lines.join("\r\n"); // BOM para Excel español
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `PsychoCore_Ingresos_${yearStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function Finance({ payments = [], setPayments, patients = [], profile, autoOpen }) {
  const [showAdd,  setShowAdd]  = useState(false);

  useEffect(() => {
    if (autoOpen === "add") setShowAdd(true);
  }, [autoOpen]);
  const [filterPt, setFilterPt] = useState("");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({ patientId:"", date:fmt(todayDate), amount:"", concept:"Sesión individual", method:"Transferencia", status:"pagado" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();

  // Available years derived from data + current
  const years = useMemo(() => {
    const ys = new Set([String(new Date().getFullYear())]);
    payments.forEach(p => { if (p.date) ys.add(p.date.slice(0, 4)); });
    return [...ys].sort().reverse();
  }, [payments]);

  const filtered = useMemo(() =>
    payments
      .filter(p => (!filterPt || p.patientId === filterPt) && p.date.startsWith(filterYear))
      .sort((a,b) => b.date.localeCompare(a.date)),
    [payments, filterPt, filterYear]);

  const monthStr    = fmt(todayDate).slice(0,7);
  const monthIncome = payments.filter(p => p.status==="pagado" && p.date.startsWith(monthStr)).reduce((s,p)=>s+Number(p.amount),0);
  const totalPaid   = filtered.filter(p => p.status==="pagado").reduce((s,p)=>s+Number(p.amount),0);
  const totalPend   = filtered.filter(p => p.status==="pendiente").reduce((s,p)=>s+Number(p.amount),0);

  const save = () => {
    if (!form.patientId || !form.amount) return;
    const pt    = patients.find(p => p.id === form.patientId);
    const folio = nextFolio(payments);
    setPayments(prev => [...prev, { ...form, id:"pay"+uid(), patientName:pt?.name||"", folio }]);
    setForm({ patientId:"", date:fmt(todayDate), amount:"", concept:"Sesión individual", method:"Transferencia", status:"pagado" });
    setShowAdd(false);
  };

  const del    = id => setPayments(prev => prev.filter(p => p.id !== id));
  const toggle = id => setPayments(prev => prev.map(p => p.id===id ? {...p, status:p.status==="pagado"?"pendiente":"pagado"} : p));

  const stats = [
    { label:"Este mes",    value:fmtCur(monthIncome), icon:TrendingUp,  color:T.suc, bg:T.sucA },
    { label:"Cobrado",     value:fmtCur(totalPaid),   icon:CheckCircle, color:T.p,   bg:T.pA   },
    { label:"Por cobrar",  value:fmtCur(totalPend),   icon:AlertCircle, color:T.war, bg:T.warA },
  ];

  const paymentRow = (p) => {
    const patient = patients.find(pt => pt.id === p.patientId);
    return (
      <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 90px 100px 130px 110px 110px", gap:10, padding:"13px 20px", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{p.patientName.split(" ").slice(0,2).join(" ")}</div>
          {p.folio && <div style={{ fontFamily:"monospace", fontSize:10, color:T.tl, marginTop:1 }}>{p.folio}</div>}
        </div>
        <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm }}>{fmtDate(p.date)}</span>
        <span style={{ fontFamily:T.fH, fontSize:16, color:T.t, fontWeight:500 }}>{fmtCur(p.amount)}</span>
        <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{p.concept}</span>
        <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{p.method}</span>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <button onClick={() => toggle(p.id)} style={{ background:p.status==="pagado"?T.sucA:T.warA, border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>{p.status}</button>
          <button onClick={() => printRecibo(p, patient, profile)} title="Generar recibo PDF" style={{ background:T.pA, border:"none", borderRadius:6, padding:"4px 6px", cursor:"pointer", color:T.p }}>
            <Printer size={12}/>
          </button>
          <button onClick={() => del(p.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
        </div>
      </div>
    );
  };

  const mobileRow = (p) => {
    const patient = patients.find(pt => pt.id === p.patientId);
    return (
      <div key={p.id} style={{ padding:"16px 18px", borderBottom:`1px solid ${T.bdrL}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t }}>{p.patientName.split(" ").slice(0,2).join(" ")}</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2 }}>{fmtDate(p.date)} · {p.concept}</div>
            {p.folio && <div style={{ fontFamily:"monospace", fontSize:10, color:T.tl, marginTop:1 }}>{p.folio}</div>}
          </div>
          <div style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, flexShrink:0, marginLeft:8 }}>{fmtCur(p.amount)}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>{p.method}</span>
          <button onClick={() => toggle(p.id)}
            title="Tap para cambiar estado"
            style={{ display:"flex", alignItems:"center", gap:4, background:p.status==="pagado"?T.sucA:T.warA,
              border:`1px solid ${p.status==="pagado"?T.suc+"40":T.war+"40"}`,
              borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11,
              fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>
            {p.status==="pagado" ? <CheckCircle size={10}/> : <AlertCircle size={10}/>}
            {p.status}
          </button>
          <button onClick={() => printRecibo(p, patient, profile)} title="Recibo PDF" style={{ background:T.pA, border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", color:T.p, display:"flex", alignItems:"center" }}>
            <Printer size={12}/>
          </button>
          <button onClick={() => del(p.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", marginLeft:"auto" }}><Trash2 size={13}/></button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Finanzas" subtitle="Control de ingresos y estados de cuenta"
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Registrar pago</Btn>}
      />

      {/* KPI Stats — una sola fila */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding:"14px 12px" }}>
            <div style={{ width:32, height:32, borderRadius:9, background:s.bg,
              display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
              <s.icon size={15} color={s.color} strokeWidth={1.7}/>
            </div>
            <div style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:T.t, lineHeight:1, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:10, fontWeight:600, color:T.tl, fontFamily:T.fB,
              letterSpacing:"0.05em", textTransform:"uppercase" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · {fmtCur(totalPaid)} cobrado
        </span>
      </div>

      {/* Table */}
      <Card>
        {isMobile ? (
          filtered.length === 0
            ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botón de arriba" />
            : filtered.map(p => mobileRow(p))
        ) : (
          <>
            <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 90px 100px 130px 110px 110px", gap:10 }}>
              {["Paciente / Folio","Fecha","Monto","Concepto","Método","Acciones"].map(h => (
                <span key={h} style={{ fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</span>
              ))}
            </div>
            {filtered.length === 0
              ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botón de arriba" />
              : filtered.map(p => paymentRow(p))
            }
          </>
        )}
      </Card>

      {/* Add payment modal */}
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
        <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:16, fontFamily:T.fB, fontSize:12, color:T.p }}>
          Se generará automáticamente el folio <strong>{nextFolio(payments)}</strong> para este pago.
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.amount}><Check size={15}/> Guardar pago</Btn>
        </div>
      </Modal>
    </div>
  );
}
