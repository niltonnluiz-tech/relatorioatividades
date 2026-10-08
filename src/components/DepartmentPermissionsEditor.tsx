import React from 'react';
import { UserPermissions, DepartmentId } from '../types';
import { OFFICIAL_SECTORS } from '../constants/sectors';
import { 
  Shield, 
  FileText, 
  FileSpreadsheet, 
  DollarSign, 
  Eye, 
  Edit3, 
  Lock, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Sparkles,
  Building,
  Info
} from 'lucide-react';

interface Props {
  permissions: UserPermissions;
  onChange: (updated: UserPermissions) => void;
  userDepartmentId?: string;
  userName?: string;
  userRole?: string;
}

export const DepartmentPermissionsEditor: React.FC<Props> = ({
  permissions,
  onChange,
  userDepartmentId,
  userName,
  userRole,
}) => {
  const isUserAdmin = userRole === 'admin';
  const depts = permissions.departments || {};

  // Handlers para departamentos
  const handleToggleAccess = (deptId: string, currentAccess: boolean) => {
    const nextAccess = !currentAccess;
    const currentView = depts[deptId]?.canView ?? (deptId === userDepartmentId);
    // Se pode acessar, automaticamente deve poder visualizar
    const nextView = nextAccess ? true : currentView;

    onChange({
      ...permissions,
      departments: {
        ...depts,
        [deptId]: {
          canAccess: nextAccess,
          canView: nextView,
        },
      },
    });
  };

  const handleToggleView = (deptId: string, currentView: boolean) => {
    const nextView = !currentView;
    const currentAccess = depts[deptId]?.canAccess ?? (deptId === userDepartmentId);
    // Se desmarcar visualização, obrigatoriamente desmarca acesso
    const nextAccess = !nextView ? false : currentAccess;

    onChange({
      ...permissions,
      departments: {
        ...depts,
        [deptId]: {
          canAccess: nextAccess,
          canView: nextView,
        },
      },
    });
  };

  // Ações em massa para setores
  const handleGrantAllAccess = () => {
    const updatedDepts: Record<string, { canView: boolean; canAccess: boolean }> = {};
    OFFICIAL_SECTORS.forEach((sec) => {
      updatedDepts[sec.id] = { canView: true, canAccess: true };
    });
    onChange({
      ...permissions,
      departments: updatedDepts,
    });
  };

  const handleGrantAllViewOnly = () => {
    const updatedDepts: Record<string, { canView: boolean; canAccess: boolean }> = {};
    OFFICIAL_SECTORS.forEach((sec) => {
      // Mantém acesso no próprio setor se já tinha
      const isOwn = sec.id === userDepartmentId;
      updatedDepts[sec.id] = { canView: true, canAccess: isOwn };
    });
    onChange({
      ...permissions,
      departments: updatedDepts,
    });
  };

  const handleRestrictToOwnDepartment = () => {
    const updatedDepts: Record<string, { canView: boolean; canAccess: boolean }> = {};
    OFFICIAL_SECTORS.forEach((sec) => {
      const isOwn = sec.id === userDepartmentId;
      updatedDepts[sec.id] = { canView: isOwn, canAccess: isOwn };
    });
    onChange({
      ...permissions,
      departments: updatedDepts,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo se for Admin */}
      {isUserAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple-900 font-semibold">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <strong>Perfil de Administrador:</strong> Usuários com perfil de Administrador possuem acesso irrestrito por padrão a todos os setores e downloads do sistema. As configurações abaixo podem ser ajustadas para colaboradores específicos.
          </div>
        </div>
      )}

      {/* SEÇÃO 1: ACESSO AO RELATÓRIO E SIGILO FINANCEIRO */}
      <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              1. Acesso ao Relatório Executivo & Sigilo Financeiro
            </h4>
          </div>
          <span className="text-[10px] text-gray-500 font-semibold">Controle de visualização & download</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Pode Acessar Relatório */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            permissions.canAccessReport ? 'bg-blue-50/60 border-blue-200 shadow-2xs' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={!!permissions.canAccessReport}
              onChange={(e) => onChange({ ...permissions, canAccessReport: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Acessar Relatório Geral (15 Páginas)
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                Permite ao usuário visualizar as 15 páginas do relatório oficial consolidado.
              </p>
            </div>
          </label>

          {/* Pode Baixar PDF */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            permissions.canExportPdf ? 'bg-red-50/50 border-red-200 shadow-2xs' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={!!permissions.canExportPdf}
              onChange={(e) => onChange({ ...permissions, canExportPdf: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                Baixar Relatório Oficial em PDF
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                Permite gerar e fazer download do arquivo PDF idêntico ao modelo físico.
              </p>
            </div>
          </label>

          {/* Pode Baixar Excel */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            permissions.canExportExcel ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={!!permissions.canExportExcel}
              onChange={(e) => onChange({ ...permissions, canExportExcel: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Baixar Planilha Consolidada Excel (.xlsx)
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                Permite exportar dados em planilhas com todas as abas setoriais.
              </p>
            </div>
          </label>

          {/* Pode Visualizar Dados Financeiros Confidenciais */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
            permissions.canViewFinancials ? 'bg-amber-50/60 border-amber-300 shadow-2xs' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={!!permissions.canViewFinancials}
              onChange={(e) => onChange({ ...permissions, canViewFinancials: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                Visualizar Dados e Valores Financeiros Confidenciais
              </span>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-tight font-medium">
                Se desmarcado, faturamento, despesas e DRE aparecem censurados com aviso confidencial.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SEÇÃO 2: PERMISSÕES DEPARTAMENTAIS (ACESSAR E VISUALIZAR POR SETOR) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                2. Permissões de Departamentos: Acessar & Visualizar
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Defina individualmente quais setores <strong>{userName || 'o usuário'}</strong> pode acessar para editar e quais pode apenas visualizar.
            </p>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleGrantAllAccess}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Liberar Todos (Acesso Total)
            </button>
            <button
              type="button"
              onClick={handleGrantAllViewOnly}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Apenas Visualizar Todos
            </button>
            <button
              type="button"
              onClick={handleRestrictToOwnDepartment}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Restringir ao Próprio Setor
            </button>
          </div>
        </div>

        {/* Tabela de Setores com os Checkboxes Acessar e Visualizar */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[340px]">
              <thead className="bg-gray-100/80 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3 font-black text-gray-700 text-xs">Departamento / Setor Oficial</th>
                  <th className="py-2.5 px-3 font-black text-blue-900 text-xs text-center w-36 bg-blue-50/60 border-l border-gray-200">
                    <span className="flex items-center justify-center gap-1">
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Acessar (Editar)
                    </span>
                  </th>
                  <th className="py-2.5 px-3 font-black text-amber-900 text-xs text-center w-36 bg-amber-50/60 border-l border-gray-200">
                    <span className="flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-amber-600" /> Visualizar (Leitura)
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {OFFICIAL_SECTORS.map((sector) => {
                  const isOwnDept = sector.id === userDepartmentId;
                  const deptConfig = depts[sector.id];
                  const hasAccess = deptConfig ? deptConfig.canAccess : isOwnDept;
                  const hasView = deptConfig ? deptConfig.canView : (isOwnDept || hasAccess);

                  return (
                    <tr
                      key={sector.id}
                      className={`hover:bg-gray-50/90 transition-colors ${
                        isOwnDept ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{sector.name}</span>
                          {isOwnDept && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Setor do Colaborador
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 block truncate max-w-sm">
                          {sector.description}
                        </span>
                      </td>

                      {/* Checkbox Acessar (Editar / Lançar) */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/20 border-l border-gray-200">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-100/60 transition-colors">
                          <input
                            type="checkbox"
                            checked={hasAccess}
                            onChange={() => handleToggleAccess(sector.id, hasAccess)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${hasAccess ? 'text-blue-900' : 'text-gray-400'}`}>
                            {hasAccess ? 'Acesso Permitido' : 'Bloqueado'}
                          </span>
                        </label>
                      </td>

                      {/* Checkbox Visualizar (Somente Leitura) */}
                      <td className="py-2.5 px-3 text-center bg-amber-50/20 border-l border-gray-200">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-100/60 transition-colors">
                          <input
                            type="checkbox"
                            checked={hasView}
                            onChange={() => handleToggleView(sector.id, hasView)}
                            className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${hasView ? 'text-amber-900' : 'text-gray-400'}`}>
                            {hasView ? 'Visualiza' : 'Oculto'}
                          </span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: OUTRAS PERMISSÕES DE GOVERNANÇA */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-purple-600" />
          3. Governança e Operações Avançadas
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            {
              key: 'canEditFinancials',
              label: 'Editar Lançamentos Financeiros (DRE / Valores)',
              desc: 'Permite lançar faturamento, despesas e rubricas do setor financeiro',
            },
            {
              key: 'canManageUsers',
              label: 'Gerenciar Usuários & Cadastros',
              desc: 'Criar, editar e excluir contas de colaboradores',
            },
            {
              key: 'canViewAuditLogs',
              label: 'Visualizar Logs de Auditoria LGPD',
              desc: 'Acesso à trilha de integridade criptográfica SHA-256',
            },
            {
              key: 'canChangeReportStatus',
              label: 'Aprovar / Fechar Períodos do Relatório',
              desc: 'Alterar status entre Aberto, Em Revisão e Fechado',
            },
            {
              key: 'canManageSchedules',
              label: 'Configurar Agendamentos & Cron',
              desc: 'Disparos automáticos e rotinas de exportação',
            },
          ].map((perm) => (
            <label
              key={perm.key}
              className="flex items-start gap-2.5 p-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/60 transition-colors"
            >
              <input
                type="checkbox"
                checked={!!permissions[perm.key as keyof UserPermissions]}
                onChange={(e) =>
                  onChange({
                    ...permissions,
                    [perm.key]: e.target.checked,
                  })
                }
                className="mt-0.5 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block leading-tight">
                  {perm.label}
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5 leading-tight">
                  {perm.desc}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
