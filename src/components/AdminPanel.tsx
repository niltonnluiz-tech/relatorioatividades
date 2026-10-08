/**
 * AdminPanel: Administrator control center for automated exports,
 * User Management & Permissions, SQL database, and complete user activity logs (LGPD).
 */
import React, { useState } from 'react';
import { AuditLog, DepartmentReportData, ExportSchedule, MonthlyReport, User } from '../types';
import { sqlDb, SqlQueryResult } from '../services/sqlDb';
import { supabaseService } from '../services/supabaseClient';
import { generateOfficialReportPdf } from '../services/pdfGenerator';
import { generateMonthlyExcel } from '../services/excelGenerator';
import { AdminUsersManagement } from './AdminUsersManagement';
import { AdminAlertsManager } from './AdminAlertsManager';
import { AdminPermissionsPanel } from './AdminPermissionsPanel';
import { BrandingSettingsModal } from './BrandingSettingsModal';
import { DepartmentPermissionsEditor } from './DepartmentPermissionsEditor';
import { getSectorName } from '../constants/sectors';
import { UserPermissions } from '../types';
import { 
  Database, 
  FileSpreadsheet, 
  FileText, 
  Play, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Download,
  Terminal,
  Search,
  Users,
  Filter,
  Activity,
  Calendar,
  Lock,
  FileDown,
  Bell,
  Image as ImageIcon,
  Shield
} from 'lucide-react';

interface Props {
  currentUser: User;
  currentReport: MonthlyReport;
  auditLogs: AuditLog[];
  onRefreshData: () => void;
  onOpenSupabase?: () => void;
}

