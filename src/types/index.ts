/**
 * Relatório Gerencial CAMP Piero Pollone - Types and Interfaces
 */

export type DepartmentId = 
  | 'geral'
  | 'contratados'
  | 'rh'
  | 'financeiro'
  | 'captacao'
  | 'ensino'
  | 'pedagogico'
  | 'psicologia_social'
  | 'psicologia'
  | 'social'
  | 'limpeza'
  | 'projetos'
  | 'ti'
  | 'estagio'
  | 'marketing'
  | 'manutencao'
  | 'gerencia_geral'
  | 'coordenador_administrativo'
  | 'cozinha'
  | 'presidencia'
  | 'admin';

export interface UserPermissions {
  canEditFinancials?: boolean;
  canExportPdf?: boolean;
  canExportExcel?: boolean;
  canManageUsers?: boolean;
  canViewAuditLogs?: boolean;
  canChangeReportStatus?: boolean;
  canManageSchedules?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordinator' | 'staff';
  departmentId: DepartmentId;
  departmentName: string;
  position: string;
  phone: string;
  avatarUrl: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  encryptionKeyFingerprint?: string;
  lgpdConsentGiven: boolean;
  lgpdConsentDate?: string;
  permissions?: UserPermissions;
  active?: boolean;
  password?: string;
}

export interface MetricItem {
  id: string;
  label: string;
  value: number | string;
  date?: string; // Data no formato YYYY-MM-DD
  unitType?: 'numeric' | 'currency' | 'percent' | 'text';
  category?: string;
  isEncrypted?: boolean;
  encryptedData?: {
    ciphertext: string;
    iv: string;
    salt: string;
    authTag?: string;
  };
  notes?: string;
}

export interface ActivityItem {
  id: string;
  description: string;
  date?: string; // Data no formato YYYY-MM-DD
  category?: string;
}

export interface DepartmentReportData {
  departmentId: DepartmentId;
  coordinatorName: string;
  coordinatorTitle: string;
  coordinatorPhone: string;
  coordinatorEmail: string;
  coordinatorAvatar: string;
  status: 'rascunho' | 'em_revisao' | 'concluido' | 'aprovado';
  lastModified: string;
  modifiedBy: string;
  // Specific sections
  metrics: MetricItem[];
  subMetrics?: {
    title: string;
    items: MetricItem[];
  }[];
  bulletActivities?: string[];
  activityItems?: ActivityItem[];
  subBulletSections?: {
    title: string;
    items: string[];
  }[];
  customNotes?: string;
}

export interface MonthHiringMetric {
  monthName: string; // e.g. "Maio 2026"
  aprendizesContratados: number;
  contratosEmProcesso: number;
  estagiarios: number;
}

export interface HiringDashboardConfig {
  displayMode: '1_previous_and_current' | '2_previous_and_current';
  currentMonth: MonthHiringMetric;
  previousMonth1: MonthHiringMetric;
  previousMonth2: MonthHiringMetric;
}

