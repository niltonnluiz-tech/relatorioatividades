import { DepartmentId, User, UserPermissions } from '../types';
import { OFFICIAL_SECTORS } from '../constants/sectors';

/**
 * Normaliza sinônimos de identificadores de departamentos
 */
export function normalizeDepartmentId(deptId?: string): string {
  if (!deptId) return '';
  if (deptId === 'admin') return 'ti';
  if (deptId === 'ensino') return 'pedagogico';
  if (deptId === 'psicologia_social') return 'psicologia';
  return deptId;
}

/**
 * Verifica se o usuário tem permissão para ACESSAR (lançar/editar) um determinado departamento
 * - Administradores têm acesso total a todos os departamentos.
 * - Usuários comuns têm acesso apenas se o admin marcou 'canAccess', ou por padrão em seu próprio setor.
 */
export function canUserAccessDepartment(user?: User | null, deptId?: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const targetId = normalizeDepartmentId(deptId);
  const userOwnId = normalizeDepartmentId(user.departmentId);

  // Se há configuração específica para o setor
  const deptPerm = user.permissions?.departments?.[targetId];
  if (deptPerm) {
    return Boolean(deptPerm.canAccess);
  }

  // Comportamento padrão: apenas o próprio departamento do usuário
  return targetId === userOwnId;
}

/**
 * Verifica se o usuário tem permissão para VISUALIZAR (modo leitura) um determinado departamento
 * - Administradores podem visualizar todos os departamentos.
 * - Quem tem 'canAccess' automaticamente também pode visualizar.
 * - Quem tem 'canView' pode visualizar em modo somente-leitura.
 * - Por padrão, cada usuário visualiza apenas seu próprio setor.
 */
export function canUserViewDepartment(user?: User | null, deptId?: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  // Se pode editar, certamente pode visualizar
  if (canUserAccessDepartment(user, deptId)) return true;

  const targetId = normalizeDepartmentId(deptId);
  const userOwnId = normalizeDepartmentId(user.departmentId);

  // Se há configuração explícita de visualização
  const deptPerm = user.permissions?.departments?.[targetId];
  if (deptPerm) {
    return Boolean(deptPerm.canView);
  }

  // Comportamento padrão: apenas o próprio departamento
  return targetId === userOwnId;
}

/**
 * Retorna todos os departamentos que o usuário está autorizado a pelo menos visualizar ou acessar
 */
export function getAllowedDepartmentsForUser(user?: User | null): {
  id: DepartmentId;
  name: string;
  canAccess: boolean;
  canView: boolean;
}[] {
  if (!user) return [];

  return OFFICIAL_SECTORS.map((sector) => {
    const canAccess = canUserAccessDepartment(user, sector.id);
    const canView = canUserViewDepartment(user, sector.id);
    return {
      id: sector.id,
      name: sector.name,
      canAccess,
      canView,
    };
  }).filter((s) => s.canView || s.canAccess);
}

/**
 * Verifica se o usuário tem permissão para ACESSAR o Relatório Oficial (15 Páginas)
 * - Administradores sempre podem.
 * - Usuários comuns só podem se canAccessReport for verdadeiro (padrão false para operadores, configurável pelo admin).
 */
export function canUserAccessReport(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Boolean(user.permissions?.canAccessReport);
}

/**
 * Verifica se o usuário pode BAIXAR o Relatório Oficial em PDF
 * - Administradores sempre podem.
 * - Usuários comuns precisam de canExportPdf explícito.
 */
export function canUserExportPdf(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Boolean(user.permissions?.canExportPdf);
}

/**
 * Verifica se o usuário pode BAIXAR a Planilha Excel consolidada
 * - Administradores sempre podem.
 * - Usuários comuns precisam de canExportExcel explícito.
 */
export function canUserExportExcel(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Boolean(user.permissions?.canExportExcel);
}

/**
 * Verifica se o usuário pode VISUALIZAR DADOS E VALORES FINANCEIROS CONFIDENCIAIS
 * - Administradores sempre podem.
 * - Coordenador do Financeiro pode.
 * - Outros usuários precisam da permissão explícita canViewFinancials concedida pelo Admin.
 */
export function canUserViewFinancials(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (normalizeDepartmentId(user.departmentId) === 'financeiro') return true;
  return Boolean(user.permissions?.canViewFinancials);
}

/**
 * Gera conjunto padrão de permissões ao criar ou redefinir usuário
 */
export function getDefaultPermissionsForUser(role: string, departmentId: string): UserPermissions {
  const isAdmin = role === 'admin';
  const isFinance = departmentId === 'financeiro';

  const defaultDepts: Record<string, { canView: boolean; canAccess: boolean }> = {};
  OFFICIAL_SECTORS.forEach((sec) => {
    if (isAdmin) {
      defaultDepts[sec.id] = { canView: true, canAccess: true };
    } else {
      const isOwn = sec.id === departmentId;
      defaultDepts[sec.id] = { canView: isOwn, canAccess: isOwn };
    }
  });

  return {
    canAccessReport: isAdmin,
    canExportPdf: isAdmin,
    canExportExcel: isAdmin,
    canViewFinancials: isAdmin || isFinance,
    canEditFinancials: isAdmin || isFinance,
    canManageUsers: isAdmin,
    canViewAuditLogs: isAdmin,
    canChangeReportStatus: isAdmin,
    canManageSchedules: isAdmin,
    departments: defaultDepts,
  };
}
