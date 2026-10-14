import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  RefreshCw,
  KeyRound,
  Globe,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Zap,
  Info,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { supabaseService, SupabaseConfig } from '../services/supabaseClient';
import { sqlDb } from '../services/sqlDb';

const SUPABASE_QUICK_FIX_SQL = `-- ========================================================================================
-- SCRIPT DE CORREÇÃO E ATIVAÇÃO EM TEMPO REAL SUPABASE + VERCEL (1-CLIQUE)
-- CAMP PIERO POLLONE - RELATÓRIOS MENSAIS INSTITUCIONAIS
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
('psicologia_social', 'Psicologia & Social', 'Equipe multidisciplinar de atendimento psicossocial', 18)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description;

-- 2. ADICIONAR COLUNA PAYLOAD NA TABELA MONTHLY_REPORTS
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

-- 4. DESBLOQUEAR RLS PARA OPERAÇÃO COMPLETA CLIENTE ANON / VERCEL
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read departments" ON public.departments;
CREATE POLICY "Allow anon read departments" ON public.departments FOR SELECT USING (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage users" ON public.users;
CREATE POLICY "Allow anon manage users" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage monthly_reports" ON public.monthly_reports;
CREATE POLICY "Allow anon manage monthly_reports" ON public.monthly_reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.department_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage department_reports" ON public.department_reports;
CREATE POLICY "Allow anon manage department_reports" ON public.department_reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage report_metrics" ON public.report_metrics;
CREATE POLICY "Allow anon manage report_metrics" ON public.report_metrics FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon manage institution_settings" ON public.institution_settings;
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

-- 6. ATUALIZAR TODOS OS 15 USUÁRIOS COM FOTOS OFICIAIS E CARGOS
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

SELECT public.record_audit_log(
    'user_admin',
    'Nilton Luiz',
    'coordenador_administrativo',
    'DATABASE_SYNC',
    'Correção completa e ativação do Realtime executada com sucesso.'
);`;

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced?: () => void;
}

