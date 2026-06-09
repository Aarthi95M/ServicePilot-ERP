CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE audit_logs (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    table_name character varying(200) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    old_values text,
    new_values text,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    CONSTRAINT "PK_audit_logs" PRIMARY KEY (id)
);

CREATE TABLE companies (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    name character varying(200) NOT NULL,
    email character varying(200),
    phone character varying(50),
    address text,
    timezone character varying(100) NOT NULL DEFAULT ('Asia/Dubai'::character varying),
    logo_url text,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE roles (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE app_settings (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    setting_group character varying(100) NOT NULL DEFAULT ('General'::character varying),
    setting_key character varying(200) NOT NULL,
    setting_value text,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT app_settings_pkey PRIMARY KEY (id),
    CONSTRAINT app_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE branches (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT branches_pkey PRIMARY KEY (id),
    CONSTRAINT branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE departments (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT departments_pkey PRIMARY KEY (id),
    CONSTRAINT departments_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE job_statuses (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    color_code character varying(10) DEFAULT ('#888780'::character varying),
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT job_statuses_pkey PRIMARY KEY (id),
    CONSTRAINT job_statuses_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE job_types (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    estimated_duration_mins integer DEFAULT 60,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT job_types_pkey PRIMARY KEY (id),
    CONSTRAINT job_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE leave_types (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    max_days_per_year integer NOT NULL DEFAULT 30,
    is_paid boolean NOT NULL DEFAULT TRUE,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT leave_types_pkey PRIMARY KEY (id),
    CONSTRAINT leave_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE positions (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT positions_pkey PRIMARY KEY (id),
    CONSTRAINT positions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE shift_types (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    color_code character varying(10) DEFAULT ('#085041'::character varying),
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT shift_types_pkey PRIMARY KEY (id),
    CONSTRAINT shift_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE employees (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    branch_id uuid,
    position_id uuid,
    department_id uuid,
    employee_code character varying(50),
    full_name character varying(200) NOT NULL,
    phone_number character varying(50),
    email character varying(200),
    visa_expiry_date date,
    passport_expiry_date date,
    emirates_id_expiry_date date,
    joining_date date,
    basic_salary numeric(12,2),
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT employees_pkey PRIMARY KEY (id),
    CONSTRAINT employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES positions (id)
);

CREATE TABLE attendance_logs (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    check_in_lat numeric(10,7),
    check_in_lng numeric(10,7),
    check_out_lat numeric(10,7),
    check_out_lng numeric(10,7),
    status text NOT NULL,
    is_offline_sync boolean NOT NULL DEFAULT FALSE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT attendance_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE TABLE employee_shifts (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    shift_type_id uuid NOT NULL,
    shift_date date NOT NULL,
    custom_start_time time without time zone,
    custom_end_time time without time zone,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT employee_shifts_pkey PRIMARY KEY (id),
    CONSTRAINT employee_shifts_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT employee_shifts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT employee_shifts_shift_type_id_fkey FOREIGN KEY (shift_type_id) REFERENCES shift_types (id)
);

CREATE TABLE gps_logs (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    accuracy numeric(8,2),
    recorded_at timestamp with time zone NOT NULL DEFAULT (now()),
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    CONSTRAINT gps_logs_pkey PRIMARY KEY (id),
    CONSTRAINT gps_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT gps_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE TABLE users (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    role_id uuid NOT NULL,
    branch_id uuid,
    employee_id uuid,
    full_name character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    phone_number character varying(50),
    password_hash text NOT NULL,
    is_active boolean NOT NULL DEFAULT TRUE,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE jobs (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    job_number character varying(50),
    customer_name character varying(200) NOT NULL,
    customer_phone character varying(50),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    job_type_id uuid,
    job_status_id uuid,
    assigned_employee_id uuid,
    priority text NOT NULL,
    scheduled_at timestamp with time zone,
    scheduled_end_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_assigned_employee_id_fkey FOREIGN KEY (assigned_employee_id) REFERENCES employees (id),
    CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT jobs_job_status_id_fkey FOREIGN KEY (job_status_id) REFERENCES job_statuses (id),
    CONSTRAINT jobs_job_type_id_fkey FOREIGN KEY (job_type_id) REFERENCES job_types (id)
);

CREATE TABLE leave_requests (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
    CONSTRAINT leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users (id),
    CONSTRAINT leave_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT leave_requests_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_types (id)
);

CREATE TABLE notifications (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    user_id uuid,
    title character varying(300) NOT NULL,
    message text,
    type character varying(100),
    is_read boolean NOT NULL DEFAULT FALSE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE overtime_requests (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    request_date date NOT NULL,
    hours_requested numeric(4,2) NOT NULL,
    reason text,
    status text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    updated_at timestamp with time zone,
    CONSTRAINT overtime_requests_pkey PRIMARY KEY (id),
    CONSTRAINT overtime_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users (id),
    CONSTRAINT overtime_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT overtime_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE TABLE job_photos (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    job_id uuid NOT NULL,
    photo_url text NOT NULL,
    photo_type text NOT NULL,
    uploaded_at timestamp with time zone NOT NULL DEFAULT (now()),
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    CONSTRAINT job_photos_pkey PRIMARY KEY (id),
    CONSTRAINT job_photos_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

CREATE TABLE job_status_history (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    job_id uuid NOT NULL,
    old_status_id uuid,
    new_status_id uuid,
    changed_by uuid,
    notes text,
    changed_at timestamp with time zone NOT NULL DEFAULT (now()),
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    CONSTRAINT job_status_history_pkey PRIMARY KEY (id),
    CONSTRAINT job_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES users (id),
    CONSTRAINT job_status_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
    CONSTRAINT job_status_history_new_status_id_fkey FOREIGN KEY (new_status_id) REFERENCES job_statuses (id),
    CONSTRAINT job_status_history_old_status_id_fkey FOREIGN KEY (old_status_id) REFERENCES job_statuses (id)
);

CREATE UNIQUE INDEX app_settings_company_id_setting_key_key ON app_settings (company_id, setting_key);

CREATE INDEX idx_attendance_company_date ON attendance_logs (company_id, check_in_time DESC);

CREATE INDEX idx_attendance_employee_date ON attendance_logs (employee_id, check_in_time DESC);

CREATE INDEX idx_branches_company ON branches (company_id);

CREATE INDEX "IX_departments_company_id" ON departments (company_id);

CREATE INDEX idx_shifts_company_date ON employee_shifts (company_id, shift_date DESC);

CREATE INDEX idx_shifts_employee_date ON employee_shifts (employee_id, shift_date DESC);

CREATE INDEX "IX_employee_shifts_shift_type_id" ON employee_shifts (shift_type_id);

CREATE UNIQUE INDEX employees_company_id_employee_code_key ON employees (company_id, employee_code);

CREATE INDEX idx_employees_branch ON employees (branch_id);

CREATE INDEX idx_employees_company ON employees (company_id);

CREATE INDEX idx_employees_eid_expiry ON employees (emirates_id_expiry_date) WHERE (is_active = true);

CREATE INDEX idx_employees_passport_expiry ON employees (passport_expiry_date) WHERE (is_active = true);

CREATE INDEX idx_employees_visa_expiry ON employees (visa_expiry_date) WHERE (is_active = true);

CREATE INDEX "IX_employees_department_id" ON employees (department_id);

CREATE INDEX "IX_employees_position_id" ON employees (position_id);

CREATE INDEX idx_gps_company_time ON gps_logs (company_id, recorded_at DESC);

CREATE INDEX idx_gps_employee_time ON gps_logs (employee_id, recorded_at DESC);

CREATE INDEX idx_job_photos_job ON job_photos (job_id);

CREATE INDEX idx_job_status_history_job ON job_status_history (job_id, changed_at DESC);

CREATE INDEX "IX_job_status_history_changed_by" ON job_status_history (changed_by);

CREATE INDEX "IX_job_status_history_new_status_id" ON job_status_history (new_status_id);

CREATE INDEX "IX_job_status_history_old_status_id" ON job_status_history (old_status_id);

CREATE INDEX "IX_job_statuses_company_id" ON job_statuses (company_id);

CREATE INDEX "IX_job_types_company_id" ON job_types (company_id);

CREATE INDEX idx_jobs_assigned_employee ON jobs (assigned_employee_id);

CREATE INDEX idx_jobs_company_scheduled ON jobs (company_id, scheduled_at);

CREATE INDEX idx_jobs_company_status ON jobs (company_id, job_status_id);

CREATE INDEX idx_jobs_priority ON jobs (company_id, priority) WHERE (completed_at IS NULL);

CREATE INDEX "IX_jobs_created_by" ON jobs (created_by);

CREATE INDEX "IX_jobs_job_status_id" ON jobs (job_status_id);

CREATE INDEX "IX_jobs_job_type_id" ON jobs (job_type_id);

CREATE UNIQUE INDEX jobs_company_id_job_number_key ON jobs (company_id, job_number);

CREATE INDEX idx_leave_employee ON leave_requests (employee_id, status);

CREATE INDEX "IX_leave_requests_approved_by" ON leave_requests (approved_by);

CREATE INDEX "IX_leave_requests_company_id" ON leave_requests (company_id);

CREATE INDEX "IX_leave_requests_leave_type_id" ON leave_requests (leave_type_id);

CREATE INDEX "IX_leave_types_company_id" ON leave_types (company_id);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE (is_read = false);

CREATE INDEX "IX_notifications_company_id" ON notifications (company_id);

CREATE INDEX idx_overtime_employee ON overtime_requests (employee_id, status);

CREATE INDEX "IX_overtime_requests_approved_by" ON overtime_requests (approved_by);

CREATE INDEX "IX_overtime_requests_company_id" ON overtime_requests (company_id);

CREATE INDEX "IX_positions_company_id" ON positions (company_id);

CREATE UNIQUE INDEX roles_name_key ON roles (name);

CREATE INDEX "IX_shift_types_company_id" ON shift_types (company_id);

CREATE INDEX idx_users_company ON users (company_id);

CREATE INDEX idx_users_employee ON users (employee_id);

CREATE INDEX "IX_users_branch_id" ON users (branch_id);

CREATE INDEX "IX_users_role_id" ON users (role_id);

CREATE UNIQUE INDEX users_company_id_email_key ON users (company_id, email);

CREATE TABLE password_reset_tokens (
    id uuid NOT NULL DEFAULT (gen_random_uuid()),
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean NOT NULL DEFAULT FALSE,
    created_at timestamp with time zone NOT NULL DEFAULT (now()),
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT fk_prt_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_prt_token_hash ON password_reset_tokens (token_hash);

CREATE INDEX idx_prt_user_used ON password_reset_tokens (user_id, is_used);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260609163912_InitialCreate', '8.0.4');

COMMIT;

