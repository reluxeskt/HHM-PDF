import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { DocumentListScreen, MobileDocItem } from './src/screens/DocumentListScreen';
import { PdfViewerScreen } from './src/screens/PdfViewerScreen';
import { CameraScanScreen } from './src/screens/CameraScanScreen';
import { AccountScreen } from './src/screens/AccountScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'list' | 'viewer' | 'scan' | 'account'>('list');
  const [activeDoc, setActiveDoc] = useState<MobileDocItem | null>(null);

  const handleOpenDoc = (doc: MobileDocItem) => {
    setActiveDoc(doc);
    setCurrentScreen('viewer');
  };

  const handlePdfGenerated = (pdfBytes: Uint8Array, name: string) => {
    const newDoc: MobileDocItem = {
      id: `doc_${Date.now()}`,
      name,
      pageCount: 1,
      sizeBytes: pdfBytes.length,
      isCloud: false,
      isDownloaded: true,
      updatedAt: 'Just now',
    };
    setActiveDoc(newDoc);
    setCurrentScreen('viewer');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === 'list' && (
        <DocumentListScreen
          onOpenDoc={handleOpenDoc}
          onScanPress={() => setCurrentScreen('scan')}
          onAccountPress={() => setCurrentScreen('account')}
        />
      )}
      {currentScreen === 'viewer' && activeDoc && (
        <PdfViewerScreen
          doc={activeDoc}
          onBack={() => setCurrentScreen('list')}
        />
      )}
      {currentScreen === 'scan' && (
        <CameraScanScreen
          onCancel={() => setCurrentScreen('list')}
          onPdfGenerated={handlePdfGenerated}
        />
      )}
      {currentScreen === 'account' && (
        <AccountScreen onBack={() => setCurrentScreen('list')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b2545',
  },
});
