import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

export interface MobileDocItem {
  id: string;
  name: string;
  pageCount: number;
  sizeBytes: number;
  isCloud: boolean;
  isDownloaded: boolean;
  updatedAt: string;
}

interface Props {
  onOpenDoc: (doc: MobileDocItem) => void;
  onScanPress: () => void;
  onAccountPress: () => void;
}

export const DocumentListScreen: React.FC<Props> = ({
  onOpenDoc,
  onScanPress,
  onAccountPress,
}) => {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'cloud' | 'local'>('all');
  const [docs, setDocs] = useState<MobileDocItem[]>([
    {
      id: 'doc_1',
      name: 'Sample_Invoice_2026.pdf',
      pageCount: 3,
      sizeBytes: 245000,
      isCloud: true,
      isDownloaded: true,
      updatedAt: 'Just now',
    },
    {
      id: 'doc_2',
      name: 'Project_Contract_Signed.pdf',
      pageCount: 8,
      sizeBytes: 1204000,
      isCloud: true,
      isDownloaded: false,
      updatedAt: '2 hours ago',
    },
    {
      id: 'doc_3',
      name: 'Passport_Scan.pdf',
      pageCount: 2,
      sizeBytes: 850000,
      isCloud: false,
      isDownloaded: true,
      updatedAt: 'Yesterday',
    },
  ]);

  const filteredDocs = docs.filter((d) => {
    const matchesQuery = d.name.toLowerCase().includes(filter.toLowerCase());
    if (activeTab === 'cloud') return matchesQuery && d.isCloud;
    if (activeTab === 'local') return matchesQuery && d.isDownloaded;
    return matchesQuery;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>HHM PDF</Text>
          <Text style={styles.subTitle}>Mobile Edition • Android / iOS</Text>
        </View>
        <TouchableOpacity style={styles.accountBtn} onPress={onAccountPress}>
          <Text style={styles.accountBtnText}>Account</Text>
        </TouchableOpacity>
      </View>

      {/* Action Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.scanBtn} onPress={onScanPress}>
          <Text style={styles.scanBtnText}>📷 Scan Document</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() => Alert.alert('Import PDF', 'Opening device document picker...')}
        >
          <Text style={styles.importBtnText}>📁 Open File</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search documents..."
          placeholderTextColor="#94a3b8"
          value={filter}
          onChangeText={setFilter}
          style={styles.input}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['all', 'cloud', 'local'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Document List */}
      <FlatList
        data={filteredDocs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.docCard}
            onPress={() => onOpenDoc(item)}
          >
            <View style={styles.pdfIconPlaceholder}>
              <Text style={styles.pdfBadge}>PDF</Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.docMeta}>
                {item.pageCount} pages • {(item.sizeBytes / 1024).toFixed(0)} KB • {item.updatedAt}
              </Text>
              <View style={styles.tagRow}>
                {item.isCloud && (
                  <View style={styles.cloudBadge}>
                    <Text style={styles.badgeText}>☁️ Cloud</Text>
                  </View>
                )}
                {item.isDownloaded && (
                  <View style={styles.offlineBadge}>
                    <Text style={styles.badgeText}>✓ Offline Ready</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0b2545',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  subTitle: {
    color: '#93c5fd',
    fontSize: 12,
  },
  accountBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  accountBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  scanBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  scanBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  importBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  importBtnText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 15,
  },
  searchBox: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 20,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderColor: '#2563eb',
  },
  tabText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#2563eb',
  },
  docCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  pdfIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  pdfBadge: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  docMeta: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cloudBadge: {
    backgroundColor: '#eff6ff',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  offlineBadge: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#334155',
  },
});
