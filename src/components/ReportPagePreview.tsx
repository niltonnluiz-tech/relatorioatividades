/**
 * ReportPagePreview: Pixel-perfect browser representation of the 15-page official report.
 * Accurately mimics the exact typography, dark banners, dot matrix, bar charts, tables,
 * and institutional footer badges of the attached PDF.
 */
import React, { useState, useEffect } from 'react';
import { MonthlyReport, User, InstitutionSettings } from '../types';
import { sqlDb } from '../services/sqlDb';
import { LogoTarget } from './BrandingSettingsModal';
import { processUploadedImageFile } from '../services/imageUtils';
import { 
  BarChart3, 
  Settings2, 
  Users, 
  FileCheck, 
  Award, 
  TrendingUp,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Building
} from 'lucide-react';

interface Props {
  report: MonthlyReport;
  pageNumber: number; // 1 to 15
  currentUser?: User;
  onNavigatePage?: (page: number) => void;
  onOpenHiringModal?: () => void;
  onOpenBrandingModal?: (targetLogo?: LogoTarget) => void;
}

export const ReportPagePreview: React.FC<Props> = ({ 
  report, 
  pageNumber, 
  currentUser,
  onNavigatePage,
  onOpenHiringModal,
  onOpenBrandingModal
}) => {
  const [institutionSettings, setInstitutionSettings] = useState<InstitutionSettings>(() => sqlDb.getInstitutionSettings());
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  // Re-sync institutionSettings whenever modal or storage updates
  useEffect(() => {
    setInstitutionSettings(sqlDb.getInstitutionSettings());
  }, [report, pageNumber]);

  const handleDirectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: LogoTarget) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      const base64 = await processUploadedImageFile(file);
      const updates: Partial<InstitutionSettings> = {};
      let label = '';
      if (target === 'camp') {
        updates.logoUrl = base64;
        label = 'Logotipo CAMP Santo André';
      } else if (target === 'rotary') {
        updates.rotaryLogoUrl = base64;
        label = 'Logotipo Rotary Club';
      } else if (target === 'abtrf') {
        updates.abtrfLogoUrl = base64;
        label = 'Selo ABTRF Empresa Cidadã';
      } else if (target === 'ong') {
        updates.ongVerificadaLogoUrl = base64;
        label = 'Selo ONG Verificada';
      } else if (target === 'transparencia') {
        updates.transparenciaLogoUrl = base64;
        label = 'Selo Transparência';
      } else if (target === 'coverBanner') {
        updates.coverBannerLogoUrl = base64;
        label = 'Banner de Capa';
      }

      const activeUser = currentUser || sqlDb.getUsers()[0];
      const updated = await sqlDb.updateInstitutionSettings(updates, activeUser);
      setInstitutionSettings(updated);
      setUploadToast(`${label} atualizado sem distorção!`);
      setTimeout(() => setUploadToast(null), 3500);
    } catch (err: any) {
      alert(`Erro ao processar imagem: ${err.message}`);
    }
  };

  // Page header present on pages 2-15
  const renderHeader = (title?: string) => (
    <div className="relative mb-6">
      <div className="flex items-center justify-between">
        {/* Black month tag + institution logo */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0B0F19] text-white px-3 py-1 rounded text-xs font-bold tracking-wider">
            {report.monthName.toUpperCase()} DE {report.year}
          </div>
          {institutionSettings.logoUrl && (
            <img
              src={institutionSettings.logoUrl}
              alt="Logo CAMP"
              className="h-6 max-w-[90px] object-contain"
            />
          )}
        </div>

        {/* Dot matrix pattern */}
        <div className="grid grid-cols-6 gap-1.5 opacity-90">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0B0F19]" />
          ))}
        </div>
      </div>

      {title && (
        <div className="mt-5 border-b-2 border-[#0B0F19] pb-2 inline-block">
          <h2 className="text-3xl font-black text-[#0B0F19] tracking-tight">{title}</h2>
        </div>
      )}
    </div>
  );

  // Coordinator Contact Card
  const renderCoordinator = (
    name: string,
    title: string,
    phone: string,
    email: string,
    avatarUrl?: string
  ) => (
    <div className="flex items-center gap-5 my-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-200 flex-shrink-0 shadow-sm flex items-center justify-center text-gray-600 font-bold text-xl">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          name.split(' ').map((n) => n[0]).slice(0, 2).join('')
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold text-[#0B0F19] leading-snug">{name}</h3>
        <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
        <div className="space-y-0.5 text-xs">
          <p className="flex items-center gap-2 font-medium text-gray-800">
            <span className="font-bold">Tel:</span> {phone}
          </p>
          <p className="flex items-center gap-2 font-medium text-blue-700 break-all">
            <span className="font-bold text-gray-800">Email:</span> {email}
          </p>
        </div>
      </div>
    </div>
  );

  // Helper to render bullet activities with formatted date badge if present
  const renderBulletActivity = (act: string, idx: number) => {
    const match = act.match(/^\[(\d{2}\/\d{2}(?:\/\d{4})?)\]\s*(.*)/);
    if (match) {
      const dateStr = match[1];
      const content = match[2];
      return (
        <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-gray-800">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F19] mt-2 flex-shrink-0" />
          <span className="leading-relaxed font-medium">
            <span className="inline-flex items-center text-[10px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-1.5">
              📅 {dateStr}
            </span>
            {content}
          </span>
        </div>
      );
    }
    return (
      <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-gray-800">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F19] mt-2 flex-shrink-0" />
        <span className="leading-relaxed font-medium">{act}</span>
      </div>
    );
  };

  // Render Page Content based on pageNumber
  const renderContent = () => {
    switch (pageNumber) {
      // ----------------------------------------------------
      // PAGE 1: CAPA
      // ----------------------------------------------------
      case 1:
        return (
          <div className="flex flex-col h-full justify-between">
            {/* Upload Notification Toast */}
            {uploadToast && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {uploadToast}
                </span>
                <span className="text-[10px] text-emerald-700">Persistido no Banco de Dados</span>
              </div>
            )}

            {/* Top dark block */}
            <div className="bg-[#0B0F19] text-white p-8 rounded-t-xl -m-6 mb-8 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-bold">{report.monthName}</div>
                <div className="text-xl font-bold opacity-90">{report.year}</div>
                <div className="w-16 h-1 bg-white my-4" />
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-wider mt-2">
                  RELATÓRIO
                  <br />
                  GERENCIAL
                </h1>
              </div>

              {/* Cover Logo Display with direct upload */}
              <div className="relative group self-center sm:self-auto p-2 bg-white/10 rounded-2xl border border-white/20">
                {institutionSettings.logoUrl ? (
                  <img
                    src={institutionSettings.logoUrl}
                    alt="Logo CAMP"
                    className="w-24 h-24 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-white/10 flex flex-col items-center justify-center font-black text-xl text-white">
                    <span>CAMP</span>
                    <span className="text-[10px] font-normal opacity-70">Oficial</span>
                  </div>
                )}
                <label
                  title="Fazer upload de nova imagem para o logotipo da capa"
                  className="absolute inset-0 bg-black/75 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer p-2 text-center"
                >
                  <Camera className="w-5 h-5 mb-1 text-blue-400" />
                  <span className="text-[10px] font-bold leading-tight">Trocar Logo (Upload)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDirectLogoUpload(e, 'camp')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Institution Name & Info */}
            <div className="px-2 my-auto">
              <h2 className="text-2xl md:text-3xl font-black text-[#0B0F19] mb-4">
                {report.institution}
              </h2>
              <div className="w-full h-0.5 bg-gray-200 mb-8" />

              <div className="space-y-4 text-sm md:text-base font-semibold text-gray-800">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-lg">🌐</span>
                  <span>{report.website}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-lg">📞</span>
                  <span>{report.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-lg">📍</span>
                  <span>{report.address}</span>
                </div>
              </div>
            </div>

            {/* Institutional stamps / badges with full upload capability */}
            <div className="pt-8 border-t border-gray-200 mt-8">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Selos & Logotipos Oficiais (Passe o mouse ou clique para fazer upload de cada imagem):
                </span>
                {onOpenBrandingModal && (
                  <button
                    type="button"
                    onClick={() => onOpenBrandingModal()}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Gerenciar Todos os Logotipos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center justify-items-center text-center">
                {/* 1. CAMP Logo */}
                <div className="group relative p-2 border border-gray-200 hover:border-blue-400 rounded-lg w-full flex flex-col items-center justify-center bg-white min-h-[78px] transition-all">
                  {institutionSettings.logoUrl ? (
                    <img src={institutionSettings.logoUrl} alt="CAMP" className="max-h-8 max-w-[85px] object-contain mb-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center text-xs font-black mb-1">
                      CAMP
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-cyan-900 leading-tight">CAMP SANTO ANDRÉ</span>

                  <label
                    title="Fazer upload de nova imagem do Logo CAMP"
                    className="absolute inset-0 bg-blue-900/85 text-white rounded-lg opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer p-1"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDirectLogoUpload(e, 'camp')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 2. Rotary Logo */}
                <div className="group relative p-2 border border-gray-200 hover:border-blue-400 rounded-lg w-full flex flex-col items-center justify-center bg-white min-h-[78px] transition-all">
                  {institutionSettings.rotaryLogoUrl ? (
                    <img src={institutionSettings.rotaryLogoUrl} alt="Rotary" className="max-h-8 max-w-[85px] object-contain mb-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold mb-1">
                      ⚙️
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-blue-900 leading-tight">Rotary Club Santo André</span>

                  <label
                    title="Fazer upload de nova imagem do Rotary"
                    className="absolute inset-0 bg-blue-900/85 text-white rounded-lg opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer p-1"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDirectLogoUpload(e, 'rotary')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. ABTRF Empresa Cidadã */}
                <div className="group relative p-2 rounded-lg w-full flex flex-col items-center justify-center bg-blue-950 text-white min-h-[78px] overflow-hidden transition-all border border-blue-900 hover:border-blue-400">
                  {institutionSettings.abtrfLogoUrl ? (
                    <img src={institutionSettings.abtrfLogoUrl} alt="ABTRF" className="max-h-12 max-w-[95px] object-contain" />
                  ) : (
                    <div className="text-[8px] font-bold leading-tight text-center">
                      <span>SELO DE RESPONSABILIDADE</span>
                      <span className="text-yellow-400 font-extrabold text-[9px] block">EMPRESA CIDADÃ</span>
                      <span>ABTRF 2025-26</span>
                    </div>
                  )}

                  <label
                    title="Fazer upload de nova imagem do Selo ABTRF"
                    className="absolute inset-0 bg-blue-900/85 text-white rounded-lg opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer p-1"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">Upload Selo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDirectLogoUpload(e, 'abtrf')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 4. ONG Verificada */}
                <div className="group relative p-2 border-2 border-emerald-500 bg-emerald-50 rounded-lg w-full flex flex-col items-center justify-center text-emerald-800 font-bold text-[9px] leading-tight min-h-[78px] overflow-hidden transition-all hover:border-emerald-600">
                  {institutionSettings.ongVerificadaLogoUrl ? (
                    <img src={institutionSettings.ongVerificadaLogoUrl} alt="ONG Verificada" className="max-h-12 max-w-[95px] object-contain" />
                  ) : (
                    <>
                      <span>✓ CERTIFICADORA</span>
                      <span className="font-black text-[10px]">ONG VERIFICADA</span>
                    </>
                  )}

                  <label
                    title="Fazer upload de nova imagem do Selo ONG Verificada"
                    className="absolute inset-0 bg-emerald-900/85 text-white rounded-lg opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer p-1"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">Upload Selo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDirectLogoUpload(e, 'ong')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 5. Transparência */}
                <div className="group relative p-2 border-2 border-teal-500 bg-teal-50 rounded-lg w-full flex flex-col items-center justify-center text-teal-900 font-bold text-[9px] leading-tight col-span-2 sm:col-span-1 min-h-[78px] overflow-hidden transition-all hover:border-teal-600">
                  {institutionSettings.transparenciaLogoUrl ? (
                    <img src={institutionSettings.transparenciaLogoUrl} alt="Transparência" className="max-h-12 max-w-[95px] object-contain" />
                  ) : (
                    <>
                      <span>SELO OFICIAL</span>
                      <span className="font-black text-[10px]">TRANSPARÊNCIA</span>
                    </>
                  )}

                  <label
                    title="Fazer upload de nova imagem do Selo Transparência"
                    className="absolute inset-0 bg-teal-900/85 text-white rounded-lg opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer p-1"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-bold">Upload Selo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDirectLogoUpload(e, 'transparencia')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 2: CONTRATADOS & GRÁFICOS
      // ----------------------------------------------------
      case 2:
        const hiringConfig = report.hiringDashboard || {
          displayMode: '2_previous_and_current' as const,
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
            monthName: report.fullTitle || 'Julho de 2026',
            aprendizesContratados: report.hiringHistory?.julho?.aprendizes || 629,
            contratosEmProcesso: 45,
            estagiarios: report.hiringHistory?.julho?.estagiarios || 51,
          },
        };

        const isTwoPrev = hiringConfig.displayMode === '2_previous_and_current';
        const displayedMonths = isTwoPrev
          ? [
              { data: hiringConfig.previousMonth2, label: 'Mês Anterior 2', isCur: false },
              { data: hiringConfig.previousMonth1, label: 'Mês Anterior 1', isCur: false },
              { data: hiringConfig.currentMonth, label: 'Mês Atual', isCur: true },
            ]
          : [
              { data: hiringConfig.previousMonth1, label: 'Mês Anterior', isCur: false },
              { data: hiringConfig.currentMonth, label: 'Mês Atual', isCur: true },
            ];

        // Max scale calculation
        const maxVal = Math.max(
          700,
          hiringConfig.currentMonth?.aprendizesContratados || 0,
          hiringConfig.previousMonth1?.aprendizesContratados || 0,
          hiringConfig.previousMonth2?.aprendizesContratados || 0
        );

        return (
          <div>
            {renderHeader()}
            
            {/* Header + Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                  Contratados e em processo de contratação
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  {isTwoPrev
                    ? 'Exibindo comparativo de 2 meses anteriores e o mês atual'
                    : 'Exibindo comparativo de 1 mês anterior e o mês atual'}
                </p>
              </div>

              {onOpenHiringModal && (
                <button
                  onClick={onOpenHiringModal}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Cadastrar / Ajustar Dados
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-xs font-bold text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#0B0F19]" />
                <span>Aprendizes Contratados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-blue-600" />
                <span>Contratos em Processo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-slate-600" />
                <span>Estagiários</span>
              </div>
            </div>

            {/* Comparative Cards Grid */}
            <div className={`grid grid-cols-1 ${isTwoPrev ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8`}>
              {displayedMonths.map((m, idx) => {
                const aprHeight = Math.max(12, Math.round(((m.data.aprendizesContratados || 0) / maxVal) * 160));
                const procHeight = Math.max(12, Math.round(((m.data.contratosEmProcesso || 0) / maxVal) * 160));
                const estHeight = Math.max(12, Math.round(((m.data.estagiarios || 0) / maxVal) * 160));

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                      m.isCur
                        ? 'border-2 border-[#0B0F19] bg-white shadow-md ring-4 ring-blue-50'
                        : 'border-gray-200 bg-gray-50/70 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            {m.label}
                          </span>
                          <h4 className={`font-black text-lg ${m.isCur ? 'text-[#0B0F19]' : 'text-gray-800'}`}>
                            {m.data.monthName}
                          </h4>
                        </div>
                        {m.isCur && (
                          <span className="bg-[#0B0F19] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Ativo
                          </span>
                        )}
                      </div>

                      {/* Chart Bars */}
                      <div className="h-48 flex items-end justify-around border-b border-gray-300 pb-2 relative px-2">
                        {/* Bar 1: Aprendizes */}
                        <div className="flex flex-col items-center flex-1 max-w-[50px]">
                          <span className="text-[11px] font-black text-gray-900 mb-1">
                            {m.data.aprendizesContratados}
                          </span>
                          <div
                            style={{ height: `${aprHeight}px` }}
                            className="bg-[#0B0F19] text-white w-full rounded-t-md flex items-center justify-center font-black text-xs shadow-xs"
                          />
                          <span className="text-[10px] text-gray-600 font-bold mt-2 text-center leading-tight">
                            Aprendizes
                          </span>
                        </div>

                        {/* Bar 2: Em Processo */}
                        <div className="flex flex-col items-center flex-1 max-w-[50px]">
                          <span className="text-[11px] font-black text-blue-700 mb-1">
                            {m.data.contratosEmProcesso}
                          </span>
                          <div
                            style={{ height: `${procHeight}px` }}
                            className="bg-blue-600 text-white w-full rounded-t-md flex items-center justify-center font-bold text-xs shadow-xs"
                          />
                          <span className="text-[10px] text-blue-800 font-bold mt-2 text-center leading-tight">
                            Em Processo
                          </span>
                        </div>

                        {/* Bar 3: Estagiários */}
                        <div className="flex flex-col items-center flex-1 max-w-[50px]">
                          <span className="text-[11px] font-black text-slate-700 mb-1">
                            {m.data.estagiarios}
                          </span>
                          <div
                            style={{ height: `${estHeight}px` }}
                            className="bg-slate-600 text-white w-full rounded-t-md flex items-center justify-center font-bold text-xs shadow-xs"
                          />
                          <span className="text-[10px] text-slate-700 font-bold mt-2 text-center leading-tight">
                            Estagiários
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consolidated Comparison Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="bg-[#0B0F19] text-white px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Demonstrativo Consolidado de Contratações
                </span>
                <span className="text-[11px] text-gray-300">
                  Valores oficiais apurados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <th className="p-3">Categoria de Contrato</th>
                      {displayedMonths.map((m, idx) => (
                        <th key={idx} className={`p-3 text-center ${m.isCur ? 'bg-blue-50 text-blue-950 font-black' : ''}`}>
                          {m.data.monthName} {m.isCur ? '(Atual)' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    <tr className="hover:bg-gray-50/80">
                      <td className="p-3 font-bold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded bg-[#0B0F19]" />
                        Aprendizes Contratados
                      </td>
                      {displayedMonths.map((m, idx) => (
                        <td key={idx} className={`p-3 text-center font-bold text-sm ${m.isCur ? 'bg-blue-50/50 text-[#0B0F19]' : ''}`}>
                          {m.data.aprendizesContratados}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50/80">
                      <td className="p-3 font-bold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded bg-blue-600" />
                        Contratos em Processo
                      </td>
                      {displayedMonths.map((m, idx) => (
                        <td key={idx} className={`p-3 text-center font-bold text-sm ${m.isCur ? 'bg-blue-50/50 text-blue-700' : ''}`}>
                          {m.data.contratosEmProcesso}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50/80">
                      <td className="p-3 font-bold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded bg-slate-600" />
                        Estagiários
                      </td>
                      {displayedMonths.map((m, idx) => (
                        <td key={idx} className={`p-3 text-center font-bold text-sm ${m.isCur ? 'bg-blue-50/50 text-slate-700' : ''}`}>
                          {m.data.estagiarios}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50 font-black text-gray-900 border-t-2 border-gray-300">
                      <td className="p-3">TOTAL GERAL DE JOVENS ATENDIDOS</td>
                      {displayedMonths.map((m, idx) => {
                        const tot = (m.data.aprendizesContratados || 0) + (m.data.contratosEmProcesso || 0) + (m.data.estagiarios || 0);
                        return (
                          <td key={idx} className={`p-3 text-center font-black text-sm ${m.isCur ? 'bg-blue-100 text-blue-900' : ''}`}>
                            {tot}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 3: GESTÃO DE PESSOAS | RH
      // ----------------------------------------------------
      case 3:
        const rh = report.departments.rh;
        return (
          <div>
            {renderHeader('Gestão de Pessoas | RH')}
            {renderCoordinator(
              rh.coordinatorName,
              rh.coordinatorTitle,
              rh.coordinatorPhone,
              rh.coordinatorEmail,
              rh.coordinatorAvatar
            )}

            {/* Table 1: Indicador / Quantidade */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2.5 text-left font-bold">Indicador</th>
                    <th className="p-2.5 text-center font-bold w-28">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rh.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium text-gray-900">{m.label}</td>
                      <td className="p-2 text-center font-bold text-gray-800">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table 2: Despesas */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-[#0B0F19] text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
                <span>Despesas (Colaboradores e Aprendizes)</span>
                <span className="bg-emerald-600/40 text-emerald-200 text-[10px] px-2 py-0.5 rounded">
                  🔒 Criptografado E2EE
                </span>
              </div>
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 border-b border-gray-300">
                    <th className="p-2.5 text-left font-bold">Despesas</th>
                    <th className="p-2.5 text-right font-bold w-44">Valor R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(rh.subMetrics?.[0]?.items || []).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium text-gray-900">{m.label}</td>
                      <td className="p-2 text-right font-mono font-bold text-gray-900">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 4: FINANCEIRO
      // ----------------------------------------------------
      case 4:
        const fin = report.departments.financeiro;
        return (
          <div>
            {renderHeader('Financeiro')}
            {renderCoordinator(
              fin.coordinatorName,
              fin.coordinatorTitle,
              fin.coordinatorPhone,
              fin.coordinatorEmail,
              fin.coordinatorAvatar
            )}

            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <div className="bg-[#0B0F19] text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
                <span>Registros Financeiros Oficiais</span>
                <span className="bg-emerald-600/40 text-emerald-200 text-[10px] px-2 py-0.5 rounded">
                  🔒 Criptografia AES-256-GCM
                </span>
              </div>
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 border-b border-gray-300">
                    <th className="p-3 text-left font-bold">Categoria</th>
                    <th className="p-3 text-right font-bold w-52">Valor R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fin.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{m.label}</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-bold text-gray-900">
                {fin.customNotes || 'Inadimplentes: sem ocorrências.'}
              </p>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 5: CAPTAÇÃO DE RECURSOS
      // ----------------------------------------------------
      case 5:
        const cap = report.departments.captacao;
        return (
          <div>
            {renderHeader('Captação de Recursos')}
            {renderCoordinator(
              cap.coordinatorName,
              cap.coordinatorTitle,
              cap.coordinatorPhone,
              cap.coordinatorEmail,
              cap.coordinatorAvatar
            )}

            {/* Table 1: Captação de Recursos */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2.5 text-center font-bold" colSpan={2}>
                      Captação de Recursos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cap.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium text-gray-900">{m.label}</td>
                      <td className="p-2 text-center font-bold text-gray-900 w-28">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table 2: Recrutamento e Seleção */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2.5 text-center font-bold" colSpan={2}>
                      Recrutamento e Seleção
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(cap.subMetrics?.[0]?.items || []).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium text-gray-900">{m.label}</td>
                      <td className="p-2 text-center font-bold text-gray-900 w-28">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 6: ENSINO
      // ----------------------------------------------------
      case 6:
        const ens = report.departments.ensino;
        return (
          <div>
            {renderHeader('Ensino')}
            {renderCoordinator(
              ens.coordinatorName,
              ens.coordinatorTitle,
              ens.coordinatorPhone,
              ens.coordinatorEmail,
              ens.coordinatorAvatar
            )}

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2.5 text-center font-bold text-sm" colSpan={2}>
                      Coordenação Técnica
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ens.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-1.5 px-3 font-medium text-gray-900">{m.label}</td>
                      <td className="p-1.5 text-center font-bold text-gray-900 w-24">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 7: PSICOLOGIA & SUPERVISORA SOCIAL
      // ----------------------------------------------------
      case 7:
        const psi = report.departments.psicologia_social;
        return (
          <div>
            {renderHeader()}

            {/* Table 1: Psicologia */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2 text-center font-bold text-sm" colSpan={2}>
                      Psicologia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {psi.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-1.5 px-3 font-medium text-gray-900">{m.label}</td>
                      <td className="p-1.5 text-center font-bold text-gray-900 w-24">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table 2: Supervisora Social */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2 text-center font-bold text-sm" colSpan={2}>
                      Supervisora Social
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(psi.subMetrics?.[0]?.items || []).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-1.5 px-3 font-medium text-gray-900">{m.label}</td>
                      <td className="p-1.5 text-center font-bold text-gray-900 w-24">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 8: LIMPEZA
      // ----------------------------------------------------
      case 8:
        const limp = report.departments.limpeza;
        return (
          <div>
            {renderHeader('Limpeza')}
            <div className="mt-8 space-y-3 pl-2">
              {(limp.bulletActivities || []).map((act, idx) => renderBulletActivity(act, idx))}
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 9: GERÊNCIA DE PROJETOS
      // ----------------------------------------------------
      case 9:
        const proj = report.departments.projetos;
        return (
          <div>
            {renderHeader('Gerência de Projetos')}
            {renderCoordinator(
              proj.coordinatorName,
              proj.coordinatorTitle,
              proj.coordinatorPhone,
              proj.coordinatorEmail,
              proj.coordinatorAvatar
            )}

            <div className="mt-6 space-y-6">
              {/* Section 1 */}
              <div>
                <h3 className="text-lg font-bold text-[#0B0F19] mb-3">
                  {proj.subBulletSections?.[0]?.title || 'Legislação / Certificações'}
                </h3>
                <div className="space-y-2 pl-2">
                  {(proj.subBulletSections?.[0]?.items || []).map((item, idx) => renderBulletActivity(item, idx))}
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h3 className="text-lg font-bold text-[#0B0F19] mb-3">
                  {proj.subBulletSections?.[1]?.title || 'Estágio'}
                </h3>
                <div className="space-y-2 pl-2">
                  {(proj.subBulletSections?.[1]?.items || []).map((item, idx) => renderBulletActivity(item, idx))}
                </div>
              </div>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 10: ESTÁGIO & TECNOLOGIA DA INFORMAÇÃO
      // ----------------------------------------------------
      case 10:
        const ti = report.departments.ti;
        return (
          <div>
            {renderHeader()}

            {/* Table: Estágio */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2 text-center font-bold text-sm" colSpan={2}>
                      Estágio
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ti.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-1.5 px-3 font-medium text-gray-900">
                        {m.label}
                        {m.date && (
                          <span className="text-[10px] text-gray-500 font-mono ml-2 font-normal">
                            ({m.date.split('-').reverse().slice(0, 2).join('/')})
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-center font-bold text-gray-900 w-24">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* List: TI */}
            <div>
              <h3 className="text-2xl font-black text-[#0B0F19] mb-4">
                Tecnologia da informação
              </h3>
              <div className="space-y-2 pl-2">
                {(ti.bulletActivities || []).map((act, idx) => renderBulletActivity(act, idx))}
              </div>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 11: MARKETING
      // ----------------------------------------------------
      case 11:
        const mkt = report.departments.marketing;
        return (
          <div>
            {renderHeader()}

            {/* Table: Marketing */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-8">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#0B0F19] text-white">
                    <th className="p-2.5 text-center font-bold text-sm" colSpan={2}>
                      Marketing
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mkt.metrics.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-2 px-3 font-medium text-gray-900">
                        {m.label}
                        {m.date && (
                          <span className="text-[10px] text-gray-500 font-mono ml-2 font-normal">
                            ({m.date.split('-').reverse().slice(0, 2).join('/')})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center font-bold text-gray-900 w-28">{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* List: Campanhas e artes */}
            <div>
              <h3 className="text-xl font-bold text-[#0B0F19] mb-4">
                Campanhas e artes realizadas
              </h3>
              <div className="space-y-3 pl-2">
                {(mkt.bulletActivities || []).map((act, idx) => renderBulletActivity(act, idx))}
              </div>
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 12: MANUTENÇÃO
      // ----------------------------------------------------
      case 12:
        const manut = report.departments.manutencao;
        return (
          <div>
            {renderHeader('Manutenção')}
            <div className="mt-8 space-y-3.5 pl-2">
              {(manut.bulletActivities || []).map((act, idx) => renderBulletActivity(act, idx))}
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 13: GERÊNCIA GERAL
      // ----------------------------------------------------
      case 13:
        const gg = report.departments.gerencia_geral;
        return (
          <div>
            {renderHeader('Gerência Geral')}
            {renderCoordinator(
              gg.coordinatorName,
              gg.coordinatorTitle,
              gg.coordinatorPhone,
              gg.coordinatorEmail,
              gg.coordinatorAvatar
            )}

            <div className="mt-8 space-y-4 pl-2">
              {(gg.bulletActivities || []).map((act, idx) => renderBulletActivity(act, idx))}
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 14: COZINHA
      // ----------------------------------------------------
      case 14:
        const coz = report.departments.cozinha;
        return (
          <div>
            {renderHeader('Cozinha')}
            <div className="mt-8 space-y-3.5 pl-2">
              {(coz.bulletActivities || []).map((act, idx) => renderBulletActivity(act, idx))}
            </div>
          </div>
        );

      // ----------------------------------------------------
      // PAGE 15: PRESIDENTE
      // ----------------------------------------------------
      case 15:
        const pres = report.departments.presidencia;
        return (
          <div>
            {renderHeader('Presidente')}
            {renderCoordinator(
              pres.coordinatorName,
              pres.coordinatorTitle,
              pres.coordinatorPhone,
              pres.coordinatorEmail,
              pres.coordinatorAvatar
            )}

            <div className="mt-6 space-y-6">
              {/* Implantações realizadas */}
              <div>
                <h3 className="text-lg font-bold text-[#0B0F19] mb-3">
                  {pres.subBulletSections?.[0]?.title || 'Implantações realizadas'}
                </h3>
                <div className="space-y-2.5 pl-2">
                  {(pres.subBulletSections?.[0]?.items || []).map((item, idx) => renderBulletActivity(item, idx))}
                </div>
              </div>

              {/* Próximas implantações */}
              <div>
                <h3 className="text-lg font-bold text-[#0B0F19] mb-3">
                  {pres.subBulletSections?.[1]?.title || 'Próximas implantações'}
                </h3>
                <div className="space-y-2.5 pl-2">
                  {(pres.subBulletSections?.[1]?.items || []).map((item, idx) => renderBulletActivity(item, idx))}
                </div>
              </div>

              {/* Slogan */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center mt-6">
                <p className="font-bold text-sm text-gray-900">
                  {pres.customNotes || 'Estamos captando novas doações e parcerias. Seja um doador você também.'}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Página não encontrada</div>;
    }
  };

  return (
    <div
      id={`report-page-${pageNumber}`}
      className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-10 max-w-4xl mx-auto min-h-[820px] flex flex-col justify-between select-text"
    >
      <div>{renderContent()}</div>

      {/* Page Footer Navigation / Counter */}
      <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold text-gray-700">CAMP Piero Pollone - Santo André</span>
        <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
          Página {pageNumber} de 15
        </span>
      </div>
    </div>
  );
};
