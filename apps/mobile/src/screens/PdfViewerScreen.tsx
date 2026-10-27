import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { MobilePdfItem } from './DocumentListScreen';
import { MobilePdfService } from '../services/mobilePdf';

interface Props {
  doc: MobilePdfItem;
  onBack: () => void;
}

export const PdfViewerScreen: React.FC<Props> = ({ doc, onBack }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(doc.pageCount || 1);
  const [rotation, setRotation] = useState(0);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    Alert.alert('Page Rotated', `Page ${currentPage} rotated by 90°.`);
  };

  const handleDeletePage = () => {
    if (totalPages <= 1) {
      Alert.alert('Cannot Delete', 'A document must have at least one page.');
      return;
    }
    Alert.alert('Delete Page', `Are you sure you want to delete page ${currentPage}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setTotalPages((prev) => prev - 1);
          if (currentPage > 1) setCurrentPage((prev) => prev - 1);
          Alert.alert('Deleted', `Page removed successfully.`);
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Sharing PDF: ${doc.name}`,
        title: doc.name,
      });
    } catch (e: any) {
      Alert.alert('Share Failed', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.docTitle} numberOfLines={1}>
          {doc.name}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Main Canvas Simulation Viewport */}
      <View style={styles.viewport}>
        <View
          style={[
            styles.pageSheet,
            { transform: [{ rotate: `${rotation}deg` }] },
          ]}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderBrand}>HHM PDF</Text>
            <Text style={styles.pageHeaderPage}>Page {currentPage} / {totalPages}</Text>
          </View>
          <View style={styles.dummyContent}>
            <View style={styles.linePlaceholderLg} />
            <View style={styles.linePlaceholderMd} />
            <View style={styles.linePlaceholderSm} />
            <View style={styles.linePlaceholderMd} />
            <View style={styles.boxPlaceholder} />
            <View style={styles.linePlaceholderLg} />
            <View style={styles.linePlaceholderSm} />
          </View>
          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              {doc.isCloud ? '☁️ Cloud Synchronized' : '💾 Local Storage'} • 300 DPI Rendering
            </Text>
          </View>
        </View>
      </View>

      {/* Floating Page Controls */}
      <View style={styles.pageIndicatorRow}>
        <TouchableOpacity
          disabled={currentPage <= 1}
          onPress={() => setCurrentPage((p) => p - 1)}
          style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
        >
          <Text style={styles.navBtnText}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageIndicatorText}>
          {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          disabled={currentPage >= totalPages}
          onPress={() => setCurrentPage((p) => p + 1)}
          style={[styles.navBtn, currentPage >= totalPages && styles.navBtnDisabled]}
        >
          <Text style={styles.navBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Mobile Tool Strip */}
      <View style={styles.toolsBar}>
        <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
          <Text style={styles.toolIcon}>🔄</Text>
          <Text style={styles.toolLabel}>Rotate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => Alert.alert('Draw Signature', 'Touch signature canvas opened. Sign with finger.')}
        >
          <Text style={styles.toolIcon}>✍️</Text>
          <Text style={styles.toolLabel}>Sign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => Alert.alert('Highlight Text', 'Tap text lines to apply yellow highlighter.')}
        >
          <Text style={styles.toolIcon}>🖍️</Text>
          <Text style={styles.toolLabel}>Highlight</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={handleDeletePage}>
          <Text style={styles.toolIcon}>🗑️</Text>
          <Text style={styles.toolLabel}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => Alert.alert('Page Extracted', `Extracted page ${currentPage} to new PDF document.`)}
        >
          <Text style={styles.toolIcon}>📤</Text>
          <Text style={styles.toolLabel}>Extract</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#334155',
  },
  topBar: {
    backgroundColor: '#0b2545',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingRight: 10,
  },
  backBtnText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '600',
  },
  docTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  shareBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pageSheet: {
    width: '90%',
    height: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'space-between',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 8,
  },
  pageHeaderBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  pageHeaderPage: {
    fontSize: 11,
    color: '#64748b',
  },
  dummyContent: {
    flex: 1,
    paddingVertical: 14,
    gap: 12,
  },
  linePlaceholderLg: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    width: '85%',
  },
  linePlaceholderMd: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    width: '95%',
  },
  linePlaceholderSm: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    width: '60%',
  },
  boxPlaceholder: {
    height: 60,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    marginVertical: 10,
  },
  pageFooter: {
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingTop: 8,
    alignItems: 'center',
  },
  pageFooterText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  pageIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    gap: 16,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  pageIndicatorText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  toolsBar: {
    flexDirection: 'row',
    backgroundColor: '#0b2545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: '#1e3a8a',
  },
  toolBtn: {
    alignItems: 'center',
  },
  toolIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  toolLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500',
  },
});
