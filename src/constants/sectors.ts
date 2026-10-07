import { DepartmentId } from '../types';

export interface SectorItem {
  id: DepartmentId;
  name: string;
  description: string;
  defaultPosition: string;
}

/**
 * Relação oficial dos setores da instituição conforme especificação:
 * - Gerente Geral
 * - Gerente de Projetos
 * - Gestão de Pessoas | RH
 * - Captação de Recursos
 * - Presidente
 * - Coordenador Administrativo
 * - Manutenção
 * - Estágio
 * - Limpeza
 * - Cozinha
 * - Financeiro
 * - Pedagógico (Ensino)
 * - Psicologia
 * - Social
 * - Tecnologia (TI)
 * - Marketing
 */
export const OFFICIAL_SECTORS: SectorItem[] = [
  {
    id: 'gerencia_geral',
    name: 'Gerente Geral',
    description: 'Direção operacional, coordenação executiva e alinhamento institucional.',
    defaultPosition: 'Gerente Geral',
  },
  {
    id: 'projetos',
    name: 'Gerente de Projetos',
    description: 'Gestão e execução de projetos socioeducativos e convênios estratégicos.',
    defaultPosition: 'Gerente de Projetos',
  },
  {
    id: 'rh',
    name: 'Gestão de Pessoas | RH',
    description: 'Administração de pessoal, acolhimento, desenvolvimento humano e departamento pessoal.',
    defaultPosition: 'Coordenador(a) de Gestão de Pessoas',
  },
  {
    id: 'captacao',
    name: 'Captação de Recursos',
    description: 'Relações institucionais, parcerias corporativas e sustentabilidade financeira.',
    defaultPosition: 'Coordenador(a) de Captação',
  },
  {
    id: 'presidencia',
    name: 'Presidente',
    description: 'Governança institucional, representação estatutária e conselho diretor.',
    defaultPosition: 'Presidente',
  },
  {
    id: 'coordenador_administrativo',
    name: 'Coordenador Administrativo',
    description: 'Gestão de processos administrativos, compras, suporte e conformidade.',
    defaultPosition: 'Coordenador(a) Administrativo(a)',
  },
  {
    id: 'manutencao',
    name: 'Manutenção',
    description: 'Infraestrutura predial, segurança patrimonial e manutenção preventiva e corretiva.',
    defaultPosition: 'Encarregado(a) de Manutenção',
  },
  {
    id: 'estagio',
    name: 'Estágio',
    description: 'Programa de estágio socioeducativo, supervisão e integração ao mercado.',
    defaultPosition: 'Supervisor(a) de Estágio',
  },
  {
    id: 'limpeza',
    name: 'Limpeza',
    description: 'Zeladoria, higienização de ambientes e conservação das dependências.',
    defaultPosition: 'Encarregado(a) de Limpeza',
  },
  {
    id: 'cozinha',
    name: 'Cozinha',
    description: 'Alimentação balanceada, nutrição dos aprendizes e gestão do refeitório.',
    defaultPosition: 'Responsável pela Cozinha & Nutrição',
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Contas a pagar e receber, fluxo de caixa, prestação de contas e controladoria.',
    defaultPosition: 'Coordenador(a) Financeiro(a)',
  },
  {
    id: 'pedagogico',
    name: 'Pedagógico (Ensino)',
    description: 'Formação básica de aprendizes, grade curricular e acompanhamento pedagógico.',
    defaultPosition: 'Coordenador(a) Pedagógico(a)',
  },
  {
    id: 'psicologia',
    name: 'Psicologia',
    description: 'Atendimento psicológico, escuta ativa, suporte socioemocional e mediação.',
    defaultPosition: 'Psicólogo(a)',
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Serviço social, visitas domiciliares, relatórios de vulnerabilidade e rede de apoio.',
    defaultPosition: 'Assistente Social',
  },
  {
    id: 'ti',
    name: 'Tecnologia (TI)',
    description: 'Sistemas de informação, infraestrutura de redes, suporte técnico e segurança de dados.',
    defaultPosition: 'Coordenador(a) de Tecnologia (TI)',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Comunicação institucional, mídias digitais, eventos e divulgação das atividades.',
    defaultPosition: 'Responsável por Marketing & Comunicação',
  },
];

/**
 * Retorna os setores ordenados em ordem Crescente (padrão) ou Decrescente
 */
export function getSortedSectors(order: 'asc' | 'desc' = 'asc'): SectorItem[] {
  const sorted = [...OFFICIAL_SECTORS].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    return order === 'asc' ? comparison : -comparison;
  });
  return sorted;
}

/**
 * Busca o nome oficial do setor pelo ID (suporta sinônimos e compatibilidade legada)
 */
export function getSectorName(departmentId?: string): string {
  if (!departmentId) return 'Não Definido';
  if (departmentId === 'admin') return 'Tecnologia (TI)';
  if (departmentId === 'ensino') return 'Pedagógico (Ensino)';
  if (departmentId === 'psicologia_social') return 'Psicologia & Social';

  const sector = OFFICIAL_SECTORS.find((s) => s.id === departmentId);
  return sector ? sector.name : departmentId;
}
