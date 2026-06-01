// ============================================================
// lib/types/index.ts
//
// WHAT THIS FILE IS:
// TypeScript types that mirror your .NET backend DTOs exactly.
// Every property name matches the JSON the API returns.
//
// .NET EQUIVALENT:
// This is like having strongly-typed DTOs in C# but on the
// frontend. Instead of:
//   public class ApiResponse<T> { public bool Success ... }
// We write the TypeScript equivalent so the compiler catches
// mistakes before they reach the browser.
//
// WHY THIS MATTERS:
// When you call GET /api/employees and the API returns JSON,
// TypeScript will warn you if you try to access a property
// that doesn't exist. No more runtime "undefined" errors.
// ============================================================

// ── Core API wrapper ─────────────────────────────────────────
// Matches your backend: ApiResponse<T> in ServicePilot.Shared

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}

// Paged result — matches PagedResult<T> in your backend
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ── Auth ─────────────────────────────────────────────────────
// Matches: LoginResponseDto

export interface LoginResponseDto {
  token: string;
  userId: string;
  companyId: string;
  email: string;
  role: string; // "Admin" | "HRManager" | "Supervisor" | "Dispatcher" | "Technician"
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

// The logged-in user stored in Zustand (decoded from JWT)
export interface AuthUser {
  userId: string;
  companyId: string;
  email: string;
  role: UserRole;
  token: string;
}

// Role type — matches your Roles.cs constants exactly
// Using a TypeScript union type instead of an enum
// (union types are simpler and work better with JSON)
export type UserRole =
  | 'Admin'
  | 'HRManager'
  | 'Supervisor'
  | 'Dispatcher'
  | 'Technician';

// ── Company ──────────────────────────────────────────────────
// Matches: CompanyResponseDto

export interface CompanyResponseDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string; // ISO date string — use date-fns to format
  updatedAt: string | null;
  totalEmployees: number;
  totalBranches: number;
  totalUsers: number;
}

export interface CompanyConfigDto {
  shiftStartTime: string;    // "08:00"
  gracePeriodEnd: string;    // "08:15"
  timezone: string;          // "Asia/Dubai"
  workingDays: string;       // "Mon,Tue,Wed,Thu,Fri"
  maxOvertimeHours: number;
}

// ── Employees ────────────────────────────────────────────────
// Matches: EmployeeDto, EmployeeDetailDto, CreateEmployeeDto etc.

export interface EmployeeDto {
  id: string;
  employeeCode: string;      // "EMP-2026-000001"
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  visaStatus: DocumentStatus;
}

export interface EmployeeDetailDto {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  joiningDate: string | null;       // "2026-01-15" (DateOnly from backend)
  visaExpiryDate: string | null;
  passportExpiryDate: string | null;
  emiratesIdExpiryDate: string | null;
  visaStatus: DocumentStatus;
  passportStatus: DocumentStatus;
  emiratesIdStatus: DocumentStatus;
  createdAt: string;
  updatedAt: string | null;
}

// Matches the DocumentStatus enum in your backend
export type DocumentStatus =
  | 'NotProvided'
  | 'Valid'
  | 'ExpiringSoon'
  | 'Expired';

export interface CreateEmployeeDto {
  fullName: string;
  phone?: string;
  email?: string;
  branchId?: string;
  positionId?: string;
  departmentId?: string;
  visaExpiryDate?: string;
  passportExpiryDate?: string;
  emiratesIdExpiryDate?: string;
  joiningDate?: string;
}

export interface UpdateEmployeeDto extends CreateEmployeeDto {
  isActive: boolean;
}

export interface PagedEmployeeRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  branchId?: string;
  departmentId?: string;
  isActive?: boolean;
  search?: string;
}

// ── Attendance ───────────────────────────────────────────────
// Matches: AttendanceResponseDto, AttendanceDashboardDto etc.

