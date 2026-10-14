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

/**
 * Retorna todos os setores (oficiais + customizados adicionados pelos administradores) com edições aplicadas
 */
export function getAllSectors(): SectorItem[] {
  let list = [...OFFICIAL_SECTORS];
  if (typeof localStorage !== 'undefined') {
    // Custom sectors added by admin
    const storedCustom = localStorage.getItem('CAMP_CUSTOM_SECTORS');
    if (storedCustom) {
      try {
        const custom: SectorItem[] = JSON.parse(storedCustom);
        custom.forEach((cs) => {
          if (!list.some((s) => s.id === cs.id)) {
            list.push(cs);
          }
        });
      } catch (e) {}
    }

    // Edits to sector names/descriptions/positions
    const storedEdits = localStorage.getItem('CAMP_SECTOR_EDITS');
    if (storedEdits) {
      try {
        const edits: Record<string, { name: string; description: string; defaultPosition: string }> = JSON.parse(storedEdits);
        list = list.map((s) => {
          if (edits[s.id]) {
            return {
              ...s,
              name: edits[s.id].name,
              description: edits[s.id].description,
              defaultPosition: edits[s.id].defaultPosition || s.defaultPosition,
            };
          }
          return s;
        });
      } catch (e) {}
    }
  }
  return list;
}

export function addCustomSector(data: { name: string; description: string; defaultPosition: string }): SectorItem {
  const id = `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` as DepartmentId;
  const newItem: SectorItem = {
    id,
    name: data.name.trim(),
    description: data.description.trim(),
    defaultPosition: data.defaultPosition.trim() || 'Coordenador(a)',
  };

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('CAMP_CUSTOM_SECTORS');
    let custom: SectorItem[] = [];
    if (stored) {
      try { custom = JSON.parse(stored); } catch (e) {}
    }
    custom.push(newItem);
    localStorage.setItem('CAMP_CUSTOM_SECTORS', JSON.stringify(custom));
  }
  return newItem;
}

export function updateSectorDetails(id: string, data: { name: string; description: string; defaultPosition: string }): void {
  if (typeof localStorage !== 'undefined') {
    // Check if it's in custom sectors
    const storedCustom = localStorage.getItem('CAMP_CUSTOM_SECTORS');
    if (storedCustom) {
      try {
        let custom: SectorItem[] = JSON.parse(storedCustom);
        const idx = custom.findIndex((s) => s.id === id);
        if (idx >= 0) {
          custom[idx] = {
            ...custom[idx],
            name: data.name.trim(),
            description: data.description.trim(),
            defaultPosition: data.defaultPosition.trim(),
          };
          localStorage.setItem('CAMP_CUSTOM_SECTORS', JSON.stringify(custom));
          return;
        }
      } catch (e) {}
    }

    // Otherwise store in edits map
    const storedEdits = localStorage.getItem('CAMP_SECTOR_EDITS');
    let edits: Record<string, { name: string; description: string; defaultPosition: string }> = {};
    if (storedEdits) {
      try { edits = JSON.parse(storedEdits); } catch (e) {}
    }
    edits[id] = {
      name: data.name.trim(),
      description: data.description.trim(),
      defaultPosition: data.defaultPosition.trim(),
    };
    localStorage.setItem('CAMP_SECTOR_EDITS', JSON.stringify(edits));
  }
}

export function deleteCustomSector(id: string): void {
  if (typeof localStorage !== 'undefined') {
    const storedCustom = localStorage.getItem('CAMP_CUSTOM_SECTORS');
    if (storedCustom) {
      try {
        let custom: SectorItem[] = JSON.parse(storedCustom);
        custom = custom.filter((s) => s.id !== id);
        localStorage.setItem('CAMP_CUSTOM_SECTORS', JSON.stringify(custom));
      } catch (e) {}
    }
  }
}

export function getSectorDescription(departmentId?: string): string {
  if (!departmentId) return '';
  const canonId = departmentId === 'admin' ? 'ti' : departmentId === 'ensino' ? 'pedagogico' : departmentId;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('CAMP_SECTOR_DESCRIPTIONS');
    if (stored) {
      try {
        const map = JSON.parse(stored);
        if (map[canonId]) return map[canonId];
        if (map[departmentId]) return map[departmentId];
      } catch (e) {}
    }
  }
  const sector = getAllSectors().find((s) => s.id === canonId || s.id === departmentId);
  return sector ? sector.description : '';
}

export function saveSectorDescription(departmentId: string, description: string): void {
  const canonId = departmentId === 'admin' ? 'ti' : departmentId === 'ensino' ? 'pedagogico' : departmentId;
  let map: Record<string, string> = {};
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('CAMP_SECTOR_DESCRIPTIONS');
    if (stored) {
      try { map = JSON.parse(stored); } catch (e) {}
    }
  }
  map[canonId] = description;
  map[departmentId] = description;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('CAMP_SECTOR_DESCRIPTIONS', JSON.stringify(map));
  }
}


