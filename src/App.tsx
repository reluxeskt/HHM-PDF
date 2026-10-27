import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { PdfProvider, usePdf } from './context/PdfContext';
import { TopBar } from './components/TopBar';
import { Ribbon } from './components/Ribbon';
import { HomeScreen } from './components/HomeScreen';
import { Sidebar } from './components/Sidebar';
import { PdfCanvas } from './components/PdfCanvas';
import { StatusBar } from './components/StatusBar';

// Modals
import { OrganizePagesModal } from './components/modals/OrganizePagesModal';
import { CombinePdfsModal } from './components/modals/CombinePdfsModal';
import { SignatureModal } from './components/modals/SignatureModal';
import { WatermarkModal } from './components/modals/WatermarkModal';
import { RedactionModal } from './components/modals/RedactionModal';
import { PropertiesModal } from './components/modals/PropertiesModal';
import { ProtectModal } from './components/modals/ProtectModal';
import { UnlockSecurityModal } from './components/modals/UnlockSecurityModal';
import { ExportModal } from './components/modals/ExportModal';
import { OcrModal } from './components/modals/OcrModal';
import { CompareModal } from './components/modals/CompareModal';
import { HelpModal } from './components/modals/HelpModal';
import { NewBlankModal } from './components/modals/NewBlankModal';
import { SplitPdfModal } from './components/modals/SplitPdfModal';
import { InsertPagesModal } from './components/modals/InsertPagesModal';
import { BatchProcessModal } from './components/modals/BatchProcessModal';
import { ExistingTextEditModal } from './components/modals/ExistingTextEditModal';
import { CloudDocsModal } from './components/modals/CloudDocsModal';
import { AuthModal } from './components/modals/AuthModal';
import { ConflictModal } from './components/modals/ConflictModal';
import { QaSelfTestModal } from './components/modals/QaSelfTestModal';

const AppContent: React.FC = () => {
  const {
    activeDocIndex,
    isCloudModalOpen,
    setIsCloudModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isConflictModalOpen,
    setIsConflictModalOpen,
    isQaModalOpen,
    setIsQaModalOpen,
    currentUser,
    setCurrentUser,
    conflictInfo,
    resolveConflict,
  } = usePdf();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased select-none">
      {/* Application Top Bar */}
      <TopBar />

      {/* Application Ribbon Navigation */}
      <Ribbon />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeDocIndex === -1 ? (
          <HomeScreen />
        ) : (
          <>
            <Sidebar />
            <PdfCanvas />
          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Global Interactive Modals */}
      <OrganizePagesModal />
      <CombinePdfsModal />
      <SignatureModal />
      <WatermarkModal />
      <RedactionModal />
      <PropertiesModal />
      <ProtectModal />
      <UnlockSecurityModal />
      <ExportModal />
      <OcrModal />
      <CompareModal />
      <HelpModal />
      <NewBlankModal />
      <SplitPdfModal />
      <InsertPagesModal />
      <BatchProcessModal />
      <ExistingTextEditModal />
      <QaSelfTestModal isOpen={isQaModalOpen} onClose={() => setIsQaModalOpen(false)} />

      {/* Phase 4 Cloud & Sync Modals */}
      <CloudDocsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => {
          setIsCloudModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
      <ConflictModal
        isOpen={isConflictModalOpen}
        conflict={conflictInfo}
        onResolve={resolveConflict}
        onClose={() => setIsConflictModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <PdfProvider>
        <AppContent />
      </PdfProvider>
    </ThemeProvider>
  );
}

