import { DepartmentId, MonthlyReport } from '../types';
import { OFFICIAL_SECTORS } from './sectors';

export interface ReportPageConfig {
  pageNumber: number;
  id: string; // 'capa' | 'contratados' | DepartmentId
  title: string;
  departmentId?: DepartmentId;
}

// Ordem canônica que mantém compatibilidade com os relatórios clássicos e inclui todos os setores cadastrados
const PREFERRED_SECTOR_ORDER: DepartmentId[] = [
  'rh',
  'financeiro',
  'captacao',
  'pedagogico',
  'psicologia',
  'social',
  'limpeza',
  'projetos',
  'ti',
  'estagio',
  'marketing',
  'manutencao',
  'gerencia_geral',
  'cozinha',
  'presidencia',
  'coordenador_administrativo',
];

/**
 * Retorna as páginas do relatório configuradas dinamicamente conforme os departamentos cadastrados
 * no sistema (OFFICIAL_SECTORS), além da Capa e Contratados.
 */
export function getReportPages(_report?: MonthlyReport): ReportPageConfig[] {
  const pages: ReportPageConfig[] = [
    { pageNumber: 1, id: 'capa', title: 'Capa Oficial' },
    { pageNumber: 2, id: 'contratados', title: 'Contratados & Aprendizes' },
  ];

  // Adiciona os setores na ordem preferencial
  PREFERRED_SECTOR_ORDER.forEach((deptId) => {
    const sector = OFFICIAL_SECTORS.find((s) => s.id === deptId);
    if (sector) {
      pages.push({
        pageNumber: pages.length + 1,
        id: sector.id,
        title: sector.name,
        departmentId: sector.id,
      });
    }
  });

  // Garante que qualquer outro setor registrado que não estava na lista preferencial também seja incluído
  OFFICIAL_SECTORS.forEach((sector) => {
    if (!PREFERRED_SECTOR_ORDER.includes(sector.id)) {
      pages.push({
        pageNumber: pages.length + 1,
        id: sector.id,
        title: sector.name,
        departmentId: sector.id,
      });
    }
  });

  return pages;
}

export function getReportPageCount(report?: MonthlyReport): number {
  return getReportPages(report).length;
}

export function getReportPageNamesMap(report?: MonthlyReport): Record<number, string> {
  const pages = getReportPages(report);
  const map: Record<number, string> = {};
  pages.forEach((p) => {
    map[p.pageNumber] = p.title;
  });
  return map;
}
