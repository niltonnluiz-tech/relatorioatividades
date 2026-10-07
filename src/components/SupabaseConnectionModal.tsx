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
} from 'lucide-react';
import { supabaseService, SupabaseConfig } from '../services/supabaseClient';

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
      setSyncFeedback({
        type: 'success',
        message: `${result.message} (${JSON.stringify(result.recordsPushed)})`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B0F19] text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Conexão com o Supabase
                </h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-gray-700 text-gray-300 border-gray-600'
                  }`}
                >
                  {isConfigured ? 'Credenciais Definidas' : 'Modo SQLite Local'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700 divide-y divide-gray-100">
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
                    <p className="text-[10px] font-mono opacity-80 pt-1">
                      Tabelas verificadas: {testResult.details.tablesChecked.join(', ')} | Logs encontrados:{' '}
                      {testResult.details.auditLogsFound} | Usuários remotos: {testResult.details.usersFound}
                    </p>
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
