# PsychoCore Beta — Zero-Deficit Production Roadmap (1 semana)

Fecha objetivo de despliegue: **semana actual**  
Entorno productivo: **Vercel Live**  
Principio rector: **cero deuda crítica en Seguridad + UX + UI para Beta** (sin trade-offs).

---

## 0) Definición “Zero-Deficit” para esta Beta

La Beta solo se considera lista si se cumplen simultáneamente estos 4 bloques:

1. **Seguridad**
   - Sin secretos hardcodeados en frontend.
   - Portal paciente con autenticación robusta (OTP o token de acceso temporal firmado + rate limit + expiración).
   - Logs sensibles removidos/anonimizados en producción.

2. **Arquitectura y calidad**
   - Pipeline reproducible (`npm ci`, `npm run lint`, `npm run build`) en CI.
   - Consultas del portal filtradas server-side (sin fetch masivo + filtrado cliente).

3. **UX / reducción de clics**
   - Flujo “**Cierre de sesión asistido**” implementado y usable en móvil/escritorio.
   - “**Paciente activo persistente**” para reducir navegación y prellenar módulos clínicos.

4. **UI profesional y accesibilidad**
   - Sistema visual consistente cross-módulo.
   - Cumplimiento WCAG 2.2 AA en foco, contraste, etiquetas ARIA y navegación teclado.

---

## 1) Ejecución paralela inmediata (3 tracks en paralelo)

## Track A — Hardening & Security (día 1–4)

### A1. Variables de entorno y secretos en Vercel (día 1)
**Objetivo:** eliminar exposición por fallback hardcodeado.

