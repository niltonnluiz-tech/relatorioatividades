/**
 * Excel Export Generator for CAMP Piero Pollone Monthly Report
 * Generates rich, multi-tab .xlsx workbook matching all indicators,
 * financial figures, activities, and LGPD audit logs.
 */
import * as XLSX from 'xlsx';
import { MonthlyReport, AuditLog, User } from '../types';
import { canUserViewFinancials } from '../utils/permissions';

export function generateMonthlyExcel(
  report: MonthlyReport, 
  auditLogs: AuditLog[] = [], 
  requestingUser?: User
): void {
  const wb = XLSX.utils.book_new();
  const canSeeFinancials = requestingUser ? canUserViewFinancials(requestingUser) : true;

  // 1. Sheet: Resumo Institucional
  const summaryData = [
    ['CAMP PIERO POLLONE - SANTO ANDRÉ', ''],
    ['RELATÓRIO GERENCIAL MENSAL', report.fullTitle],
    ['Instituição:', report.institution],
    ['Endereço:', report.address],
    ['Telefone:', report.phone],
    ['Website:', report.website],
    ['Status do Relatório:', report.status.toUpperCase()],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    ['Conformidade:', 'LGPD (Lei 13.709/2018) & Criptografia E2EE AES-256'],
    ['', ''],
    ['QUADRO DE COORDENAÇÃO RESPONSÁVEL', ''],
    ['Departamento', 'Coordenador(a)', 'Cargo', 'Contato', 'Status'],
    ...Object.values(report.departments).map((d) => [
      d.coordinatorTitle,
      d.coordinatorName,
      d.coordinatorTitle,
      `${d.coordinatorPhone} | ${d.coordinatorEmail}`,
      d.status.toUpperCase(),
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Visão Geral');

  // 2. Sheet: Contratados & Histórico
  const hiringData = [
    ['EVOLUÇÃO DE CONTRATADOS - CAMP SANTO ANDRÉ', ''],
    ['Mês de Referência', 'Aprendizes', 'Estagiários', 'Total'],
    ['Maio 2026', report.hiringHistory.maio.aprendizes, report.hiringHistory.maio.estagiarios, report.hiringHistory.maio.aprendizes + report.hiringHistory.maio.estagiarios],
    ['Junho 2026', report.hiringHistory.junho.aprendizes, report.hiringHistory.junho.estagiarios, report.hiringHistory.junho.aprendizes + report.hiringHistory.junho.estagiarios],
    ['Julho 2026 (Contratados)', report.hiringHistory.julho.aprendizes, report.hiringHistory.julho.estagiarios, report.hiringHistory.julho.aprendizes + report.hiringHistory.julho.estagiarios],
  ];
  const wsHiring = XLSX.utils.aoa_to_sheet(hiringData);
  XLSX.utils.book_append_sheet(wb, wsHiring, 'Contratados');

  // 3. Sheet: RH - Gestão de Pessoas
  const rhDept = report.departments.rh;
  const rhData = [
    ['GESTÃO DE PESSOAS - RH', ''],
    ['Coordenadora:', `${rhDept.coordinatorName} (${rhDept.coordinatorPhone})`],
    ['', ''],
    ['Indicador de Pessoal', 'Quantidade'],
    ...rhDept.metrics.map((m) => [m.label, m.value]),
    ['', ''],
    ['DESPESAS DE PESSOAL (Confidencial)', canSeeFinancials ? 'Valor R$' : 'Valor R$ (Confidencial)'],
    ...(rhDept.subMetrics?.[0]?.items || []).map((m) => [
      m.label, 
      canSeeFinancials ? m.value : '[CONFIDENCIAL]'
    ]),
  ];
  const wsRh = XLSX.utils.aoa_to_sheet(rhData);
  XLSX.utils.book_append_sheet(wb, wsRh, 'Gestão de Pessoas RH');

  // 4. Sheet: Financeiro
  const finDept = report.departments.financeiro;
  const finData = [
    ['DEPARTAMENTO FINANCEIRO', ''],
    ['Coordenadora:', `${finDept.coordinatorName} (${finDept.coordinatorPhone})`],
    ['Situação de Inadimplência:', canSeeFinancials ? (finDept.customNotes || 'Inadimplentes: sem ocorrências.') : '[CONFIDENCIAL / ACESSO RESTRITO]'],
    ['', ''],
    ['Categoria', canSeeFinancials ? 'Valor R$' : 'Valor R$ (Acesso Restrito)'],
    ...finDept.metrics.map((m) => [
      m.label, 
      canSeeFinancials ? m.value : '[CONFIDENCIAL / ACESSO RESTRITO]'
    ]),
  ];
  const wsFin = XLSX.utils.aoa_to_sheet(finData);
  XLSX.utils.book_append_sheet(wb, wsFin, 'Financeiro');

  // 5. Sheet: Captação de Recursos
  const capDept = report.departments.captacao;
  const capData = [
    ['CAPTAÇÃO DE RECURSOS & RECRUTAMENTO', ''],
    ['Coordenadora:', `${capDept.coordinatorName} (${capDept.coordinatorPhone})`],
    ['', ''],
    ['Captação de Recursos', 'Quantidade'],
    ...capDept.metrics.map((m) => [m.label, m.value]),
    ['', ''],
    ['Recrutamento e Seleção', 'Quantidade'],
    ...(capDept.subMetrics?.[0]?.items || []).map((m) => [m.label, m.value]),
  ];
  const wsCap = XLSX.utils.aoa_to_sheet(capData);
  XLSX.utils.book_append_sheet(wb, wsCap, 'Captação de Recursos');

  // 6. Sheet: Ensino & Coordenação Técnica
  const ensDept = report.departments.ensino;
  const ensData = [
    ['ENSINO & COORDENAÇÃO PEDAGÓGICA', ''],
    ['Coordenadora:', `${ensDept.coordinatorName} (${ensDept.coordinatorPhone})`],
    ['', ''],
    ['Coordenação Técnica', 'Quantidade'],
    ...ensDept.metrics.map((m) => [m.label, m.value]),
  ];
  const wsEns = XLSX.utils.aoa_to_sheet(ensData);
  XLSX.utils.book_append_sheet(wb, wsEns, 'Ensino');

  // 7. Sheet: Psicologia & Supervisão Social
  const psiDept = report.departments.psicologia_social;
  const psiData = [
    ['PSICOLOGIA & SUPERVISORA SOCIAL', ''],
    ['Responsável:', `${psiDept.coordinatorName}`],
    ['', ''],
    ['Psicologia', 'Quantidade'],
    ...psiDept.metrics.map((m) => [m.label, m.value]),
    ['', ''],
    ['Supervisora Social', 'Quantidade'],
    ...(psiDept.subMetrics?.[0]?.items || []).map((m) => [m.label, m.value]),
  ];
  const wsPsi = XLSX.utils.aoa_to_sheet(psiData);
  XLSX.utils.book_append_sheet(wb, wsPsi, 'Psicologia e Social');

  // 8. Sheet: Projetos & TI
  const projDept = report.departments.projetos;
  const tiDept = report.departments.ti;
  const projData = [
    ['GERÊNCIA DE PROJETOS & TECNOLOGIA DA INFORMAÇÃO', ''],
    ['Gerente:', `${projDept.coordinatorName} (${projDept.coordinatorPhone})`],
    ['', ''],
    ['Legislação e Certificações (Atividades):', ''],
    ...(projDept.subBulletSections?.[0]?.items || []).map((item) => [item]),
    ['', ''],
    ['Programa de Estágio (Ações):', ''],
    ...(projDept.subBulletSections?.[1]?.items || []).map((item) => [item]),
    ['', ''],
    ['Indicadores de Estágio', 'Quantidade'],
    ...tiDept.metrics.map((m) => [m.label, m.value]),
    ['', ''],
    ['Atividades de Tecnologia da Informação (TI):', ''],
    ...(tiDept.bulletActivities || []).map((item) => [item]),
  ];
  const wsProj = XLSX.utils.aoa_to_sheet(projData);
  XLSX.utils.book_append_sheet(wb, wsProj, 'Projetos e TI');

  // 9. Sheet: Marketing & Comunicação
  const mktDept = report.departments.marketing;
  const mktData = [
    ['MARKETING & COMUNICAÇÃO', ''],
    ['Indicador', 'Quantidade'],
    ...mktDept.metrics.map((m) => [m.label, m.value]),
    ['', ''],
    ['Campanhas e Artes Realizadas:', ''],
    ...(mktDept.bulletActivities || []).map((item) => [item]),
  ];
  const wsMkt = XLSX.utils.aoa_to_sheet(mktData);
  XLSX.utils.book_append_sheet(wb, wsMkt, 'Marketing');

  // 10. Sheet: Operações (Limpeza, Manutenção, Cozinha)
  const limpDept = report.departments.limpeza;
  const manutDept = report.departments.manutencao;
  const cozDept = report.departments.cozinha;
  const opsData = [
    ['OPERAÇÕES PREDIAIS E SERVIÇOS GERAIS', ''],
    ['', ''],
    ['LIMPEZA E ZELADORIA (Atividades do Mês):', ''],
    ...(limpDept.bulletActivities || []).map((item) => [item]),
    ['', ''],
    ['MANUTENÇÃO PREDIAL (Atividades do Mês):', ''],
    ...(manutDept.bulletActivities || []).map((item) => [item]),
    ['', ''],
    ['COZINHA E NUTRIÇÃO (Atividades do Mês):', ''],
    ...(cozDept.bulletActivities || []).map((item) => [item]),
  ];
  const wsOps = XLSX.utils.aoa_to_sheet(opsData);
  XLSX.utils.book_append_sheet(wb, wsOps, 'Operações');

  // 11. Sheet: Presidência & Gerência Geral
  const presDept = report.departments.presidencia;
  const ggDept = report.departments.gerencia_geral;
  const dirData = [
    ['DIRETORIA E PRESIDÊNCIA', ''],
    ['Presidente:', `${presDept.coordinatorName} (${presDept.coordinatorPhone})`],
    ['Gerente Geral:', `${ggDept.coordinatorName} (${ggDept.coordinatorPhone})`],
    ['', ''],
    ['Gerência Geral (Atividades Estratégicas):', ''],
    ...(ggDept.bulletActivities || []).map((item) => [item]),
    ['', ''],
    ['Presidência - Implantações Realizadas:', ''],
    ...(presDept.subBulletSections?.[0]?.items || []).map((item) => [item]),
    ['', ''],
    ['Presidência - Próximas Implantações:', ''],
    ...(presDept.subBulletSections?.[1]?.items || []).map((item) => [item]),
  ];
  const wsDir = XLSX.utils.aoa_to_sheet(dirData);
  XLSX.utils.book_append_sheet(wb, wsDir, 'Presidência e Gerência');

  // 12. Sheet: Trilha de Auditoria LGPD
  if (auditLogs.length > 0) {
    const auditData = [
      ['TRILHA DE AUDITORIA E RASTREABILIDADE (LGPD ART. 18 / ART. 46)', ''],
      ['Timestamp', 'Usuário', 'Setor', 'Ação', 'Detalhes', 'Hash Integridade SHA-256'],
      ...auditLogs.map((l) => [
        l.timestamp,
        l.userName,
        l.departmentId,
        l.action,
        l.details,
        l.integrityHash,
      ]),
    ];
    const wsAudit = XLSX.utils.aoa_to_sheet(auditData);
    XLSX.utils.book_append_sheet(wb, wsAudit, 'Trilha Auditoria LGPD');
  }

  // Trigger browser download
  const filename = `Relatorio_Gerencial_CAMP_${report.id}_Oficial.xlsx`;
  XLSX.writeFile(wb, filename);
}
