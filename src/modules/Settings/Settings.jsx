// ── Settings.jsx ─────────────────────────────────────────────────────────────
import { useState } from "react";
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

  const MM_OPTIONS = ["00", "15", "30", "45"];

  // ── Helpers de estilo ─────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: `1.5px solid ${T.bdr}`, borderRadius: 10,
    fontFamily: T.fB, fontSize: 13, color: T.t,
    background: T.card, outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: T.tm, marginBottom: 5, marginTop: 14,
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const errStyle = { fontSize: 11, color: "#e05555", marginTop: 4, fontFamily: T.fB };

  // ── Tarjeta de servicio ───────────────────────────────────────────────────
  const ServiceCard = ({ svc }) => {
    const primaryCur = activeCurrencies[0] || "MXN";
    const prices = svc.prices?.[primaryCur] || {};
    const hasP = svc.modality !== "virtual"    && prices.presencial != null;
    const hasV = svc.modality !== "presencial" && prices.virtual    != null;

    return (
      <div style={{
        background: T.card, borderRadius: 14,
        border: `1.5px solid ${T.bdr}`,
        padding: "14px 16px", marginBottom: 10,
        transition: "box-shadow .15s",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{SERVICE_TYPES[svc.type]?.icon || "⚡"}</span>
            <div>
              <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t }}>{svc.name}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 1 }}>
                {SERVICE_TYPES[svc.type]?.label}
                {" · "}
                {svc.modality === "ambas" ? "Presencial y virtual" : svc.modality === "virtual" ? "Virtual" : "Presencial"}
              </div>
            </div>
          </div>
          {/* Duración */}
          <div style={{
            background: T.pA, borderRadius: 8,
            padding: "4px 10px", flexShrink: 0,
          }}>
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.p }}>
              ⏱ {fmtDuration(svc.durationMin)}
            </span>
          </div>
        </div>

        {/* Precios */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {activeCurrencies.map(cur => {
            const p = svc.prices?.[cur];
            if (!p) return null;
            return (
              <div key={cur} style={{
                background: T.bdrL, borderRadius: 8, padding: "4px 10px",
                fontFamily: T.fB, fontSize: 12,
              }}>
                <span style={{ fontWeight: 700, color: T.t }}>{cur}</span>
                {p.presencial != null && (
                  <span style={{ color: T.tm, marginLeft: 6 }}>🏢 {fmtCur(p.presencial)}</span>
                )}
                {p.virtual != null && (
                  <span style={{ color: T.tm, marginLeft: 6 }}>💻 {fmtCur(p.virtual)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => openEdit(svc)}
            style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1.5px solid ${T.bdr}`, background: "transparent", fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            ✏️ Editar
          </button>
          <button onClick={() => del(svc.id)}
            style={{ padding: "8px 14px", borderRadius: 9, border: `1.5px solid #e0555530`, background: "transparent", fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: "#e05555", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      </div>
    );
  };

  // ── Modal / formulario de servicio ────────────────────────────────────────
  const ServiceForm = () => (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "0",
    }} onClick={cancelForm}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 540,
        background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 32px",
        maxHeight: "90dvh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: T.bdr, margin: "0 auto 20px" }} />

        <h3 style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 700, color: T.t, marginBottom: 4 }}>
          {editingId ? "Editar servicio" : "Nuevo servicio"}
        </h3>
        <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, marginBottom: 20 }}>
          Este servicio estará disponible en Agenda, Finanzas y Sesiones.
        </p>

        {/* Nombre */}
        <label style={labelStyle}>Nombre del servicio *</label>
        <input style={{ ...inputStyle, borderColor: formErrors.name ? "#e05555" : T.bdr }}
          type="text" placeholder="Ej. Sesión de psicoterapia individual"
          value={form.name} onChange={e => fld("name")(e.target.value)} />
        {formErrors.name && <p style={errStyle}>{formErrors.name}</p>}

        {/* Tipo */}
        <label style={labelStyle}>Tipo</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {Object.entries(SERVICE_TYPES).map(([k, v]) => {
            const active = form.type === k;
            return (
              <button key={k} onClick={() => fld("type")(k)} style={{
                padding: "9px 6px", borderRadius: 10,
                border: `1.5px solid ${active ? T.p : T.bdr}`,
                background: active ? T.pA : "transparent",
                fontFamily: T.fB, fontSize: 12, fontWeight: active ? 700 : 400,
                color: active ? T.p : T.tm, cursor: "pointer", transition: "all .13s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
                <span style={{ fontSize: 18 }}>{v.icon}</span>
                <span>{v.short}</span>
              </button>
            );
          })}
        </div>

        {/* Modalidad */}
        <label style={labelStyle}>Modalidad</label>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { v: "ambas",      ic: "🔄", lb: "Ambas" },
            { v: "presencial", ic: "🏢", lb: "Presencial" },
            { v: "virtual",    ic: "💻", lb: "Virtual" },
          ].map(({ v, ic, lb }) => {
            const active = form.modality === v;
            return (
              <button key={v} onClick={() => fld("modality")(v)} style={{
                flex: 1, padding: "9px 4px", borderRadius: 10,
                border: `1.5px solid ${active ? T.p : T.bdr}`,
                background: active ? T.pA : "transparent",
                fontFamily: T.fB, fontSize: 12, fontWeight: active ? 700 : 400,
                color: active ? T.p : T.tm, cursor: "pointer", transition: "all .13s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
                <span style={{ fontSize: 16 }}>{ic}</span>
                <span>{lb}</span>
              </button>
            );
          })}
        </div>

        {/* Duración HH:MM */}
        <label style={labelStyle}>Duración *</label>
        {formErrors.duration && <p style={{ ...errStyle, marginTop: 0, marginBottom: 4 }}>{formErrors.duration}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginBottom: 4, display: "block" }}>Horas</label>
            <input type="number" min="0" max="23"
              value={form.durationHH}
              onChange={e => fld("durationHH")(String(e.target.value).padStart(2,"0"))}
              style={{ ...inputStyle, textAlign: "center", fontWeight: 700, fontSize: 18, borderColor: formErrors.duration ? "#e05555" : T.bdr }} />
          </div>
          <span style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 700, color: T.tm, marginTop: 16 }}>:</span>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginBottom: 4, display: "block" }}>Minutos</label>
            <select value={form.durationMM} onChange={e => fld("durationMM")(e.target.value)}
              style={{ ...inputStyle, textAlign: "center", fontWeight: 700, fontSize: 18, borderColor: formErrors.duration ? "#e05555" : T.bdr }}>
              {MM_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 5 }}>
          Formato 24h — ej. 01:30 = 1 hora 30 min
        </p>

        {/* Precios por divisa */}
        <label style={{ ...labelStyle, marginTop: 18 }}>Tarifas *</label>
        {formErrors.prices && <p style={{ ...errStyle, marginBottom: 8 }}>{formErrors.prices}</p>}
        {activeCurrencies.map(cur => (
          <div key={cur} style={{
            border: `1.5px solid ${T.bdr}`, borderRadius: 12,
            marginBottom: 10, overflow: "hidden",
          }}>
            <div style={{
              padding: "8px 14px", background: T.pA,
              fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.p,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {ALL_CURRENCIES.find(c => c.code === cur)?.flag} {cur}
            </div>
            <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: form.modality === "ambas" ? "1fr 1fr" : "1fr", gap: 10 }}>
              {form.modality !== "virtual" && (
                <div>
                  <label style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, marginBottom: 4, display: "block" }}>🏢 Presencial</label>
                  <input type="number" min="0" placeholder="0.00"
                    value={form.prices[cur]?.presencial ?? ""}
                    onChange={e => setPriceField(cur, "presencial", e.target.value)}
                    style={{ ...inputStyle, fontWeight: 700 }} />
                </div>
              )}
              {form.modality !== "presencial" && (
                <div>
                  <label style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, marginBottom: 4, display: "block" }}>💻 Virtual</label>
                  <input type="number" min="0" placeholder="0.00"
                    value={form.prices[cur]?.virtual ?? ""}
                    onChange={e => setPriceField(cur, "virtual", e.target.value)}
                    style={{ ...inputStyle, fontWeight: 700 }} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={cancelForm}
            style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.tm, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={save}
            style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${T.p}40` }}>
            {editingId ? "Guardar cambios" : "Agregar servicio"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div>
      {showForm && <ServiceForm />}

      {/* ── Divisas aceptadas ────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.p, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
          Divisas que aceptas
        </div>
        <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, marginBottom: 14 }}>
          Los precios de cada servicio se ingresan en las divisas seleccionadas.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allCurrencies.map(({ code, flag }) => {
            const active = activeCurrencies.includes(code);
            return (
              <button key={code} onClick={() => toggleCurrency(code)} style={{
                padding: "8px 14px", borderRadius: 100,
                border: `1.5px solid ${active ? T.p : T.bdr}`,
                background: active ? T.p : "transparent",
                fontFamily: T.fB, fontSize: 13, fontWeight: active ? 700 : 400,
                color: active ? "#fff" : T.tm, cursor: "pointer", transition: "all .18s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{flag}</span>
                <span>{code}</span>
                {active && <span style={{ fontSize: 10, opacity: 0.85 }}>✓</span>}
              </button>
            );
          })}
        </div>
        <p style={{ fontFamily: T.fB, fontSize: 11, color: T.tl, marginTop: 10 }}>
          Mínimo una divisa requerida.
        </p>
      </Card>

      {/* ── Catálogo de servicios ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t }}>Catálogo de servicios</div>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, marginTop: 2 }}>
            Define tus servicios. Se usarán en Agenda, Finanzas y Sesiones.
          </div>
        </div>
        <button onClick={openNew} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 100, border: "none",
          background: T.p, color: "#fff",
          fontFamily: T.fB, fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 4px 14px ${T.p}40`, flexShrink: 0,
        }}>
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {regularServices.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "32px 20px",
          background: T.card, borderRadius: 14,
          border: `1.5px dashed ${T.bdr}`, marginBottom: 16,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💼</div>
          <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t, marginBottom: 6 }}>
            Sin servicios configurados
          </div>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, marginBottom: 16 }}>
            Agrega tus servicios y tarifas para usarlos en toda la app.
          </div>
          <button onClick={openNew} style={{
            padding: "10px 22px", borderRadius: 100, border: "none",
            background: T.p, color: "#fff",
            fontFamily: T.fB, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            <Plus size={14} style={{ marginRight: 6 }} />Agregar primer servicio
          </button>
        </div>
      ) : (
        regularServices.map(svc => <ServiceCard key={svc.id} svc={svc} />)
      )}

      {/* ── Paquetes de sesiones ──────────────────────────────────────────── */}
      <div style={{ height: 1, background: T.bdrL, margin: "24px 0 20px" }} />
      <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t, marginBottom: 4 }}>
        📦 Paquetes de sesiones
      </div>
      <p style={{ fontFamily: T.fB, fontSize: 12, color: T.tl, marginBottom: 16 }}>
        Precios preferenciales para múltiples sesiones. Se calculan automáticamente a partir del precio de la sesión individual.
      </p>

      {/* Filas de precios sugeridos */}
      {[
        { label: "Presencial 🏢", mod: "presencial", prices: pkgPrices, setPrices: setPkgPrices, show: true },
        { label: "Virtual 💻", mod: "virtual", prices: pkgPricesV, setPrices: setPkgPricesV, show: !!basePriceV },
      ].filter(r => r.show).map(row => (
        <div key={row.mod} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8 }}>
            {row.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${DISCOUNTS.length}, 1fr)`, gap: 8, marginBottom: 8 }}>
            {DISCOUNTS.map(d => (
              <div key={d.sessions} style={{ background: T.card, borderRadius: 10, border: `1.5px solid ${T.bdr}`, padding: "10px 8px" }}>
                <div style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>
                  {d.sessions} ses.
                </div>
                <input type="number" value={row.prices[d.sessions] || ""}
                  onChange={e => row.setPrices(p => ({ ...p, [d.sessions]: e.target.value }))}
                  style={{ width: "100%", padding: "7px 8px", border: `1.5px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.t, background: "var(--bg)", outline: "none", textAlign: "center", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <button onClick={() => savePkgRow(row.mod)}
            style={{ width: "100%", padding: "9px", borderRadius: 9, border: `1.5px solid ${T.p}`, background: T.pA, fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.p, cursor: "pointer" }}>
            Guardar paquetes {row.label}
          </button>
        </div>
      ))}

      {/* Lista de paquetes guardados */}
      {packageServices.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8 }}>
            Paquetes guardados
          </div>
          {packageServices.map(svc => (
            <div key={svc.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", background: T.card, borderRadius: 10,
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
                  {" · "}
                  {activeCurrencies[0] || "MXN"}
                </div>
              </div>
              <button onClick={() => delPkg(svc.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, padding: "4px 8px" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
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
