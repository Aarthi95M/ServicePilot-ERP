// ============================================================
// lib/api/employees.ts
//
// All typed API functions for EmployeesController.cs
// One function per endpoint — same pattern as dashboard.ts
// ============================================================

import apiClient from './client';
import type {
  ApiResponse,
  PagedResult,
  EmployeeDto,
  EmployeeDetailDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  PagedEmployeeRequest,
  CreateTechnicianDto,
  TechnicianCreatedDto,
} from '@/lib/types';

export const employeesApi = {

  // GET /api/employees?page=1&pageSize=20&search=ahmed
  getPaged: async (params: PagedEmployeeRequest): Promise<ApiResponse<PagedResult<EmployeeDto>>> => {
    const response = await apiClient.get<ApiResponse<PagedResult<EmployeeDto>>>(
      '/employees',
      { params }
    );
    return response.data;
  },

  // GET /api/employees/{id}
  getById: async (id: string): Promise<ApiResponse<EmployeeDetailDto>> => {
    const response = await apiClient.get<ApiResponse<EmployeeDetailDto>>(`/employees/${id}`);
    return response.data;
  },

  // GET /api/employees/expiring-documents?days=30
  getExpiringDocs: async (days = 30): Promise<ApiResponse<EmployeeDetailDto[]>> => {
    const response = await apiClient.get<ApiResponse<EmployeeDetailDto[]>>(
      '/employees/expiring-documents',
      { params: { days } }
    );
    return response.data;
  },

  // POST /api/employees
  create: async (dto: CreateEmployeeDto): Promise<ApiResponse<EmployeeDto>> => {
    const response = await apiClient.post<ApiResponse<EmployeeDto>>('/employees', dto);
    return response.data;
  },

  // PUT /api/employees/{id}
  update: async (id: string, dto: UpdateEmployeeDto): Promise<ApiResponse<EmployeeDto>> => {
    const response = await apiClient.put<ApiResponse<EmployeeDto>>(`/employees/${id}`, dto);
    return response.data;
  },

  // DELETE /api/employees/{id} (soft delete — sets isActive = false)
  deactivate: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/employees/${id}`);
    return response.data;
  },

  // POST /api/employees/create-technician
  // Atomically creates Employee record + Technician user account in one call
  createTechnician: async (dto: CreateTechnicianDto): Promise<ApiResponse<TechnicianCreatedDto>> => {
    const response = await apiClient.post<ApiResponse<TechnicianCreatedDto>>(
      '/employees/create-technician',
      dto
    );
    return response.data;
  },
};
