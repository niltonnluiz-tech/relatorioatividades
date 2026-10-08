/**
 * Navbar: Institutional Header with User switcher, Month Selector,
 * Connectivity/Sync status, 2FA indicator, and quick Export shortcuts.
 * Standardized, elegant styling matching the executive design guidelines.
 */
import React from 'react';
import { MonthlyReport, SyncStatus, User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { 
  FileText, 
  FileSpreadsheet, 
  ShieldCheck, 
  Smartphone, 
  WifiOff, 
  Eye, 
  UserCheck,
  Calendar,
  ChevronDown,
  LogOut,
  KeyRound,
  Database,
  Lock
} from 'lucide-react';
import { supabaseService } from '../services/supabaseClient';
import { canUserAccessReport, canUserExportPdf, canUserExportExcel } from '../utils/permissions';

interface Props {
  currentUser: User;
  onSelectUser: (user: User) => void;
  availableUsers: User[];
  currentReport: MonthlyReport;
  onSelectMonth: (monthKey: string) => void;
  availableReports: MonthlyReport[];
  syncStatus: SyncStatus;
  activeView: 'portal' | 'preview' | 'admin';
  onChangeView: (view: 'portal' | 'preview' | 'admin') => void;
  onOpen2Fa: () => void;
  onOpenLgpd: () => void;
  onOpenE2E: () => void;
  onOpenPdfViewer: () => void;
  onExportExcel: () => void;
  onOpenProfile: () => void;
  onOpenChangePassword?: () => void;
  onOpenMonthSelector?: () => void;
  onOpenSupabase?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  onSelectUser,
  availableUsers,
  currentReport,
  syncStatus,
  activeView,
  onChangeView,
  onOpen2Fa,
  onOpenLgpd,
  onOpenPdfViewer,
  onExportExcel,
  onOpenProfile,
  onOpenChangePassword,
  onOpenMonthSelector,
  onOpenSupabase,
  onLogout,
}) => {
  const institutionSettings = sqlDb.getInstitutionSettings();
  const canAccessReport = canUserAccessReport(currentUser);
  const canExportPdf = canUserExportPdf(currentUser);
  const canExportExcel = canUserExportExcel(currentUser);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Logo & Institution */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {institutionSettings.logoUrl ? (
              <img
                src={institutionSettings.logoUrl}
                alt="CAMP"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white p-0.5 border border-gray-200 shadow-2xs"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B0F19] text-white flex items-center justify-center font-black text-xs sm:text-sm tracking-tighter shadow-2xs">
                CAMP
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-[#0B0F19] tracking-tight leading-tight">
                {institutionSettings.name || 'CAMP Piero Pollone'}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold leading-none">
                {institutionSettings.subTitle || 'Sistema Mensal de Atividades & Relatórios'}
              </p>
            </div>

            {/* Month & Year active report period indicator / switcher */}
            {onOpenMonthSelector && (
              <button
                type="button"
                id="btn-nav-month-selector"
                onClick={onOpenMonthSelector}
                title="Alterar Mês do Relatório (Usar mês/ano corrente automático ou selecionar manualmente)"
                className="hidden sm:inline-flex items-center gap-1.5 ml-1.5 px-3 py-1.5 bg-blue-50/90 hover:bg-blue-100 text-blue-900 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="capitalize">{currentReport.monthName} / {currentReport.year}</span>
                <ChevronDown className="w-3 h-3 text-blue-500 opacity-70" />
              </button>
            )}
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav className="hidden md:inline-flex items-center gap-1 bg-gray-100/90 p-1 rounded-2xl border border-gray-200/60 shadow-2xs">
            <button
              onClick={() => onChangeView('portal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'portal'
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-black'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Meu Setor Exclusivo</span>
            </button>

            <button
              onClick={() => onChangeView('preview')}
              title={canAccessReport ? "Visualizar Relatório Oficial (15 Páginas)" : "Acesso ao relatório restrito pela Administração"}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'preview'
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-black'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
            >
              {canAccessReport ? (
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Relatório (15 Páginas)</span>
              {!canAccessReport && (
                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 py-0.2 rounded">Restrito</span>
              )}
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={() => onChangeView('admin')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-black'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Painel Administrador & SQL</span>
              </button>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Online / Offline Sync status - formatted cleanly, no undefined bugs */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                syncStatus.isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {syncStatus.isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online / Sincronizado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>Offline ({typeof syncStatus.pendingCount === 'number' ? syncStatus.pendingCount : 0})</span>
                </>
              )}
            </div>

            {/* Supabase Cloud Database Status / Trigger */}
            {onOpenSupabase && (
              <button
                type="button"
                id="btn-nav-supabase"
                onClick={onOpenSupabase}
                title="Configurar e Gerenciar Conexão com o Supabase (PostgreSQL Nuvem)"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                  supabaseService.isConfigured()
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>{supabaseService.isConfigured() ? 'Supabase Conectado' : 'Conectar Supabase'}</span>
              </button>
            )}

            {/* Quick Export PDF button */}
            <button
              id="btn-nav-pdf-export"
              onClick={() => {
                if (!canExportPdf) {
                  alert('Acesso Negado: Seu usuário não possui autorização da Administração para baixar o relatório oficial em PDF.');
                  return;
                }
                onOpenPdfViewer();
              }}
              title={canExportPdf ? "Visualizar e Baixar PDF Oficial" : "Download do PDF restrito pela Administração"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                canExportPdf
                  ? 'bg-[#0B0F19] hover:bg-black text-white'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {canExportPdf ? (
                <FileText className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="hidden sm:inline">PDF Oficial</span>
            </button>

            {/* Quick Export Excel button */}
            <button
              id="btn-nav-excel-export"
              onClick={() => {
                if (!canExportExcel) {
                  alert('Acesso Negado: Seu usuário não possui autorização da Administração para baixar a planilha consolidada em Excel.');
                  return;
                }
                onExportExcel();
              }}
              title={canExportExcel ? "Baixar Relatório em Formato Excel (.xlsx)" : "Download da planilha Excel restrito pela Administração"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                canExportExcel
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {canExportExcel ? (
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* LGPD button */}
            <button
              onClick={onOpenLgpd}
              title="Políticas de Privacidade e Direitos LGPD"
              className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            {/* 2FA badge / button */}
            <button
              onClick={onOpen2Fa}
              title={currentUser.twoFactorEnabled ? '2FA Ativo' : 'Ativar 2FA'}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                currentUser.twoFactorEnabled
                  ? 'text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100'
                  : 'text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* User Profile / Avatar Button (Edit Photo, Email, Role, Phone) */}
            <button
              onClick={onOpenProfile}
              title="Meu Cadastro: Alterar Foto, E-mail, Função e Telefone"
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 rounded-xl transition-all cursor-pointer border border-gray-200/60 hover:border-gray-300"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-300 bg-white flex items-center justify-center font-bold text-gray-700 text-[9px] shadow-2xs">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                )}
              </div>
              <span className="hidden lg:inline text-xs font-bold text-gray-800 max-w-[85px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>

            {/* Quick Change Password Button */}
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                title="Trocar Minha Senha de Acesso"
                className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-200"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            )}

            {/* User Switcher Dropdown (Allows testing each coordinator role seamlessly) */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-gray-200">
              <select
                aria-label="Alternar perfil do usuário ativo"
                value={currentUser.id}
                onChange={(e) => {
                  const u = availableUsers.find((user) => user.id === e.target.value);
                  if (u) onSelectUser(u);
                }}
                className="text-xs font-bold text-gray-800 bg-gray-50/80 hover:bg-gray-100 border border-gray-300 rounded-xl py-1.5 px-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none max-w-[140px] sm:max-w-[190px] truncate cursor-pointer transition-colors"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin' : (u.departmentName?.split(' ')[0] || u.departmentId || 'Setor')})
                  </option>
                ))}
              </select>
            </div>

            {/* Logout button */}
            {onLogout && (
              <button
                type="button"
                id="btn-nav-logout"
                onClick={onLogout}
                title="Sair do Sistema / Tela de Login"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