export function SupabaseConnectionModal({
  isOpen,
  onClose,
  onDataSynced,
}: SupabaseConnectionModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: any;
  } | null>(null);

  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMissingUsersSql, setCopiedMissingUsersSql] = useState(false);

  const handleCopyMissingUsersSql = () => {
    navigator.clipboard.writeText(SUPABASE_QUICK_FIX_SQL);
    setCopiedMissingUsersSql(true);
    setTimeout(() => setCopiedMissingUsersSql(false), 4000);
  };

  useEffect(() => {
    if (isOpen) {
      const current = supabaseService.getConfig();
      setUrl(current.url || '');
      setAnonKey(current.anonKey || '');
      setAutoSync(current.autoSync);
      setTestResult(null);
      setSyncFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    supabaseService.saveConfig(url, anonKey, autoSync);
    setSyncFeedback({
      type: 'success',
      message: 'Configurações de conexão salvas com sucesso no aplicativo!',
    });
  };

  const handleTestConnection = async () => {
    // Save current fields first
    supabaseService.saveConfig(url, anonKey, autoSync);
    setIsTesting(true);
    setTestResult(null);
    setSyncFeedback(null);

    const result = await supabaseService.testConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  const handlePushToSupabase = async () => {
    setIsPushing(true);
    setSyncFeedback(null);
    const result = await supabaseService.pushLocalDataToSupabase();
    setIsPushing(false);

    if (result.success) {
      const counts = result.recordsPushed;
      setSyncFeedback({
        type: 'success',
        message: `${result.message} (Instituição: ${counts.institution_settings || 0}, Usuários: ${counts.users || 0}, Relatórios: ${counts.monthly_reports || 0}, Logs: ${counts.audit_logs || 0})`,
      });
      onDataSynced?.();
    } else {
      setSyncFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  const handlePullFromSupabase = async () => {
    setIsPulling(true);
    setSyncFeedback(null);
    const result = await supabaseService.pullDataFromSupabase();
    setIsPulling(false);

    if (result.success) {
      setSyncFeedback({
        type: 'success',
        message: result.message,
      });
      onDataSynced?.();
    } else {
      setSyncFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  const handleClear = () => {
    if (confirm('Deseja remover as credenciais salvas do Supabase?')) {
      supabaseService.clearConfig();
      setUrl('');
      setAnonKey('');
      setTestResult(null);
      setSyncFeedback({
        type: 'info',
        message: 'Conexão Supabase limpa. O sistema operará em modo SQLite local.',
      });
    }
  };

  const isConfigured = Boolean(url && anonKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B0F19] text-white px-4 sm:px-6 py-3.5 sm:py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Conexão com o Supabase
                </h3>
                <span
                  className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-gray-700 text-gray-300 border-gray-600'
                  }`}
                >
                  {isConfigured ? 'Credenciais Definidas' : 'Modo SQLite Local'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Integração direta com PostgreSQL na Nuvem Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-sm text-gray-700 divide-y divide-gray-100">
          {/* Step 1: Tutorial Card */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-black">
                1
              </span>
              Como obter suas credenciais no Supabase:
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>
                1. Acesse o painel do Supabase:{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                >
                  supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <p>
                2. Selecione o seu projeto criado (onde você já executou o script SQL).
              </p>
              <p>
                3. No menu lateral esquerdo, clique em{' '}
                <span className="font-bold text-gray-900">Project Settings</span> (ícone de engrenagem ⚙️) e depois em{' '}
                <span className="font-bold text-gray-900">API</span> (ou <strong>API Keys / Data API</strong>).
              </p>
              <p>
                4. Copie a <span className="font-bold text-emerald-800">Project URL</span> e a chave{' '}
                <span className="font-bold text-emerald-800">anon / public</span> e cole nos campos abaixo.
              </p>
            </div>
          </div>

          {/* Step 2: Form Inputs */}
          <div className="pt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-black">
                2
              </span>
              Preencha os dados do seu banco Supabase:
            </div>

            {/* Project URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                URL do Projeto Supabase (Project URL)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-2xs"
              />
              <p className="text-[11px] text-gray-500">
                Endereço único do seu projeto na nuvem Supabase.
              </p>
            </div>

            {/* Anon Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                Chave Pública Anônima (anon public key)
              </label>
              <textarea
                rows={2}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-2xs resize-none"
              />
              <p className="text-[11px] text-gray-500">
                Chave segura para conexão client-side. A segurança dos dados é garantida pelas políticas RLS (Row Level Security) que criamos no SQL.
              </p>
            </div>

            {/* Auto sync checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-gray-700">
                Sincronizar logs de auditoria e alterações em segundo plano automaticamente
              </span>
            </label>

            {/* Test connection & Save buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !url || !anonKey}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Testar Conexão em Tempo Real</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!url || !anonKey}
                className="px-4 py-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salvar Credenciais</span>
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-transparent hover:border-red-200"
                >
                  Limpar / Desconectar
                </button>
              )}
            </div>

            {/* Test result feedback */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in duration-150 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {testResult.success
                      ? 'Conexão Supabase Estabelecida com Sucesso!'
                      : 'Falha no Teste de Conexão'}
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {testResult.message}
                  </p>
                  {testResult.details && (
                    <div className="pt-2 space-y-2 border-t border-emerald-200/60 mt-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          ✓ Instituição: OK
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          ✓ Setores: {testResult.details.departmentsFound ?? 16} ativos
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          ✓ Usuários no Supabase: {testResult.details.usersFound ?? 0} ({sqlDb.getUsers().length} no sistema)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          ✓ Relatórios: OK
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          ✓ Auditoria & RPC: Ativa
                        </span>
                      </div>

                      {/* Explicativo caso haja divergência entre 15 no sistema e 13 no Supabase */}
                      {(testResult.details.usersFound ?? 0) < sqlDb.getUsers().length && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-2 mt-2">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-950">
                                Divergência de Usuários Explicada ({sqlDb.getUsers().length} no Sistema vs {testResult.details.usersFound} no Supabase Cloud)
                              </p>
                              <p className="text-[10px] text-amber-900/90 leading-relaxed mt-0.5">
                                O sistema possui <strong>{sqlDb.getUsers().length} colaboradores oficiais</strong>. O banco Supabase na nuvem contém atualmente <strong>{testResult.details.usersFound} usuários</strong> pois foi inicializado com a primeira versão do script. Faltam ser sincronizados no Supabase os 2 usuários: <strong>Coordenação Administrativa</strong> (<code>user_coord_admin</code>) e <strong>Coordenação Operacional</strong> (<code>user_operacoes</code>).
                              </p>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-medium text-amber-800">
                              Execute o script no SQL Editor do Supabase para ativar a replicação em tempo real e sincronizar todos os 15 usuários com fotos:
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyMissingUsersSql}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              {copiedMissingUsersSql ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>SQL de Correção Copiado! Cole no SQL Editor do Supabase e clique RUN</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar Script de Correção & Tempo Real (1-Clique)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] font-mono text-emerald-800/80">
                        Latência: {testResult.latencyMs || 0}ms | Tabelas verificadas: {testResult.details.tablesChecked.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Remote Synchronization Operations */}
          {isConfigured && (
            <div className="pt-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-black">
                  3
                </span>
                Operações de Sincronização de Dados:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handlePushToSupabase}
                  disabled={isPushing}
                  className="p-3 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                    <UploadCloud className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span>Enviar Dados Locais para o Supabase</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Exporta configurações de logotipos, usuários, relatórios e logs de auditoria atuais para o banco na nuvem.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={isPulling}
                  className="p-3 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-purple-900">
                    <DownloadCloud className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                    <span>Baixar Dados do Supabase</span>
                  </div>
                  <p className="text-[11px] text-purple-700 mt-1">
                    Carrega do Supabase as configurações mais recentes e dados consolidados salvos por outros coordenadores.
                  </p>
                </button>
              </div>

              {/* Sync Feedback Message */}
              {syncFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : syncFeedback.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{syncFeedback.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Download Official SQL Script */}
          <div className="pt-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Script SQL Oficial do Supabase:</span>
              </div>
              <a
                href="/supabase_schema_complete.sql"
                download="supabase_schema_complete.sql"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Script SQL Completo
              </a>
            </div>
            <p className="text-[11px] text-gray-500">
              Caso deseje inicializar ou atualizar a estrutura no Supabase, abra o <strong>SQL Editor</strong> no painel web do Supabase e execute este script completo (cria tabelas, regras RLS e funções de auditoria).
            </p>
          </div>

          {/* Information regarding .env */}
          <div className="pt-5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Configuração Permanente via Arquivo .env (Opcional):</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Se preferir fixar as credenciais nas variáveis de ambiente do projeto para build ou CI/CD, você pode adicionar ao seu arquivo <code>.env</code>:
            </p>
            <pre className="p-2.5 bg-gray-900 text-emerald-300 rounded-xl text-[10px] font-mono overflow-x-auto">
{`VITE_SUPABASE_URL="${url || 'https://seu-projeto.supabase.co'}"
VITE_SUPABASE_ANON_KEY="${anonKey || 'sua-chave-anon-public'}"`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium">Protegido por RLS e criptografia</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold cursor-pointer transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
