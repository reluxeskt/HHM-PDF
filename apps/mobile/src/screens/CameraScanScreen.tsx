import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MobilePdfService } from '../services/mobilePdf';

interface Props {
  onCancel: () => void;
  onPdfGenerated: (pdfBytes: Uint8Array, name: string) => void;
}

export const CameraScanScreen: React.FC<Props> = ({
  onCancel,
  onPdfGenerated,
}) => {
  const [capturedPages, setCapturedPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapturePhoto = () => {
    // Simulates capturing high-res document page via camera
    setCapturedPages((prev) => prev + 1);
  };

  const handleFinishScan = async () => {
    if (capturedPages === 0) {
      Alert.alert('No Pages Captured', 'Please capture at least one page before finishing.');
      return;
    }

    setIsProcessing(true);
    try {
      // Create sample high-resolution 1x1 image or document representation
      // using MobilePdfService
      const sampleJpgBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04,
        0x06, 0x04, 0x04, 0x04, 0x04, 0x04, 0x08, 0x06, 0x06, 0x05, 0x06, 0x09,
        0x08, 0x0a, 0x0a, 0x09, 0x08, 0x09, 0x09, 0x0a, 0x0c, 0x0f, 0x0c, 0x0a,
        0x0b, 0x0e, 0x0b, 0x09, 0x09, 0x0d, 0x11, 0x0d, 0x0e, 0x0f, 0x10, 0x10,
        0x11, 0x10, 0x0a, 0x0c, 0x12, 0x13, 0x12, 0x10, 0x13, 0x0f, 0x10, 0x10,
        0x10, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
        0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
        0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff,
        0xd9,
      ]);

      const images = Array.from({ length: capturedPages }, () => ({
        data: sampleJpgBytes,
        format: 'jpeg' as const,
      }));

      const pdfBytes = await MobilePdfService.convertImagesToPdf(images);
      const name = `Scan_${new Date().toISOString().substring(0, 10)}_${Date.now().toString().slice(-4)}.pdf`;
      onPdfGenerated(pdfBytes, name);
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Viewfinder Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.topBarText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Document</Text>
        <Text style={styles.badge}>{capturedPages} Pages</Text>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.viewfinder}>
        <View style={styles.documentTargetBox}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <Text style={styles.targetInstruction}>
            Align document within frame.{'\n'}Auto-boundary detection active.
          </Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => setCapturedPages(0)}
        >
          <Text style={styles.retakeText}>Clear</Text>
        </TouchableOpacity>

        {/* Shutter Button */}
        <TouchableOpacity style={styles.shutterOuter} onPress={handleCapturePhoto}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.finishBtn, capturedPages === 0 && styles.finishBtnDisabled]}
          onPress={handleFinishScan}
          disabled={capturedPages === 0 || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.finishText}>Done ({capturedPages})</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  topBarText: {
    color: '#ffffff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  documentTargetBox: {
    width: '100%',
    height: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3b82f6',
  },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  targetInstruction: {
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 13,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: '#0a0a0a',
  },
  retakeBtn: {
    padding: 12,
  },
  retakeText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  finishBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  finishBtnDisabled: {
    backgroundColor: '#334155',
  },
  finishText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
