-- ========================================================================================
-- SCRIPT DE CORREÇÃO E ATIVAÇÃO EM TEMPO REAL SUPABASE + VERCEL
-- CAMP PIERO POLLONE - RELATÓRIOS MENSAIS INSTITUCIONAIS
--
-- Execute este script no SQL Editor do seu projeto Supabase para:
-- 1. Garantir que todas as 9 tabelas do sistema existam e estejam sincronizadas.
-- 2. Adicionar a coluna 'payload JSONB' na tabela monthly_reports.
-- 3. Habilitar a replicação em Tempo Real (Supabase Realtime) para sincronização instantânea entre dispositivos.
-- 4. Ajustar as políticas de RLS para permitir leitura e escrita imediata com a chave anônima (anon).
-- 5. Atualizar as fotos/avatares e cargos oficiais de todos os 15 usuários/coordenadores.
-- ========================================================================================

-- 1. GARANTIR DEPARTAMENTOS OFICIAIS
INSERT INTO public.departments (id, name, description, order_index) VALUES
('gerencia_geral', 'Gerente Geral', 'Direção operacional, coordenação executiva e alinhamento institucional.', 1),
('projetos', 'Gerente de Projetos', 'Gestão e execução de projetos socioeducativos e convênios estratégicos.', 2),
('rh', 'Gestão de Pessoas | RH', 'Administração de pessoal, acolhimento, desenvolvimento humano e departamento pessoal.', 3),
('captacao', 'Captação de Recursos', 'Relações institucionais, parcerias corporativas e sustentabilidade financeira.', 4),
('presidencia', 'Presidente', 'Governança institucional, representação estatutária e conselho diretor.', 5),
('coordenador_administrativo', 'Coordenador Administrativo', 'Gestão de processos administrativos, compras, suporte e conformidade.', 6),
('manutencao', 'Manutenção', 'Infraestrutura predial, segurança patrimonial e manutenção preventiva e corretiva.', 7),
('estagio', 'Estágio', 'Programa de estágio socioeducativo, supervisão e integração ao mercado.', 8),
('limpeza', 'Limpeza', 'Zeladoria, higienização de ambientes e conservação das dependências.', 9),
('cozinha', 'Cozinha', 'Alimentação balanceada, nutrição dos aprendizes e gestão do refeitório.', 10),
('financeiro', 'Financeiro', 'Contas a pagar e receber, fluxo de caixa, prestação de contas e controladoria.', 11),
('pedagogico', 'Pedagógico (Ensino)', 'Formação básica de aprendizes, grade curricular e acompanhamento pedagógico.', 12),
('psicologia', 'Psicologia', 'Apoio psicossocial, escuta empática e acompanhamento comportamental.', 13),
('social', 'Social', 'Supervisão social, acolhimento de famílias e relatórios de vulnerabilidade.', 14),
('ti', 'Tecnologia (TI)', 'Infraestrutura de redes, sistemas de informação, suporte técnico e segurança de dados.', 15),
('marketing', 'Marketing', 'Comunicação institucional, mídias sociais, eventos e identidade visual.', 16),
('ensino', 'Ensino (Pedagógico)', 'Planejamento pedagógico e aulas teóricas de aprendizes', 17),
('psicologia_social', 'Psicologia & Social', 'Equipe multidisciplinar de atendimento psicossocial', 18),
('admin', 'Coordenador Administrativo', 'Gestão de processos administrativos e suporte', 19)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description;

-- 2. ADICIONAR COLUNA PAYLOAD NA TABELA MONTHLY_REPORTS (Se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'monthly_reports' 
          AND column_name = 'payload'
    ) THEN
        ALTER TABLE public.monthly_reports ADD COLUMN payload JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. CRIAR TABELAS ADICIONAIS NECESSÁRIAS
