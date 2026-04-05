# Auditoría Técnica, UI/UX y Optimización de Flujos — PsychoCore

Fecha: 2026-04-05

## 1) General Code, Architecture, and Security Improvements

### Fortalezas actuales
- Cobertura funcional clínica amplia (pacientes, agenda, sesiones, escalas, riesgo, consentimiento, finanzas, reportes).
- Arquitectura PWA con carga diferida por módulos (`lazy`) y enfoque offline-first documentado.
- Separación inicial de estado global vía `AppStateContext` + hook de almacenamiento en Supabase.

### Hallazgos críticos (prioridad alta)
1. **Llaves/endpoint por defecto embebidos en código cliente**
   - Existe URL y `anon key` hardcodeados en `src/lib/supabase.js` como fallback si faltan variables de entorno.
   - Riesgo: exposición de configuración productiva, mayor superficie de abuso si RLS se configura incorrectamente.
   - Recomendación:
     - Eliminar fallback hardcodeado en frontend.
     - Forzar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como requeridas en build.
     - Validar en arranque y mostrar error bloqueante en dev si no existen.

2. **Portal de paciente con autenticación débil (solo teléfono)**
   - El portal está diseñado para acceso por teléfono sin cuenta, y varias consultas usan ese dato como llave de acceso.
   - Riesgo: enumeración de teléfono/suplantación, especialmente para datos sensibles clínicos.
   - Recomendación:
     - Añadir verificación OTP por SMS/WhatsApp o token firmado de un solo uso con expiración corta.
     - Límite de intentos y rate-limit por IP + huella de dispositivo.
     - Registro de auditoría por acceso al portal.

3. **Patrón de lectura masiva + filtrado en cliente en funciones del portal**
   - Algunas funciones obtienen hasta 100 registros de arreglos JSON y luego filtran en frontend.
   - Riesgo: performance, costo, y riesgo de exposición accidental de datos al cliente.
   - Recomendación:
     - Normalizar modelo relacional para pacientes/citas portal o usar RPC/edge functions que filtren del lado servidor.
     - Devolver solo columnas mínimas necesarias por vista.

4. **Observabilidad de datos sensibles en consola**
   - Hay múltiples `console.log` en auth/almacenamiento con datos de sesión/estado.
   - Riesgo: filtración de PII en equipos compartidos o soporte remoto.
   - Recomendación:
     - Implementar logger con niveles (`debug/info/warn/error`) y stripping de `debug` en producción.

### Hallazgos de mantenibilidad y calidad
1. **Módulos muy extensos y con múltiples responsabilidades**
   - `Patients.jsx`, `Sessions.jsx`, `Dashboard.jsx` concentran UI + lógica + reglas clínicas + renderizado pesado.
   - Recomendación:
     - Dividir por feature slices: `components/`, `hooks/`, `services/`, `validators/` por dominio.
     - Introducir esquema de validación (Zod/Yup) para formularios clínicos críticos.

2. **Duplicación de patrones UI y microcomponentes entre módulos**
   - Se repiten estructuras (`FadeUp`, `Avatar`, `SeeAll`, etc.) y estilos inline equivalentes.
   - Recomendación:
     - Consolidar primitives en `components/ui` (incluyendo variantes de tarjetas, métricas, listas y headers).

3. **Tooling inconsistente y build/lint no reproducibles en estado actual**
   - Lint falla por dependencias faltantes (`@eslint/js`), build falla por ausencia de `vite`, y `npm ci` falla por lock desincronizado.
   - Recomendación:
     - Normalizar lockfile (`npm install` + commit lock actualizado).
     - Pipeline CI mínimo: `npm ci`, `npm run lint`, `npm run build`.

4. **Alta dependencia de estilos inline y eventos de hover imperativos**
   - Recomendación:
     - Migrar progresivamente a sistema de estilos escalable (CSS modules, tokens + utility classes, o CSS-in-JS consistente).
     - Garantizar estilos de foco visibles para teclado.