export const AdminPanel: React.FC<Props> = ({
  currentUser,
  currentReport,
  auditLogs,
  onRefreshData,
  onOpenSupabase,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'alerts' | 'branding' | 'audit' | 'scheduler' | 'matrix' | 'sql'>('users');
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<ExportSchedule[]>(sqlDb.getExportSchedules());
  const [sqlInput, setSqlInput] = useState('SELECT * FROM audit_logs LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);
  const [auditFilter, setAuditFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleRunInstantExport = async (format: 'PDF' | 'EXCEL' | 'AMBOS') => {
    setIsExporting(true);
    setExportMessage('Gerando relatórios oficiais e registrando auditoria...');

    try {
      if (format === 'PDF' || format === 'AMBOS') {
        const doc = await generateOfficialReportPdf(currentReport);
        doc.save(`Relatorio_Gerencial_CAMP_${currentReport.id}_AutoExport.pdf`);
      }

      if (format === 'EXCEL' || format === 'AMBOS') {
        generateMonthlyExcel(currentReport, auditLogs);
      }

      // Record to SQL audit log
      await sqlDb.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        departmentId: 'admin',
        action: 'AUTO_EXPORT_RUN',
        details: `Exportação automática disparada pelo Administrador (${format}) para fechamento de ${currentReport.fullTitle}`,
        ipAddress: '127.0.0.1 (Local Server Dispatcher)',
        userAgent: navigator.userAgent,
      });

      setExportMessage(`Exportação automática (${format}) concluída e gravada com sucesso!`);
      setTimeout(() => setExportMessage(null), 4000);
      onRefreshData();
    } catch (e: any) {
      setExportMessage(`Erro na exportação: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExecuteSql = () => {
    const res = sqlDb.executeSqlQuery(sqlInput);
    setSqlResult(res);
  };

  const handleDownloadSqlDump = () => {
    const dump = sqlDb.exportSqlDump();
    const blob = new Blob([dump], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAMP_Piero_Pollone_Database_${currentReport.id}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditCsv = async () => {
    const headers = ['ID', 'Data/Hora', 'Usuario', 'Setor', 'Acao', 'Detalhes', 'IP', 'Hash_Integridade'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.departmentId}"`,
      `"${l.action}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress}"`,
      `"${l.integrityHash}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Logs_Auditoria_CAMP_${currentReport.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await sqlDb.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      departmentId: 'admin',
      action: 'AUDIT_LOG_EXPORT',
      details: `Exportação de ${filteredLogs.length} logs de auditoria realizada em formato CSV`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
    });
  };

  const filteredLogs = auditLogs.filter((l) => {
    const matchesSearch =
      l.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.userName.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.ipAddress.toLowerCase().includes(auditFilter.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
    const matchesDept = deptFilter === 'ALL' || l.departmentId === deptFilter;

    return matchesSearch && matchesAction && matchesDept;
  });

  // Analytics on logs
  const totalLogins = auditLogs.filter((l) => l.action === 'LOGIN').length;
  const totalUserEvents = auditLogs.filter((l) => l.action.startsWith('USER_')).length;
  const totalUpdates = auditLogs.filter((l) => l.action.includes('UPDATE')).length;

  return (
    <div id="admin-panel-container" className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0B0F19] text-white rounded-2xl p-4 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight">Painel Administrativo & Segurança</h2>
              <span className="text-[11px] sm:text-xs text-blue-400 font-mono">
                CAMP Piero Pollone • Módulo de Governança & LGPD
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 max-w-2xl">
            Gestão de cadastro e permissões de usuários, trilha completa de auditoria imutável com criptografia SHA-256, agendador de relatórios e console SQL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenSupabase && (
            <button
              onClick={onOpenSupabase}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                supabaseService.isConfigured()
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-200" />
              <span>{supabaseService.isConfigured() ? 'Supabase Conectado' : 'Conectar Supabase'}</span>
            </button>
          )}
          <button
            onClick={() => setIsBrandingModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <ImageIcon className="w-3.5 h-3.5 text-white" /> Alterar Logo / Cabeçalho
          </button>
          <button
            onClick={handleDownloadSqlDump}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-gray-700 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" /> Exportar Banco SQL (.sql)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2 pb-1 scrollbar-thin scroll-smooth">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" /> Cadastro de Usuários
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'permissions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 text-indigo-600" /> Permissões por Setor & Relatório
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4" /> Alertas Automáticos & Métricas
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Log de Atividades dos Usuários ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'branding'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Alterar Logo nos Cabeçalhos
        </button>

        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'scheduler'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Exportação Automática Mensal
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Matriz de Setores (15 Páginas)
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sql'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Terminal className="w-4 h-4" /> Terminal SQL & Tabelas
        </button>
      </div>

      {/* Tab: Cadastro de Usuários */}
      {activeTab === 'users' && (
        <AdminUsersManagement currentUser={currentUser} onRefresh={onRefreshData} />
      )}

      {/* Tab: Permissões de Usuários (Setores & Relatório) */}
      {activeTab === 'permissions' && (
        <AdminPermissionsPanel currentUser={currentUser} onRefresh={onRefreshData} />
      )}

      {/* Tab: Alertas Automáticos & Painel de Métricas */}
      {activeTab === 'alerts' && (
        <AdminAlertsManager currentUser={currentUser} onRefresh={onRefreshData} />
      )}

      {/* Tab: Personalização do Logo nos Cabeçalhos e Relatórios */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Identidade Visual & Logos do Sistema</h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure a imagem do logotipo exibido nos cabeçalhos da interface web e nos relatórios oficiais em PDF e Excel.
              </p>
            </div>
            <button
              onClick={() => setIsBrandingModalOpen(true)}
              className="px-4 py-2 bg-[#0B0F19] text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-blue-400" /> Abrir Editor de Logomarca
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-gray-100 rounded-xl bg-gray-50 flex items-center gap-5">
              <img
                src={sqlDb.getInstitutionSettings().logoUrl}
                alt="Logo Atual"
                className="w-20 h-20 object-contain bg-white rounded-xl p-2 border border-gray-200 shadow-xs"
              />
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Logo em Uso Atualmente</span>
                <h4 className="font-bold text-sm text-gray-900">
                  {sqlDb.getInstitutionSettings().name || sqlDb.getInstitutionSettings().institutionName || 'CAMP Piero Pollone'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {sqlDb.getInstitutionSettings().subTitle || sqlDb.getInstitutionSettings().subtitle || 'Santo André - Gestão & Transparência'}
                </p>
                <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                  CNPJ: {sqlDb.getInstitutionSettings().cnpj || '57.172.936/0001-00'}
                </span>
              </div>
            </div>

            <div className="p-5 border border-blue-100 rounded-xl bg-blue-50/50 space-y-3">
              <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider">Onde este logo é aplicado:</h4>
              <ul className="text-xs text-blue-800 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Cabeçalho Principal (Navbar)</strong> da aplicação em todas as páginas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Capa e cabeçalhos</strong> de todas as 15 páginas do Relatório PDF Oficial</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Visualização do Relatório</strong> no modo Leitura e Impressão</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Log de Atividades dos Usuários (Auditoria LGPD) */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Audit Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Total de Registros
              </span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{auditLogs.length}</span>
              <span className="text-[10px] text-gray-400">Trilha 100% encadeada</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Logins Efetuados
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">{totalLogins}</span>
              <span className="text-[10px] text-gray-400">Acessos autenticados</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Gestão de Usuários
              </span>
              <span className="text-2xl font-black text-purple-600 mt-1 block">{totalUserEvents}</span>
              <span className="text-[10px] text-gray-400">Cadastros & permissões</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Modificações de Dados
              </span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">{totalUpdates}</span>
              <span className="text-[10px] text-gray-400">Métricas e relatórios</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" /> Log de Todas as Atividades Realizadas pelos Usuários
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Auditoria em tempo real com encadeamento criptográfico SHA-256 e IP de acesso (LGPD Art. 46).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAuditCsv}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-emerald-600" /> Baixar Logs (CSV)
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar em detalhes, usuário, IP..."
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg py-1.5 px-3 text-xs bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todas as Ações</option>
                  <option value="AUTH_LOGIN">Login / Autenticação (AUTH_LOGIN)</option>
                  <option value="USER_CREATE">Cadastro de Usuário (USER_CREATE)</option>
                  <option value="USER_PERMISSIONS_UPDATE">Permissões de Usuário (USER_PERMISSIONS_UPDATE)</option>
                  <option value="USER_STATUS_TOGGLE">Alteração Status Usuário (USER_STATUS_TOGGLE)</option>
                  <option value="USER_DELETE">Exclusão de Usuário (USER_DELETE)</option>
                  <option value="PROFILE_UPDATE">Atualização de Perfil (PROFILE_UPDATE)</option>
                  <option value="METRIC_UPDATE">Atualização de Métrica (METRIC_UPDATE)</option>
                  <option value="HIRING_DASHBOARD_UPDATE">Ajuste Dashboard Contratação</option>
                  <option value="AUTO_EXPORT_RUN">Exportação Oficial (AUTO_EXPORT_RUN)</option>
                </select>
              </div>

              <div>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg py-1.5 px-3 text-xs bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os Setores</option>
                  <option value="admin">Administração / Geral</option>
                  <option value="rh">Gestão de Pessoas | RH</option>
                  <option value="secretaria">Secretaria Geral</option>
                  <option value="pedagogico">Coordenação Pedagógica</option>
                  <option value="servico_social">Serviço Social</option>
                  <option value="psicologia">Apoio Psicossocial</option>
                  <option value="financeiro">Financeiro & Contábil</option>
                  <option value="ti">Tecnologia da Informação</option>
                  <option value="comunicacao">Comunicação & Marketing</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px] border border-gray-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-100 text-gray-700 border-b border-gray-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-left">Data/Hora</th>
                    <th className="p-3 text-left">Usuário</th>
                    <th className="p-3 text-center">Tipo de Ação</th>
                    <th className="p-3 text-left">Descrição do Evento Realizado</th>
                    <th className="p-3 text-left">IP / Origem</th>
                    <th className="p-3 text-center">Integridade (SHA-256)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium bg-white">
                  {filteredLogs.map((l) => {
                    const isLogin = l.action === 'LOGIN';
                    const isUserMgmt = l.action.startsWith('USER_');
                    const isExport = l.action.includes('EXPORT');

                    return (
                      <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{l.timestamp}</td>
                        <td className="p-3 text-gray-900 font-bold whitespace-nowrap">
                          {l.userName}
                          <span className="block text-[10px] text-gray-400 font-normal">{l.departmentId}</span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isLogin
                                ? 'bg-emerald-100 text-emerald-800'
                                : isUserMgmt
                                ? 'bg-purple-100 text-purple-800'
                                : isExport
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {l.action}
                          </span>
                        </td>
                        <td className="p-3 text-gray-800 max-w-md">{l.details}</td>
                        <td className="p-3 text-gray-500 text-[11px] whitespace-nowrap font-mono">{l.ipAddress}</td>
                        <td className="p-3 text-center font-mono text-[10px] text-emerald-700">
                          {l.integrityHash ? `${l.integrityHash.substring(0, 14)}...` : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Exportação Automática */}
      {activeTab === 'scheduler' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Agendador de Exportação Automática</h3>
                <p className="text-xs text-gray-600">
                  Rotinas automáticas programadas para despacho dos relatórios mensais fechados por e-mail institucional.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={isExporting}
                  onClick={() => handleRunInstantExport('AMBOS')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" /> Disparar Exportação Agora (PDF + Excel)
                </button>
              </div>
            </div>

            {/* Notification message */}
            {exportMessage && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                {exportMessage}
              </div>
            )}

            {/* Schedules list */}
            <div className="space-y-3">
              {schedules.map((sch) => (
                <div
                  key={sch.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{sch.name}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        {sch.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Frequência: <span className="font-semibold">{sch.frequency.replace('_', ' ')}</span> • Formato:{' '}
                      <span className="font-semibold">{sch.format}</span> • Destino:{' '}
                      <span className="font-mono text-gray-800">{sch.destinationEmail}</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Última Execução: <span className="font-medium">{sch.lastRun}</span> | Próxima Execução:{' '}
                      <span className="font-medium text-blue-700">{sch.nextRun}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunInstantExport('PDF')}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" /> Baixar PDF Oficial
                    </button>
                    <button
                      onClick={() => handleRunInstantExport('EXCEL')}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Baixar Excel Completo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Matriz de Setores */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Quadro de Status dos 15 Setores</h3>
              <p className="text-xs text-gray-600">
                Acompanhamento em tempo real dos lançamentos do mês de {currentReport.monthName} de {currentReport.year}.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              Status Geral: {currentReport.status.toUpperCase()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                  <th className="p-2.5 text-left font-bold">Pág / Setor</th>
                  <th className="p-2.5 text-left font-bold">Coordenador(a)</th>
                  <th className="p-2.5 text-center font-bold">Status</th>
                  <th className="p-2.5 text-center font-bold">Última Modificação</th>
                  <th className="p-2.5 text-right font-bold">Modificado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(currentReport.departments).map(([key, rawDept], idx) => {
                  const dept = rawDept as DepartmentReportData;
                  return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="p-2.5 font-bold text-gray-900">
                      <span className="font-mono text-gray-400 mr-2">#{idx + 1}</span>
                      {dept.coordinatorTitle}
                    </td>
                    <td className="p-2.5 text-gray-700">{dept.coordinatorName}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          dept.status === 'aprovado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dept.status === 'concluido'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {dept.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono text-xs text-gray-600">
                      {dept.lastModified}
                    </td>
                    <td className="p-2.5 text-right font-medium text-gray-800">{dept.modifiedBy}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Terminal SQL & Tabelas */}
      {activeTab === 'sql' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {/* Supabase Cloud Connection Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-emerald-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">Banco de Dados Supabase (PostgreSQL Nuvem)</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    supabaseService.isConfigured()
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {supabaseService.isConfigured() ? 'Conectado' : 'Modo SQLite Local'}
                  </span>
                </div>
                <p className="text-xs text-gray-300">
                  {supabaseService.isConfigured()
                    ? 'Sincronização em tempo real habilitada com proteção RLS e logs SHA-256.'
                    : 'Conecte sua instância Supabase para persistir relatórios, usuários e logs na nuvem.'}
                </p>
              </div>
            </div>
            {onOpenSupabase && (
              <button
                type="button"
                onClick={onOpenSupabase}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs shrink-0"
              >
                {supabaseService.isConfigured() ? 'Gerenciar Supabase & Sincronizar' : 'Configurar Conexão Supabase'}
              </button>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">Terminal de Consultas SQL Seguro</h3>
            <p className="text-xs text-gray-600">
              Execute consultas relacionais diretamente sobre as tabelas seguras do CAMP Piero Pollone.
            </p>
          </div>

          {/* Quick SQL queries */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-gray-500 font-medium self-center">Consultas Rápidas:</span>
            <button
              onClick={() => {
                setSqlInput('SELECT * FROM users;');
                const res = sqlDb.executeSqlQuery('SELECT * FROM users;');
                setSqlResult(res);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer font-mono"
            >
              SELECT * FROM users;
            </button>
            <button
              onClick={() => {
                setSqlInput('SELECT * FROM financial_registers;');
                const res = sqlDb.executeSqlQuery('SELECT * FROM financial_registers;');
                setSqlResult(res);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer font-mono"
            >
              SELECT * FROM financial_registers;
            </button>
            <button
              onClick={() => {
                setSqlInput('SHOW TABLES;');
                const res = sqlDb.executeSqlQuery('SHOW TABLES;');
                setSqlResult(res);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer font-mono"
            >
              SHOW TABLES;
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteSql()}
              className="flex-1 font-mono text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-900 text-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleExecuteSql}
              className="px-4 py-2 bg-[#0B0F19] text-white rounded-lg text-xs font-bold hover:bg-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Database className="w-4 h-4" /> Executar SQL
            </button>
          </div>

          {/* Query Results */}
          {sqlResult && (
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 flex justify-between">
                <span>Resultado ({sqlResult.rowCount} registros)</span>
                <span className="font-mono text-gray-500">{sqlResult.executionTimeMs} ms</span>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {sqlResult.columns.map((c, i) => (
                        <th key={i} className="p-2 text-left font-mono font-bold text-gray-700">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sqlResult.values.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {row.map((val, colIdx) => (
                          <td key={colIdx} className="p-2 text-gray-800 font-mono">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Personalização de Logomarca e Identidade Visual */}
      {isBrandingModalOpen && (
        <BrandingSettingsModal
          currentUser={currentUser}
          onClose={() => setIsBrandingModalOpen(false)}
          onSaved={() => {
            onRefreshData();
          }}
        />
      )}
    </div>
  );
};

