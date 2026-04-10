import { useState, useMemo } from "react";
import { ClipboardList, Plus, Printer, Trash2, Check, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { T } from "../../theme.js";
import { fmtDate } from "../../utils.js";
import { Card, Btn, Modal, EmptyState, PageHeader, Tabs } from "../../components/ui/index.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import { SCALES, getSeverity, getDASS21Subscores, getASRSPartA, BLANCO_SVG } from "./scales.utils.js";
import { useScales, useScaleForm } from "./useScales.js";

// ─────────────────────────────────────────────────────────────────────────────
// DASS-21 SUBSCALE BADGES
// ─────────────────────────────────────────────────────────────────────────────
function DASSSeverityBadges({ answers, size = "normal" }) {
  const subs = getDASS21Subscores(answers);
  if (!subs) return null;
  const small = size === "small";
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {Object.values(subs).map(sub => (
        <span key={sub.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 7px" : "3px 10px", borderRadius: 9999, fontSize: small ? 10 : 11, fontWeight: 700, fontFamily: T.fB, color: sub.sev.color, background: sub.sev.bg, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: small ? 9 : 10, opacity: 0.7 }}>{sub.label.slice(0, 3).toUpperCase()}</span>
          <span style={{ fontWeight: 800 }}>{sub.scaled}</span>
          {sub.sev.label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALOG ITEM (ORS / SRS)
// ─────────────────────────────────────────────────────────────────────────────
function AnalogItem({ question, value, onChange, itemLabels, color }) {
  const val = value ?? 5;
  return (
    <div style={{ marginBottom: 20, padding: "16px 18px", background: val !== null && value !== null ? T.pA : T.cardAlt, borderRadius: 12, border: `1.5px solid ${value !== null ? color : T.bdrL}`, transition: "all .15s" }}>
      <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, marginBottom: 14, lineHeight: 1.55 }}>{question}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, flexShrink: 0, width: 90, textAlign: "right", lineHeight: 1.3 }}>{itemLabels?.[0] || "Mal"}</span>
        <input
          type="range" min={0} max={10} step={1}
          value={val}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: color, height: 6, cursor: "pointer" }}
        />
        <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, flexShrink: 0, width: 90, lineHeight: 1.3 }}>{itemLabels?.[1] || "Bien"}</span>
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <span style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 500, color }}>
          {value !== null ? value : "—"}
        </span>
        <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}> / 10</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBadge({ scaleId, score, size = "normal", answers }) {
  if (scaleId === "DASS21" && answers) return <DASSSeverityBadges answers={answers} size={size}/>;
  const sev = getSeverity(scaleId, score);
  if (!sev) return null;
  const small = size === "small";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: small ? "2px 8px" : "4px 12px", borderRadius: 9999, fontSize: small ? 10 : 11, fontWeight: 700, fontFamily: T.fB, color: sev.color, background: sev.bg, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: small ? 11 : 13, fontWeight: 800 }}>{score}</span>
      {sev.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI SPARKLINE CHART
// ─────────────────────────────────────────────────────────────────────────────
function ScoreSparkline({ results, scaleId }) {
  if (results.length < 2) return null;
  const scale  = SCALES[scaleId];
  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const W = 320, H = 80, PAD = 12;
  const xScale = i => PAD + (i / Math.max(sorted.length - 1, 1)) * (W - PAD * 2);
  const yScale = v => H - PAD - (v / scale.maxScore) * (H - PAD * 2);

  const path = sorted.map((r, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(r.score)}`).join(" ");
  const area = `${path} L${xScale(sorted.length - 1)},${H - PAD} L${xScale(0)},${H - PAD} Z`;

  const last      = sorted[sorted.length - 1];
  const prev      = sorted[sorted.length - 2];
  const delta     = last.score - prev.score;
  const TrendIcon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const trendColor = delta < 0 ? T.suc : delta > 0 ? T.err : T.tm;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em" }}>Evolución ({sorted.length} aplicaciones)</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: trendColor }}>
          <TrendIcon size={13}/>{delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} pts` : "Sin cambio"}
        </span>
      </div>
      <div style={{ background: T.cardAlt, borderRadius: 12, padding: "12px 16px" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={`grad-${scaleId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={scale.color} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={scale.color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#grad-${scaleId})`}/>
          <path d={path} fill="none" stroke={scale.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {sorted.map((r, i) => {
            const sev = getSeverity(scaleId, r.score);
            return <circle key={i} cx={xScale(i)} cy={yScale(r.score)} r="4" fill={sev?.color || scale.color} stroke={BLANCO_SVG} strokeWidth="1.5"/>;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontFamily: T.fB, fontSize: 10, color: T.tl }}>{fmtDate(sorted[0].date)}</span>
          <span style={{ fontFamily: T.fB, fontSize: 10, color: T.tl }}>{fmtDate(sorted[sorted.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function printScaleResult(result, patient, profile) {
  const scale = SCALES[result.scaleId];
  const sev   = getSeverity(result.scaleId, result.score);
  const w     = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const rows = result.answers.map((ans, i) => `
    <tr style="border-bottom:1px solid #EDF1F0">
      <td style="padding:8px 12px;font-size:12px;color:#5A7270;width:32px">${i + 1}</td>
      <td style="padding:8px 12px;font-size:12px;line-height:1.5">${scale.questions[i]}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:600;text-align:center;color:#1A2B28;white-space:nowrap">${scale.responseLabels[ans]} (${ans})</td>
    </tr>`).join("");

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${scale.name} — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.6}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.sub{font-size:12px;color:#5A7270}
.score-box{text-align:right}
.score-num{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:500;line-height:1;color:${sev?.color || "#3A6B6E"}}
.score-label{font-size:12px;font-weight:700;color:${sev?.color || "#3A6B6E"};text-transform:uppercase;letter-spacing:.06em}
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
.info-box{background:#F9F8F5;padding:12px;border-radius:8px}
.info-box label{display:block;font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
.info-box p{font-size:13px;font-weight:500}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
.clinical-note{background:rgba(58,107,110,0.06);border-left:4px solid #3A6B6E;padding:12px 16px;border-radius:0 8px 8px 0;font-size:12px;color:#3A6B6E;margin-bottom:24px}
.sig{margin-top:40px;display:flex;justify-content:flex-end}
.sig-line{width:200px;border-top:1px solid #1A2B28;padding-top:6px;font-size:12px;color:#5A7270}
footer{margin-top:40px;padding-top:14px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div>
    <h1>${scale.name} — ${scale.fullName}</h1>
    <div class="sub">${profile?.clinic || "Consultorio Psicológico"}${profile?.name ? " · " + profile.name : ""}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
  </div>
  <div class="score-box">
    <div class="score-num">${result.score}</div>
    <div class="score-label">${sev?.label}</div>
    <div style="font-size:11px;color:#9BAFAD">/ ${scale.maxScore} pts</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
  <div class="info-box"><label>Fecha</label><p>${fmtDate(result.date)}</p></div>
  <div class="info-box"><label>Escala</label><p>${scale.name}</p></div>
  <div class="info-box"><label>Severidad</label><p style="color:${sev?.color}">${sev?.label}</p></div>
</div>

<div class="clinical-note">📋 ${scale.clinicalNote}</div>

<table>
  <thead>
    <tr style="background:#F9F8F5">
      <th style="padding:10px 12px;text-align:left;font-size:10px;color:#9BAFAD;text-transform:uppercase;letter-spacing:.07em;width:32px">#</th>
      <th style="padding:10px 12px;text-align:left;font-size:10px;color:#9BAFAD;text-transform:uppercase;letter-spacing:.07em">Ítem</th>
      <th style="padding:10px 12px;text-align:center;font-size:10px;color:#9BAFAD;text-transform:uppercase;letter-spacing:.07em">Respuesta</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

${(() => {
    if (result.scaleId === 'DASS21' && result.answers) {
      const subs = { depression: { label:'Depresión', color:'#5B8DB8', items:[2,4,9,12,15,16,20], sev:[{max:9,l:'Normal'},{max:13,l:'Leve'},{max:20,l:'Moderada'},{max:27,l:'Grave'},{max:42,l:'Muy grave'}] }, anxiety: { label:'Ansiedad', color:'#B8900A', items:[1,3,6,8,14,18,19], sev:[{max:7,l:'Normal'},{max:9,l:'Leve'},{max:14,l:'Moderada'},{max:19,l:'Grave'},{max:42,l:'Muy grave'}] }, stress: { label:'Estrés', color:'#C4895A', items:[0,5,7,10,11,13,17], sev:[{max:14,l:'Normal'},{max:18,l:'Leve'},{max:25,l:'Moderada'},{max:33,l:'Grave'},{max:42,l:'Muy grave'}] } };
      const rows = Object.values(subs).map(sub => {
        const raw = sub.items.reduce((s, i) => s + (result.answers[i] ?? 0), 0);
        const sc  = raw * 2;
        const lbl = sub.sev.find(s => sc <= s.max)?.l || 'Muy grave';
        return '<div style="display:inline-flex;flex-direction:column;align-items:center;padding:10px 18px;background:#F9F8F5;border-radius:10px;margin-right:10px;border-top:3px solid ' + sub.color + '"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:' + sub.color + ';margin-bottom:4px">' + sub.label + '</div><div style="font-family:Cormorant Garamond,serif;font-size:28px;font-weight:500;color:' + sub.color + ';line-height:1">' + sc + '</div><div style="font-size:11px;color:#5A7270">' + lbl + '</div></div>';
      }).join('');
      return '<h2 style="font-family:Cormorant Garamond,serif;font-size:18px;color:#3A6B6E;margin:20px 0 12px;padding-bottom:6px;border-bottom:1px solid #EDF1F0">Desglose por subescala</h2><div style="display:flex;flex-wrap:wrap;gap:0;margin-bottom:20px">' + rows + '</div>';
    }
    if (result.scaleId === 'ASRS' && result.answers) {
      const thresholds = [2,2,2,3,3,3];
      const positives  = [0,1,2,3,4,5].filter(i => (result.answers[i] ?? 0) >= thresholds[i]).length;
      const positive   = positives >= 4;
      return '<div style="padding:12px 16px;border-radius:10px;margin-bottom:16px;background:' + (positive?'rgba(184,144,10,0.08)':'rgba(78,139,95,0.08)') + ';border-left:4px solid ' + (positive?'#B8900A':'#4E8B5F') + ';font-size:13px;font-weight:600;color:' + (positive?'#B8900A':'#4E8B5F') + '">Parte A (cribado): ' + (positive ? '⚠ POSITIVO — ' + positives + '/6 ítems superan el umbral. Requiere evaluación clínica estructurada.' : '✓ Negativo — ' + positives + '/6 ítems superan el umbral.') + '</div>';
    }
    return '';
  })()}

${result.notes ? `<div style="margin-bottom:24px"><div style="font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Observaciones clínicas</div><div style="background:#F9F8F5;padding:14px;border-radius:8px;font-size:13px;line-height:1.7">${result.notes}</div></div>` : ""}

<div class="sig"><div class="sig-line">${profile?.name || "Terapeuta"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div></div>
<footer><span>PsychoCore · ${scale.name}</span><span>${today} · Documento confidencial</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCALE APPLICATION FORM
// ─────────────────────────────────────────────────────────────────────────────
function ScaleForm({ scaleId, patients, onSave, onClose }) {
  const {
    scale, totalQ, isAnalog,
    patientId, setPatientId,
    date, setDate,
    answers, setAnswer,
    notes, setNotes,
    step, setStep,
    totalPages, pageStart, pageEnd, pageQ,
    answered, allAnswered, score, sev,
    pageComplete, pct,
    handleSave,
    asrsResult,
    dassResult,
  } = useScaleForm({ scaleId, onSave, onClose });

  // ── ASRS Part A summary banner ─────────────────────────────────────────────
  const asrsBanner = asrsResult ? (
    <div style={{ padding: "12px 16px", background: asrsResult.positive ? T.warA : T.sucA, border: `1.5px solid ${asrsResult.positive ? T.war : T.suc}`, borderRadius: 12, marginBottom: 16, fontFamily: T.fB, fontSize: 13, color: asrsResult.positive ? T.war : T.suc, fontWeight: 600 }}>
      {asrsResult.positive
        ? `⚠ Parte A: cribado POSITIVO (${asrsResult.positives}/6 ítems superan el umbral) — Requiere evaluación clínica`
        : `✓ Parte A: cribado negativo (${asrsResult.positives}/6 ítems superan el umbral)`}
    </div>
  ) : null;

  // ── DASS-21 subscale banner ────────────────────────────────────────────────
  const dassBanner = dassResult ? (
    <div style={{ padding: "14px 16px", background: T.cardAlt, borderRadius: 12, marginBottom: 16, border: `1px solid ${T.bdrL}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Resultado por subescala</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {Object.values(dassResult).map(sub => (
          <div key={sub.label} style={{ flex: 1, minWidth: 100, padding: "10px 14px", background: sub.sev.bg, borderRadius: 10, border: `1px solid ${sub.sev.color}20`, textAlign: "center" }}>
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: sub.color, marginBottom: 4 }}>{sub.label}</div>
            <div style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 500, color: sub.sev.color }}>{sub.scaled}</div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: sub.sev.color, fontWeight: 700 }}>{sub.sev.label}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div>
      {/* Header info */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Paciente *</label>
        <select value={patientId} onChange={e => setPatientId(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}>
          <option value="">Seleccionar paciente...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Fecha</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
      </div>

      {/* ASRS: Part A / Part B header */}
      {scaleId === "ASRS" && (
        <div style={{ marginBottom: 14, padding: "8px 14px", background: T.pA, borderRadius: 9, fontFamily: T.fB, fontSize: 12, color: T.p }}>
          {step === 0 ? "📋 Parte A — Cribado (ítems 1–6)" : "📋 Parte B — Síntomas adicionales (ítems 7–18)"}
        </div>
      )}

      {/* Progress */}
      {!isAnalog && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{answered} / {totalQ} ítems respondidos</span>
            {allAnswered && sev && <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: sev.color }}>Score: {score} — {sev.label}</span>}
          </div>
          <div style={{ height: 6, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: scale.color, borderRadius: 9999, transition: "width .3s ease" }}/>
          </div>
        </div>
      )}

      {/* ── ANALOG (ORS / SRS) ──────────────────────────────────────────────── */}
      {isAnalog && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            {scale.name} — Valora cada dimensión del 0 al 10
          </div>
          {scale.questions.map((q, qi) => (
            <AnalogItem
              key={qi}
              question={`${qi + 1}. ${q}`}
              value={answers[qi]}
              onChange={val => setAnswer(qi, val)}
              itemLabels={scale.itemLabels?.[qi]}
              color={scale.color}
            />
          ))}
          <div style={{ padding: "14px 18px", background: sev?.bg || T.pA, border: `1.5px solid ${sev?.color || scale.color}`, borderRadius: 12, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: sev?.color || scale.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Total</div>
              <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color: sev?.color || scale.color }}>{score} <span style={{ fontSize: 13 }}>/ {scale.maxScore}</span></div>
            </div>
            {sev && <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: sev.color }}>{sev.label}</div>}
          </div>
        </div>
      )}

      {/* ── STANDARD LIKERT (con soporte para opciones custom por ítem) ──────── */}
      {!isAnalog && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Preguntas {pageStart + 1}–{pageEnd} de {totalQ}
          </div>
          {pageQ.map((q, localIdx) => {
            const qi   = pageStart + localIdx;
            const ans  = answers[qi];
            const opts = scale.customItemOptions?.[qi]
              ? scale.customItemOptions[qi]
              : scale.responseLabels.map((label, val) => ({ value: val, label }));
            return (
              <div key={qi} style={{ marginBottom: 16, padding: "14px 16px", background: ans !== null ? T.pA : T.cardAlt, borderRadius: 12, border: `1.5px solid ${ans !== null ? scale.color : T.bdrL}`, transition: "all .15s" }}>
                <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, marginBottom: 12, lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700, color: scale.color, marginRight: 6 }}>{qi + 1}.</span>{q}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {opts.map(({ value: val, label }) => {
                    const selected = ans === val;
                    return (
                      <button key={val} onClick={() => setAnswer(qi, val)}
                        style={{ flex: 1, minWidth: 70, padding: "8px 6px", border: `2px solid ${selected ? scale.color : T.bdr}`, borderRadius: 10, background: selected ? `${scale.color}18` : "transparent", cursor: "pointer", fontFamily: T.fB, fontSize: 12, fontWeight: selected ? 700 : 400, color: selected ? scale.color : T.tm, transition: "all .13s", textAlign: "center", lineHeight: 1.3 }}>
                        {!scale.customItemOptions?.[qi] && <span style={{ display: "block", fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{val}</span>}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {(isAnalog || step === totalPages - 1) && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Observaciones clínicas (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Contexto, comportamiento durante la aplicación, notas para el expediente..."
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
        </div>
      )}

      {/* DASS-21 subscale results */}
      {dassBanner}
      {/* ASRS Part A banner */}
      {asrsBanner}

      {/* Result preview (non-DASS, non-analog) */}
      {!isAnalog && scaleId !== "DASS21" && allAnswered && sev && step === totalPages - 1 && (
        <div style={{ padding: "16px 20px", background: sev.bg, border: `1.5px solid ${sev.color}`, borderRadius: 14, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: sev.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Resultado</div>
            <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color: sev.color }}>{score} <span style={{ fontSize: 14 }}>/ {scale.maxScore}</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: T.fB, fontSize: 20, fontWeight: 700, color: sev.color }}>{sev.label}</div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, maxWidth: 200, lineHeight: 1.4 }}>{scale.clinicalNote}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: `1px solid ${T.bdrL}` }}>
        <Btn variant="ghost" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
          {step === 0 ? "Cancelar" : "← Atrás"}
        </Btn>
        {!isAnalog && step < totalPages - 1
          ? <Btn onClick={() => setStep(s => s + 1)} disabled={!pageComplete || !patientId}>Continuar →</Btn>
          : <Btn onClick={handleSave} disabled={!patientId || !allAnswered}><Check size={15}/> Guardar resultado</Btn>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ r, patient, profile, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const scale = SCALES[r.scaleId];
  const sev   = getSeverity(r.scaleId, r.score);
  if (!scale || !sev) return null;

  return (
    <Card style={{ padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.fH, fontSize: 17, fontWeight: 500, color: T.t }}>{patient?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</span>
            <span style={{ fontSize: 11, color: T.tl }}>·</span>
            <span style={{ padding: "2px 8px", borderRadius: 9999, background: scale.bg, color: scale.color, fontSize: 11, fontWeight: 700, fontFamily: T.fB }}>{scale.name}</span>
            <span style={{ fontSize: 11, color: T.tl }}>·</span>
            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>{fmtDate(r.date)}</span>
            <ScoreBadge scaleId={r.scaleId} score={r.score}/>
          </div>
          {r.notes && <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: 0, lineHeight: 1.6 }}>{r.notes}</p>}

          {/* DASS-21: desglose subescalas */}
          {r.scaleId === "DASS21" && r.answers && (
            <div style={{ marginTop: 10 }}>
              <DASSSeverityBadges answers={r.answers}/>
            </div>
          )}

          {/* ASRS: indicador Parte A */}
          {r.scaleId === "ASRS" && r.answers && (() => {
            const partA = getASRSPartA(r.answers);
            return (
              <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700, fontFamily: T.fB, background: partA.positive ? T.warA : T.sucA, color: partA.positive ? T.war : T.suc }}>
                {partA.positive ? `⚠ Parte A positivo (${partA.positives}/6)` : `✓ Parte A negativo (${partA.positives}/6)`}
              </div>
            );
          })()}

          {expanded && (
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 6 }}>
              {r.answers.map((ans, i) => (
                <div key={i} style={{ padding: "8px 10px", background: T.cardAlt, borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 800, color: T.tl, minWidth: 16, paddingTop: 1 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, lineHeight: 1.4, marginBottom: 3 }}>{scale.questions[i].slice(0, 50)}{scale.questions[i].length > 50 ? "…" : ""}</div>
                    <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: ans > 0 ? sev.color : T.suc }}>{scale.responseLabels[ans]} ({ans})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <button onClick={() => setExpanded(e => !e)} title={expanded ? "Contraer" : "Ver respuestas"} style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          <button onClick={() => printScaleResult(r, patient, profile)} title="Exportar PDF" style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
            <Printer size={14}/>
          </button>
          <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 8 }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT SUMMARY VIEW
// ─────────────────────────────────────────────────────────────────────────────
function PatientSummary({ patient, results, profile }) {
  const [expanded, setExpanded] = useState(false);
  const byScale = useMemo(() => {
    const map = {};
    results.forEach(r => {
      const key = (r.scaleId || "").toUpperCase().replace("-", "").replace(".", "").replace("V1", "").replace("_", "");
      const SCALE_MAP = { PHQ9:"PHQ9", GAD7:"GAD7", BAI:"BAI", PCL5:"PCL5", DASS21:"DASS21", ASRS:"ASRS", ISI:"ISI", AUDIT:"AUDIT", ORS:"ORS", SRS:"SRS" };
      const normalized = Object.keys(SCALE_MAP).find(k => key.includes(k)) || r.scaleId;
      if (!map[normalized]) map[normalized] = [];
      map[normalized].push({ ...r, scaleId: normalized });
    });
    return map;
  }, [results]);

  const scales = Object.keys(byScale);
  if (scales.length === 0) return null;

  return (
    <Card style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
      {/* Header tapeable */}
      <div onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.pA,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.fH, fontSize: 17, color: T.p }}>{patient.name[0]}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
            {patient.name.split(" ").slice(0, 2).join(" ")}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {scales.map(sid => {
              const latest = byScale[sid].sort((a, b) => b.date.localeCompare(a.date))[0];
              return <ScoreBadge key={sid} scaleId={sid} score={latest.score} size="small"/>;
            })}
          </div>
        </div>
        <div style={{ color: T.tl, flexShrink: 0 }}>
          {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
        </div>
      </div>

      {expanded && <div style={{ padding: "0 16px 14px" }}>{scales.map(sid => {
        const scale  = SCALES[sid];
        const rlist  = byScale[sid].sort((a, b) => b.date.localeCompare(a.date));
        const latest = rlist[0];
        const sev    = getSeverity(sid, latest.score);
        if (!scale || !latest) return null;
        return (
          <div key={sid} style={{ marginTop: 16, padding: 16, background: T.cardAlt, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ padding: "3px 10px", borderRadius: 9999, background: scale.bg, color: scale.color, fontSize: 12, fontWeight: 700, fontFamily: T.fB, marginRight: 8 }}>{scale.name}</span>
                <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{scale.domain} · {rlist.length} aplicación{rlist.length > 1 ? "es" : ""}</span>
              </div>
              <button onClick={() => printScaleResult(latest, patient, profile)} style={{ background: T.bdrL, border: "none", borderRadius: 7, padding: 6, cursor: "pointer", color: T.tm }}>
                <Printer size={13}/>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ fontFamily: T.fH, fontSize: 36, fontWeight: 500, color: sev?.color }}>{latest.score}</div>
              <div>
                <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: sev?.color }}>{sev?.label}</div>
                <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{fmtDate(latest.date)}</div>
              </div>
            </div>
            <ScoreSparkline results={rlist} scaleId={sid}/>
          </div>
        );
      })}</div>}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function Scales({ scaleResults = [], setScaleResults, patients = [], profile }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  const {
    tab, setTab,
    showForm, setShowForm,
    activeScale, setActiveScale,
    filterPt, setFilterPt,
    filterScale,
    showAllScales, setShowAllScales,
    filtered,
    countByScale,
    patientsWithResults,
    saveResult,
    deleteResult,
    toggleFilterScale,
  } = useScales({ scaleResults, setScaleResults, patients });

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Escalas Psicométricas"
        subtitle={`${scaleResults.length} ${scaleResults.length !== 1 ? "aplicaciones" : "aplicación"} registrada${scaleResults.length !== 1 ? "s" : ""}`}
        action={<Btn onClick={() => setShowForm(true)}><Plus size={15}/> Aplicar escala</Btn>}
      />

      {/* Scale summary cards — compactas, ocultar las de 0 */}
      {(() => {
        const withData    = Object.values(SCALES).filter(s => (countByScale[s.id] || 0) > 0);
        const withoutData = Object.values(SCALES).filter(s => (countByScale[s.id] || 0) === 0);
        const visible     = showAllScales
          ? Object.values(SCALES)
          : (withData.length > 0 ? withData : Object.values(SCALES));
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px,1fr))", gap: 8 }}>
              {visible.map(scale => {
                const count  = countByScale[scale.id] || 0;
                const active = filterScale === scale.id;
                return (
                  <button key={scale.id}
                    onClick={() => toggleFilterScale(scale.id)}
                    style={{ padding: "10px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
                      background: active ? scale.bg || T.pA : T.card,
                      border: `2px solid ${active ? scale.color : T.bdrL}`,
                      transition: "all .13s" }}>
                    <div style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 500,
                      color: active ? scale.color : (count > 0 ? scale.color : T.tl), lineHeight: 1, marginBottom: 3 }}>{count}</div>
                    <div style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700,
                      color: active ? scale.color : (count > 0 ? scale.color : T.tl), whiteSpace: "nowrap" }}>{scale.name}</div>
                    {count > 0 && (
                      <div style={{ fontFamily: T.fB, fontSize: 9, color: T.tl, marginTop: 1,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scale.domain}</div>
                    )}
                  </button>
                );
              })}
            </div>
            {withoutData.length > 0 && withData.length > 0 && (
              <button onClick={() => setShowAllScales(s => !s)}
                style={{ marginTop: 8, padding: "5px 12px", borderRadius: 9999,
                  border: `1px solid ${T.bdrL}`, background: "transparent",
                  fontFamily: T.fB, fontSize: 11, color: T.tl, cursor: "pointer" }}>
                {showAllScales ? "Ocultar sin datos" : `+ ${withoutData.length} escalas sin aplicaciones`}
              </button>
            )}
          </div>
        );
      })()}

      <Tabs
        tabs={[{ id: "results", label: "Resultados" }, { id: "patients", label: "Por paciente" }]}
        active={tab} onChange={setTab}
      />

      {tab === "results" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, cursor: "pointer", outline: "none" }}>
              <option value="">Todos los pacientes</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0, 2).join(" ")}</option>)}
            </select>
            {filterScale !== "todos" && (
              <button onClick={() => toggleFilterScale(filterScale)} style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: T.bdrL, fontFamily: T.fB, fontSize: 13, color: T.tm, cursor: "pointer" }}>
                × {SCALES[filterScale]?.name}
              </button>
            )}
          </div>
          {filtered.length === 0
            ? <EmptyState icon={ClipboardList} title="Sin resultados" desc="Aplica la primera escala con el botón de arriba"/>
            : filtered.map(r => {
                const patient = patients.find(p => p.id === r.patientId);
                return <ResultCard key={r.id} r={r} patient={patient} profile={profile} onDelete={deleteResult}/>;
              })
          }
        </>
      )}

      {tab === "patients" && (
        patientsWithResults.length === 0
          ? <EmptyState icon={ClipboardList} title="Sin datos" desc="Los resultados agrupados por paciente aparecerán aquí"/>
          : patientsWithResults.map(p => {
              const results = scaleResults.filter(r => r.patientId === p.id);
              return <PatientSummary key={p.id} patient={p} results={results} profile={profile}/>;
            })
      )}

      {/* Apply scale modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={`Aplicar ${SCALES[activeScale]?.name}`} width={640}>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.values(SCALES).map(scale => {
            const active = activeScale === scale.id;
            const domainShort = { "Depresión / Ansiedad / Estrés": "Dep/Ans/Str", "Ansiedad somática": "Ansiedad s.", "Resultados terapéuticos": "Resultados", "Alianza terapéutica": "Alianza", "Consumo de alcohol": "Alcohol", "TDAH adultos": "TDAH" }[scale.domain] || scale.domain;
            return (
              <button key={scale.id} onClick={() => setActiveScale(scale.id)}
                style={{ padding: "6px 12px", borderRadius: 9999, whiteSpace: "nowrap",
                  border: `1.5px solid ${active ? scale.color : T.bdr}`,
                  background: active ? scale.bg : "transparent",
                  color: active ? scale.color : T.tm,
                  fontFamily: T.fB, fontSize: 12, fontWeight: active ? 700 : 400,
                  cursor: "pointer", transition: "all .13s" }}>
                {scale.name}
                {active && <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 4 }}>— {domainShort}</span>}
              </button>
            );
          })}
        </div>
        <ScaleForm
          key={activeScale}
          scaleId={activeScale}
          patients={patients}
          onSave={saveResult}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