export interface MonthlyReport {
  id: string; // e.g. "2026-07"
  month: number; // 1-12
  year: number; // e.g. 2026
  monthName: string; // e.g. "Julho"
  fullTitle: string; // e.g. "Julho de 2026"
  institution: string;
  address: string;
  phone: string;
  website: string;
  status: 'aberto' | 'em_fechamento' | 'fechado' | 'publicado';
  departments: Partial<Record<DepartmentId, DepartmentReportData>> & Record<string, any>;
  hiringDashboard?: HiringDashboardConfig;
  hiringHistory: {
    maio: { aprendizes: number; estagiarios: number };
    junho: { aprendizes: number; estagiarios: number };
    julho: { aprendizes: number; estagiarios: number };
  };
  financialHighlights?: {
    faturamento: number;
    doacoes: number;
    despesasTotal: number;
    taxaAdm: number;
    estagio: number;
    budgetPrevisto: number;
    budgetRealizado: number;
    inadimplentesTexto: string;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  departmentId: DepartmentId;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'USER_CREATE'
    | 'USER_UPDATE'
    | 'USER_ADMIN_EDIT'
    | 'USER_DELETE'
    | 'USER_PERMISSION_UPDATE'
    | 'USER_PROFILE_UPDATE'
    | 'REPORT_MONTH_CHANGE'
    | 'REPORT_PERIOD_CHANGE'
    | 'HIRING_DASHBOARD_UPDATE'
    | 'ITEM_ADD_TOPIC'
    | 'ITEM_ADD_METRIC'
    | '2FA_VERIFY'
    | '2FA_ENABLE'
    | 'METRIC_UPDATE'
    | 'FINANCIAL_ENCRYPT'
    | 'BULLET_ACTIVITY_UPDATE'
    | 'STATUS_CHANGE'
    | 'EXPORT_PDF'
    | 'EXPORT_EXCEL'
    | 'EXCEL_EXPORT'
    | 'AUTO_EXPORT_RUN'
    | 'LGPD_CONSENT'
    | 'LGPD_DATA_EXPORT'
    | 'AUDIT_LOG_EXPORT'
    | 'NOTIFICATION_SEND'
    | 'BRANDING_UPDATE'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_COMPLETE'
    | '2FA_TOGGLE'
    | 'SQL_QUERY_EXEC';
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  userAgent: string;
  integrityHash: string; // Tamper-evident SHA-256 hash chaining
}

export interface InstitutionSettings {
  id: string;
  name: string;
  institutionName?: string;
  subTitle: string;
  subtitle?: string;
  reportSubtitle?: string;
  cnpj?: string;
  logoUrl?: string; // Custom main CAMP logo (appears in navbar, cover banner, and badge 1)
  rotaryLogoUrl?: string; // Custom Rotary Club logo (badge 2)
  abtrfLogoUrl?: string; // Custom Selo ABTRF Empresa Cidadã (badge 3)
  ongVerificadaLogoUrl?: string; // Custom Selo ONG Verificada (badge 4)
  transparenciaLogoUrl?: string; // Custom Selo Transparência (badge 5)
  coverBannerLogoUrl?: string; // Custom Header/Cover Banner Logo
  globalTwoFactorRequired: boolean; // default false
  updatedAt?: string;
  updatedBy?: string;
}

export interface NotificationCampaign {
  id: string;
  title: string;
  message: string;
  body?: string;
  actionUrl?: string;
  channels: ('push' | 'email')[];
  priority?: 'normal' | 'alta' | 'urgente';
  targetPreference: 'all' | 'activities' | 'admin' | 'finance' | 'general';
  targetEngagement: 'all' | 'high' | 'moderate' | 'at_risk';
  scheduleWindow?: 'immediate' | 'business_hours' | 'extended' | 'custom';
  customScheduleTime?: string;
  scheduledTime?: string;
  silenceNightsAndWeekends?: boolean;
  recipientsCount: number;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'draft';
  metrics: {
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
}

export interface NotificationMetricsSummary {
  totalCampaigns: number;
  totalSent: number;
  deliveredTotal: number;
  openedTotal: number;
  clickedTotal: number;
  deliveryRate: number; // percentage e.g. 98.4%
  openRate: number; // percentage e.g. 78.2%
  clickRate: number; // percentage e.g. 41.5%
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  queue: OfflineSyncItem[];
}

export interface ExportSchedule {
  id: string;
  name: string;
  frequency: 'mensal_primeiro_dia' | 'semanal' | 'imediato';
  format: 'PDF' | 'EXCEL' | 'AMBOS';
  enabled: boolean;
  destinationEmail: string;
  lastRun?: string;
  nextRun?: string;
  status: 'ativo' | 'pausado';
}

export interface OfflineSyncItem {
  id: string;
  timestamp: string;
  action: 'UPDATE_DEPARTMENT' | 'ADD_AUDIT' | 'UPDATE_STATUS';
  payload: any;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}
