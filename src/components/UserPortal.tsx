/**
 * UserPortal: Exclusive workspace for each user/coordinator to register
 * monthly activities, indicators, encrypted financials, bullet items,
 * choose item types (Topic vs Value/Quantity), and select calendar dates.
 */
import React, { useState } from 'react';
import { DepartmentId, MetricItem, MonthlyReport, User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { INITIAL_MONTHLY_REPORT } from '../data/initialData';
import { offlineSync } from '../services/offlineSync';
import { supabaseService } from '../services/supabaseClient';
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
  AlertTriangle,
  Eraser,
  Upload
} from 'lucide-react';
import { OFFICIAL_SECTORS, getSortedSectors, getSectorName, getSectorDescription, saveSectorDescription } from '../constants/sectors';
import { ImportItemsModal } from './ImportItemsModal';
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

  // Initial department: Always prioritizes user's own department (e.g. coordenador_administrativo)
  const defaultInitialDept: DepartmentId = (
    currentUser.departmentId && OFFICIAL_SECTORS.some(s => s.id === currentUser.departmentId)
      ? currentUser.departmentId
      : (isAdmin ? 'coordenador_administrativo' : (allowedDepts.find(d => d.id === currentUser.departmentId)?.id || allowedDepts[0]?.id || 'coordenador_administrativo'))
  );

  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>(defaultInitialDept);
  const [deptSortOrder, setDeptSortOrder] = useState<'asc' | 'desc'>('asc'); // Padrão: Crescente

  // Automatically sync active department when currentUser changes (e.g., on login or profile update)
  React.useEffect(() => {
    if (currentUser?.departmentId && OFFICIAL_SECTORS.some(s => s.id === currentUser.departmentId)) {
      setSelectedDeptId(currentUser.departmentId);
    } else if (isAdmin) {
      setSelectedDeptId('coordenador_administrativo');
    }
  }, [currentUser?.id, currentUser?.departmentId, isAdmin]);

  // Active department key
  const activeDeptKey: DepartmentId = isAdmin 
    ? selectedDeptId 
    : (allowedDepts.some(d => d.id === selectedDeptId) ? selectedDeptId : defaultInitialDept);

  const canAccessActiveDept = canUserAccessDepartment(currentUser, activeDeptKey);
  const canViewActiveDept = canUserViewDepartment(currentUser, activeDeptKey);
  const isReadOnly = !canAccessActiveDept && canViewActiveDept;
  const isAccessDenied = !canAccessActiveDept && !canViewActiveDept;

  const activeDept = currentReport.departments[activeDeptKey] || currentReport.departments.coordenador_administrativo;

  // Resolve the registered coordinator user assigned to this active department
  const activeDeptCoordinator = React.useMemo(() => {
    if (currentUser.departmentId === activeDeptKey) {
      return currentUser;
    }
    const allUsers = sqlDb.getUsers();
    let found = allUsers.find((u) => u.departmentId === activeDeptKey);
    if (!found) {
      if (activeDeptKey === 'pedagogico') found = allUsers.find(u => u.departmentId === 'ensino');
      else if (activeDeptKey === 'psicologia' || activeDeptKey === 'social') found = allUsers.find(u => u.departmentId === 'psicologia_social');
      else if ((activeDeptKey as string) === 'operacoes') found = allUsers.find(u => u.id === 'user_operacoes' || u.departmentId === 'limpeza');
      else if (activeDeptKey === 'coordenador_administrativo' || activeDeptKey === 'admin') found = allUsers.find(u => u.id === 'user_admin' || u.id === 'user_coord_admin');
    }
    return found || null;
  }, [currentUser, activeDeptKey]);

  // Determine avatar and name to display for this department
  const coordinatorAvatarToDisplay =
    activeDept?.coordinatorAvatar ||
    activeDeptCoordinator?.avatarUrl ||
    (currentUser.departmentId === activeDeptKey ? currentUser.avatarUrl : '');

  const coordinatorNameToDisplay =
    activeDept?.coordinatorName ||
    activeDeptCoordinator?.name ||
    currentUser.name;

  const isViewingOtherDept = isAdmin && currentUser.departmentId !== activeDeptKey;

  // Local state for editing
  const [metrics, setMetrics] = useState<MetricItem[]>(activeDept?.metrics ? [...activeDept.metrics] : []);
  const [subMetrics, setSubMetrics] = useState(activeDept?.subMetrics ? JSON.parse(JSON.stringify(activeDept.subMetrics)) : []);
  const [bulletActivities, setBulletActivities] = useState<string[]>(activeDept?.bulletActivities ? [...activeDept.bulletActivities] : []);
  const [subBulletSections, setSubBulletSections] = useState(activeDept?.subBulletSections ? JSON.parse(JSON.stringify(activeDept.subBulletSections)) : []);
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
  // Department description editing state
  const [sectorDescription, setSectorDescription] = useState<string>(() => getSectorDescription(activeDeptKey));
  const [isEditDescModalOpen, setIsEditDescModalOpen] = useState(false);
  const [editDescInput, setEditDescInput] = useState('');

  // Clear items state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearOption, setClearOption] = useState<'topics' | 'metrics' | 'all'>('topics');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sync state whenever activeDeptKey changes
  React.useEffect(() => {
    setSectorDescription(getSectorDescription(activeDeptKey));
    const dept = currentReport.departments[activeDeptKey] || (INITIAL_MONTHLY_REPORT.departments as any)[activeDeptKey];
    if (dept) {
      setMetrics(dept.metrics ? [...dept.metrics] : []);
      setSubMetrics(dept.subMetrics ? JSON.parse(JSON.stringify(dept.subMetrics)) : []);
      setBulletActivities(dept.bulletActivities ? [...dept.bulletActivities] : []);
      setSubBulletSections(dept.subBulletSections ? JSON.parse(JSON.stringify(dept.subBulletSections)) : []);
      setCustomNotes(dept.customNotes || '');
      setStatus(dept.status || 'rascunho');
    } else {
      setMetrics([]);
      setSubMetrics([]);
      setBulletActivities([]);
      setSubBulletSections([]);
      setCustomNotes('');
      setStatus('rascunho');
    }
  }, [activeDeptKey, currentReport]);

  const handleSaveSectorDescription = async () => {
    if (!editDescInput.trim()) return;
    await sqlDb.updateSectorDescription(activeDeptKey, editDescInput.trim(), currentUser);
    setSectorDescription(editDescInput.trim());
    setIsEditDescModalOpen(false);
    if (supabaseService.isConfigured() && supabaseService.getConfig().autoSync) {
      supabaseService.pushLocalDataToSupabase().catch(() => {});
    }
    setSaveFeedback(`Descrição do setor "${getSectorName(activeDeptKey)}" atualizada com sucesso!`);
    setTimeout(() => setSaveFeedback(null), 4000);
  };

  const handleExecuteClear = async () => {
    setIsClearModalOpen(false);
    setSaving(true);
    try {
      const updated = await sqlDb.clearDepartmentItems(
        currentReport.id,
        activeDeptKey,
        {
          clearTopics: clearOption === 'topics',
          clearMetrics: clearOption === 'metrics',
          clearAll: clearOption === 'all',
        },
        currentUser
      );
      if (clearOption === 'topics' || clearOption === 'all') {
        setBulletActivities([]);
        setSubBulletSections([]);
      }
      if (clearOption === 'metrics' || clearOption === 'all') {
        setMetrics([]);
        setSubMetrics([]);
      }
      if (supabaseService.isConfigured() && supabaseService.getConfig().autoSync) {
        supabaseService.pushLocalDataToSupabase().catch(() => {});
      }
      onReportUpdated(updated);
      setSaveFeedback('Itens limpos e persistidos com sucesso no banco de dados!');
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      alert(`Erro ao limpar itens: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

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
          metrics: [...metrics],
          subMetrics: JSON.parse(JSON.stringify(subMetrics)),
          bulletActivities: [...bulletActivities],
          subBulletSections: JSON.parse(JSON.stringify(subBulletSections)),
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

      // Background sync to Supabase if configured
      if (supabaseService.isConfigured() && supabaseService.getConfig().autoSync) {
        supabaseService.pushLocalDataToSupabase().catch((err) => {
          console.warn('Sync em segundo plano para Supabase:', err);
        });
      }

      onReportUpdated({ ...updated, departments: { ...updated.departments } });
      setSaveFeedback('Dados salvos, auditados e sincronizados com sucesso no banco de dados!');
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

  const persistChangesToDatabase = async (
    newMetrics: MetricItem[],
    newSubMetrics: any[],
    newBulletActivities: string[],
    newSubBulletSections: any[],
    newNotes: string,
    newStatus: string,
    successMessage: string
  ) => {
    if (!canAccessActiveDept) {
      setSaveFeedback('Ação Bloqueada: Seu perfil possui permissão apenas de visualização neste setor.');
      return;
    }
    setSaving(true);
    try {
      const updated = await sqlDb.updateDepartmentData(
        currentReport.id,
        activeDeptKey,
        {
          metrics: newMetrics,
          subMetrics: newSubMetrics,
          bulletActivities: newBulletActivities,
          subBulletSections: newSubBulletSections,
          customNotes: newNotes,
          status: newStatus as any,
        },
        currentUser
      );

      if (!navigator.onLine) {
        offlineSync.enqueue('UPDATE_DEPARTMENT', {
          reportId: currentReport.id,
          departmentId: activeDeptKey,
        });
      }

      if (supabaseService.isConfigured() && supabaseService.getConfig().autoSync) {
        supabaseService.syncDepartmentUpdate(
          currentReport.id,
          activeDeptKey,
          {
            metrics: newMetrics,
            subMetrics: newSubMetrics,
            bulletActivities: newBulletActivities,
            subBulletSections: newSubBulletSections,
            customNotes: newNotes,
            status: newStatus,
          },
          currentUser
        ).catch(() => {});
        supabaseService.pushLocalDataToSupabase().catch((err) => {
          console.warn('Sync em segundo plano para Supabase:', err);
        });
      }

      onReportUpdated({ ...updated, departments: { ...updated.departments } });
      setSaveFeedback(successMessage);
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (e: any) {
      setSaveFeedback(`Erro ao salvar: ${e.message || 'Falha inesperada'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateActivityDate = async (idx: number, newIsoDate: string) => {
    const currentAct = bulletActivities[idx];
    const { text } = extractDateAndText(currentAct);
    let nextActs = [...bulletActivities];
    if (!newIsoDate) {
      nextActs[idx] = text;
    } else {
      const [yyyy, mm, dd] = newIsoDate.split('-');
      nextActs[idx] = `[${dd}/${mm}/${yyyy}] ${text}`;
    }
    setBulletActivities(nextActs);
    await persistChangesToDatabase(metrics, subMetrics, nextActs, subBulletSections, customNotes, status, 'Data da atividade atualizada e salva com sucesso!');
  };

  const handleRemoveActivityDate = async (idx: number) => {
    const currentAct = bulletActivities[idx];
    const { text } = extractDateAndText(currentAct);
    let nextActs = [...bulletActivities];
    nextActs[idx] = text;
    setBulletActivities(nextActs);
    await persistChangesToDatabase(metrics, subMetrics, nextActs, subBulletSections, customNotes, status, 'Data da atividade removida e salva com sucesso!');
  };

  const handleAddActivityDate = async (idx: number) => {
    await handleUpdateActivityDate(idx, defaultReportDate);
  };

  const handleRemoveBullet = async (idx: number) => {
    const nextActs = bulletActivities.filter((_, i) => i !== idx);
    setBulletActivities(nextActs);
    await persistChangesToDatabase(metrics, subMetrics, nextActs, subBulletSections, customNotes, status, 'Tópico removido e salvo com sucesso no relatório!');
  };

  const handleRemoveMetric = async (id: string) => {
    const nextMetrics = metrics.filter((m) => m.id !== id);
    setMetrics(nextMetrics);
    await persistChangesToDatabase(nextMetrics, subMetrics, bulletActivities, subBulletSections, customNotes, status, 'Indicador removido e salvo com sucesso no relatório!');
  };

  // Handler for adding new items (either Topic/Activity or Value/Quantity)
  const handleAddNewItem = async () => {
    if (!newItemDescription.trim()) {
      setSaveFeedback('Por favor, informe a descrição ou título do item.');
      return;
    }

    let nextActivities = [...bulletActivities];
    let nextMetrics = [...metrics];
    let msg = '';

    if (newItemType === 'topic') {
      let formattedDate = '';
      if (useItemDate && newItemDate) {
        const [yyyy, mm, dd] = newItemDate.split('-');
        formattedDate = `[${dd}/${mm}/${yyyy}] `;
      }
      const textToAppend = `${formattedDate}${newItemDescription.trim()};`;
      nextActivities.push(textToAppend);
      setBulletActivities(nextActivities);
      setNewItemDescription('');
      msg = useItemDate
        ? 'Novo tópico adicionado com data e salvo com sucesso no relatório!'
        : 'Novo tópico adicionado e salvo com sucesso no relatório!';
    } else {
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

      nextMetrics.push(newMetricItem);
      setMetrics(nextMetrics);
      setNewItemDescription('');
      setNewItemValue('');
      msg = useItemDate
        ? 'Novo indicador adicionado com data e salvo com sucesso no relatório!'
        : 'Novo indicador adicionado e salvo com sucesso no relatório!';
    }

    await persistChangesToDatabase(
      nextMetrics,
      subMetrics,
      nextActivities,
      subBulletSections,
      customNotes,
      status,
      msg
    );
  };

  const handleImportItems = async (
    newActivities: string[],
    newMetrics: MetricItem[],
    mode: 'append' | 'replace'
  ) => {
    const finalActivities = mode === 'replace' ? newActivities : [...bulletActivities, ...newActivities];
    const finalMetrics = mode === 'replace' ? newMetrics : [...metrics, ...newMetrics];

    setBulletActivities(finalActivities);
    setMetrics(finalMetrics);
    setIsImportModalOpen(false);

    await persistChangesToDatabase(
      finalMetrics,
      subMetrics,
      finalActivities,
      subBulletSections,
      customNotes,
      status,
      `Importação de ${newActivities.length} atividades e ${newMetrics.length} métricas realizada e salva com sucesso!`
    );
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
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-blue-200 bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-gray-700 shadow-sm">
                {coordinatorAvatarToDisplay ? (
                  <img
                    src={coordinatorAvatarToDisplay}
                    alt={coordinatorNameToDisplay}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {!coordinatorAvatarToDisplay && (
                  <span className="text-sm font-black text-blue-900 bg-blue-100 w-full h-full flex items-center justify-center">
                    {coordinatorNameToDisplay.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </span>
                )}
              </div>
              {/* If admin is viewing another department, display currentUser avatar badge in the corner */}
              {isViewingOtherDept && currentUser.avatarUrl && (
                <div
                  title={`Conectado como Administrador: ${currentUser.name}`}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-xs bg-purple-600 flex items-center justify-center"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 break-words">{activeDept.coordinatorTitle}</h2>
                {isViewingOtherDept && (
                  <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-purple-600" /> Visão Admin (Gestão Interdepartamental)
                  </span>
                )}
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

        {/* Department Description Banner & Action Buttons */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              <span>Descrição Oficial do Setor:</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-800 italic break-words font-medium">
              "{sectorDescription || 'Nenhuma descrição cadastrada para este departamento.'}"
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditDescInput(sectorDescription);
                  setIsEditDescModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Alterar ou editar a descrição institucional deste departamento"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Descrição</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Limpar tópicos ou indicadores inseridos deste departamento"
              >
                <Eraser className="w-3.5 h-3.5 text-red-600" />
                <span>Limpar Itens Inseridos</span>
              </button>
            </div>
          )}
        </div>
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

                {/* Submit button & Import button */}
                <div className={newItemType === 'topic' ? 'sm:col-span-2 flex flex-col sm:flex-row gap-2' : 'sm:col-span-12 sm:flex sm:justify-end gap-2 sm:mt-1'}>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4" />
                    Importar Planilha / Texto
                  </button>
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
      {/* 1. TÓPICOS & ATIVIDADES REALIZADAS (COLOCADO NO INÍCIO)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm md:text-base font-bold text-gray-900 flex items-center gap-2">
              <span>Tópicos & Atividades Realizadas ({bulletActivities.length})</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Destaque Inicial
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              {bulletActivities.length > 0
                ? 'Cada atividade possui data de execução configurável no calendário'
                : 'Nenhum tópico ou atividade cadastrado ainda para este departamento neste mês.'}
            </p>
          </div>
          {bulletActivities.length > 0 && (
            <span className="text-[11px] text-gray-500 font-medium">
              Altere os textos ou selecione a data correspondente
            </span>
          )}
        </div>

        {bulletActivities.length > 0 ? (
          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
            {bulletActivities.map((act, idx) => {
              const { hasDate, date, text } = extractDateAndText(act);
              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
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
        ) : (
          <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center">
            <p className="text-xs text-gray-600">
              Utilize o formulário <strong>"Adicionar Novo Item"</strong> acima selecionando <strong>"Tópico / Atividade Realizada"</strong> para lançar as ações executadas neste setor.
            </p>
          </div>
        )}
      </div>

      {/* Sub-Bullet Sections se houver (Projetos & Presidência) */}
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

      {/* ========================================================================= */}
      {/* 2. Tabular Metrics (Indicadores & Quantitativos com Opção de Calendário) */}
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

      {/* Modal: Limpar Itens / Dados Inseridos */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Limpar Itens Inseridos: {getSectorName(activeDeptKey)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-3 leading-relaxed">
              Escolha o que deseja limpar no setor <strong>{getSectorName(activeDeptKey)}</strong> para o mês de <strong>{currentReport.monthName} / {currentReport.year}</strong>:
            </p>

            <div className="space-y-2 mt-4 text-xs font-semibold">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="clearOption"
                  value="topics"
                  checked={clearOption === 'topics'}
                  onChange={() => setClearOption('topics')}
                  className="text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <div>
                  <span className="text-gray-900 block font-bold">Limpar apenas Tópicos & Atividades ({bulletActivities.length})</span>
                  <span className="text-gray-500 font-normal text-[11px]">Remove as descrições e tarefas executadas listadas no setor</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="clearOption"
                  value="metrics"
                  checked={clearOption === 'metrics'}
                  onChange={() => setClearOption('metrics')}
                  className="text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <div>
                  <span className="text-gray-900 block font-bold">Limpar apenas Indicadores & Quantitativos ({metrics.length})</span>
                  <span className="text-gray-500 font-normal text-[11px]">Remove as aferições e números quantitativos do setor</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-red-200 bg-red-50/50 hover:bg-red-50 cursor-pointer">
                <input
                  type="radio"
                  name="clearOption"
                  value="all"
                  checked={clearOption === 'all'}
                  onChange={() => setClearOption('all')}
                  className="text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <div>
                  <span className="text-red-950 block font-bold">Limpar Todos os Dados Inseridos</span>
                  <span className="text-red-800 font-normal text-[11px]">Remove tanto as atividades quanto os indicadores deste setor</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Descrição do Departamento */}
      {isEditDescModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>Editar Descrição: {getSectorName(activeDeptKey)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDescModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Descrição Institucional / Atribuições do Setor:
              </label>
              <textarea
                rows={4}
                value={editDescInput}
                onChange={(e) => setEditDescInput(e.target.value)}
                placeholder="Descreva as responsabilidades, escopo e atribuições deste setor..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500">
                Esta descrição é atualizada no sistema e exibida no relatório oficial.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditDescModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSectorDescription}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Descrição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Items Modal (Spreadsheet & Text) */}
      <ImportItemsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        departmentId={activeDeptKey}
        departmentName={getSectorName(activeDeptKey)}
        currentActivities={bulletActivities}
        currentMetrics={metrics}
        onImport={handleImportItems}
      />
    </div>
  );
};
