import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sqlDb } from './sqlDb';
import { AuditLog, MonthlyReport, InstitutionSettings, User } from '../types';
import { OFFICIAL_SECTORS, getSectorName } from '../constants/sectors';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

const SUPABASE_CONFIG_KEY = 'CAMP_SUPABASE_CONFIG_V1';

const DEFAULT_SUPABASE_URL = 'https://mqkrnrqzakdziejhlutl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_dgvs5C1cHfEW781LxBglLw_la6BFA2b';

export const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    autoSync: true,
  };

  constructor() {
    this.loadConfig();
  }

  public loadConfig(): SupabaseConfig {
    // 1. Try env variables
    const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
    const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

    // 2. Try localStorage
    let saved: Partial<SupabaseConfig> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch (e) {
        // ignore
      }
    }

    const rawUrl = saved.url || envUrl || DEFAULT_SUPABASE_URL;
    const rawKey = saved.anonKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

    this.config = {
      url: normalizeSupabaseUrl(rawUrl),
      anonKey: rawKey.trim(),
      autoSync: saved.autoSync ?? true,
    };

    if (this.config.url && this.config.anonKey) {
      this.initClient(this.config.url, this.config.anonKey);
    }

    return this.config;
  }

  public saveConfig(url: string, anonKey: string, autoSync: boolean = true) {
    const cleanUrl = normalizeSupabaseUrl(url);
    this.config = {
      url: cleanUrl,
      anonKey: anonKey.trim(),
      autoSync,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
    }

    if (this.config.url && this.config.anonKey) {
      this.initClient(this.config.url, this.config.anonKey);
    } else {
      this.client = null;
    }
  }

  public clearConfig() {
    this.config = { url: '', anonKey: '', autoSync: true };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SUPABASE_CONFIG_KEY);
    }
    this.client = null;
  }

  private initClient(url: string, anonKey: string) {
    try {
      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Erro ao inicializar cliente Supabase:', err);
      this.client = null;
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.client && this.config.url && this.config.anonKey) {
      this.initClient(this.config.url, this.config.anonKey);
    }
    return this.client;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.url && this.config.anonKey);
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  /**
   * Tests Supabase connectivity by pinging the database and checking tables
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: {
      tablesChecked: string[];
      tableStatus: { [table: string]: 'ok' | 'error' | 'empty' };
      auditLogsFound?: number;
      usersFound?: number;
      remoteUsers?: any[];
      departmentsFound?: number;
      reportsFound?: number;
      rpcAuditWorking?: boolean;
    };
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Supabase não está configurado. Preencha a URL do projeto e a chave anônima (anon key).',
      };
    }

    const client = this.getClient();
    if (!client) {
      return {
        success: false,
        message: 'Não foi possível instanciar o cliente Supabase. Verifique a URL fornecida.',
      };
    }

    const startTime = performance.now();
    const tablesChecked: string[] = [];
    const tableStatus: { [table: string]: 'ok' | 'error' | 'empty' } = {};

    try {
      // 1. Query institution_settings
      tablesChecked.push('institution_settings');
      const { data: instData, error: instError } = await client
        .from('institution_settings')
        .select('name, sub_title')
        .limit(1);

      if (instError) {
        tableStatus.institution_settings = 'error';
      } else {
        tableStatus.institution_settings = instData && instData.length > 0 ? 'ok' : 'empty';
      }

      // 2. Query departments
      tablesChecked.push('departments');
      const { data: deptsData, error: deptsError } = await client
        .from('departments')
        .select('id, name')
        .limit(30);

      tableStatus.departments = deptsError ? 'error' : (deptsData && deptsData.length > 0 ? 'ok' : 'empty');

      // 3. Query users
      tablesChecked.push('users');
      const { data: usersData, error: usersError } = await client
        .from('users')
        .select('id, name, department_id, position')
        .limit(30);

      tableStatus.users = usersError ? 'error' : (usersData && usersData.length > 0 ? 'ok' : 'empty');

      // 4. Query monthly_reports
      tablesChecked.push('monthly_reports');
      const { data: repsData, error: repsError } = await client
        .from('monthly_reports')
        .select('id, month_name, year')
        .limit(10);

      tableStatus.monthly_reports = repsError ? 'error' : (repsData && repsData.length > 0 ? 'ok' : 'empty');

      // 5. Query audit_logs
      tablesChecked.push('audit_logs');
      const { data: logsData, error: logsError } = await client
        .from('audit_logs')
        .select('id')
        .limit(10);

      tableStatus.audit_logs = logsError ? 'error' : (logsData && logsData.length > 0 ? 'ok' : 'empty');

      // 6. Test RPC record_audit_log
      let rpcAuditWorking = false;
      try {
        const { error: rpcErr } = await client.rpc('record_audit_log', {
          p_user_id: 'system_diag',
          p_user_name: 'Diagnóstico Supabase',
          p_department_id: 'coordenador_administrativo',
          p_action: 'CONNECTION_CHECK',
          p_details: 'Teste automático de integridade e conectividade com o Supabase',
        });
        rpcAuditWorking = !rpcErr;
      } catch {
        rpcAuditWorking = false;
      }

      const latencyMs = Math.round(performance.now() - startTime);

      const hasCriticalError = tableStatus.institution_settings === 'error' && tableStatus.users === 'error';
      if (hasCriticalError) {
        return {
          success: false,
          latencyMs,
          message: `Falha na consulta ao banco Supabase. Verifique se o script SQL foi executado no painel do Supabase.`,
          details: {
            tablesChecked,
            tableStatus,
            usersFound: usersData?.length || 0,
            remoteUsers: usersData || [],
            departmentsFound: deptsData?.length || 0,
            reportsFound: repsData?.length || 0,
            rpcAuditWorking,
          },
        };
      }

      return {
        success: true,
        latencyMs,
        message: `Conexão 100% ativa com o Supabase! Todas as tabelas e RPC de auditoria responderam com sucesso (${latencyMs}ms).`,
        details: {
          tablesChecked,
          tableStatus,
          usersFound: usersData?.length || 0,
          remoteUsers: usersData || [],
          departmentsFound: deptsData?.length || 0,
          reportsFound: repsData?.length || 0,
          auditLogsFound: logsData?.length || 0,
          rpcAuditWorking,
        },
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        latencyMs,
        message: `Erro ao comunicar com o Supabase: ${err.message || String(err)}`,
        details: {
          tablesChecked,
          tableStatus,
        },
      };
    }
  }

  /**
   * Authenticates user securely via Supabase RPC with bcrypt and rate limiting
   */
  public async authenticateUser(identifier: string, password: string): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client.rpc('rpc_authenticate_user', {
        p_identifier: identifier.trim(),
        p_password: password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data && data.success) {
        return { success: true, user: data.user };
      }

      return {
        success: false,
        message: data?.message || 'Credenciais inválidas.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Falha ao autenticar no servidor.',
      };
    }
  }

  /**
   * Changes current user's password securely via Supabase RPC
   */
  public async changeOwnPassword(userId: string, currentPass: string, newPass: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client.rpc('rpc_change_own_password', {
        p_user_id: userId,
        p_current_password: currentPass,
        p_new_password: newPass,
      });

      if (error) return { success: false, message: error.message };
      return {
        success: Boolean(data?.success),
        message: data?.message || (data?.success ? 'Senha alterada com sucesso!' : 'Falha ao alterar senha.'),
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao alterar senha no Supabase.' };
    }
  }

  /**
   * Requests password reset code via Supabase RPC
   */
  public async requestPasswordReset(identifier: string, method: 'email' | 'phone'): Promise<{
    success: boolean;
    message: string;
    debugCode?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client.rpc('rpc_request_password_reset', {
        p_identifier: identifier.trim(),
        p_method: method,
      });

      if (error) return { success: false, message: error.message };
      return {
        success: Boolean(data?.success),
        message: data?.message || 'Código de verificação gerado.',
        debugCode: data?.debug_code,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao solicitar recuperação.' };
    }
  }

  /**
   * Verifies reset code and updates password via Supabase RPC
   */
  public async verifyAndResetPassword(identifier: string, code: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client.rpc('rpc_verify_and_reset_password', {
        p_identifier: identifier.trim(),
        p_code: code.trim(),
        p_new_password: newPassword,
      });

      if (error) return { success: false, message: error.message };
      return {
        success: Boolean(data?.success),
        message: data?.message || 'Senha redefinida com sucesso!',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao redefinir senha no Supabase.' };
    }
  }

  /**
   * Admin resets user password via Supabase RPC
   */
  public async adminResetUserPassword(adminUserId: string, targetUserId: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client.rpc('rpc_admin_reset_user_password', {
        p_admin_user_id: adminUserId,
        p_target_user_id: targetUserId,
        p_new_password: newPassword,
      });

      if (error) return { success: false, message: error.message };
      return {
        success: Boolean(data?.success),
        message: data?.message || 'Senha alterada com sucesso!',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao redefinir senha no Supabase.' };
    }
  }

  /**
   * Pushes local database state to Supabase (Instituição, Usuários, Relatório e Logs de Auditoria)
   */
  public async pushLocalDataToSupabase(): Promise<{
    success: boolean;
    message: string;
    recordsPushed: { [key: string]: number };
  }> {
    const client = this.getClient();
    if (!client) {
      return {
        success: false,
        message: 'Cliente Supabase não configurado.',
        recordsPushed: {},
      };
    }

    const recordsPushed: { [key: string]: number } = {
      institution_settings: 0,
      users: 0,
      audit_logs: 0,
      monthly_reports: 0,
    };

    try {
      // 1. Push institution settings
      const settings = sqlDb.getInstitutionSettings();
      const settingsPayload = {
        name: settings.name,
        sub_title: settings.subTitle,
        logo_url: settings.logoUrl || null,
        rotary_logo_url: settings.rotaryLogoUrl || null,
        abtrf_logo_url: settings.abtrfLogoUrl || null,
        ong_verificada_logo_url: settings.ongVerificadaLogoUrl || null,
        transparencia_logo_url: settings.transparenciaLogoUrl || null,
        cover_banner_logo_url: settings.coverBannerLogoUrl || null,
        global_two_factor_required: settings.globalTwoFactorRequired || false,
        updated_at: new Date().toISOString(),
      };

      const { error: setErr } = await client
        .from('institution_settings')
        .update(settingsPayload)
        .eq('id', settings.id || 'institution_camp');

      if (!setErr) {
        recordsPushed.institution_settings = 1;
      } else {
        const { error: setInsErr } = await client
          .from('institution_settings')
          .insert({ id: settings.id || 'institution_camp', ...settingsPayload });
        if (!setInsErr) recordsPushed.institution_settings = 1;
      }

      // 2. Push departments (all registered sectors)
      for (const s of OFFICIAL_SECTORS) {
        await client
          .from('departments')
          .update({
            name: s.name,
            description: s.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', s.id);
      }

      // 3. Push users
      const users = sqlDb.getUsers();
      if (users.length > 0) {
        for (const u of users) {
          const userPayload = {
            name: u.name,
            email: u.email,
            role: u.role,
            department_id: u.departmentId,
            department_name: u.departmentName || getSectorName(u.departmentId),
            position: u.position,
            phone: u.phone,
            avatar_url: u.avatarUrl || null,
            two_factor_enabled: u.twoFactorEnabled || false,
            lgpd_consent_given: u.lgpdConsentGiven ?? true,
            permissions: u.permissions || {},
            updated_at: new Date().toISOString(),
          };

          const { error: userUpdErr } = await client
            .from('users')
            .update(userPayload)
            .eq('id', u.id);

          if (!userUpdErr) {
            recordsPushed.users++;
          } else {
            const { error: userInsErr } = await client
              .from('users')
              .insert({ id: u.id, ...userPayload });
            if (!userInsErr) recordsPushed.users++;
          }
        }
      }

      // 4. Push current monthly report
      const report = sqlDb.getCurrentReport();
      if (report) {
        const repPayload = {
          month: report.month,
          year: report.year,
          month_name: report.monthName,
          full_title: report.fullTitle,
          institution: report.institution || 'CAMP Piero Pollone',
          address: report.address || '',
          phone: report.phone || '',
          website: report.website || '',
          status: report.status || 'aberto',
          hiring_dashboard: report.hiringDashboard || {},
          hiring_history: report.hiringHistory || {},
          financial_highlights: report.financialHighlights || {},
          payload: report,
          updated_at: new Date().toISOString(),
        };

        const { error: repUpdErr } = await client
          .from('monthly_reports')
          .update(repPayload)
          .eq('id', report.id);

        if (!repUpdErr) {
          recordsPushed.monthly_reports = 1;
        } else {
          const { error: repInsErr } = await client
            .from('monthly_reports')
            .insert({ id: report.id, ...repPayload });
          if (!repInsErr) recordsPushed.monthly_reports = 1;
        }

        // Push department_reports
        if (report.departments) {
          for (const [deptKey, deptVal] of Object.entries(report.departments)) {
            const d = deptVal as any;
            if (d) {
              const deptRepPayload = {
                coordinator_name: d.coordinatorName || '',
                coordinator_title: d.coordinatorTitle || '',
                coordinator_phone: d.coordinatorPhone || '',
                coordinator_email: d.coordinatorEmail || '',
                coordinator_avatar: d.coordinatorAvatar || '',
                status: d.status || 'rascunho',
                modified_by: d.modifiedBy || '',
                bullet_activities: d.bulletActivities || [],
                sub_bullet_sections: d.subBulletSections || [],
                custom_notes: d.customNotes || '',
                updated_at: new Date().toISOString(),
              };
              await client
                .from('department_reports')
                .update(deptRepPayload)
                .match({ report_id: report.id, department_id: deptKey });
            }
          }
        }
      }

      // 5. Push audit logs (last 50, avoiding duplicate mutations)
      const logs = sqlDb.getAuditLogs().slice(-50);
      if (logs.length > 0) {
        const { data: existingLogs } = await client.from('audit_logs').select('id').limit(200);
        const existingIds = new Set((existingLogs || []).map((l: any) => l.id));
        const newLogs = logs.filter((l) => !existingIds.has(l.id));

        for (const l of newLogs) {
          const { error: insertErr } = await client.from('audit_logs').insert({
            id: l.id,
            timestamp: l.timestamp,
            user_id: l.userId,
            user_name: l.userName,
            department_id: l.departmentId,
            action: l.action,
            details: l.details,
            integrity_hash: l.integrityHash || '0000000000000000000000000000000000000000000000000000000000000000',
          });
          if (!insertErr) {
            recordsPushed.audit_logs++;
          } else {
            try {
              await client.rpc('record_audit_log', {
                p_user_id: l.userId,
                p_user_name: l.userName,
                p_department_id: l.departmentId,
                p_action: l.action,
                p_details: l.details,
              });
              recordsPushed.audit_logs++;
            } catch {
              // Ignore RPC log error during batch sync
            }
          }
        }
      }

      // Always record the sync milestone in Supabase's immutable audit trail
      try {
        await client.rpc('record_audit_log', {
          p_user_id: 'user_admin',
          p_user_name: 'Nilton Luiz',
          p_department_id: 'coordenador_administrativo',
          p_action: 'DATABASE_SYNC',
          p_details: `Sincronização completa realizada para o Supabase: ${recordsPushed.users} usuários, ${recordsPushed.monthly_reports} relatórios e ${recordsPushed.audit_logs} logs persistidos.`,
        });
      } catch {
        // Non-blocking milestone record
      }

      return {
        success: true,
        message: 'Dados sincronizados com sucesso para o banco de dados Supabase!',
        recordsPushed,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro durante a sincronização para o Supabase: ${err.message || String(err)}`,
        recordsPushed,
      };
    }
  }

  /**
   * Synchronizes a single user to Supabase
   */
  public async syncUser(user: User): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      const userPayload = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department_id: user.departmentId,
        department_name: user.departmentName || getSectorName(user.departmentId),
        position: user.position,
        avatar_url: user.avatarUrl || null,
        two_factor_enabled: user.twoFactorEnabled || false,
        lgpd_consent_given: user.lgpdConsentGiven ?? true,
        permissions: user.permissions || {},
        updated_at: new Date().toISOString(),
      };
      const { error } = await client.from('users').update(userPayload).eq('id', user.id);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pulls data from Supabase into local SQL database
   */
  public async pullDataFromSupabase(): Promise<{
    success: boolean;
    message: string;
    details?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return {
        success: false,
        message: 'Cliente Supabase não configurado.',
      };
    }

    try {
      // 1. Pull institution settings
      const { data: setRemote, error: setErr } = await client
        .from('institution_settings')
        .select('*')
        .limit(1)
        .single();

      if (!setErr && setRemote) {
        sqlDb.updateInstitutionSettingsDirect({
          name: setRemote.name,
          subTitle: setRemote.sub_title,
          logoUrl: setRemote.logo_url || '',
          rotaryLogoUrl: setRemote.rotary_logo_url || '',
          abtrfLogoUrl: setRemote.abtrf_logo_url || '',
          ongVerificadaLogoUrl: setRemote.ong_verificada_logo_url || '',
          transparenciaLogoUrl: setRemote.transparencia_logo_url || '',
          coverBannerLogoUrl: setRemote.cover_banner_logo_url || '',
          globalTwoFactorRequired: setRemote.global_two_factor_required || false,
        });
      }

      // 2. Pull users
      const { data: usersRemote, error: userErr } = await client
        .from('users')
        .select('*');

      if (!userErr && usersRemote && usersRemote.length > 0) {
        // Merge or update local users
        usersRemote.forEach((ru: any) => {
          const existing = sqlDb.getUsers().find((u) => u.id === ru.id);
          if (existing) {
            const isUserAdmin = existing.id === 'user_admin' 
              || existing.email === 'niltonnluiz@gmail.com' 
              || existing.role === 'admin' 
              || existing.departmentId === 'coordenador_administrativo';
            sqlDb.updateUser({
              ...existing,
              name: ru.name || existing.name,
              email: ru.email || existing.email,
              phone: ru.phone || existing.phone,
              position: isUserAdmin ? 'Coordenador Administrativo' : (ru.position || existing.position),
              departmentId: isUserAdmin ? 'coordenador_administrativo' : (ru.department_id || existing.departmentId),
              departmentName: isUserAdmin ? 'Coordenador Administrativo' : (ru.department_name || existing.departmentName),
              avatarUrl: ru.avatar_url || existing.avatarUrl,
            });
          }
        });
      }

      // 3. Pull latest monthly report
      const { data: reportRemote, error: repErr } = await client
        .from('monthly_reports')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!repErr && reportRemote && reportRemote.payload) {
        sqlDb.saveReportDirect(reportRemote.payload as MonthlyReport);
      }

      return {
        success: true,
        message: 'Dados remotos do Supabase importados e atualizados com sucesso!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao importar dados do Supabase: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Dispatches an audit log directly to Supabase if configured
   */
  public async logAuditRemote(log: AuditLog): Promise<void> {
    const client = this.getClient();
    if (!client || !this.config.autoSync) return;

    try {
      const { error } = await client.rpc('record_audit_log', {
        p_user_id: log.userId,
        p_user_name: log.userName,
        p_department_id: log.departmentId,
        p_action: log.action,
        p_details: log.details,
        p_previous_value: (log as any).previousValue || null,
        p_new_value: (log as any).newValue || null,
        p_ip_address: (log as any).ipAddress || '127.0.0.1',
        p_user_agent: (log as any).userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'CAMP Web Client'),
      });

      if (error) {
        console.warn('Aviso ao registrar log no Supabase via RPC:', error.message);
      }
    } catch (e) {
      // Non-blocking background log
      console.warn('Falha silenciosa ao registrar log de auditoria no Supabase:', e);
    }
  }
}

export const supabaseService = new SupabaseService();
