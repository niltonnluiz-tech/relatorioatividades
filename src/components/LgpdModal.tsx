/**
 * LgpdModal: LGPD Compliance and Privacy Rights Management (Lei 13.709/2018)
 * Enables users to exercise titular rights, export personal data, and inspect privacy policies.
 */
import React, { useState } from 'react';
import { User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { ShieldCheck, Download, FileText, X, Check, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const LgpdModal: React.FC<Props> = ({ isOpen, onClose, currentUser }) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExportPersonalData = async () => {
    const data = {
      usuario: {
        id: currentUser.id,
        nome: currentUser.name,
        email: currentUser.email,
        cargo: currentUser.position,
        departamento: currentUser.departmentName,
        telefone: currentUser.phone,
        dois_fatores_ativo: currentUser.twoFactorEnabled,
        data_consentimento_lgpd: currentUser.lgpdConsentDate,
      },
      politica_lgpd: {
        lei: 'Lei Federal 13.709/2018 (LGPD)',
        base_legal: 'Execução de contrato e legítimo interesse institucional (Art. 7º)',
        dpo_encarregado: 'Nilton Luiz - niltonnluiz@gmail.com',
        instituicao: 'CAMP Piero Pollone - Santo André',
        medidas_seguranca: 'Criptografia AES-256-GCM, SHA-256 integridade, 2FA/MFA, auditoria imutável',
      },
      exportado_em: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dados_Pessoais_LGPD_${currentUser.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    await sqlDb.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      departmentId: currentUser.departmentId,
      action: 'LGPD_DATA_EXPORT',
      details: 'Exercício do Direito de Acesso e Exportação de Dados Pessoais (LGPD Art. 18)',
      ipAddress: '192.168.1.100',
      userAgent: navigator.userAgent,
    });

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Conformidade com a LGPD</h3>
            <p className="text-xs text-gray-500">Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018)</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-gray-600">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <p className="font-semibold text-gray-800">
              O sistema do <span className="text-[#0B0F19] font-bold">CAMP Piero Pollone</span> adota os mais rigorosos padrões de privacidade e segurança:
            </p>
            <ul className="space-y-1.5 text-gray-600">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Criptografia ponta a ponta (AES-256-GCM) para dados financeiros sensíveis.</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Trilha de auditoria encadeada com SHA-256 com rastreabilidade total de alterações.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Acesso estritamente segregado por área/setor de atuação.</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h4 className="font-bold text-gray-900 mb-1">Encarregado de Dados (DPO)</h4>
            <p className="text-gray-700">
              <span className="font-semibold">Nilton Luiz</span> — Administrador & Encarregado pelo Tratamento de Dados Pessoais
            </p>
            <p className="text-blue-700 font-medium">Email: niltonnluiz@gmail.com</p>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h4 className="font-bold text-gray-900 mb-1.5">Direitos do Titular (Artigo 18 da LGPD)</h4>
            <p className="text-gray-600 mb-3">
              Você pode solicitar a qualquer momento a confirmação, correção, eliminação ou exportação de seus dados pessoais armazenados no banco de dados.
            </p>

            <button
              onClick={handleExportPersonalData}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
            >
              <Download className="w-4 h-4 text-gray-600" />
              {downloadSuccess ? 'Arquivo Baixado com Sucesso!' : 'Baixar Meus Dados Pessoais em JSON'}
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0B0F19] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
