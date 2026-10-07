import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { 
  X, 
  Activity, 
  Search, 
  Filter, 
  ShieldCheck, 
  Calendar, 
  Download, 
  Hash, 
  User as UserIcon,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  currentUser: User;
}

export const AuditLogsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  auditLogs,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesDept = deptFilter === 'ALL' || log.departmentId === deptFilter;

    return matchesSearch && matchesAction && matchesDept;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Data/Hora', 'Usuário', 'Setor', 'Ação', 'Detalhes', 'IP', 'Hash Integridade SHA-256'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.userName.replace(/"/g, '""')}"`,
      l.departmentId,
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress,
      l.integrityHash,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Logs_Atividades_CAMP_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Registro Geral de Atividades & Logs</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                  Acesso Público a Todos os Usuários
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Transparência institucional e conformidade LGPD: histórico de alterações com hash criptográfico SHA-256
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Exportar CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por usuário, ação, descrição ou IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="USER_LOGIN">Login / Autenticação</option>
              <option value="DATA_UPDATE">Atualização de Dados</option>
              <option value="USER_CREATE">Criação de Usuário</option>
              <option value="USER_UPDATE">Edição de Usuário</option>
              <option value="2FA_TOGGLE">Alteração de 2FA</option>
              <option value="BRANDING_UPDATE">Identidade Visual / Logo</option>
              <option value="NOTIFICATION_SEND">Envio de Alertas</option>
              <option value="AUTO_EXPORT_RUN">Exportações</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todos os Setores</option>
              <option value="admin">Administração / Geral</option>
              <option value="rh">Gestão de Pessoas | RH</option>
              <option value="financeiro">Financeiro & Contábil</option>
              <option value="ti">Tecnologia da Informação</option>
              <option value="ensino">Ensino & Pedagogia</option>
              <option value="secretaria">Secretaria Geral</option>
              <option value="presidencia">Presidência</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left w-36">Data / Hora</th>
                  <th className="p-3 text-left w-48">Usuário</th>
                  <th className="p-3 text-center w-36">Ação</th>
                  <th className="p-3 text-left">Descrição do Evento</th>
                  <th className="p-3 text-left w-28">Origem</th>
                  <th className="p-3 text-center w-32">Integridade Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Nenhum registro de atividade encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isLogin = log.action.includes('LOGIN');
                    const isSec = log.action.includes('2FA') || log.action.includes('AUTH');
                    const isNotif = log.action.includes('NOTIFICATION');
                    const isBrand = log.action.includes('BRANDING');

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/90 transition-colors">
                        <td className="p-3 font-mono text-gray-600 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="p-3 text-gray-900 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{log.userName}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-normal pl-5 block">
                            Setor: {log.departmentId}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isLogin
                                ? 'bg-emerald-100 text-emerald-800'
                                : isSec
                                ? 'bg-amber-100 text-amber-800'
                                : isNotif
                                ? 'bg-blue-100 text-blue-800'
                                : isBrand
                                ? 'bg-pink-100 text-pink-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-gray-800">
                          <p className="leading-snug">{log.details}</p>
                          {(log.previousValue || log.newValue) && (
                            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                              {log.previousValue && `De: ${log.previousValue} `}
                              {log.newValue && `Para: ${log.newValue}`}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {log.ipAddress}
                        </td>
                        <td className="p-3 text-center font-mono text-[10px] text-emerald-700 whitespace-nowrap">
                          {log.integrityHash ? (
                            <span title={log.integrityHash} className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {log.integrityHash.substring(0, 10)}...
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Exibindo {filteredLogs.length} de {auditLogs.length} registros auditados</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
