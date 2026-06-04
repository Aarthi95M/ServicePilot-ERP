using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using ServicePilot.Domain.Entities;

namespace ServicePilot.Infrastructure.Persistence.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AppSetting> AppSettings { get; set; }

    public virtual DbSet<AttendanceLog> AttendanceLogs { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<Company> Companies { get; set; }

    public virtual DbSet<Department> Departments { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<EmployeeShift> EmployeeShifts { get; set; }

    public virtual DbSet<GpsLog> GpsLogs { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<JobPhoto> JobPhotos { get; set; }

    public virtual DbSet<JobStatus> JobStatuses { get; set; }

    public virtual DbSet<JobStatusHistory> JobStatusHistories { get; set; }

    public virtual DbSet<JobType> JobTypes { get; set; }

    public virtual DbSet<LeaveRequest> LeaveRequests { get; set; }

    public virtual DbSet<LeaveType> LeaveTypes { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<OvertimeRequest> OvertimeRequests { get; set; }

    public virtual DbSet<Position> Positions { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<ShiftType> ShiftTypes { get; set; }

    public virtual DbSet<User> Users { get; set; }


    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

//    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
//#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
//        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=servicepilot_db;Username=servicepilot_user;Password=ServiceUser123");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");

        modelBuilder.Entity<AppSetting>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("app_settings_pkey");

            entity.ToTable("app_settings");

            entity.HasIndex(e => new { e.CompanyId, e.SettingKey }, "app_settings_company_id_setting_key_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.SettingGroup)
                .HasMaxLength(100)
                .HasDefaultValueSql("'General'::character varying")
                .HasColumnName("setting_group");
            entity.Property(e => e.SettingKey)
                .HasMaxLength(200)
                .HasColumnName("setting_key");
            entity.Property(e => e.SettingValue).HasColumnName("setting_value");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.AppSettings)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("app_settings_company_id_fkey");
        });

        modelBuilder.Entity<AttendanceLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("attendance_logs_pkey");

            entity.ToTable("attendance_logs");

            entity.HasIndex(e => new { e.CompanyId, e.CheckInTime }, "idx_attendance_company_date").IsDescending(false, true);

            entity.HasIndex(e => new { e.EmployeeId, e.CheckInTime }, "idx_attendance_employee_date").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CheckInLat)
                .HasPrecision(10, 7)
                .HasColumnName("check_in_lat");
            entity.Property(e => e.CheckInLng)
                .HasPrecision(10, 7)
                .HasColumnName("check_in_lng");
            entity.Property(e => e.CheckInTime).HasColumnName("check_in_time");
            entity.Property(e => e.CheckOutLat)
                .HasPrecision(10, 7)
                .HasColumnName("check_out_lat");
            entity.Property(e => e.CheckOutLng)
                .HasPrecision(10, 7)
                .HasColumnName("check_out_lng");
            entity.Property(e => e.CheckOutTime).HasColumnName("check_out_time");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.IsOfflineSync)
                .HasDefaultValue(false)
                .HasColumnName("is_offline_sync");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.AttendanceLogs)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("attendance_logs_company_id_fkey");

            entity.HasOne(d => d.Employee).WithMany(p => p.AttendanceLogs)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("attendance_logs_employee_id_fkey");
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("branches_pkey");

            entity.ToTable("branches");

            entity.HasIndex(e => e.CompanyId, "idx_branches_company");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Latitude)
                .HasPrecision(10, 7)
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasPrecision(10, 7)
                .HasColumnName("longitude");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.Branches)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("branches_company_id_fkey");
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("companies_pkey");

            entity.ToTable("companies");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(200)
                .HasColumnName("email");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.LogoUrl).HasColumnName("logo_url");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.Phone)
                .HasMaxLength(50)
                .HasColumnName("phone");
            entity.Property(e => e.Timezone)
                .HasMaxLength(100)
                .HasDefaultValueSql("'Asia/Dubai'::character varying")
                .HasColumnName("timezone");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("departments_pkey");

            entity.ToTable("departments");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.Departments)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("departments_company_id_fkey");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("employees_pkey");

            entity.ToTable("employees");

            entity.HasIndex(e => new { e.CompanyId, e.EmployeeCode }, "employees_company_id_employee_code_key").IsUnique();

            entity.HasIndex(e => e.BranchId, "idx_employees_branch");

            entity.HasIndex(e => e.CompanyId, "idx_employees_company");

            entity.HasIndex(e => e.EmiratesIdExpiryDate, "idx_employees_eid_expiry").HasFilter("(is_active = true)");

            entity.HasIndex(e => e.PassportExpiryDate, "idx_employees_passport_expiry").HasFilter("(is_active = true)");

            entity.HasIndex(e => e.VisaExpiryDate, "idx_employees_visa_expiry").HasFilter("(is_active = true)");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.Email)
                .HasMaxLength(200)
                .HasColumnName("email");
            entity.Property(e => e.EmiratesIdExpiryDate).HasColumnName("emirates_id_expiry_date");
            entity.Property(e => e.EmployeeCode)
                .HasMaxLength(50)
                .HasColumnName("employee_code");
            entity.Property(e => e.FullName)
                .HasMaxLength(200)
                .HasColumnName("full_name");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.JoiningDate).HasColumnName("joining_date");
            entity.Property(e => e.BasicSalary)
                .HasColumnType("numeric(12,2)")
                .HasColumnName("basic_salary");
            entity.Property(e => e.PassportExpiryDate).HasColumnName("passport_expiry_date");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(50)
                .HasColumnName("phone_number");
            entity.Property(e => e.PositionId).HasColumnName("position_id");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VisaExpiryDate).HasColumnName("visa_expiry_date");

            entity.HasOne(d => d.Branch).WithMany(p => p.Employees)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("employees_branch_id_fkey");

            entity.HasOne(d => d.Company).WithMany(p => p.Employees)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("employees_company_id_fkey");

            entity.HasOne(d => d.Department).WithMany(p => p.Employees)
                .HasForeignKey(d => d.DepartmentId)
                .HasConstraintName("employees_department_id_fkey");

            entity.HasOne(d => d.Position).WithMany(p => p.Employees)
                .HasForeignKey(d => d.PositionId)
                .HasConstraintName("employees_position_id_fkey");
        });

        modelBuilder.Entity<EmployeeShift>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("employee_shifts_pkey");

            entity.ToTable("employee_shifts");

            entity.HasIndex(e => new { e.CompanyId, e.ShiftDate }, "idx_shifts_company_date").IsDescending(false, true);

            entity.HasIndex(e => new { e.EmployeeId, e.ShiftDate }, "idx_shifts_employee_date").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CustomEndTime).HasColumnName("custom_end_time");
            entity.Property(e => e.CustomStartTime).HasColumnName("custom_start_time");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.ShiftDate).HasColumnName("shift_date");
            entity.Property(e => e.ShiftTypeId).HasColumnName("shift_type_id");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.EmployeeShifts)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("employee_shifts_company_id_fkey");

            entity.HasOne(d => d.Employee).WithMany(p => p.EmployeeShifts)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("employee_shifts_employee_id_fkey");

            entity.HasOne(d => d.ShiftType).WithMany(p => p.EmployeeShifts)
                .HasForeignKey(d => d.ShiftTypeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("employee_shifts_shift_type_id_fkey");
        });

        modelBuilder.Entity<GpsLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("gps_logs_pkey");

            entity.ToTable("gps_logs");

            entity.HasIndex(e => new { e.CompanyId, e.RecordedAt }, "idx_gps_company_time").IsDescending(false, true);

            entity.HasIndex(e => new { e.EmployeeId, e.RecordedAt }, "idx_gps_employee_time").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Accuracy)
                .HasPrecision(8, 2)
                .HasColumnName("accuracy");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.Latitude)
                .HasPrecision(10, 7)
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasPrecision(10, 7)
                .HasColumnName("longitude");
            entity.Property(e => e.RecordedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("recorded_at");

            entity.HasOne(d => d.Company).WithMany(p => p.GpsLogs)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("gps_logs_company_id_fkey");

            entity.HasOne(d => d.Employee).WithMany(p => p.GpsLogs)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("gps_logs_employee_id_fkey");
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("jobs_pkey");

            entity.ToTable("jobs");

            entity.HasIndex(e => e.AssignedEmployeeId, "idx_jobs_assigned_employee");

            entity.HasIndex(e => new { e.CompanyId, e.ScheduledAt }, "idx_jobs_company_scheduled");

            entity.HasIndex(e => new { e.CompanyId, e.JobStatusId }, "idx_jobs_company_status");

            entity.HasIndex(e => new { e.CompanyId, e.Priority }, "idx_jobs_priority").HasFilter("(completed_at IS NULL)");

            entity.HasIndex(e => new { e.CompanyId, e.JobNumber }, "jobs_company_id_job_number_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.AssignedEmployeeId).HasColumnName("assigned_employee_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CustomerName)
                .HasMaxLength(200)
                .HasColumnName("customer_name");
            entity.Property(e => e.CustomerPhone)
                .HasMaxLength(50)
                .HasColumnName("customer_phone");
            entity.Property(e => e.JobNumber)
                .HasMaxLength(50)
                .HasColumnName("job_number");
            entity.Property(e => e.JobStatusId).HasColumnName("job_status_id");
            entity.Property(e => e.JobTypeId).HasColumnName("job_type_id");
            entity.Property(e => e.Latitude)
                .HasPrecision(10, 7)
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasPrecision(10, 7)
                .HasColumnName("longitude");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.Priority).HasColumnName("priority");
            entity.Property(e => e.ScheduledAt).HasColumnName("scheduled_at");
            entity.Property(e => e.ScheduledEndAt).HasColumnName("scheduled_end_at");
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.AssignedEmployee).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.AssignedEmployeeId)
                .HasConstraintName("jobs_assigned_employee_id_fkey");

            entity.HasOne(d => d.Company).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("jobs_company_id_fkey");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("jobs_created_by_fkey");

            entity.HasOne(d => d.JobStatus).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.JobStatusId)
                .HasConstraintName("jobs_job_status_id_fkey");

            entity.HasOne(d => d.JobType).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.JobTypeId)
                .HasConstraintName("jobs_job_type_id_fkey");
        });

        modelBuilder.Entity<JobPhoto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("job_photos_pkey");

            entity.ToTable("job_photos");

            entity.HasIndex(e => e.JobId, "idx_job_photos_job");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.JobId).HasColumnName("job_id");
            entity.Property(e => e.PhotoType).HasColumnName("photo_type");
            entity.Property(e => e.PhotoUrl).HasColumnName("photo_url");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Job).WithMany(p => p.JobPhotos)
                .HasForeignKey(d => d.JobId)
                .HasConstraintName("job_photos_job_id_fkey");
        });

        modelBuilder.Entity<JobStatus>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("job_statuses_pkey");

            entity.ToTable("job_statuses");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ColorCode)
                .HasMaxLength(10)
                .HasDefaultValueSql("'#888780'::character varying")
                .HasColumnName("color_code");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DisplayOrder)
                .HasDefaultValue(0)
                .HasColumnName("display_order");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.JobStatuses)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("job_statuses_company_id_fkey");
        });

        modelBuilder.Entity<JobStatusHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("job_status_history_pkey");

            entity.ToTable("job_status_history");

            entity.HasIndex(e => new { e.JobId, e.ChangedAt }, "idx_job_status_history_job").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ChangedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("changed_at");
            entity.Property(e => e.ChangedBy).HasColumnName("changed_by");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.JobId).HasColumnName("job_id");
            entity.Property(e => e.NewStatusId).HasColumnName("new_status_id");
            entity.Property(e => e.OldStatusId).HasColumnName("old_status_id");

            entity.HasOne(d => d.ChangedByNavigation).WithMany(p => p.JobStatusHistories)
                .HasForeignKey(d => d.ChangedBy)
                .HasConstraintName("job_status_history_changed_by_fkey");

            entity.HasOne(d => d.Job).WithMany(p => p.JobStatusHistories)
                .HasForeignKey(d => d.JobId)
                .HasConstraintName("job_status_history_job_id_fkey");

            entity.HasOne(d => d.NewStatus).WithMany(p => p.JobStatusHistoryNewStatuses)
                .HasForeignKey(d => d.NewStatusId)
                .HasConstraintName("job_status_history_new_status_id_fkey");

            entity.HasOne(d => d.OldStatus).WithMany(p => p.JobStatusHistoryOldStatuses)
                .HasForeignKey(d => d.OldStatusId)
                .HasConstraintName("job_status_history_old_status_id_fkey");
        });

        modelBuilder.Entity<JobType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("job_types_pkey");

            entity.ToTable("job_types");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EstimatedDurationMins)
                .HasDefaultValue(60)
                .HasColumnName("estimated_duration_mins");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.JobTypes)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("job_types_company_id_fkey");
        });

        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("leave_requests_pkey");

            entity.ToTable("leave_requests");

            entity.HasIndex(e => new { e.EmployeeId, e.Status }, "idx_leave_employee");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.LeaveTypeId).HasColumnName("leave_type_id");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.LeaveRequests)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("leave_requests_approved_by_fkey");

            entity.HasOne(d => d.Company).WithMany(p => p.LeaveRequests)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("leave_requests_company_id_fkey");

            entity.HasOne(d => d.Employee).WithMany(p => p.LeaveRequests)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("leave_requests_employee_id_fkey");

            entity.HasOne(d => d.LeaveType).WithMany(p => p.LeaveRequests)
                .HasForeignKey(d => d.LeaveTypeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("leave_requests_leave_type_id_fkey");
        });

        modelBuilder.Entity<LeaveType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("leave_types_pkey");

            entity.ToTable("leave_types");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.IsPaid)
                .HasDefaultValue(true)
                .HasColumnName("is_paid");
            entity.Property(e => e.MaxDaysPerYear)
                .HasDefaultValue(30)
                .HasColumnName("max_days_per_year");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.LeaveTypes)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("leave_types_company_id_fkey");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("notifications_pkey");

            entity.ToTable("notifications");

            entity.HasIndex(e => new { e.UserId, e.IsRead }, "idx_notifications_user_unread").HasFilter("(is_read = false)");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasColumnName("is_read");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.Title)
                .HasMaxLength(300)
                .HasColumnName("title");
            entity.Property(e => e.Type)
                .HasMaxLength(100)
                .HasColumnName("type");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Company).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("notifications_company_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("notifications_user_id_fkey");
        });

        modelBuilder.Entity<OvertimeRequest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("overtime_requests_pkey");

            entity.ToTable("overtime_requests");

            entity.HasIndex(e => new { e.EmployeeId, e.Status }, "idx_overtime_employee");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.HoursRequested)
                .HasPrecision(4, 2)
                .HasColumnName("hours_requested");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.RequestDate).HasColumnName("request_date");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.OvertimeRequests)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("overtime_requests_approved_by_fkey");

            entity.HasOne(d => d.Company).WithMany(p => p.OvertimeRequests)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("overtime_requests_company_id_fkey");

            entity.HasOne(d => d.Employee).WithMany(p => p.OvertimeRequests)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("overtime_requests_employee_id_fkey");
        });

        modelBuilder.Entity<Position>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("positions_pkey");

            entity.ToTable("positions");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.Positions)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("positions_company_id_fkey");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("roles_pkey");

            entity.ToTable("roles");

            entity.HasIndex(e => e.Name, "roles_name_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<ShiftType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("shift_types_pkey");

            entity.ToTable("shift_types");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ColorCode)
                .HasMaxLength(10)
                .HasDefaultValueSql("'#085041'::character varying")
                .HasColumnName("color_code");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EndTime).HasColumnName("end_time");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.StartTime).HasColumnName("start_time");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Company).WithMany(p => p.ShiftTypes)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("shift_types_company_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.CompanyId, "idx_users_company");

            entity.HasIndex(e => e.EmployeeId, "idx_users_employee");

            entity.HasIndex(e => new { e.CompanyId, e.Email }, "users_company_id_email_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CompanyId).HasColumnName("company_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(200)
                .HasColumnName("email");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.FullName)
                .HasMaxLength(200)
                .HasColumnName("full_name");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(50)
                .HasColumnName("phone_number");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.Users)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("users_branch_id_fkey");

            entity.HasOne(d => d.Company).WithMany(p => p.Users)
                .HasForeignKey(d => d.CompanyId)
                .HasConstraintName("users_company_id_fkey");

            entity.HasOne(d => d.Employee).WithMany(p => p.Users)
                .HasForeignKey(d => d.EmployeeId)
                .HasConstraintName("users_employee_id_fkey");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("users_role_id_fkey");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable("audit_logs");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");

            entity.Property(e => e.TableName)
                .HasMaxLength(200)
                .HasColumnName("table_name");

            entity.Property(e => e.RecordId)
                .HasColumnName("record_id");

            entity.Property(e => e.Action)
                .HasMaxLength(50)
                .HasColumnName("action");

            entity.Property(e => e.OldValues)
                .HasColumnName("old_values");

            entity.Property(e => e.NewValues)
                .HasColumnName("new_values");

            entity.Property(e => e.UserId)
                .HasColumnName("user_id");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("password_reset_tokens_pkey");

            entity.ToTable("password_reset_tokens");

            // Lookup by token hash must be fast
            entity.HasIndex(e => e.TokenHash, "idx_prt_token_hash").IsUnique();

            // Clean up expired tokens per user efficiently
            entity.HasIndex(e => new { e.UserId, e.IsUsed }, "idx_prt_user_used");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");

            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.Property(e => e.TokenHash)
                .HasMaxLength(64)
                .HasColumnName("token_hash");

            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");

            entity.Property(e => e.IsUsed)
                .HasDefaultValue(false)
                .HasColumnName("is_used");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_prt_user_id");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
