export type Role = "ADMIN" | "DOCTOR" | "RECEPTIONIST" | "PHARMACIST";

export interface Tenant {
  id: string;
  name: string;
  document: string;
  active: boolean;
}

export interface LoginDto {
  email: string;
  passwordHash: string; // Plain password for input
}

export interface RegisterTenantDto {
  email: string;
  passwordHash: string; // Plain password
  name: string;      // Username
  tenantName: string;
  document: string;
}
