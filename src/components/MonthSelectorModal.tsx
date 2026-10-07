import React, { useState } from 'react';
import { Calendar, Check, Clock, ChevronRight, PlusCircle, Sparkles, X } from 'lucide-react';
import { MonthlyReport } from '../types';
import { sqlDb } from '../services/sqlDb';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentReport: MonthlyReport;
  onSelectReportId: (reportId: string) => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MonthSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentReport,
  onSelectReportId,
}) => {
  const currentDate = new Date();
  const currentSystemMonth = currentDate.getMonth() + 1;
  const currentSystemYear = currentDate.getFullYear();
  const currentSystemReportId = `${currentSystemYear}-${String(currentSystemMonth).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<number>(currentReport.month);
  const [selectedYear, setSelectedYear] = useState<number>(currentReport.year);

  if (!isOpen) return null;

  const allReports = sqlDb.getAllReports();

  const handleApplyManual = () => {
    const reportId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    onSelectReportId(reportId);
    onClose();
  };

  const handleSelectCurrentAutomatic = () => {
    onSelectReportId(currentSystemReportId);
    onClose();
  };

  const handleQuickSelect = (reportId: string) => {
    onSelectReportId(reportId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0B0F19] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Período do Relatório</h3>
              <p className="text-xs text-gray-400">
                Selecione o mês e ano corrente ou consulte períodos anteriores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Action: Usar Mês Atual Automático */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Mês Atual do Sistema (Automático)</span>
              </div>
              <p className="text-xs text-blue-700 mt-0.5">
                Definir automaticamente para <strong>{MONTH_NAMES[currentSystemMonth - 1]} / {currentSystemYear}</strong>
              </p>
            </div>
            <button
              onClick={handleSelectCurrentAutomatic}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap ${
                currentReport.id === currentSystemReportId
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-600 hover:text-white'
              }`}
            >
              {currentReport.id === currentSystemReportId ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Mês Ativo
                </>
              ) : (
                <>
                  Usar Este Mês <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Manual Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Seleção Manual de Mês e Ano
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">Mês</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">Ano</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleApplyManual}
              className="w-full py-2.5 bg-[#0B0F19] text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-blue-400" /> Abrir / Criar Relatório para {MONTH_NAMES[selectedMonth - 1]} / {selectedYear}
            </button>
          </div>

          {/* Existing Reports in Database */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Relatórios Cadastrados na Base SQL ({allReports.length})
            </span>
            <div className="space-y-2">
              {allReports.map((rep) => {
                const isActive = rep.id === currentReport.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => handleQuickSelect(rep.id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 border-blue-500 shadow-xs'
                        : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100/80 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {String(rep.month).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <span>{rep.fullTitle}</span>
                          {isActive && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Em visualização
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Status: {rep.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