### Plan técnico sugerido (90 días)
- **Semana 1-2:** correcciones de seguridad (auth portal, removal fallbacks sensibles, logs).
- **Semana 3-5:** normalización de datos del portal + endpoints server-side filtrados.
- **Semana 6-8:** refactor de módulos grandes en subcomponentes/hooks de dominio.
- **Semana 9-12:** estandarización UI system + accesibilidad + CI quality gates.

---

## 2) Visual & UI Evaluation (Aesthetics, accessibility, and professionalism)

### Evaluación visual general
- **Percepción profesional:** buena base visual (paleta sobria, branding clínico, iconografía consistente).
- **Jerarquía de información:** fuerte en dashboard y tarjetas KPI.
- **Consistencia:** moderada; existen variaciones de espaciado, tipografías y patrones de interacción por módulo.

### Hallazgos UI prioritarios
1. **Consistencia visual inter-módulo mejorable**
   - Hay diferencias en densidad de controles, botones y estados visuales entre módulos complejos.
   - Mejora: crear “UI playbook clínico” con reglas de espaciado, tipografías, contrastes y tamaños de toque.

2. **Accesibilidad de controles**
   - Existen botones icon-only o interacciones con hover donde falta reforzar `aria-label`/focus claro en todos los casos.
   - Mejora:
     - Auditoría WCAG 2.2 AA (contraste, foco visible, navegación teclado, tamaños táctiles).
     - Añadir `aria-label`, `aria-expanded`, `aria-controls` donde aplique.

3. **Uso intensivo de color semántico sin redundancia textual en algunos casos**
   - Mejora: acompañar color con texto/ícono para riesgo, estado y urgencia (evitar dependencia solo cromática).

### Recomendaciones de diseño para psicólogos
- Elevar legibilidad de textos secundarios en fondos oscuros/atenuados.
- Reducir fatiga cognitiva con:
  - agrupación por tareas del día,
  - bloques “Pendiente hoy”,
  - y ocultar detalle avanzado bajo acordeones contextuales.
- Mantener tono sobrio clínico: minimizar animaciones no funcionales.

---

## 3) UX & Workflow Optimization (Specific proposals for click-reduction and smart navigation)

Objetivo: **reducir clics sin perder funcionalidad**.

### Flujos críticos y propuesta de optimización

#### A) Agenda → Sesión → Riesgo → Tarea → Pago
- **Situación actual:** el usuario navega entre módulos y modales para completar el flujo post-consulta.
- **Propuesta:** “**Cierre de sesión asistido**” en una sola vista modal (wizard de 4 pasos opcionales):
  1) Nota clínica
  2) Riesgo (si aplica)
  3) Tarea terapéutica
  4) Cobro/estado de pago
- **Impacto:** de ~8–12 clics/context switches a ~4–6, con misma cobertura funcional.

#### B) Búsqueda global → acción contextual
- **Situación actual:** algunos resultados abren módulo general, no el registro exacto.
- **Propuesta:** deep-link directo a entidad + estado de UI (ej. abrir paciente X en pestaña “sesiones”, o pago Y en modal).
- **Impacto:** elimina 2–4 clics por consulta frecuente.

#### C) Paciente nuevo y primera cita
- **Propuesta:** CTA único “**Nuevo paciente + agendar primera sesión**” (flujo encadenado).
- **Impacto:** reduce ida y vuelta entre Pacientes/Agenda; evita pérdida de contexto.

#### D) Dashboard operativo por momento clínico
- **Propuesta:** barra superior con acciones “Siguiente cita”, “Registrar sesión”, “Cobrar”, “Enviar tarea” que heredan paciente actual.
- **Impacto:** menos navegación lateral; mayor velocidad en jornada alta.

#### E) Atajos de teclado clínicos expandibles
- Ya hay atajos globales; ampliar con palette de comandos (`Cmd/Ctrl+K`) para:
  - Nuevo paciente,
  - Nueva sesión del paciente seleccionado,
  - Cobro rápido,
  - Riesgo rápido.

