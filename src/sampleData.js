export const DEFAULT_PROFILE = {
  name:         "",
  specialty:    "",
  cedula:       "",
  phone:        "",
  email:        "",
  clinic:       "",
  initials:     "",
  // Horario de disponibilidad (Sección 2.1 del Flujo Clínico)
  // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  workingDays:  [1, 2, 3, 4, 5],
  workingStart: "09:00",
  workingEnd:   "19:00",
};
