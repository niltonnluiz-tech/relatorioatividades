import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  AlertCircle, 
  Trash2, 
  Download, 
  X, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { MetricItem, DepartmentId } from '../types';
import { getSectorName } from '../constants/sectors';

interface ParsedActivity {
  id: string;
  text: string;
  date?: string;
  selected: boolean;
}

interface ParsedMetric {
  id: string;
  label: string;
  value: string | number;
  date?: string;
  selected: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departmentId: DepartmentId;
  departmentName: string;
  currentActivities: string[];
  currentMetrics: MetricItem[];
  onImport: (
    newActivities: string[],
    newMetrics: MetricItem[],
    mode: 'append' | 'replace'
  ) => void;
}

export const ImportItemsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  onImport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'excel' | 'text' | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [activeTab, setActiveTab] = useState<'activities' | 'metrics'>('activities');

  const [parsedActivities, setParsedActivities] = useState<ParsedActivity[]>([]);
  const [parsedMetrics, setParsedMetrics] = useState<ParsedMetric[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handles drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handles drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handles file selection via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Process the uploaded file
  const processFile = (file: File) => {
    setErrorMessage(null);
    setIsLoading(true);
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));

    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (['xlsx', 'xls', 'csv'].includes(extension)) {
      setFileType('excel');
      readSpreadsheet(file);
    } else if (['txt', 'text', 'md', 'tsv'].includes(extension)) {
      setFileType('text');
      readTextFile(file);
    } else {
      // Try reading as text by default
      setFileType('text');
      readTextFile(file);
    }
  };

  // Reads Excel or CSV files
  const readSpreadsheet = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse as array of arrays (raw matrix)
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) {
          setErrorMessage('A planilha selecionada está vazia.');
          setIsLoading(false);
          return;
        }

        const activities: ParsedActivity[] = [];
        const metrics: ParsedMetric[] = [];

        // Check if row 0 is a header
        let startIndex = 0;
        const headerRow = rows[0].map((c) => String(c).toLowerCase().trim());
        const hasHeader = headerRow.some((h) => 
          ['atividade', 'descricao', 'item', 'acao', 'indicador', 'valor', 'quantidade', 'data', 'metrica'].some(k => h.includes(k))
        );

        let descCol = 0;
        let valCol = -1;
        let dateCol = -1;

        if (hasHeader) {
          startIndex = 1;
          headerRow.forEach((h, idx) => {
            if (h.includes('valor') || h.includes('quantidade') || h.includes('qtd') || h.includes('total') || h.includes('metrica')) {
              valCol = idx;
            } else if (h.includes('data') || h.includes('dia') || h.includes('periodo')) {
              dateCol = idx;
            } else if (h.includes('atividade') || h.includes('descricao') || h.includes('item') || h.includes('acao')) {
              descCol = idx;
            }
          });
        }

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const desc = String(row[descCol] !== undefined ? row[descCol] : row[0] || '').trim();
          if (!desc) continue;

          // Check if there is a distinct value column
          const valRaw = valCol !== -1 && row[valCol] !== undefined ? String(row[valCol]).trim() : '';
          const dateRaw = dateCol !== -1 && row[dateCol] !== undefined ? String(row[dateCol]).trim() : '';

          // If there's a numeric or distinct value column, categorize as metric
          if (valRaw !== '' && (valRaw.match(/\d/) || ['-', 'r$', '%'].some(s => valRaw.toLowerCase().includes(s)))) {
            metrics.push({
              id: `imp_m_${Date.now()}_${i}`,
              label: desc,
              value: isNaN(Number(valRaw)) ? valRaw : Number(valRaw),
              date: dateRaw || undefined,
              selected: true,
            });
          } else {
            // Categorize as bullet activity
            // If date is present, prefix nicely
            let formattedText = desc;
            if (dateRaw && !desc.includes(dateRaw)) {
              formattedText = `[${dateRaw}] ${desc}`;
            }
            activities.push({
              id: `imp_a_${Date.now()}_${i}`,
              text: formattedText,
              date: dateRaw || undefined,
              selected: true,
            });
          }
        }

        setParsedActivities(activities);
        setParsedMetrics(metrics);
        if (activities.length === 0 && metrics.length > 0) {
          setActiveTab('metrics');
        } else {
          setActiveTab('activities');
        }
      } catch (err: any) {
        setErrorMessage(`Falha ao processar planilha: ${err.message || 'Formato inválido'}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler arquivo da planilha.');
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Reads plain text files (.txt, .md, .tsv)
  const readTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = String(e.target?.result || '');
        const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

        if (lines.length === 0) {
          setErrorMessage('O arquivo de texto selecionado está vazio.');
          setIsLoading(false);
          return;
        }

        const activities: ParsedActivity[] = [];
        const metrics: ParsedMetric[] = [];

        lines.forEach((line, idx) => {
          // Remove leading bullet symbols like -, *, •, 1., 2.
          const cleanLine = line.replace(/^[\*\-\•\–\—\>]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
          if (!cleanLine) return;

          // Check if line looks like "Indicador: 42" or "Faturamento: R$ 10.000,00"
          const colonMatch = cleanLine.match(/^([^:\t]+)[:\t]\s*([R\$€£]?\s*[\d\.\,\-]+%?.*)$/i);
          if (colonMatch && colonMatch[1] && colonMatch[2] && colonMatch[2].trim().length > 0) {
            const label = colonMatch[1].trim();
            const valStr = colonMatch[2].trim();
            metrics.push({
              id: `imp_m_${Date.now()}_${idx}`,
              label,
              value: isNaN(Number(valStr.replace(',', '.'))) ? valStr : Number(valStr.replace(',', '.')),
              selected: true,
            });
          } else {
            // Check for date pattern like [15/09/2026] or 15/09/2026 - ...
            const dateMatch = cleanLine.match(/(\d{2}\/\d{2}(?:\/\d{4})?)/);
            activities.push({
              id: `imp_a_${Date.now()}_${idx}`,
              text: cleanLine,
              date: dateMatch ? dateMatch[1] : undefined,
              selected: true,
            });
          }
        });

        setParsedActivities(activities);
        setParsedMetrics(metrics);
        if (activities.length === 0 && metrics.length > 0) {
          setActiveTab('metrics');
        } else {
          setActiveTab('activities');
        }
      } catch (err: any) {
        setErrorMessage(`Falha ao ler arquivo de texto: ${err.message || 'Erro de codificação'}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler arquivo.');
      setIsLoading(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Toggle selection
  const toggleActivity = (id: string) => {
    setParsedActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  const toggleMetric = (id: string) => {
    setParsedMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m))
    );
  };

  const selectAllActivities = (val: boolean) => {
    setParsedActivities((prev) => prev.map((a) => ({ ...a, selected: val })));
  };

  const selectAllMetrics = (val: boolean) => {
    setParsedMetrics((prev) => prev.map((m) => ({ ...m, selected: val })));
  };

  const removeActivity = (id: string) => {
    setParsedActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const removeMetric = (id: string) => {
    setParsedMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  // Confirm import
  const handleConfirmImport = () => {
    const selectedActs = parsedActivities.filter((a) => a.selected).map((a) => a.text);
    const selectedMets: MetricItem[] = parsedMetrics
      .filter((m) => m.selected)
      .map((m) => ({
        id: m.id,
        label: m.label,
        value: m.value,
        date: m.date,
      }));

    if (selectedActs.length === 0 && selectedMets.length === 0) {
      setErrorMessage('Selecione ao menos um item ou indicador para importar.');
      return;
    }

    onImport(selectedActs, selectedMets, importMode);
    onClose();
  };

  // Generate and download Excel sample template
  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Atividades
    const activitiesData = [
      ['Atividade / Descrição', 'Data (Opcional)'],
      ['Reunião de alinhamento com equipe setorial', '15/09/2026'],
      ['Organização e conferência documental de rotina', '16/09/2026'],
      ['Elaboração de relatório gerencial e demonstrativos', '18/09/2026'],
      ['Atendimento socioeducativo e suporte aos colaboradores', '22/09/2026'],
    ];
    const wsActivities = XLSX.utils.aoa_to_sheet(activitiesData);
    XLSX.utils.book_append_sheet(wb, wsActivities, 'Atividades');

    // Sheet 2: Indicadores
    const metricsData = [
      ['Indicador / Métrica', 'Valor / Quantidade', 'Data'],
      ['Atendimentos Realizados', 45, '15/09/2026'],
      ['Processos Concluídos', 18, '20/09/2026'],
      ['Visitas Técnicas Homologadas', 6, '22/09/2026'],
      ['Receitas / Valores Operacionais', 'R$ 15.400,00', '25/09/2026'],
    ];
    const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(wb, wsMetrics, 'Indicadores');

    XLSX.writeFile(wb, `Modelo_Importacao_${departmentId}.xlsx`);
  };

  // Generate and download Text sample template
  const downloadTextTemplate = () => {
    const textContent = `[15/09/2026] Reunião de alinhamento estratégico com a equipe
[18/09/2026] Elaboração do relatório de acompanhamento mensal
[22/09/2026] Visita técnica e supervisão de rotina operacional
Atendimentos Realizados: 45
Processos Concluídos: 18
Taxa de Conformidade: 98%
Despesas Operacionais: R$ 4.250,00
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Modelo_Importacao_${departmentId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedActCount = parsedActivities.filter((a) => a.selected).length;
  const selectedMetCount = parsedMetrics.filter((m) => m.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-[#0B0F19] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Importar Itens e Atividades</h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {getSectorName(departmentId) || departmentName}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Carregue arquivos de planilhas (Excel/CSV) ou arquivos de texto para inclusão em lote
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* File Upload Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
                : fileName
                ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/60'
                : 'border-gray-300 bg-gray-50/60 hover:bg-gray-100 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.tsv,.md"
              onChange={handleFileChange}
              className="hidden"
            />

            {isLoading ? (
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-gray-700">Lendo e estruturando arquivo...</span>
              </div>
            ) : fileName ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    {fileType === 'excel' ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block break-all">{fileName}</span>
                    <span className="text-[11px] text-gray-500">Tamanho: {fileSize} • Tipo: {fileType === 'excel' ? 'Planilha' : 'Texto'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo Carregado
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileName(null);
                      setParsedActivities([]);
                      setParsedMetrics([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                    title="Remover arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Clique para selecionar ou arraste sua planilha / arquivo aqui
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Formatos suportados: Excel (<strong>.xlsx, .xls</strong>), <strong>.csv</strong> ou Texto (<strong>.txt, .md, .tsv</strong>)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sample template download buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            <span className="text-gray-600 font-medium">Modelos prontos para preenchimento rápido:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Modelo Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={downloadTextTemplate}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Modelo Texto (.txt)
              </button>
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed items preview */}
          {(parsedActivities.length > 0 || parsedMetrics.length > 0) && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-2">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('activities')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'activities'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Atividades & Tópicos ({selectedActCount}/{parsedActivities.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('metrics')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'metrics'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Indicadores & Métricas ({selectedMetCount}/{parsedMetrics.length})</span>
                  </button>
                </div>

                {/* Import mode toggle */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-medium">Modo:</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600"
                    />
                    <span className="font-semibold text-gray-800">Acrescentar</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer ml-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-red-600"
                    />
                    <span className="font-semibold text-red-700">Substituir</span>
                  </label>
                </div>
              </div>

              {/* TAB 1: ACTIVITIES */}
              {activeTab === 'activities' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Marque os itens que deseja incluir no relatório:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllActivities(true)}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Selecionar Todos
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => selectAllActivities(false)}
                        className="text-gray-500 hover:underline cursor-pointer"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>

                  {parsedActivities.length === 0 ? (
                    <div className="p-6 text-center bg-gray-50 rounded-xl text-gray-500 text-xs">
                      Nenhuma atividade identificada neste arquivo. Verifique a aba de Indicadores.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white shadow-2xs">
                      {parsedActivities.map((act) => (
                        <div
                          key={act.id}
                          className={`p-2.5 flex items-start gap-2.5 transition-colors ${
                            act.selected ? 'bg-blue-50/30' : 'bg-gray-50/50 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={act.selected}
                            onChange={() => toggleActivity(act.id)}
                            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-900 block break-words font-medium">
                              {act.text}
                            </span>
                            {act.date && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 font-mono mt-0.5">
                                <Calendar className="w-2.5 h-2.5" /> {act.date}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeActivity(act.id)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: METRICS */}
              {activeTab === 'metrics' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Indicadores quantitativos e financeiros identificados:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllMetrics(true)}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Selecionar Todos
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => selectAllMetrics(false)}
                        className="text-gray-500 hover:underline cursor-pointer"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>

                  {parsedMetrics.length === 0 ? (
                    <div className="p-6 text-center bg-gray-50 rounded-xl text-gray-500 text-xs">
                      Nenhum indicador com valor numérico/financeiro identificado neste arquivo.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-2xs">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                            <th className="p-2 w-8 text-center"></th>
                            <th className="p-2 text-left">Indicador</th>
                            <th className="p-2 text-right w-36">Valor / Quantidade</th>
                            <th className="p-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parsedMetrics.map((met) => (
                            <tr
                              key={met.id}
                              className={`hover:bg-gray-50/80 transition-colors ${
                                met.selected ? 'bg-blue-50/20' : 'bg-gray-50/50 opacity-60'
                              }`}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={met.selected}
                                  onChange={() => toggleMetric(met.id)}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-2 font-medium text-gray-900">{met.label}</td>
                              <td className="p-2 text-right font-mono font-bold text-gray-900">{met.value}</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeMetric(met.id)}
                                  className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              Total selecionado para importação: <strong>{selectedActCount} atividade(s)</strong> e{' '}
              <strong>{selectedMetCount} indicador(es)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedActCount === 0 && selectedMetCount === 0}
              className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Importação</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