**Acciones exactas**
1. En Vercel Project → **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL` (Production/Preview/Development)
   - `VITE_SUPABASE_ANON_KEY` (Production/Preview/Development)
2. Rotar `anon key` si hubo exposición pública previa en commits.
3. Eliminar fallback hardcodeado en `src/lib/supabase.js` y fallar explícitamente si falta env.
4. Desplegar Preview y validar boot sin fallback.

**Definition of Done (DoD)**
- No existe URL/key embebida en bundle.
- Build falla si faltan variables.

---

### A2. Auth robusta para Patient Portal (día 1–3)
**Objetivo:** pasar de “solo teléfono” a identidad verificable.

**Patrón recomendado para 1 semana (rápido + seguro)**
- **Token temporal firmado** (JWT corto, 10 min) emitido por backend seguro (Edge Function/API).
- Enlace único por WhatsApp/SMS con nonce + expiración.
- Rate limiting (IP + teléfono) y bloqueo progresivo.
- Revocación por uso único o timeout.

**Flujo**
1. Psicólogo genera enlace desde sistema.
2. Backend firma token con claims mínimas (`patient_id`, `exp`, `nonce`).
3. Portal valida token en backend antes de habilitar lectura/escritura.
4. Cada operación crítica vuelve a validar scope.

**DoD**
- No hay acceso directo por teléfono sin token/OTP.
- Auditoría de acceso: timestamp, patient_id, origen IP, acción.

---

### A3. Datos del portal server-side only (día 2–4)
**Objetivo:** eliminar patrones de fetch masivo y filtrado cliente.

**Acciones**
1. Crear endpoints/RPC para:
   - `get_patient_portal_summary(token)`
   - `get_patient_appointments(token)`
   - `submit_task_response(token, payload)`
2. Minimizar payload por principio de mínimo privilegio.
3. Versionar contrato de respuesta y tests de autorización.

**DoD**
- Cero consultas tipo “traer 100 y filtrar en frontend”.
- Cobertura de tests de autorización en endpoints críticos.

---

## Track B — Core UX & Click Reduction (día 1–5)

### B1. “Cierre de sesión asistido” (día 1–4)
**Objetivo:** comprimir flujo clínico post-consulta sin perder funcionalidades.

**Diseño funcional (wizard de 4 pasos, no bloqueante):**
1. Nota clínica
2. Riesgo (condicional)
3. Tarea terapéutica
4. Cobro / estado de pago + próxima cita

**Reglas UX**
- Todos los pasos editables antes de confirmar.
- Guardado automático por paso + indicador de estado.
- Botón principal: **“Finalizar sesión y cerrar flujo”**.
- Acceso rápido “modo express” si el psicólogo ya completó datos mínimos.

**Métrica objetivo**
- Reducir clics del flujo completo de ~8–12 a ~4–6.

**DoD**
- Flujo disponible desktop/mobile.
- Sin pérdida funcional frente a módulos separados.

---

### B2. Contexto persistente de paciente activo (día 1–3)
**Objetivo:** navegación inteligente entre módulos.

**Acciones**
1. Crear estado global `activePatientContext` (id, nombre, último módulo, timestamp).
2. Propagar prefill automático en Sesiones, Riesgo, Escalas, Tareas y Finanzas.
3. Añadir quick-actions contextuales en header:
   - Nueva sesión
   - Evaluar riesgo
   - Asignar tarea
   - Registrar pago
4. Mantener opción de “limpiar contexto” para evitar errores de paciente equivocado.

**DoD**
- Desde cualquier módulo, acciones clínicas heredan paciente activo con 1 clic.

---

### B3. Búsqueda global con deep links (día 3–5)
**Objetivo:** eliminar clicks de navegación intermedia.

**Acciones**
- Cada resultado abre entidad exacta + estado de UI (tab/modal/scroll target).
- Atajos de comando (`Cmd/Ctrl + K`) con acciones clínicas frecuentes.

**DoD**
- 80% de búsquedas comunes resuelven en máximo 1 salto de navegación.

---

## Track C — Visual Standardization & Professional Polish (día 1–5)

### C1. Unificación del Design System (día 1–3)
**Objetivo:** interfaz homogénea y profesional para consulta clínica.

**Acciones**
1. Definir “UI Contract”:
   - spacing scale, tipografías, densidad de componentes,
   - estados de botón/input,
   - colores semánticos con respaldo textual/iconográfico.
2. Consolidar patrones duplicados (cards/headers/sections/avatars/badges).
3. Reducir estilos inline repetidos en componentes core.

**DoD**
- Módulos clave (Dashboard, Agenda, Sessions, Patients, Finance) visualmente consistentes.

---

### C2. Accesibilidad WCAG 2.2 AA (día 2–5)
**Objetivo:** uso profesional continuo sin fricción ni fatiga.

**Checklist mínimo obligatorio**
- Focus visible en todos los elementos interactivos.
- `aria-label`/`aria-expanded`/`aria-controls` según patrón.
- Contraste AA en texto primario/secundario y estados de alerta.
- Soporte teclado para navegación y modales.
- Tamaño táctil mínimo en mobile.

**DoD**
- Auditoría de accesibilidad sin bloqueadores críticos.

---

### C3. Limpieza de logs y tono profesional (día 1–2)
**Objetivo:** seguridad + percepción enterprise clínica.

**Acciones**
- Sustituir `console.log` por logger con niveles.
- Silenciar `debug` en producción.
- Revisar textos de interfaz para consistencia terminológica clínica.

**DoD**
- Build de producción sin logs sensibles.

---

## 2) Cronograma de despliegue “esta semana” (día a día)

### Día 1 (Lunes)
- Kickoff paralelo A/B/C.
- A1 completo (Vercel env + eliminación fallbacks).
- B2 inicia (active patient context).
- C1 inicia (UI contract + tokens).

### Día 2 (Martes)
- A2 implementación auth portal.
- A3 diseño endpoints server-side.
- B1 prototipo funcional del wizard de cierre.
- C3 limpieza logs + copy clínico.

### Día 3 (Miércoles)
- A2 hardening + rate limit + auditoría.
- A3 migración de consultas portal.
- B1 integración con módulos riesgo/tareas/pago.
- C2 accessibility pass #1.

### Día 4 (Jueves)
- Congelamiento funcional (feature freeze de Beta).
- B3 deep links + command actions.
- C1 consolidación visual en módulos críticos.
- QA clínico guiado por escenarios reales.

### Día 5 (Viernes)
- Fixes finales P0/P1.
- Pruebas E2E smoke + regresión.
- Go/No-Go checklist.
- Deploy Production en Vercel + monitoreo activo 24h.

---

## 3) Go-Live checklist obligatorio (sin excepciones)

## Seguridad
- [ ] No secrets hardcoded.
- [ ] Portal protegido por token/OTP robusto.
- [ ] Rate-limit + audit trail activos.

## Calidad técnica
- [ ] `npm ci` OK.
- [ ] `npm run lint` OK.
- [ ] `npm run build` OK.
- [ ] Preview parity validada con Production env.

## UX/click reduction
- [ ] Assisted Session Closure en producción.
- [ ] Active patient context estable y reversible.
- [ ] Deep links en búsqueda global.

## UI/A11y
- [ ] Consistencia visual en módulos críticos.
- [ ] Checklist WCAG AA aprobado.
- [ ] Navegación móvil validada en sesiones intensivas.

---

## 4) Métricas de éxito Beta (primeros 7 días post-release)

1. **Seguridad:** 0 incidentes de acceso no autorizado en portal.
2. **Eficiencia clínica:** ↓30–40% en clics del flujo post-sesión.
3. **Velocidad operativa:** ↓25% en tiempo medio de cierre de sesión.
4. **Calidad UX:** reducción de abandono en formularios críticos.
5. **Confiabilidad:** crash-free sessions > 99.5%.

---

## 5) Estructura de ejecución recomendada (equipo mínimo)

- **Líder técnico (1):** seguridad, arquitectura, merge strategy.
- **Frontend UX engineer (1–2):** wizard, contexto persistente, deep links.
- **UI/A11y specialist (1):** estandarización visual + accesibilidad.
- **QA clínico funcional (1):** pruebas con casos de psicólogos (alto volumen diario).

Cadencia diaria:
- Daily 15 min (bloqueos y dependencias entre tracks).
- Cutoff técnico 17:00 para QA del mismo día.
- Reporte nocturno con estado por P0/P1/P2.

---

## 6) Riesgos y mitigaciones (esta semana)

1. **Riesgo:** auth portal no lista a tiempo.
   - **Mitigación:** priorizar token temporal firmado (rápido) antes de OTP full.
2. **Riesgo:** regresiones por cambios cross-module.
   - **Mitigación:** feature flags + pruebas smoke por módulo.
3. **Riesgo:** inconsistencia visual parcial.
   - **Mitigación:** aplicar UI contract primero a módulos de uso diario (Dashboard/Agenda/Sessions/Patients/Finance).

---

## 7) Ruta exacta para desplegar esta misma semana (resumen ejecutivo)

1. **Hoy:** configurar y validar env vars en Vercel + quitar fallbacks + arrancar auth robusta del portal.
2. **Mañana:** cerrar implementación de token temporal y comenzar migración a endpoints server-side.
3. **Mitad de semana:** liberar Assisted Session Closure + active patient context + primer pase de accesibilidad.
4. **Jueves:** deep links y polish visual final en módulos críticos + freeze.
5. **Viernes:** QA final, checklist Go-Live completo, deploy productivo y monitoreo.

Si cualquiera de los checks P0 falla, **no se despliega**: el estándar Beta es Zero-Deficit.
