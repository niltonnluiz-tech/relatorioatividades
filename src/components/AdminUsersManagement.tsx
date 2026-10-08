import React, { useState } from 'react';
import { User, UserPermissions, DepartmentId } from '../types';
import { sqlDb } from '../services/sqlDb';
import { EditUserModal } from './EditUserModal';
import { DepartmentPermissionsEditor } from './DepartmentPermissionsEditor';
import { OFFICIAL_SECTORS, getSortedSectors, getSectorName } from '../constants/sectors';
import { getDefaultPermissionsForUser } from '../utils/permissions';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  Check, 
  X, 
  Trash2, 
  Power, 
  ShieldCheck, 
  Edit3, 
  Building, 
  Lock,
  ArrowUpDown,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface Props {
  currentUser: User;
  onRefresh: () => void;
}

export const AdminUsersManagement: React.FC<Props> = ({ currentUser, onRefresh }) => {
  const [users, setUsers] = useState<User[]>(sqlDb.getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'coordinator' | 'staff'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [sectorSortOrder, setSectorSortOrder] = useState<'asc' | 'desc'>('asc'); // Padrão: Crescente

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('(11) 2842-2470');
  const [newPosition, setNewPosition] = useState('Coordenador(a)');
  const [newDepartment, setNewDepartment] = useState<DepartmentId>('rh');
  const [newRole, setNewRole] = useState<'admin' | 'coordinator' | 'staff'>('coordinator');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(() =>
    getDefaultPermissionsForUser('coordinator', 'rh')
  );
  // 2FA default: false (deactivated by default per requirements)
  const [newTwoFactorEnabled, setNewTwoFactorEnabled] = useState(false);

  const sortedSectors = getSortedSectors(sectorSortOrder);

  const refreshList = () => {
    setUsers([...sqlDb.getUsers()]);
    onRefresh();
  };

  const handleToggle2Fa = async (targetUser: User) => {
    const newState = !targetUser.twoFactorEnabled;
    await sqlDb.toggleUserTwoFactor(targetUser.id, newState, currentUser);
    setActionNotice(
      `Autenticação Multifator (2FA) para ${targetUser.name} agora está ${newState ? 'ATIVADA' : 'DESATIVADA'}.`
    );
    setTimeout(() => setActionNotice(null), 3500);
    refreshList();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      alert('Preencha o nome e o e-mail do novo usuário.');
      return;
    }

    const deptObj = OFFICIAL_SECTORS.find((d) => d.id === newDepartment);

    await sqlDb.createUser(
      {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        phone: newPhone.trim(),
        position: newPosition.trim(),
        departmentId: newDepartment,
        departmentName: deptObj?.name || 'CAMP Santo André',
        role: newRole,
        permissions: newPermissions,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 50)}?w=150&auto=format&fit=crop&q=80`,
        twoFactorEnabled: newTwoFactorEnabled,
        lgpdConsentGiven: true,
      },
      currentUser
    );

    setIsCreateModalOpen(false);
    resetForm();
    setActionNotice('Usuário cadastrado com sucesso!');
    setTimeout(() => setActionNotice(null), 3500);
    refreshList();
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewPhone('(11) 2842-2470');
    setNewPosition('Coordenador(a)');
    setNewDepartment('rh');
    setNewRole('coordinator');
    setNewTwoFactorEnabled(false);
    setNewPermissions(getDefaultPermissionsForUser('coordinator', 'rh'));
  };

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      alert('Você não pode desativar o seu próprio usuário administrador conectado.');
      return;
    }
    await sqlDb.toggleUserStatus(targetUser.id, currentUser);
    refreshList();
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      alert('Você não pode excluir o seu próprio usuário administrador.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o usuário ${targetUser.name}? Esta ação será registrada na auditoria imutável.`)) {
      await sqlDb.deleteUser(targetUser.id, currentUser);
      setActionNotice(`Usuário ${targetUser.name} excluído com sucesso.`);
      setTimeout(() => setActionNotice(null), 3500);
      refreshList();
    }
  };

  const handleSavePermissions = async (userId: string, perms: UserPermissions, twoFactorEnabled?: boolean) => {
    await sqlDb.updateUserPermissions(userId, perms, currentUser);
    if (twoFactorEnabled !== undefined) {
      await sqlDb.toggleUserTwoFactor(userId, twoFactorEnabled, currentUser);
    }
    setEditingPermissionsUser(null);
    setActionNotice('Permissões e status de 2FA do usuário atualizados com sucesso!');
    setTimeout(() => setActionNotice(null), 3500);
    refreshList();
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSector = sectorFilter === 'all' || u.departmentId === sectorFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSector && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Gestão de Usuários & Controle de Permissões
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cadastre e edite dados cadastrais, altere setores e cargos, configure 2FA e permissões de acesso.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-[#0B0F19] hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4 text-blue-400" /> Cadastrar Novo Usuário
          </button>
        </div>

        {actionNotice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            {actionNotice}
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, email, cargo ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-4 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'admin', 'coordinator', 'staff'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  roleFilter === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r === 'all'
                  ? `Todos (${users.length})`
                  : r === 'admin'
                  ? 'Admins'
                  : r === 'coordinator'
                  ? 'Coordenadores'
                  : 'Colaboradores'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Relação Oficial de Setores da Instituição (16 Setores) */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Relação Oficial dos Setores da Instituição (16 Setores)
              </h4>
              <p className="text-[11px] text-gray-500">
                Selecione um setor para filtrar rapidamente os colaboradores ou alterne a ordem de exibição
              </p>
            </div>
          </div>

          {/* Toggle de ordenação Crescente / Decrescente */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold text-gray-500">Ordem dos Setores:</span>
            <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setSectorSortOrder('asc')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sectorSortOrder === 'asc'
                    ? 'bg-white text-blue-700 shadow-2xs border border-gray-200/80 font-black'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Ordenar Setores em Ordem Crescente (A-Z)"
              >
                <span>Crescente (A-Z, padrão)</span>
              </button>
              <button
                type="button"
                onClick={() => setSectorSortOrder('desc')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sectorSortOrder === 'desc'
                    ? 'bg-white text-blue-700 shadow-2xs border border-gray-200/80 font-black'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Ordenar Setores em Ordem Decrescente (Z-A)"
              >
                <span>Decrescente (Z-A)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grade dos 16 Setores com ordenação aplicada */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {sortedSectors.map((sec) => {
            const count = users.filter((u) => u.departmentId === sec.id).length;
            const isSelected = sectorFilter === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSectorFilter(isSelected ? 'all' : sec.id)}
                title={`${sec.name}: ${sec.description}`}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-gray-50/70 border-gray-200 hover:border-blue-200 hover:bg-white text-gray-800'
                }`}
              >
                <span className="text-xs font-bold leading-snug line-clamp-2">
                  {sec.name}
                </span>
                <span className="mt-1.5 text-[10px] text-gray-500 font-semibold flex items-center justify-between">
                  <span>{count} {count === 1 ? 'usuário' : 'usuários'}</span>
                  {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                </span>
              </button>
            );
          })}
        </div>

        {sectorFilter !== 'all' && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-600">
              Filtro ativo pelo setor: <strong className="text-blue-600 font-bold">{getSectorName(sectorFilter)}</strong>
            </span>
            <button
              onClick={() => setSectorFilter('all')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Limpar filtro (Ver todos os setores)
            </button>
          </div>
        )}
      </div>

      {/* Users List Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <th className="p-4">Usuário</th>
                <th className="p-4">Setor / Departamento</th>
                <th className="p-4">Função & Cargo</th>
                <th className="p-4 text-center">Nível / Perfil</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Autenticação 2FA</th>
                <th className="p-4 text-center">Permissões</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 text-xs">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* User Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-2xs"
                          />
                          <div>
                            <span className="font-bold text-gray-900 block">{u.name}</span>
                            <span className="text-[11px] text-gray-500 block">{u.email}</span>
                            {u.phone && (
                              <span className="text-[10px] text-gray-400 block">{u.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-4 font-semibold text-gray-700">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs">
                          <Building className="w-3 h-3 text-gray-500" />
                          <span>{getSectorName(u.departmentId)}</span>
                        </span>
                      </td>

                      {/* Position */}
                      <td className="p-4 font-medium text-gray-600">
                        {u.position}
                      </td>

                      {/* Role badge */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'coordinator'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : u.role === 'coordinator' ? 'Coordenador' : 'Colaborador'}
                        </span>
                      </td>

                      {/* Status toggle button */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser.id}
                          title={
                            u.id === currentUser.id
                              ? 'Você não pode desativar seu próprio usuário'
                              : `Clique para ${u.active ? 'desativar' : 'ativar'} o acesso`
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{u.active ? 'Ativo' : 'Inativo'}</span>
                        </button>
                      </td>

                      {/* 2FA Toggle */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggle2Fa(u)}
                          title="Clique para alternar o status de Autenticação Multifator (2FA)"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            u.twoFactorEnabled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {u.twoFactorEnabled ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>2FA Ativo</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-gray-400" />
                              <span>2FA Desativado</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Permissions summary */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setEditingPermissionsUser(u)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Ajustar Acessos
                        </button>
                      </td>

                      {/* Actions: Edit + Delete */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* EDIT USER BUTTON (ADM pode editar dados do usuário) */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-blue-200 shadow-2xs"
                            title="Editar dados cadastrais, cargo, setor e permissões"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Editar</span>
                          </button>

                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* MODAL: Cadastrar Novo Usuário */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B0F19] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">Cadastrar Novo Usuário</h3>
                  <p className="text-xs text-gray-400">
                    Defina dados cadastrais e permissões de acesso ao sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="carlos.silva@campsantoandre.org.br"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    placeholder="Ex: Coordenador(a), Gerente"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(11) 2842-2470"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Setor com ordenação Crescente / Decrescente */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    Setor da Instituição (16 Setores)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSectorSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Ordem: {sectorSortOrder === 'asc' ? 'Crescente (A-Z)' : 'Decrescente (Z-A)'}</span>
                  </button>
                </div>
                <select
                  value={newDepartment}
                  onChange={(e) => {
                    const chosenDept = e.target.value as DepartmentId;
                    setNewDepartment(chosenDept);
                    const sec = OFFICIAL_SECTORS.find((s) => s.id === chosenDept);
                    if (sec) setNewPosition(sec.defaultPosition);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                >
                  {sortedSectors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="coordinator">Coordenador de Setor</option>
                    <option value="admin">Administrador Geral</option>
                    <option value="staff">Colaborador Operacional</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Senha Inicial de Acesso
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Defina a senha ou deixe em branco para 1º acesso"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 2FA Toggle - Default Desativado */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${newTwoFactorEnabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Autenticação Multifator (2FA)</span>
                      <span className="text-[11px] text-gray-500">
                        {newTwoFactorEnabled ? '2FA Ativado para o novo usuário' : '2FA Desativado (Padrão do sistema)'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newTwoFactorEnabled}
                    onChange={(e) => setNewTwoFactorEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2">
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-2">
                  Permissões Granulares
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'canEditFinancials', label: 'Edição de Dados Financeiros' },
                    { key: 'canExportPdf', label: 'Exportar PDF Oficial' },
                    { key: 'canExportExcel', label: 'Exportar Planilha Excel' },
                    { key: 'canManageUsers', label: 'Gerenciar Usuários & Contas' },
                    { key: 'canViewAuditLogs', label: 'Visualizar Logs LGPD' },
                    { key: 'canChangeReportStatus', label: 'Aprovar/Fechar Relatório' },
                    { key: 'canManageSchedules', label: 'Configurar Agendamentos' },
                  ].map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!newPermissions[perm.key as keyof UserPermissions]}
                        onChange={(e) =>
                          setNewPermissions((prev) => ({
                            ...prev,
                            [perm.key]: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS DO USUÁRIO (ADM pode editar dados do usuário) */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          currentUser={currentUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updatedUser) => {
            setEditingUser(null);
            setActionNotice(`Dados do usuário ${updatedUser.name} atualizados com sucesso!`);
            setTimeout(() => setActionNotice(null), 3500);
            refreshList();
          }}
        />
      )}

      {/* MODAL: Ajustar Acessos, Departamentos & 2FA */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B0F19] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Permissões de Acesso: {editingPermissionsUser.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Setor base: <span className="text-blue-300 font-semibold">{getSectorName(editingPermissionsUser.departmentId)}</span> • Perfil: {editingPermissionsUser.role.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* 2FA Toggle inside Permissions Modal */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${editingPermissionsUser.twoFactorEnabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Autenticação Multifator (2FA)</span>
                      <span className="text-[11px] text-gray-500">
                        {editingPermissionsUser.twoFactorEnabled ? '2FA Ativado para este usuário' : '2FA Desativado (Padrão)'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!editingPermissionsUser.twoFactorEnabled}
                    onChange={(e) => {
                      setEditingPermissionsUser({
                        ...editingPermissionsUser,
                        twoFactorEnabled: e.target.checked,
                      });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Editor Granular de Permissões: Relatório, Downloads, Sigilo Financeiro e Departamentos */}
              <DepartmentPermissionsEditor
                permissions={editingPermissionsUser.permissions || {}}
                onChange={(updated) =>
                  setEditingPermissionsUser({
                    ...editingPermissionsUser,
                    permissions: updated,
                  })
                }
                userDepartmentId={editingPermissionsUser.departmentId}
                userName={editingPermissionsUser.name}
                userRole={editingPermissionsUser.role}
              />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const u = editingPermissionsUser;
                  setEditingPermissionsUser(null);
                  setEditingUser(u);
                }}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Dados Cadastrais Completos</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSavePermissions(
                      editingPermissionsUser.id,
                      editingPermissionsUser.permissions || {},
                      editingPermissionsUser.twoFactorEnabled
                    )
                  }
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Salvar Permissões do Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
