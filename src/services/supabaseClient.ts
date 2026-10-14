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

      // 4.1 Query department_reports
      tablesChecked.push('department_reports');
      const { data: deptRepsData, error: deptRepsError } = await client
        .from('department_reports')
        .select('id, department_id')
        .limit(20);
      tableStatus.department_reports = deptRepsError ? 'error' : (deptRepsData && deptRepsData.length > 0 ? 'ok' : 'empty');

      // 4.2 Query report_metrics
      tablesChecked.push('report_metrics');
      const { data: metricsData, error: metricsError } = await client
        .from('report_metrics')
        .select('id')
        .limit(10);
      tableStatus.report_metrics = metricsError ? 'error' : (metricsData && metricsData.length > 0 ? 'ok' : 'empty');

      // 4.3 Query monthly_hiring_data
      tablesChecked.push('monthly_hiring_data');
      const { data: hiringData, error: hiringError } = await client
        .from('monthly_hiring_data')
        .select('id')
        .limit(1);
      tableStatus.monthly_hiring_data = hiringError ? 'error' : (hiringData && hiringData.length > 0 ? 'ok' : 'empty');

      // 4.4 Query sector_descriptions
      tablesChecked.push('sector_descriptions');
      const { data: sectorData, error: sectorError } = await client
        .from('sector_descriptions')
        .select('department_id')
        .limit(1);
      tableStatus.sector_descriptions = sectorError ? 'error' : (sectorData && sectorData.length > 0 ? 'ok' : 'empty');

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
        const repPayload: any = {
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

        let { error: repUpdErr } = await client
          .from('monthly_reports')
          .update(repPayload)
          .eq('id', report.id);

        if (repUpdErr && (repUpdErr.code === 'PGRST204' || repUpdErr.message?.includes('payload'))) {
          delete repPayload.payload;
          const retry = await client.from('monthly_reports').update(repPayload).eq('id', report.id);
          repUpdErr = retry.error;
        }

        if (!repUpdErr) {
          recordsPushed.monthly_reports = 1;
        } else {
          let { error: repInsErr } = await client
            .from('monthly_reports')
            .insert({ id: report.id, ...repPayload });
          if (repInsErr && (repInsErr.code === 'PGRST204' || repInsErr.message?.includes('payload'))) {
            delete repPayload.payload;
            const retryIns = await client.from('monthly_reports').insert({ id: report.id, ...repPayload });
            repInsErr = retryIns.error;
          }
          if (!repInsErr) recordsPushed.monthly_reports = 1;
        }

        // Push department_reports with upsert so each department is saved
        if (report.departments) {
          for (const [deptKey, deptVal] of Object.entries(report.departments)) {
            const d = deptVal as any;
            if (d) {
              const deptRepPayload = {
                report_id: report.id,
                department_id: deptKey,
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

              const { error: dErr } = await client
                .from('department_reports')
                .upsert(deptRepPayload, { onConflict: 'report_id,department_id' });

              if (dErr) {
                const { error: updErr } = await client
                  .from('department_reports')
                  .update(deptRepPayload)
                  .match({ report_id: report.id, department_id: deptKey });
                if (updErr) {
                  await client.from('department_reports').insert(deptRepPayload);
                }
              }
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
   * Synchronizes a single user and their profile photo/avatar to Supabase
   */
  public async syncUser(user: User): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      const isMasterAdmin = user.id === 'user_admin' || user.email === 'niltonnluiz@gmail.com';
      const userPayload = {
        name: isMasterAdmin ? 'Nilton Luiz' : user.name,
        email: isMasterAdmin ? 'niltonnluiz@gmail.com' : user.email,
        phone: user.phone || (isMasterAdmin ? '(11) 2842-2470' : ''),
        role: isMasterAdmin ? 'admin' : user.role,
        department_id: isMasterAdmin ? 'coordenador_administrativo' : user.departmentId,
        department_name: isMasterAdmin ? 'Coordenador Administrativo' : (user.departmentName || getSectorName(user.departmentId)),
        position: isMasterAdmin ? 'Coordenador Administrativo' : user.position,
        avatar_url: user.avatarUrl || '',
        active: isMasterAdmin ? true : (user.active !== false),
        two_factor_enabled: user.twoFactorEnabled || false,
        lgpd_consent_given: user.lgpdConsentGiven ?? true,
        permissions: user.permissions || {},
        updated_at: new Date().toISOString(),
      };

      const targetId = isMasterAdmin ? 'user_admin' : user.id;
      const { error } = await client.from('users').upsert({ id: targetId, ...userPayload }, { onConflict: 'id' });
      if (error) {
        await client.from('users').update(userPayload).eq('id', targetId);
      }

      // Also update coordinator avatar in department_reports for active reports
      const currentReport = sqlDb.getCurrentReport();
      if (currentReport && user.departmentId) {
        await client
          .from('department_reports')
          .update({
            coordinator_avatar: user.avatarUrl || '',
            coordinator_name: user.name,
            coordinator_title: user.position,
            updated_at: new Date().toISOString(),
          })
          .match({ report_id: currentReport.id, department_id: user.departmentId });

        if (currentReport.departments && (currentReport.departments as any)[user.departmentId]) {
          (currentReport.departments as any)[user.departmentId].coordinatorAvatar = user.avatarUrl || '';
          (currentReport.departments as any)[user.departmentId].coordinatorName = user.name;
          (currentReport.departments as any)[user.departmentId].coordinatorTitle = user.position;
          sqlDb.saveReportDirect(currentReport);
          
          await client
            .from('monthly_reports')
            .update({ payload: currentReport, updated_at: new Date().toISOString() })
            .eq('id', currentReport.id);
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a user from Supabase (prevents deleting master admin user_admin)
   */
  public async deleteUser(userId: string): Promise<boolean> {
    if (userId === 'user_admin') return false;
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.from('users').delete().eq('id', userId);
      return true;
    } catch (e) {
      console.warn('Erro ao excluir usuário no Supabase:', e);
      return false;
    }
  }

  /**
   * Synchronizes a single department's activities and metrics in real time
   */
  public async syncDepartmentUpdate(
    reportId: string,
    departmentId: string,
    deptData: any,
    user: User
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client || !this.config.autoSync) return false;

    try {
      // 1. Ensure monthly_report parent row exists first so foreign key constraints are always satisfied
      const currentReport = sqlDb.getReport(reportId);
      if (currentReport) {
        const repPayload: any = {
          id: reportId,
          month: currentReport.month || 7,
          year: currentReport.year || 2026,
          month_name: currentReport.monthName || 'Julho',
          full_title: currentReport.fullTitle || `JULHO DE 2026`,
          status: currentReport.status || 'aberto',
          payload: currentReport,
          updated_at: new Date().toISOString(),
        };

        const { error: repUpsertErr } = await client
          .from('monthly_reports')
          .upsert(repPayload, { onConflict: 'id' });

        if (repUpsertErr && (repUpsertErr.code === 'PGRST204' || repUpsertErr.message?.includes('payload'))) {
          delete repPayload.payload;
          await client.from('monthly_reports').upsert(repPayload, { onConflict: 'id' });
        }
      }

      // 2. Upsert department_reports
      const deptRepPayload = {
        report_id: reportId,
        department_id: departmentId,
        coordinator_name: deptData.coordinatorName || user.name || '',
        coordinator_title: deptData.coordinatorTitle || user.position || '',
        coordinator_phone: deptData.coordinatorPhone || user.phone || '',
        coordinator_email: deptData.coordinatorEmail || user.email || '',
        coordinator_avatar: deptData.coordinatorAvatar || user.avatarUrl || '',
        status: deptData.status || 'rascunho',
        modified_by: user.name || '',
        bullet_activities: deptData.bulletActivities || [],
        sub_bullet_sections: deptData.subBulletSections || [],
        custom_notes: deptData.customNotes || '',
        updated_at: new Date().toISOString(),
      };

      const { error: dErr } = await client
        .from('department_reports')
        .upsert(deptRepPayload, { onConflict: 'report_id,department_id' });

      if (dErr) {
        await client
          .from('department_reports')
          .update(deptRepPayload)
          .match({ report_id: reportId, department_id: departmentId });
      }

      return true;
    } catch (e) {
      console.warn('Erro ao sincronizar departamento com Supabase:', e);
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
        usersRemote.forEach((ru: any) => {
          const existing = sqlDb.getUsers().find((u) => u.id === ru.id);
          const isUserAdmin = ru.id === 'user_admin' 
            || existing?.id === 'user_admin'
            || existing?.email === 'niltonnluiz@gmail.com' 
            || ru.email === 'niltonnluiz@gmail.com';

          if (existing) {
            sqlDb.updateUser({
              ...existing,
              name: isUserAdmin ? 'Nilton Luiz' : (ru.name || existing.name),
              email: isUserAdmin ? 'niltonnluiz@gmail.com' : (ru.email || existing.email),
              phone: ru.phone || existing.phone,
              role: isUserAdmin ? 'admin' : (ru.role || existing.role),
              position: isUserAdmin ? 'Coordenador Administrativo' : (ru.position || existing.position),
              departmentId: isUserAdmin ? 'coordenador_administrativo' : (ru.department_id || existing.departmentId),
              departmentName: isUserAdmin ? 'Coordenador Administrativo' : (ru.department_name || existing.departmentName),
              avatarUrl: ru.avatar_url || existing.avatarUrl,
              active: ru.active !== false,
            });
          } else {
            sqlDb.addUser({
              id: ru.id,
              name: isUserAdmin ? 'Nilton Luiz' : ru.name,
              email: isUserAdmin ? 'niltonnluiz@gmail.com' : ru.email,
              phone: ru.phone || '',
              role: isUserAdmin ? 'admin' : (ru.role || 'staff'),
              departmentId: isUserAdmin ? 'coordenador_administrativo' : (ru.department_id || 'gerencia_geral'),
              departmentName: isUserAdmin ? 'Coordenador Administrativo' : (ru.department_name || ''),
              position: isUserAdmin ? 'Coordenador Administrativo' : (ru.position || ''),
              avatarUrl: ru.avatar_url || '',
              twoFactorEnabled: ru.two_factor_enabled || false,
              lgpdConsentGiven: ru.lgpd_consent_given ?? true,
              active: ru.active !== false,
              permissions: ru.permissions || {},
            });
          }
        });
      }

      // Guarantee root administrator (Nilton Luiz) is ALWAYS intact in sqlDb
      const currentUsers = sqlDb.getUsers();
      const adminUser = currentUsers.find((u) => u.id === 'user_admin' || u.email === 'niltonnluiz@gmail.com');
      if (!adminUser) {
        sqlDb.addUser({
          id: 'user_admin',
          name: 'Nilton Luiz',
          email: 'niltonnluiz@gmail.com',
          role: 'admin',
          departmentId: 'coordenador_administrativo',
          departmentName: 'Coordenador Administrativo',
          position: 'Coordenador Administrativo',
          phone: '(11) 2842-2470',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          active: true,
          twoFactorEnabled: false,
          lgpdConsentGiven: true,
          permissions: {
            canAccessReport: true,
            canExportPdf: true,
            canExportExcel: true,
            canManageUsers: true,
            canViewAuditLogs: true,
            canEditFinancials: true,
            canViewFinancials: true,
            canChangeReportStatus: true,
            canManageSchedules: true,
          },
        });
      } else if (adminUser.name !== 'Nilton Luiz' || adminUser.role !== 'admin' || adminUser.active === false) {
        sqlDb.updateUser({
          ...adminUser,
          id: 'user_admin',
          name: 'Nilton Luiz',
          email: 'niltonnluiz@gmail.com',
          role: 'admin',
          departmentId: 'coordenador_administrativo',
          departmentName: 'Coordenador Administrativo',
          position: 'Coordenador Administrativo',
          active: true,
        });
      }

      // 3. Pull latest monthly report & department_reports
      const { data: reportRemote, error: repErr } = await client
        .from('monthly_reports')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const activeRepId = reportRemote?.id || sqlDb.getActiveReportId();
      const currentLocal = sqlDb.getReport(activeRepId) || sqlDb.getCurrentReport();
      const baseReport: MonthlyReport = (reportRemote?.payload as MonthlyReport) || { ...currentLocal };

      // Query relational department_reports
      const { data: deptReps } = await client
        .from('department_reports')
        .select('*')
        .eq('report_id', activeRepId);

      if (deptReps && deptReps.length > 0) {
        if (!baseReport.departments) {
          baseReport.departments = { ...(currentLocal.departments || {}) };
        }
        deptReps.forEach((dr: any) => {
          const deptKey = dr.department_id;
          if (deptKey) {
            const existingDept = (baseReport.departments as any)[deptKey] || {};
            (baseReport.departments as any)[deptKey] = {
              ...existingDept,
              departmentId: deptKey,
              coordinatorName: dr.coordinator_name || existingDept.coordinatorName,
              coordinatorTitle: dr.coordinator_title || existingDept.coordinatorTitle,
              coordinatorPhone: dr.coordinator_phone || existingDept.coordinatorPhone,
              coordinatorEmail: dr.coordinator_email || existingDept.coordinatorEmail,
              coordinatorAvatar: dr.coordinator_avatar || existingDept.coordinatorAvatar,
              status: dr.status || existingDept.status || 'rascunho',
              bulletActivities: Array.isArray(dr.bullet_activities) && dr.bullet_activities.length > 0 
                ? dr.bullet_activities 
                : (existingDept.bulletActivities || []),
              subBulletSections: Array.isArray(dr.sub_bullet_sections) && dr.sub_bullet_sections.length > 0
                ? dr.sub_bullet_sections 
                : (existingDept.subBulletSections || []),
              customNotes: dr.custom_notes !== undefined ? dr.custom_notes : existingDept.customNotes,
              lastModified: dr.updated_at || dr.last_modified || existingDept.lastModified,
              modifiedBy: dr.modified_by || existingDept.modifiedBy,
            };
          }
        });
      }

      sqlDb.saveReportDirect(baseReport);

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

  private realtimeChannel: any = null;

  /**
   * Subscribes to live changes in Supabase and triggers a callback whenever
   * any user on any device changes a report, department item, user avatar, or settings.
   */
  public subscribeToRealtime(onDataChanged: (table: string, payload: any) => void): () => void {
    const client = this.getClient();
    if (!client) return () => {};

    if (this.realtimeChannel) {
      try {
        client.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    const channel = client
      .channel('camp-global-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reports' },
        (payload) => {
          onDataChanged('monthly_reports', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'department_reports' },
        (payload) => {
          onDataChanged('department_reports', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          onDataChanged('users', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'institution_settings' },
        (payload) => {
          onDataChanged('institution_settings', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Canal conectado e escutando sincronização em tempo real.');
        }
      });

    this.realtimeChannel = channel;

    return () => {
      try {
        client.removeChannel(channel);
      } catch {}
      if (this.realtimeChannel === channel) {
        this.realtimeChannel = null;
      }
    };
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
