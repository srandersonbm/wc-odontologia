export interface AuthUser {
  id: number;
  role: 'DENTIST';
  name: string;
  email: string;
  specialty?: string;
  color?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  stampName?: string;
  croNumber?: string;
  croUf?: string;
  signatureDataUrl?: string | null;
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
  email?: string;
  phone?: string;
  birthDate?: string;
  rg?: string;
  cpf?: string;
  profession?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: string;
}

export interface ProcedureType {
  id: number;
  name: string;
  color: string;
  defaultDurationMin: number;
}

export interface PlanItem {
  id: number;
  title: string;
  status: 'PENDING' | 'SCHEDULED' | 'DONE';
  scheduledDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  priceCents: number;
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
  completedAt?: string | null;
  patientId?: number;
  patientName?: string;
  dentistId: number;
  dentistName: string;
  items: PlanItem[];
  totalItems: number;
  doneItems: number;
  totalCents: number;
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

export interface PendingItem {
  id: number;
  title: string;
  status: 'PENDING' | 'SCHEDULED' | 'DONE';
  scheduledDate?: string | null;
  startTime?: string | null;
  procedureName?: string;
  procedureColor?: string;
  planId: number;
  planTitle: string;
  dentistId: number;
  dentistName: string;
  patientId: number;
  patientName: string;
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

export type SignedDocumentType = 'ANAMNESIS' | 'TREATMENT_PLAN' | 'TERMO' | 'ATESTADO';

export interface SignedDocument {
  id: number;
  planId?: number | null;
  type: SignedDocumentType;
  fileName: string;
  uploadedAt: string;
}

export interface Anamnesis {
  id: number;
  data: AnamnesisData;
  createdAt: string;
  updatedAt: string;
}

export interface AnamnesisData {
  queixaPrincipal?: string;
  ultimaConsulta?: string;
  ansiedadeTratamento?: 'sim' | 'nao';
  escovacaoPorDia?: string;
  usaFioDental?: 'sim' | 'nao';
  sangramentoGengival?: 'sim' | 'nao';
  bruxismo?: 'nao' | 'diurno' | 'noturno';
  usaProtese?: 'sim' | 'nao';
  usaProteseQual?: string;
  jaFezCanal?: 'sim' | 'nao';
  sobCuidadosMedicos?: 'sim' | 'nao';
  sobCuidadosMedicosMotivo?: string;
  tomaMedicamento?: 'sim' | 'nao';
  tomaMedicamentoQual?: string;
  condicoes?: string[];
  outraCondicao?: string;
  bebidasAlcoolicas?: 'sim' | 'nao';
  fumante?: 'sim' | 'nao';
  fumanteQuantos?: string;
  nauseasFrequentes?: 'sim' | 'nao';
  salivacaoAbundante?: 'sim' | 'nao';
  faltaArFrequente?: 'sim' | 'nao';
  problemasHemorragicos?: 'sim' | 'nao';
  problemasCicatrizacao?: 'sim' | 'nao';
  malEstarAnestesico?: 'sim' | 'nao';
  tornozelosIncham?: 'sim' | 'nao';
  tornozelosIncham_quando?: string;
  alergias?: 'sim' | 'nao';
  alergiasQuais?: string;
  gravida?: 'sim' | 'nao';
  gravidaMeses?: string;
  amamentando?: 'sim' | 'nao';
  observacoes?: string;
}
