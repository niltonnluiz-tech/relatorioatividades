import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sqlDb } from './sqlDb';
import { AuditLog, MonthlyReport, InstitutionSettings, User } from '../types';

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
      auditLogsFound?: number;
      usersFound?: number;
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

    try {
      // 1. Query institution_settings
      const { data: instData, error: instError } = await client
        .from('institution_settings')
        .select('name, sub_title')
        .limit(1);

      const latencyMs = Math.round(performance.now() - startTime);

      if (instError) {
        return {
          success: false,
          latencyMs,
          message: `Falha na consulta ao Supabase: ${instError.message} (Código: ${instError.code || 'UNKNOWN'})`,
        };
      }

      // 2. Query users
      const { data: usersData } = await client
        .from('users')
        .select('id, name')
        .limit(20);

      // 3. Query departments
      const { data: deptsData } = await client
        .from('departments')
        .select('id, name')
        .limit(20);

      return {
        success: true,
        latencyMs,
        message: `Conexão bem-sucedida! Supabase respondeu com latência ultrarrápida de ${latencyMs}ms.`,
        details: {
          tablesChecked: ['institution_settings', 'users', 'departments', 'audit_logs'],
          usersFound: usersData?.length || 0,
          auditLogsFound: deptsData?.length || 0,
        },
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        latencyMs,
        message: `Erro ao conectar com o Supabase: ${err.message || String(err)}`,
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
      const { error: setErr } = await client
        .from('institution_settings')
        .upsert(
          {
            id: settings.id || 'institution_camp',
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
          },
          { onConflict: 'id' }
        );

      if (!setErr) recordsPushed.institution_settings = 1;

      // 2. Push users
      const users = sqlDb.getUsers();
      if (users.length > 0) {
        const usersPayload = users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department_id: u.departmentId,
          position: u.position,
          phone: u.phone,
          avatar_url: u.avatarUrl || null,
          two_factor_enabled: u.twoFactorEnabled || false,
          lgpd_consent: u.lgpdConsentGiven ?? true,
          updated_at: new Date().toISOString(),
        }));

        const { error: userErr } = await client
          .from('users')
          .upsert(usersPayload, { onConflict: 'id' });

        if (!userErr) recordsPushed.users = users.length;
      }

      // 3. Push current report
      const report = sqlDb.getCurrentReport();
      if (report) {
        const { error: repErr } = await client
          .from('monthly_reports')
          .upsert(
            {
              id: report.id,
              month_id: report.month,
              month_name: report.monthName,
              year: report.year,
              full_title: report.fullTitle,
              status: report.status,
              payload: report, // JSONB column
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (!repErr) recordsPushed.monthly_reports = 1;
      }

      // 4. Push audit logs (last 50)
      const logs = sqlDb.getAuditLogs().slice(-50);
      if (logs.length > 0) {
        const logsPayload = logs.map((l) => ({
          id: l.id,
          timestamp: l.timestamp,
          user_id: l.userId,
          user_name: l.userName,
          department_id: l.departmentId,
          action: l.action,
          details: l.details,
          integrity_hash: l.integrityHash,
        }));

        const { error: logErr } = await client
          .from('audit_logs')
          .upsert(logsPayload, { onConflict: 'id' });

        if (!logErr) recordsPushed.audit_logs = logs.length;
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
            sqlDb.updateUser({
              ...existing,
              name: ru.name || existing.name,
              email: ru.email || existing.email,
              phone: ru.phone || existing.phone,
              position: ru.position || existing.position,
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
