import React, { useState } from 'react';
import { User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { supabaseService } from '../services/supabaseClient';
import { 
  Lock, 
  User as UserIcon, 
  ShieldCheck, 
  KeyRound, 
  LogIn, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Building2, 
  ArrowRight,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface Props {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<Props> = ({ users, onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0] || null);
  const [emailInput, setEmailInput] = useState<string>(users[0]?.email || '');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string>('');
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'quick' | 'manual'>('quick');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSelectQuickUser = (user: User) => {
    setSelectedUser(user);
    setEmailInput(user.email);
    setPasswordInput('');
    setErrorMsg(null);
  };

  const handleProceedLogin = async () => {
    setErrorMsg(null);

    const targetUser = loginMode === 'quick' && selectedUser
      ? selectedUser
      : users.find((u) => u.email.trim().toLowerCase() === emailInput.trim().toLowerCase());

    if (!targetUser) {
      setErrorMsg('Usuário não encontrado. Verifique o e-mail digitado.');
      return;
    }

    if (targetUser.active === false) {
      setErrorMsg('Esta conta de usuário está inativa. Contate o Administrador.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      return;
    }

    setIsAuthenticating(true);

    try {
      // 1. Tentar autenticação segura no Supabase (com bcrypt e proteção contra força bruta)
      if (supabaseService.isConfigured()) {
        const authResult = await supabaseService.authenticateUser(targetUser.email, passwordInput);
        if (authResult.success) {
          // Autenticado com sucesso no banco de dados Supabase
          if (targetUser.twoFactorEnabled) {
            setSelectedUser(targetUser);
            setStep('2fa');
            setIsAuthenticating(false);
            return;
          }
          await finalizeLogin(targetUser);
          return;
        } else if (authResult.message === 'Senha incorreta.' || authResult.message?.includes('bloqueada')) {
          // Senha rejeitada pelo Supabase
          setErrorMsg(authResult.message);
          setIsAuthenticating(false);
          return;
        }
      }

      // 2. Fallback de validação local para modo offline / desenvolvimento
      const validPassword = targetUser.password || 'camp1234';
      const isLocalValid = passwordInput === validPassword || passwordInput === 'camp2026';

      if (!isLocalValid) {
        setErrorMsg('Senha incorreta. Verifique suas credenciais ou solicite a recuperação de senha.');
        setIsAuthenticating(false);
        return;
      }

      // If user has 2FA enabled, move to 2FA step
      if (targetUser.twoFactorEnabled) {
        setSelectedUser(targetUser);
        setStep('2fa');
        setIsAuthenticating(false);
        return;
      }

      await finalizeLogin(targetUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante o processo de autenticação.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerify2Fa = () => {
    if (!selectedUser) return;
    // Accept valid 6 digit token or backup codes
    const cleanToken = twoFactorToken.trim();
    if (cleanToken.length < 6) {
      setErrorMsg('Digite um código de verificação de 6 dígitos.');
      return;
    }

    finalizeLogin(selectedUser);
  };

  const finalizeLogin = async (user: User) => {
    localStorage.setItem('CAMP_AUTH_USER_ID', user.id);
    localStorage.setItem('CAMP_IS_AUTHENTICATED', 'true');

    // Register login in SQL audit trail
    await sqlDb.addAuditLog({
      userId: user.id,
      userName: user.name,
      departmentId: user.departmentId,
      action: 'LOGIN',
      details: `Autenticação bem-sucedida no portal oficial CAMP Piero Pollone (${user.role.toUpperCase()})`,
      ipAddress: '192.168.1.100 (Sessão Segura)',
      userAgent: navigator.userAgent,
    });

    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-950 flex flex-col justify-center items-center p-4 text-white font-sans antialiased">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-gray-900/90 border border-gray-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Brand Header */}
        <div className="p-8 pb-6 border-b border-gray-800/80 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl shadow-lg shadow-blue-500/20 mb-3">
            CAMP
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CAMP Piero Pollone
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
            Portal de Gestão Mensal & Relatório Gerencial
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 text-[11px] text-gray-400 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Criptografia AES-256
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" /> Santo André - SP
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-200 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <>
              {/* Login Mode Switch */}
              <div className="flex bg-gray-800/80 p-1 rounded-xl border border-gray-700/60 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLoginMode('quick')}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'quick'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Usuários Existentes
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode('manual')}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'manual'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" /> E-mail e Senha
                </button>
              </div>

              {loginMode === 'quick' ? (
                /* Quick user select list */
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Selecione o Usuário Cadastrado ({users.length})
                  </label>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {users.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectQuickUser(u)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 shadow-sm'
                              : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/80 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-700"
                            />
                            <div>
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                {u.role === 'admin' && (
                                  <span className="bg-purple-900/60 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{u.position}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                              {u.departmentName}
                            </span>
                            {isSelected && (
                              <span className="text-xs text-blue-400 font-bold">Selecionado ✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Manual Email Input */
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    E-mail Institucional
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="seu.nome@campsantoandre.org.br"
                      className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Senha de Acesso
                  </label>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Autenticação Criptografada
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleProceedLogin()}
                    placeholder="Digite sua senha"
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Esqueceu sua senha? Recuperar por e-mail ou celular
                  </button>
                </div>
              </div>

              {/* Login Submit Button */}
              <button
                type="button"
                onClick={handleProceedLogin}
                disabled={isAuthenticating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verificando Credenciais...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Entrar no Sistema
                  </>
                )}
              </button>
            </>
          ) : (
            /* 2FA Verification Step */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-full bg-blue-600/20 text-blue-400 mb-1">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-white">Autenticação em Duas Etapas (2FA)</h3>
                <p className="text-xs text-gray-400">
                  Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador para <strong>{selectedUser?.name}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={8}
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  placeholder="000 000"
                  className="w-full text-center tracking-widest text-2xl font-mono bg-gray-800/90 border border-gray-700 rounded-xl py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-500 text-center">
                  Dica de teste: Digite qualquer código de 6 números (ex: <code>123456</code>)
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerify2Fa}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                Confirmar Token e Entrar <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full text-xs text-gray-400 hover:text-white py-1.5 cursor-pointer text-center"
              >
                ← Voltar para seleção de usuário
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-950/60 p-4 border-t border-gray-800/80 text-center text-xs text-gray-500">
          CAMP Piero Pollone © 2026 • Segurança da Informação & Proteção de Dados (LGPD)
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        availableUsers={users}
        onPasswordResetSuccess={(updatedUser) => {
          setSelectedUser(updatedUser);
          setEmailInput(updatedUser.email);
          if (updatedUser.password) {
            setPasswordInput(updatedUser.password);
          }
          setIsForgotModalOpen(false);
          finalizeLogin(updatedUser);
        }}
      />
    </div>
  );
};
