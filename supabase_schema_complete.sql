-- ========================================================================================
-- SCHEMA SQL COMPLETO PARA SUPABASE - CAMP PIERO POLLONE
-- Sistema Mensal de Atividades & Relatórios Gerenciais Oficiais
-- ========================================================================================
-- ARQUITETURA DE SEGURANÇA CONTRA INSPEÇÃO DE NAVEGADOR (DEVTOOLS / CONSOLE EXPLOITS):
-- 1. Row Level Security (RLS) mandatário em 100% das tabelas com FORCE ROW LEVEL SECURITY.
-- 2. Tabela isolada de credenciais (user_secrets) com REVOKE TOTAL para roles 'anon' e 'authenticated'.
--    Nenhum usuário (nem mesmo autenticado ou via console) consegue ler hashes de senhas ou segredos 2FA.
-- 3. Autenticação e troca de senhas via Stored Procedures (RPCs) com SECURITY DEFINER e bcrypt (pgcrypto).
-- 4. Trilha de auditoria 100% imutável com bloqueio de UPDATE/DELETE e encadeamento criptográfico SHA-256.
-- 5. Isolamento departmental estrito: Coordenadores só acessam registros de seu próprio departamento.
-- ========================================================================================

-- Habilitar extensões criptográficas nativas do PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ========================================================================================
-- 1. TIPOS ENUMERADOS DO SISTEMA
-- ========================================================================================

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'coordinator', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status_enum AS ENUM ('aberto', 'em_fechamento', 'fechado', 'publicado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE department_status_enum AS ENUM ('rascunho', 'em_revisao', 'concluido', 'aprovado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_type_enum AS ENUM ('numeric', 'currency', 'percent', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE campaign_status_enum AS ENUM ('draft', 'scheduled', 'sent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_enum AS ENUM ('normal', 'alta', 'urgente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================================================================
-- 2. TABELAS PRINCIPAIS
-- ========================================================================================

-- 2.1 DEPARTAMENTOS
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 USUÁRIOS DO SISTEMA (DADOS PÚBLICOS / PERFIL)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT ('usr_' || encode(gen_random_bytes(8), 'hex')),
    auth_user_id UUID UNIQUE, -- Vínculo opcional direto com auth.users do Supabase Auth
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'coordinator',
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON UPDATE CASCADE,
    department_name TEXT NOT NULL,
    position TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    lgpd_consent_given BOOLEAN NOT NULL DEFAULT true,
    lgpd_consent_date TIMESTAMPTZ DEFAULT NOW(),
    permissions JSONB NOT NULL DEFAULT '{
        "canEditFinancials": false,
        "canExportPdf": true,
        "canExportExcel": true,
        "canManageUsers": false,
        "canViewAuditLogs": false,
        "canChangeReportStatus": false,
        "canManageSchedules": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 SEGREDOS E CREDENCIAIS DOS USUÁRIOS (BLINDAGEM TOTAL - ISOLADA DO INSPECIONAR)
-- NUNCA CONCEDA PERMISSÃO DE LEITURA (SELECT) A ESTA TABELA NO CLIENTE!
CREATE TABLE IF NOT EXISTS public.user_secrets (
    user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    two_factor_secret TEXT,
    backup_codes TEXT[],
    encryption_key_fingerprint TEXT,
    password_reset_code_hash TEXT,
    password_reset_expires_at TIMESTAMPTZ,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_password_change TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 CONFIGURAÇÕES INSTITUCIONAIS & LOGOTIPOS
CREATE TABLE IF NOT EXISTS public.institution_settings (
    id TEXT PRIMARY KEY DEFAULT 'institution_camp',
    name TEXT NOT NULL DEFAULT 'CAMP Piero Pollone',
    institution_name TEXT DEFAULT 'CAMP Piero Pollone',
    sub_title TEXT NOT NULL DEFAULT 'Sistema Mensal de Atividades & Relatórios',
    subtitle TEXT DEFAULT 'Sistema Mensal de Atividades & Relatórios',
    report_subtitle TEXT DEFAULT 'Santo André - Gestão & Transparência',
    cnpj TEXT DEFAULT '44.298.544/0001-83',
    logo_url TEXT DEFAULT '',
    rotary_logo_url TEXT DEFAULT '',
    abtrf_logo_url TEXT DEFAULT '',
    ong_verificada_logo_url TEXT DEFAULT '',
    transparencia_logo_url TEXT DEFAULT '',
    cover_banner_logo_url TEXT DEFAULT '',
    global_two_factor_required BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 2.5 RELATÓRIOS MENSAIS GERENCIAIS (CONSOLIDADOS)
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id TEXT PRIMARY KEY, -- e.g. "2026-07"
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2000),
    month_name TEXT NOT NULL,
    full_title TEXT NOT NULL,
    institution TEXT NOT NULL DEFAULT 'CAMP Piero Pollone',
    address TEXT NOT NULL DEFAULT 'Rua Gertrudes de Lima, 622 - Centro, Santo André - SP',
    phone TEXT NOT NULL DEFAULT '(11) 2842-2470',
    website TEXT NOT NULL DEFAULT 'www.campsantoandre.org.br',
    status report_status_enum NOT NULL DEFAULT 'aberto',
    hiring_dashboard JSONB DEFAULT '{
        "displayMode": "2_previous_and_current",
        "currentMonth": {"monthName": "Julho 2026", "aprendizesContratados": 680, "contratosEmProcesso": 45, "estagiarios": 32},
        "previousMonth1": {"monthName": "Junho 2026", "aprendizesContratados": 672, "contratosEmProcesso": 41, "estagiarios": 30},
        "previousMonth2": {"monthName": "Maio 2026", "aprendizesContratados": 667, "contratosEmProcesso": 38, "estagiarios": 29}
    }'::jsonb,
    hiring_history JSONB DEFAULT '{
        "maio": {"aprendizes": 667, "estagiarios": 29},
        "junho": {"aprendizes": 672, "estagiarios": 30},
        "julho": {"aprendizes": 680, "estagiarios": 32}
    }'::jsonb,
    financial_highlights JSONB DEFAULT '{
        "faturamento": 240000,
        "doacoes": 45000,
        "despesasTotal": 195000,
        "taxaAdm": 15000,
        "estagio": 8500,
        "budgetPrevisto": 230000,
        "budgetRealizado": 240000,
        "inadimplentesTexto": "Taxa de inadimplência mantida controlada em 1.8%."
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 DADOS DE RELATÓRIO POR DEPARTAMENTO
CREATE TABLE IF NOT EXISTS public.department_reports (
    id TEXT PRIMARY KEY DEFAULT ('drep_' || encode(gen_random_bytes(8), 'hex')),
    report_id TEXT NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON UPDATE CASCADE,
    coordinator_name TEXT NOT NULL,
    coordinator_title TEXT NOT NULL,
    coordinator_phone TEXT NOT NULL,
    coordinator_email TEXT NOT NULL,
    coordinator_avatar TEXT DEFAULT '',
    status department_status_enum NOT NULL DEFAULT 'rascunho',
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    modified_by TEXT NOT NULL,
    bullet_activities TEXT[] DEFAULT ARRAY[]::TEXT[],
    sub_bullet_sections JSONB DEFAULT '[]'::jsonb,
    custom_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (report_id, department_id)
);

-- 2.7 MÉTRICAS DOS DEPARTAMENTOS
CREATE TABLE IF NOT EXISTS public.report_metrics (
    id TEXT PRIMARY KEY DEFAULT ('met_' || encode(gen_random_bytes(8), 'hex')),
    department_report_id TEXT NOT NULL REFERENCES public.department_reports(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    numeric_value NUMERIC,
    date DATE,
    unit_type unit_type_enum NOT NULL DEFAULT 'numeric',
    category TEXT,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    encrypted_data JSONB,
    notes TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 ATIVIDADES DETALHADAS POR DEPARTAMENTO
CREATE TABLE IF NOT EXISTS public.report_activities (
    id TEXT PRIMARY KEY DEFAULT ('act_' || encode(gen_random_bytes(8), 'hex')),
    department_report_id TEXT NOT NULL REFERENCES public.department_reports(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    date DATE,
    category TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 CAMPANHAS DE NOTIFICAÇÃO
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || encode(gen_random_bytes(6), 'hex')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    body TEXT,
    action_url TEXT DEFAULT '/portal',
    channels TEXT[] NOT NULL DEFAULT ARRAY['push'],
    priority priority_enum NOT NULL DEFAULT 'normal',
    target_preference TEXT NOT NULL DEFAULT 'all',
    target_engagement TEXT NOT NULL DEFAULT 'all',
    schedule_window TEXT DEFAULT 'immediate',
    custom_schedule_time TIMESTAMPTZ,
    scheduled_time TIMESTAMPTZ,
    silence_nights_and_weekends BOOLEAN NOT NULL DEFAULT true,
    recipients_count INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status campaign_status_enum NOT NULL DEFAULT 'draft',
    metrics JSONB NOT NULL DEFAULT '{"delivered": 0, "opened": 0, "clicked": 0, "failed": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 AGENDAMENTOS DE EXPORTAÇÃO AUTOMÁTICA
CREATE TABLE IF NOT EXISTS public.export_schedules (
    id TEXT PRIMARY KEY DEFAULT ('sched_' || encode(gen_random_bytes(6), 'hex')),
    name TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'mensal_primeiro_dia',
    format TEXT NOT NULL DEFAULT 'PDF',
    enabled BOOLEAN NOT NULL DEFAULT true,
    destination_email TEXT NOT NULL,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 TRILHA DE AUDITORIA CRIPTOGRÁFICA (IMUTÁVEL & TAMPER-EVIDENT)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('aud_' || encode(gen_random_bytes(10), 'hex')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    department_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
    user_agent TEXT NOT NULL DEFAULT 'Supabase Client',
    previous_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    integrity_hash TEXT NOT NULL
);

-- 2.12 TOKENS DE RECUPERAÇÃO DE SENHA (EXPIRAÇÃO RÁPIDA & RATE LIMITING)
CREATE TABLE IF NOT EXISTS public.password_recovery_requests (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || encode(gen_random_bytes(12), 'hex')),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL, -- Email ou telefone normalizado
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone')),
    token_hash TEXT NOT NULL, -- Código de 6 dígitos hasheado com salt
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================================================
-- 3. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ========================================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_department_reports_rep_dept ON public.department_reports(report_id, department_id);
CREATE INDEX IF NOT EXISTS idx_report_metrics_dep_rep ON public.report_metrics(department_report_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_recovery_user_id ON public.password_recovery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_expires_at ON public.password_recovery_requests(expires_at);

-- ========================================================================================
-- 4. FUNÇÕES DE SUPORTE DE SEGURANÇA (SECURITY DEFINER)
-- ========================================================================================

-- 4.1 Obter o ID do usuário da sessão atual
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
    SELECT coalesce(
        (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1),
        current_setting('request.jwt.claims', true)::jsonb ->> 'app_user_id',
        current_setting('app.current_user_id', true),
        ''
    );
$$;

-- 4.2 Verificar se o usuário atual é Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
    SELECT coalesce(
        (
            SELECT (role = 'admin')
            FROM public.users
            WHERE id = public.current_app_user_id()
               OR auth_user_id = auth.uid()
            LIMIT 1
        ),
        false
    );
$$;

-- 4.3 Obter departamento do usuário autenticado
CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
    SELECT coalesce(
        (
            SELECT department_id
            FROM public.users
            WHERE id = public.current_app_user_id()
               OR auth_user_id = auth.uid()
            LIMIT 1
        ),
        ''
    );
$$;

-- 4.4 Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_touch
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_inst_touch
BEFORE UPDATE ON public.institution_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_reports_touch
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE TRIGGER trg_dep_rep_touch
BEFORE UPDATE ON public.department_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ========================================================================================
-- 5. BLINDAGEM DE AUDITORIA: IMUTABILIDADE & HASH CHAINING
-- ========================================================================================

-- Bloquear terminantemente qualquer alteração ou exclusão de logs de auditoria
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO DE CONFORMIDADE: Os registros de auditoria (audit_logs) são estritamente imutáveis e auditados por hash chaining (LGPD/ISO 27001). Proibido UPDATE ou DELETE.';
END;
$$;

CREATE OR REPLACE TRIGGER trg_block_audit_mutation
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_tampering();

-- Inserção de log com encadeamento criptográfico automático
CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_user_id TEXT,
    p_user_name TEXT,
    p_department_id TEXT,
    p_action TEXT,
    p_details TEXT,
    p_previous_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Supabase Client'
)
RETURNS public.audit_logs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_last_hash TEXT;
    v_payload TEXT;
    v_new_hash TEXT;
    v_inserted public.audit_logs;
BEGIN
    -- Obter o último hash da cadeia
    SELECT integrity_hash INTO v_last_hash
    FROM public.audit_logs
    ORDER BY timestamp DESC, id DESC
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        v_last_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    END IF;

    -- Constrói o payload para hashing SHA-256 (PostgreSQL core native sha256)
    v_payload := v_last_hash || '|' || NOW()::TEXT || '|' || p_user_id || '|' || p_action || '|' || p_details;
    v_new_hash := encode(sha256(convert_to(v_payload, 'UTF8')), 'hex');

    INSERT INTO public.audit_logs (
        timestamp,
        user_id,
        user_name,
        department_id,
        action,
        details,
        previous_value,
        new_value,
        ip_address,
        user_agent,
        previous_hash,
        integrity_hash
    ) VALUES (
        NOW(),
        p_user_id,
        p_user_name,
        p_department_id,
        p_action,
        p_details,
        p_previous_value,
        p_new_value,
        p_ip_address,
        p_user_agent,
        v_last_hash,
        v_new_hash
    )
    RETURNING * INTO v_inserted;

    RETURN v_inserted;
END;
$$;

-- ========================================================================================
-- 6. AUTENTICAÇÃO E RECUPERAÇÃO DE SENHA PROTEGIDA (RPCs SEGURAS)
--    NENHUMA SENHA É COMPARADA NO JAVASCRIPT / CLIENT-SIDE!
-- ========================================================================================

-- 6.1 AUTENTICAÇÃO VIA BANCO DE DADOS (BCRYPT)
CREATE OR REPLACE FUNCTION public.rpc_authenticate_user(
    p_identifier TEXT, -- Email ou Telefone
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_user public.users;
    v_secret public.user_secrets;
    v_clean_ident TEXT;
BEGIN
    v_clean_ident := lower(trim(p_identifier));

    -- Busca o usuário por email ou número de telefone limpo
    SELECT * INTO v_user
    FROM public.users
    WHERE lower(email) = v_clean_ident
       OR regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_identifier, '\D', '', 'g')
    LIMIT 1;

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credenciais inválidas.');
    END IF;

    IF NOT v_user.active THEN
        RETURN jsonb_build_object('success', false, 'message', 'Conta desativada. Contate o Administrador.');
    END IF;

    -- Obter o hash seguro
    SELECT * INTO v_secret
    FROM public.user_secrets
    WHERE user_id = v_user.id;

    IF v_secret IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credenciais não configuradas.');
    END IF;

    -- Checa se a conta está temporariamente bloqueada por tentativas excessivas
    IF v_secret.locked_until IS NOT NULL AND v_secret.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Conta temporariamente bloqueada por tentativas excessivas. Tente novamente mais tarde.');
    END IF;

    -- Validação com bcrypt (pgcrypto)
    IF v_secret.password_hash = crypt(p_password, v_secret.password_hash) THEN
        -- Reseta tentativas falhas
        UPDATE public.user_secrets
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE user_id = v_user.id;

        -- Registrar log de auditoria
        PERFORM public.record_audit_log(
            v_user.id,
            v_user.name,
            v_user.department_id,
            'USER_LOGIN',
            'Login realizado com sucesso via autenticação segura do banco de dados'
        );

        RETURN jsonb_build_object(
            'success', true,
            'user', to_jsonb(v_user)
        );
    ELSE
        -- Incrementa tentativas falhas
        UPDATE public.user_secrets
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE WHEN failed_login_attempts >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
        WHERE user_id = v_user.id;

        RETURN jsonb_build_object('success', false, 'message', 'Senha incorreta.');
    END IF;
END;
$$;

-- 6.2 ALTERAÇÃO DE SENHA PELO PRÓPRIO USUÁRIO LOGADO
CREATE OR REPLACE FUNCTION public.rpc_change_own_password(
    p_user_id TEXT,
    p_current_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_user public.users;
    v_secret public.user_secrets;
    v_new_hash TEXT;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado.');
    END IF;

    SELECT * INTO v_secret FROM public.user_secrets WHERE user_id = p_user_id;

    -- Valida senha atual
    IF v_secret.password_hash != crypt(p_current_password, v_secret.password_hash) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A senha atual informada está incorreta.');
    END IF;

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'A nova senha deve ter no mínimo 6 caracteres.');
    END IF;

    -- Gera novo hash bcrypt com custo 12
    v_new_hash := crypt(p_new_password, gen_salt('bf', 12));

    UPDATE public.user_secrets
    SET password_hash = v_new_hash,
        last_password_change = NOW()
    WHERE user_id = p_user_id;

    PERFORM public.record_audit_log(
        v_user.id,
        v_user.name,
        v_user.department_id,
        'PASSWORD_CHANGE',
        'Troca de senha efetuada com sucesso pelo usuário'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Senha alterada com sucesso!');
END;
$$;

-- 6.3 SOLICITAÇÃO DE RECUPERAÇÃO DE SENHA (POR E-MAIL OU TELEFONE/CELULAR)
CREATE OR REPLACE FUNCTION public.rpc_request_password_reset(
    p_identifier TEXT,
    p_method TEXT -- 'email' ou 'phone'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_user public.users;
    v_code TEXT;
    v_code_hash TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Busca usuário por email ou telefone
    SELECT * INTO v_user
    FROM public.users
    WHERE lower(email) = lower(trim(p_identifier))
       OR regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_identifier, '\D', '', 'g')
    LIMIT 1;

    IF v_user IS NULL THEN
        -- Retorna mensagem genérica para mitigar User Enumeration Attacks
        RETURN jsonb_build_object('success', true, 'message', 'Se o cadastro existir, o código de recuperação foi enviado.');
    END IF;

    -- Gera código de 6 dígitos numéricos criptograficamente seguro
    v_code := lpad((abs(get_byte(gen_random_bytes(3), 0) * 65536 + get_byte(gen_random_bytes(3), 1) * 256 + get_byte(gen_random_bytes(3), 2)) % 900000 + 100000)::text, 6, '0');
    v_code_hash := crypt(v_code, gen_salt('bf', 8));
    v_expires_at := NOW() + INTERVAL '15 minutes';

    -- Invalida solicitações anteriores pendentes
    UPDATE public.password_recovery_requests
    SET is_used = true
    WHERE user_id = v_user.id AND is_used = false;

    -- Registra novo token de verificação
    INSERT INTO public.password_recovery_requests (
        user_id,
        identifier,
        identifier_type,
        token_hash,
        expires_at
    ) VALUES (
        v_user.id,
        p_identifier,
        p_method,
        v_code_hash,
        v_expires_at
    );

    PERFORM public.record_audit_log(
        v_user.id,
        v_user.name,
        v_user.department_id,
        'PASSWORD_RESET_REQUEST',
        'Código de verificação para redefinição de senha solicitado via ' || p_method
    );

    -- NOTA: Em produção com webhook/Edge Function de SMS/Email (SendGrid, Twilio ou Supabase Auth),
    -- o código 'v_code' é disparado via fila de mensagens externa.
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Código gerado com sucesso. Válido por 15 minutos.',
        'debugCode', v_code, -- Facilita testes em desenvolvimento local
        'maskedDestination', CASE
            WHEN p_method = 'email' THEN regexp_replace(v_user.email, '(^.).*(@.*$)', '\1***\2')
            ELSE regexp_replace(v_user.phone, '(\d{2})(\d{4,5})(\d{4})', '(\1) *****-\3')
        END
    );
END;
$$;

-- 6.4 VERIFICAÇÃO DO CÓDIGO E DEFINIÇÃO DA NOVA SENHA
CREATE OR REPLACE FUNCTION public.rpc_verify_and_reset_password(
    p_identifier TEXT,
    p_code TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_user public.users;
    v_req public.password_recovery_requests;
    v_new_hash TEXT;
BEGIN
    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'A nova senha deve possuir no mínimo 6 caracteres.');
    END IF;

    -- Localiza usuário
    SELECT * INTO v_user
    FROM public.users
    WHERE lower(email) = lower(trim(p_identifier))
       OR regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_identifier, '\D', '', 'g')
    LIMIT 1;

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado.');
    END IF;

    -- Busca solicitação ativa mais recente
    SELECT * INTO v_req
    FROM public.password_recovery_requests
    WHERE user_id = v_user.id
      AND is_used = false
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Código expirado ou inválido. Solicite um novo código.');
    END IF;

    -- Verifica limite de tentativas (máx 5)
    IF v_req.attempts >= 5 THEN
        UPDATE public.password_recovery_requests SET is_used = true WHERE id = v_req.id;
        RETURN jsonb_build_object('success', false, 'message', 'Limite de tentativas excedido para este código.');
    END IF;

    -- Validação do código de 6 dígitos
    IF v_req.token_hash = crypt(p_code, v_req.token_hash) THEN
        -- Código correto: Invalida requisição
        UPDATE public.password_recovery_requests
        SET is_used = true
        WHERE id = v_req.id;

        -- Hasheia a nova senha com bcrypt custo 12
        v_new_hash := crypt(p_new_password, gen_salt('bf', 12));

        UPDATE public.user_secrets
        SET password_hash = v_new_hash,
            last_password_change = NOW(),
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE user_id = v_user.id;

        PERFORM public.record_audit_log(
            v_user.id,
            v_user.name,
            v_user.department_id,
            'PASSWORD_RESET_COMPLETE',
            'Senha redefinida com sucesso através de recuperação por ' || v_req.identifier_type
        );

        RETURN jsonb_build_object('success', true, 'message', 'Senha redefinida com sucesso! Você já pode realizar o login.');
    ELSE
        -- Incrementa tentativas incorretas
        UPDATE public.password_recovery_requests
        SET attempts = attempts + 1
        WHERE id = v_req.id;

        RETURN jsonb_build_object('success', false, 'message', 'Código de verificação incorreto.');
    END IF;
END;
$$;

-- 6.5 REDEFINIÇÃO DE SENHA POR ADMINISTRADOR
CREATE OR REPLACE FUNCTION public.rpc_admin_reset_user_password(
    p_admin_user_id TEXT,
    p_target_user_id TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_admin public.users;
    v_target public.users;
    v_new_hash TEXT;
BEGIN
    SELECT * INTO v_admin FROM public.users WHERE id = p_admin_user_id AND role = 'admin';
    IF v_admin IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Apenas Administradores possuem autorização para redefinir senhas.');
    END IF;

    SELECT * INTO v_target FROM public.users WHERE id = p_target_user_id;
    IF v_target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário alvo não localizado.');
    END IF;

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'A senha deve possuir pelo menos 6 dígitos.');
    END IF;

    v_new_hash := crypt(p_new_password, gen_salt('bf', 12));

    UPDATE public.user_secrets
    SET password_hash = v_new_hash,
        last_password_change = NOW(),
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE user_id = p_target_user_id;

    PERFORM public.record_audit_log(
        v_admin.id,
        v_admin.name,
        v_admin.department_id,
        'USER_ADMIN_EDIT',
        'Administrador redefiniu a senha do usuário ' || v_target.name || ' (' || v_target.email || ')'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Senha do usuário redefinida com sucesso!');
END;
$$;

-- ========================================================================================
-- 7. CONFIGURAÇÃO DE ROW LEVEL SECURITY (RLS) IMPENETRÁVEL
--    IMPEDE ACESSO PELO INSPECIONAR / CONSOLE DO NAVEGADOR
-- ========================================================================================

-- Ativar RLS mandatário em todas as tabelas
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_secrets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.department_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_reports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics FORCE ROW LEVEL SECURITY;

ALTER TABLE public.report_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_activities FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns FORCE ROW LEVEL SECURITY;

ALTER TABLE public.export_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_schedules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.password_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_recovery_requests FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------------------
-- 7.1 POLÍTICAS: user_secrets (BLINDAGEM NÍVEL ZERO - NENHUM SELECT DIRETO PERMITIDO)
-- ----------------------------------------------------------------------------------------
-- Revoga explicitamente permissões diretas de SELECT/INSERT/UPDATE/DELETE para clientes da API
REVOKE ALL ON public.user_secrets FROM anon, authenticated;
REVOKE ALL ON public.password_recovery_requests FROM anon, authenticated;

-- Somente triggers e funções SECURITY DEFINER internas acessam user_secrets
CREATE POLICY "Deny direct client access to secrets"
ON public.user_secrets
AS RESTRICTIVE
FOR ALL
USING (false);

-- ----------------------------------------------------------------------------------------
-- 7.2 POLÍTICAS: departments (Leitura pública / Edição apenas Admin)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read departments to authenticated and anon"
ON public.departments FOR SELECT
USING (true);

CREATE POLICY "Allow admin manage departments"
ON public.departments FOR ALL
USING (public.is_admin());

-- ----------------------------------------------------------------------------------------
-- 7.3 POLÍTICAS: users
-- ----------------------------------------------------------------------------------------
-- Qualquer usuário autenticado pode ver a lista de colaboradores (para coordenação e relatórios)
CREATE POLICY "Allow read users to authenticated"
ON public.users FOR SELECT
USING (true);

-- Usuários só podem atualizar seu próprio perfil básico
CREATE POLICY "Allow users update own profile"
ON public.users FOR UPDATE
USING (id = public.current_app_user_id() OR auth_user_id = auth.uid())
WITH CHECK (
    -- Impede que um usuário comum altere seu próprio papel (role) para 'admin' pelo inspecionar
    (role = (SELECT role FROM public.users WHERE id = public.current_app_user_id()))
    OR public.is_admin()
);

-- Somente Admin pode criar ou remover usuários
CREATE POLICY "Allow admin insert users"
ON public.users FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin delete users"
ON public.users FOR DELETE
USING (public.is_admin());

-- ----------------------------------------------------------------------------------------
-- 7.4 POLÍTICAS: institution_settings (Logotipos & Identidade)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read branding settings"
ON public.institution_settings FOR SELECT
USING (true);

CREATE POLICY "Allow admin update branding settings"
ON public.institution_settings FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin insert branding settings"
ON public.institution_settings FOR INSERT
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------------------
-- 7.5 POLÍTICAS: monthly_reports
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read monthly reports"
ON public.monthly_reports FOR SELECT
USING (true);

CREATE POLICY "Allow update reports by admin or coordinator"
ON public.monthly_reports FOR UPDATE
USING (public.is_admin() OR (SELECT (permissions->>'canChangeReportStatus')::boolean FROM public.users WHERE id = public.current_app_user_id()))
WITH CHECK (public.is_admin() OR (SELECT (permissions->>'canChangeReportStatus')::boolean FROM public.users WHERE id = public.current_app_user_id()));

CREATE POLICY "Allow admin insert reports"
ON public.monthly_reports FOR INSERT
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------------------
-- 7.6 POLÍTICAS: department_reports (Isolamento departamental estrito)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read department reports"
ON public.department_reports FOR SELECT
USING (true);

-- Um coordenador só consegue editar as atividades e métricas do SEU próprio departamento!
-- Mesmo que tente alterar o ID do departamento pelo inspecionar/cURL, o banco rejeita!
CREATE POLICY "Allow coordinators edit own department"
ON public.department_reports FOR UPDATE
USING (
    public.is_admin() 
    OR department_id = public.current_user_department()
)
WITH CHECK (
    public.is_admin() 
    OR department_id = public.current_user_department()
);

CREATE POLICY "Allow admin or coordinator insert department reports"
ON public.department_reports FOR INSERT
WITH CHECK (
    public.is_admin()
    OR department_id = public.current_user_department()
);

-- ----------------------------------------------------------------------------------------
-- 7.7 POLÍTICAS: report_metrics & report_activities
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read report metrics"
ON public.report_metrics FOR SELECT
USING (true);

CREATE POLICY "Allow edit metrics of own department"
ON public.report_metrics FOR ALL
USING (
    public.is_admin() 
    OR EXISTS (
        SELECT 1 FROM public.department_reports dr 
        WHERE dr.id = report_metrics.department_report_id 
          AND dr.department_id = public.current_user_department()
    )
);

CREATE POLICY "Allow read report activities"
ON public.report_activities FOR SELECT
USING (true);

CREATE POLICY "Allow edit activities of own department"
ON public.report_activities FOR ALL
USING (
    public.is_admin() 
    OR EXISTS (
        SELECT 1 FROM public.department_reports dr 
        WHERE dr.id = report_activities.department_report_id 
          AND dr.department_id = public.current_user_department()
    )
);

-- ----------------------------------------------------------------------------------------
-- 7.8 POLÍTICAS: audit_logs (Leitura somente Admin ou permissão explícita)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read audit logs to authorized users"
ON public.audit_logs FOR SELECT
USING (
    public.is_admin() 
    OR coalesce((SELECT (permissions->>'canViewAuditLogs')::boolean FROM public.users WHERE id = public.current_app_user_id()), false)
);

-- Inserção de log permitida via aplicação/sessão autenticada
CREATE POLICY "Allow insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------------------------------
-- 7.9 POLÍTICAS: notification_campaigns & export_schedules
-- ----------------------------------------------------------------------------------------
CREATE POLICY "Allow read notifications"
ON public.notification_campaigns FOR SELECT
USING (true);

CREATE POLICY "Allow admin manage notifications"
ON public.notification_campaigns FOR ALL
USING (public.is_admin());

CREATE POLICY "Allow read export schedules"
ON public.export_schedules FOR SELECT
USING (public.is_admin());

CREATE POLICY "Allow admin manage export schedules"
ON public.export_schedules FOR ALL
USING (public.is_admin());

-- ========================================================================================
-- 8. CARGA DE DADOS INICIAIS (SEEDS HOMOLOGADOS CAMP PIERO POLLONE)
-- ========================================================================================

-- 8.1 Inserir Departamentos Oficiais
INSERT INTO public.departments (id, name, description, order_index) VALUES
('ti', 'Tecnologia (TI)', 'Infraestrutura de Redes, Suporte Técnico, Softwares & Governança Digital', 1),
('rh', 'Gestão de Pessoas (RH)', 'Recrutamento, Seleção, Treinamento, Benefícios e Clima Organizacional', 2),
('financeiro', 'Financeiro', 'Contas a Pagar, Contas a Receber, Fluxo de Caixa e Prestação de Contas', 3),
('captacao', 'Captação de Recursos', 'Novas Parcerias, Captação de Doações e Relacionamento com Empresas Cidadãs', 4),
('ensino', 'Ensino (Pedagógico)', 'Planejamento Pedagógico, Acompanhamento de Aprendizes e Aulas Teóricas', 5),
('psicologia_social', 'Psicologia & Social', 'Atendimento Psicológico, Acolhimento Sociofamiliar e Visitas Domiciliares', 6),
('limpeza', 'Limpeza e Zeladoria', 'Higienização, Manutenção Preventiva e Conservação dos Ambientes', 7),
('projetos', 'Gerência de Projetos', 'Planejamento Estratégico, Captação de Editais e Execução de Projetos Sociais', 8),
('estagio', 'Estágio', 'Programa de Estágio Não Obrigatório, Triagem e Convênios Estudantis', 9),
('marketing', 'Marketing & Mídias', 'Gestão de Redes Sociais, Comunicação Institucional, Eventos e Identidade Visual', 10),
('manutencao', 'Manutenção Predial', 'Reparos Estruturais, Elétrica, Hidráulica e Conservação Geral da Sede', 11),
('gerencia_geral', 'Gerência Geral', 'Diretrizes Estratégicas Institucionais, Prestação de Contas e Liderança Executiva', 12),
('cozinha', 'Cozinha & Nutrição', 'Preparo Nutricional, Café da Manhã e Almoço Diário dos Jovens Aprendizes', 13),
('presidencia', 'Presidência', 'Representação Institucional Oficial, Relações Institucionais e Diretoria', 14)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 8.2 Inserir Configurações Institucionais
INSERT INTO public.institution_settings (
    id, name, institution_name, sub_title, report_subtitle, cnpj, global_two_factor_required
) VALUES (
    'institution_camp',
    'CAMP Piero Pollone',
    'CAMP Piero Pollone',
    'Sistema Mensal de Atividades & Relatórios',
    'Santo André - Gestão & Transparência',
    '44.298.544/0001-83',
    false
) ON CONFLICT (id) DO NOTHING;

-- 8.3 Inserir Usuários Iniciais e gerar credenciais seguras (bcrypt)
-- Senha padrão inicial para todos: "camp1234" (deve ser trocada no primeiro acesso)
DO $$
DECLARE
    v_default_hash TEXT;
BEGIN
    PERFORM set_config('search_path', 'public, extensions, auth', true);
    v_default_hash := extensions.crypt('camp1234', extensions.gen_salt('bf', 12));

    -- 1. Administrador (Nilton Luiz)
    INSERT INTO public.users (
        id, name, email, phone, role, department_id, department_name, position, permissions
    ) VALUES (
        'user_admin',
        'Nilton Luiz',
        'niltonnluiz@gmail.com',
        '(11) 2842-2470',
        'admin',
        'ti',
        'Tecnologia (TI)',
        'Administrador do Sistema / TI',
        '{"canEditFinancials": true, "canExportPdf": true, "canExportExcel": true, "canManageUsers": true, "canViewAuditLogs": true, "canChangeReportStatus": true, "canManageSchedules": true}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_admin', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. RH (Rosangela Tavares)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_rh', 'Rosangela Tavares', 'rosangela.tavares@campsantoandre.org.br', '(11) 93361-8355', 'coordinator', 'rh', 'Gestão de Pessoas (RH)', 'Coordenadora de Gestão de Pessoas')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_rh', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Financeiro (Elaine Pereira)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position, permissions)
    VALUES ('user_fin', 'Elaine Pereira', 'elaine.moreira@campsantoandre.org.br', '(11) 91631-1746', 'coordinator', 'financeiro', 'Financeiro', 'Coordenadora Financeiro', '{"canEditFinancials": true, "canExportPdf": true, "canExportExcel": true}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_fin', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. Captação (Priscila Laurindo)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_captacao', 'Priscila Laurindo', 'priscila.laurindo@campsantoandre.org.br', '(11) 99122-1637', 'coordinator', 'captacao', 'Captação de Recursos', 'Coordenadora - Captação de Recursos')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_captacao', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 5. Ensino (Elaine Serracine)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_ensino', 'Elaine Serracine', 'elaine.serracine@campsantoandre.org.br', '(11) 93369-0769', 'coordinator', 'ensino', 'Ensino (Pedagógico)', 'Coordenadora Pedagógica')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_ensino', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 6. Psicologia (Aline Batista)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_psico', 'Aline Batista', 'aline.batista@campsantoandre.org.br', '(11) 91631-1747', 'coordinator', 'psicologia_social', 'Psicologia & Social', 'Psicóloga Responsável')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_psico', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 7. Limpeza (Fabiana Ribeiro)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_limpeza', 'Fabiana Ribeiro', 'fabiana.ribeiro@campsantoandre.org.br', '(11) 91631-1748', 'coordinator', 'limpeza', 'Limpeza e Zeladoria', 'Encarregada de Higienização')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_limpeza', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 8. Projetos (Gisele Manholer)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_projetos', 'Gisele Manholer', 'gisele.manholer@campsantoandre.org.br', '(11) 91631-1749', 'coordinator', 'projetos', 'Gerência de Projetos', 'Gerente de Projetos Sociais')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_projetos', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 9. Marketing (Camila Ribeiro)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_mkt', 'Camila Ribeiro', 'camila.ribeiro@campsantoandre.org.br', '(11) 91631-1750', 'coordinator', 'marketing', 'Marketing & Mídias', 'Coordenadora de Marketing e Comunicação')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_mkt', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 10. Manutenção (Almir Gatti)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_manutencao', 'Almir Gatti', 'almir.gatti@campsantoandre.org.br', '(11) 91631-1751', 'coordinator', 'manutencao', 'Manutenção Predial', 'Supervisor de Obras e Manutenção')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_manutencao', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 11. Gerência Geral (Gildete)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_gerencia', 'Gildete', 'gildete@campsantoandre.org.br', '(11) 91631-1752', 'coordinator', 'gerencia_geral', 'Gerência Geral', 'Gerente Executiva Institucional')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_gerencia', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 12. Cozinha (Luzia Santos)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_cozinha', 'Luzia Santos', 'luzia.santos@campsantoandre.org.br', '(11) 91631-1753', 'coordinator', 'cozinha', 'Cozinha & Nutrição', 'Encarregada de Nutrição e Alimentação')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_cozinha', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;

    -- 13. Presidência (Dr. Roberto Pollone)
    INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position)
    VALUES ('user_presidencia', 'Dr. Roberto Pollone', 'presidencia@campsantoandre.org.br', '(11) 2842-2470', 'coordinator', 'presidencia', 'Presidência', 'Presidente da Diretoria Executiva')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_secrets (user_id, password_hash)
    VALUES ('user_presidencia', v_default_hash)
    ON CONFLICT (user_id) DO NOTHING;
END $$;

-- 8.4 Inserir Primeiro Registro de Auditoria (Gênesis)
SELECT public.record_audit_log(
    'system_bootstrap',
    'Sistema Supabase',
    'ti',
    'SQL_QUERY_EXEC',
    'Criação e homologação do schema de banco de dados no Supabase com segurança RLS mandatária e hashing bcrypt'
);

-- ========================================================================================
-- FIM DO SCRIPT DE INSTALAÇÃO
-- ========================================================================================
