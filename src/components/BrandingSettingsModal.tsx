import React, { useState } from 'react';
import { InstitutionSettings, User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { processUploadedImageFile } from '../services/imageUtils';
import { 
  X, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  RotateCcw, 
  Eye, 
  Sparkles,
  Building,
  ShieldCheck,
  AlertCircle,
  Award,
  CheckCircle2,
  Trash2,
  Layers
} from 'lucide-react';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  currentUser: User;
  initialSelectedLogo?: 'camp' | 'rotary' | 'abtrf' | 'ong' | 'transparencia' | 'coverBanner';
  onBrandingUpdated?: () => void;
  onSaved?: () => void;
}

export type LogoTarget = 'camp' | 'rotary' | 'abtrf' | 'ong' | 'transparencia' | 'coverBanner';

export const BrandingSettingsModal: React.FC<Props> = ({
  isOpen = true,
  onClose,
  currentUser,
  initialSelectedLogo,
  onBrandingUpdated,
  onSaved,
}) => {
  const currentSettings = sqlDb.getInstitutionSettings();
  const [logoUrl, setLogoUrl] = useState<string>(currentSettings.logoUrl || '');
  const [rotaryLogoUrl, setRotaryLogoUrl] = useState<string>(currentSettings.rotaryLogoUrl || '');
  const [abtrfLogoUrl, setAbtrfLogoUrl] = useState<string>(currentSettings.abtrfLogoUrl || '');
  const [ongVerificadaLogoUrl, setOngVerificadaLogoUrl] = useState<string>(currentSettings.ongVerificadaLogoUrl || '');
  const [transparenciaLogoUrl, setTransparenciaLogoUrl] = useState<string>(currentSettings.transparenciaLogoUrl || '');
  const [coverBannerLogoUrl, setCoverBannerLogoUrl] = useState<string>(currentSettings.coverBannerLogoUrl || '');

  const [institutionName, setInstitutionName] = useState<string>(
    currentSettings.name || currentSettings.institutionName || 'CAMP Piero Pollone'
  );
  const [reportSubtitle, setReportSubtitle] = useState<string>(
    currentSettings.subTitle || currentSettings.reportSubtitle || 'Santo André - Gestão & Transparência'
  );

  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'badges' | 'headers'>(
    initialSelectedLogo === 'abtrf' || initialSelectedLogo === 'ong' || initialSelectedLogo === 'transparencia'
      ? 'badges'
      : 'all'
  );

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: LogoTarget) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      const base64 = await processUploadedImageFile(file);
      if (target === 'camp') setLogoUrl(base64);
      else if (target === 'rotary') setRotaryLogoUrl(base64);
      else if (target === 'abtrf') setAbtrfLogoUrl(base64);
      else if (target === 'ong') setOngVerificadaLogoUrl(base64);
      else if (target === 'transparencia') setTransparenciaLogoUrl(base64);
      else if (target === 'coverBanner') setCoverBannerLogoUrl(base64);

      setFeedback('Imagem processada sem distorção e pronta! Clique em salvar para persistir.');
    } catch (err: any) {
      alert(`Erro ao processar imagem: ${err.message}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await sqlDb.updateInstitutionSettings(
        {
          logoUrl,
          rotaryLogoUrl,
          abtrfLogoUrl,
          ongVerificadaLogoUrl,
          transparenciaLogoUrl,
          coverBannerLogoUrl,
          name: institutionName.trim(),
          institutionName: institutionName.trim(),
          subTitle: reportSubtitle.trim(),
          subtitle: reportSubtitle.trim(),
          reportSubtitle: reportSubtitle.trim(),
        },
        currentUser
      );
      setFeedback('Todos os logotipos e configurações do relatório foram atualizados com sucesso!');
      if (onBrandingUpdated) onBrandingUpdated();
      if (onSaved) onSaved();
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1200);
    } catch (e: any) {
      setFeedback(`Erro ao salvar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setLogoUrl('');
    setRotaryLogoUrl('');
    setAbtrfLogoUrl('');
    setOngVerificadaLogoUrl('');
    setTransparenciaLogoUrl('');
    setCoverBannerLogoUrl('');
    setInstitutionName('CAMP Piero Pollone');
    setReportSubtitle('Santo André - Gestão & Transparência');
    setFeedback('Padrões restaurados. Clique em salvar para confirmar.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                Upload & Gestão de Logotipos do Relatório
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Personalize as imagens de todos os logotipos e selos oficiais do relatório de 15 páginas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-white border-b border-gray-100 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Todos os 5 Campos de Logotipo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'main'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Logotipos Principais (CAMP & Rotary)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'badges'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Selos Oficiais de Certificação (ABTRF, ONG, Transparência)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'headers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Textos de Cabeçalho & Instituição
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {feedback}
            </div>
          )}

          {/* Section 1: Main CAMP Logo */}
          {(activeTab === 'all' || activeTab === 'main') && (
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600" />
                    1. Logotipo Principal da Entidade (CAMP Santo André)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Exibido no Cabeçalho (Navbar), na Capa do Relatório (Página 1) e no 1º Selo de Rodapé
                  </p>
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center p-2 overflow-hidden shadow-2xs flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo CAMP" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#0B0F19] text-white flex flex-col items-center justify-center font-black text-sm">
                      <span>CAMP</span>
                      <span className="text-[8px] font-normal opacity-80">Padrão</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Fazer Upload da Imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'camp')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-gray-500">PNG transparente, JPG, SVG ou WebP</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Ou informe a URL direta da imagem:
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.org.br/logo-camp.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Rotary / Secondary Logo */}
          {(activeTab === 'all' || activeTab === 'main') && (
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    2. Logotipo Parceiro (Rotary Club Santo André Norte)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Exibido no 2º Selo de Rodapé da Capa (Página 1) e nas páginas de parceria
                  </p>
                </div>
                {rotaryLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setRotaryLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center p-2 overflow-hidden shadow-2xs flex-shrink-0">
                  {rotaryLogoUrl ? (
                    <img src={rotaryLogoUrl} alt="Logo Rotary" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-700 text-white flex items-center justify-center text-xl font-bold">
                      ⚙️
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Fazer Upload da Imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'rotary')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-gray-500">Fundo transparente recomendado</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Ou informe a URL direta da imagem:
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.org.br/rotary.png"
                      value={rotaryLogoUrl}
                      onChange={(e) => setRotaryLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Selo Responsabilidade Social ABTRF */}
          {(activeTab === 'all' || activeTab === 'badges') && (
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-700" />
                    3. Selo de Responsabilidade Social (ABTRF - Empresa Cidadã 2025-26)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Exibido no 3º Selo de Rodapé da Capa (Página 1) do Relatório Oficial
                  </p>
                </div>
                {abtrfLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setAbtrfLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center p-2 overflow-hidden shadow-2xs flex-shrink-0">
                  {abtrfLogoUrl ? (
                    <img src={abtrfLogoUrl} alt="Selo ABTRF" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="p-2 bg-blue-950 text-white rounded-lg w-full h-full flex flex-col items-center justify-center text-[7px] font-bold leading-tight text-center">
                      <span>RESPONSABILIDADE</span>
                      <span className="text-yellow-400 font-black text-[8px]">EMPRESA CIDADÃ</span>
                      <span>ABTRF</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Fazer Upload do Selo ABTRF
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'abtrf')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-gray-500">PNG ou JPG com alta resolução</span>
                  </div>

                  <div>
                    <input
                      type="url"
                      placeholder="Ou URL: https://exemplo.org.br/selo-abtrf.png"
                      value={abtrfLogoUrl}
                      onChange={(e) => setAbtrfLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Selo Certificadora ONG Verificada */}
          {(activeTab === 'all' || activeTab === 'badges') && (
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    4. Selo Certificadora (ONG Verificada)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Exibido no 4º Selo de Rodapé da Capa (Página 1) do Relatório Oficial
                  </p>
                </div>
                {ongVerificadaLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setOngVerificadaLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center p-2 overflow-hidden shadow-2xs flex-shrink-0">
                  {ongVerificadaLogoUrl ? (
                    <img src={ongVerificadaLogoUrl} alt="Selo ONG Verificada" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="p-2 border-2 border-emerald-500 bg-emerald-50 rounded-lg w-full h-full flex flex-col items-center justify-center text-emerald-800 font-bold text-[8px] leading-tight text-center">
                      <span>✓ CERTIFICADORA</span>
                      <span className="font-black text-[9px]">ONG VERIFICADA</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Fazer Upload do Selo ONG
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'ong')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-gray-500">PNG com fundo transparente</span>
                  </div>

                  <div>
                    <input
                      type="url"
                      placeholder="Ou URL: https://exemplo.org.br/selo-ong.png"
                      value={ongVerificadaLogoUrl}
                      onChange={(e) => setOngVerificadaLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Selo Oficial Transparência */}
          {(activeTab === 'all' || activeTab === 'badges') && (
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    5. Selo Oficial de Transparência
                  </h3>
                  <p className="text-xs text-gray-500">
                    Exibido no 5º Selo de Rodapé da Capa (Página 1) do Relatório Oficial
                  </p>
                </div>
                {transparenciaLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setTransparenciaLogoUrl('')}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center p-2 overflow-hidden shadow-2xs flex-shrink-0">
                  {transparenciaLogoUrl ? (
                    <img src={transparenciaLogoUrl} alt="Selo Transparência" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="p-2 border-2 border-teal-500 bg-teal-50 rounded-lg w-full h-full flex flex-col items-center justify-center text-teal-900 font-bold text-[8px] leading-tight text-center">
                      <span>SELO OFICIAL</span>
                      <span className="font-black text-[9px]">TRANSPARÊNCIA</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Fazer Upload do Selo Transparência
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'transparencia')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-gray-500">PNG, SVG ou JPG</span>
                  </div>

                  <div>
                    <input
                      type="url"
                      placeholder="Ou URL: https://exemplo.org.br/selo-transparencia.png"
                      value={transparenciaLogoUrl}
                      onChange={(e) => setTransparenciaLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Textos de Cabeçalho & Instituição */}
          {(activeTab === 'all' || activeTab === 'headers') && (
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/70 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                Textos Institucionais & Subtítulo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nome da Instituição nos Cabeçalhos
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Subtítulo / Descritivo
                  </label>
                  <input
                    type="text"
                    value={reportSubtitle}
                    onChange={(e) => setReportSubtitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Preview of Page 1 Report Badges */}
          <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Pré-visualização dos 5 Selos Oficiais na Capa do Relatório:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center justify-items-center text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
              {/* Slot 1: CAMP */}
              <div className="p-2 border border-gray-200 rounded-lg w-full flex flex-col items-center bg-white min-h-[70px] justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="CAMP" className="max-h-8 max-w-[80px] object-contain mb-1" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center text-xs font-black mb-1">
                    CAMP
                  </div>
                )}
                <span className="text-[9px] font-bold text-cyan-900 leading-tight">CAMP SANTO ANDRÉ</span>
              </div>

              {/* Slot 2: Rotary */}
              <div className="p-2 border border-gray-200 rounded-lg w-full flex flex-col items-center bg-white min-h-[70px] justify-center">
                {rotaryLogoUrl ? (
                  <img src={rotaryLogoUrl} alt="Rotary" className="max-h-8 max-w-[80px] object-contain mb-1" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold mb-1">
                    ⚙️
                  </div>
                )}
                <span className="text-[9px] font-bold text-blue-900 leading-tight">Rotary Club Santo André</span>
              </div>

              {/* Slot 3: ABTRF */}
              <div className="p-2 rounded-lg w-full flex flex-col items-center bg-blue-950 text-white min-h-[70px] justify-center overflow-hidden">
                {abtrfLogoUrl ? (
                  <img src={abtrfLogoUrl} alt="ABTRF" className="max-h-12 max-w-[90px] object-contain" />
                ) : (
                  <div className="text-[8px] font-bold leading-tight text-center">
                    <span>SELO DE RESPONSABILIDADE</span>
                    <span className="text-yellow-400 font-extrabold text-[9px] block">EMPRESA CIDADÃ</span>
                    <span>ABTRF 2025-26</span>
                  </div>
                )}
              </div>

              {/* Slot 4: ONG Verificada */}
              <div className="p-2 border-2 border-emerald-500 bg-emerald-50 rounded-lg w-full flex flex-col items-center text-emerald-800 font-bold text-[9px] leading-tight min-h-[70px] justify-center overflow-hidden">
                {ongVerificadaLogoUrl ? (
                  <img src={ongVerificadaLogoUrl} alt="ONG Verificada" className="max-h-12 max-w-[90px] object-contain" />
                ) : (
                  <>
                    <span>✓ CERTIFICADORA</span>
                    <span className="font-black text-[10px]">ONG VERIFICADA</span>
                  </>
                )}
              </div>

              {/* Slot 5: Transparência */}
              <div className="p-2 border-2 border-teal-500 bg-teal-50 rounded-lg w-full flex flex-col items-center text-teal-900 font-bold text-[9px] leading-tight col-span-2 sm:col-span-1 min-h-[70px] justify-center overflow-hidden">
                {transparenciaLogoUrl ? (
                  <img src={transparenciaLogoUrl} alt="Transparência" className="max-h-12 max-w-[90px] object-contain" />
                ) : (
                  <>
                    <span>SELO OFICIAL</span>
                    <span className="font-black text-[10px]">TRANSPARÊNCIA</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Logotipos Padrões
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#0B0F19] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Todos os Logotipos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