CREATE TABLE IF NOT EXISTS public.monthly_hiring_data (
    id TEXT PRIMARY KEY,
    report_id TEXT REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
    display_mode TEXT DEFAULT '2_previous_and_current',
    current_month JSONB DEFAULT '{}'::jsonb,
    previous_month_1 JSONB DEFAULT '{}'::jsonb,
    previous_month_2 JSONB DEFAULT '{}'::jsonb,
    history JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sector_descriptions (
    department_id TEXT PRIMARY KEY REFERENCES public.departments(id) ON UPDATE CASCADE,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 4. DESBLOQUEAR RLS PARA PERMITIR OPERAÇÃO VIA CLIENTE WEB / VERCEL (ANON & AUTHENTICATED)
-- Permite que usuários em qualquer dispositivo leiam e atualizem dados sem bloqueio 401/42501
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read departments" ON public.departments;
DROP POLICY IF EXISTS "Allow anon manage departments" ON public.departments;
CREATE POLICY "Allow anon manage departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage users" ON public.users;
DROP POLICY IF EXISTS "Allow users update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow read users" ON public.users;
CREATE POLICY "Allow anon manage users" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage monthly_reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Allow read monthly reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Allow update reports by admin or coordinator" ON public.monthly_reports;
DROP POLICY IF EXISTS "Allow admin insert reports" ON public.monthly_reports;
CREATE POLICY "Allow anon manage monthly_reports" ON public.monthly_reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.department_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage department_reports" ON public.department_reports;
DROP POLICY IF EXISTS "Allow read department reports" ON public.department_reports;
DROP POLICY IF EXISTS "Allow coordinators edit own department" ON public.department_reports;
DROP POLICY IF EXISTS "Allow admin or coordinator insert department reports" ON public.department_reports;
CREATE POLICY "Allow anon manage department_reports" ON public.department_reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage report_metrics" ON public.report_metrics;
DROP POLICY IF EXISTS "Allow read report metrics" ON public.report_metrics;
DROP POLICY IF EXISTS "Allow edit metrics of own department" ON public.report_metrics;
CREATE POLICY "Allow anon manage report_metrics" ON public.report_metrics FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage institution_settings" ON public.institution_settings;
DROP POLICY IF EXISTS "Allow read branding settings" ON public.institution_settings;
DROP POLICY IF EXISTS "Allow admin update branding settings" ON public.institution_settings;
CREATE POLICY "Allow anon manage institution_settings" ON public.institution_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.monthly_hiring_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage monthly_hiring_data" ON public.monthly_hiring_data;
CREATE POLICY "Allow anon manage monthly_hiring_data" ON public.monthly_hiring_data FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.sector_descriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage sector_descriptions" ON public.sector_descriptions;
CREATE POLICY "Allow anon manage sector_descriptions" ON public.sector_descriptions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon insert audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 5. ATIVAR REPLICAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- Permite que alterações em um dispositivo sejam transmitidas instantaneamente para todos os outros
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_reports;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.department_reports;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.institution_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 6. ATUALIZAR USUÁRIOS COM FOTOS/AVATARES E CARGOS OFICIAIS
INSERT INTO public.users (id, name, email, phone, role, department_id, department_name, position, avatar_url, active) VALUES
('user_admin', 'Nilton Luiz', 'niltonnluiz@gmail.com', '(11) 2842-2470', 'admin', 'coordenador_administrativo', 'Coordenador Administrativo', 'Coordenador Administrativo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', true),
('user_coord_admin', 'Coordenação Administrativa', 'administrativo@campsantoandre.org.br', '(11) 2842-2470', 'coordinator', 'coordenador_administrativo', 'Coordenador Administrativo', 'Coordenador(a) Administrativo(a)', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80', true),
('user_rh', 'Rosangela Tavares', 'rosangela.tavares@campsantoandre.org.br', '(11) 93361-8355', 'coordinator', 'rh', 'Gestão de Pessoas | RH', 'Coordenadora de Gestão de Pessoas', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', true),
('user_fin', 'Elaine Pereira', 'elaine.pereira@campsantoandre.org.br', '(11) 93361-8356', 'coordinator', 'financeiro', 'Financeiro', 'Coordenadora Financeiro', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', true),
('user_captacao', 'Priscila Laurindo', 'priscila.laurindo@campsantoandre.org.br', '(11) 93361-8357', 'coordinator', 'captacao', 'Captação de Recursos', 'Coordenadora - Captação de Recursos', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80', true),
('user_ensino', 'Elaine Serracine', 'elaine.serracine@campsantoandre.org.br', '(11) 93361-8358', 'coordinator', 'ensino', 'Ensino (Pedagógico)', 'Coordenadora Pedagógica', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80', true),
('user_psico', 'Aline Batista', 'aline.batista@campsantoandre.org.br', '(11) 93361-8359', 'coordinator', 'psicologia_social', 'Psicologia & Social', 'Psicóloga Responsável', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', true),
('user_limpeza', 'Fabiana Ribeiro', 'fabiana.ribeiro@campsantoandre.org.br', '(11) 91631-1748', 'coordinator', 'limpeza', 'Limpeza e Zeladoria', 'Encarregada de Higienização', 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80', true),
('user_projetos', 'Gisele Manholer', 'gisele.manholer@campsantoandre.org.br', '(11) 91631-1749', 'coordinator', 'projetos', 'Gerência de Projetos', 'Gerente de Projetos Sociais', 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=150&auto=format&fit=crop&q=80', true),
('user_ti', 'Nilton Luiz', 'nilton.ti@campsantoandre.org.br', '(11) 2842-2470', 'coordinator', 'ti', 'Tecnologia da Informação', 'Coordenador de TI & Segurança', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', true),
('user_mkt', 'Camila Ribeiro', 'camila.ribeiro@campsantoandre.org.br', '(11) 91631-1750', 'coordinator', 'marketing', 'Marketing & Mídias', 'Coordenadora de Marketing e Comunicação', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', true),
('user_manutencao', 'Almir Gatti', 'almir.gatti@campsantoandre.org.br', '(11) 91631-1751', 'coordinator', 'manutencao', 'Manutenção Predial', 'Supervisor de Obras e Manutenção', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', true),
('user_gerencia', 'Gildete', 'gildete@campsantoandre.org.br', '(11) 91631-1752', 'coordinator', 'gerencia_geral', 'Gerência Geral', 'Gerente Executiva Institucional', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80', true),
('user_cozinha', 'Luzia Santos', 'luzia.santos@campsantoandre.org.br', '(11) 91631-1753', 'coordinator', 'cozinha', 'Cozinha & Nutrição', 'Encarregada de Nutrição e Alimentação', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', true),
('user_presidencia', 'Dr. Roberto Pollone', 'presidencia@campsantoandre.org.br', '(11) 2842-2470', 'coordinator', 'presidencia', 'Presidência', 'Presidente da Diretoria Executiva', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', true),
('user_operacoes', 'Coordenação Operacional', 'operacoes@campsantoandre.org.br', '(11) 2842-2470', 'staff', 'limpeza', 'Operações (Limpeza, Manutenção, Cozinha, MKT)', 'Líder Operacional e Serviços', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    department_id = EXCLUDED.department_id,
    department_name = EXCLUDED.department_name,
    position = EXCLUDED.position,
    avatar_url = EXCLUDED.avatar_url,
    active = true;

-- 7. REGISTRAR SUCESSO DA ATUALIZAÇÃO NO LOG DE AUDITORIA
SELECT public.record_audit_log(
    'user_admin',
    'Nilton Luiz',
    'coordenador_administrativo',
    'DATABASE_SYNC',
    'Banco Supabase configurado com sucesso para replicação em tempo real, coluna payload e fotos de perfil.'
);
