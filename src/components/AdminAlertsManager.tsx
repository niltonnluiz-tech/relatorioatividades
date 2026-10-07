import React, { useState } from 'react';
import { NotificationCampaign, NotificationMetricsSummary, User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { 
  Bell, 
  Mail, 
  Send, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Eye, 
  MousePointer, 
  Smartphone,
  Sparkles,
  Calendar,
  Layers,
  BarChart3,
  Check
} from 'lucide-react';

interface Props {
  currentUser: User;
  onRefresh?: () => void;
}

export const AdminAlertsManager: React.FC<Props> = ({ currentUser, onRefresh }) => {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>(() => sqlDb.getNotificationCampaigns());
  const [metrics, setMetrics] = useState<NotificationMetricsSummary>(() => sqlDb.getNotificationMetrics());
  const users = sqlDb.getUsers();

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionUrl, setActionUrl] = useState('#preview');
  const [usePush, setUsePush] = useState(true);
  const [useEmail, setUseEmail] = useState(true);
  const [targetPreference, setTargetPreference] = useState<'ALL' | 'REPORTS' | 'METRICS' | 'GENERAL' | 'SECURITY'>('REPORTS');
  const [targetEngagement, setTargetEngagement] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('09:30');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Real-time Push Preview simulation
  const [activeSimulation, setActiveSimulation] = useState<NotificationCampaign | null>(null);

  const calculateTargetCount = () => {
    let count = users.length;
    if (targetEngagement === 'HIGH') count = Math.ceil(users.length * 0.4);
    else if (targetEngagement === 'MEDIUM') count = Math.ceil(users.length * 0.35);
    else if (targetEngagement === 'LOW') count = Math.max(1, Math.floor(users.length * 0.25));
    return count;
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      alert('Por favor, preencha o título e o texto do alerta.');
      return;
    }

    if (!usePush && !useEmail) {
      alert('Selecione pelo menos um canal de envio (Push Notification ou E-mail).');
      return;
    }

    setIsSubmitting(true);
    try {
      const channels: ('push' | 'email')[] = [];
      if (usePush) channels.push('push');
      if (useEmail) channels.push('email');

      const recipientsCount = calculateTargetCount();

      const newCampaign = await sqlDb.sendNotificationCampaign(
        {
          title: title.trim(),
          message: body.trim(),
          body: body.trim(),
          channels,
          targetPreference,
          targetEngagement,
          scheduledTime: isScheduled ? scheduledTime : undefined,
          actionUrl: actionUrl.trim(),
          recipientsCount,
          status: isScheduled ? 'scheduled' : 'sent',
        },
        currentUser
      );

      // Trigger interactive simulation popup for demo
      setActiveSimulation(newCampaign);

      setFeedbackNotice(
        `Alerta "${title}" disparado com sucesso via ${channels.join(' & ')} para ${recipientsCount} usuários!`
      );
      setTitle('');
      setBody('');
      setCampaigns(sqlDb.getNotificationCampaigns());
      setMetrics(sqlDb.getNotificationMetrics());
      if (onRefresh) onRefresh();

      setTimeout(() => setFeedbackNotice(null), 5000);
    } catch (err: any) {
      alert(`Erro no disparo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateOpen = (campId: string) => {
    sqlDb.recordNotificationInteraction(campId, 'open');
    setCampaigns(sqlDb.getNotificationCampaigns());
    setMetrics(sqlDb.getNotificationMetrics());
  };

  const handleSimulateClick = (campId: string) => {
    sqlDb.recordNotificationInteraction(campId, 'click');
    setCampaigns(sqlDb.getNotificationCampaigns());
    setMetrics(sqlDb.getNotificationMetrics());
    setActiveSimulation(null);
  };

  // Safe hours check (8:00 to 18:00)
  const isSafeHour = () => {
    if (!scheduledTime) return true;
    const hour = parseInt(scheduledTime.split(':')[0], 10);
    return hour >= 8 && hour < 18;
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner (Interactive Floating Notification Preview) */}
      {activeSimulation && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-white border-2 border-blue-600 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Push Notification Recebida • Agora
              </span>
              <h4 className="font-bold text-sm text-gray-900 leading-tight mt-0.5">
                {activeSimulation.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{activeSimulation.body}</p>
              
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleSimulateClick(activeSimulation.id)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Abrir Relatório
                </button>
                <button
                  onClick={() => {
                    handleSimulateOpen(activeSimulation.id);
                    setActiveSimulation(null);
                  }}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Campanhas Enviadas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{metrics.totalCampaigns}</div>
          <span className="text-[11px] text-gray-500">Total de disparos no sistema</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Taxa de Entrega</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{metrics.deliveryRate}%</div>
          <span className="text-[11px] text-gray-500">{metrics.deliveredTotal} alertas entregues</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Taxa de Abertura</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2">{metrics.openRate}%</div>
          <span className="text-[11px] text-gray-500">{metrics.openedTotal} leituras registradas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Taxa de Cliques (CTR)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <MousePointer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{metrics.clickRate}%</div>
          <span className="text-[11px] text-gray-500">{metrics.clickedTotal} ações concluídas</span>
        </div>
      </div>

      {/* Main Alert Dispatcher Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B0F19] text-white rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Disparador de Alertas Automáticos (Push & E-mail)
              </h3>
              <p className="text-xs text-gray-500">
                Segmentação inteligente por preferência de conteúdo e nível de engajamento com horário seguro
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
            {users.length} usuários cadastrados
          </span>
        </div>

        {feedbackNotice && (
          <div className="m-6 mb-0 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        <form onSubmit={handleSendCampaign} className="p-5 sm:p-6 space-y-5">
          {/* Channel Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Canais de Entrega Automática:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  usePush
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={usePush}
                  onChange={(e) => setUsePush(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs">Push Notification (Web / Mobile)</span>
                  <span className="text-[11px] text-gray-500 block">
                    Alerta instantâneo na tela do computador ou celular
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  useEmail
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={useEmail}
                  onChange={(e) => setUseEmail(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="p-2 rounded-lg bg-emerald-600 text-white">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs">E-mail Institucional</span>
                  <span className="text-[11px] text-gray-500 block">
                    Notificação formatada para a caixa postal do colaborador
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Title and Message */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Título do Alerta
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Lembrete: Fechamento do Relatório Mensal encerra em 48h"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mensagem / Conteúdo do Comunicado
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ex: Prezado(a) Coordenador(a), solicitamos a gentileza de revisar os indicadores e atividades do seu setor para a consolidação oficial do relatório."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Segmentation Settings (Preference & Engagement) */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-gray-800 uppercase tracking-wider">
              <Target className="w-4 h-4 text-blue-600" />
              <span>Segmentação Avançada de Usuários</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Segment by Preference */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  1. Preferência de Conteúdo / Tópico:
                </label>
                <select
                  value={targetPreference}
                  onChange={(e) => setTargetPreference(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="REPORTS">Fechamento de Relatórios & Prazos Críticos</option>
                  <option value="METRICS">Indicadores, Metas & Aprendizes</option>
                  <option value="GENERAL">Comunicados da Presidência & Gerais</option>
                  <option value="SECURITY">Segurança da Informação & LGPD</option>
                  <option value="ALL">Todos os Tópicos Institucionais</option>
                </select>
                <span className="text-[10px] text-gray-500 block mt-1">
                  Filtra destinatários com interesse habilitado nesta categoria
                </span>
              </div>

              {/* Segment by Engagement */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  2. Nível de Engajamento:
                </label>
                <select
                  value={targetEngagement}
                  onChange={(e) => setTargetEngagement(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">Todos os Colaboradores ({users.length} usuários)</option>
                  <option value="LOW">Baixo Engajamento (Necessitam de lembrete)</option>
                  <option value="MEDIUM">Engajamento Médio / Regular</option>
                  <option value="HIGH">Alto Engajamento (Usuários ativos frequentes)</option>
                </select>
                <span className="text-[10px] text-gray-500 block mt-1">
                  Público estimado: {calculateTargetCount()} destinatários ativos
                </span>
              </div>
            </div>
          </div>

          {/* Schedule & Timing Personalization */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Personalizar Horário de Envio (Evitar incômodos fora do expediente)
                </span>
              </label>

              {isScheduled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-semibold">Horário Programado:</span>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {isScheduled && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  isSafeHour()
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {isSafeHour() ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>Horário Comercial Seguro:</strong> O envio ocorrerá entre 08:00 e 18:00, respeitando o descanso dos colaboradores.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>Aviso:</strong> O horário selecionado está fora do expediente padrão. Considere agendar entre 08:30 e 17:30.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-gray-500">
              Registrado com auditoria LGPD SHA-256 e rastreador de engajamento
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0B0F19] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting
                ? 'Disparando...'
                : isScheduled
                ? `Programar Alerta para às ${scheduledTime}`
                : 'Disparar Alerta Agora'}
            </button>
          </div>
        </form>
      </div>

      {/* History of Sent Notifications & Performance Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Histórico de Disparos & Métricas de Abertura e Cliques
            </h3>
            <p className="text-xs text-gray-500">
              Monitore o engajamento individual de cada comunicado enviado
            </p>
          </div>
          <span className="text-xs text-gray-500 font-semibold">
            {campaigns.length} registros
          </span>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3 text-left">Data/Hora</th>
                <th className="p-3 text-left">Título da Campanha</th>
                <th className="p-3 text-center">Canais</th>
                <th className="p-3 text-center">Segmentação</th>
                <th className="p-3 text-center">Enviados</th>
                <th className="p-3 text-center">Aberturas</th>
                <th className="p-3 text-center">Cliques</th>
                <th className="p-3 text-center">Ação Demo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white font-medium">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Nenhum alerta disparado ainda.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const openPercent = c.metrics.delivered > 0
                    ? Math.round((c.metrics.opened / c.metrics.delivered) * 100)
                    : 0;
                  const clickPercent = c.metrics.opened > 0
                    ? Math.round((c.metrics.clicked / c.metrics.opened) * 100)
                    : 0;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3 font-mono text-gray-600 whitespace-nowrap">
                        {c.sentAt.replace('T', ' ')}
                      </td>
                      <td className="p-3 text-gray-900 font-bold max-w-xs">
                        <p className="truncate">{c.title}</p>
                        <p className="text-[11px] text-gray-500 font-normal truncate">{c.body}</p>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {c.channels.includes('push') && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              Push
                            </span>
                          )}
                          {c.channels.includes('email') && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              E-mail
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {c.targetPreference} • {c.targetEngagement}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-800">
                        {c.recipientsCount}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-purple-700">
                          {c.metrics.opened} ({openPercent}%)
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-amber-700">
                          {c.metrics.clicked} ({clickPercent}%)
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSimulateOpen(c.id)}
                            title="Simular leitura por um usuário"
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-bold cursor-pointer"
                          >
                            + Abertura
                          </button>
                          <button
                            onClick={() => handleSimulateClick(c.id)}
                            title="Simular clique no link por um usuário"
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-bold cursor-pointer"
                          >
                            + Clique
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
