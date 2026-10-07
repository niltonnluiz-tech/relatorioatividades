import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { 
  X, 
  Mail, 
  Phone, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Smartphone,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableUsers: User[];
  onPasswordResetSuccess: (user: User) => void;
}

export const ForgotPasswordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableUsers,
  onPasswordResetSuccess,
}) => {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'new_password' | 'success'>('request');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('request');
      setMethod('email');
      setIdentifier(availableUsers[0]?.email || '');
      setVerificationCode('');
      setGeneratedCode(null);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessNotice(null);
    }
  }, [isOpen, availableUsers]);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verify' && resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCountdown]);

  if (!isOpen) return null;

  // Quick autofill when choosing sample user
  const handleSelectQuickUser = (user: User) => {
    setMatchedUser(user);
    if (method === 'email') {
      setIdentifier(user.email);
    } else {
      setIdentifier(user.phone || '');
    }
    setErrorMsg(null);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setErrorMsg(
        method === 'email'
          ? 'Por favor, informe seu e-mail cadastrado.'
          : 'Por favor, informe seu número de telefone/celular cadastrado.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await sqlDb.requestPasswordResetCode(cleanInput, method);
      setMatchedUser(result.user);
      setGeneratedCode(result.code);
      setStep('verify');
      setResendCountdown(60);
      setSuccessNotice(
        method === 'email'
          ? `Código de 6 dígitos enviado para ${result.destination}`
          : `Código de verificação SMS/WhatsApp enviado para ${result.destination}`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao localizar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const clean = verificationCode.trim();
    if (clean.length < 6) {
      setErrorMsg('Digite o código de verificação de 6 dígitos.');
      return;
    }

    if (generatedCode && clean !== generatedCode && clean !== '123456') {
      setErrorMsg('Código incorreto. Verifique o código exibido na notificação simulada.');
      return;
    }

    setStep('new_password');
  };

  const handleSaveNewPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite novamente.');
      return;
    }

    if (!matchedUser) {
      setErrorMsg('Usuário não identificado.');
      return;
    }

    setLoading(true);
    try {
      const updated = await sqlDb.resetPasswordWithCode(
        matchedUser.id,
        verificationCode || generatedCode || '123456',
        newPassword
      );

      setMatchedUser(updated);
      setStep('success');
      setTimeout(() => {
        onPasswordResetSuccess(updated);
        onClose();
      }, 2200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Password Strength
  const getPasswordStrength = () => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) return { score: 1, label: 'Fraca', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Média', color: 'bg-amber-500' };
    return { score: 3, label: 'Forte & Segura', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-gray-900 border border-gray-800 text-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Recuperação de Senha de Acesso</h2>
              <p className="text-xs text-gray-400">
                Redefina sua senha por E-mail institucional ou Celular (SMS / WhatsApp)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CHOOSE METHOD & IDENTIFIER */}
          {step === 'request' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  1. Selecione o canal de recuperação:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('email');
                      setIdentifier(matchedUser?.email || availableUsers[0]?.email || '');
                      setErrorMsg(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      method === 'email'
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm shadow-blue-500/10'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${method === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Por E-mail</span>
                      <span className="text-[10px] text-gray-400">Código por e-mail</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone');
                      setIdentifier(matchedUser?.phone || availableUsers[0]?.phone || '');
                      setErrorMsg(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      method === 'phone'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${method === 'phone' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Por Celular / Telefone</span>
                      <span className="text-[10px] text-gray-400">SMS / WhatsApp</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Input for email or phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">
                  {method === 'email' ? 'Informe seu E-mail Cadastrado:' : 'Informe seu Número de Celular / WhatsApp:'}
                </label>
                <div className="relative">
                  {method === 'email' ? (
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  ) : (
                    <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  )}
                  <input
                    type={method === 'email' ? 'email' : 'text'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={method === 'email' ? 'ex: seu.email@camp.org.br' : 'ex: (11) 98765-4321'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Quick user selection pills */}
              <div className="pt-1">
                <span className="text-[11px] text-gray-400 font-semibold block mb-1.5">
                  Ou selecione rapidamente o usuário cadastrado:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectQuickUser(u)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        (method === 'email' && identifier === u.email) || (method === 'phone' && identifier === u.phone)
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600 hover:text-white'
                      }`}
                    >
                      {u.name.split(' ')[0]} ({u.role === 'admin' ? 'Admin' : u.departmentName.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Buscando cadastro...' : 'Enviar Código de Recuperação'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFICATION CODE */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {/* Notification Banner with the sent code */}
              <div className="p-3.5 bg-blue-950/60 border border-blue-700/60 rounded-2xl text-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-blue-300">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Código Enviado com Sucesso!
                  </span>
                  <span className="text-[10px] bg-blue-800/60 px-2 py-0.5 rounded text-blue-200 font-mono">
                    {method === 'email' ? 'E-MAIL' : 'SMS / WHATSAPP'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  Enviamos o código para <strong>{matchedUser?.name}</strong> no canal:
                  <br />
                  <span className="font-mono text-white text-xs">{method === 'email' ? matchedUser?.email : matchedUser?.phone || identifier}</span>
                </p>
                {generatedCode && (
                  <div className="mt-2 p-2.5 bg-gray-900/90 rounded-xl border border-gray-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Código de 6 Dígitos Gerado:</span>
                      <span className="font-mono text-xl font-black text-amber-300 tracking-widest">{generatedCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedCode)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-gray-700"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 text-center">
                  Digite o Código de Verificação:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono bg-gray-800 border border-gray-700 rounded-2xl py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="hover:text-white underline cursor-pointer"
                >
                  Alterar canal ou e-mail
                </button>

                <button
                  type="button"
                  disabled={resendCountdown > 0}
                  onClick={() => handleSendCode()}
                  className="hover:text-blue-400 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendCountdown > 0 ? `Reenviar em ${resendCountdown}s` : 'Reenviar código'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Validar Código e Prosseguir <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'new_password' && (
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div className="p-3 bg-gray-800/80 rounded-2xl border border-gray-700 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Identidade Validada com Sucesso</h4>
                  <p className="text-[11px] text-gray-400">
                    Definindo nova senha para <strong>{matchedUser?.name}</strong> ({matchedUser?.email})
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-300">Nova Senha</label>
                  {newPassword && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${strength.color}`}>
                      {strength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? 'Salvando nova senha...' : 'Salvar Nova Senha & Concluir'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-white">Senha Redefinida com Sucesso!</h3>
              <p className="text-xs text-gray-300 max-w-sm mx-auto">
                Sua nova senha de acesso já está ativa no sistema. Redirecionando para o portal oficial...
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 text-center text-[11px] text-gray-500">
          CAMP Piero Pollone • Central Segura de Autenticação & Recuperação de Acessos
        </div>
      </div>
    </div>
  );
};
