// ── Settings.jsx ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import {
  Check, CheckCircle, AlertCircle, Download, Upload, FileJson,
  Users, RefreshCw, HelpCircle, MessageCircle, Mail,
  ChevronDown, ChevronUp, Plus, Trash2,
} from "lucide-react";
import { T } from "../../theme.js";
import { Card, Input, Btn, PageHeader } from "../../components/ui/index.jsx";
import { trialDaysLeft } from "../../lib/supabase.js";

import {
  useSettings,
  useProfileTab,
  useScheduleTab,
  useServicesTab,
  useDataTab,
  useAppearanceTab,
} from "./useSettings.js";

import {
  NAV_TEXT, WA,
  DAY_LABELS, SERVICE_TYPES, DISCOUNTS, FAQ_ITEMS,
  ALL_CURRENCIES, fmtCur, fmtDuration,
} from "./settings.utils.js";

// ── Tab: Perfil ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile, googleUser, psychologist }) {
  const { form, fld, save, saved, avatarPreview, handleAvatarChange } = useProfileTab({ profile, setProfile, googleUser });

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, marginBottom: 24, lineHeight: 1.6 }}>
        Tu perfil aparece en la barra lateral y se incluye en los reportes exportados.
      </p>

      <Card style={{ padding: 28 }}>
        {/* Avatar editable */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${T.bdrL}` }}>
          <label htmlFor="settings-avatar-input" style={{ cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.p, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2.5px solid ${T.p}`, position: "relative" }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: T.fH, fontSize: 26, color: NAV_TEXT, fontWeight: 600 }}>
                    {form.name ? form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PS"}
                  </span>
              }
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: T.card, border: `1.5px solid ${T.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✏️</div>
            </div>
            <input id="settings-avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </label>
          <div>
            <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, fontWeight: 500 }}>{form.name || "Tu nombre"}</div>
            <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>{form.specialty || "Especialidad"}</div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 2 }}>Toca la foto para cambiarla</div>
          </div>
        </div>

        {/* Campos */}
        <Input label="Nombre completo" value={form.name} onChange={fld("name")} placeholder="Dra. Ana López" />
        <Input label="Especialidad" value={form.specialty} onChange={fld("specialty")} placeholder="Psicóloga Clínica" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Input label="Cédula profesional" value={form.cedula} onChange={fld("cedula")} placeholder="XXXXXXX" style={{ marginBottom: 0 }} />
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-000-0000" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Input label="RFC" value={form.rfc || ""} onChange={fld("rfc")} placeholder="LOAA800101XX0" style={{ marginBottom: 4 }} />
          <div style={{ fontFamily: "var(--fB, sans-serif)", fontSize: 11, color: T.tl, paddingLeft: 2 }}>Se incluye en los recibos de pago generados</div>
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} placeholder="ana@consultorio.com" />
        <Input label="Nombre del consultorio" value={form.clinic} onChange={fld("clinic")} placeholder="Consultorio Integral" />
        <Input label="Dirección del consultorio" value={form.address || ""} onChange={fld("address")} placeholder="Calle, número, colonia, ciudad" />

        {/* Descripción profesional */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Descripción profesional
          </label>
          <textarea
            value={form.description || ""}
            onChange={e => fld("description")(e.target.value)}
            placeholder="Cuéntale a tus pacientes sobre ti y tu enfoque terapéutico…"
            rows={3}
            style={{ width: "100%", padding: "10px 13px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: "var(--bg)", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 10, alignItems: "center" }}>
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.suc, fontFamily: T.fB, fontSize: 13 }}>
              <CheckCircle size={15} /> Guardado
            </div>
          )}
          <Btn onClick={save}><Check size={15} /> Guardar perfil</Btn>
        </div>
      </Card>

      {/* ── Estado de suscripción ─────────────────────────────────────── */}
      {psychologist && (
        <Card style={{ padding: 24, marginTop: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Estado de suscripción
          </div>
          {psychologist.subscription_status === "active" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: T.sucA, borderRadius: 10, border: `1px solid ${T.suc}30` }}>
              <CheckCircle size={18} color={T.suc} />
              <div>
                <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.suc }}>Suscripción activa</div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>Acceso completo a todas las funcionalidades</div>
              </div>
            </div>
          ) : trialDaysLeft(psychologist) > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: trialDaysLeft(psychologist) <= 3 ? T.errA : T.warA || "rgba(184,144,10,0.08)", borderRadius: 10, border: `1px solid ${trialDaysLeft(psychologist) <= 3 ? T.err : T.war}30` }}>
              <AlertCircle size={18} color={trialDaysLeft(psychologist) <= 3 ? T.err : T.war} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: trialDaysLeft(psychologist) <= 3 ? T.err : T.war }}>
                  Período de prueba · {trialDaysLeft(psychologist)} día{trialDaysLeft(psychologist) !== 1 ? "s" : ""} restante{trialDaysLeft(psychologist) !== 1 ? "s" : ""}
                </div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
                  Vence el {new Date(psychologist.trial_ends_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <a href="mailto:soporte@psychocore.app?subject=Suscripción PsychoCore"
                style={{ padding: "7px 14px", borderRadius: 100, background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                Suscribirme →
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: T.errA, borderRadius: 10, border: `1px solid ${T.err}30` }}>
              <AlertCircle size={18} color={T.err} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.err }}>Prueba gratuita expirada</div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>Suscríbete para recuperar el acceso completo</div>
              </div>
              <a href="mailto:soporte@psychocore.app?subject=Suscripción PsychoCore"
                style={{ padding: "7px 14px", borderRadius: 100, background: T.err, color: "#fff", fontFamily: T.fB, fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                Suscribirme →
              </a>
            </div>
          )}
        </Card>
      )}

      {/* ── Soporte ──────────────────────────────────────────────────────── */}
      <Card style={{ padding: 20, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 3 }}>¿Necesitas ayuda?</div>
          <div style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm }}>Escríbenos por WhatsApp, respondemos en minutos.</div>
        </div>
        <a href="https://wa.me/529831348558?text=Hola%2C%20necesito%20ayuda%20con%20PsychoCore"
          target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 100, background: WA, color: NAV_TEXT, textDecoration: "none", fontFamily: T.fB, fontSize: 13, fontWeight: 700, flexShrink: 0, transition: "all .15s" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={NAV_TEXT}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          Abrir WhatsApp
        </a>
      </Card>
    </div>
  );
}

// ── Tab: Datos ────────────────────────────────────────────────────────────────
function DataTab({ allData, onRestore, patients, googleUser }) {
  const {
    msg, importing,
    showDelete,        setShowDelete,
    showBackupWarning, setShowBackupWarning,
    deleteInput,       setDeleteInput,
    deleting,
    deleteReport,
    exportJSON, exportCSV, importJSON, deleteAccount,
    statItems,
  } = useDataTab({ allData, onRestore, patients });

  return (
    <div style={{ maxWidth: 560 }}>

      {/* Resumen de datos */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
          Resumen de tu información
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {statItems.map(s => (
            <div key={s.label} style={{ background: T.pA, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: T.fB, fontSize: 20, fontWeight: 700, color: T.p }}>{s.val}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Exportar */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 4 }}>Exportar datos</div>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 16 }}>
          Descarga una copia completa de todos tus datos. Guárdala en un lugar seguro como respaldo adicional.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportJSON}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.p}`, background: T.pA, color: T.p, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
            <FileJson size={15} /> Backup completo (.json)
          </button>
          <button onClick={exportCSV}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
            <Users size={15} /> Solo pacientes (.csv)
          </button>
        </div>
      </Card>

      {/* Importar */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 4 }}>Importar backup</div>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 4 }}>
          Restaura un backup previamente exportado desde PsychoCore.
        </p>
        <div style={{ padding: "10px 14px", background: T.errA, borderRadius: 8, fontFamily: T.fB, fontSize: 12, color: T.err, marginBottom: 16, lineHeight: 1.5 }}>
          ⚠️ Esta acción reemplaza tus datos actuales. Haz un backup antes de importar.
        </div>
        <button onClick={importJSON} disabled={importing}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.6 : 1, transition: "all .15s" }}>
          {importing ? <RefreshCw size={15} style={{ animation: "spin .8s linear infinite" }} /> : <Upload size={15} />}
          {importing ? "Importando…" : "Importar desde archivo .json"}
        </button>
      </Card>

      {/* Zona de peligro */}
      <Card style={{ padding: 24, marginBottom: 16, border: `1.5px solid ${T.err}40` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Trash2 size={15} color={T.err} />
          <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.err }}>Eliminar cuenta</div>
        </div>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 16 }}>
          Elimina permanentemente todos tus datos clínicos y tu cuenta. Esta acción no se puede deshacer.
        </p>
        <button onClick={() => setShowBackupWarning(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.err}`, background: T.errA, color: T.err, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Trash2 size={15} /> Eliminar mi cuenta
        </button>
      </Card>

      {/* Modal advertencia — backup primero */}
      {showBackupWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.bg, borderRadius: 18, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", border: `1px solid ${T.war}60` }}>
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>💾</div>
            <div style={{ fontFamily: T.fB, fontSize: 17, fontWeight: 700, color: T.t, marginBottom: 10, textAlign: "center" }}>
              Descarga tu información antes de continuar
            </div>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.65, marginBottom: 8, textAlign: "center" }}>
              Al eliminar tu cuenta se perderán permanentemente todos tus pacientes, sesiones, citas, pagos y datos clínicos.
            </p>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.65, marginBottom: 20, textAlign: "center" }}>
              Te recomendamos descargar un backup completo antes de proceder.
            </p>
            <button onClick={exportJSON}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 10, border: `1.5px solid ${T.p}`, background: T.pA, color: T.p, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
              <Download size={15} /> Descargar backup completo (.json)
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowBackupWarning(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => { setShowBackupWarning(false); setShowDelete(true); setDeleteInput(""); }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.err}`, background: T.errA, color: T.err, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Continuar sin backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.bg, borderRadius: 18, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", border: `1px solid ${T.err}40` }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>⚠️</div>
            <div style={{ fontFamily: T.fB, fontSize: 17, fontWeight: 700, color: T.t, marginBottom: 8, textAlign: "center" }}>
              ¿Eliminar cuenta permanentemente?
            </div>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 20, textAlign: "center" }}>
              Se borrarán todos tus pacientes, sesiones, citas, pagos y datos clínicos. Esta acción es <strong>irreversible</strong>.
            </p>
            <div style={{ background: T.errA, borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontFamily: T.fB, fontSize: 12, color: T.err, lineHeight: 1.5 }}>
              Escribe <strong>ELIMINAR</strong> para confirmar:
            </div>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="ELIMINAR"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${deleteInput === "ELIMINAR" ? T.err : T.bdr}`, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.bg, marginBottom: 16, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDelete(false)} disabled={deleting}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={deleteAccount}
                disabled={deleteInput !== "ELIMINAR" || deleting}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: deleteInput === "ELIMINAR" && !deleting ? T.err : T.errA, color: deleteInput === "ELIMINAR" && !deleting ? "#fff" : `${T.err}60`, fontFamily: T.fB, fontSize: 13, fontWeight: 700, cursor: deleteInput === "ELIMINAR" && !deleting ? "pointer" : "not-allowed", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {deleting
                  ? <><RefreshCw size={14} style={{ animation: "spin .8s linear infinite" }} /> Eliminando…</>
                  : <><Trash2 size={14} /> Eliminar todo</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resumen eliminación */}
      {deleteReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.bg, borderRadius: 18, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", border: `1px solid ${T.bdr}` }}>
            <div style={{ fontSize: 40, marginBottom: 12, textAlign: "center" }}>✅</div>
            <div style={{ fontFamily: T.fB, fontSize: 17, fontWeight: 700, color: T.t, marginBottom: 6, textAlign: "center" }}>
              Cuenta eliminada
            </div>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, textAlign: "center", marginBottom: 20 }}>
              Los siguientes datos fueron eliminados permanentemente de Supabase y de este dispositivo:
            </p>
            <div style={{ background: T.card, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
              {[
                ["🧑‍⚕️", "Pacientes",    deleteReport.pacientes],
                ["📅",  "Citas",         deleteReport.citas],
                ["📝",  "Sesiones",      deleteReport.sesiones],
                ["💰",  "Pagos",         deleteReport.pagos],
                ["⚠️",  "Evaluaciones",  deleteReport.evaluaciones],
                ["📊",  "Escalas",       deleteReport.escalas],
                ["📋",  "Planes",        deleteReport.planes],
                ["📞",  "Contactos",     deleteReport.contactos],
                ["💊",  "Medicamentos",  deleteReport.medicamentos],
                ["💼",  "Servicios",     deleteReport.servicios],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${T.bdr}40` }}>
                  <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>{icon} {label}</span>
                  <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.t }}>{val}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { window.location.href = window.location.origin; }}
              style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Flash message */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: msg.ok ? T.sucA : T.errA, border: `1px solid ${msg.ok ? T.suc : T.err}30`, fontFamily: T.fB, fontSize: 13, color: msg.ok ? T.suc : T.err }}>
          {msg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Tab: Apariencia ───────────────────────────────────────────────────────────
function AppearanceTab({ darkMode, setDarkMode, patients, setPatients }) {
  const { csvMsg, handleCSV } = useAppearanceTab({ setPatients });

  const Toggle = ({ label, sub, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${T.bdrL}` }}>
      <div>
        <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t }}>{label}</div>
        {sub && <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", padding: 2, background: value ? T.p : T.bdrL, transition: "background .2s", position: "relative", flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.card, position: "absolute", top: 2, left: value ? 22 : 2, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Dark mode */}
      <Card style={{ padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, marginBottom: 4 }}>Modo de apariencia</div>
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 14 }}>Por defecto sigue el sistema de tu dispositivo</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { v: "auto",  label: "⚙️ Automático", sub: "Según el sistema" },
            { v: "light", label: "☀️ Claro",       sub: "Siempre claro"   },
            { v: "dark",  label: "🌙 Oscuro",       sub: "Siempre oscuro"  },
          ].map(({ v, label, sub }) => {
            const on = darkMode === v;
            return (
              <button key={v} onClick={() => setDarkMode(v)}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: `2px solid ${on ? T.p : T.bdr}`, background: on ? T.pA : "transparent", cursor: "pointer", transition: "all .13s", textAlign: "center" }}>
                <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: on ? 700 : 500, color: on ? T.p : T.t }}>{label}</div>
                <div style={{ fontFamily: T.fB, fontSize: 10, color: T.tl, marginTop: 2 }}>{sub}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* CSV import */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ fontFamily: T.fH, fontSize: 20, color: T.t, margin: "0 0 8px" }}>Importar desde CSV</h3>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 16, lineHeight: 1.65 }}>
          Migra pacientes desde otra herramienta. Columnas reconocidas: <strong>nombre</strong>, email, teléfono, fecha_nacimiento, diagnóstico, notas.
        </p>

        {/* Ejemplo de CSV */}
        <div style={{ background: T.cardAlt, borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Ejemplo de CSV</div>
          <table style={{ borderCollapse: "collapse", fontFamily: T.fB, fontSize: 12, width: "100%", tableLayout: "fixed" }}>
            <thead>
              <tr>{["nombre", "email", "teléfono"].map(h => (
                <td key={h} style={{ padding: "6px 10px", background: T.p, color: NAV_TEXT, fontWeight: 600 }}>{h}</td>
              ))}</tr>
            </thead>
            <tbody>
              <tr>{["Ana López", "ana@mail.com", "998-000-0001"].map((v, i) => (
                <td key={i} style={{ padding: "6px 10px", color: T.tm, borderBottom: `1px solid ${T.bdrL}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</td>
              ))}</tr>
            </tbody>
          </table>
          <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 8 }}>
            + fecha_nacimiento, diagnóstico, notas (opcionales)
          </div>
        </div>

        {csvMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: csvMsg.ok ? T.sucA : T.errA, marginBottom: 16, fontFamily: T.fB, fontSize: 13, color: csvMsg.ok ? T.suc : T.err }}>
            {csvMsg.ok ? "✓" : "✕"} {csvMsg.text}
          </div>
        )}

        <Btn onClick={handleCSV}>Seleccionar archivo CSV</Btn>
        <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 10 }}>
          Los pacientes importados se agregan sin reemplazar los existentes. Puedes editar cada uno después de la importación.
        </p>
      </Card>
    </div>
  );
}

