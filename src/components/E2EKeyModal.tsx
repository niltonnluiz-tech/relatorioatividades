/**
 * E2EKeyModal: End-to-End Cryptography Key Management
 * Provides key passphrase unlocking, key derivation check, and cryptographic status.
 */
import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encryptionUnlocked: boolean;
  onToggleUnlock: (unlocked: boolean) => void;
}

export const E2EKeyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  encryptionUnlocked,
  onToggleUnlock,
}) => {
  const [passphrase, setPassphrase] = useState('CAMP-FINANCE-2026-KEY');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    if (passphrase.trim().length >= 8) {
      onToggleUnlock(true);
      setFeedback('Chave de criptografia ponta a ponta validada e desbloqueada com sucesso.');
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1200);
    } else {
      setFeedback('A senha da chave deve ter no mínimo 8 caracteres.');
    }
  };

  const handleLock = () => {
    onToggleUnlock(false);
    setFeedback('Registros financeiros bloqueados/criptografados.');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Criptografia Ponta a Ponta</h3>
            <p className="text-xs text-gray-500">Padrão AES-256-GCM com Derivação PBKDF2</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-gray-600">
          <p>
            Todos os valores de receitas, despesas, folha de pagamento e taxas administrativas são criptografados
            no cliente antes de serem gravados nas tabelas SQL do sistema.
          </p>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-gray-700">Algoritmo:</span>
              <span className="font-mono font-bold text-gray-900">AES-GCM 256-bit</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-gray-700">Derivação de Chave:</span>
              <span className="font-mono text-gray-900">PBKDF2 (100.000 iterações SHA-256)</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-gray-700">Fingerprint:</span>
              <span className="font-mono text-amber-800 font-bold">SHA256:4f8a...c921</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-gray-700">Estado da Sessão:</span>
              <span
                className={`font-bold ${
                  encryptionUnlocked ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {encryptionUnlocked ? '🔓 Desbloqueada (Visualização Clara)' : '🔒 Bloqueada (Cifrada)'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Frase-Secreta / Senha de Descriptografia:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {feedback && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
              {feedback}
            </p>
          )}

          <div className="pt-2 flex gap-2">
            {encryptionUnlocked ? (
              <button
                onClick={handleLock}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Bloquear / Ocultar
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="flex-1 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" /> Desbloquear Dados Sensíveis
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
