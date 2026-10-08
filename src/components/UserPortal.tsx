/**
 * UserPortal: Exclusive workspace for each user/coordinator to register
 * monthly activities, indicators, encrypted financials, bullet items,
 * choose item types (Topic vs Value/Quantity), and select calendar dates.
 */
import React, { useState } from 'react';
import { DepartmentId, MetricItem, MonthlyReport, User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { offlineSync } from '../services/offlineSync';
import { 
  Check, 
  Plus, 
  Trash2, 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  Calendar, 
  User as UserIcon, 
  Layers, 
  Hash, 
  DollarSign, 
  FileText,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ArrowUpDown,
  Eye,
  EyeOff,
  Edit3,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { OFFICIAL_SECTORS, getSortedSectors, getSectorName } from '../constants/sectors';
import { 
  canUserAccessDepartment, 
  canUserViewDepartment, 
  getAllowedDepartmentsForUser,
  normalizeDepartmentId
} from '../utils/permissions';

interface Props {
  currentUser: User;
  currentReport: MonthlyReport;
  onReportUpdated: (updatedReport: MonthlyReport) => void;
  encryptionUnlocked: boolean;
  onOpenEncryptionModal: () => void;
  onOpenProfile?: () => void;
  onOpenMonthSelector?: () => void;
  onOpenHiringModal?: () => void;
}

export const UserPortal: React.FC<Props> = ({
  currentUser,
  currentReport,
  onReportUpdated,
  encryptionUnlocked,
  onOpenEncryptionModal,
  onOpenProfile,
  onOpenMonthSelector,
  onOpenHiringModal,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const allowedDepts = getAllowedDepartmentsForUser(currentUser);

  // Initial department: if admin 'rh', otherwise user's own department or first allowed department
  const defaultInitialDept: DepartmentId = isAdmin 
    ? 'rh' 
    : (allowedDepts.find(d => d.id === currentUser.departmentId)?.id || allowedDepts[0]?.id || currentUser.departmentId);

  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>(defaultInitialDept);
  const [deptSortOrder, setDeptSortOrder] = useState<'asc' | 'desc'>('asc'); // Padrão: Crescente

  // Active department key
  const activeDeptKey: DepartmentId = isAdmin 
    ? selectedDeptId 
    : (allowedDepts.some(d => d.id === selectedDeptId) ? selectedDeptId : defaultInitialDept);

  const canAccessActiveDept = canUserAccessDepartment(currentUser, activeDeptKey);
  const canViewActiveDept = canUserViewDepartment(currentUser, activeDeptKey);
  const isReadOnly = !canAccessActiveDept && canViewActiveDept;
  const isAccessDenied = !canAccessActiveDept && !canViewActiveDept;

  const activeDept = currentReport.departments[activeDeptKey] || currentReport.departments.rh;

  // Local state for editing
  const [metrics, setMetrics] = useState<MetricItem[]>(activeDept?.metrics || []);
  const [subMetrics, setSubMetrics] = useState(activeDept?.subMetrics || []);
  const [bulletActivities, setBulletActivities] = useState<string[]>(activeDept?.bulletActivities || []);
  const [subBulletSections, setSubBulletSections] = useState(activeDept?.subBulletSections || []);
  const [customNotes, setCustomNotes] = useState(activeDept?.customNotes || '');
  const [status, setStatus] = useState(activeDept?.status || 'rascunho');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New item creation state (Topic vs Value/Quantity + Optional Calendar date)
  const defaultReportDate = `${currentReport.year}-${String(currentReport.month).padStart(2, '0')}-15`;
  const [newItemType, setNewItemType] = useState<'topic' | 'metric'>('topic');
  const [useItemDate, setUseItemDate] = useState<boolean>(false);
  const [newItemDate, setNewItemDate] = useState<string>(defaultReportDate);
  const [newItemDescription, setNewItemDescription] = useState<string>('');
  const [newItemValue, setNewItemValue] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState<'numeric' | 'currency' | 'percent'>('numeric');
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(true);

  // Sync state whenever activeDeptKey changes
  React.useEffect(() => {
    const dept = currentReport.departments[activeDeptKey];
    if (dept) {
      setMetrics(dept.metrics || []);
      setSubMetrics(dept.subMetrics || []);
      setBulletActivities(dept.bulletActivities || []);
      setSubBulletSections(dept.subBulletSections || []);
      setCustomNotes(dept.customNotes || '');
      setStatus(dept.status);
    }
  }, [activeDeptKey, currentReport]);

  const handleSaveAll = async () => {
    if (!canAccessActiveDept) {
      setSaveFeedback('Ação Bloqueada: Seu perfil possui permissão apenas de visualização neste setor. Alterações não foram salvas.');
      return;
    }
    setSaving(true);
    try {
      const updated = await sqlDb.updateDepartmentData(
        currentReport.id,
        activeDeptKey,
        {
          metrics,
          subMetrics,
          bulletActivities,
          subBulletSections,
          customNotes,
          status,
        },
        currentUser
      );

      // Also record offline sync if needed
      if (!navigator.onLine) {
        offlineSync.enqueue('UPDATE_DEPARTMENT', {
          reportId: currentReport.id,
          departmentId: activeDeptKey,
        });
      }

      onReportUpdated(updated);
      setSaveFeedback('Dados salvos e auditados com sucesso no banco de dados SQL seguro.');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (e: any) {
      setSaveFeedback(`Erro ao salvar: ${e.message || 'Falha inesperada'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleMetricChange = (id: string, newVal: string | number) => {
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, value: newVal } : m))
    );
  };

  const handleMetricDateChange = (id: string, newDate: string) => {
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, date: newDate } : m))
    );
  };

  const handleSubMetricChange = (sectionIdx: number, id: string, newVal: string | number) => {
    setSubMetrics((prev) => {
      const next = [...prev];
      if (next[sectionIdx]) {
        next[sectionIdx].items = next[sectionIdx].items.map((m) =>
          m.id === id ? { ...m, value: newVal } : m
        );
      }
      return next;
    });
  };

  const handleSubMetricDateChange = (sectionIdx: number, id: string, newDate: string) => {
    setSubMetrics((prev) => {
      const next = [...prev];
      if (next[sectionIdx]) {
        next[sectionIdx].items = next[sectionIdx].items.map((m) =>
          m.id === id ? { ...m, date: newDate } : m
        );
      }
      return next;
    });
  };

  // Helper to extract date and text from a bullet activity string
  const extractDateAndText = (act: string) => {
    const match = act.match(/^\[(\d{2}\/\d{2}\/\d{4})\]\s*(.*)/);
    if (match) {
      const [dd, mm, yyyy] = match[1].split('/');
      return {
        hasDate: true,
        date: `${yyyy}-${mm}-${dd}`,
        displayDate: match[1],
        text: match[2],
      };
    }
    return {
      hasDate: false,
      date: '',
      displayDate: '',
      text: act,
    };
  };

  const handleUpdateActivityDate = (idx: number, newIsoDate: string) => {
    const currentAct = bulletActivities[idx];
    const { text } = extractDateAndText(currentAct);
    if (!newIsoDate) {
      setBulletActivities((prev) => {
        const next = [...prev];
        next[idx] = text;
        return next;
      });
      return;
    }
    const [yyyy, mm, dd] = newIsoDate.split('-');
    const updatedAct = `[${dd}/${mm}/${yyyy}] ${text}`;
    setBulletActivities((prev) => {
      const next = [...prev];
      next[idx] = updatedAct;
      return next;
    });
  };

  const handleRemoveActivityDate = (idx: number) => {
    const currentAct = bulletActivities[idx];
    const { text } = extractDateAndText(currentAct);
    setBulletActivities((prev) => {
      const next = [...prev];
      next[idx] = text;
      return next;
    });
  };

  const handleAddActivityDate = (idx: number) => {
    handleUpdateActivityDate(idx, defaultReportDate);
  };

  const handleRemoveBullet = (idx: number) => {
    setBulletActivities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveMetric = (id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  // Handler for adding new items (either Topic/Activity or Value/Quantity)
  const handleAddNewItem = () => {
    if (!newItemDescription.trim()) {
      setSaveFeedback('Por favor, informe a descrição ou título do item.');
      return;
    }

    if (newItemType === 'topic') {
      // Add topic / activity
      let formattedDate = '';
      if (useItemDate && newItemDate) {
        const [yyyy, mm, dd] = newItemDate.split('-');
        formattedDate = `[${dd}/${mm}/${yyyy}] `;
      }
      const textToAppend = `${formattedDate}${newItemDescription.trim()};`;
      setBulletActivities((prev) => [...prev, textToAppend]);
      setNewItemDescription('');
      setSaveFeedback(
        useItemDate
          ? 'Novo tópico adicionado com data do calendário! Clique em "Salvar Alterações".'
          : 'Novo tópico adicionado (sem data)! Clique em "Salvar Alterações".'
      );
    } else {
      // Add value / quantity metric
      const rawValStr = String(newItemValue).trim();
      let finalVal: number | string = rawValStr;
      if (newItemUnit === 'currency') {
        if (!rawValStr.startsWith('R$')) {
          finalVal = `R$ ${rawValStr || '0,00'}`;
        }
      } else if (newItemUnit === 'percent') {
        if (!rawValStr.endsWith('%')) {
          finalVal = `${rawValStr || '0'}%`;
        }
      } else {
        const num = Number(rawValStr.replace(/\./g, '').replace(',', '.'));
        finalVal = !isNaN(num) && rawValStr !== '' ? num : rawValStr || 0;
      }

      const newMetricItem: MetricItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        label: newItemDescription.trim(),
        value: finalVal,
        date: useItemDate ? newItemDate : undefined,
        unitType: newItemUnit,
      };

      setMetrics((prev) => [...prev, newMetricItem]);
      setNewItemDescription('');
      setNewItemValue('');
      setSaveFeedback(
        useItemDate
          ? 'Novo item de valor adicionado com data! Clique em "Salvar Alterações".'
          : 'Novo item de valor adicionado (sem data)! Clique em "Salvar Alterações".'
      );
    }
  };

  if (isAccessDenied) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Acesso Restrito ao Departamento</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Você não possui permissão para acessar ou visualizar o departamento <strong>{getSectorName(activeDeptKey)}</strong>. 
          Conforme as diretrizes institucionais, cada colaborador acessa e visualiza apenas o seu próprio setor ({currentUser.departmentName}), a menos que autorização expressa seja concedida pela Administração.
        </p>
        {allowedDepts.length > 0 && (
          <button
            onClick={() => setSelectedDeptId(allowedDepts[0].id)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Voltar para {allowedDepts[0].name}
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="user-portal-container" className="space-y-6 max-w-5xl mx-auto">
      {/* Informative Banner for Read-Only Mode */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <Eye className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              Modo Somente Leitura (Visualização Autorizada)
            </h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Você possui permissão especial concedida pela Administração para <strong>visualizar</strong> os dados deste departamento ({getSectorName(activeDeptKey)}). A edição, inclusão e exclusão de métricas e atividades estão desabilitadas para o seu usuário.
            </p>
          </div>
          <span className="bg-amber-200/60 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
            Apenas Leitura
          </span>
        </div>
      )}

      {/* Header card with user info and edit profile shortcut */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 sm:p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4">
            <div className="relative group shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-gray-700 shadow-xs">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 break-words">{activeDept.coordinatorTitle}</h2>
                {onOpenMonthSelector ? (
                  <button
                    type="button"
                    onClick={onOpenMonthSelector}
                    title="Clique para alterar o mês/ano do relatório"
                    className="bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Calendar className="w-3 h-3 text-blue-700" />
                    <span>{currentReport.monthName} {currentReport.year}</span>
                    <span className="text-[10px] text-blue-700 font-bold underline">Alterar Mês</span>
                  </button>
                ) : (
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
                    {currentReport.monthName} {currentReport.year}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 break-words">
                Coordenador(a): <span className="font-semibold text-gray-900">{activeDept.coordinatorName}</span> •{' '}
                {activeDept.coordinatorPhone} • <span className="break-all">{activeDept.coordinatorEmail}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Editar Meu Cadastro (Foto, E-mail, Função, Telefone)
                  </button>
                )}

                {(currentUser.role === 'admin' || activeDeptKey === 'rh') && onOpenHiringModal && (
                  <button
                    type="button"
                    onClick={onOpenHiringModal}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                    Cadastrar Gráfico: Aprendizes & Estagiários (Pág 2)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Department Switcher: Admin (All 15) vs Non-Admin (Only Allowed Depts) */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 text-xs bg-gray-50 p-1 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-700 pl-1">Setor:</span>
                <select
                  aria-label="Selecionar setor para lançamento de dados"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value as DepartmentId)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
                >
                  {getSortedSectors(deptSortOrder).map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setDeptSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title="Alternar ordenação da lista de setores"
                  className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ArrowUpDown className="w-3 h-3 text-blue-600" />
                  <span>{deptSortOrder === 'asc' ? 'Crescente (A-Z)' : 'Decrescente (Z-A)'}</span>
                </button>
              </div>
            ) : allowedDepts.length > 1 ? (
              <div className="flex items-center gap-1.5 text-xs bg-blue-50/80 p-1 rounded-xl border border-blue-200">
                <span className="font-bold text-blue-900 pl-1">Meus Setores Autorizados:</span>
                <select
                  aria-label="Selecionar entre seus setores autorizados"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value as DepartmentId)}
                  className="border border-blue-300 rounded-lg px-2.5 py-1 text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
                >
                  {allowedDepts.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.canAccess ? '(Acesso Total)' : '(Somente Leitura)'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold shadow-2xs">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Meu Setor: <strong>{allowedDepts[0]?.name || getSectorName(currentUser.departmentId)}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                aria-label="Status do setor"
                value={status}
                disabled={isReadOnly}
                onChange={(e) => setStatus(e.target.value as any)}
                className={`border rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  isReadOnly ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-300 bg-gray-50 text-gray-800'
                }`}
              >
                <option value="rascunho">🟡 Rascunho</option>
                <option value="em_revisao">🔵 Em Revisão</option>
                <option value="concluido">🟢 Concluído</option>
                <option value="aprovado">✅ Aprovado Oficial</option>
              </select>

              <button
                id="btn-save-portal-changes"
                onClick={handleSaveAll}
                disabled={saving || isReadOnly}
                title={isReadOnly ? 'Modo somente leitura ativo: alterações desabilitadas' : 'Salvar Alterações'}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors shadow-xs ${
                  isReadOnly
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-[#0B0F19] hover:bg-black cursor-pointer disabled:opacity-50'
                }`}
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isReadOnly ? 'Somente Leitura' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback alert */}
        {saveFeedback && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {saveFeedback}
            </span>
            <span className="text-[10px] text-emerald-600 font-mono">Trilha de Auditoria Gravada</span>
          </div>
        )}
      </div>

      {/* Financial E2EE Notice Bar */}
      {(activeDeptKey === 'financeiro' || activeDeptKey === 'rh') && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <div>
              <p className="font-bold">Criptografia Ponta a Ponta Ativa (AES-256-GCM)</p>
              <p className="text-amber-800">
                Os registros financeiros e de folha de pagamento são criptografados na ponta antes da gravação no SQL.
              </p>
            </div>
          </div>

          {currentUser.role === 'admin' && (
            <button
              onClick={onOpenEncryptionModal}
              className="px-3 py-1.5 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              {encryptionUnlocked ? 'Chave Desbloqueada ✓' : 'Gerenciar Chave E2EE'}
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CARD: ADICIONAR NOVO ITEM (Tópico de Atividade OU Valor/Quantidade)       */}
      {/* COM OPÇÃO DE CALENDÁRIO (Apenas se tiver permissão de acesso)             */}
      {/* ========================================================================= */}
      {!isReadOnly && (
        <div className="bg-white rounded-xl shadow-xs border-2 border-blue-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-gray-900">
                  Adicionar Novo Item ao Setor
                </h3>
                <p className="text-xs text-gray-500">
                  Escolha o tipo de item (Tópico de atividade ou Valor/Quantidade) e selecione a data no calendário
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddItemOpen(!isAddItemOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              {isAddItemOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

        {isAddItemOpen && (
          <div className="space-y-4 pt-1">
            {/* Step 1: Selector between Topic vs Value/Quantity */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1.5">
                Tipo do Item a ser cadastrado:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewItemType('topic')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    newItemType === 'topic'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${newItemType === 'topic' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs">Item de Tópico / Atividade</span>
                    <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                      Para tarefas realizadas, rotinas de tecnologia, limpeza, projetos, manutenção ou reuniões
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewItemType('metric')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    newItemType === 'metric'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${newItemType === 'metric' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs">Item de Valor / Quantidade</span>
                    <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                      Para indicadores numéricos, contagens de jovens, atendimentos, metas ou valores financeiros R$
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Form Inputs according to type */}
            <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-3">
              {/* Optional Date Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useItemDate}
                    onChange={(e) => setUseItemDate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                    Vincular Data no Calendário (Opcional)
                  </span>
                </label>
                <span className="text-[11px] text-gray-500">
                  {useItemDate ? 'Data ativa no item' : 'Item será cadastrado sem data'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Calendar Date Picker (Only if enabled by user) */}
                {useItemDate && (
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                      Data no Calendário
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={newItemDate}
                        onChange={(e) => setNewItemDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Description field */}
                <div
                  className={
                    newItemType === 'topic'
                      ? useItemDate
                        ? 'sm:col-span-6'
                        : 'sm:col-span-10'
                      : useItemDate
                      ? 'sm:col-span-4'
                      : 'sm:col-span-6'
                  }
                >
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {newItemType === 'topic' ? 'Descrição da Atividade / Ação' : 'Nome do Indicador / Categoria'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      newItemType === 'topic'
                        ? 'Ex: Manutenção preventiva dos servidores e backup em nuvem'
                        : 'Ex: Aprendizes Capacitados ou Doações'
                    }
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewItem()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* If Metric: Value and Unit fields */}
                {newItemType === 'metric' && (
                  <>
                    <div className={useItemDate ? 'sm:col-span-2' : 'sm:col-span-3'}>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Valor / Qtd
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 15 ou 450,00"
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewItem()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className={useItemDate ? 'sm:col-span-2' : 'sm:col-span-3'}>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Unidade
                      </label>
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value as any)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="numeric">Número</option>
                        <option value="currency">R$ Moeda</option>
                        <option value="percent">% Taxa</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Submit button */}
                <div className={newItemType === 'topic' ? 'sm:col-span-2' : 'sm:col-span-12 sm:flex sm:justify-end sm:mt-1'}>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Tabular Metrics (Indicadores & Quantitativos com Opção de Calendário) */}
      {/* ========================================================================= */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900">
                Indicadores & Quantitativos do Mês ({metrics.length})
              </h3>
              <p className="text-xs text-gray-500">
                Cada indicador possui opção de calendário para vincular a data de aferição
              </p>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Ajuste valores e datas livremente
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                  <th className="p-2.5 text-left font-bold">Indicador / Descrição</th>
                  <th className="p-2.5 text-center font-bold w-40">Data no Calendário</th>
                  <th className="p-2.5 text-center font-bold w-44">Valor / Quantidade</th>
                  <th className="p-2.5 text-center font-bold w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/80">
                    <td className="p-2.5 font-medium text-gray-900">{m.label}</td>
                    
                    {/* Calendar date picker for metric (Optional) */}
                    <td className="p-2 text-center">
                      {m.date ? (
                        <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-300 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <input
                            type="date"
                            aria-label={`Data de ${m.label}`}
                            value={m.date}
                            disabled={isReadOnly}
                            onChange={(e) => handleMetricDateChange(m.id, e.target.value)}
                            className="text-xs font-mono font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          {!isReadOnly && (
                            <button
                              type="button"
                              title="Remover data deste indicador"
                              onClick={() => handleMetricDateChange(m.id, '')}
                              className="text-gray-400 hover:text-red-500 font-bold text-xs px-1 cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : isReadOnly ? (
                        <span className="text-[11px] text-gray-400 font-mono">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMetricDateChange(m.id, defaultReportDate)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-dashed border-gray-300 hover:border-blue-300 transition-colors cursor-pointer"
                          title="Clique para vincular data do calendário"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>+ Data</span>
                        </button>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {typeof m.value === 'number' && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleMetricChange(m.id, Math.max(0, (m.value as number) - 1))}
                            className="w-6 h-6 rounded border border-gray-300 text-gray-700 hover:bg-gray-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                          >
                            -
                          </button>
                        )}
                        <input
                          type="text"
                          aria-label={m.label}
                          value={String(m.value)}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = Number(val);
                            handleMetricChange(m.id, isNaN(num) ? val : num);
                          }}
                          className={`w-28 text-center border rounded px-2 py-1 text-xs md:text-sm font-bold ${
                            isReadOnly 
                              ? 'bg-gray-100 text-gray-700 border-gray-200 cursor-not-allowed'
                              : 'text-gray-900 bg-white border-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                          }`}
                        />
                        {typeof m.value === 'number' && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleMetricChange(m.id, (m.value as number) + 1)}
                            className="w-6 h-6 rounded border border-gray-300 text-gray-700 hover:bg-gray-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      {!isReadOnly ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMetric(m.id)}
                          title="Remover indicador"
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span title="Modo leitura: remoção bloqueada">
                          <Lock className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Sub-metrics / Additional Tables com Calendário                         */}
      {/* ========================================================================= */}
      {subMetrics.map((section, sIdx) => (
        <div key={sIdx} className="bg-white rounded-xl shadow-xs border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm md:text-base font-bold text-gray-900">{section.title}</h3>
            <span className="text-xs font-semibold text-gray-500">Tabela Complementar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                  <th className="p-2.5 text-left font-bold">Item / Categoria</th>
                  <th className="p-2.5 text-center font-bold w-40">Data no Calendário</th>
                  <th className="p-2.5 text-center font-bold w-44">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {section.items.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/80">
                    <td className="p-2.5 font-medium text-gray-900">{m.label}</td>
                    
                    {/* Calendar date picker for submetric */}
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-300 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <input
                          type="date"
                          aria-label={`Data de ${m.label}`}
                          value={m.date || defaultReportDate}
                          disabled={isReadOnly}
                          onChange={(e) => handleSubMetricDateChange(sIdx, m.id, e.target.value)}
                          className="text-xs font-mono font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {typeof m.value === 'number' && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleSubMetricChange(sIdx, m.id, Math.max(0, (m.value as number) - 1))}
                            className="w-6 h-6 rounded border border-gray-300 text-gray-700 hover:bg-gray-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                          >
                            -
                          </button>
                        )}
                        <input
                          type="text"
                          aria-label={m.label}
                          value={String(m.value)}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = Number(val);
                            handleSubMetricChange(sIdx, m.id, isNaN(num) ? val : num);
                          }}
                          className={`w-28 text-center border rounded px-2 py-1 text-xs md:text-sm font-bold ${
                            isReadOnly
                              ? 'bg-gray-100 text-gray-700 border-gray-200 cursor-not-allowed'
                              : 'text-gray-900 bg-white border-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                          }`}
                        />
                        {typeof m.value === 'number' && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleSubMetricChange(sIdx, m.id, (m.value as number) + 1)}
                            className="w-6 h-6 rounded border border-gray-300 text-gray-700 hover:bg-gray-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ========================================================================= */}
      {/* 3. Bullet / Topic Activities com Opção de Calendário                      */}
      {/* ========================================================================= */}
      {bulletActivities.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900">
                Tópicos & Atividades Realizadas ({bulletActivities.length})
              </h3>
              <p className="text-xs text-gray-500">
                Cada atividade possui data de execução configurável no calendário
              </p>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Altere os textos ou selecione a data correspondente
            </span>
          </div>

          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
            {bulletActivities.map((act, idx) => {
              const { hasDate, date, text } = extractDateAndText(act);
              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>

                    {/* Calendar date picker for this specific activity item (Optional) */}
                    {hasDate ? (
                      <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-300 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <input
                          type="date"
                          aria-label={`Data da atividade ${idx + 1}`}
                          value={date}
                          disabled={isReadOnly}
                          onChange={(e) => handleUpdateActivityDate(idx, e.target.value)}
                          className="text-[11px] font-mono font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        />
                        {!isReadOnly && (
                          <button
                            type="button"
                            title="Remover data desta atividade"
                            onClick={() => handleRemoveActivityDate(idx)}
                            className="text-gray-400 hover:text-red-500 font-bold text-xs px-1 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ) : isReadOnly ? (
                      <span className="text-[11px] text-gray-400 font-mono">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddActivityDate(idx)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-dashed border-gray-300 hover:border-blue-300 transition-colors cursor-pointer"
                        title="Vincular data do calendário a esta atividade"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>+ Data</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    aria-label={`Texto da atividade ${idx + 1}`}
                    value={text}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      const newArr = [...bulletActivities];
                      if (hasDate && date) {
                        const [yyyy, mm, dd] = date.split('-');
                        newArr[idx] = `[${dd}/${mm}/${yyyy}] ${e.target.value}`;
                      } else {
                        newArr[idx] = e.target.value;
                      }
                      setBulletActivities(newArr);
                    }}
                    className={`flex-1 px-2 py-1 rounded sm:rounded-none text-xs md:text-sm font-medium ${
                      isReadOnly
                        ? 'bg-transparent text-gray-700 cursor-default border-none'
                        : 'bg-white sm:bg-transparent border sm:border-none border-gray-300 text-gray-900 focus:outline-none focus:ring-1 sm:focus:ring-0 focus:ring-blue-500'
                    }`}
                  />

                  {!isReadOnly ? (
                    <button
                      type="button"
                      aria-label={`Remover atividade ${idx + 1}`}
                      onClick={() => handleRemoveBullet(idx)}
                      className="self-end sm:self-center p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span title="Modo somente leitura" className="self-end sm:self-center p-1">
                      <Lock className="w-3.5 h-3.5 text-gray-300" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Sub-Bullet Sections (Projetos & Presidência) */}
      {subBulletSections.map((section, sIdx) => (
        <div key={sIdx} className="bg-white rounded-xl shadow-xs border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm md:text-base font-bold text-gray-900">{section.title}</h3>
            <span className="text-xs text-gray-500 font-medium">Sub-bloco de Ações</span>
          </div>

          <div className="space-y-2 mb-3">
            {section.items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <input
                  type="text"
                  value={item}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const next = [...subBulletSections];
                    next[sIdx].items[itemIdx] = e.target.value;
                    setSubBulletSections(next);
                  }}
                  className={`flex-1 text-xs md:text-sm rounded px-2 py-1 ${
                    isReadOnly
                      ? 'bg-gray-50 text-gray-700 border-none cursor-default'
                      : 'text-gray-900 border border-gray-200 bg-white'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bottom Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs text-gray-500">
          Todas as alterações são auditadas e gravadas com hash criptográfico SHA-256
        </span>
        <button
          onClick={handleSaveAll}
          disabled={saving || isReadOnly}
          title={isReadOnly ? 'Modo somente leitura: alterações desabilitadas' : 'Salvar Alterações do Setor'}
          className={`w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-5 py-2 text-white text-xs font-bold rounded-lg transition-colors shadow-xs ${
            isReadOnly
              ? 'bg-gray-400 cursor-not-allowed opacity-60'
              : 'bg-[#0B0F19] hover:bg-black cursor-pointer disabled:opacity-50'
          }`}
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isReadOnly ? 'Somente Leitura' : 'Salvar Alterações do Setor'}
        </button>
      </div>
    </div>
  );
};