export interface AttendanceResponseDto {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  checkInTime: string;           // ISO datetime string
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutTime: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  status: AttendanceStatus;
  hoursWorked: number | null;    // computed on backend
  isOfflineSync: boolean;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface AttendanceDashboardDto {
  date: string;                  // "2026-05-20"
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  late: number;
  absent: number;
  offlineSynced: number;
  activeEmployees: AttendanceResponseDto[];
}

export interface AttendanceSummaryDto {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branchName: string | null;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalHoursWorked: number;
  averageCheckIn: string | null;  // "HH:mm"
}

// ── Jobs ─────────────────────────────────────────────────────
// Matches: JobResponseDto, JobDetailDto etc.

export interface JobResponseDto {
  id: string;
  jobNumber: string;             // "JOB-2026-000042"
  jobTypeId: string | null;
  jobTypeName: string | null;
  jobStatusId: string | null;
  jobStatusName: string | null;
  statusColor: string | null;    // hex color e.g. "#FFC107"
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  priority: number;              // 1=Critical, 2=High, 3=Medium, 4=Low
  priorityLabel: string;         // "Critical" | "High" | "Medium" | "Low"
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedEmployeeCode: string | null;
  scheduledAt: string | null;
  scheduledEndAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface JobDetailDto extends JobResponseDto {
  statusHistory: JobStatusHistoryDto[];
  photos: JobPhotoDto[];
}

export interface JobStatusHistoryDto {
  id: string;
  oldStatusName: string | null;
  newStatusName: string;
  changedByName: string | null;
  changedAt: string;
}

export interface JobPhotoDto {
  id: string;
  photoUrl: string;
  photoType: PhotoType;          // "Before" | "After" | "Progress" | "Signature"
  uploadedAt: string;
}

export type PhotoType = 'Before' | 'After' | 'Progress' | 'Signature';

export interface PagedJobRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  assignedEmployeeId?: string;
  jobStatusId?: string;
  jobTypeId?: string;
  priority?: number;
  scheduledFrom?: string;
  scheduledTo?: string;
  search?: string;
  isCompleted?: boolean;
}

// ── Leave ────────────────────────────────────────────────────
// Matches: LeaveRequestResponseDto, LeaveSummaryDto etc.

export interface LeaveRequestResponseDto {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  startDate: string;             // "2026-06-01" (DateOnly)
  endDate: string;
  totalDays: number;             // computed on backend
  reason: string | null;
  status: RequestStatus;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveTypeBalance {
  leaveTypeName: string;
  isPaid: boolean;
  maxDaysPerYear: number;
  daysTaken: number;
  daysPending: number;
  daysRemaining: number;
}

export interface LeaveSummaryDto {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  balances: LeaveTypeBalance[];
}

// ── Overtime ─────────────────────────────────────────────────
// Matches: OvertimeRequestResponseDto

export interface OvertimeRequestResponseDto {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  requestDate: string;           // "2026-05-10" (DateOnly)
  hoursRequested: number;
  reason: string | null;
  status: RequestStatus;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
}

// ── Dashboard ────────────────────────────────────────────────
// Matches: AdminDashboardDto, SupervisorDashboardDto etc.

export interface AdminDashboardDto {
  totalActiveEmployees: number;
  totalActiveBranches: number;
  totalActiveJobs: number;
  pendingLeaveRequests: number;
  pendingOvertimeRequests: number;
  expiringDocumentsCount: number;
  todayAttendance: AttendanceSnapshotDto;
  jobsByStatus: JobStatusSummaryDto[];
  pendingRequests: PendingRequestDto[];
  expiryAlerts: ExpiryAlertDto[];
  activeEmployees: ActiveEmployeeDto[];
  upcomingJobs: UpcomingJobDto[];
  generatedAt: string;
}

export interface AttendanceSnapshotDto {
  date: string;
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  late: number;
  absent: number;
  offlineSynced: number;
}

export interface JobStatusSummaryDto {
  statusId: string;
  statusName: string;
  colorCode: string;
  count: number;
}

export interface PendingRequestDto {
  id: string;
  type: 'Leave' | 'Overtime';
  employeeName: string;
  employeeCode: string;
  details: string;
  submittedAt: string;
}

export interface ExpiryAlertDto {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  documentType: 'Visa' | 'Passport' | 'EmiratesId';
  expiryDate: string;
  daysLeft: number;
}

export interface ActiveEmployeeDto {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  checkInTime: string;
  latitude: number | null;
  longitude: number | null;
}

export interface UpcomingJobDto {
  id: string;
  jobNumber: string;
  customerName: string;
  address: string | null;
  priorityLabel: string;
  assignedEmployeeName: string | null;
  scheduledAt: string;
}

// ── Lookups ──────────────────────────────────────────────────
// Used in dropdowns throughout the UI

export interface DropdownItem {
  id: string;
  label: string;
}

export interface BranchDropdownDto extends DropdownItem {}
export interface DepartmentDropdownDto extends DropdownItem {}
export interface PositionDropdownDto extends DropdownItem {}
export interface EmployeeDropdownDto extends DropdownItem {}

export interface JobStatusDropdownDto extends DropdownItem {
  colorCode: string;
  displayOrder: number;
}

export interface JobTypeDropdownDto extends DropdownItem {
  estimatedDurationMins: number;
}

export interface LeaveTypeDropdownDto extends DropdownItem {
  maxDaysPerYear: number;
  isPaid: boolean;
}

// ── Org Structure ────────────────────────────────────────────

export interface BranchDto {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
}

export interface UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ── Utility types ────────────────────────────────────────────

// Used for sorting in tables
export type SortDir = 'asc' | 'desc';

// Used for filter state in list pages
export interface PaginationState {
  page: number;
  pageSize: number;
}
