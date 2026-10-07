/**
 * PdfViewerModal: Interactive full-screen preview of all 15 pages of the official report
 * with page flipping, zoom, print, and direct PDF download.
 */
import React, { useState } from 'react';
import { MonthlyReport, User } from '../types';
import { ReportPagePreview } from './ReportPagePreview';
import { generateOfficialReportPdf } from '../services/pdfGenerator';
import { BrandingSettingsModal, LogoTarget } from './BrandingSettingsModal';
import { sqlDb } from '../services/sqlDb';
import { Download, Printer, ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: MonthlyReport;
  currentUser?: User;
  onRefreshData?: () => void;
}

export const PdfViewerModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  report, 
  currentUser,
  onRefreshData 
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [targetLogoFocus, setTargetLogoFocus] = useState<LogoTarget | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const activeUser = currentUser || sqlDb.getUsers()[0];

  const handleDownload = async () => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);
      const doc = await generateOfficialReportPdf(report);
      doc.save(`Relatorio_Gerencial_CAMP_${report.id}_Oficial.pdf`);
    } catch (err) {
      console.error('Falha ao gerar o PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const pageNames: Record<number, string> = {
    1: 'Capa Oficial',
    2: 'Contratados & Aprendizes',
    3: 'Gestão de Pessoas (RH)',
    4: 'Financeiro',
    5: 'Captação de Recursos',
    6: 'Ensino (Pedagógico)',
    7: 'Psicologia & Social',
    8: 'Limpeza e Zeladoria',
    9: 'Gerência de Projetos',
    10: 'Estágio & TI',
    11: 'Marketing & Mídias',
    12: 'Manutenção Predial',
    13: 'Gerência Geral',
    14: 'Cozinha & Nutrição',
    15: 'Presidência',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/90 backdrop-blur-xs">
      {/* Top action bar */}
      <div className="bg-[#0B0F19] text-white px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-black text-sm md:text-base tracking-tight text-white">
            Visualizador Oficial do Relatório
          </span>
          <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-0.5 rounded font-mono">
            {report.fullTitle}
          </span>
        </div>

        {/* Page selector & view mode */}
        <div className="flex items-center gap-2">
          {viewMode === 'single' && (
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                aria-label="Selecionar página do relatório"
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="bg-transparent text-white font-semibold text-xs border-none focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p} className="bg-gray-900 text-white">
                    Pág {p}: {pageNames[p]}
                  </option>
                ))}
              </select>

              <span className="text-gray-400 text-xs">/ 15</span>

              <button
                disabled={currentPage >= 15}
                onClick={() => setCurrentPage((p) => Math.min(15, p + 1))}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setTargetLogoFocus(undefined);
              setIsBrandingModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Upload e alteração dos 5 logotipos/selos do relatório"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Logotipos do Relatório</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'all' : 'single')}
            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            {viewMode === 'single' ? 'Ver Todas as 15 Páginas' : 'Ver Página Individual'}
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            {isDownloading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Imprimir"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Page Display Canvas */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-8">
        {viewMode === 'single' ? (
          <ReportPagePreview
            report={report}
            pageNumber={currentPage}
            currentUser={activeUser}
            onNavigatePage={(p) => setCurrentPage(p)}
            onOpenBrandingModal={(target) => {
              setTargetLogoFocus(target);
              setIsBrandingModalOpen(true);
            }}
          />
        ) : (
          <div className="space-y-12 max-w-4xl w-full">
            {Array.from({ length: 15 }, (_, i) => i + 1).map((p) => (
              <ReportPagePreview 
                key={p} 
                report={report} 
                pageNumber={p} 
                currentUser={activeUser}
                onOpenBrandingModal={(target) => {
                  setTargetLogoFocus(target);
                  setIsBrandingModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Branding / Logo Upload Modal */}
      {isBrandingModalOpen && (
        <BrandingSettingsModal
          currentUser={activeUser}
          initialSelectedLogo={targetLogoFocus}
          onClose={() => setIsBrandingModalOpen(false)}
          onSaved={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
};
