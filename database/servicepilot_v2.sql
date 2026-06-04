-- ============================================================
--  ServicePilot — PostgreSQL Schema v2 (Improved)
--  Changes from v1:
--    + created_at / updated_at on ALL tables
--    + is_active on all master tables
--    + Users.employee_id FK
--    + Jobs: priority, scheduled_end_at, created_by, address, notes
--    + EmployeeShifts: custom_start_time, custom_end_time
--    + AttendanceLogs: status enum
--    + AppSettings: setting_group
--    + Stronger unique constraints
--    + Critical indexes
--    + updated_at auto-trigger function
--  Run: psql -U postgres -d your_db -f servicepilot_v2.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  CLEAN SLATE (children before parents)
-- ============================================================
DROP TABLE IF EXISTS app_settings          CASCADE;
DROP TABLE IF EXISTS notifications         CASCADE;
DROP TABLE IF EXISTS job_status_history    CASCADE;
DROP TABLE IF EXISTS job_photos            CASCADE;
DROP TABLE IF EXISTS jobs                  CASCADE;
DROP TABLE IF EXISTS overtime_requests     CASCADE;
DROP TABLE IF EXISTS leave_requests        CASCADE;
DROP TABLE IF EXISTS employee_shifts       CASCADE;
DROP TABLE IF EXISTS gps_logs              CASCADE;
DROP TABLE IF EXISTS attendance_logs       CASCADE;
DROP TABLE IF EXISTS employees             CASCADE;
DROP TABLE IF EXISTS job_statuses          CASCADE;
DROP TABLE IF EXISTS job_types             CASCADE;
DROP TABLE IF EXISTS leave_types           CASCADE;
DROP TABLE IF EXISTS shift_types           CASCADE;
DROP TABLE IF EXISTS departments           CASCADE;
DROP TABLE IF EXISTS positions             CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;
DROP TABLE IF EXISTS roles                 CASCADE;
DROP TABLE IF EXISTS branches              CASCADE;
DROP TABLE IF EXISTS companies             CASCADE;

-- ============================================================
--  ENUMS
-- ============================================================
DROP TYPE IF EXISTS attendance_status_enum  CASCADE;
DROP TYPE IF EXISTS shift_status_enum       CASCADE;
DROP TYPE IF EXISTS leave_status_enum       CASCADE;
DROP TYPE IF EXISTS overtime_status_enum    CASCADE;
DROP TYPE IF EXISTS photo_type_enum         CASCADE;
DROP TYPE IF EXISTS job_priority_enum       CASCADE;

CREATE TYPE attendance_status_enum  AS ENUM ('present','late','half_day','absent');
CREATE TYPE shift_status_enum       AS ENUM ('scheduled','active','completed','cancelled');
CREATE TYPE leave_status_enum       AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE overtime_status_enum    AS ENUM ('pending','approved','rejected');
CREATE TYPE photo_type_enum         AS ENUM ('before','after','other');
CREATE TYPE job_priority_enum       AS ENUM ('low','normal','high','urgent');

-- ============================================================
--  AUTO updated_at TRIGGER
--  Apply to every table that needs it.
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Helper macro: call after each CREATE TABLE
-- CREATE TRIGGER trg_<table>_updated_at
--   BEFORE UPDATE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- (repeated inline below for each table)

-- ============================================================
--  MODULE 1 — CORE
-- ============================================================

