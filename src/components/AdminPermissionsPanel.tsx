import React, { useState } from 'react';
import { User, UserPermissions } from '../types';
import { sqlDb } from '../services/sqlDb';
import { OFFICIAL_SECTORS, getSectorName } from '../constants/sectors';
import { DepartmentPermissionsEditor } from './DepartmentPermissionsEditor';
import { 
  canUserAccessDepartment, 
  canUserViewDepartment, 
  canUserAccessReport, 
  canUserExportPdf, 
  canUserExportExcel, 
  canUserViewFinancials,
  getDefaultPermissionsForUser 
} from '../utils/permissions';
import { 
  Shield, 
  Search, 
  UserCheck, 
  FileText, 
  FileSpreadsheet, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  Eye, 
  Edit3, 
  Lock, 
  Save, 
  RotateCcw,
  Sparkles,
  Users
} from 'lucide-react';

interface Props {
  currentUser: User;
  onRefresh: () => void;
}

export const AdminPermissionsPanel: React.FC<Props> = ({ currentUser, onRefresh }) => {
  const [users, setUsers] = useState<User[]>(() => sqlDb.getUsers());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'coordinator' | 'staff'>('all');
  
  // Usuário atualmente selecionado para edição de permissões
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const list = sqlDb.getUsers();
    // Prefer non-admin first so admin immediately sees normal user configuration
    const nonAdmin = list.find((u) => u.role !== 'admin');
    return nonAdmin ? nonAdmin.id : list[0]?.id || '';
  });

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  // Permissões em edição (cópia local para permitir salvar/cancelar)
  const [editingPermissions, setEditingPermissions] = useState<UserPermissions>(() => {
    if (!selectedUser) {
      return getDefaultPermissionsForUser('coordinator', 'rh');
    }
    return selectedUser.permissions || getDefaultPermissionsForUser(selectedUser.role, selectedUser.departmentId);
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Quando troca o usuário selecionado
  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.id);
    setEditingPermissions(
      user.permissions || getDefaultPermissionsForUser(user.role, user.departmentId)
    );
    setNotice(null);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await sqlDb.updateUserPermissions(selectedUser.id, editingPermissions, currentUser);
      
      // Atualiza lista em memória
      const updatedList = sqlDb.getUsers();
      setUsers(updatedList);
      onRefresh();

      setNotice({
        type: 'success',
        message: `Permissões de ${selectedUser.name} foram salvas e aplicadas com sucesso no sistema!`,
      });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert(`Erro ao salvar permissões: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!selectedUser) return;
    const defaults = getDefaultPermissionsForUser(selectedUser.role, selectedUser.departmentId);
    setEditingPermissions(defaults);
    setNotice({
      type: 'info',
      message: `Permissões redefinidas para o padrão: Acesso restrito exclusivo ao setor ${getSectorName(selectedUser.departmentId)}. Clique em "Salvar Alterações" para confirmar.`,
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.departmentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.position || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header Informativo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Painel de Permissões de Usuários & Controle de Sigilo
              </h3>
              <p className="text-xs text-gray-600 mt-1 max-w-3xl leading-relaxed">
                Configure as permissões de acesso e visualização para cada departamento (<strong>*acessar</strong> / <strong>*visualizar</strong>). 
                Por padrão de conformidade e segurança, <strong>apenas administradores acessam todos os departamentos</strong>, e cada colaborador visualiza apenas seu próprio setor, exceto quando o administrador conceder permissões adicionais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Controle Ativo por Departamento</span>
            </span>
          </div>
        </div>

        {/* Alerta de Sigilo Financeiro em Destaque */}
        <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block">Regra de Segurança: Sigilo Financeiro & Relatório</span>
            <p className="text-amber-800 leading-relaxed">
              O relatório executivo consolidado possui dados e valores financeiros (faturamento, despesas de folha e DRE). 
              <strong> Apenas usuários autorizados pelo Administrador podem acessar e baixar o relatório em PDF/Excel.</strong> 
              Para usuários que tiverem permissão de ver o relatório mas sem autorização financeira, os números sensíveis são automaticamente ocultados e substituídos por avisos de confidencialidade.
            </p>
          </div>
        </div>
      </div>

      {/* Notice Feedback */}
      {notice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold transition-all ${
          notice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{notice.message}</span>
          </div>
          <button 
            onClick={() => setNotice(null)}
            className="text-gray-400 hover:text-gray-600 font-normal underline text-[11px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Grid Principal: Seletor de Usuários na Esquerda, Editor de Permissões na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda (4 cols): Lista de Usuários */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" /> Selecionar Usuário
            </span>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredUsers.length} de {users.length}
            </span>
          </div>

          {/* Filtros e Busca */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail, setor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
              {(['all', 'admin', 'coordinator', 'staff'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    roleFilter === r
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r === 'all' ? 'Todos' : r === 'admin' ? 'Admins' : r === 'coordinator' ? 'Coord.' : 'Oper.'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
            {filteredUsers.map((u) => {
              const isSelected = u.id === selectedUser?.id;
              const hasReportAccess = canUserAccessReport(u);
              const hasPdf = canUserExportPdf(u);
              const hasExcel = canUserExportExcel(u);
              const hasFinancials = canUserViewFinancials(u);

              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-400 ring-1 ring-blue-400 shadow-2xs'
                      : 'bg-white hover:bg-gray-50 border-gray-200/80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-gray-700">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-gray-900 truncate">{u.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : u.role === 'coordinator'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block truncate">
                      {u.departmentName || getSectorName(u.departmentId)}
                    </span>

                    {/* Mini badges de permissões rápidas */}
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-500 font-semibold">
                      <span className={`flex items-center gap-0.5 ${hasReportAccess ? 'text-blue-700' : 'text-gray-400'}`}>
                        <FileText className="w-2.5 h-2.5" />
                        {hasReportAccess ? 'Relat.' : 'Sem Relat.'}
                      </span>
                      <span>•</span>
                      <span className={`flex items-center gap-0.5 ${hasFinancials ? 'text-emerald-700' : 'text-amber-600'}`}>
                        <DollarSign className="w-2.5 h-2.5" />
                        {hasFinancials ? 'Financ.' : 'Sigilo'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-500">
                Nenhum usuário encontrado com os filtros aplicados.
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita (8 cols): Editor de Permissões do Usuário Selecionado */}
        <div className="lg:col-span-8 space-y-4">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
              {/* Card Resumo do Usuário Selecionado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-blue-500/30 overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-gray-700 shadow-2xs">
                    {selectedUser.avatarUrl ? (
                      <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900">{selectedUser.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        selectedUser.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedUser.role === 'admin' ? 'Administrador' : 'Colaborador / Setor'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedUser.email} • {selectedUser.position} • Setor Próprio: <strong className="text-blue-900">{selectedUser.departmentName || getSectorName(selectedUser.departmentId)}</strong>
                    </p>
                  </div>
                </div>

                {/* Botões do topo: Resetar e Salvar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Redefinir para apenas o setor do colaborador"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Restaurar Padrão</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4 text-white" />
                    <span>{saving ? 'Salvando...' : 'Salvar Permissões'}</span>
                  </button>
                </div>
              </div>

              {/* Editor Completo de Permissões: Checkboxes de Departamentos (*acessar, *visualizar) e Relatório/Financeiro */}
              <DepartmentPermissionsEditor
                permissions={editingPermissions}
                onChange={setEditingPermissions}
                userDepartmentId={selectedUser.departmentId}
                userName={selectedUser.name}
                userRole={selectedUser.role}
              />

              {/* Botão de Rodapé para Salvar */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-gray-500">
                  Todas as alterações são registradas na trilha de auditoria imutável com data, IP e autor.
                </span>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span>{saving ? 'Gravando no Sistema...' : 'Confirmar e Salvar Permissões'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 text-xs">
              Selecione um usuário na coluna ao lado para configurar permissões.
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO INFERIOR: QUADRO RESUMO DE TODOS OS USUÁRIOS E PERMISSÕES */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" /> Matriz Geral de Permissões de Usuários
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Visão consolidada de todos os usuários do sistema, setores com permissão e permissões de relatório e finanças.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 font-bold">Colaborador / E-mail</th>
                <th className="py-2.5 px-3 font-bold">Setor Próprio</th>
                <th className="py-2.5 px-3 font-bold text-center">Perfil</th>
                <th className="py-2.5 px-3 font-bold text-center">Setores Permitidos</th>
                <th className="py-2.5 px-3 font-bold text-center">Ver Relatório (15 Pág)</th>
                <th className="py-2.5 px-3 font-bold text-center">Baixar PDF/Excel</th>
                <th className="py-2.5 px-3 font-bold text-center">Ver Finanças</th>
                <th className="py-2.5 px-3 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                const hasReport = canUserAccessReport(u);
                const hasPdf = canUserExportPdf(u);
                const hasExcel = canUserExportExcel(u);
                const hasFin = canUserViewFinancials(u);

                // Quantos setores pode acessar e visualizar
                const accessibleCount = OFFICIAL_SECTORS.filter((s) => canUserAccessDepartment(u, s.id)).length;
                const viewableCount = OFFICIAL_SECTORS.filter((s) => canUserViewDepartment(u, s.id)).length;

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-gray-900">
                      <div>{u.name}</div>
                      <span className="text-[10px] font-normal text-gray-500">{u.email}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {u.departmentName || getSectorName(u.departmentId)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isAdmin ? (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          Todos (15 Setores)
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-700">
                          {accessibleCount} editar / {viewableCount} ver
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasReport ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Autorizado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Restrito
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasPdf || hasExcel ? (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                          {hasPdf && hasExcel ? 'PDF & Excel' : hasPdf ? 'Apenas PDF' : 'Apenas Excel'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasFin ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Visível
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                          Confidencial
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
