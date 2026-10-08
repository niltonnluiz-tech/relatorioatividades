/**
 * MobileBottomNav: Mobile responsive navigation bar providing quick touch access
 * to Exclusive Portal, 15-page Report Preview, Admin SQL Console, and Quick Export.
 */
import React from 'react';
import { User } from '../types';
import { UserCheck, Eye, ShieldCheck, FileDown, User as UserIcon, Lock } from 'lucide-react';
import { canUserAccessReport, canUserExportPdf } from '../utils/permissions';

interface Props {
  currentUser: User;
  activeView: 'portal' | 'preview' | 'admin';
  onChangeView: (view: 'portal' | 'preview' | 'admin') => void;
  onOpenPdfViewer: () => void;
  onOpenProfile?: () => void;
}

export const MobileBottomNav: React.FC<Props> = ({
  currentUser,
  activeView,
  onChangeView,
  onOpenPdfViewer,
  onOpenProfile,
}) => {
  const canAccessReport = canUserAccessReport(currentUser);
  const canExportPdf = canUserExportPdf(currentUser);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      <button
        onClick={() => onChangeView('portal')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
          activeView === 'portal' ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        <UserCheck className="w-4 h-4" />
        <span>Meu Setor</span>
      </button>

      <button
        onClick={() => onChangeView('preview')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
          activeView === 'preview' ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        {canAccessReport ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-500" />}
        <span>Relatório</span>
      </button>

      {onOpenProfile && (
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-gray-500 hover:text-blue-600"
        >
          <UserIcon className="w-4 h-4" />
          <span>Meu Perfil</span>
        </button>
      )}

      {currentUser.role === 'admin' && (
        <button
          onClick={() => onChangeView('admin')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeView === 'admin' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin</span>
        </button>
      )}

      <button
        onClick={() => {
          if (!canExportPdf) {
            alert('Acesso Negado: Seu usuário não possui autorização da Administração para baixar o relatório oficial em PDF.');
            return;
          }
          onOpenPdfViewer();
        }}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
          canExportPdf ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        {canExportPdf ? <FileDown className="w-4 h-4" /> : <Lock className="w-4 h-4 text-gray-400" />}
        <span>PDF</span>
      </button>
    </div>
  );
};
