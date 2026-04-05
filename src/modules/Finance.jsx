import { useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  DollarSign, Trash2, TrendingUp, AlertCircle, CheckCircle, Check,
  Plus, Printer, Share2, MessageCircle, TrendingDown, BarChart2,
  FileText, Pencil,
} from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur } from "../utils.js";
import { Card, Modal, Input, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useIsWide }   from "../hooks/useIsWide.js";
// FIX D1: import emit para ui:toast desde el event bus existente
import { emit } from "../lib/eventBus.js";
import { useAppState } from "../context/AppStateContext.jsx";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FOLIO GENERATOR â€” YYYY-MM-NNNN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PDF: RECIBO DE PAGO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildReciboHtml(payment, patient, profile) {
  const today = new Date(payment.date + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const folio = payment.folio || "â€”";
  const amount = Number(payment.amount);
  const amountFmt = amount.toLocaleString("es-MX", { minimumFractionDigits: 2 });

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Recibo ${folio} â€” ${patient?.name}</title>
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
    <h1>${profile?.clinic || "Consultorio PsicolÃ³gico"}</h1>
    <p>${profile?.name || ""}${profile?.specialty ? " Â· " + profile.specialty : ""}</p>
    ${profile?.cedula ? `<p>CÃ©dula profesional: ${profile.cedula}</p>` : ""}
    ${profile?.rfc    ? `<p>RFC: ${profile.rfc}</p>` : ""}
    ${profile?.phone  ? `<p>Tel: ${profile.phone}</p>` : ""}
  </div>
  <div class="folio-block">
    <div class="folio-label">Recibo No.</div>
    <div class="folio-num">${folio}</div>
    <div class="badge-pagado">âœ“ ${payment.status === "pagado" ? "PAGADO" : payment.status === "parcial" ? "PAGO PARCIAL" : "PENDIENTE"}</div>
  </div>
</div>
<div class="section">
  <div class="section-title">Datos del paciente</div>
  <div class="info-grid">
    <div class="info-box"><label>Paciente</label><p>${patient?.name || "â€”"}</p></div>
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
    <div style="font-size:11px;color:#9BAFAD;margin-top:4px">MXN Â· ${payment.method}</div>
    ${payment.status === "parcial" ? `<div style="font-size:12px;color:#B85050;margin-top:6px;font-weight:700">Saldo pendiente: $${Math.max(0, Number(payment.amount) - Number(payment.amountPaid||0)).toLocaleString("es-MX",{minimumFractionDigits:2})} MXN</div>` : ""}
  </div>
</div>
<div class="section">
  <div class="section-title">Detalle del servicio</div>
  <div class="info-grid">
    <div class="info-box"><label>Concepto</label><p>${payment.concept}</p></div>
    <div class="info-box"><label>MÃ©todo de pago</label><p>${payment.method}</p></div>
  </div>
</div>
<div class="disclaimer">
  Este recibo ampara el pago de los servicios psicolÃ³gicos descritos. No es comprobante fiscal (CFDI).
  ${profile?.rfc ? "RFC del prestador: <strong>" + profile.rfc + "</strong>." : "Solicite factura al prestador de servicios si requiere comprobante fiscal."}
</div>
<div class="sig-area">
  <div><div class="sig-line">
    <div class="sig-name">${patient?.name || "Paciente"}</div>
    <div class="sig-meta">RecibiÃ³ servicios Â· ${today}</div>
  </div></div>
  <div><div class="sig-line">
    <div class="sig-name">${profile?.name || "Terapeuta"}</div>
    <div class="sig-meta">${profile?.specialty || "PsicÃ³logo/a"}${profile?.cedula ? " Â· CÃ©d. " + profile.cedula : ""}</div>
  </div></div>
</div>
<footer>
  <span>PsychoCore Â· Recibo de pago</span>
  <span>Folio ${folio} Â· Documento confidencial</span>
</footer>
</body></html>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHARE: RECIBO COMO IMAGEN (WhatsApp / Compartir)
// FIX D1: funciÃ³n pura sin side effects de UI â€” el feedback lo maneja
//         handleShareRecibo() dentro del componente vÃ­a emit.toast
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function shareRecibo(payment, patient, profile) {
  const folio     = payment.folio || "â€”";
  const nombre    = patient?.name || payment.patientName || "Paciente";
  const fecha     = new Date(payment.date + "T12:00").toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" });
  const monto     = Number(payment.status === "parcial" ? (payment.amountPaid||0) : payment.amount);
  const montFmt   = "$" + monto.toLocaleString("es-MX", { minimumFractionDigits:2 });
  const terapeuta = profile?.name || "Terapeuta";
  const clinica   = profile?.clinic || "PsychoCore";
  const cedula    = profile?.cedula ? `CÃ©d. ${profile.cedula}` : "";
  const statusLabel = payment.status === "pagado" ? "âœ“ PAGADO" : payment.status === "parcial" ? "PAGO PARCIAL" : "PENDIENTE";
  const statusBg    = payment.status === "pagado" ? "#4E8B5F" : payment.status === "parcial" ? "#B8900A" : "#B85050";

  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-9999px;top:-9999px;z-index:-1;";
  wrap.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <div id="recibo-dom" style="width:500px;background:#fff;border-radius:0;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:none;">
      <div style="background:#3A6B6E;padding:20px 24px 18px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
          <div>
            <div style="font-size:15px;font-weight:800;color:#fff;line-height:1.3;">${clinica}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">${cedula}</div>
          </div>
          <div style="background:rgba(255,255,255,0.13);border-radius:8px;padding:7px 14px;text-align:center;min-width:120px;">
            <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:0.1em;margin-bottom:3px;">FOLIO</div>
            <div style="font-size:12px;font-weight:700;color:#fff;font-family:monospace;">${folio}</div>
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.15);margin-bottom:14px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:0.1em;margin-bottom:6px;">
              ${payment.status === "parcial" ? "MONTO PAGADO" : "IMPORTE TOTAL"}
            </div>
            <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;letter-spacing:-0.5px;">${montFmt}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:5px;">MXN Â· ${payment.method || ""}</div>
            ${payment.status === "parcial" ? `<div style="font-size:11px;font-weight:700;color:rgba(255,180,180,0.9);margin-top:4px;">Saldo: $${Math.max(0,Number(payment.amount)-Number(payment.amountPaid||0)).toLocaleString("es-MX",{minimumFractionDigits:2})} MXN</div>` : ""}
          </div>
          <div style="background:${statusBg};border-radius:20px;padding:6px 14px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.05em;">${statusLabel}</div>
        </div>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[["PACIENTE",nombre],["FECHA",fecha],["CONCEPTO",payment.concept||"SesiÃ³n"],["TERAPEUTA",terapeuta,cedula]].map(([label,value,sub])=>`
          <div style="background:#F7F9F8;border-radius:10px;padding:12px 14px;">
            <div style="font-size:8px;font-weight:700;color:#9BAFAD;letter-spacing:0.09em;margin-bottom:5px;">${label}</div>
            <div style="font-size:13px;font-weight:700;color:#1A2B28;line-height:1.3;">${value}</div>
            ${sub?`<div style="font-size:10px;color:#9BAFAD;margin-top:3px;">${sub}</div>`:""}`).join("")}
      </div>
      <div style="border-top:1px solid #EEF2F1;margin:0 16px;padding:12px 0 16px;text-align:center;">
        <div style="font-size:9px;color:#B0BFC0;line-height:1.6;">Este recibo ampara el pago de servicios psicolÃ³gicos. No es comprobante fiscal (CFDI).</div>
        <div style="font-size:9px;color:#D0DCDA;margin-top:4px;">PsychoCore Â· Folio ${folio} Â· Documento confidencial</div>
      </div>
    </div>`;

  document.body.appendChild(wrap);
  await document.fonts.ready;
  const node = wrap.querySelector("#recibo-dom");
  const canvas = await html2canvas(node, { scale:2, useCORS:true, backgroundColor:"#ffffff", logging:false });
  document.body.removeChild(wrap);

  await new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      try {
        const fname = `Recibo_${folio}_${nombre.split(" ")[0]}.png`;
        const file  = new File([blob], fname, { type:"image/png" });
        if (navigator.canShare?.({ files:[file] })) {
          try { await navigator.share({ files:[file], title:`Recibo ${folio} â€” ${nombre}` }); resolve(); return; }
          catch (e) { if (e.name === "AbortError") { resolve(); return; } }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fname; a.click();
        URL.revokeObjectURL(url);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, "image/png");
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CSV: EXPORTACIÃ“N FISCAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function exportCSV(payments, year, profile) {
  const yearStr = String(year);
  const rows = payments
    .filter(p => p.date.startsWith(yearStr))
    .sort((a, b) => a.date.localeCompare(b.date));
  const headers = ["Folio","Fecha","Paciente","Concepto","Monto (MXN)","MÃ©todo","Estado","RFC Prestador","Terapeuta"];
  const lines = [
    headers.join(","),
    ...rows.map(p => [
      p.folio || "",
      p.date,
      `"${(p.patientName || "").replace(/"/g,'""')}"`,
      `"${(p.concept || "").replace(/"/g,'""')}"`,
      Number(p.amount).toFixed(2),
      p.method || "",
      p.status || "",
      profile?.rfc || "",
      `"${(profile?.name || "").replace(/"/g,'""')}"`,
    ].join(","))
  ];
  const csv  = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `PsychoCore_Ingresos_${yearStr}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UTILIDADES PARA REPORTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function filterByRange(items, field, start, end) {
  return items.filter(i => i[field] >= start && i[field] <= end);
}

function mxn(n) {
  return "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function getPeriodRange(period, MONTHS) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (period) {
    case "semana_actual": {
      const dow = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: fmtISO(mon), end: fmtISO(sun), label: "Semana actual" };
    }
    case "mes_anterior": {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      return { start:`${py}-${String(pm+1).padStart(2,"0")}-01`, end:fmtISO(new Date(py,pm+1,0)), label:`${MONTHS[pm]} ${py}` };
    }
    case "anio_actual":
      return { start:`${y}-01-01`, end:`${y}-12-31`, label:String(y) };
    default:
      return { start:`${y}-${String(m+1).padStart(2,"0")}-01`, end:fmtISO(new Date(y,m+1,0)), label:`${MONTHS[m]} ${y}` };
  }
}

function getPrevPeriodRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (period) {
    case "semana_actual": {
      const dow = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (dow===0?6:dow-1) - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start:fmtISO(mon), end:fmtISO(sun) };
    }
    case "mes_anterior": {
      const pm = m <= 1 ? 12 - (1-m) : m - 2;
      const py = m <= 1 ? y - 1 : y;
      return { start:`${py}-${String(pm+1).padStart(2,"0")}-01`, end:fmtISO(new Date(py,pm+1,0)) };
    }
    case "anio_actual":
      return { start:`${y-1}-01-01`, end:`${y-1}-12-31` };
    default:
      return { start:`${y}-${String(m).padStart(2,"0")}-01`, end:fmtISO(new Date(y,m,0)) };
  }
}

function printReport(html, onMsg) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    if (onMsg) onMsg("error");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
  if (onMsg) onMsg("success");
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONSTANTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MONTHS_LIST = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const EXPENSE_CATS = ["Renta","Servicios (luz, agua, internet)","Materiales y papelerÃ­a","Suscripciones de software","FormaciÃ³n continua","Publicidad","Honorarios","Otros"];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CSS BASE PARA REPORTES PDF
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RPT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:720px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.6;padding:0 24px}
.rpt-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #3A6B6E}
.rpt-title{font-size:22px;font-weight:700;color:#3A6B6E;margin-bottom:2px}
.rpt-sub{font-size:12px;color:#5A7270}
.org{font-size:11px;color:#5A7270;text-align:right}
.kpi-grid{display:grid;gap:12px;margin-bottom:24px}
.kpi-g3{grid-template-columns:repeat(3,1fr)}
.kpi-g4{grid-template-columns:repeat(4,1fr)}
.kpi-g2{grid-template-columns:repeat(2,1fr)}
.kpi{background:#F7F9F8;border-radius:10px;padding:14px 16px}
.kpi-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9BAFAD;margin-bottom:4px}
.kpi-value{font-size:22px;font-weight:700;color:#1A2B28}
.kpi-value.green{color:#4E8B5F}.kpi-value.red{color:#B85050}
.kpi-meta{font-size:11px;color:#9BAFAD;margin-top:2px}
h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9BAFAD;margin:20px 0 10px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9BAFAD;padding:8px 10px;text-align:left;border-bottom:2px solid #EDF1F0}
td{padding:9px 10px;border-bottom:1px solid #F0F4F3;color:#1A2B28}
tr:last-child td{border-bottom:none}
.bar-wrap{height:8px;background:#EDF1F0;border-radius:4px;overflow:hidden;margin-top:4px}
.bar{height:100%;background:#3A6B6E;border-radius:4px}
.bar-blue{background:#4A8FAD}
.note{margin-top:24px;padding:12px 16px;background:rgba(58,107,110,0.05);border-radius:8px;font-size:11px;color:#5A7270;line-height:1.6;border-left:3px solid #3A6B6E}
.range-hdr{background:#3A6B6E;color:#fff;padding:9px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:600;display:flex;justify-content:space-between;align-items:center;margin-top:18px}
footer{margin-top:28px;padding-top:12px;border-top:1px solid #D8E2E0;font-size:10px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0;max-width:none}@page{margin:12mm}}`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PDF R1 â€” Ingresos por perÃ­odo
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildR1Html(payments, period, profile) {
  const range = getPeriodRange(period, MONTHS_LIST);
  const prev  = getPrevPeriodRange(period);
  const paid  = payments.filter(p => p.status === "pagado");
  const curr  = filterByRange(paid, "date", range.start, range.end);
  const prevP = filterByRange(paid, "date", prev.start, prev.end);
  const total     = curr.reduce((s,p) => s + Number(p.amount), 0);
  const totalPrev = prevP.reduce((s,p) => s + Number(p.amount), 0);
  const pct       = totalPrev > 0 ? ((total - totalPrev) / totalPrev * 100).toFixed(1) : null;

  const byDay = {};
  curr.forEach(p => { byDay[p.date] = (byDay[p.date]||0) + Number(p.amount); });
  const days  = Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b));
  const maxD  = Math.max(...days.map(([,v]) => v), 1);

  const changeHtml = pct !== null
    ? `<span style="font-size:18px;font-weight:700;color:${Number(pct)>=0?"#4E8B5F":"#B85050"}">${Number(pct)>=0?"+":""}${pct}%</span><br><span style="font-size:11px;color:#9BAFAD">vs perÃ­odo anterior</span>`
    : `<span style="font-size:12px;color:#9BAFAD">Sin datos anteriores</span>`;

  const rows = days.map(([date, amount]) => {
    const bp = Math.round((amount/maxD)*100);
    return `<tr>
      <td>${new Date(date+"T12:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"})}</td>
      <td style="width:50%"><div class="bar-wrap"><div class="bar" style="width:${bp}%"></div></div></td>
      <td style="text-align:right;font-weight:600">${mxn(amount)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ingresos â€” ${range.label}</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">Reporte de Ingresos</div><div class="rpt-sub">PerÃ­odo: ${range.label}</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g3">
    <div class="kpi"><div class="kpi-label">Total perÃ­odo</div><div class="kpi-value green">${mxn(total)}</div></div>
    <div class="kpi"><div class="kpi-label">Sesiones cobradas</div><div class="kpi-value">${curr.length}</div></div>
    <div class="kpi"><div class="kpi-label">VariaciÃ³n</div><div style="margin-top:6px">${changeHtml}</div></div>
  </div>
  <h2>Desglose por dÃ­a</h2>
  ${days.length > 0
    ? `<table><thead><tr><th>Fecha</th><th>Volumen</th><th style="text-align:right">Monto</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p style="color:#9BAFAD;padding:16px 0">Sin ingresos en este perÃ­odo.</p>`}
  <footer><span>PsychoCore Â· Reporte de Ingresos</span><span>${range.label} Â· ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PDF R2 â€” Ranking por paciente o servicio
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildR2Html(payments, groupBy, patients, profile) {
  const year = new Date().getFullYear();
  const paid = payments.filter(p => p.status === "pagado" && p.date.startsWith(String(year)));
  const totalYear = paid.reduce((s,p) => s + Number(p.amount), 0);
  const map = {};
  paid.forEach(p => {
    const key   = groupBy === "paciente" ? (p.patientId||p.patientName||"?") : (p.concept||"Sin concepto");
    const label = groupBy === "paciente"
      ? (patients.find(pt => pt.id === p.patientId)?.name || p.patientName || "Sin nombre")
      : (p.concept || "Sin concepto");
    if (!map[key]) map[key] = { label, total:0 };
    map[key].total += Number(p.amount);
  });
  const ranking = Object.values(map).sort((a,b) => b.total - a.total).slice(0,10);
  const maxVal  = Math.max(...ranking.map(r => r.total), 1);
  const byLabel = groupBy === "paciente" ? "Paciente" : "Servicio/Concepto";

  const rows = ranking.map((r,i) => {
    const pct = totalYear > 0 ? (r.total/totalYear*100).toFixed(1) : "0.0";
    const bp  = Math.round((r.total/maxVal)*100);
    return `<tr>
      <td style="font-weight:700;color:#3A6B6E;width:36px">#${i+1}</td>
      <td>${r.label}</td>
      <td style="width:30%"><div class="bar-wrap"><div class="bar" style="width:${bp}%"></div></div></td>
      <td style="text-align:right;font-weight:600">${mxn(r.total)}</td>
      <td style="text-align:right;color:#5A7270">${pct}%</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ranking Ingresos ${year}</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">Ranking de Ingresos</div><div class="rpt-sub">${byLabel} Â· AÃ±o ${year}</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g2">
    <div class="kpi"><div class="kpi-label">Total aÃ±o ${year}</div><div class="kpi-value green">${mxn(totalYear)}</div></div>
    <div class="kpi"><div class="kpi-label">${groupBy==="paciente"?"Pacientes con ingresos":"Conceptos distintos"}</div><div class="kpi-value">${Object.keys(map).length}</div></div>
  </div>
  <h2>Top 10 â€” ${byLabel}</h2>
  ${ranking.length > 0
    ? `<table><thead><tr><th>#</th><th>${byLabel}</th><th>Volumen</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p style="color:#9BAFAD;padding:16px 0">Sin ingresos registrados en ${year}.</p>`}
  <footer><span>PsychoCore Â· Ranking de Ingresos</span><span>AÃ±o ${year} Â· ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PDF R3 â€” Balance ingresos vs. gastos
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildR3Html(payments, expenses, period, profile) {
  const range = getPeriodRange(period, MONTHS_LIST);
  const paid  = filterByRange(payments.filter(p => p.status==="pagado"), "date", range.start, range.end);
  const exps  = filterByRange(expenses, "date", range.start, range.end);
  const totalI = paid.reduce((s,p) => s + Number(p.amount), 0);
  const totalG = exps.reduce((s,e) => s + Number(e.amount), 0);
  const util   = totalI - totalG;
  const margen = totalI > 0 ? (util/totalI*100).toFixed(1) : "0.0";

  const byCat = {};
  exps.forEach(e => { byCat[e.category] = (byCat[e.category]||0) + Number(e.amount); });
  const catRows = Object.entries(byCat).sort(([,a],[,b]) => b-a).map(([cat,amount]) => {
    const pct = totalG > 0 ? (amount/totalG*100).toFixed(1) : "0.0";
    return `<tr><td>${cat}</td><td style="text-align:right;font-weight:600">${mxn(amount)}</td><td style="text-align:right;color:#5A7270">${pct}%</td></tr>`;
  }).join("");

  const hasExpData = expenses.length > 0;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Balance â€” ${range.label}</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">Balance Financiero</div><div class="rpt-sub">PerÃ­odo: ${range.label}</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g4">
    <div class="kpi"><div class="kpi-label">Ingresos</div><div class="kpi-value green">${mxn(totalI)}</div></div>
    <div class="kpi"><div class="kpi-label">Gastos</div><div class="kpi-value red">${mxn(totalG)}</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad neta</div><div class="kpi-value ${util>=0?"green":"red"}">${mxn(util)}</div></div>
    <div class="kpi"><div class="kpi-label">Margen</div><div class="kpi-value ${Number(margen)>=0?"green":"red"}">${margen}%</div></div>
  </div>
  ${hasExpData && exps.length > 0 ? `
    <h2>Gastos por categorÃ­a</h2>
    <table><thead><tr><th>CategorÃ­a</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${catRows}</tbody></table>
  ` : !hasExpData ? `
    <div class="note">ðŸ’¡ Registra tus gastos en la secciÃ³n Gastos para ver el balance completo.</div>
  ` : `<p style="color:#9BAFAD;padding:16px 0">Sin gastos registrados en este perÃ­odo.</p>`}
  <footer><span>PsychoCore Â· Balance Financiero</span><span>${range.label} Â· ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PDF R4 â€” ProyecciÃ³n de ingresos
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildR4Html(appointments, patients, services, profile) {
  const today = fmtISO(new Date());
  const d7    = fmtISO(new Date(Date.now() + 7  * 86400000));
  const d15   = fmtISO(new Date(Date.now() + 15 * 86400000));
  const d30   = fmtISO(new Date(Date.now() + 30 * 86400000));
  const CANCELLED = ["cancelada_paciente","cancelada_psicologa"];
  const future = appointments.filter(a => a.date > today && !CANCELLED.includes(a.status));

  function est(appt) {
    const pt  = patients.find(p => p.id === appt.patientId);
    const svc = services.find(s => s.id === (pt?.defaultServiceId || appt.serviceId)) || services[0];
    if (!svc) return 0;
    return Number(svc.modality === "virtual" ? (svc.priceVirtual || svc.price) : svc.price) || 0;
  }

  const f7  = future.filter(a => a.date >= today && a.date <= d7);
  const f15 = future.filter(a => a.date >= today && a.date <= d15);
  const f30 = future.filter(a => a.date >= today && a.date <= d30);
  const sum  = arr => arr.reduce((s,a) => s + est(a), 0);

  function tRows(arr) {
    if (!arr.length) return `<tr><td colspan="4" style="color:#9BAFAD;text-align:center;padding:16px">Sin citas en este rango</td></tr>`;
    return arr.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time)).map(a => {
      const pt = patients.find(p => p.id === a.patientId);
      const e  = est(a);
      return `<tr>
        <td>${new Date(a.date+"T12:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"})}</td>
        <td style="color:#5A7270">${a.time||"â€”"}</td>
        <td>${pt?.name||"Paciente"}</td>
        <td style="text-align:right;font-weight:600;color:${e>0?"#4E8B5F":"#9BAFAD"}">${e>0?mxn(e):"â€”"}</td>
      </tr>`;
    }).join("");
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>ProyecciÃ³n de Ingresos</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">ProyecciÃ³n de Ingresos</div><div class="rpt-sub">Basada en citas agendadas y tarifas configuradas</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g3">
    <div class="kpi"><div class="kpi-label">PrÃ³ximos 7 dÃ­as</div><div class="kpi-value green">${mxn(sum(f7))}</div><div class="kpi-meta">${f7.length} cita${f7.length!==1?"s":""}</div></div>
    <div class="kpi"><div class="kpi-label">PrÃ³ximos 15 dÃ­as</div><div class="kpi-value">${mxn(sum(f15))}</div><div class="kpi-meta">${f15.length} cita${f15.length!==1?"s":""}</div></div>
    <div class="kpi"><div class="kpi-label">PrÃ³ximos 30 dÃ­as</div><div class="kpi-value">${mxn(sum(f30))}</div><div class="kpi-meta">${f30.length} cita${f30.length!==1?"s":""}</div></div>
  </div>
  <div class="range-hdr"><span>PrÃ³ximos 7 dÃ­as</span><span>${mxn(sum(f7))}</span></div>
  <table><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th style="text-align:right">Estimado</th></tr></thead><tbody>${tRows(f7)}</tbody></table>
  <div class="range-hdr"><span>PrÃ³ximos 15 dÃ­as</span><span>${mxn(sum(f15))}</span></div>
  <table><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th style="text-align:right">Estimado</th></tr></thead><tbody>${tRows(f15)}</tbody></table>
  <div class="range-hdr"><span>PrÃ³ximos 30 dÃ­as</span><span>${mxn(sum(f30))}</span></div>
  <table><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th style="text-align:right">Estimado</th></tr></thead><tbody>${tRows(f30)}</tbody></table>
  <div class="note">âš ï¸ ProyecciÃ³n basada en citas agendadas y tarifas configuradas. Sujeta a cambios por cancelaciones o modificaciones.</div>
  <footer><span>PsychoCore Â· ProyecciÃ³n de Ingresos</span><span>Generado ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN MODULE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Finance({
  payments = [], setPayments,
  patients = [],
  profile,
  autoOpen,
  // FIX D3: nueva prop para abrir modal de cobro especÃ­fico desde Dashboard
  openCobroId,
  services = [],
  expenses = [], setExpenses,
  appointments = [],
}) {
  // â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeTab, setActiveTab] = useState("ingresos");
  const { activePatientContext, setActivePatientContext } = useAppState();

  // â”€â”€ Ingresos: estado existente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showAdd,       setShowAdd]       = useState(false);
  const [cobroFromPending, setCobroFromPending] = useState(null);
  const [filterPt,      setFilterPt]      = useState("");
  const [editPayment,   setEditPayment]   = useState(null);
  const [savedPayment,  setSavedPayment]  = useState(null);
  const [filterStatus,  setFilterStatus]  = useState("");
  const now = new Date();
  const [filterYear,    setFilterYear]    = useState(String(now.getFullYear()));
  const [filterMonth,   setFilterMonth]   = useState(String(now.getMonth() + 1));
  const [filterDay,     setFilterDay]     = useState("");
  const [form, setForm] = useState({ patientId:"", date:fmt(todayDate), amount:"", concept:"", serviceId:"", modality:"", method:"Transferencia", status:"pagado" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const [showModalityPicker, setShowModalityPicker] = useState(false);
  const [seededPatientFilter, setSeededPatientFilter] = useState(false);

  useEffect(() => {
    if (activePatientContext?.patientId && !seededPatientFilter && !filterPt) {
      setFilterPt(activePatientContext.patientId);
      setSeededPatientFilter(true);
    }
  }, [activePatientContext?.patientId, seededPatientFilter, filterPt]);

  // FIX D1: estado de loading para shareRecibo â€” evita doble tap y da feedback visual
  const [reciboLoading, setReciboLoading] = useState(false);

  useEffect(() => { if (autoOpen === "add") setShowAdd(true); }, [autoOpen]);

  useEffect(() => {
    if (!showAdd || !activePatientContext?.patientId) return;
    setForm(f => f.patientId ? f : { ...f, patientId: activePatientContext.patientId });
  }, [showAdd, activePatientContext?.patientId]);

  // FIX D3: detectar openCobroId y abrir modal de ediciÃ³n automÃ¡ticamente
  useEffect(() => {
    if (!openCobroId || !payments.length) return;
    const payment = payments.find(p => p.id === openCobroId);
    if (payment) {
      setActiveTab("ingresos");
      setEditPayment({ ...payment });
    }
  }, [openCobroId, payments]);

  // â”€â”€ Gastos: estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const emptyExpForm = () => ({ date:fmt(todayDate), concept:"", amount:"", category:EXPENSE_CATS[0], notes:"" });
  const [showAddExp, setShowAddExp] = useState(false);
  const [editExp,    setEditExp]    = useState(null);
  const [expForm,    setExpForm]    = useState(emptyExpForm());
  const efld = k => v => setExpForm(f => ({ ...f, [k]: v }));

  // â”€â”€ Reportes: estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeReport,  setActiveReport]  = useState("r1");
  const [report1Period, setReport1Period] = useState("mes_actual");
  const [report2Group,  setReport2Group]  = useState("paciente");
  const [report3Period, setReport3Period] = useState("mes_actual");

  // â”€â”€ Feedback inline de generaciÃ³n de PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [pdfMsg, setPdfMsg] = useState(null);
  const showPdfMsg = (type) => {
    const text = type === "success"
      ? "Recibo abierto en nueva pestaÃ±a."
      : "Permite ventanas emergentes en tu navegador para exportar el PDF.";
    setPdfMsg({ type, text });
    setTimeout(() => setPdfMsg(null), type === "success" ? 3000 : 5000);
  };

  // FIX D1: wrapper interno con loading state + toast feedback vÃ­a eventBus
  const handleShareRecibo = async (payment, patient) => {
    if (reciboLoading) return;
    setReciboLoading(true);
    try {
      await shareRecibo(payment, patient, profile);
      emit.toast("Recibo generado con Ã©xito", "success", 3500);
    } catch (err) {
      console.error("[Finance] shareRecibo error:", err);
      emit.toast("Error al generar el recibo", "error", 4000);
    } finally {
      setReciboLoading(false);
    }
  };

  // â”€â”€ Ingresos: lÃ³gica existente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const SERVICE_TYPES_LABEL = {
    sesion:"SesiÃ³n individual", evaluacion:"EvaluaciÃ³n neuropsicolÃ³gica",
    pareja:"Terapia de pareja", grupo:"Grupo / Taller", paquete:"Paquete de sesiones", otro:"Otro"
  };
  const conceptOptions = services.length > 0
    ? [
        ...services.map(s => ({
          value: s.id,
          label: s.type === "paquete" ? `${s.name} (${s.sessions} ses)` : s.name || SERVICE_TYPES_LABEL[s.type] || s.type,
          svc: s,
        })),
        { value:"__otro__", label:"Otro", svc:null },
      ]
    : ["SesiÃ³n individual","EvaluaciÃ³n neuropsicolÃ³gica","Primera consulta (90 min)","Pareja / Familia","Taller / Grupo","Otro"]
        .map(c => ({ value:c, label:c, svc:null }));

  const handleConceptChange = (val) => {
    if (!services.length || val === "__otro__") {
      setForm(f => ({ ...f, concept:val==="__otro__"?"Otro":val, serviceId:"", modality:"", amount:"" }));
      return;
    }
    const opt = conceptOptions.find(o => o.value === val);
    const svc = opt?.svc;
    if (!svc) { setForm(f => ({ ...f, concept:val, serviceId:"", modality:"", amount:"" })); return; }
    if (svc.modality === "ambas") {
      setForm(f => ({ ...f, concept:opt.label, serviceId:svc.id, modality:"", amount:"" }));
      setShowModalityPicker(true);
    } else {
      const price = svc.modality === "virtual" ? svc.priceVirtual : svc.price;
      setForm(f => ({ ...f, concept:opt.label, serviceId:svc.id, modality:svc.modality, amount:String(price||"") }));
    }
  };

  const applyModality = (mod) => {
    const svc = services.find(s => s.id === form.serviceId);
    if (!svc) return;
    const price = mod === "virtual" ? svc.priceVirtual : svc.price;
    setForm(f => ({ ...f, modality:mod, amount:String(price||"") }));
    setShowModalityPicker(false);
  };

  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  const availableYears = useMemo(() => {
    const ys = new Set([String(new Date().getFullYear())]);
    payments.forEach(p => { if (p.date) ys.add(p.date.slice(0,4)); });
    return [...ys].sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    const mm = filterMonth ? String(filterMonth).padStart(2,"0") : null;
    const dd = filterDay   ? String(filterDay).padStart(2,"0")   : null;
    const prefix = filterYear + (mm?`-${mm}`:"") + (mm&&dd?`-${dd}`:"");
    return payments
      .filter(p =>
        (!filterPt     || p.patientId === filterPt) &&
        (!filterStatus || p.status    === filterStatus) &&
        p.date.startsWith(prefix)
      )
      .sort((a,b) => b.date.localeCompare(a.date));
  }, [payments, filterPt, filterStatus, filterYear, filterMonth, filterDay]);

  const monthStr    = fmt(todayDate).slice(0,7);
  const monthIncome = payments.filter(p => p.status==="pagado" && p.date.startsWith(monthStr)).reduce((s,p) => s+Number(p.amount),0);
  const totalPaid   = filtered.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount),0);
  const totalPend   = filtered.filter(p => p.status==="pendiente").reduce((s,p) => s+Number(p.amount),0);

  const save = () => {
    if (!form.patientId || !form.amount) return;
    const pt    = patients.find(p => p.id === form.patientId);
    const folio = nextFolio(payments);
    setPayments(prev => [...prev, { ...form, id:"pay"+uid(), patientName:pt?.name||"", folio }]);
    setForm({ patientId:"", date:fmt(todayDate), amount:"", concept:"", serviceId:"", modality:"", method:"Transferencia", status:"pagado" });
    setShowModalityPicker(false);
    setCobroFromPending(null);
    setShowAdd(false);
  };
  const del           = id => setPayments(prev => prev.filter(p => p.id !== id));
  const updatePayment = (updated) => { setPayments(prev => prev.map(p => p.id===updated.id?updated:p)); setEditPayment(null); setSavedPayment(updated); };
  const toggle = id => setPayments(prev => prev.map(p => p.id===id?{...p,status:p.status==="pagado"?"pendiente":"pagado"}:p));

  const stats = [
    { label:"Este mes",   value:fmtCur(monthIncome), icon:TrendingUp,  color:T.suc, bg:T.sucA, filterKey:""         },
    { label:"Cobrado",    value:fmtCur(totalPaid),   icon:CheckCircle, color:T.p,   bg:T.pA,   filterKey:"pagado"   },
    { label:"Por cobrar", value:fmtCur(totalPend),   icon:AlertCircle, color:T.war, bg:T.warA, filterKey:"pendiente"},
  ];

  // â”€â”€ Gastos: lÃ³gica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const yearStr     = fmt(todayDate).slice(0,4);
  const expMonthKpi = expenses.filter(e => e.date.startsWith(monthStr)).reduce((s,e) => s+Number(e.amount),0);
  const expYearKpi  = expenses.filter(e => e.date.startsWith(yearStr)).reduce((s,e) => s+Number(e.amount),0);
  const sortedExp   = useMemo(() => [...expenses].sort((a,b) => b.date.localeCompare(a.date)), [expenses]);

  const saveExpense = () => {
    if (!expForm.concept || !expForm.amount) return;
    if (editExp) {
      setExpenses?.(prev => prev.map(e => e.id===editExp.id ? {...e,...expForm} : e));
      setEditExp(null);
    } else {
      setExpenses?.(prev => [...prev, { ...expForm, id:"exp"+uid() }]);
    }
    setExpForm(emptyExpForm());
    setShowAddExp(false);
  };

  const delExpense = id => {
    if (window.confirm("Â¿Eliminar este gasto? No se puede deshacer."))
      setExpenses?.(prev => prev.filter(e => e.id !== id));
  };

  const openEditExp = (e) => {
    setExpForm({ date:e.date, concept:e.concept, amount:String(e.amount), category:e.category, notes:e.notes||"" });
    setEditExp(e);
    setShowAddExp(true);
  };

  // â”€â”€ Reportes: datos en vivo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const r1 = useMemo(() => {
    const range = getPeriodRange(report1Period, MONTHS_LIST);
    const prev  = getPrevPeriodRange(report1Period);
    const paid  = payments.filter(p => p.status==="pagado");
    const curr  = filterByRange(paid, "date", range.start, range.end);
    const prevP = filterByRange(paid, "date", prev.start, prev.end);
    const total     = curr.reduce((s,p) => s+Number(p.amount), 0);
    const totalPrev = prevP.reduce((s,p) => s+Number(p.amount), 0);
    const pct = totalPrev>0 ? ((total-totalPrev)/totalPrev*100).toFixed(1) : null;
    const byDay = {};
    curr.forEach(p => { byDay[p.date]=(byDay[p.date]||0)+Number(p.amount); });
    const days = Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b));
    return { total, pct, days, count:curr.length, range };
  }, [payments, report1Period]);

  const r2 = useMemo(() => {
    const paid = payments.filter(p => p.status==="pagado" && p.date.startsWith(yearStr));
    const totalYear = paid.reduce((s,p) => s+Number(p.amount), 0);
    const map = {};
    paid.forEach(p => {
      const key   = report2Group==="paciente" ? (p.patientId||p.patientName||"?") : (p.concept||"Sin concepto");
      const label = report2Group==="paciente"
        ? (patients.find(pt => pt.id===p.patientId)?.name || p.patientName || "Sin nombre")
        : (p.concept||"Sin concepto");
      if (!map[key]) map[key]={ label, total:0 };
      map[key].total += Number(p.amount);
    });
    return { ranking:Object.values(map).sort((a,b)=>b.total-a.total).slice(0,10), totalYear };
  }, [payments, report2Group, patients, yearStr]);

  const r3 = useMemo(() => {
    const range  = getPeriodRange(report3Period, MONTHS_LIST);
    const paid   = filterByRange(payments.filter(p => p.status==="pagado"), "date", range.start, range.end);
    const exps   = filterByRange(expenses, "date", range.start, range.end);
    const totalI = paid.reduce((s,p) => s+Number(p.amount), 0);
    const totalG = exps.reduce((s,e) => s+Number(e.amount), 0);
    const util   = totalI - totalG;
    const margen = totalI>0 ? (util/totalI*100).toFixed(1) : "0.0";
    const byCat  = {};
    exps.forEach(e => { byCat[e.category]=(byCat[e.category]||0)+Number(e.amount); });
    return { totalI, totalG, util, margen, byCat, range, hasExpenses:expenses.length>0 };
  }, [payments, expenses, report3Period]);

  const r4 = useMemo(() => {
    const today = fmtISO(new Date());
    const d7    = fmtISO(new Date(Date.now()+7*86400000));
    const d15   = fmtISO(new Date(Date.now()+15*86400000));
    const d30   = fmtISO(new Date(Date.now()+30*86400000));
    const CANCELLED = ["cancelada_paciente","cancelada_psicologa"];
    const future = appointments.filter(a => a.date>today && !CANCELLED.includes(a.status));
    function est(appt) {
      const pt  = patients.find(p => p.id===appt.patientId);
      const svc = services.find(s => s.id===(pt?.defaultServiceId||appt.serviceId)) || services[0];
      if (!svc) return 0;
      return Number(svc.modality==="virtual"?(svc.priceVirtual||svc.price):svc.price)||0;
    }
    const f7   = future.filter(a => a.date>=today && a.date<=d7);
    const f15  = future.filter(a => a.date>=today && a.date<=d15);
    const f30  = future.filter(a => a.date>=today && a.date<=d30);
    const sum7  = f7.reduce((s,a)=>s+est(a),0);
    const sum15 = f15.reduce((s,a)=>s+est(a),0);
    const sum30 = f30.reduce((s,a)=>s+est(a),0);
    return { f7, f15, f30, sum7, sum15, sum30, est };
  }, [appointments, patients, services]);

  // â”€â”€ Abrir modal "Cobrar" desde un pago pendiente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openCobroFromPending = (p) => {
    setCobroFromPending(p);
    const patient = patients.find(pt => pt.id === p.patientId);
    if (patient) setActivePatientContext({ patientId: patient.id, patientName: patient.name || "", source: "finance", updatedAt: new Date().toISOString() });
    setForm(f => ({ ...f, patientId: p.patientId, concept: p.concept || "", date: fmt(todayDate), amount: p.amount ? String(p.amount) : "", status: "pagado" }));
    setShowAdd(true);
  };

  // â”€â”€ Helpers de UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          {p.status === "pendiente" && (
            <button
              onClick={() => openCobroFromPending(p)}
              style={{ background:T.p, border:"none", borderRadius:6, padding:"3px 9px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:"#fff", fontWeight:700, whiteSpace:"nowrap" }}>
              Cobrar
            </button>
          )}
          <button onClick={() => toggle(p.id)} style={{ background:p.status==="pagado"?T.sucA:T.warA, border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>{p.status}</button>
          {/* FIX D1: onClick usa handleShareRecibo con loading + toast */}
          <button
            onClick={() => handleShareRecibo(p, patient)}
            disabled={reciboLoading}
            title="Generar recibo"
            style={{ background:T.pA, border:"none", borderRadius:6, padding:"4px 6px",
              cursor:reciboLoading ? "not-allowed" : "pointer", color:T.p,
              opacity:reciboLoading ? 0.55 : 1, transition:"opacity .15s" }}>
            {reciboLoading ? <span style={{ fontSize:11, fontFamily:T.fB }}>â€¦</span> : <Printer size={12}/>}
          </button>
          <button onClick={() => del(p.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
        </div>
      </div>
    );
  };

  const mobileRow = (p) => (
    <div key={p.id}
      onClick={() => setEditPayment({ ...p })}
      style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdrL}`, cursor:"pointer", transition:"background .13s" }}
      onMouseEnter={e => e.currentTarget.style.background=T.cardAlt}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {p.patientName.split(" ").slice(0,2).join(" ")}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:1 }}>{fmtDate(p.date)} Â· {p.concept}</div>
        </div>
        <div style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, flexShrink:0, marginLeft:12 }}>{fmtCur(p.amount)}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {p.folio && <span style={{ fontFamily:"monospace", fontSize:10, color:T.tl }}>{p.folio}</span>}
        {p.method && <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>{p.method}</span>}
        <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, fontSize:10, fontWeight:700, fontFamily:T.fB,
          background:p.status==="pagado"?T.sucA:T.warA, color:p.status==="pagado"?T.suc:T.war }}>
          {p.status==="pagado" ? <CheckCircle size={9}/> : <AlertCircle size={9}/>}
          {p.status}
        </span>
      </div>
    </div>
  );

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tabAction = {
    ingresos: <Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Registrar pago</Btn>,
    gastos:   <Btn onClick={() => { setExpForm(emptyExpForm()); setEditExp(null); setShowAddExp(true); }}><Plus size={15}/> Registrar gasto</Btn>,
    reportes: null,
  };

  const TABS = [
    { key:"ingresos", label:"Ingresos",  icon:DollarSign  },
    { key:"gastos",   label:"Gastos",    icon:TrendingDown },
    { key:"reportes", label:"Reportes",  icon:BarChart2   },
  ];

  const REPORTS = [
    { key:"r1", label:"Ingresos / PerÃ­odo" },
    { key:"r2", label:"Ranking"            },
    { key:"r3", label:"Balance"            },
    { key:"r4", label:"ProyecciÃ³n"         },
  ];

  const periodOptions = [
    { value:"mes_actual",   label:"Mes actual"   },
    { value:"mes_anterior", label:"Mes anterior" },
    { value:"anio_actual",  label:"AÃ±o actual"   },
  ];
  const periodOptionsWithWeek = [{ value:"semana_actual", label:"Semana actual" }, ...periodOptions];

  const expRow = (e) => (
    <div key={e.id} style={{ display:"grid", gridTemplateColumns:`${isMobile?"1fr":"1fr 90px 160px 100px 90px"}`, gap:10, padding:"12px 18px", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
      {isMobile ? (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{e.concept}</div>
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:2 }}>{fmtDate(e.date)} Â· {e.category}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, marginLeft:12 }}>
            <div style={{ fontFamily:T.fH, fontSize:18, fontWeight:500, color:T.err }}>{fmtCur(e.amount)}</div>
            <button onClick={() => openEditExp(e)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Pencil size={13}/></button>
            <button onClick={() => delExpense(e.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{e.concept}</div>
            {e.notes && <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:1 }}>{e.notes}</div>}
          </div>
          <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm }}>{fmtDate(e.date)}</span>
          <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{e.category}</span>
          <span style={{ fontFamily:T.fH, fontSize:16, color:T.err, fontWeight:500 }}>{fmtCur(e.amount)}</span>
          <div style={{ display:"flex", gap:5 }}>
            <button onClick={() => openEditExp(e)} style={{ background:T.pA, border:"none", borderRadius:6, padding:"4px 7px", cursor:"pointer", color:T.p }}><Pencil size={12}/></button>
            <button onClick={() => delExpense(e.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Finanzas"
        subtitle="Ingresos, gastos y reportes del consultorio"
        action={tabAction[activeTab]}
      />

      {(activePatientContext?.patientName || activeTab === "ingresos") && (
        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile ? "1fr" : "1.4fr 1fr 1fr",
          gap:10,
          marginBottom:18,
        }}>
          <div style={{
            padding:"14px 16px",
            borderRadius:18,
            background:`linear-gradient(135deg, ${T.pA} 0%, rgba(196,137,90,0.08) 100%)`,
            border:`1px solid ${T.bdrL}`,
          }}>
            <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
              Contexto activo
            </div>
            <div style={{ fontFamily:T.fH, fontSize:18, color:T.t, lineHeight:1.15, marginBottom:4 }}>
              {activePatientContext?.patientName || "Vista general"}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tl }}>
              Los filtros y el alta de cobro se mantienen prellenados cuando llegas desde un paciente.
            </div>
          </div>
          <div style={{
            padding:"14px 16px",
            borderRadius:18,
            background:T.card,
            border:`1px solid ${T.bdrL}`,
          }}>
            <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
              Este mes
            </div>
            <div style={{ fontFamily:T.fH, fontSize:20, color:T.suc, lineHeight:1.1 }}>{fmtCur(monthIncome)}</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>Ingresos cobrados</div>
          </div>
          <div style={{
            padding:"14px 16px",
            borderRadius:18,
            background:T.card,
            border:`1px solid ${T.bdrL}`,
          }}>
            <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
              Pendiente
            </div>
            <div style={{ fontFamily:T.fH, fontSize:20, color:T.war, lineHeight:1.1 }}>{fmtCur(totalPend)}</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>Cobros por resolver</div>
          </div>
        </div>
      )}
      {/* â”€â”€ Tab bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        display:"grid",
        gridTemplateColumns:isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
        gap:8,
        marginBottom:18,
      }}>
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px 16px",
                fontFamily:T.fB, fontSize:13, fontWeight:active?700:500,
                color:active?T.p:T.tm, background:active?T.pA:T.card,
                border:`1.5px solid ${active?T.p:T.bdrL}`,
                borderRadius:14, cursor:"pointer",
                boxShadow:active ? "0 8px 20px rgba(58,107,110,0.10)" : T.sh,
                transition:"all .15s" }}>
              <t.icon size={14}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "ingresos" && (
        <>
          {/* KPI Stats */}
          <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap:10, marginBottom:20 }}>
            {stats.map(s => {
              const active = filterStatus === s.filterKey;
              return (
                <button key={s.label} onClick={() => setFilterStatus(active?"":s.filterKey)}
                  style={{ padding:"14px 14px", borderRadius:18, textAlign:"left", cursor:"pointer",
                    background:active?s.bg:T.card, border:`2px solid ${active?s.color+"60":T.bdrL}`,
                    boxShadow:active?`0 0 0 3px ${s.color}15`:T.sh, transition:"all .15s", minHeight:114 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
                    <s.icon size={15} color={s.color} strokeWidth={1.7}/>
                  </div>
                  <div style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:active?s.color:T.t, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:active?s.color:T.tl, fontFamily:T.fB, letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{s.label}</div>
                </button>
              );
            })}
          </div>

          {/* Filtros */}
          <div style={{ marginBottom:8, padding:"14px", background:T.card, border:`1px solid ${T.bdrL}`, borderRadius:18, boxShadow:T.sh }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "repeat(3, 1fr)", gap:8, marginBottom:8 }}>
              <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterMonth(""); setFilterDay(""); }}
                style={{ padding:"9px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDay(""); }}
                style={{ padding:"9px 10px", border:`1.5px solid ${filterMonth?T.p:T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:filterMonth?T.p:T.t, fontWeight:filterMonth?600:400, background:filterMonth?T.pA:T.card, cursor:"pointer", outline:"none" }}>
                <option value="">Todo el aÃ±o</option>
                {MONTHS_LIST.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
              </select>
              <select value={filterDay} onChange={e => setFilterDay(e.target.value)} disabled={!filterMonth}
                style={{ padding:"9px 10px", border:`1.5px solid ${filterDay?T.p:T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13,
                  color:filterDay?T.p:(filterMonth?T.t:T.tl), fontWeight:filterDay?600:400, background:filterDay?T.pA:T.card,
                  cursor:filterMonth?"pointer":"not-allowed", outline:"none", opacity:filterMonth?1:0.5 }}>
                <option value="">DÃ­a</option>
                {filterMonth && Array.from({ length: new Date(Number(filterYear),Number(filterMonth),0).getDate() },(_,i)=>i+1).map(d => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
            </div>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, cursor:"pointer", outline:"none", boxSizing:"border-box" }}>
              <option value="">Todos los pacientes</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
            </select>
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:12 }}>
            {filtered.length} registro{filtered.length!==1?"s":""} Â· {fmtCur(totalPaid)} cobrado
            {filterStatus && <span style={{ marginLeft:6, color:filterStatus==="pagado"?T.p:T.war, fontWeight:600 }}>Â· {filterStatus}</span>}
          </div>

          {/* Feedback inline generaciÃ³n PDF */}
          {pdfMsg && (
            <div style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 10,
              fontFamily: T.fB,
              fontSize: 13,
              background: pdfMsg.type === "success" ? T.sucA : T.warA,
              border: `1.5px solid ${pdfMsg.type === "success" ? T.suc : T.war}`,
              color: pdfMsg.type === "success" ? T.suc : T.war,
              fontWeight: 500,
            }}>
              {pdfMsg.text}
            </div>
          )}

          {/* Tabla pagos */}
          <Card>
            {isMobile ? (
              filtered.length===0
                ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botÃ³n de arriba"/>
                : filtered.map(p => mobileRow(p))
            ) : (
              <>
                <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 90px 100px 130px 110px 110px", gap:10 }}>
                  {["Paciente / Folio","Fecha","Monto","Concepto","MÃ©todo","Acciones"].map(h => (
                    <span key={h} style={{ fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</span>
                  ))}
                </div>
                {filtered.length===0
                  ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botÃ³n de arriba"/>
                  : filtered.map(p => paymentRow(p))
                }
              </>
            )}
          </Card>
        </>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          TAB: GASTOS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === "gastos" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Gastos este mes", value:fmtCur(expMonthKpi), color:T.err, bg:"rgba(184,80,80,0.08)" },
              { label:`Gastos ${yearStr}`, value:fmtCur(expYearKpi),   color:T.war, bg:T.warA },
            ].map(s => (
              <div key={s.label} style={{ padding:"16px 14px", borderRadius:16, background:T.card, border:`1.5px solid ${T.bdrL}`, boxShadow:T.sh }}>
                <div style={{ fontFamily:T.fH, fontSize:26, fontWeight:500, color:s.color, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:600, color:T.tl, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            {!isMobile && (
              <div style={{ padding:"12px 18px", borderBottom:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 90px 160px 100px 90px", gap:10 }}>
                {["Concepto","Fecha","CategorÃ­a","Monto","Acciones"].map(h => (
                  <span key={h} style={{ fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</span>
                ))}
              </div>
            )}
            {sortedExp.length === 0
              ? <EmptyState icon={TrendingDown} title="Sin gastos registrados" desc="Registra tu primer gasto operativo con el botÃ³n de arriba"/>
              : sortedExp.map(e => expRow(e))
            }
          </Card>
        </>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          TAB: REPORTES
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === "reportes" && (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
            {REPORTS.map(r => {
              const active = activeReport === r.key;
              return (
                <button key={r.key} onClick={() => setActiveReport(r.key)}
                  style={{ padding:"8px 14px", borderRadius:10, fontFamily:T.fB, fontSize:12, fontWeight:active?700:500,
                    background:active?T.p:T.card, color:active?"#fff":T.tm,
                    border:`1.5px solid ${active?T.p:T.bdrL}`, cursor:"pointer", transition:"all .15s" }}>
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* â”€â”€ R1: Ingresos por perÃ­odo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeReport === "r1" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Ingresos por perÃ­odo</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <select value={report1Period} onChange={e => setReport1Period(e.target.value)}
                      style={{ padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.t, background:T.card, outline:"none" }}>
                      {periodOptionsWithWeek.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => printReport(buildR1Html(payments, report1Period, profile), showPdfMsg)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none",
                        background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={13}/> Exportar PDF
                    </button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                  <div style={{ padding:"14px", borderRadius:12, background:T.sucA }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.suc, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Total perÃ­odo</div>
                    <div style={{ fontFamily:T.fH, fontSize:24, fontWeight:500, color:T.suc }}>{fmtCur(r1.total)}</div>
                  </div>
                  <div style={{ padding:"14px", borderRadius:12, background:T.pA }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Sesiones</div>
                    <div style={{ fontFamily:T.fH, fontSize:24, fontWeight:500, color:T.t }}>{r1.count}</div>
                  </div>
                  <div style={{ padding:"14px", borderRadius:12, background:T.card, border:`1px solid ${T.bdrL}` }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Vs perÃ­odo anterior</div>
                    {r1.pct !== null
                      ? <div style={{ fontFamily:T.fH, fontSize:22, fontWeight:600, color:Number(r1.pct)>=0?T.suc:T.err }}>{Number(r1.pct)>=0?"+":""}{r1.pct}%</div>
                      : <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>Sin datos</div>}
                  </div>
                </div>
                {r1.days.length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Desglose por dÃ­a</div>
                    {(() => { const maxV = Math.max(...r1.days.map(([,v]) => v), 1); return r1.days.map(([date, amount]) => (
                      <div key={date} style={{ display:"grid", gridTemplateColumns:"100px 1fr 90px", gap:10, alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>
                          {new Date(date+"T12:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}
                        </span>
                        <div style={{ height:8, background:T.bdrL, borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.round((amount/maxV)*100)}%`, background:T.p, borderRadius:4 }}/>
                        </div>
                        <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t, textAlign:"right" }}>{fmtCur(amount)}</span>
                      </div>
                    ));})()}
                  </div>
                ) : (
                  <div style={{ padding:"20px 0", fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>Sin ingresos en este perÃ­odo.</div>
                )}
              </div>
            </Card>
          )}

          {/* â”€â”€ R2: Ranking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeReport === "r2" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Ranking de ingresos Â· {yearStr}</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <select value={report2Group} onChange={e => setReport2Group(e.target.value)}
                      style={{ padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.t, background:T.card, outline:"none" }}>
                      <option value="paciente">Por paciente</option>
                      <option value="servicio">Por tipo de servicio</option>
                    </select>
                    <button onClick={() => printReport(buildR2Html(payments, report2Group, patients, profile), showPdfMsg)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={13}/> Exportar PDF
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:14 }}>
                  Total aÃ±o: <strong style={{ color:T.t }}>{fmtCur(r2.totalYear)}</strong>
                </div>
                {r2.ranking.length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    {r2.ranking.map((row, i) => {
                      const pct   = r2.totalYear > 0 ? (row.total/r2.totalYear*100).toFixed(1) : "0.0";
                      const maxV  = r2.ranking[0].total || 1;
                      const barPct = Math.round((row.total/maxV)*100);
                      return (
                        <div key={row.label+i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 80px 56px", gap:8, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                          <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.p }}>#{i+1}</span>
                          <div>
                            <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:T.t }}>{row.label}</div>
                            <div style={{ height:6, background:T.bdrL, borderRadius:3, overflow:"hidden", marginTop:4 }}>
                              <div style={{ height:"100%", width:`${barPct}%`, background:T.p, borderRadius:3 }}/>
                            </div>
                          </div>
                          <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t, textAlign:"right" }}>{fmtCur(row.total)}</span>
                          <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:"20px 0", fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>Sin ingresos en {yearStr}.</div>
                )}
              </div>
            </Card>
          )}

          {/* â”€â”€ R3: Balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeReport === "r3" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Balance ingresos vs. gastos</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <select value={report3Period} onChange={e => setReport3Period(e.target.value)}
                      style={{ padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.t, background:T.card, outline:"none" }}>
                      {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => printReport(buildR3Html(payments, expenses, report3Period, profile), showPdfMsg)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={13}/> Exportar PDF
                    </button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:10, marginBottom:20 }}>
                  {[
                    { label:"Ingresos",     value:fmtCur(r3.totalI), color:T.suc, bg:T.sucA },
                    { label:"Gastos",       value:fmtCur(r3.totalG), color:T.err, bg:"rgba(184,80,80,0.08)" },
                    { label:"Utilidad",     value:fmtCur(r3.util),   color:r3.util>=0?T.suc:T.err, bg:r3.util>=0?T.sucA:"rgba(184,80,80,0.08)" },
                    { label:"Margen",       value:`${r3.margen}%`,   color:Number(r3.margen)>=0?T.suc:T.err, bg:Number(r3.margen)>=0?T.sucA:"rgba(184,80,80,0.08)" },
                  ].map(k => (
                    <div key={k.label} style={{ padding:"12px 14px", borderRadius:12, background:k.bg }}>
                      <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:k.color, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{k.label}</div>
                      <div style={{ fontFamily:T.fH, fontSize:isMobile?16:20, fontWeight:500, color:k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>
                {r3.hasExpenses && Object.keys(r3.byCat).length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Gastos por categorÃ­a</div>
                    {Object.entries(r3.byCat).sort(([,a],[,b])=>b-a).map(([cat, amount]) => {
                      const pct = r3.totalG > 0 ? (amount/r3.totalG*100).toFixed(0) : 0;
                      return (
                        <div key={cat} style={{ display:"grid", gridTemplateColumns:"1fr 80px 50px", gap:8, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                          <span style={{ fontFamily:T.fB, fontSize:12, color:T.t }}>{cat}</span>
                          <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.err, textAlign:"right" }}>{fmtCur(amount)}</span>
                          <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : !r3.hasExpenses ? (
                  <div style={{ padding:"14px 16px", background:T.pA, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.p, marginBottom:16 }}>
                    ðŸ’¡ Registra tus gastos en la secciÃ³n <strong>Gastos</strong> para ver el balance completo.
                  </div>
                ) : (
                  <div style={{ padding:"16px 0", fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin gastos registrados en este perÃ­odo.</div>
                )}
              </div>
            </Card>
          )}

          {/* â”€â”€ R4: ProyecciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeReport === "r4" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>ProyecciÃ³n de ingresos</div>
                  <button onClick={() => printReport(buildR4Html(appointments, patients, services, profile), showPdfMsg)}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    <FileText size={13}/> Exportar PDF
                  </button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                  {[
                    { label:"PrÃ³ximos 7 dÃ­as",  value:fmtCur(r4.sum7),  count:r4.f7.length  },
                    { label:"PrÃ³ximos 15 dÃ­as", value:fmtCur(r4.sum15), count:r4.f15.length },
                    { label:"PrÃ³ximos 30 dÃ­as", value:fmtCur(r4.sum30), count:r4.f30.length },
                  ].map((k,i) => (
                    <div key={i} style={{ padding:"14px", borderRadius:12, background:T.pA, border:`1.5px solid ${T.p}20` }}>
                      <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{k.label}</div>
                      <div style={{ fontFamily:T.fH, fontSize:isMobile?18:22, fontWeight:500, color:T.t, marginBottom:2 }}>{k.value}</div>
                      <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>{k.count} cita{k.count!==1?"s":""}</div>
                    </div>
                  ))}
                </div>
                {r4.f30.length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Detalle â€” prÃ³ximos 30 dÃ­as</div>
                    {r4.f30.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(a => {
                      const pt  = patients.find(p => p.id === a.patientId);
                      const est = r4.est(a);
                      return (
                        <div key={a.id} style={{ display:"grid", gridTemplateColumns:"120px 1fr 90px", gap:8, padding:"9px 0", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
                          <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                            {new Date(a.date+"T12:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"})}
                            {a.time && <span style={{ color:T.tl }}> {a.time}</span>}
                          </span>
                          <span style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{pt?.name||"Paciente"}</span>
                          <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:est>0?T.suc:T.tl, textAlign:"right" }}>{est>0?fmtCur(est):"â€”"}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:"20px 0", fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>Sin citas agendadas en los prÃ³ximos 30 dÃ­as.</div>
                )}
                <div style={{ padding:"12px 14px", background:T.warA, borderRadius:10, fontFamily:T.fB, fontSize:11.5, color:"#7A5E0A", marginBottom:20, lineHeight:1.6 }}>
                  âš ï¸ ProyecciÃ³n basada en citas agendadas y tarifas configuradas. Sujeta a cambios por cancelaciones o modificaciones.
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MODAL: AGREGAR PAGO
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setCobroFromPending(null); }} title="Registrar pago">
        {cobroFromPending ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Paciente</div>
            <div style={{ padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, background:T.cardAlt, fontFamily:T.fB, fontSize:14, color:T.t, fontWeight:500 }}>
              {cobroFromPending.patientName}
            </div>
          </div>
        ) : (
          <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
            options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]} />
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date"/>
          <Input label="Monto (MXN) *" value={form.amount} onChange={fld("amount")} type="number" placeholder="900"/>
        </div>
        <Select label="Concepto" value={form.serviceId || form.concept} onChange={handleConceptChange}
          options={[{value:"",label:"Seleccionar concepto..."}, ...conceptOptions]} />
        {showModalityPicker && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8, fontFamily:T.fB, fontSize:13, color:T.p }}>
            <div style={{ fontWeight:600, marginBottom:8 }}>Â¿QuÃ© modalidad fue la sesiÃ³n?</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => applyModality("presencial")}
                style={{ flex:1, padding:"8px", borderRadius:9, border:`1.5px solid ${T.bdr}`, background:T.card, fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t, cursor:"pointer" }}>
                ðŸ¢ Presencial
              </button>
              <button onClick={() => applyModality("virtual")}
                style={{ flex:1, padding:"8px", borderRadius:9, border:`1.5px solid ${T.p}`, background:T.pA, fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, cursor:"pointer" }}>
                ðŸ’» Virtual
              </button>
            </div>
          </div>
        )}
        {form.modality && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:-6, marginBottom:8, paddingLeft:2 }}>
            Modalidad: {form.modality==="presencial"?"ðŸ¢ Presencial":"ðŸ’» Virtual"}
            {" Â· "}
            <span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => setShowModalityPicker(true)}>Cambiar</span>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Select label="MÃ©todo" value={form.method} onChange={fld("method")}
            options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m=>({value:m,label:m}))} />
          <Select label="Estado" value={form.status} onChange={fld("status")}
            options={[{value:"pagado",label:"Pagado"},{value:"pendiente",label:"Pendiente"}]} />
        </div>
        <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:16, fontFamily:T.fB, fontSize:12, color:T.p }}>
          Se generarÃ¡ automÃ¡ticamente el folio <strong>{nextFolio(payments)}</strong> para este pago.
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setCobroFromPending(null); }}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.amount}><Check size={15}/> Guardar pago</Btn>
        </div>
      </Modal>

      {/* Modal confirmaciÃ³n de pago guardado */}
      {savedPayment && (
        <Modal open={!!savedPayment} onClose={() => setSavedPayment(null)} title="Pago guardado" width={400}>
          <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:T.sucA, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <CheckCircle size={26} color={T.suc} strokeWidth={1.5}/>
            </div>
            <div style={{ fontFamily:T.fH, fontSize:22, color:T.t, marginBottom:4 }}>
              {savedPayment.patientName?.split(" ").slice(0,2).join(" ")}
            </div>
            {savedPayment.status === "parcial" ? (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:"#B8900A" }}>{fmtCur(savedPayment.amountPaid)} pagado</div>
                <div style={{ fontFamily:T.fB, fontSize:13, color:T.err, fontWeight:600 }}>{fmtCur(Math.max(0,Number(savedPayment.amount)-Number(savedPayment.amountPaid||0)))} pendiente</div>
              </div>
            ) : (
              <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:T.suc, marginBottom:4 }}>{fmtCur(savedPayment.amount)}</div>
            )}
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:4 }}>{fmtDate(savedPayment.date)}</div>
            {savedPayment.folio && <div style={{ fontFamily:"monospace", fontSize:11, color:T.p, fontWeight:700 }}>{savedPayment.folio}</div>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {/* FIX D1: usa handleShareRecibo en lugar de llamada directa a shareRecibo */}
            <button
              onClick={() => { const patient = patients.find(pt => pt.id === savedPayment.patientId); handleShareRecibo(savedPayment, patient); }}
              disabled={reciboLoading}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px", borderRadius:10,
                border:`1.5px solid ${T.p}`, background:T.pA, fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.p,
                cursor:reciboLoading?"not-allowed":"pointer", opacity:reciboLoading?0.6:1 }}>
              <Share2 size={14}/> {reciboLoading ? "Generandoâ€¦" : "Compartir"}
            </button>
            <button onClick={() => setSavedPayment(null)}
              style={{ padding:"11px", borderRadius:10, border:`1.5px solid ${T.bdr}`, background:"transparent", fontFamily:T.fB, fontSize:13, color:T.tm, cursor:"pointer" }}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal editar/ver pago */}
      {editPayment && (
        <Modal open={!!editPayment} onClose={() => setEditPayment(null)}
          title={`Pago â€” ${editPayment.patientName?.split(" ").slice(0,2).join(" ")}`} width={480}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:T.pA, borderRadius:12, marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:28, fontWeight:500, color:T.t }}>{fmtCur(editPayment.amount)}</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{fmtDate(editPayment.date)}</div>
            </div>
            {editPayment.folio && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Folio</div>
                <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:T.p }}>{editPayment.folio}</div>
              </div>
            )}
          </div>
          {[
            { label:"Estado", value: editPayment.status==="parcial"
                ? `Parcial Â· $${Number(editPayment.amountPaid||0).toLocaleString("es-MX")} pagado Â· $${Math.max(0,Number(editPayment.amount)-Number(editPayment.amountPaid||0)).toLocaleString("es-MX")} pendiente`
                : editPayment.status,
              color: editPayment.status==="pagado"?T.suc:editPayment.status==="parcial"?"#B8900A":T.war },
            { label:"MÃ©todo",  value:editPayment.method,  color:T.t },
            { label:"Concepto",value:editPayment.concept, color:T.t },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.bdrL}` }}>
              <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em" }}>{row.label}</span>
              <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:row.color, textAlign:"right", maxWidth:"60%" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:20 }}>
            <button onClick={() => {
                if (window.confirm(`Â¿Eliminar el pago de ${editPayment.patientName?.split(" ")[0]}?\n\nEsta acciÃ³n no se puede deshacer.`)) {
                  del(editPayment.id); setEditPayment(null);
                }
              }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px", borderRadius:10, border:`1.5px solid ${T.errA}`, background:"transparent", fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.err, cursor:"pointer" }}>
              <Trash2 size={14}/> Eliminar
            </button>
            {/* FIX D1: usa handleShareRecibo en modal de ediciÃ³n */}
            <button
              onClick={() => { const patient = patients.find(pt => pt.id === editPayment.patientId); handleShareRecibo(editPayment, patient); }}
              disabled={reciboLoading}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"11px", borderRadius:10, border:"none",
                background:T.p, color:"#fff", fontFamily:T.fB, fontSize:13, fontWeight:600,
                cursor:reciboLoading?"not-allowed":"pointer", opacity:reciboLoading?0.7:1 }}>
              <Share2 size={14}/> {reciboLoading ? "Generandoâ€¦" : "Compartir"}
            </button>
          </div>
        </Modal>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MODAL: AGREGAR / EDITAR GASTO
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Modal
        open={showAddExp}
        onClose={() => { setShowAddExp(false); setEditExp(null); setExpForm(emptyExpForm()); }}
        title={editExp ? "Editar gasto" : "Registrar gasto"}
        width={460}
      >
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha *" value={expForm.date} onChange={efld("date")} type="date"/>
          <Input label="Monto (MXN) *" value={expForm.amount} onChange={efld("amount")} type="number" placeholder="0.00"/>
        </div>
        <Input label="Concepto *" value={expForm.concept} onChange={efld("concept")} placeholder="DescripciÃ³n del gasto"/>
        <Select label="CategorÃ­a" value={expForm.category} onChange={efld("category")}
          options={EXPENSE_CATS.map(c => ({ value:c, label:c }))}/>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tl, marginBottom:6 }}>Notas (opcional)</div>
          <textarea
            value={expForm.notes}
            onChange={e => efld("notes")(e.target.value)}
            placeholder="Notas adicionales..."
            rows={3}
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
              fontFamily:T.fB, fontSize:13, color:T.t, background:T.card,
              outline:"none", resize:"vertical", boxSizing:"border-box" }}
          />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => { setShowAddExp(false); setEditExp(null); setExpForm(emptyExpForm()); }}>Cancelar</Btn>
          <Btn onClick={saveExpense} disabled={!expForm.concept||!expForm.amount}><Check size={15}/> {editExp?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
