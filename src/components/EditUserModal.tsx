import React, { useState } from 'react';
import { User, UserPermissions, DepartmentId } from '../types';
import { sqlDb } from '../services/sqlDb';
import { supabaseService } from '../services/supabaseClient';
import { getSortedSectors, OFFICIAL_SECTORS } from '../constants/sectors';
import { 
  X, 
  Save, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Shield, 
  Lock, 
  Power, 
  Image as ImageIcon,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  user: User;
  currentUser: User;
  onClose: () => void;
  onSaved: (updatedUser: User) => void;
}

export const EditUserModal: React.FC<Props> = ({
  user,
  currentUser,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [position, setPosition] = useState(user.position || '');
  const [departmentId, setDepartmentId] = useState<DepartmentId>(user.departmentId);
  const [role, setRole] = useState<'admin' | 'coordinator' | 'staff'>(user.role);
  const [active, setActive] = useState<boolean>(user.active !== false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(!!user.twoFactorEnabled);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [sectorSortOrder, setSectorSortOrder] = useState<'asc' | 'desc'>('asc');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Permissions
  const [permissions, setPermissions] = useState<UserPermissions>(
    user.permissions || {
      canEditFinancials: user.departmentId === 'financeiro' || user.role === 'admin',
      canExportPdf: true,
      canExportExcel: true,
      canManageUsers: user.role === 'admin',
      canViewAuditLogs: user.role === 'admin',
      canChangeReportStatus: user.role === 'admin',
      canManageSchedules: user.role === 'admin',
    }
  );

  const sortedSectors = getSortedSectors(sectorSortOrder);

  const handleDepartmentChange = (newDeptId: DepartmentId) => {
    setDepartmentId(newDeptId);
    const sector = OFFICIAL_SECTORS.find((s) => s.id === newDeptId);
    if (sector && (!position || position === 'Coordenador(a)')) {
      setPosition(sector.defaultPosition);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Por favor preencha o Nome e o E-mail institucional.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const selectedSector = OFFICIAL_SECTORS.find((s) => s.id === departmentId);
      const departmentName = selectedSector ? selectedSector.name : user.departmentName;

      const updated = await sqlDb.updateUserByAdmin(
        user.id,
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          position: position.trim(),
          departmentId,
          departmentName,
          role,
          active,
          twoFactorEnabled,
          avatarUrl: avatarUrl.trim() || user.avatarUrl,
          permissions,
          ...(adminPasswordInput.trim() ? { password: adminPasswordInput.trim() } : {}),
        },
        currentUser
      );

      if (adminPasswordInput.trim() && supabaseService.isConfigured()) {
        await supabaseService.adminResetUserPassword(
          currentUser.id,
          user.id,
          adminPasswordInput.trim()
        ).catch(() => {});
      }

      onSaved(updated);
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar as alterações do usuário.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0B0F19] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg leading-tight">
                Editar Dados do Usuário
              </h3>
              <p className="text-xs text-gray-400">
                Atualize informações cadastrais, setor, perfil e permissões de acesso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Avatar preview & info bar */}
          <div className="flex items-center gap-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="relative">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  active ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 truncate">{name || 'Usuário'}</h4>
              <p className="text-xs text-gray-500 truncate">{email || 'email@campsantoandre.org.br'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                  {role}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                  {active ? 'Ativo' : 'Inativo'}
                </span>
                {twoFactorEnabled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    2FA Ativo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                E-mail Institucional *
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@campsantoandre.org.br"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Cargo / Função
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Ex: Coordenador(a), Gerente, Supervisor(a)"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Setor com ordenação Crescente / Decrescente */}
          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-800 uppercase flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                Setor / Departamento da Instituição
              </label>
              {/* Botão de alternar Ordem Crescente / Decrescente */}
              <button
                type="button"
                onClick={() => setSectorSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title="Alternar ordenação da lista de setores"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowUpDown className="w-3 h-3 text-blue-600" />
                <span>Ordem: {sectorSortOrder === 'asc' ? 'Crescente (A-Z)' : 'Decrescente (Z-A)'}</span>
              </button>
            </div>

            <select
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value as DepartmentId)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500"
            >
              {sortedSectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name} — {sector.description}
                </option>
              ))}
            </select>
          </div>

          {/* Perfil & Nível de Acesso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Perfil de Acesso
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="coordinator">Coordenador(a) / Gestor(a)</option>
                <option value="admin">Administrador Geral</option>
                <option value="staff">Equipe / Assistente Operacional</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                URL da Foto de Perfil
              </label>
              <div className="relative">
                <ImageIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Opções de Status e 2FA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Status Ativo / Inativo */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Power className={`w-4 h-4 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Status da Conta</span>
                    <span className="text-[11px] text-gray-500">
                      {active ? 'Usuário Ativo no Sistema' : 'Conta Inativa (Acesso bloqueado)'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
              </label>
            </div>

            {/* 2FA Status */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${twoFactorEnabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Autenticação Multifator (2FA)</span>
                    <span className="text-[11px] text-gray-500">
                      {twoFactorEnabled ? '2FA Ativado para este usuário' : '2FA Desativado (Padrão)'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Redefinição de Senha de Acesso pelo Administrador */}
            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-blue-950 flex items-center justify-between">
                <span>Redefinir Senha de Acesso (Administrador)</span>
                <span className="text-[10px] text-gray-500 font-normal">Opcional</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Deixe vazio para manter a senha atual"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
                    let gen = '';
                    for (let i = 0; i < 8; i++) gen += chars.charAt(Math.floor(Math.random() * chars.length));
                    setAdminPasswordInput(gen);
                  }}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  title="Gerar uma senha segura aleatória"
                >
                  Gerar Aleatória
                </button>
              </div>
              <p className="text-[10px] text-blue-800">
                Se preenchido, a nova senha entrará em vigor imediatamente para o usuário.
              </p>
            </div>
          </div>

          {/* Permissões Específicas */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Permissões Granulares de Acesso
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  key: 'canEditFinancials',
                  label: 'Lançamentos Financeiros (DRE / E2EE)',
                  desc: 'Edição de valores do setor financeiro',
                },
                {
                  key: 'canExportPdf',
                  label: 'Exportar Relatório PDF Oficial',
                  desc: 'Geração de PDF das 15 páginas',
                },
                {
                  key: 'canExportExcel',
                  label: 'Exportar Planilha Excel (.xlsx)',
                  desc: 'Download da planilha multi-abas',
                },
                {
                  key: 'canManageUsers',
                  label: 'Gerenciar Usuários & Cadastros',
                  desc: 'Criar, editar e excluir contas',
                },
                {
                  key: 'canViewAuditLogs',
                  label: 'Visualizar Logs de Auditoria LGPD',
                  desc: 'Acesso à trilha de integridade SHA-256',
                },
                {
                  key: 'canChangeReportStatus',
                  label: 'Aprovar / Fechar Relatórios',
                  desc: 'Alterar status de Aberto para Fechado',
                },
                {
                  key: 'canManageSchedules',
                  label: 'Configurar Agendamentos & Cron',
                  desc: 'Disparos automáticos e rotinas',
                },
              ].map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-2.5 p-2 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!permissions[perm.key as keyof UserPermissions]}
                    onChange={(e) =>
                      setPermissions((prev) => ({
                        ...prev,
                        [perm.key]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      {perm.label}
                    </span>
                    <span className="text-[10px] text-gray-500 leading-none">
                      {perm.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