// ── FAQ (componentes auxiliares de HelpTab) ───────────────────────────────────
function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${T.bdrL}` }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, lineHeight: 1.4 }}>
          {item.q}
        </span>
        {open
          ? <ChevronUp size={16} color={T.p} style={{ flexShrink: 0 }} />
          : <ChevronDown size={16} color={T.tl} style={{ flexShrink: 0 }} />
        }
      </button>
      {open && (
        <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.7, paddingBottom: 14, paddingRight: 8 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

// ── Tab: Ayuda ────────────────────────────────────────────────────────────────
function HelpTab() {
  return (
    <div style={{ maxWidth: 560 }}>

      {/* FAQ */}
      <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <HelpCircle size={13} /> Preguntas frecuentes
      </div>
      <Card style={{ padding: "0 20px", marginBottom: 20 }}>
        {FAQ_ITEMS.map((item, i) => <FaqItem key={i} item={item} />)}
      </Card>

      {/* Soporte */}
      <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <MessageCircle size={13} /> Contactar soporte
      </div>

      <Card style={{ padding: 20, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(37,211,102,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={WA}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 2 }}>WhatsApp</div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>Respuesta en menos de 24 hrs</div>
          </div>
          <a href="https://wa.me/529831348558?text=Hola%2C%20necesito%20ayuda%20con%20PsychoCore"
            target="_blank" rel="noreferrer"
            style={{ padding: "8px 16px", borderRadius: 100, background: WA, color: NAV_TEXT, fontFamily: T.fB, fontSize: 12.5, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
            Escribir →
          </a>
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: T.pA, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mail size={18} color={T.p} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 2 }}>Correo electrónico</div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>soporte@psychocore.app</div>
          </div>
          <a href="mailto:soporte@psychocore.app?subject=Ayuda%20PsychoCore"
            style={{ padding: "8px 16px", borderRadius: 100, background: T.pA, color: T.p, fontFamily: T.fB, fontSize: 12.5, fontWeight: 700, textDecoration: "none", border: `1.5px solid ${T.p}30`, flexShrink: 0 }}>
            Escribir →
          </a>
        </div>
      </Card>

      {/* Tip */}
      <div style={{ display: "flex", gap: 10, padding: "12px 16px", borderRadius: 12, background: T.warA || "rgba(184,144,10,0.08)", border: "1px solid rgba(184,144,10,0.2)" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
        <p style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm, lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: T.t }}>Tip:</strong> Si encontraste un error, adjunta una captura de pantalla al escribirnos — nos ayuda a resolverlo mucho más rápido.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Horario ──────────────────────────────────────────────────────────────
function ScheduleTab({ profile, setProfile }) {
  const {
    form, toggleDay, setStart, setEnd, save, doSave, saved, isValid,
    hasGranularSchedule, showGranularWarn, setShowGranularWarn,
  } = useScheduleTab({ profile, setProfile });

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, marginBottom: 24, lineHeight: 1.6 }}>
        Define los días y horarios en que atiendes pacientes. La Agenda respetará esta configuración
        y no permitirá agendar citas fuera de estos bloques.
      </p>

      {hasGranularSchedule && (
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10, background: T.warA || "rgba(184,144,10,0.08)", border: "1px solid rgba(184,144,10,0.25)", marginBottom: 20 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <p style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm, lineHeight: 1.6, margin: 0 }}>
            Tienes un <strong style={{ color: T.t }}>horario personalizado por día</strong> configurado desde el onboarding.
            Guardar aquí aplicará un bloque de horario único para todos los días seleccionados y reemplazará esa configuración.
          </p>
        </div>
      )}

      <Card style={{ padding: 28, marginBottom: 20 }}>
        {/* Días hábiles */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Días de atención
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DAY_LABELS.map((lbl, idx) => {
              const active = form.workingDays.includes(idx);
              return (
                <button key={idx} onClick={() => toggleDay(idx)}
                  style={{ width: 52, height: 52, borderRadius: 12, cursor: "pointer", fontFamily: T.fB, fontSize: 13, fontWeight: active ? 700 : 400, border: `1.5px solid ${active ? T.p : T.bdr}`, background: active ? T.pA : "transparent", color: active ? T.p : T.tm, transition: "all .13s" }}>
                  {lbl}
                </button>
              );
            })}
          </div>
          {form.workingDays.length === 0 && (
            <div style={{ marginTop: 8, fontFamily: T.fB, fontSize: 12, color: T.err }}>
              Selecciona al menos un día de atención.
            </div>
          )}
        </div>

        {/* Bloques horarios */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Horario de atención
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6 }}>Entrada</label>
              <input type="time" value={form.workingStart}
                onChange={e => setStart(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6 }}>Salida</label>
              <input type="time" value={form.workingEnd}
                onChange={e => setEnd(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          {form.workingStart >= form.workingEnd && (
            <div style={{ marginTop: 8, fontFamily: T.fB, fontSize: 12, color: T.err }}>
              La hora de entrada debe ser anterior a la de salida.
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ marginTop: 24, padding: "12px 16px", background: T.cardAlt, borderRadius: 10, border: `1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Resumen
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t }}>
            {form.workingDays.length > 0
              ? `${form.workingDays.map(d => DAY_LABELS[d]).join(", ")} · ${form.workingStart} – ${form.workingEnd}`
              : "Sin días seleccionados"}
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={save} disabled={!isValid}>
          {saved ? "✓ Guardado" : "Guardar horario"}
        </Btn>
      </div>

      {/* Modal de confirmación para sobrescribir horario granular */}
      {showGranularWarn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.bg, borderRadius: 18, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: T.fB, fontSize: 16, fontWeight: 700, color: T.t, marginBottom: 10, textAlign: "center" }}>
              ¿Reemplazar horario personalizado?
            </div>
            <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.65, marginBottom: 20, textAlign: "center" }}>
              Tienes horarios distintos configurados por día. Al guardar se aplicará un bloque único
              para todos los días seleccionados y se perderá la configuración anterior.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowGranularWarn(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={doSave}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Sí, reemplazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Servicios ────────────────────────────────────────────────────────────

// Mapa de colores por tipo de servicio (para chips y fondos)
const SVC_COLORS = {
  sesion:     { color: "#5B5BD6", bg: "rgba(91,91,214,0.08)"  },
  evaluacion: { color: "#0891B2", bg: "rgba(8,145,178,0.08)"  },
  pareja:     { color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
  grupo:      { color: "#059669", bg: "rgba(5,150,105,0.08)"  },
  otro:       { color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
};

// ── ServiceCard rediseñada ────────────────────────────────────────────────────
function ServiceCard({ svc, activeCurrencies, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const type     = SERVICE_TYPES[svc.type] || SERVICE_TYPES.otro;
  const typeClr  = SVC_COLORS[svc.type]   || SVC_COLORS.otro;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card,
        borderRadius: 16,
        border: `1.5px solid ${hovered ? T.p + "50" : T.bdr}`,
        padding: "18px 20px",
        marginBottom: 10,
        transition: "all .2s ease",
        boxShadow: hovered ? `0 8px 28px rgba(91,91,214,0.1)` : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Icon chip */}
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: typeClr.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
            border: `1px solid ${typeClr.color}20`,
          }}>
            {type.icon}
          </div>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 14.5, fontWeight: 700, color: T.t, marginBottom: 5 }}>
              {svc.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {/* Type badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 99,
                background: typeClr.bg, color: typeClr.color,
                fontFamily: T.fB, fontSize: 11, fontWeight: 700,
              }}>
                {type.short}
              </span>
              {/* Modality badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 99,
                background: T.bdrL, color: T.tm,
                fontFamily: T.fB, fontSize: 11, fontWeight: 600,
              }}>
                {svc.modality === "ambas" ? "🔄 Ambas" : svc.modality === "virtual" ? "💻 Virtual" : "🏢 Presencial"}
              </span>
            </div>
          </div>
        </div>

        {/* Duration chip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 12px", borderRadius: 99,
          background: T.pA, flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.p} strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
          <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.p }}>
            {fmtDuration(svc.durationMin)}
          </span>
        </div>
      </div>

      {/* Prices row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16,
        padding: "10px 14px", borderRadius: 12,
        background: T.bg, border: `1px solid ${T.bdrL}`,
      }}>
        {activeCurrencies.map(cur => {
          const p = svc.prices?.[cur];
          if (!p) return null;
          return (
            <div key={cur} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl }}>{cur}</span>
              {p.presencial != null && (
                <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.t }}>
                  <span style={{ color: T.tm, fontWeight: 400 }}>🏢 </span>{fmtCur(p.presencial)}
                </span>
              )}
              {p.presencial != null && p.virtual != null && (
                <span style={{ color: T.bdr, fontSize: 13 }}>·</span>
              )}
              {p.virtual != null && (
                <span style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.t }}>
                  <span style={{ color: T.tm, fontWeight: 400 }}>💻 </span>{fmtCur(p.virtual)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onEdit(svc)}
          style={{
            flex: 1, padding: "9px", borderRadius: 11,
            border: `1.5px solid ${hovered ? T.p + "40" : T.bdr}`,
            background: hovered ? T.pA : "transparent",
            fontFamily: T.fB, fontSize: 12.5, fontWeight: 600,
            color: hovered ? T.p : T.tm,
            cursor: "pointer", transition: "all .18s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editar
        </button>
        <button
          onClick={() => onDelete(svc.id)}
          style={{
            padding: "9px 14px", borderRadius: 11,
            border: `1.5px solid ${T.err}25`,
            background: "transparent",
            fontFamily: T.fB, fontSize: 12.5, fontWeight: 600,
            color: T.err + "80",
            cursor: "pointer", transition: "all .18s",
            display: "flex", alignItems: "center", gap: 6,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = T.errA;
            e.currentTarget.style.color = T.err;
            e.currentTarget.style.borderColor = T.err + "60";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = T.err + "80";
            e.currentTarget.style.borderColor = T.err + "25";
          }}
        >
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  );
}

// ── ServiceForm rediseñado (bottom sheet 2 pasos) ────────────────────────────
function ServiceFormSheet({
  editingId, form, fld, setPriceField,
  activeCurrencies, allCurrencies,
  formErrors, save, cancelForm,
}) {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(1);
  const MM_OPTIONS = ["00", "15", "30", "45"];

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(cancelForm, 260);
  };

  const inputBase = {
    width: "100%", padding: "11px 14px", boxSizing: "border-box",
    border: `1.5px solid ${T.bdr}`, borderRadius: 12,
    fontFamily: T.fB, fontSize: 14, color: T.t,
    background: T.bg, outline: "none", transition: "border-color .15s",
  };
  const labelStyle = {
    display: "block", fontFamily: T.fB, fontSize: 11, fontWeight: 700,
    color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: 8, marginTop: 20,
  };

  const handleNext = () => {
    // Trigger validation via save attempt — if step 1 fields are bad, formErrors will populate
    // We do a lightweight local check first
    if (!form.name.trim()) { fld("name")(form.name); save(); return; }
    const min = (parseInt(form.durationHH, 10) || 0) * 60 + (parseInt(form.durationMM, 10) || 0);
    if (!min) { save(); return; }
    setStep(2);
  };

  const durationMin = (parseInt(form.durationHH, 10) || 0) * 60 + (parseInt(form.durationMM, 10) || 0);

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: `rgba(0,0,0,${visible ? 0.45 : 0})`,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        transition: "background .26s ease",
        backdropFilter: visible ? "blur(2px)" : "none",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: T.card,
          borderRadius: "24px 24px 0 0",
          maxHeight: "92dvh", overflowY: "auto",
          boxShadow: "0 -16px 60px rgba(0,0,0,.18)",
          transform: `translateY(${visible ? 0 : "100%"})`,
          transition: "transform .3s cubic-bezier(.32,1.01,.53,1)",
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 1,
          background: T.card,
          padding: "16px 24px 14px",
          borderBottom: `1px solid ${T.bdrL}`,
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: T.bdr, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 600, color: T.t, margin: "0 0 2px" }}>
                {editingId ? "Editar servicio" : "Nuevo servicio"}
              </h3>
              <p style={{ fontFamily: T.fB, fontSize: 12.5, color: T.tm, margin: 0 }}>
                {step === 1 ? "Información general" : "Tarifas por modalidad"}
              </p>
            </div>
            {/* Step dots */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  width: s === step ? 20 : 8, height: 8, borderRadius: 99,
                  background: s <= step ? T.p : T.bdrL,
                  transition: "all .25s ease",
                }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px 40px" }}>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div>
              <label style={labelStyle}>Nombre del servicio *</label>
              <input
                style={{ ...inputBase, borderColor: formErrors.name ? T.err : T.bdr }}
                type="text"
                placeholder="Ej. Sesión de psicoterapia individual"
                value={form.name}
                onChange={e => fld("name")(e.target.value)}
                onFocus={e => e.target.style.borderColor = T.p}
                onBlur={e => e.target.style.borderColor = formErrors.name ? T.err : T.bdr}
              />
              {formErrors.name && (
                <p style={{ fontFamily: T.fB, fontSize: 11, color: T.err, marginTop: 5 }}>{formErrors.name}</p>
              )}

              <label style={labelStyle}>Tipo de servicio</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {Object.entries(SERVICE_TYPES).map(([k, v]) => {
                  const on  = form.type === k;
                  const clr = SVC_COLORS[k] || SVC_COLORS.otro;
                  return (
                    <button key={k} onClick={() => fld("type")(k)} style={{
                      padding: "12px 6px", borderRadius: 14,
                      border: `2px solid ${on ? clr.color : T.bdr}`,
                      background: on ? clr.bg : "transparent",
                      cursor: "pointer", transition: "all .15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    }}>
                      <span style={{ fontSize: 20 }}>{v.icon}</span>
                      <span style={{
                        fontFamily: T.fB, fontSize: 11, fontWeight: on ? 700 : 500,
                        color: on ? clr.color : T.tm,
                      }}>{v.short}</span>
                    </button>
                  );
                })}
              </div>

              <label style={labelStyle}>Modalidad</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { v: "ambas",      ic: "🔄", lb: "Ambas" },
                  { v: "presencial", ic: "🏢", lb: "Presencial" },
                  { v: "virtual",    ic: "💻", lb: "Virtual" },
                ].map(({ v, ic, lb }) => {
                  const on = form.modality === v;
                  return (
                    <button key={v} onClick={() => fld("modality")(v)} style={{
                      flex: 1, padding: "11px 8px", borderRadius: 12,
                      border: `2px solid ${on ? T.p : T.bdr}`,
                      background: on ? T.pA : "transparent",
                      cursor: "pointer", transition: "all .15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                      <span style={{ fontSize: 18 }}>{ic}</span>
                      <span style={{
                        fontFamily: T.fB, fontSize: 12, fontWeight: on ? 700 : 500,
                        color: on ? T.p : T.tm,
                      }}>{lb}</span>
                    </button>
                  );
                })}
              </div>

              <label style={labelStyle}>Duración *</label>
              {formErrors.duration && (
                <p style={{ fontFamily: T.fB, fontSize: 11, color: T.err, marginTop: -4, marginBottom: 8 }}>{formErrors.duration}</p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end" }}>
                <div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginBottom: 6 }}>Horas</div>
                  <input
                    type="number" min="0" max="23"
                    value={form.durationHH}
                    onChange={e => fld("durationHH")(String(e.target.value).padStart(2, "0"))}
                    style={{
                      ...inputBase, textAlign: "center",
                      fontFamily: T.fH, fontSize: 24, fontWeight: 600,
                      borderColor: formErrors.duration ? T.err : T.bdr,
                    }}
                    onFocus={e => e.target.style.borderColor = T.p}
                    onBlur={e => e.target.style.borderColor = formErrors.duration ? T.err : T.bdr}
                  />
                </div>
                <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 600, color: T.bdr, paddingBottom: 10 }}>:</div>
                <div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginBottom: 6 }}>Minutos</div>
                  <select
                    value={form.durationMM}
                    onChange={e => fld("durationMM")(e.target.value)}
                    style={{
                      ...inputBase, textAlign: "center",
                      fontFamily: T.fH, fontSize: 24, fontWeight: 600,
                      cursor: "pointer",
                      borderColor: formErrors.duration ? T.err : T.bdr,
                    }}
                  >
                    {MM_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 6 }}>
                Formato HH:MM — ej. 01:30 = 1 h 30 min
              </p>

              <button
                onClick={handleNext}
                style={{
                  width: "100%", marginTop: 28, padding: "14px",
                  borderRadius: 14, border: "none",
                  background: T.p, color: "#fff",
                  fontFamily: T.fB, fontSize: 14, fontWeight: 700,
                  cursor: "pointer", transition: "opacity .15s",
                  boxShadow: `0 6px 20px ${T.p}40`,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Continuar: tarifas →
              </button>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div>
              {/* Summary chip */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 12,
                background: T.pA, marginBottom: 20,
                border: `1px solid ${T.p}20`,
              }}>
                <span style={{ fontSize: 18 }}>{SERVICE_TYPES[form.type]?.icon}</span>
                <div>
                  <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 700, color: T.t }}>{form.name}</div>
                  <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>
                    {SERVICE_TYPES[form.type]?.short} · {fmtDuration(durationMin)}
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    marginLeft: "auto", fontFamily: T.fB, fontSize: 12, fontWeight: 600,
                    color: T.p, background: "none", border: "none", cursor: "pointer",
                  }}
                >
                  ← Editar
                </button>
              </div>

              {formErrors.prices && (
                <p style={{ fontFamily: T.fB, fontSize: 11.5, color: T.err, marginBottom: 12 }}>{formErrors.prices}</p>
              )}

              {activeCurrencies.map(cur => (
                <div key={cur} style={{ marginBottom: 14 }}>
                  <div style={{
                    padding: "8px 14px",
                    borderRadius: "12px 12px 0 0",
                    background: T.p,
                  }}>
                    <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {allCurrencies.find(c => c.code === cur)?.flag} {cur}
                    </span>
                  </div>
                  <div style={{
                    border: `1.5px solid ${T.p}30`, borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    padding: "14px",
                    background: T.pA,
                    display: "grid",
                    gridTemplateColumns: form.modality === "ambas" ? "1fr 1fr" : "1fr",
                    gap: 12,
                  }}>
                    {form.modality !== "virtual" && (
                      <div>
                        <label style={{ display: "block", fontFamily: T.fB, fontSize: 11, fontWeight: 600, color: T.tm, marginBottom: 6 }}>
                          🏢 Presencial
                        </label>
                        <div style={{ position: "relative" }}>
                          <span style={{
                            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                            fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.tl, pointerEvents: "none",
                          }}>$</span>
                          <input
                            type="number" min="0" placeholder="0"
                            value={form.prices[cur]?.presencial ?? ""}
                            onChange={e => setPriceField(cur, "presencial", e.target.value)}
                            style={{
                              width: "100%", padding: "11px 12px 11px 26px", boxSizing: "border-box",
                              border: `1.5px solid ${T.bdr}`, borderRadius: 12,
                              fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t,
                              background: T.card, outline: "none",
                            }}
                            onFocus={e => e.target.style.borderColor = T.p}
                            onBlur={e => e.target.style.borderColor = T.bdr}
                          />
                        </div>
                      </div>
                    )}
                    {form.modality !== "presencial" && (
                      <div>
                        <label style={{ display: "block", fontFamily: T.fB, fontSize: 11, fontWeight: 600, color: T.tm, marginBottom: 6 }}>
                          💻 Virtual
                        </label>
                        <div style={{ position: "relative" }}>
                          <span style={{
                            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                            fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.tl, pointerEvents: "none",
                          }}>$</span>
                          <input
                            type="number" min="0" placeholder="0"
                            value={form.prices[cur]?.virtual ?? ""}
                            onChange={e => setPriceField(cur, "virtual", e.target.value)}
                            style={{
                              width: "100%", padding: "11px 12px 11px 26px", boxSizing: "border-box",
                              border: `1.5px solid ${T.bdr}`, borderRadius: 12,
                              fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t,
                              background: T.card, outline: "none",
                            }}
                            onFocus={e => e.target.style.borderColor = T.p}
                            onBlur={e => e.target.style.borderColor = T.bdr}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1, padding: "13px", borderRadius: 14,
                    border: `1.5px solid ${T.bdr}`, background: "transparent",
                    fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.tm,
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.p}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.bdr}
                >
                  ← Atrás
                </button>
                <button
                  onClick={save}
                  style={{
                    flex: 2, padding: "13px", borderRadius: 14,
                    border: "none", background: T.p, color: "#fff",
                    fontFamily: T.fB, fontSize: 14, fontWeight: 700,
                    cursor: "pointer", transition: "opacity .15s",
                    boxShadow: `0 6px 20px ${T.p}40`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {editingId ? "Guardar cambios" : "Agregar servicio"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DeleteServiceModal ────────────────────────────────────────────────────────
function DeleteServiceModal({ svcName, onConfirm, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };
  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 260);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: `rgba(0,0,0,${visible ? 0.45 : 0})`,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        transition: "background .26s ease",
        backdropFilter: visible ? "blur(2px)" : "none",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: T.card,
          borderRadius: "24px 24px 0 0",
          padding: "20px 24px 40px",
          boxShadow: "0 -16px 60px rgba(0,0,0,.18)",
          transform: `translateY(${visible ? 0 : "100%"})`,
          transition: "transform .3s cubic-bezier(.32,1.01,.53,1)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: T.bdr, margin: "0 auto 20px" }} />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: T.errA, border: `2px solid ${T.err}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Trash2 size={24} color={T.err} />
          </div>
          <h3 style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 600, color: T.t, margin: "0 0 8px" }}>
            ¿Eliminar servicio?
          </h3>
          <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, lineHeight: 1.6, margin: 0 }}>
            Se eliminará <strong style={{ color: T.t }}>"{svcName}"</strong> del catálogo.
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: T.errA, marginBottom: 24,
          fontFamily: T.fB, fontSize: 12.5, color: T.err, lineHeight: 1.55,
        }}>
          ⚠️ Los registros vinculados a este servicio (citas, sesiones) mantendrán el nombre pero sin enlace al catálogo.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1, padding: "13px", borderRadius: 14,
              border: `1.5px solid ${T.bdr}`, background: "transparent",
              fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.tm,
              cursor: "pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.p}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.bdr}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, padding: "13px", borderRadius: 14,
              border: "none", background: T.err, color: "#fff",
              fontFamily: T.fB, fontSize: 13.5, fontWeight: 700,
              cursor: "pointer", boxShadow: `0 6px 20px ${T.err}35`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Trash2 size={14} /> Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ServicesTab principal ─────────────────────────────────────────────────────
