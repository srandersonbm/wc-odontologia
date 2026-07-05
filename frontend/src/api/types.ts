export type Role = 'DENTIST' | 'PATIENT';

export interface AuthUser {
  id: number;
  role: Role;
  name: string;
  email: string;
  specialty?: string;
  color?: string;
  phone?: string;
  birth_date?: string;
}

export interface Dentist {
  id: number;
  name: string;
  email: string;
  specialty?: string;
  color: string;
}

export interface Patient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  createdAt: string;
}

export interface ProcedureType {
  id: number;
  name: string;
  color: string;
  defaultDurationMin: number;
}

export interface TaskCategory {
  id: number;
  name: string;
  color: string;
}

export interface OfficeTask {
  id: number;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  dentistId?: number | null;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  dentistName?: string;
}

export interface PlanItem {
  id: number;
  title: string;
  status: 'PENDING' | 'SCHEDULED' | 'DONE';
  scheduledDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  orderIndex: number;
  procedureTypeId?: number | null;
  procedureName?: string | null;
  procedureColor?: string | null;
}

export interface TreatmentPlan {
  id: number;
  title: string;
  notes?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  patientId?: number;
  patientName?: string;
  dentistId: number;
  dentistName: string;
  items: PlanItem[];
  progress: number;
  totalItems: number;
  doneItems: number;
}

export interface Appointment {
  id: number;
  title: string;
  status: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  procedureName?: string;
  procedureColor?: string;
  dentistName?: string;
  dentistId?: number;
  patientId?: number;
  patientName?: string;
  planId: number;
}

export interface DashboardData {
  patientCount: number;
  pendingProcedures: number;
  todayCount: number;
  tomorrowCount: number;
  weekCount: number;
  upcoming: Array<{
    id: number;
    title: string;
    date: string;
    startTime?: string;
    patientName: string;
    dentistName: string;
    kind: string;
  }>;
}

export interface PatientDashboardData {
  nextAppointment: {
    id: number;
    title: string;
    date: string;
    startTime?: string;
    dentistName: string;
    procedureName?: string;
  } | null;
  activePlanCount: number;
}

export interface CancelNotice {
  id: number;
  reason: string;
  createdAt: string;
  planItemId: number;
  itemTitle: string;
  scheduledDate: string;
  patientName: string;
}

export interface Unavailability {
  id: number;
  date: string;
  reason?: string;
  patientName?: string;
  patientId?: number;
}