CREATE TABLE companies (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(200) NOT NULL,
    email        VARCHAR(200),
    phone        VARCHAR(50),
    address      TEXT,
    timezone     VARCHAR(100) NOT NULL DEFAULT 'Asia/Dubai',
    logo_url     TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE branches (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    address      TEXT,
    latitude     NUMERIC(10,7),
    longitude    NUMERIC(10,7),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,   -- v2: added
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_branches_company ON branches(company_id);

-- ─────────────────────────────────────────────────────────────

CREATE TABLE roles (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL UNIQUE,
    description  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  MODULE 2 — MASTERS
-- ============================================================

CREATE TABLE positions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_positions_updated_at
    BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE departments (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE shift_types (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(200) NOT NULL,
    start_time   TIME         NOT NULL,
    end_time     TIME         NOT NULL,
    color_code   VARCHAR(10)  DEFAULT '#085041',
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,   -- v2: added
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_shift_types_updated_at
    BEFORE UPDATE ON shift_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE leave_types (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,
    max_days_per_year   INT          NOT NULL DEFAULT 30,
    is_paid             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,   -- v2: added
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);
CREATE TRIGGER trg_leave_types_updated_at
    BEFORE UPDATE ON leave_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE job_types (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name                     VARCHAR(200) NOT NULL,
    estimated_duration_mins  INT          DEFAULT 60,
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,  -- v2: added
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ
);
CREATE TRIGGER trg_job_types_updated_at
    BEFORE UPDATE ON job_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE job_statuses (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    display_order INT          NOT NULL DEFAULT 0,
    color_code    VARCHAR(10)  DEFAULT '#888780',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ
);
CREATE TRIGGER trg_job_statuses_updated_at
    BEFORE UPDATE ON job_statuses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  MODULE 3 — EMPLOYEES
--  Users created AFTER employees so employee_id FK works
-- ============================================================

CREATE TABLE employees (
    id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id                 UUID         REFERENCES branches(id),
    position_id               UUID         REFERENCES positions(id),
    department_id             UUID         REFERENCES departments(id),
    employee_code             VARCHAR(50),
    full_name                 VARCHAR(200) NOT NULL,
    phone_number              VARCHAR(50),
    email                     VARCHAR(200),
    visa_expiry_date          DATE,
    passport_expiry_date      DATE,
    emirates_id_expiry_date   DATE,
    joining_date              DATE,
    is_active                 BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ,
    UNIQUE (company_id, employee_code)    -- v2: explicit unique constraint
);
CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_employees_company        ON employees(company_id);
CREATE INDEX idx_employees_branch         ON employees(branch_id);
CREATE INDEX idx_employees_visa_expiry    ON employees(visa_expiry_date) WHERE is_active = TRUE;
CREATE INDEX idx_employees_passport_expiry ON employees(passport_expiry_date) WHERE is_active = TRUE;
CREATE INDEX idx_employees_eid_expiry     ON employees(emirates_id_expiry_date) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────
--  USERS — after employees so employee_id FK can reference it
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id        UUID         NOT NULL REFERENCES roles(id),
    branch_id      UUID         REFERENCES branches(id),
    employee_id    UUID         REFERENCES employees(id),   -- v2: ADDED — links login to field staff
    full_name      VARCHAR(200) NOT NULL,
    email          VARCHAR(200) NOT NULL,
    phone_number   VARCHAR(50),
    password_hash  TEXT         NOT NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ,
    UNIQUE (company_id, email)            -- v2: explicit unique constraint
);
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_users_company    ON users(company_id);
CREATE INDEX idx_users_employee   ON users(employee_id);

-- ============================================================
--  MODULE 4 — ATTENDANCE
-- ============================================================

CREATE TABLE attendance_logs (
    id               UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID                  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id      UUID                  NOT NULL REFERENCES employees(id),
    check_in_time    TIMESTAMPTZ,
    check_out_time   TIMESTAMPTZ,
    check_in_lat     NUMERIC(10,7),
    check_in_lng     NUMERIC(10,7),
    check_out_lat    NUMERIC(10,7),
    check_out_lng    NUMERIC(10,7),
    status           attendance_status_enum NOT NULL DEFAULT 'present',  -- v2: ADDED
    is_offline_sync  BOOLEAN               NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);
CREATE TRIGGER trg_attendance_logs_updated_at
    BEFORE UPDATE ON attendance_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_attendance_employee_date ON attendance_logs(employee_id, check_in_time DESC);
CREATE INDEX idx_attendance_company_date  ON attendance_logs(company_id, check_in_time DESC);

-- ============================================================
--  MODULE 5 — GPS (simplified for MVP)
-- ============================================================

CREATE TABLE gps_logs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id  UUID         NOT NULL REFERENCES employees(id),
    latitude     NUMERIC(10,7) NOT NULL,
    longitude    NUMERIC(10,7) NOT NULL,
    accuracy     NUMERIC(8,2),
    recorded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    -- no updated_at: GPS logs are immutable
);
CREATE INDEX idx_gps_employee_time ON gps_logs(employee_id, recorded_at DESC);
CREATE INDEX idx_gps_company_time  ON gps_logs(company_id,  recorded_at DESC);

-- ============================================================
--  MODULE 6 — SCHEDULING
-- ============================================================

CREATE TABLE employee_shifts (
    id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID              NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id       UUID              NOT NULL REFERENCES employees(id),
    shift_type_id     UUID              NOT NULL REFERENCES shift_types(id),
    shift_date        DATE              NOT NULL,
    custom_start_time TIME,             -- v2: ADDED — manager override
    custom_end_time   TIME,             -- v2: ADDED — manager override
    status            shift_status_enum NOT NULL DEFAULT 'scheduled',
    created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);
CREATE TRIGGER trg_employee_shifts_updated_at
    BEFORE UPDATE ON employee_shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_shifts_employee_date ON employee_shifts(employee_id, shift_date DESC);
CREATE INDEX idx_shifts_company_date  ON employee_shifts(company_id,  shift_date DESC);

-- ============================================================
--  MODULE 7 — LEAVE
-- ============================================================

CREATE TABLE leave_requests (
    id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID              NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id     UUID              NOT NULL REFERENCES employees(id),
    leave_type_id   UUID              NOT NULL REFERENCES leave_types(id),
    start_date      DATE              NOT NULL,
    end_date        DATE              NOT NULL,
    reason          TEXT,
    status          leave_status_enum NOT NULL DEFAULT 'pending',
    approved_by     UUID              REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE TRIGGER trg_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_leave_employee ON leave_requests(employee_id, status);

-- ============================================================
--  MODULE 8 — OVERTIME
-- ============================================================

CREATE TABLE overtime_requests (
    id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID                 NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id      UUID                 NOT NULL REFERENCES employees(id),
    request_date     DATE                 NOT NULL,
    hours_requested  NUMERIC(4,2)         NOT NULL,
    reason           TEXT,
    status           overtime_status_enum NOT NULL DEFAULT 'pending',
    approved_by      UUID                 REFERENCES users(id),
    approved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);
CREATE TRIGGER trg_overtime_requests_updated_at
    BEFORE UPDATE ON overtime_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_overtime_employee ON overtime_requests(employee_id, status);

-- ============================================================
--  MODULE 9 — JOBS
-- ============================================================

CREATE TABLE jobs (
    id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID              NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_number           VARCHAR(50),
    customer_name        VARCHAR(200)      NOT NULL,
    customer_phone       VARCHAR(50),
    address              TEXT,             -- v2: kept (was missing in original)
    latitude             NUMERIC(10,7),
    longitude            NUMERIC(10,7),
    job_type_id          UUID              REFERENCES job_types(id),
    job_status_id        UUID              REFERENCES job_statuses(id),
    assigned_employee_id UUID              REFERENCES employees(id),
    priority             job_priority_enum NOT NULL DEFAULT 'normal',  -- v2: ADDED
    scheduled_at         TIMESTAMPTZ,
    scheduled_end_at     TIMESTAMPTZ,      -- v2: ADDED
    started_at           TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    notes                TEXT,
    created_by           UUID              REFERENCES users(id),        -- v2: ADDED
    created_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ,
    UNIQUE (company_id, job_number)        -- v2: explicit unique constraint
);
CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_jobs_company_status    ON jobs(company_id, job_status_id);
CREATE INDEX idx_jobs_company_scheduled ON jobs(company_id, scheduled_at);
CREATE INDEX idx_jobs_assigned_employee ON jobs(assigned_employee_id);
CREATE INDEX idx_jobs_priority          ON jobs(company_id, priority) WHERE completed_at IS NULL;

-- ─────────────────────────────────────────────────────────────

CREATE TABLE job_photos (
    id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id       UUID            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    photo_url    TEXT            NOT NULL,
    photo_type   photo_type_enum NOT NULL DEFAULT 'other',
    uploaded_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_photos_job ON job_photos(job_id);

-- ─────────────────────────────────────────────────────────────

CREATE TABLE job_status_history (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    old_status_id  UUID        REFERENCES job_statuses(id),
    new_status_id  UUID        REFERENCES job_statuses(id),
    changed_by     UUID        REFERENCES users(id),
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_status_history_job ON job_status_history(job_id, changed_at DESC);

-- ============================================================
--  MODULE 10 — NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id      UUID         REFERENCES users(id),
    title        VARCHAR(300) NOT NULL,
    message      TEXT,
    type         VARCHAR(100),
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)
    WHERE is_read = FALSE;

-- ============================================================
--  MODULE 11 — APP SETTINGS
-- ============================================================

CREATE TABLE app_settings (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    setting_group   VARCHAR(100) NOT NULL DEFAULT 'General',   -- v2: ADDED
    setting_key     VARCHAR(200) NOT NULL,
    setting_value   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    UNIQUE (company_id, setting_key)
);
CREATE TRIGGER trg_app_settings_updated_at
    BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_employees_expiry_alerts AS
SELECT
    e.id,
    e.company_id,
    e.full_name,
    e.employee_code,
    e.phone_number,
    e.visa_expiry_date,
    e.passport_expiry_date,
    e.emirates_id_expiry_date,
    (e.visa_expiry_date        - CURRENT_DATE) AS visa_days_left,
    (e.passport_expiry_date    - CURRENT_DATE) AS passport_days_left,
    (e.emirates_id_expiry_date - CURRENT_DATE) AS eid_days_left,
    LEAST(e.visa_expiry_date, e.passport_expiry_date, e.emirates_id_expiry_date) AS earliest_expiry
FROM employees e
WHERE e.is_active = TRUE
  AND (
      e.visa_expiry_date        <= CURRENT_DATE + INTERVAL '60 days'
   OR e.passport_expiry_date    <= CURRENT_DATE + INTERVAL '60 days'
   OR e.emirates_id_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
  )
ORDER BY earliest_expiry;

-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_today_jobs AS
SELECT
    j.id,
    j.company_id,
    j.job_number,
    j.customer_name,
    j.customer_phone,
    j.address,
    j.latitude,
    j.longitude,
    j.priority,
    jt.name         AS job_type,
    js.name         AS job_status,
    js.color_code   AS status_color,
    e.full_name     AS technician_name,
    e.phone_number  AS technician_phone,
    j.scheduled_at,
    j.scheduled_end_at,
    j.started_at,
    j.completed_at,
    j.notes
FROM jobs j
LEFT JOIN job_types    jt ON jt.id = j.job_type_id
LEFT JOIN job_statuses js ON js.id = j.job_status_id
LEFT JOIN employees    e  ON e.id  = j.assigned_employee_id
WHERE DATE(j.scheduled_at AT TIME ZONE 'Asia/Dubai') = CURRENT_DATE
ORDER BY j.priority DESC, j.scheduled_at;

-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_technician_live_location AS
SELECT DISTINCT ON (g.employee_id)
    g.employee_id,
    g.company_id,
    e.full_name,
    e.phone_number,
    g.latitude,
    g.longitude,
    g.accuracy,
    g.recorded_at
FROM gps_logs g
JOIN employees e ON e.id = g.employee_id
WHERE g.recorded_at >= NOW() - INTERVAL '15 minutes'
ORDER BY g.employee_id, g.recorded_at DESC;

-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT
    a.company_id,
    a.employee_id,
    e.full_name,
    e.employee_code,
    DATE(a.check_in_time AT TIME ZONE 'Asia/Dubai') AS work_date,
    a.status,
    a.check_in_time,
    a.check_out_time,
    EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600 AS hours_worked,
    a.check_in_lat,
    a.check_in_lng
FROM attendance_logs a
JOIN employees e ON e.id = a.employee_id
ORDER BY work_date DESC, e.full_name;

-- ============================================================
--  SEED DATA
-- ============================================================

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
    ('11111111-0000-0000-0000-000000000001', 'Admin',      'Full access to all company data'),
    ('11111111-0000-0000-0000-000000000002', 'Dispatcher', 'Creates and assigns jobs'),
    ('11111111-0000-0000-0000-000000000003', 'Supervisor', 'Monitors technicians, approves requests'),
    ('11111111-0000-0000-0000-000000000004', 'Technician', 'Mobile app — executes jobs in field');

-- ── Company ───────────────────────────────────────────────────
INSERT INTO companies (id, name, email, phone, address, timezone) VALUES
    ('22222222-0000-0000-0000-000000000001',
     'AlBarsha Technical Services LLC',
     'admin@albarsha-tech.ae',
     '+971-4-555-0100',
     'Unit 14, Al Quoz Industrial Area 3, Dubai, UAE',
     'Asia/Dubai');

-- ── Branches ──────────────────────────────────────────────────
INSERT INTO branches (id, company_id, name, address, latitude, longitude) VALUES
    ('33333333-0000-0000-0000-000000000001',
     '22222222-0000-0000-0000-000000000001',
     'Al Quoz Main Workshop',
     'Unit 14, Al Quoz Industrial Area 3, Dubai',
     25.1541, 55.2276),
    ('33333333-0000-0000-0000-000000000002',
     '22222222-0000-0000-0000-000000000001',
     'Deira Satellite Office',
     'Al Rigga Road, Deira, Dubai',
     25.2697, 55.3095);

-- ── Masters: Positions ────────────────────────────────────────
INSERT INTO positions (id, company_id, name) VALUES
    ('55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'HVAC Technician'),
    ('55555555-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Electrician'),
    ('55555555-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Plumber'),
    ('55555555-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Painter'),
    ('55555555-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Handyman'),
    ('55555555-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 'Supervisor');

-- ── Masters: Departments ──────────────────────────────────────
INSERT INTO departments (id, company_id, name) VALUES
    ('66666666-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'HVAC'),
    ('66666666-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Electrical'),
    ('66666666-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Plumbing'),
    ('66666666-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Painting'),
    ('66666666-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'General Maintenance');

-- ── Masters: Shift types ──────────────────────────────────────
INSERT INTO shift_types (id, company_id, name, start_time, end_time, color_code) VALUES
    ('77777777-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Morning Shift',   '07:00', '16:00', '#085041'),
    ('77777777-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Afternoon Shift', '13:00', '22:00', '#0C447C'),
    ('77777777-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Night Shift',     '22:00', '07:00', '#444441'),
    ('77777777-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Split Shift',     '08:00', '20:00', '#854F0B');

-- ── Masters: Leave types ──────────────────────────────────────
INSERT INTO leave_types (id, company_id, name, max_days_per_year, is_paid) VALUES
    ('88888888-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Annual Leave',    30, TRUE),
    ('88888888-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Sick Leave',      15, TRUE),
    ('88888888-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Emergency Leave',  3, TRUE),
    ('88888888-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Unpaid Leave',    30, FALSE),
    ('88888888-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Maternity Leave', 60, TRUE);

-- ── Masters: Job types ────────────────────────────────────────
INSERT INTO job_types (id, company_id, name, estimated_duration_mins) VALUES
    ('99999999-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'AC Maintenance',        90),
    ('99999999-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'AC Repair',            120),
    ('99999999-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'AC Installation',      240),
    ('99999999-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'Plumbing Repair',       60),
    ('99999999-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Electrical Fault Fix',  90),
    ('99999999-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 'Painting — Room',      300),
    ('99999999-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000001', 'Handyman Service',      60),
    ('99999999-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000001', 'Deep Cleaning',        180),
    ('99999999-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000001', 'MEP Inspection',       120);

-- ── Masters: Job statuses ─────────────────────────────────────
INSERT INTO job_statuses (id, company_id, name, display_order, color_code) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Pending',    1, '#888780'),
    ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Assigned',   2, '#0C447C'),
    ('aaaaaaaa-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'In Transit', 3, '#854F0B'),
    ('aaaaaaaa-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 'On Site',    4, '#1D9E75'),
    ('aaaaaaaa-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 'Completed',  5, '#085041'),
    ('aaaaaaaa-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 'Cancelled',  6, '#E24B4A'),
    ('aaaaaaaa-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000001', 'On Hold',    7, '#EF9F27');

-- ── Employees (5 technicians) ─────────────────────────────────
INSERT INTO employees
    (id, company_id, branch_id, position_id, department_id,
     employee_code, full_name, phone_number, email,
     visa_expiry_date, passport_expiry_date, emirates_id_expiry_date, joining_date)
VALUES
    ('bbbbbbbb-0000-0000-0000-000000000001',
     '22222222-0000-0000-0000-000000000001',
     '33333333-0000-0000-0000-000000000001',
     '55555555-0000-0000-0000-000000000001',
     '66666666-0000-0000-0000-000000000001',
     'EMP-001', 'Ahmed Khalid Al Rashidi', '+971-55-100-1001', 'ahmed@albarsha-tech.ae',
     CURRENT_DATE + 15,    -- visa expiring soon (15 days) — will appear in alert view
     CURRENT_DATE + 280,
     CURRENT_DATE + 400,
     '2022-03-15'),

    ('bbbbbbbb-0000-0000-0000-000000000002',
     '22222222-0000-0000-0000-000000000001',
     '33333333-0000-0000-0000-000000000001',
     '55555555-0000-0000-0000-000000000003',
     '66666666-0000-0000-0000-000000000003',
     'EMP-002', 'Ravi Sharma', '+971-55-100-1002', 'ravi@albarsha-tech.ae',
     CURRENT_DATE + 185,
     CURRENT_DATE + 400,
     CURRENT_DATE + 25,    -- EID expiring soon (25 days)
     '2023-01-10'),

    ('bbbbbbbb-0000-0000-0000-000000000003',
     '22222222-0000-0000-0000-000000000001',
     '33333333-0000-0000-0000-000000000002',
     '55555555-0000-0000-0000-000000000002',
     '66666666-0000-0000-0000-000000000002',
     'EMP-003', 'Omar Farooq', '+971-55-100-1003', 'omar@albarsha-tech.ae',
     CURRENT_DATE + 320,
     CURRENT_DATE + 550,
     CURRENT_DATE + 310,
     '2021-11-01'),

    ('bbbbbbbb-0000-0000-0000-000000000004',
     '22222222-0000-0000-0000-000000000001',
     '33333333-0000-0000-0000-000000000001',
     '55555555-0000-0000-0000-000000000004',
     '66666666-0000-0000-0000-000000000004',
     'EMP-004', 'Luis Morales', '+971-55-100-1004', 'luis@albarsha-tech.ae',
     CURRENT_DATE + 210,
     CURRENT_DATE + 490,
     CURRENT_DATE + 380,
     '2023-06-20'),

    ('bbbbbbbb-0000-0000-0000-000000000005',
     '22222222-0000-0000-0000-000000000001',
     '33333333-0000-0000-0000-000000000002',
     '55555555-0000-0000-0000-000000000005',
     '66666666-0000-0000-0000-000000000005',
     'EMP-005', 'Suresh Nair', '+971-55-100-1005', 'suresh@albarsha-tech.ae',
     CURRENT_DATE + 95,
     CURRENT_DATE + 730,
     CURRENT_DATE + 600,
     '2024-02-01');

-- ── Users (admin + dispatcher, linked to employees where applicable) ──
INSERT INTO users
    (id, company_id, role_id, branch_id, employee_id,
     full_name, email, phone_number, password_hash)
VALUES
    ('44444444-0000-0000-0000-000000000001',
     '22222222-0000-0000-0000-000000000001',
     '11111111-0000-0000-0000-000000000001',
     '33333333-0000-0000-0000-000000000001',
     NULL,   -- admin has no employee record
     'Sara Al Mansouri', 'sara@albarsha-tech.ae', '+971-50-111-2233',
     crypt('Admin@1234', gen_salt('bf'))),

    ('44444444-0000-0000-0000-000000000002',
     '22222222-0000-0000-0000-000000000001',
     '11111111-0000-0000-0000-000000000002',
     '33333333-0000-0000-0000-000000000001',
     NULL,   -- dispatcher has no field employee record
     'Khalid Hassan', 'khalid@albarsha-tech.ae', '+971-50-222-3344',
     crypt('Dispatch@1234', gen_salt('bf'))),

    -- Technician users — linked to employee records (v2: employee_id set)
    ('44444444-0000-0000-0000-000000000003',
     '22222222-0000-0000-0000-000000000001',
     '11111111-0000-0000-0000-000000000004',
     '33333333-0000-0000-0000-000000000001',
     'bbbbbbbb-0000-0000-0000-000000000001',
     'Ahmed Khalid Al Rashidi', 'ahmed@albarsha-tech.ae', '+971-55-100-1001',
     crypt('Ahmed@1234', gen_salt('bf'))),

    ('44444444-0000-0000-0000-000000000004',
     '22222222-0000-0000-0000-000000000001',
     '11111111-0000-0000-0000-000000000004',
     '33333333-0000-0000-0000-000000000001',
     'bbbbbbbb-0000-0000-0000-000000000002',
     'Ravi Sharma', 'ravi@albarsha-tech.ae', '+971-55-100-1002',
     crypt('Ravi@1234', gen_salt('bf'))),

    ('44444444-0000-0000-0000-000000000005',
     '22222222-0000-0000-0000-000000000001',
     '11111111-0000-0000-0000-000000000004',
     '33333333-0000-0000-0000-000000000002',
     'bbbbbbbb-0000-0000-0000-000000000003',
     'Omar Farooq', 'omar@albarsha-tech.ae', '+971-55-100-1003',
     crypt('Omar@1234', gen_salt('bf')));

-- ── App settings (grouped) ────────────────────────────────────
INSERT INTO app_settings (company_id, setting_group, setting_key, setting_value) VALUES
    ('22222222-0000-0000-0000-000000000001', 'Attendance',    'AttendanceRadiusMeters',   '200'),
    ('22222222-0000-0000-0000-000000000001', 'Attendance',    'EnableOfflineMode',        'true'),
    ('22222222-0000-0000-0000-000000000001', 'Attendance',    'OvertimeThresholdHours',   '9'),
    ('22222222-0000-0000-0000-000000000001', 'Notifications', 'VisaAlertDays',            '60,30,7'),
    ('22222222-0000-0000-0000-000000000001', 'Notifications', 'WhatsAppNotifications',    'true'),
    ('22222222-0000-0000-0000-000000000001', 'Notifications', 'DefaultJobReminderMins',   '30'),
    ('22222222-0000-0000-0000-000000000001', 'Mobile',        'GPSTrackingIntervalSecs',  '30'),
    ('22222222-0000-0000-0000-000000000001', 'Mobile',        'PhotoUploadQuality',       '80'),
    ('22222222-0000-0000-0000-000000000001', 'Mobile',        'OfflineSyncEnabled',       'true');

-- ── Jobs (today's schedule — various statuses) ────────────────
INSERT INTO jobs
    (id, company_id, job_number, customer_name, customer_phone,
     address, latitude, longitude,
     job_type_id, job_status_id, assigned_employee_id,
     priority, scheduled_at, scheduled_end_at,
     started_at, completed_at, notes, created_by)
VALUES
    ('cccccccc-0000-0000-0000-000000000001',
     '22222222-0000-0000-0000-000000000001',
     'JOB-2025-001', 'Hassan Al Zaabi', '+971-50-901-2001',
     'Villa 14, Al Barsha 2, Dubai', 25.1132, 55.1927,
     '99999999-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000005',
     'bbbbbbbb-0000-0000-0000-000000000001',
     'normal',
     NOW() - INTERVAL '2 hours',
     NOW() - INTERVAL '30 minutes',
     NOW() - INTERVAL '2 hours',
     NOW() - INTERVAL '30 minutes',
     'Annual AC service, 3 units. Completed successfully.',
     '44444444-0000-0000-0000-000000000002'),

    ('cccccccc-0000-0000-0000-000000000002',
     '22222222-0000-0000-0000-000000000001',
     'JOB-2025-002', 'Fatima Al Rashid', '+971-50-902-2002',
     'Apt 801, JLT Cluster G, Dubai', 25.0657, 55.1394,
     '99999999-0000-0000-0000-000000000004',
     'aaaaaaaa-0000-0000-0000-000000000004',
     'bbbbbbbb-0000-0000-0000-000000000002',
     'high',
     NOW() + INTERVAL '30 minutes',
     NOW() + INTERVAL '90 minutes',
     NOW() - INTERVAL '10 minutes',
     NULL,
     'Leaking pipe under kitchen sink. Customer waiting.',
     '44444444-0000-0000-0000-000000000002'),

    ('cccccccc-0000-0000-0000-000000000003',
     '22222222-0000-0000-0000-000000000001',
     'JOB-2025-003', 'Dubai Holding Office', '+971-4-301-3000',
     'Level 22, Index Tower, DIFC, Dubai', 25.2116, 55.2797,
     '99999999-0000-0000-0000-000000000005',
     'aaaaaaaa-0000-0000-0000-000000000002',
     'bbbbbbbb-0000-0000-0000-000000000003',
     'urgent',
     NOW() + INTERVAL '2 hours',
     NOW() + INTERVAL '3 hours 30 minutes',
     NULL, NULL,
     'MCB tripping on floor 22. Access card needed from building manager.',
     '44444444-0000-0000-0000-000000000002'),

    ('cccccccc-0000-0000-0000-000000000004',
     '22222222-0000-0000-0000-000000000001',
     'JOB-2025-004', 'Maryam Al Blooshi', '+971-50-904-2004',
     'Villa 5B, Mirdif, Dubai', 25.2309, 55.4175,
     '99999999-0000-0000-0000-000000000006',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'bbbbbbbb-0000-0000-0000-000000000004',
     'normal',
     NOW() + INTERVAL '4 hours',
     NOW() + INTERVAL '9 hours',
     NULL, NULL,
     'Full interior repaint — master bedroom and living room. Paint provided by customer.',
     '44444444-0000-0000-0000-000000000002'),

    ('cccccccc-0000-0000-0000-000000000005',
     '22222222-0000-0000-0000-000000000001',
     'JOB-2025-005', 'Park Regis Hotel', '+971-4-305-5000',
     'Al Mina Road, Bur Dubai, Dubai', 25.2498, 55.2888,
     '99999999-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000001',
     NULL,   -- unassigned
     'normal',
     NOW() + INTERVAL '6 hours',
     NOW() + INTERVAL '8 hours',
     NULL, NULL,
     'AMC visit — 12 AC units across floors 3-5. Technician not yet assigned.',
     '44444444-0000-0000-0000-000000000002');

-- ── Job photos (for completed job) ────────────────────────────
INSERT INTO job_photos (job_id, photo_url, photo_type) VALUES
    ('cccccccc-0000-0000-0000-000000000001', 'https://cdn.albarsha-tech.ae/jobs/JOB-2025-001/before_1.jpg', 'before'),
    ('cccccccc-0000-0000-0000-000000000001', 'https://cdn.albarsha-tech.ae/jobs/JOB-2025-001/before_2.jpg', 'before'),
    ('cccccccc-0000-0000-0000-000000000001', 'https://cdn.albarsha-tech.ae/jobs/JOB-2025-001/after_1.jpg',  'after'),
    ('cccccccc-0000-0000-0000-000000000001', 'https://cdn.albarsha-tech.ae/jobs/JOB-2025-001/after_2.jpg',  'after');

-- ── Job status history ────────────────────────────────────────
INSERT INTO job_status_history (job_id, old_status_id, new_status_id, changed_by) VALUES
    ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002'),
    ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003'),
    ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003'),
    ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000003');

-- ── Attendance logs ───────────────────────────────────────────
INSERT INTO attendance_logs
    (company_id, employee_id,
     check_in_time, check_out_time,
     check_in_lat, check_in_lng,
     check_out_lat, check_out_lng,
     status)
VALUES
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
     NOW() - INTERVAL '4 hours', NOW() - INTERVAL '15 minutes',
     25.1541, 55.2276, 25.1541, 55.2276, 'present'),

    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
     NOW() - INTERVAL '3 hours 30 minutes', NULL,
     25.1541, 55.2276, NULL, NULL, 'present'),

    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
     NOW() - INTERVAL '30 minutes', NULL,
     25.2697, 55.3095, NULL, NULL, 'late'),   -- late check-in

    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
     NOW() - INTERVAL '5 hours', NULL,
     25.1541, 55.2276, NULL, NULL, 'present');

-- ── GPS logs (live positions) ─────────────────────────────────
INSERT INTO gps_logs (company_id, employee_id, latitude, longitude, accuracy, recorded_at) VALUES
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 25.1132, 55.1927, 5.2,  NOW() - INTERVAL '5 minutes'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 25.0745, 55.1520, 8.1,  NOW() - INTERVAL '3 minutes'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 25.2116, 55.2797, 6.4,  NOW() - INTERVAL '8 minutes'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', 25.1980, 55.2688, 4.9,  NOW() - INTERVAL '2 minutes'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 25.2697, 55.3095, 11.0, NOW() - INTERVAL '12 minutes');

-- ── Employee shifts ───────────────────────────────────────────
INSERT INTO employee_shifts (company_id, employee_id, shift_type_id, shift_date, status) VALUES
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', CURRENT_DATE, 'active'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', CURRENT_DATE, 'active'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000002', CURRENT_DATE, 'scheduled'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', '77777777-0000-0000-0000-000000000001', CURRENT_DATE, 'active'),
    ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', '77777777-0000-0000-0000-000000000002', CURRENT_DATE, 'scheduled');

-- ── Leave request ─────────────────────────────────────────────
INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, reason, status) VALUES
    ('22222222-0000-0000-0000-000000000001',
     'bbbbbbbb-0000-0000-0000-000000000003',
     '88888888-0000-0000-0000-000000000001',
     CURRENT_DATE + 7, CURRENT_DATE + 14,
     'Family visit to Pakistan', 'pending');

-- ── Overtime request ──────────────────────────────────────────
INSERT INTO overtime_requests (company_id, employee_id, request_date, hours_requested, reason, status) VALUES
    ('22222222-0000-0000-0000-000000000001',
     'bbbbbbbb-0000-0000-0000-000000000001',
     CURRENT_DATE, 2.5,
     'Extra AC units added to job at customer request', 'pending');

-- ── Notifications ─────────────────────────────────────────────
INSERT INTO notifications (company_id, user_id, title, message, type) VALUES
    ('22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
     'Visa expiry — Ahmed Khalid',
     'Ahmed Khalid''s visa expires in 15 days. Arrange renewal immediately.',
     'visa_alert'),
    ('22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
     'Emirates ID expiry — Ravi Sharma',
     'Ravi Sharma''s Emirates ID expires in 25 days.',
     'eid_alert'),
    ('22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002',
     'Job completed — JOB-2025-001',
     'Ahmed Khalid completed AC service at Villa 14, Al Barsha 2.',
     'job_completed'),
    ('22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002',
     'Unassigned job — JOB-2025-005',
     'Park Regis Hotel job scheduled in 6 hours has no technician assigned.',
     'job_unassigned'),
    ('22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002',
     'Overtime request pending',
     'Ahmed Khalid submitted an overtime request for 2.5 hours today.',
     'overtime_request');

-- ============================================================
--  VERIFY (uncomment to run after seeding)
-- ============================================================
-- SELECT tablename, (xpath('/row/cnt/text()', query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I', tablename), FALSE, TRUE, '')))[1]::text::int AS row_count
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- SELECT full_name, visa_days_left, passport_days_left, eid_days_left FROM v_employees_expiry_alerts;
-- SELECT job_number, customer_name, priority, job_type, job_status, technician_name, scheduled_at FROM v_today_jobs ORDER BY priority DESC;
-- SELECT full_name, latitude, longitude, recorded_at FROM v_technician_live_location;
-- SELECT full_name, work_date, status, ROUND(hours_worked::numeric,2) AS hrs FROM v_attendance_summary;
-- SELECT setting_group, setting_key, setting_value FROM app_settings WHERE company_id = '22222222-0000-0000-0000-000000000001' ORDER BY setting_group;

-- ============================================================
--  END OF SCRIPT
-- ============================================================


DROP VIEW IF EXISTS public.v_attendance_summary;
DROP VIEW IF EXISTS public.v_employees_expiry_alerts;
DROP VIEW IF EXISTS public.v_technician_live_location;
DROP VIEW IF EXISTS public.v_today_jobs;

ALTER TABLE attendance_logs
ALTER COLUMN status TYPE TEXT
USING status::text;

ALTER TABLE employee_shifts
ALTER COLUMN status TYPE TEXT
USING status::text;

ALTER TABLE leave_requests
ALTER COLUMN status TYPE TEXT
USING status::text;

ALTER TABLE overtime_requests
ALTER COLUMN status TYPE TEXT
USING status::text;

ALTER TABLE jobs
ALTER COLUMN priority TYPE TEXT
USING priority::text;

ALTER TABLE job_photos
ALTER COLUMN photo_type TYPE TEXT
USING photo_type::text;


DROP TYPE IF EXISTS attendance_status_enum  CASCADE;
DROP TYPE IF EXISTS shift_status_enum       CASCADE;
DROP TYPE IF EXISTS leave_status_enum       CASCADE;
DROP TYPE IF EXISTS overtime_status_enum    CASCADE;
DROP TYPE IF EXISTS photo_type_enum         CASCADE;
DROP TYPE IF EXISTS job_priority_enum       CASCADE;



CREATE TABLE public.audit_logs
(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    table_name varchar(200) NOT NULL,

    record_id uuid NOT NULL,

    action varchar(50) NOT NULL,

    old_values text NULL,

    new_values text NULL,

    user_id uuid NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now()
);



CREATE INDEX idx_audit_logs_table_record
ON public.audit_logs(table_name, record_id);

CREATE INDEX idx_audit_logs_user
ON public.audit_logs(user_id);

CREATE INDEX idx_audit_logs_created_at
ON public.audit_logs(created_at DESC);

GRANT ALL ON SCHEMA public TO servicepilot_user;

GRANT CREATE ON SCHEMA public TO servicepilot_user;

INSERT INTO roles (id, name, description, created_at)
VALUES
  (gen_random_uuid(), 'HRManager',  'Human Resources Manager — full employee and attendance access, no job management', now()),
  (gen_random_uuid(), 'Dispatcher', 'Job Dispatcher — full job scheduling and assignment access, no HR data access',    now())
ON CONFLICT (name) DO NOTHING;




-- Migration: AddPasswordResetTokens
-- Run this once in your servicepilot_db database

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL,
    token_hash      VARCHAR(64)   NOT NULL,
    expires_at      TIMESTAMPTZ   NOT NULL,
    is_used         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT fk_prt_user_id FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prt_token_hash
    ON password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_prt_user_used
    ON password_reset_tokens (user_id, is_used);

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12,2) NULL;