function ServicesTab({ profile, setProfile, services, setServices }) {
  const {
    activeCurrencies, allCurrencies, toggleCurrency,
    form, fld, setPriceField,
    showForm, formErrors, editingId,
    openNew, openEdit, cancelForm, save,
    regularServices, packageServices, del, delPkg,
    pkgPrices, setPkgPrices,
    pkgPricesV, setPkgPricesV,
    savePkgRow, resetPkgPrices,
    basePrice, basePriceV,
  } = useServicesTab({ profile, setProfile, services, setServices });

  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [pkgSaved,     setPkgSaved]     = useState({});
  const [pkgExpanded,  setPkgExpanded]  = useState(true);

  const handleDeleteRequest = (id) => {
    const svc = regularServices.find(s => s.id === id);
    if (svc) setDeleteTarget({ id, name: svc.name });
  };
  const confirmDelete = () => {
    if (deleteTarget) { del(deleteTarget.id); setDeleteTarget(null); }
  };

  const handleSavePkg = (mod) => {
    savePkgRow(mod);
    setPkgSaved(p => ({ ...p, [mod]: true }));
    setTimeout(() => setPkgSaved(p => ({ ...p, [mod]: false })), 2000);
  };

  return (
    <div>
      {/* ── Divisas ──────────────────────────────────────────────────────── */}
      <div style={{
        background: T.card, borderRadius: 18,
        border: `1.5px solid ${T.bdr}`,
        padding: "20px 20px 16px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 700, color: T.t, marginBottom: 2 }}>
              Divisas que aceptas
            </div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>
              Los precios se ingresan en las divisas activas
            </div>
          </div>
          <span style={{
            padding: "4px 10px", borderRadius: 99,
            background: T.pA,
            fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.p,
          }}>
            {activeCurrencies.length} activa{activeCurrencies.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allCurrencies.map(({ code, flag }) => {
            const active = activeCurrencies.includes(code);
            return (
              <button key={code} onClick={() => toggleCurrency(code)} style={{
                padding: "8px 16px", borderRadius: 99,
                border: `1.5px solid ${active ? T.p : T.bdr}`,
                background: active ? T.p : "transparent",
                fontFamily: T.fB, fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? "#fff" : T.tm,
                cursor: "pointer", transition: "all .18s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{flag}</span>
                <span>{code}</span>
                {active && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {activeCurrencies.length === 0 && (
          <p style={{ fontFamily: T.fB, fontSize: 11.5, color: T.err, marginTop: 10, marginBottom: 0 }}>
            Selecciona al menos una divisa.
          </p>
        )}
      </div>

      {/* ── Catálogo header ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t }}>
            Catálogo de servicios
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, marginTop: 2 }}>
            {regularServices.length} servicio{regularServices.length !== 1 ? "s" : ""} configurado{regularServices.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={openNew}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 100, border: "none",
            background: T.p, color: "#fff",
            fontFamily: T.fB, fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 14px ${T.p}40`, transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${T.p}50`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 14px ${T.p}40`; }}
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {/* ── Lista o empty state ───────────────────────────────────────────── */}
      {regularServices.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: T.card, borderRadius: 18,
          border: `2px dashed ${T.bdr}`, marginBottom: 16,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: T.pA, border: `2px solid ${T.p}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>
            💼
          </div>
          <div style={{ fontFamily: T.fH, fontSize: 22, fontWeight: 600, color: T.t, marginBottom: 8 }}>
            Sin servicios configurados
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, marginBottom: 24 }}>
            Agrega tus servicios y tarifas para usarlos en toda la app.
          </div>
          <button
            onClick={openNew}
            style={{
              padding: "12px 28px", borderRadius: 100, border: "none",
              background: T.p, color: "#fff",
              fontFamily: T.fB, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 6px 20px ${T.p}40`,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "none"}
          >
            <Plus size={14} /> Agregar primer servicio
          </button>
        </div>
      ) : (
        regularServices.map(svc => (
          <ServiceCard
            key={svc.id}
            svc={svc}
            activeCurrencies={activeCurrencies}
            onEdit={openEdit}
            onDelete={handleDeleteRequest}
          />
        ))
      )}

      {/* ── Paquetes de sesiones ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 20px" }}>
        <div style={{ flex: 1, height: 1, background: T.bdrL }} />
        <button
          onClick={() => setPkgExpanded(e => !e)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 99,
            border: `1.5px solid ${T.bdr}`, background: T.card,
            fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tm,
            cursor: "pointer", transition: "all .15s",
          }}
        >
          📦 Paquetes de sesiones
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: pkgExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div style={{ flex: 1, height: 1, background: T.bdrL }} />
      </div>

      {pkgExpanded && (
        <div>
          <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20, lineHeight: 1.6 }}>
            Precios preferenciales para múltiples sesiones. Se calculan automáticamente a partir del precio de la sesión individual.
          </p>

          {[
            { label: "Presencial 🏢", mod: "presencial", prices: pkgPrices, setPrices: setPkgPrices, show: true },
            { label: "Virtual 💻",    mod: "virtual",    prices: pkgPricesV, setPrices: setPkgPricesV, show: !!basePriceV },
          ].filter(r => r.show).map(row => (
            <div key={row.mod} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 10 }}>
                {row.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${DISCOUNTS.length}, 1fr)`, gap: 10, marginBottom: 10 }}>
                {DISCOUNTS.map(d => (
                  <div key={d.sessions} style={{
                    borderRadius: 16, border: `1.5px solid ${T.bdr}`,
                    overflow: "hidden", background: T.card,
                  }}>
                    {/* Card header */}
                    <div style={{
                      padding: "10px 14px",
                      background: `linear-gradient(135deg, ${T.p}15, ${T.p}05)`,
                      borderBottom: `1px solid ${T.bdrL}`,
                    }}>
                      <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.t }}>
                        {d.sessions} ses.
                      </div>
                      <span style={{
                        display: "inline-flex", marginTop: 4,
                        padding: "2px 8px", borderRadius: 99,
                        background: T.pA,
                        fontFamily: T.fB, fontSize: 10, fontWeight: 700, color: T.p,
                      }}>
                        {d.label}
                      </span>
                    </div>
                    {/* Input */}
                    <div style={{ padding: "12px" }}>
                      <div style={{ position: "relative" }}>
                        <span style={{
                          position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
                          fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.tl, pointerEvents: "none",
                        }}>$</span>
                        <input
                          type="number"
                          value={row.prices[d.sessions] || ""}
                          onChange={e => row.setPrices(p => ({ ...p, [d.sessions]: e.target.value }))}
                          style={{
                            width: "100%", padding: "9px 9px 9px 22px", boxSizing: "border-box",
                            border: `1.5px solid ${T.bdr}`, borderRadius: 10,
                            fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t,
                            background: T.bg, outline: "none", textAlign: "right",
                          }}
                          onFocus={e => e.target.style.borderColor = T.p}
                          onBlur={e => e.target.style.borderColor = T.bdr}
                        />
                      </div>
                      {row.prices[d.sessions] && (
                        <div style={{ fontFamily: T.fB, fontSize: 10.5, color: T.suc, marginTop: 5, textAlign: "right" }}>
                          ≈ {fmtCur(Math.round(row.prices[d.sessions] / d.sessions))} / ses.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleSavePkg(row.mod)}
                style={{
                  width: "100%", padding: "10px",
                  borderRadius: 12, cursor: "pointer", transition: "all .18s",
                  border: pkgSaved[row.mod] ? "none" : `1.5px solid ${T.p}`,
                  background: pkgSaved[row.mod] ? T.suc : T.pA,
                  color: pkgSaved[row.mod] ? "#fff" : T.p,
                  fontFamily: T.fB, fontSize: 12.5, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {pkgSaved[row.mod] ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ¡Guardado!
                  </>
                ) : (
                  <>Guardar paquetes {row.label}</>
                )}
              </button>
            </div>
          ))}

          {/* Paquetes guardados */}
          {packageServices.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8 }}>
                Paquetes guardados
              </div>
              {packageServices.map(svc => (
                <div key={svc.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", background: T.card, borderRadius: 12,
                  border: `1.5px solid ${T.bdr}`, marginBottom: 7,
                }}>
                  <div>
                    <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t }}>
                      📦 {svc.name} — {svc.sessions} sesiones
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 2 }}>
                      {svc.modality === "ambas"
                        ? `🏢 ${fmtCur(svc.price)} · 💻 ${fmtCur(svc.priceVirtual)}`
                        : svc.modality === "virtual"
                          ? `💻 ${fmtCur(svc.priceVirtual)}`
                          : `🏢 ${fmtCur(svc.price)}`
                      }
                      {" · "}{activeCurrencies[0] || "MXN"}
                    </div>
                  </div>
                  <button
                    onClick={() => delPkg(svc.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, padding: "4px 8px", transition: "color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = T.err}
                    onMouseLeave={e => e.currentTarget.style.color = T.tl}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom sheet: formulario ──────────────────────────────────────── */}
      {showForm && (
        <ServiceFormSheet
          editingId={editingId}
          form={form}
          fld={fld}
          setPriceField={setPriceField}
          activeCurrencies={activeCurrencies}
          allCurrencies={allCurrencies}
          formErrors={formErrors}
          save={save}
          cancelForm={cancelForm}
        />
      )}

      {/* ── Bottom sheet: confirmación eliminar ───────────────────────────── */}
      {deleteTarget && (
        <DeleteServiceModal
          svcName={deleteTarget.name}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}


// ── Main Settings ─────────────────────────────────────────────────────────────
export default function Settings({
  profile, setProfile,
  darkMode, setDarkMode,
  patients, setPatients,
  googleUser, psychologist,
  allData, onRestore,
  services = [], setServices,
  initialTab = "profile",
}) {
  const { tab, setTab, TABS } = useSettings({ initialTab });

  return (
    <div>
      <PageHeader title="Ajustes" subtitle="Perfil, apariencia y datos" />
      <div style={{ overflowX: "auto", marginBottom: 24, borderBottom: `1px solid ${T.bdr}`, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 13.5, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? T.p : T.tm, whiteSpace: "nowrap", borderBottom: tab === t.id ? `2px solid ${T.p}` : "2px solid transparent", transition: "all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "profile"    && <ProfileTab    profile={profile} setProfile={setProfile} googleUser={googleUser} psychologist={psychologist} />}
      {tab === "horario"    && <ScheduleTab   profile={profile} setProfile={setProfile} />}
      {tab === "services"   && <ServicesTab   profile={profile} setProfile={setProfile} services={services} setServices={setServices} />}
      {tab === "appearance" && <AppearanceTab darkMode={darkMode} setDarkMode={setDarkMode} patients={patients} setPatients={setPatients} />}
      {tab === "data"       && <DataTab       allData={allData} onRestore={onRestore} patients={patients} googleUser={googleUser} userId={googleUser?.id} />}
      {tab === "help"       && <HelpTab />}
    </div>
  );
}
