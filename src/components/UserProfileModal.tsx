/**
 * UserProfileModal: Allows any user to update their registration information
 * (photo/avatar, email, function/role, full name, phone number, etc.).
 * Includes file drag-and-drop/upload for profile photo, avatar presets, and instant preview.
 */
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { supabaseService } from '../services/supabaseClient';
import { 
  User as UserIcon, 
  Mail, 
  Briefcase, 
  Phone, 
  Camera, 
  Upload, 
  X, 
  Check, 
  Sparkles,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: (user: User) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [position, setPosition] = useState(currentUser.position);
  const [phone, setPhone] = useState(currentUser.phone);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sync state whenever modal opens or currentUser changes
  React.useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPosition(currentUser.position);
      setPhone(currentUser.phone);
      setAvatarUrl(currentUser.avatarUrl || '');
      setFeedback(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('profile');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Handle local file upload (converts image to DataURL so it persists reliably offline/locally)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFeedback('Por favor escolha uma imagem de até 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setAvatarUrl(result);
          setFeedback('Foto carregada com sucesso! Clique em Salvar.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFeedback('Nome e e-mail são obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await sqlDb.updateUserProfile(currentUser.id, {
        name: name.trim(),
        email: email.trim(),
        position: position.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
      });

      onUserUpdated(updated);
      setFeedback('Informações cadastrais e dados do coordenador no relatório atualizados!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback(`Erro ao salvar: ${err.message || 'Falha desconhecida'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setFeedback('Informe a sua senha atual.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setFeedback('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback('A confirmação da nova senha não coincide.');
      return;
    }

    setIsSaving(true);
    try {
      if (supabaseService.isConfigured()) {
        const supaRes = await supabaseService.changeOwnPassword(
          currentUser.id,
          currentPassword,
          newPassword
        );
        if (!supaRes.success && supaRes.message.includes('incorreta')) {
          setFeedback(supaRes.message);
          setIsSaving(false);
          return;
        }
      }

      const updated = await sqlDb.changeUserPassword(
        currentUser.id,
        currentPassword,
        newPassword
      );
      onUserUpdated(updated);
      setFeedback('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback(`Erro ao alterar senha: ${err.message || 'Falha na verificação'}`);
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Meu Cadastro & Segurança</h3>
            <p className="text-xs text-gray-500">
              Edição de foto, dados cadastrais e alteração de senha de acesso
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setFeedback(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Dados Cadastrais & Foto
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setFeedback(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'password'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            Trocar Minha Senha
          </button>
        </div>

        {feedback && (
          <div className={`p-3 mb-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.includes('Erro')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* TAB 1: PROFILE & PHOTO */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Avatar Section */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="block font-bold text-gray-800 mb-2">Foto de Perfil / Avatar</span>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 bg-white flex items-center justify-center text-gray-500 text-xl font-bold shadow-xs">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Carregar nova foto"
                    className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-gray-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" /> Carregar do Computador
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-2 py-1.5 text-red-600 hover:text-red-700 font-semibold transition-colors cursor-pointer text-[11px]"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-[11px] text-gray-500">
                    PNG, JPG ou GIF até 2MB. Exibida no cartão do coordenador no relatório oficial.
                  </p>
                </div>
              </div>

              {/* Avatar Presets */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-[11px] font-bold text-gray-600 block mb-1.5">
                  Ou selecione um avatar institucional pré-definido:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 flex-shrink-0 cursor-pointer ${
                        avatarUrl === preset ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                    >
                      <img src={preset} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Inputs: Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail Institucional</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Position & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cargo / Função no CAMP</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="ex: Coordenador(a)"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Telefone / Ramal</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Departamento de Lotação</label>
              <input
                type="text"
                disabled
                value={currentUser.departmentName}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-100 font-semibold cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                * A alteração de setor/área exclusiva pode ser realizada pelo Administrador.
              </span>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#0B0F19] hover:bg-black text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Atualização Segura de Credencial
              </p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Altere a sua senha de acesso ao portal do CAMP Piero Pollone. A nova senha passará a valer imediatamente.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Senha Atual</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Padrão inicial do sistema: <code className="text-blue-600 font-mono">camp2026</code>
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">Nova Senha</label>
                {newPassword && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${strength.color}`}>
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