### Diseño de “click-reduction” sin pérdida funcional
1. **Contexto persistente de paciente activo**
   - Si el psicólogo abre un paciente, los módulos siguientes (sesión, escalas, riesgo, tareas, finanzas) deberían prellenar ese contexto.
2. **Acciones compuestas**
   - Botones de alto valor: “Finalizar sesión y…” (con menú: cobrar / asignar tarea / agendar próxima).
3. **Navegación inteligente por estado**
   - Mostrar siguientes pasos sugeridos según datos faltantes (p.ej., consentimiento pendiente, escala vencida, pago pendiente).
4. **Guardar automático con feedback no intrusivo**
   - Mantener autosave, pero con historial de cambios por campo en notas clínicas.

### KPI sugeridos para validar mejora UX
- Tiempo medio de “cita completada” (agenda → sesión cerrada).
- Clics promedio por flujo clínico principal.
- % de sesiones cerradas con registro completo (nota + riesgo + tarea + pago).
- Error rate por abandono de formulario.

---

## 4) Domain-Specific Usability (How well it serves a professional psychologist)

### Alineación con práctica profesional
**Muy buena alineación funcional** en:
- Expediente clínico y seguimiento longitudinal.
- Evaluación de riesgo y documentación clínica.
- Escalas estandarizadas y planes de tratamiento.
- Integración operativa (agenda, pagos, reportes).

### Brechas específicas del dominio clínico
1. **Seguridad y trazabilidad clínica (medico-legal)**
   - Falta reforzar trazabilidad/auditoría de accesos y cambios críticos.
2. **Portal de paciente con robustez de identidad**
   - Requiere validación fuerte de identidad para datos sensibles.
3. **Protocolos por tipo de consulta**
   - Oportunidad para plantillas por población (adulto, adolescente, pareja, crisis).
4. **Panel de continuidad terapéutica**
   - Un “Clinical Timeline” unificado (sesiones + escalas + riesgo + tareas + adherencia financiera) ayudaría a decisiones clínicas en menos tiempo.

### Recomendaciones específicas para psicólogo profesional
- **Modo consulta intensiva (1 clic):** vista compacta para pasar paciente-a-paciente.
- **Checklist de sesión configurable por enfoque terapéutico** (CBT, ACT, sistémico, etc.).
- **Alertas clínicas inteligentes**:
  - aumento brusco en escala,
  - ausencia prolongada,
  - riesgo sin actualización reciente.
- **Documentación forense-ready**: bitácora de cambios, fecha/hora/usuario y exportación trazable.

---

## Backlog priorizado (acción inmediata)

### Prioridad P0 (0–2 semanas)
- Eliminar claves/URLs sensibles hardcodeadas y endurecer variables de entorno.
- Implementar autenticación fuerte en portal (OTP o token temporal firmado).
- Quitar logs sensibles en producción.
- Reparar lockfile y cadena de calidad (lint/build).

### Prioridad P1 (2–6 semanas)
- Reestructurar consultas portal para evitar fetch masivo+filtro cliente.
- Implementar deep-links de búsqueda global a entidad exacta.
- Crear flujo unificado “cierre de sesión asistido”.

### Prioridad P2 (6–12 semanas)
- Refactor de módulos grandes y estandarización UI.
- Auditoría completa de accesibilidad WCAG 2.2 AA.
- Métricas de productividad clínica y mejora continua con telemetría.

---

## Conclusión ejecutiva
PsychoCore ya tiene una base funcional notable para consulta psicológica profesional. El mayor potencial de mejora está en tres frentes: **seguridad clínica**, **mantenibilidad técnica**, y **optimización de flujos para reducir clics sin sacrificar herramientas**. Si se ejecutan las acciones P0/P1, el producto puede mejorar de forma tangible la velocidad operativa del psicólogo y elevar su confiabilidad para escenarios clínicos de alta sensibilidad.
