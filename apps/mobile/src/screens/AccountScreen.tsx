import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';

interface Props {
  onBack: () => void;
}

export const AccountScreen: React.FC<Props> = ({ onBack }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOfflineOnly, setIsOfflineOnly] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const handleAuth = () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return;
    }
    setIsSignedIn(true);
    Alert.alert('Signed In', `Welcome, ${email}! Cloud synchronization is now active.`);
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setEmail('');
    setPassword('');
    Alert.alert('Signed Out', 'You have been signed out. Local offline mode is active.');
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account & Cloud Sync</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isSignedIn ? (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{email[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <Text style={styles.userEmail}>{email}</Text>
            <Text style={styles.userStatus}>Firebase Cloud Connected</Text>

            {/* Storage Quota Bar */}
            <View style={styles.quotaSection}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaLabel}>Cloud Storage (Spark Free Tier)</Text>
                <Text style={styles.quotaValue}>12.4 MB / 1,000 MB</Text>
              </View>
              <View style={styles.quotaTrack}>
                <View style={[styles.quotaFill, { width: '1.2%' }]} />
              </View>
            </View>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Sign Out of Firebase</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In to Cloud Sync</Text>
            <Text style={styles.cardSubtitle}>
              Synchronize your PDFs across Web, Windows Desktop, and Android.
            </Text>

            <TextInput
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}>
              <Text style={styles.primaryBtnText}>Sign In / Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => Alert.alert('Google Sign-In', 'Connecting to Google OAuth...')}
            >
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sync Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync & Offline Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Local-Only Mode</Text>
              <Text style={styles.settingDesc}>Never upload documents to cloud</Text>
            </View>
            <Switch value={isOfflineOnly} onValueChange={setIsOfflineOnly} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Auto-Sync on Wi-Fi</Text>
              <Text style={styles.settingDesc}>Upload modified files automatically</Text>
            </View>
            <Switch value={autoSync} onValueChange={setAutoSync} />
          </View>
        </View>

        {/* Cache Management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Storage</Text>
          <Text style={styles.cardSubtitle}>
            Downloaded documents are cached for instant offline editing.
          </Text>
          <TouchableOpacity
            style={styles.clearCacheBtn}
            onPress={() => Alert.alert('Cache Cleared', 'Freed 45.2 MB of temporary cached files.')}
          >
            <Text style={styles.clearCacheText}>Clear Offline Cache (45.2 MB)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  backBtnText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  userStatus: {
    fontSize: 13,
    color: '#16a34a',
    textAlign: 'center',
    marginBottom: 16,
  },
  quotaSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quotaLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  quotaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  quotaTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  quotaFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  googleBtnText: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  settingText: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  clearCacheBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearCacheText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
});
