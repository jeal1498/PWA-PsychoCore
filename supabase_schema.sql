-- ─────────────────────────────────────────────────────────────────────────────
-- PsychoCore — Schema Supabase
-- Ejecuta este script en: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- Cada tabla guarda el array completo de registros de un psicólogo como JSONB.
-- Esto minimiza cambios en el código y hace la migración desde localStorage trivial.

-- ── Función para actualizar updated_at automáticamente ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Tablas ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pc_patients (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_appointments (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_sessions (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_payments (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_resources (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_risk_assessments (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_scale_results (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_treatment_plans (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_inter_sessions (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_medications (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '[]',
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_profile (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '{}',
  updated_at      timestamptz DEFAULT now()
);

-- ── Triggers updated_at ────────────────────────────────────────────────────

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON pc_patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON pc_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON pc_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON pc_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON pc_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_risk_updated_at
  BEFORE UPDATE ON pc_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_scales_updated_at
  BEFORE UPDATE ON pc_scale_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_treatment_updated_at
  BEFORE UPDATE ON pc_treatment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inter_updated_at
  BEFORE UPDATE ON pc_inter_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON pc_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON pc_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security (RLS) ───────────────────────────────────────────────
-- Cada psicólogo solo puede ver y modificar sus propios datos.

ALTER TABLE pc_patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_resources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_risk_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_scale_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_treatment_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_inter_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_medications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_profile           ENABLE ROW LEVEL SECURITY;

-- Policies: solo el dueño puede SELECT / INSERT / UPDATE / DELETE

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'pc_patients','pc_appointments','pc_sessions','pc_payments',
    'pc_resources','pc_risk_assessments','pc_scale_results',
    'pc_treatment_plans','pc_inter_sessions','pc_medications','pc_profile'
  ] LOOP
    EXECUTE format('
      CREATE POLICY "owner_all_%s" ON %s
      FOR ALL USING (psychologist_id = auth.uid())
      WITH CHECK (psychologist_id = auth.uid());
    ', tbl, tbl);
  END LOOP;
END $$;
