import React, { useState, useEffect } from 'react';
import { AuditLog, MonthlyReport, SyncStatus, User } from './types';
import { sqlDb } from './services/sqlDb';
import { offlineSync } from './services/offlineSync';
import { INITIAL_USERS, INITIAL_MONTHLY_REPORT } from './data/initialData';
import { generateMonthlyExcel } from './services/excelGenerator';
import { Navbar } from './components/Navbar';
import { UserPortal } from './components/UserPortal';
import { ReportPagePreview } from './components/ReportPagePreview';
import { AdminPanel } from './components/AdminPanel';
import { TwoFactorModal } from './components/TwoFactorModal';
import { LgpdModal } from './components/LgpdModal';
import { E2EKeyModal } from './components/E2EKeyModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginScreen } from './components/LoginScreen';
import { MonthSelectorModal } from './components/MonthSelectorModal';
import { HiringDashboardModal } from './components/HiringDashboardModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { BrandingSettingsModal, LogoTarget } from './components/BrandingSettingsModal';
import { SupabaseConnectionModal } from './components/SupabaseConnectionModal';
import { ChevronLeft, ChevronRight, Download, FileText, Lock, ShieldCheck, BarChart3, Image as ImageIcon } from 'lucide-react';

export function App() {
  const [users, setUsers] = useState<User[]>(sqlDb.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUserId = localStorage.getItem('CAMP_AUTH_USER_ID');
    const existing = sqlDb.getUsers().find((u) => u.id === savedUserId);
    return existing || sqlDb.getUsers()[0] || INITIAL_USERS[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('CAMP_IS_AUTHENTICATED') === 'true';
  });
  const [currentReport, setCurrentReport] = useState<MonthlyReport>(() => sqlDb.getCurrentReport());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => sqlDb.getAuditLogs());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => offlineSync.getStatus());
  const [activeView, setActiveView] = useState<'portal' | 'preview' | 'admin'>('portal');

  // Preview page index (1 to 15)
  const [previewPage, setPreviewPage] = useState<number>(1);

  // Security and E2E State
  const [encryptionUnlocked, setEncryptionUnlocked] = useState<boolean>(false);
  const [is2FaOpen, setIs2FaOpen] = useState(false);
  const [isLgpdOpen, setIsLgpdOpen] = useState(false);
  const [isE2EOpen, setIsE2EOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [targetBrandingLogo, setTargetBrandingLogo] = useState<LogoTarget | undefined>(undefined);
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [isHiringModalOpen, setIsHiringModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Subscribe to offline sync changes
  useEffect(() => {
    const unsub = offlineSync.subscribe((isOnline, pendingCount) => {
      setSyncStatus({ isOnline, pendingCount, queue: offlineSync.getStatus().queue });
    });
    return unsub;
  }, []);

  const refreshData = () => {
    setCurrentReport(sqlDb.getCurrentReport());
    setAuditLogs(sqlDb.getAuditLogs());
    setUsers(sqlDb.getUsers());
  };

  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsers(sqlDb.getUsers());
    setCurrentReport(sqlDb.getCurrentReport());
    setAuditLogs(sqlDb.getAuditLogs());
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('CAMP_AUTH_USER_ID', user.id);
    // Log user switch in audit trail
    sqlDb.addAuditLog({
      userId: user.id,
      userName: user.name,
      departmentId: user.departmentId,
      action: 'USER_LOGIN',
      details: `Sessão iniciada como ${user.name} (${user.departmentName})`,
      ipAddress: '192.168.1.100',
      userAgent: navigator.userAgent,
    });
    setAuditLogs(sqlDb.getAuditLogs());
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setUsers(sqlDb.getUsers());
    setCurrentReport(sqlDb.getCurrentReport());
    setAuditLogs(sqlDb.getAuditLogs());
  };

  const handleLogout = () => {
    localStorage.removeItem('CAMP_IS_AUTHENTICATED');
    setIsAuthenticated(false);
    sqlDb.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      departmentId: currentUser.departmentId,
      action: 'USER_LOGOUT',
      details: `Sessão encerrada por ${currentUser.name}`,
      ipAddress: '192.168.1.100',
      userAgent: navigator.userAgent,
    });
    setAuditLogs(sqlDb.getAuditLogs());
  };

  const handleSelectReportId = (reportId: string) => {
    sqlDb.setActiveReportId(reportId);
    const updated = sqlDb.getReport(reportId);
    setCurrentReport(updated);
    sqlDb.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      departmentId: currentUser.departmentId,
      action: 'REPORT_PERIOD_CHANGE',
      details: `Período do relatório alterado para ${updated.monthName} / ${updated.year}`,
      ipAddress: '192.168.1.100',
      userAgent: navigator.userAgent,
    });
    setAuditLogs(sqlDb.getAuditLogs());
  };

  const handleExportExcel = () => {
    generateMonthlyExcel(currentReport, auditLogs);
    sqlDb.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      departmentId: currentUser.departmentId,
      action: 'EXCEL_EXPORT',
      details: `Exportação de planilha consolidada multi-abas (${currentReport.fullTitle})`,
      ipAddress: '192.168.1.100',
      userAgent: navigator.userAgent,
    });
    setAuditLogs(sqlDb.getAuditLogs());
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

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return <LoginScreen users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 flex flex-col font-sans antialiased pb-16 md:pb-6">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        availableUsers={users}
        currentReport={currentReport}
        onSelectMonth={(monthKey) => handleSelectReportId(monthKey)}
        availableReports={[INITIAL_MONTHLY_REPORT]}
        syncStatus={syncStatus}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpen2Fa={() => setIs2FaOpen(true)}
        onOpenLgpd={() => setIsLgpdOpen(true)}
        onOpenE2E={() => setIsE2EOpen(true)}
        onOpenPdfViewer={() => setIsPdfViewerOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenMonthSelector={() => setIsMonthModalOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: USER PORTAL (Exclusive area for monthly activity input) */}
        {activeView === 'portal' && (
          <UserPortal
            currentUser={currentUser}
            currentReport={currentReport}
            onReportUpdated={(updated) => {
              setCurrentReport(updated);
              setAuditLogs(sqlDb.getAuditLogs());
            }}
            encryptionUnlocked={encryptionUnlocked}
            onOpenEncryptionModal={() => setIsE2EOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenMonthSelector={() => setIsMonthModalOpen(true)}
            onOpenHiringModal={() => setIsHiringModalOpen(true)}
          />
        )}

        {/* VIEW 2: 15-PAGE REPORT PREVIEW (Identical layout to attached PDF) */}
        {activeView === 'preview' && (
          <div className="space-y-6">
            {/* Header controls for preview */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-gray-900">Navegação do Relatório:</span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-xs">
                  <button
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <select
                    aria-label="Página do relatório"
                    value={previewPage}
                    onChange={(e) => setPreviewPage(Number(e.target.value))}
                    className="bg-transparent font-bold text-gray-900 border-none focus:outline-none cursor-pointer text-xs"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Página {p}: {pageNames[p]}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-semibold">/ 15</span>
                  <button
                    disabled={previewPage >= 15}
                    onClick={() => setPreviewPage((p) => Math.min(15, p + 1))}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMonthModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-blue-200 transition-colors"
                >
                  <span>Mês: {currentReport.monthName} / {currentReport.year}</span>
                </button>
                {previewPage === 2 && (
                  <button
                    onClick={() => setIsHiringModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> Ajustar Gráfico
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTargetBrandingLogo(undefined);
                    setIsBrandingModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Upload e alteração dos logotipos e selos oficiais do relatório"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Upload de Logotipos
                </button>
                <button
                  onClick={() => setIsPdfViewerOpen(true)}
                  className="px-3 py-1.5 bg-[#0B0F19] hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-red-400" /> Ver Tela Cheia / Baixar
                </button>
              </div>
            </div>

            {/* Pixel-perfect preview page */}
            <ReportPagePreview
              report={currentReport}
              pageNumber={previewPage}
              currentUser={currentUser}
              onNavigatePage={(p) => setPreviewPage(p)}
              onOpenHiringModal={() => setIsHiringModalOpen(true)}
              onOpenBrandingModal={(target) => {
                setTargetBrandingLogo(target);
                setIsBrandingModalOpen(true);
              }}
            />
          </div>
        )}

        {/* VIEW 3: ADMIN PANEL & SQL (Automated exports, User management, SQL console, audit logs) */}
        {activeView === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            currentReport={currentReport}
            auditLogs={auditLogs}
            onRefreshData={refreshData}
            onOpenSupabase={() => setIsSupabaseModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <TwoFactorModal
        isOpen={is2FaOpen}
        onClose={() => setIs2FaOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(u) => {
          setCurrentUser(u);
          setUsers(sqlDb.getUsers());
        }}
      />

      <LgpdModal
        isOpen={isLgpdOpen}
        onClose={() => setIsLgpdOpen(false)}
        currentUser={currentUser}
      />

      <E2EKeyModal
        isOpen={isE2EOpen}
        onClose={() => setIsE2EOpen(false)}
        encryptionUnlocked={encryptionUnlocked}
        onToggleUnlock={setEncryptionUnlocked}
      />

      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        report={currentReport}
        currentUser={currentUser}
        onRefreshData={refreshData}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUserUpdated={handleUserUpdated}
      />

      {/* Change Password Dedicated Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={(updated) => {
          handleUserUpdated(updated);
        }}
      />

      {/* Branding & Logo Upload Modal */}
      {isBrandingModalOpen && (
        <BrandingSettingsModal
          currentUser={currentUser}
          initialSelectedLogo={targetBrandingLogo}
          onClose={() => setIsBrandingModalOpen(false)}
          onSaved={() => {
            refreshData();
          }}
        />
      )}

      {/* Month & Period Selector Modal */}
      <MonthSelectorModal
        isOpen={isMonthModalOpen}
        onClose={() => setIsMonthModalOpen(false)}
        currentReport={currentReport}
        onSelectReportId={handleSelectReportId}
      />

      {/* Hiring Dashboard (Aprendizes, Contratos em Processo, Estagiários) Modal */}
      <HiringDashboardModal
        isOpen={isHiringModalOpen}
        onClose={() => setIsHiringModalOpen(false)}
        report={currentReport}
        currentUser={currentUser}
        onSaved={refreshData}
      />

      {/* Supabase PostgreSQL Cloud Database Connection Modal */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onDataSynced={refreshData}
      />

      {/* Responsive Mobile Bottom Navigation */}
      <MobileBottomNav
        currentUser={currentUser}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenPdfViewer={() => setIsPdfViewerOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
    </div>
  );
}

export default App;
