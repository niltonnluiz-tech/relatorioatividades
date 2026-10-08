import React, { useState } from 'react';
import { HiringDashboardConfig, MonthlyReport, User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { BarChart3, CheckCircle2, Save, X, Layers, Users, FileText, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: MonthlyReport;
  currentUser: User;
  onSaved: () => void;
}

export const HiringDashboardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  report,
  currentUser,
  onSaved,
}) => {
  const existingConfig = report.hiringDashboard || {
    displayMode: '2_previous_and_current',
    previousMonth2: {
      monthName: 'Maio 2026',
      aprendizesContratados: report.hiringHistory?.maio?.aprendizes || 667,
      contratosEmProcesso: 42,
      estagiarios: report.hiringHistory?.maio?.estagiarios || 52,
    },
    previousMonth1: {
      monthName: 'Junho 2026',
      aprendizesContratados: report.hiringHistory?.junho?.aprendizes || 649,
      contratosEmProcesso: 38,
      estagiarios: report.hiringHistory?.junho?.estagiarios || 58,
    },
    currentMonth: {
      monthName: report.monthName ? `${report.monthName} ${report.year}` : 'Julho 2026',
      aprendizesContratados: report.hiringHistory?.julho?.aprendizes || 629,
      contratosEmProcesso: 45,
      estagiarios: report.hiringHistory?.julho?.estagiarios || 51,
    },
  };

  const [displayMode, setDisplayMode] = useState<'1_previous_and_current' | '2_previous_and_current'>(
    existingConfig.displayMode || '2_previous_and_current'
  );

  // Previous Month 2
  const [p2MonthName, setP2MonthName] = useState(existingConfig.previousMonth2.monthName || 'Maio 2026');
  const [p2Contratados, setP2Contratados] = useState(existingConfig.previousMonth2.aprendizesContratados || 667);
  const [p2EmProcesso, setP2EmProcesso] = useState(existingConfig.previousMonth2.contratosEmProcesso || 0);
  const [p2Estagiarios, setP2Estagiarios] = useState(existingConfig.previousMonth2.estagiarios || 52);

  // Previous Month 1
  const [p1MonthName, setP1MonthName] = useState(existingConfig.previousMonth1.monthName || 'Junho 2026');
  const [p1Contratados, setP1Contratados] = useState(existingConfig.previousMonth1.aprendizesContratados || 649);
  const [p1EmProcesso, setP1EmProcesso] = useState(existingConfig.previousMonth1.contratosEmProcesso || 0);
  const [p1Estagiarios, setP1Estagiarios] = useState(existingConfig.previousMonth1.estagiarios || 58);

  // Current Month
  const [curMonthName, setCurMonthName] = useState(existingConfig.currentMonth.monthName || `${report.monthName} ${report.year}`);
  const [curContratados, setCurContratados] = useState(existingConfig.currentMonth.aprendizesContratados || 629);
  const [curEmProcesso, setCurEmProcesso] = useState(existingConfig.currentMonth.contratosEmProcesso || 0);
  const [curEstagiarios, setCurEstagiarios] = useState(existingConfig.currentMonth.estagiarios || 51);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedConfig: HiringDashboardConfig = {
      displayMode,
      previousMonth2: {
        monthName: p2MonthName.trim() || 'Maio 2026',
        aprendizesContratados: Number(p2Contratados) || 0,
        contratosEmProcesso: Number(p2EmProcesso) || 0,
        estagiarios: Number(p2Estagiarios) || 0,
      },
      previousMonth1: {
        monthName: p1MonthName.trim() || 'Junho 2026',
        aprendizesContratados: Number(p1Contratados) || 0,
        contratosEmProcesso: Number(p1EmProcesso) || 0,
        estagiarios: Number(p1Estagiarios) || 0,
      },
      currentMonth: {
        monthName: curMonthName.trim() || `${report.monthName} ${report.year}`,
        aprendizesContratados: Number(curContratados) || 0,
        contratosEmProcesso: Number(curEmProcesso) || 0,
        estagiarios: Number(curEstagiarios) || 0,
      },
    };

    await sqlDb.updateHiringDashboard(report.id, updatedConfig, currentUser);

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onSaved();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0B0F19] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Cadastro de Dados do Dashboard de Contratações
              </h3>
              <p className="text-xs text-gray-400">
                Aprendizes Contratados, Contratos em Processo e Estagiários ({report.fullTitle})
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

        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[82vh] overflow-y-auto">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Dados do Dashboard salvos e refletidos no relatório com sucesso!
            </div>
          )}

          {/* Option: Display Mode */}
          <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Opção de Exibição no Relatório
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  displayMode === '2_previous_and_current'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="displayMode"
                  value="2_previous_and_current"
                  checked={displayMode === '2_previous_and_current'}
                  onChange={() => setDisplayMode('2_previous_and_current')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-xs text-gray-900 block">
                    2 Meses Anteriores e o Mês Atual
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Compara 3 períodos completos no cabeçalho do relatório (ex: Maio, Junho e Julho).
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  displayMode === '1_previous_and_current'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="displayMode"
                  value="1_previous_and_current"
                  checked={displayMode === '1_previous_and_current'}
                  onChange={() => setDisplayMode('1_previous_and_current')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-xs text-gray-900 block">
                    1 Mês Anterior e o Mês Atual
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Exibe 2 períodos com foco no comparativo imediato mês a mês.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Month 2 Prior (Only if 2_previous_and_current) */}
          {displayMode === '2_previous_and_current' && (
            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Mês Anterior 2 (2 meses antes do relatório)
                </span>
                <input
                  type="text"
                  value={p2MonthName}
                  onChange={(e) => setP2MonthName(e.target.value)}
                  placeholder="ex: Maio 2026"
                  className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-300 w-36 text-center focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Aprendizes Contratados
                  </label>
                  <input
                    type="number"
                    value={p2Contratados}
                    onChange={(e) => setP2Contratados(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Contratos em Processo
                  </label>
                  <input
                    type="number"
                    value={p2EmProcesso}
                    onChange={(e) => setP2EmProcesso(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Estagiários
                  </label>
                  <input
                    type="number"
                    value={p2Estagiarios}
                    onChange={(e) => setP2Estagiarios(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Month 1 Prior */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Mês Anterior 1 (1 mês antes do relatório)
              </span>
              <input
                type="text"
                value={p1MonthName}
                onChange={(e) => setP1MonthName(e.target.value)}
                placeholder="ex: Junho 2026"
                className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-300 w-36 text-center focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Aprendizes Contratados
                </label>
                <input
                  type="number"
                  value={p1Contratados}
                  onChange={(e) => setP1Contratados(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Contratos em Processo
                </label>
                <input
                  type="number"
                  value={p1EmProcesso}
                  onChange={(e) => setP1EmProcesso(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Estagiários
                </label>
                <input
                  type="number"
                  value={p1Estagiarios}
                  onChange={(e) => setP1Estagiarios(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Current Month */}
          <div className="border-2 border-[#0B0F19] rounded-xl p-4 bg-gray-50/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B0F19]" />
                Mês Atual do Relatório (Destaque Principal)
              </span>
              <input
                type="text"
                value={curMonthName}
                onChange={(e) => setCurMonthName(e.target.value)}
                placeholder="ex: Julho 2026"
                className="text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded border border-gray-300 w-36 text-center focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Aprendizes Contratados
                </label>
                <input
                  type="number"
                  value={curContratados}
                  onChange={(e) => setCurContratados(Number(e.target.value))}
                  className="w-full bg-white border border-gray-400 rounded-lg p-2 text-sm font-black text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Contratos em Processo
                </label>
                <input
                  type="number"
                  value={curEmProcesso}
                  onChange={(e) => setCurEmProcesso(Number(e.target.value))}
                  className="w-full bg-white border border-gray-400 rounded-lg p-2 text-sm font-black text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Estagiários
                </label>
                <input
                  type="number"
                  value={curEstagiarios}
                  onChange={(e) => setCurEstagiarios(Number(e.target.value))}
                  className="w-full bg-white border border-gray-400 rounded-lg p-2 text-sm font-black text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#0B0F19] hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-blue-400" /> Salvar Indicadores do Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
