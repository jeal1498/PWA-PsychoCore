import { useState, useMemo, useEffect } from "react";
import { DollarSign, Trash2, TrendingUp, AlertCircle, CheckCircle, Check, Plus, Printer, Share2, MessageCircle } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur } from "../utils.js";
import { Card, Modal, Input, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

// ─────────────────────────────────────────────────────────────────────────────
// FOLIO GENERATOR — YYYY-NNNN
// ─────────────────────────────────────────────────────────────────────────────
function nextFolio(payments) {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `${year}-${month}-`;
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
function buildReciboHtml(payment, patient, profile) {
  const today = new Date(payment.date + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const folio = payment.folio || "—";
  const amount = Number(payment.amount);
  const amountFmt = amount.toLocaleString("es-MX", { minimumFractionDigits: 2 });

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
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
    <div class="badge-pagado">✓ ${payment.status === "pagado" ? "PAGADO" : payment.status === "parcial" ? "PAGO PARCIAL" : "PENDIENTE"}</div>
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
    <div class="amount-label">${payment.status === "parcial" ? "Monto pagado" : "Importe total"}</div>
    <div style="font-size:13px;color:#5A7270;margin-top:4px">${payment.concept}</div>
  </div>
  <div style="text-align:right">
    <div class="amount-value"><span class="amount-cur">$</span>${payment.status === "parcial" ? Number(payment.amountPaid||0).toLocaleString("es-MX",{minimumFractionDigits:2}) : amountFmt}</div>
    <div style="font-size:11px;color:#9BAFAD;margin-top:4px">MXN · ${payment.method}</div>
    ${payment.status === "parcial" ? `<div style="font-size:12px;color:#B85050;margin-top:6px;font-weight:700">Saldo pendiente: $${Math.max(0, Number(payment.amount) - Number(payment.amountPaid||0)).toLocaleString("es-MX",{minimumFractionDigits:2})} MXN</div>` : ""}
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
</body></html>`;
}


async function shareRecibo(payment, patient, profile) {
  const folio   = payment.folio || "—";
  const nombre  = patient?.name || payment.patientName || "Paciente";
  const fecha   = new Date(payment.date + "T12:00").toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" });
  const monto   = Number(payment.status === "parcial" ? (payment.amountPaid||0) : payment.amount);
  const montFmt = "$" + monto.toLocaleString("es-MX", { minimumFractionDigits:2 });
  const terapeuta = profile?.name || "Terapeuta";
  const clinica   = profile?.clinic || "";
  const cedula    = profile?.cedula ? `Céd. ${profile.cedula}` : "";

  // ── Canvas portrait compacto ──────────────────────────────────────────────
  const W = 500, H = 420;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const sep = (y) => {
    ctx.strokeStyle = "#E8EDEC"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(W - 32, y); ctx.stroke();
  };

  // ── Fondo ──
  ctx.fillStyle = "#FAFAF8";
  ctx.fillRect(0, 0, W, H);

  // ── Header band teal ──
  ctx.fillStyle = "#3A6B6E";
  ctx.fillRect(0, 0, W, 68);

  // Clínica (blanco sobre teal)
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 17px serif";
  ctx.fillText(clinica || "PsychoCore", 32, 32);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "11px sans-serif";
  ctx.fillText(cedula, 32, 50);

  // Folio + badge (derecha, sobre teal)
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 9px sans-serif";
  ctx.fillText("RECIBO", W - 32, 26);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px monospace";
  ctx.fillText(folio, W - 32, 44);

  // Badge estado (sobre teal)
  const statusLabel = payment.status === "pagado" ? "✓ PAGADO" : payment.status === "parcial" ? "PARCIAL" : "PENDIENTE";
  const statusColor = payment.status === "pagado" ? "#A8D5B5" : payment.status === "parcial" ? "#F5D98B" : "#F5A8A8";
  ctx.font = "bold 10px sans-serif";
  const bW = ctx.measureText(statusLabel).width + 20;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, W - 32 - bW, 52, bW, 20, 10);
  ctx.fillStyle = statusColor;
  ctx.fillText(statusLabel, W - 32 - 10, 66);

  // ── Sección: Paciente (izq) + Monto (der) ──
  ctx.textAlign = "left";
  ctx.fillStyle = "#9BAFAD";
  ctx.font = "bold 9px sans-serif";
  ctx.fillText("PACIENTE", 32, 92);
  ctx.fillStyle = "#1A2B28";
  ctx.font = "bold 17px serif";
  ctx.fillText(nombre, 32, 114);
  ctx.fillStyle = "#9BAFAD";
  ctx.font = "11px sans-serif";
  ctx.fillText(fecha, 32, 131);
  ctx.fillStyle = "#5A7270";
  ctx.font = "12px sans-serif";
  ctx.fillText(payment.concept || "Sesión", 32, 148);

  // Monto (derecha, alineado verticalmente con paciente)
  ctx.textAlign = "right";
  ctx.fillStyle = "#3A6B6E";
  ctx.font = "bold 38px serif";
  ctx.fillText(montFmt, W - 32, 122);
  ctx.fillStyle = "#9BAFAD";
  ctx.font = "11px sans-serif";
  ctx.fillText("MXN · " + (payment.method || ""), W - 32, 140);

  if (payment.status === "parcial") {
    const saldo = Math.max(0, Number(payment.amount) - Number(payment.amountPaid||0));
    ctx.fillStyle = "#B85050";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`Saldo: $${saldo.toLocaleString("es-MX",{minimumFractionDigits:2})}`, W - 32, 158);
  }

  sep(168);

  // ── Fila de método / concepto (chips) ──
  const chips = [payment.method, payment.concept].filter(Boolean);
  let cx = 32;
  chips.forEach(label => {
    ctx.font = "11px sans-serif";
    const cw = ctx.measureText(label).width + 18;
    ctx.fillStyle = "rgba(58,107,110,0.08)";
    roundRect(ctx, cx, 176, cw, 22, 11);
    ctx.fillStyle = "#3A6B6E";
    ctx.textAlign = "left";
    ctx.fillText(label, cx + 9, 191);
    cx += cw + 8;
  });

  sep(208);

  // ── Terapeuta ──
  ctx.textAlign = "left";
  ctx.fillStyle = "#9BAFAD";
  ctx.font = "bold 9px sans-serif";
  ctx.fillText("EMITIDO POR", 32, 226);
  ctx.fillStyle = "#1A2B28";
  ctx.font = "bold 14px serif";
  ctx.fillText(terapeuta, 32, 244);
  ctx.fillStyle = "#9BAFAD";
  ctx.font = "11px sans-serif";
  ctx.fillText(cedula, 32, 260);

  sep(274);

  // ── Disclaimer + footer ──
  ctx.fillStyle = "#B0BFC0";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  wrapText(ctx, "Este recibo ampara el pago de servicios psicológicos. No es comprobante fiscal (CFDI).", W / 2, 292, W - 64, 15);

  // Línea footer
  ctx.strokeStyle = "#E8EDEC"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, 332); ctx.lineTo(W - 32, 332); ctx.stroke();
  ctx.fillStyle = "#C8D6D4";
  ctx.font = "9px sans-serif";
  ctx.fillText(`PsychoCore · Folio ${folio} · Documento confidencial`, W / 2, 348);

  // ── Compartir / descargar ──────────────────────────────────────────────────
  canvas.toBlob(async (blob) => {
    const fname = `Recibo_${folio}_${nombre.split(" ")[0]}.png`;
    const file  = new File([blob], fname, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `Recibo ${folio} — ${nombre}` }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    // Fallback: descargar
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
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
  const [filterPt,     setFilterPt]     = useState("");
  const [editPayment,  setEditPayment]  = useState(null); // pago abierto en popup
  const [savedPayment, setSavedPayment] = useState(null); // confirmación tras guardar
  const [filterStatus, setFilterStatus] = useState(""); // "" | "pagado" | "pendiente"
  const now = new Date();
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1)); // "1"-"12" o ""
  const [filterDay,   setFilterDay]   = useState(""); // "1"-"31" o ""
  const [form, setForm] = useState({ patientId:"", date:fmt(todayDate), amount:"", concept:"Sesión individual", method:"Transferencia", status:"pagado" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();

  const MONTHS_LIST = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const availableYears = useMemo(() => {
    const ys = new Set([String(new Date().getFullYear())]);
    payments.forEach(p => { if (p.date) ys.add(p.date.slice(0, 4)); });
    return [...ys].sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    const mm = filterMonth ? String(filterMonth).padStart(2,"0") : null;
    const dd = filterDay   ? String(filterDay).padStart(2,"0")   : null;
    const prefix = filterYear + (mm ? `-${mm}` : "") + (mm && dd ? `-${dd}` : "");
    return payments
      .filter(p =>
        (!filterPt     || p.patientId === filterPt) &&
        (!filterStatus || p.status    === filterStatus) &&
        p.date.startsWith(prefix)
      )
      .sort((a,b) => b.date.localeCompare(a.date));
  }, [payments, filterPt, filterStatus, filterYear, filterMonth, filterDay]);

  const monthStr    = fmt(todayDate).slice(0,7);
  // KPI "Este mes" siempre muestra el mes actual sin importar el filtro
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

  const del           = id => setPayments(prev => prev.filter(p => p.id !== id));
  const updatePayment = (updated) => {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditPayment(null);
    setSavedPayment(updated); // mostrar confirmación con PDF
  };
  const toggle = id => setPayments(prev => prev.map(p => p.id===id ? {...p, status:p.status==="pagado"?"pendiente":"pagado"} : p));

  const stats = [
    { label:"Este mes",   value:fmtCur(monthIncome), icon:TrendingUp,  color:T.suc, bg:T.sucA, filterKey:""          },
    { label:"Cobrado",    value:fmtCur(totalPaid),   icon:CheckCircle, color:T.p,   bg:T.pA,   filterKey:"pagado"    },
    { label:"Por cobrar", value:fmtCur(totalPend),   icon:AlertCircle, color:T.war, bg:T.warA, filterKey:"pendiente" },
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
          <button onClick={() => shareRecibo(p, patient, profile)} title="Generar recibo PDF" style={{ background:T.pA, border:"none", borderRadius:6, padding:"4px 6px", cursor:"pointer", color:T.p }}>
            <Printer size={12}/>
          </button>
          <button onClick={() => del(p.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
        </div>
      </div>
    );
  };

  const mobileRow = (p) => (
    <div key={p.id}
      onClick={() => setEditPayment({ ...p })}
      style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdrL}`, cursor:"pointer",
        transition:"background .13s" }}
      onMouseEnter={e => e.currentTarget.style.background=T.cardAlt}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {p.patientName.split(" ").slice(0,2).join(" ")}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:1 }}>
            {fmtDate(p.date)} · {p.concept}
          </div>
        </div>
        <div style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, flexShrink:0, marginLeft:12 }}>
          {fmtCur(p.amount)}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {p.folio && <span style={{ fontFamily:"monospace", fontSize:10, color:T.tl }}>{p.folio}</span>}
        {p.method && <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>{p.method}</span>}
        <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px",
          borderRadius:9999, fontSize:10, fontWeight:700, fontFamily:T.fB,
          background:p.status==="pagado"?T.sucA:T.warA,
          color:p.status==="pagado"?T.suc:T.war }}>
          {p.status==="pagado" ? <CheckCircle size={9}/> : <AlertCircle size={9}/>}
          {p.status}
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Finanzas" subtitle="Control de ingresos y estados de cuenta"
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Registrar pago</Btn>}
      />

      {/* KPI Stats — tapeables para filtrar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {stats.map(s => {
          const active = filterStatus === s.filterKey;
          return (
            <button key={s.label}
              onClick={() => setFilterStatus(active ? "" : s.filterKey)}
              style={{ padding:"14px 12px", borderRadius:16, textAlign:"left", cursor:"pointer",
                background: active ? s.bg : T.card,
                border: `2px solid ${active ? s.color+"60" : T.bdrL}`,
                boxShadow: active ? `0 0 0 3px ${s.color}15` : T.sh,
                transition:"all .15s", minHeight:120 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:s.bg,
                display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
                <s.icon size={15} color={s.color} strokeWidth={1.7}/>
              </div>
              <div style={{ fontFamily:T.fH, fontSize:22, fontWeight:500,
                color: active ? s.color : T.t, lineHeight:1, marginBottom:4 }}>
                {s.value}
              </div>
              <div style={{ fontSize:10, fontWeight:600,
                color: active ? s.color : T.tl, fontFamily:T.fB,
                letterSpacing:"0.05em", textTransform:"uppercase",
                whiteSpace:"nowrap" }}>
                {s.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros — fecha centrada + paciente abajo */}
      <div style={{ marginBottom:8 }}>
        {/* Fila 1: año · mes · día — centrados */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:8 }}>
          {/* Año */}
          <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterMonth(""); setFilterDay(""); }}
            style={{ padding:"9px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
              fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Mes */}
          <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDay(""); }}
            style={{ padding:"9px 10px", border:`1.5px solid ${filterMonth ? T.p : T.bdr}`,
              borderRadius:10, fontFamily:T.fB, fontSize:13,
              color:filterMonth ? T.p : T.t, fontWeight:filterMonth ? 600 : 400,
              background:filterMonth ? T.pA : T.card, cursor:"pointer", outline:"none" }}>
            <option value="">Todo el año</option>
            {MONTHS_LIST.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
          {/* Día — select con días del mes */}
          <select value={filterDay} onChange={e => setFilterDay(e.target.value)}
            disabled={!filterMonth}
            style={{ padding:"9px 10px", border:`1.5px solid ${filterDay ? T.p : T.bdr}`,
              borderRadius:10, fontFamily:T.fB, fontSize:13,
              color:filterDay ? T.p : (filterMonth ? T.t : T.tl),
              fontWeight:filterDay ? 600 : 400,
              background:filterDay ? T.pA : T.card,
              cursor:filterMonth ? "pointer" : "not-allowed",
              outline:"none", opacity:filterMonth ? 1 : 0.5 }}>
            <option value="">Día</option>
            {filterMonth && Array.from(
              { length: new Date(Number(filterYear), Number(filterMonth), 0).getDate() },
              (_, i) => i + 1
            ).map(d => (
              <option key={d} value={String(d)}>{d}</option>
            ))}
          </select>
        </div>
        {/* Fila 2: paciente — ancho completo */}
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`,
            borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t,
            background:T.card, cursor:"pointer", outline:"none", boxSizing:"border-box" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>
      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:12 }}>
        {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · {fmtCur(totalPaid)} cobrado
        {filterStatus && <span style={{ marginLeft:6, color:filterStatus==="pagado"?T.p:T.war, fontWeight:600 }}>· {filterStatus}</span>}
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

      {/* ── Edit payment modal ─────────────────────────────────────────── */}
      {/* ── Modal de confirmación ─────────────────────────────────────── */}
      {savedPayment && (
        <Modal open={!!savedPayment} onClose={() => setSavedPayment(null)} title="Pago guardado" width={400}>
          <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:T.sucA,
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <CheckCircle size={26} color={T.suc} strokeWidth={1.5}/>
            </div>
            <div style={{ fontFamily:T.fH, fontSize:22, color:T.t, marginBottom:4 }}>
              {savedPayment.patientName?.split(" ").slice(0,2).join(" ")}
            </div>
            {savedPayment.status === "parcial" ? (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:"#B8900A" }}>
                  {fmtCur(savedPayment.amountPaid)} pagado
                </div>
                <div style={{ fontFamily:T.fB, fontSize:13, color:T.err, fontWeight:600 }}>
                  {fmtCur(Math.max(0, Number(savedPayment.amount) - Number(savedPayment.amountPaid||0)))} pendiente
                </div>
              </div>
            ) : (
              <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:T.suc, marginBottom:4 }}>
                {fmtCur(savedPayment.amount)}
              </div>
            )}
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:4 }}>
              {fmtDate(savedPayment.date)}
            </div>
            {savedPayment.folio && (
              <div style={{ fontFamily:"monospace", fontSize:11, color:T.p, fontWeight:700 }}>
                {savedPayment.folio}
              </div>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={() => {
              const patient = patients.find(pt => pt.id === savedPayment.patientId);
              shareRecibo(savedPayment, patient, profile);
            }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                padding:"11px", borderRadius:10, border:`1.5px solid ${T.p}`,
                background:T.pA, fontFamily:T.fB, fontSize:13, fontWeight:600,
                color:T.p, cursor:"pointer" }}>
              <Share2 size={14}/> Compartir
            </button>
            <button onClick={() => setSavedPayment(null)}
              style={{ padding:"11px", borderRadius:10, border:`1.5px solid ${T.bdr}`,
                background:"transparent", fontFamily:T.fB, fontSize:13, color:T.tm,
                cursor:"pointer" }}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {editPayment && (
        <Modal open={!!editPayment} onClose={() => setEditPayment(null)}
          title={`Pago — ${editPayment.patientName?.split(" ").slice(0,2).join(" ")}`}
          width={480}>

          {/* Resumen */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 16px", background:T.pA, borderRadius:12, marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:28, fontWeight:500, color:T.t }}>
                {fmtCur(editPayment.amount)}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                {fmtDate(editPayment.date)}
              </div>
            </div>
            {editPayment.folio && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.tl,
                  textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Folio</div>
                <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:T.p }}>
                  {editPayment.folio}
                </div>
              </div>
            )}
          </div>

          {/* Info — solo lectura */}
          {[
            { label:"Estado",  value: editPayment.status === "parcial"
                ? `Parcial · $${Number(editPayment.amountPaid||0).toLocaleString("es-MX")} pagado · $${Math.max(0,Number(editPayment.amount)-Number(editPayment.amountPaid||0)).toLocaleString("es-MX")} pendiente`
                : editPayment.status,
              color: editPayment.status==="pagado" ? T.suc : editPayment.status==="parcial" ? "#B8900A" : T.war },
            { label:"Método",  value: editPayment.method,  color: T.t },
            { label:"Concepto",value: editPayment.concept, color: T.t },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.bdrL}` }}>
              <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tl,
                textTransform:"uppercase", letterSpacing:"0.06em" }}>{row.label}</span>
              <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:row.color,
                textAlign:"right", maxWidth:"60%" }}>{row.value}</span>
            </div>
          ))}

          {/* Acciones — Eliminar · Compartir */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:20 }}>
            <button onClick={() => {
                if (window.confirm(`¿Eliminar el pago de ${editPayment.patientName?.split(" ")[0]}?

Esta acción no se puede deshacer.`)) {
                  del(editPayment.id);
                  setEditPayment(null);
                }
              }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                padding:"11px", borderRadius:10, border:`1.5px solid ${T.errA}`,
                background:"transparent", fontFamily:T.fB, fontSize:13,
                fontWeight:600, color:T.err, cursor:"pointer" }}>
              <Trash2 size={14}/> Eliminar
            </button>
            <button onClick={() => {
              const patient = patients.find(pt => pt.id === editPayment.patientId);
              shareRecibo(editPayment, patient, profile);
            }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                padding:"11px", borderRadius:10, border:"none",
                background:T.p, color:"#fff", fontFamily:T.fB, fontSize:13,
                fontWeight:600, cursor:"pointer" }}>
              <Share2 size={14}/> Compartir
            </button>
          </div>

        </Modal>
      )}
    </div>
  );
}
