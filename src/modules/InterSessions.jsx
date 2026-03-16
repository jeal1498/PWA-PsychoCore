import { useState } from "react";
import { Phone, MessageSquare, Mail, Video, AlertTriangle, Pill, Trash2, Plus, Check, ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { T } from "../theme.js";
import { uid, fmt, todayDate, fmtDate } from "../utils.js";
import { Card, Modal, Input, Textarea, Select, Btn } from "../components/ui/index.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — CANALES DE CONTACTO
// ─────────────────────────────────────────────────────────────────────────────
export const CONTACT_CHANNELS = {
  llamada:    { label: "Llamada telefónica",  icon: Phone,          color: T.p,   bg: T.pA   },
  whatsapp:   { label: "WhatsApp / Mensaje",  icon: MessageSquare,  color: T.suc, bg: T.sucA },
  email:      { label: "Correo electrónico",  icon: Mail,           color: "#5B8DB8", bg: "rgba(91,141,184,0.10)" },
  videollamada:{ label: "Videollamada",       icon: Video,          color: "#9B6B9E", bg: "rgba(155,107,158,0.10)" },
  crisis:     { label: "Contacto de crisis",  icon: AlertTriangle,  color: T.err, bg: T.errA },
};

export const CONTACT_INITIATED_BY = {
  patient:   "Paciente",
  therapist: "Terapeuta",
  guardian:  "Tutor / Familiar",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — MEDICACIÓN
// ─────────────────────────────────────────────────────────────────────────────
export const MED_STATUS = {
  activo:      { label: "Activo",      color: T.suc, bg: T.sucA },
  suspendido:  { label: "Suspendido",  color: T.war, bg: T.warA },
  completado:  { label: "Completado",  color: T.tl,  bg: T.bdrL },
};

// Categorías farmacológicas más frecuentes en psicología clínica
export const MED_CATEGORIES = [
  "Antidepresivo (ISRS)", "Antidepresivo (IRSN)", "Antidepresivo (tricíclico)",
  "Antidepresivo (otro)", "Ansiolítico (benzodiacepina)", "Ansiolítico (otro)",
  "Estabilizador del ánimo", "Antipsicótico (típico)", "Antipsicótico (atípico)",
  "Estimulante (TDAH)", "No estimulante (TDAH)", "Hipnótico / Sedante",
  "Anticonvulsivante", "Beta-bloqueante", "Otro",
];

// ─────────────────────────────────────────────────────────────────────────────
// INTER-SESSION CONTACT — FORM
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_CONTACT = {
  channel: "llamada", initiatedBy: "patient", date: fmt(todayDate),
  duration: "", topic: "", notes: "", followUpNeeded: false,
};

function ContactForm({ onSave, onClose }) {
  const [form, setForm] = useState(BLANK_CONTACT);
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const canSave = form.topic.trim();

  return (
    <div>
      {/* Canal */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Canal</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {Object.entries(CONTACT_CHANNELS).map(([key, cfg]) => {
            const Icon   = cfg.icon;
            const active = form.channel === key;
            return (
              <button key={key} onClick={() => fld("channel")(key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", border: `2px solid ${active ? cfg.color : T.bdr}`, borderRadius: 9999, background: active ? cfg.bg : "transparent", cursor: "pointer", fontFamily: T.fB, fontSize: 12.5, fontWeight: active ? 700 : 400, color: active ? cfg.color : T.tm, transition: "all .13s" }}>
                <Icon size={13}/>{cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Fecha</label>
          <input type="date" value={form.date} onChange={e => fld("date")(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Iniciado por</label>
          <select value={form.initiatedBy} onChange={e => fld("initiatedBy")(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none" }}>
            {Object.entries(CONTACT_INITIATED_BY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Duración (min)</label>
          <input type="number" value={form.duration} onChange={e => fld("duration")(e.target.value)}
            placeholder="15" min={1}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Motivo / Tema *</label>
        <input value={form.topic} onChange={e => fld("topic")(e.target.value)}
          placeholder="Ej. Consulta por síntomas ansiosos, cancelación de cita, crisis emocional..."
          style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Nota clínica</label>
        <textarea value={form.notes} onChange={e => fld("notes")(e.target.value)}
          placeholder="Descripción del contacto, estado del paciente, intervención realizada, acuerdos..."
          rows={3}
          style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}/>
      </div>

      <div onClick={() => fld("followUpNeeded")(!form.followUpNeeded)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: form.followUpNeeded ? T.warA : T.bdrL, borderRadius: 10, cursor: "pointer", border: `1.5px solid ${form.followUpNeeded ? T.war : "transparent"}`, transition: "all .15s", marginBottom: 20 }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: form.followUpNeeded ? T.war : T.bdr, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
          {form.followUpNeeded && <Check size={12} color="#fff" strokeWidth={2.5}/>}
        </div>
        <div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: form.followUpNeeded ? T.war : T.t, fontWeight: 600 }}>Requiere seguimiento</div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>Marcar para recordar hacer seguimiento en la próxima sesión</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => { if (canSave) { onSave(form); } }} disabled={!canSave}>
          <Check size={14}/> Registrar contacto
        </Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTER-SESSION CONTACT — LIST ITEM
// ─────────────────────────────────────────────────────────────────────────────
function ContactItem({ contact, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const ch  = CONTACT_CHANNELS[contact.channel] || CONTACT_CHANNELS.llamada;
  const Icon = ch.icon;

  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: contact.channel === "crisis" ? T.errA : T.cardAlt, border: `1px solid ${contact.channel === "crisis" ? T.err + "40" : T.bdrL}`, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: ch.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            <Icon size={15} color={ch.color}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t }}>{contact.topic}</span>
              <span style={{ padding: "1px 7px", borderRadius: 9999, background: ch.bg, color: ch.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{ch.label}</span>
              {contact.followUpNeeded && (
                <span style={{ padding: "1px 7px", borderRadius: 9999, background: T.warA, color: T.war, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>🔔 Seguimiento</span>
              )}
            </div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>
              {fmtDate(contact.date)}
              {contact.duration && ` · ${contact.duration} min`}
              {" · "}{CONTACT_INITIATED_BY[contact.initiatedBy] || contact.initiatedBy}
            </div>
            {expanded && contact.notes && (
              <div style={{ marginTop: 8, fontFamily: T.fB, fontSize: 13, color: T.t, lineHeight: 1.65, padding: "8px 12px", background: T.card, borderRadius: 8 }}>
                {contact.notes}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {contact.notes && (
            <button onClick={() => setExpanded(e => !e)} style={{ background: T.bdrL, border: "none", borderRadius: 7, padding: 5, cursor: "pointer", color: T.tm }}>
              {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            </button>
          )}
          <button onClick={() => onDelete(contact.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 5 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICATION — FORM
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_MED = {
  name: "", category: "", dose: "", frequency: "",
  prescriber: "", startDate: fmt(todayDate), endDate: "",
  status: "activo", notes: "",
};

function MedForm({ initialValues, onSave, onClose }) {
  const [form, setForm] = useState(initialValues || BLANK_MED);
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.name.trim();

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Nombre del fármaco *</label>
        <input value={form.name} onChange={e => fld("name")(e.target.value)}
          placeholder="Ej. Sertralina, Alprazolam, Metilfenidato..."
          style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Categoría</label>
        <select value={form.category} onChange={e => fld("category")(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none" }}>
          <option value="">Sin especificar</option>
          {MED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Dosis</label>
          <input value={form.dose} onChange={e => fld("dose")(e.target.value)}
            placeholder="Ej. 50 mg, 0.5 mg"
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Frecuencia</label>
          <input value={form.frequency} onChange={e => fld("frequency")(e.target.value)}
            placeholder="Ej. 1 vez/día, cada 12 h"
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Fecha de inicio</label>
          <input type="date" value={form.startDate} onChange={e => fld("startDate")(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Fecha de fin (opcional)</label>
          <input type="date" value={form.endDate} onChange={e => fld("endDate")(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Prescriptor</label>
          <input value={form.prescriber} onChange={e => fld("prescriber")(e.target.value)}
            placeholder="Ej. Dr. García (Psiquiatría)"
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Estado</label>
          <select value={form.status} onChange={e => fld("status")(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none" }}>
            {Object.entries(MED_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Observaciones</label>
        <textarea value={form.notes} onChange={e => fld("notes")(e.target.value)}
          placeholder="Adherencia, efectos secundarios reportados, cambios en dosis, interacciones..."
          rows={3}
          style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}/>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => { if (canSave) { onSave(form); } }} disabled={!canSave}>
          <Check size={14}/> {initialValues ? "Guardar cambios" : "Agregar medicamento"}
        </Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICATION — LIST ITEM
// ─────────────────────────────────────────────────────────────────────────────
function MedItem({ med, onDelete, onEdit, onToggleStatus }) {
  const [expanded, setExpanded] = useState(false);
  const st = MED_STATUS[med.status] || MED_STATUS.activo;

  return (
    <div style={{ padding: "14px 16px", borderRadius: 12, background: T.cardAlt, border: `1.5px solid ${med.status === "activo" ? T.bdrL : T.bdrL}`, marginBottom: 8, borderLeft: `4px solid ${st.color}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <Pill size={14} color={st.color}/>
            <span style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t }}>{med.name}</span>
            <span style={{ padding: "2px 8px", borderRadius: 9999, background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{st.label}</span>
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 2 }}>
            {[med.dose, med.frequency].filter(Boolean).join(" · ")}
            {med.category && <span style={{ marginLeft: 6, color: T.tl }}>— {med.category}</span>}
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>
            Desde {fmtDate(med.startDate)}
            {med.endDate && ` hasta ${fmtDate(med.endDate)}`}
            {med.prescriber && ` · ${med.prescriber}`}
          </div>
          {expanded && med.notes && (
            <div style={{ marginTop: 8, fontFamily: T.fB, fontSize: 13, color: T.t, lineHeight: 1.65, padding: "8px 12px", background: T.card, borderRadius: 8 }}>
              {med.notes}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {med.notes && (
            <button onClick={() => setExpanded(e => !e)} style={{ background: T.bdrL, border: "none", borderRadius: 7, padding: 5, cursor: "pointer", color: T.tm }}>
              {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            </button>
          )}
          <button onClick={() => onEdit(med)} style={{ background: T.pA, border: "none", borderRadius: 7, padding: 5, cursor: "pointer", color: T.p }}>
            <Edit3 size={13}/>
          </button>
          <button onClick={() => onDelete(med.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 5 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CONTACTOS INTER-SESIONALES
// ─────────────────────────────────────────────────────────────────────────────
export function ContactsTab({ patientId, interSessions, setInterSessions }) {
  const [showAdd, setShowAdd] = useState(false);
  const contacts = (interSessions || [])
    .filter(c => c.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const save = (form) => {
    setInterSessions(prev => [...prev, { ...form, id: "is" + uid(), patientId }]);
    setShowAdd(false);
  };

  const del = (id) => setInterSessions(prev => prev.filter(c => c.id !== id));

  const followUpCount = contacts.filter(c => c.followUpNeeded).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>
            {contacts.length} contacto{contacts.length !== 1 ? "s" : ""} registrado{contacts.length !== 1 ? "s" : ""}
            {followUpCount > 0 && (
              <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 9999, background: T.warA, color: T.war, fontSize: 11, fontWeight: 700 }}>
                🔔 {followUpCount} con seguimiento pendiente
              </span>
            )}
          </div>
        </div>
        <Btn small onClick={() => setShowAdd(true)}><Plus size={13}/> Registrar contacto</Btn>
      </div>

      {/* Instrucción clínica */}
      {contacts.length === 0 && (
        <div style={{ padding: "16px 18px", background: T.pA, borderRadius: 12, border: `1px solid ${T.p}20`, marginBottom: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.p, lineHeight: 1.65 }}>
            <strong>¿Para qué sirve este registro?</strong> Documenta llamadas, mensajes de WhatsApp, correos o contactos de emergencia que ocurren <em>entre sesiones</em>. Protege al terapeuta y al paciente, y permite que toda la comunicación clínicamente relevante quede en el expediente.
          </div>
        </div>
      )}

      {contacts.length === 0
        ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, padding: "24px 0", textAlign: "center" }}>Sin contactos inter-sesionales registrados</div>
        : contacts.map(c => <ContactItem key={c.id} contact={c} onDelete={del}/>)
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Registrar contacto inter-sesional" width={580}>
        <ContactForm onSave={save} onClose={() => setShowAdd(false)}/>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MEDICACIÓN
// ─────────────────────────────────────────────────────────────────────────────
export function MedicationTab({ patientId, medications, setMedications }) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [editing,  setEditing]  = useState(null); // med object being edited

  const ptMeds = (medications || [])
    .filter(m => m.patientId === patientId)
    .sort((a, b) => {
      // activos primero, luego por fecha de inicio desc
      if (a.status === "activo" && b.status !== "activo") return -1;
      if (a.status !== "activo" && b.status === "activo") return 1;
      return b.startDate.localeCompare(a.startDate);
    });

  const activeMeds = ptMeds.filter(m => m.status === "activo");

  const save = (form) => {
    setMedications(prev => [...prev, { ...form, id: "med" + uid(), patientId }]);
    setShowAdd(false);
  };

  const update = (form) => {
    setMedications(prev => prev.map(m => m.id === form.id ? { ...form, patientId } : m));
    setEditing(null);
  };

  const del = (id) => setMedications(prev => prev.filter(m => m.id !== id));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>
          {activeMeds.length > 0
            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, background: T.sucA, color: T.suc, fontSize: 12, fontWeight: 700 }}>
                <Pill size={12}/> {activeMeds.length} medicamento{activeMeds.length !== 1 ? "s" : ""} activo{activeMeds.length !== 1 ? "s" : ""}
              </span>
            : <span style={{ color: T.tl }}>Sin medicación activa registrada</span>
          }
        </div>
        <Btn small onClick={() => setShowAdd(true)}><Plus size={13}/> Agregar medicamento</Btn>
      </div>

      {/* Aviso clínico */}
      {ptMeds.length === 0 && (
        <div style={{ padding: "16px 18px", background: T.pA, borderRadius: 12, border: `1px solid ${T.p}20`, marginBottom: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.p, lineHeight: 1.65 }}>
            <strong>Coordinación psiquiátrica:</strong> Registra los psicofármacos prescritos por el psiquiatra u otro profesional. Esto permite entender la respuesta al tratamiento y documentar cambios de medicación que puedan influir en el proceso terapéutico.
          </div>
        </div>
      )}

      {ptMeds.length === 0
        ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, padding: "24px 0", textAlign: "center" }}>Sin medicación registrada</div>
        : ptMeds.map(m => (
            <MedItem
              key={m.id}
              med={m}
              onDelete={del}
              onEdit={(med) => setEditing(med)}
              onToggleStatus={(id) => setMedications(prev => prev.map(m => m.id === id ? { ...m, status: m.status === "activo" ? "suspendido" : "activo" } : m))}
            />
          ))
      }

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar medicamento" width={560}>
        <MedForm onSave={save} onClose={() => setShowAdd(false)}/>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar medicamento" width={560}>
        {editing && <MedForm initialValues={editing} onSave={update} onClose={() => setEditing(null)}/>}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI SUMMARY — para mostrar en sidebar del paciente
// ─────────────────────────────────────────────────────────────────────────────
export function MedSummaryWidget({ patientId, medications }) {
  const activeMeds = (medications || []).filter(m => m.patientId === patientId && m.status === "activo");
  if (activeMeds.length === 0) return null;

  return (
    <div style={{ padding: "10px 13px", background: T.sucA, borderRadius: 10, marginBottom: 10, border: `1px solid rgba(78,139,95,0.25)` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.suc, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <Pill size={11}/> Medicación activa
      </div>
      {activeMeds.map(m => (
        <div key={m.id} style={{ fontFamily: T.fB, fontSize: 12, color: T.t, marginBottom: 2 }}>
          <strong>{m.name}</strong>{m.dose ? ` ${m.dose}` : ""}{m.frequency ? ` · ${m.frequency}` : ""}
        </div>
      ))}
    </div>
  );
}

export function ContactFollowUpWidget({ patientId, interSessions }) {
  const pending = (interSessions || []).filter(c => c.patientId === patientId && c.followUpNeeded);
  if (pending.length === 0) return null;

  return (
    <div style={{ padding: "10px 13px", background: T.warA, borderRadius: 10, marginBottom: 10, border: `1px solid rgba(184,144,10,0.25)` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.war, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        🔔 Seguimiento inter-sesional pendiente
      </div>
      {pending.slice(0, 2).map(c => {
        const ch = CONTACT_CHANNELS[c.channel] || CONTACT_CHANNELS.llamada;
        return (
          <div key={c.id} style={{ fontFamily: T.fB, fontSize: 12, color: T.t, marginBottom: 2 }}>
            <strong>{c.topic}</strong> — {ch.label} {fmtDate(c.date)}
          </div>
        );
      })}
      {pending.length > 2 && <div style={{ fontFamily: T.fB, fontSize: 11, color: T.war }}>+{pending.length - 2} más</div>}
    </div>
  );
}
