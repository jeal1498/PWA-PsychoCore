// ─────────────────────────────────────────────────────────────────────────────
// finance.utils.js
// Utilidades puras, constantes y builders HTML para reportes y recibos.
// Sin imports de React. Sin side-effects de UI.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE STATUS
// ─────────────────────────────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PAGADO:    "pagado",
  PARCIAL:   "parcial",
  PENDIENTE: "pendiente",
};

export const MONTHS_LIST = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export const EXPENSE_CATS = [
  "Renta",
  "Servicios (luz, agua, internet)",
  "Materiales y papelería",
  "Suscripciones de software",
  "Formación continua",
  "Publicidad",
  "Honorarios",
  "Otros",
];

// ─────────────────────────────────────────────────────────────────────────────
// fmtCur — formateador de moneda dinámico
// ─────────────────────────────────────────────────────────────────────────────
export function fmtCur(n, currency = "MXN") {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency", currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return "$" + Number(n || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLIO GENERATOR — YYYY-MM-NNNN
// ─────────────────────────────────────────────────────────────────────────────
export function nextFolio(payments) {
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
// filterByRange
// ─────────────────────────────────────────────────────────────────────────────
export function filterByRange(items, field, start, end) {
  return items.filter(i => i[field] >= start && i[field] <= end);
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES INTERNAS (sin export — solo para los builders)
// ─────────────────────────────────────────────────────────────────────────────
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function mxn(n) {
  return "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

export function getPeriodRange(period, MONTHS) {
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

export function getPrevPeriodRange(period) {
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

export function printReport(html, onMsg) {
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

// ─────────────────────────────────────────────────────────────────────────────
// CSV: EXPORTACIÓN FISCAL
// ─────────────────────────────────────────────────────────────────────────────
export function exportCSV(payments, year, profile) {
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

// ─────────────────────────────────────────────────────────────────────────────
// CSS BASE PARA REPORTES PDF
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PDF: RECIBO DE PAGO (HTML estático para print/share)
// ─────────────────────────────────────────────────────────────────────────────
export function buildReciboHtml(payment, patient, profile) {
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
    <div style="font-size:11px;color:#9BAFAD;margin-top:4px">${profile?.currency || "MXN"} · ${payment.method}</div>
    ${payment.status === "parcial" ? `<div style="font-size:12px;color:#B85050;margin-top:6px;font-weight:700">Saldo pendiente: $${Math.max(0, Number(payment.amount) - Number(payment.amountPaid||0)).toLocaleString("es-MX",{minimumFractionDigits:2})} ${profile?.currency || "MXN"}</div>` : ""}
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
  <div><div class="sig-line">
    <div class="sig-name">${patient?.name || "Paciente"}</div>
    <div class="sig-meta">Recibió servicios · ${today}</div>
  </div></div>
  <div><div class="sig-line">
    <div class="sig-name">${profile?.name || "Terapeuta"}</div>
    <div class="sig-meta">${profile?.specialty || "Psicólogo/a"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
  </div></div>
</div>
<footer>
  <span>PsychoCore · Recibo de pago</span>
  <span>Folio ${folio} · Documento confidencial</span>
</footer>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF R1 — Ingresos por período
// ─────────────────────────────────────────────────────────────────────────────
export function buildR1Html(payments, period, profile) {
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
    ? `<span style="font-size:18px;font-weight:700;color:${Number(pct)>=0?"#4E8B5F":"#B85050"}">${Number(pct)>=0?"+":""}${pct}%</span><br><span style="font-size:11px;color:#9BAFAD">vs período anterior</span>`
    : `<span style="font-size:12px;color:#9BAFAD">Sin datos anteriores</span>`;

  const rows = days.map(([date, amount]) => {
    const bp = Math.round((amount/maxD)*100);
    return `<tr>
      <td>${new Date(date+"T12:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"})}</td>
      <td style="width:50%"><div class="bar-wrap"><div class="bar" style="width:${bp}%"></div></div></td>
      <td style="text-align:right;font-weight:600">${mxn(amount)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ingresos — ${range.label}</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">Reporte de Ingresos</div><div class="rpt-sub">Período: ${range.label}</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g3">
    <div class="kpi"><div class="kpi-label">Total período</div><div class="kpi-value green">${mxn(total)}</div></div>
    <div class="kpi"><div class="kpi-label">Sesiones cobradas</div><div class="kpi-value">${curr.length}</div></div>
    <div class="kpi"><div class="kpi-label">Variación</div><div style="margin-top:6px">${changeHtml}</div></div>
  </div>
  <h2>Desglose por día</h2>
  ${days.length > 0
    ? `<table><thead><tr><th>Fecha</th><th>Volumen</th><th style="text-align:right">Monto</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p style="color:#9BAFAD;padding:16px 0">Sin ingresos en este período.</p>`}
  <footer><span>PsychoCore · Reporte de Ingresos</span><span>${range.label} · ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF R2 — Ranking por paciente o servicio
// ─────────────────────────────────────────────────────────────────────────────
export function buildR2Html(payments, groupBy, patients, profile) {
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
    <div><div class="rpt-title">Ranking de Ingresos</div><div class="rpt-sub">${byLabel} · Año ${year}</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g2">
    <div class="kpi"><div class="kpi-label">Total año ${year}</div><div class="kpi-value green">${mxn(totalYear)}</div></div>
    <div class="kpi"><div class="kpi-label">${groupBy==="paciente"?"Pacientes con ingresos":"Conceptos distintos"}</div><div class="kpi-value">${Object.keys(map).length}</div></div>
  </div>
  <h2>Top 10 — ${byLabel}</h2>
  ${ranking.length > 0
    ? `<table><thead><tr><th>#</th><th>${byLabel}</th><th>Volumen</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p style="color:#9BAFAD;padding:16px 0">Sin ingresos registrados en ${year}.</p>`}
  <footer><span>PsychoCore · Ranking de Ingresos</span><span>Año ${year} · ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF R3 — Balance ingresos vs. gastos
// ─────────────────────────────────────────────────────────────────────────────
export function buildR3Html(payments, expenses, period, profile) {
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

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Balance — ${range.label}</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">Balance Financiero</div><div class="rpt-sub">Período: ${range.label}</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g4">
    <div class="kpi"><div class="kpi-label">Ingresos</div><div class="kpi-value green">${mxn(totalI)}</div></div>
    <div class="kpi"><div class="kpi-label">Gastos</div><div class="kpi-value red">${mxn(totalG)}</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad neta</div><div class="kpi-value ${util>=0?"green":"red"}">${mxn(util)}</div></div>
    <div class="kpi"><div class="kpi-label">Margen</div><div class="kpi-value ${Number(margen)>=0?"green":"red"}">${margen}%</div></div>
  </div>
  ${hasExpData && exps.length > 0 ? `
    <h2>Gastos por categoría</h2>
    <table><thead><tr><th>Categoría</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${catRows}</tbody></table>
  ` : !hasExpData ? `
    <div class="note">💡 Registra tus gastos en la sección Gastos para ver el balance completo.</div>
  ` : `<p style="color:#9BAFAD;padding:16px 0">Sin gastos registrados en este período.</p>`}
  <footer><span>PsychoCore · Balance Financiero</span><span>${range.label} · ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF R4 — Proyección de ingresos
// ─────────────────────────────────────────────────────────────────────────────
export function buildR4Html(appointments, patients, services, profile) {
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
        <td style="color:#5A7270">${a.time||"—"}</td>
        <td>${pt?.name||"Paciente"}</td>
        <td style="text-align:right;font-weight:600;color:${e>0?"#4E8B5F":"#9BAFAD"}">${e>0?mxn(e):"—"}</td>
      </tr>`;
    }).join("");
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Proyección de Ingresos</title>
  <style>${RPT_CSS}</style></head><body>
  <div class="rpt-header">
    <div><div class="rpt-title">Proyección de Ingresos</div><div class="rpt-sub">Basada en citas agendadas y tarifas configuradas</div></div>
    <div class="org">${profile?.clinic||"Consultorio"}<br>${profile?.name||""}</div>
  </div>
  <div class="kpi-grid kpi-g3">
    <div class="kpi"><div class="kpi-label">Próximos 7 días</div><div class="kpi-value green">${mxn(sum(f7))}</div><div class="kpi-meta">${f7.length} cita${f7.length!==1?"s":""}</div></div>
    <div class="kpi"><div class="kpi-label">Próximos 15 días</div><div class="kpi-value">${mxn(sum(f15))}</div><div class="kpi-meta">${f15.length} cita${f15.length!==1?"s":""}</div></div>
    <div class="kpi"><div class="kpi-label">Próximos 30 días</div><div class="kpi-value">${mxn(sum(f30))}</div><div class="kpi-meta">${f30.length} cita${f30.length!==1?"s":""}</div></div>
  </div>
  <div class="range-hdr"><span>Próximos 7 días</span><span>${mxn(sum(f7))}</span></div>
  <table><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th style="text-align:right">Estimado</th></tr></thead><tbody>${tRows(f7)}</tbody></table>
  <div class="range-hdr"><span>Próximos 15 días</span><span>${mxn(sum(f15))}</span></div>
  <table><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th style="text-align:right">Estimado</th></tr></thead><tbody>${tRows(f15)}</tbody></table>
  <div class="range-hdr"><span>Próximos 30 días</span><span>${mxn(sum(f30))}</span></div>
  <table><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th style="text-align:right">Estimado</th></tr></thead><tbody>${tRows(f30)}</tbody></table>
  <div class="note">⚠️ Proyección basada en citas agendadas y tarifas configuradas. Sujeta a cambios por cancelaciones o modificaciones.</div>
  <footer><span>PsychoCore · Proyección de Ingresos</span><span>Generado ${new Date().toLocaleDateString("es-MX")}</span></footer>
  </body></html>`;
}
