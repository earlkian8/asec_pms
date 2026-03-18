import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, HelpCircle, MessageCircle, LogOut, ChevronRight, Edit } from 'lucide-react-native';
import { D } from '@/utils/colors';
import { FIRM_CONTACT } from '@/constants/contact';
import AnimatedView from '@/components/AnimatedView';
import ProfileUpdateModal from '@/components/ProfileUpdateModal';
import { apiService } from '@/services/api';
import { useDialog } from '@/contexts/DialogContext';

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon, label, value, onPress,
}: {
  icon: any; label: string; value: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.infoIcon, { backgroundColor: D.chalk }]}>
        <Icon size={16} color={D.ink} strokeWidth={1.8} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {onPress && <ChevronRight size={16} color={D.inkLight} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  const { user, logout, checkAuth } = useAuth();
  const dialog  = useDialog();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleUpdateProfile = async (name: string, email: string, currentPassword?: string, newPassword?: string) => {
    try {
      const payload: any = { name, email };
      if (currentPassword && newPassword) {
        payload.current_password     = currentPassword;
        payload.password             = newPassword;
        payload.password_confirmation = newPassword;
      }
      const response = await apiService.put('/task-management/profile', payload);
      if (typeof response === 'object' && 'success' in response) {
        if (response.success) {
          dialog.showSuccess('Profile updated successfully');
          setShowProfileModal(false);
          await checkAuth();
        } else {
          dialog.showError(response.message || 'Failed to update profile');
        }
      }
    } catch {
      dialog.showError('Failed to update profile. Please try again.');
    }
  };

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerTitle} numberOfLines={1}>{user?.name ?? 'User'}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{user?.email ?? ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.7}>
          <Edit size={16} color={D.ink} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Account ────────────────────────────────────────────────────────── */}
        <AnimatedView delay={80}>
          <View style={styles.section}>
            <SectionHeader title="Account" />
            <View style={styles.card}>
              <InfoRow icon={User} label="Full Name"      value={user?.name  ?? 'N/A'} />
              <View style={styles.rowDivider} />
              <InfoRow icon={Mail} label="Email Address"  value={user?.email ?? 'N/A'} />
            </View>
          </View>
        </AnimatedView>

        {/* ── Support ────────────────────────────────────────────────────────── */}
        <AnimatedView delay={140}>
          <View style={styles.section}>
            <SectionHeader title="Support" />
            <View style={styles.card}>
              <InfoRow
                icon={HelpCircle}
                label="Help Center"
                value="Browse FAQs and guides"
                onPress={() => router.push('/help-center')}
              />
              <View style={styles.rowDivider} />
              <InfoRow
                icon={MessageCircle}
                label="Contact Support"
                value={FIRM_CONTACT.email}
                onPress={() => Linking.openURL(`mailto:${FIRM_CONTACT.email}?subject=Support Request`)}
              />
            </View>
          </View>
        </AnimatedView>

        {/* ── About ──────────────────────────────────────────────────────────── */}
        <AnimatedView delay={200}>
          <View style={styles.section}>
            <SectionHeader title="About" />
            <View style={styles.card}>
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutTitle}>Task Management</Text>
                <Text style={styles.aboutVersion}>Version 1.0</Text>
                <Text style={styles.aboutDesc}>
                  Track assigned tasks, update progress, and report issues — all in one place.
                </Text>
              </View>
            </View>
          </View>
        </AnimatedView>

        {/* ── Sign out ───────────────────────────────────────────────────────── */}
        <AnimatedView delay={260}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
            <LogOut size={16} color={D.red} strokeWidth={2} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </AnimatedView>

        {/* Footer */}
        <AnimatedView delay={320}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>© Abdurauf Sawadjaan Engineering Consultancy</Text>
            <Text style={styles.footerSub}>Where Vision meets Precision</Text>
          </View>
        </AnimatedView>
      </ScrollView>

      <ProfileUpdateModal
        visible={showProfileModal}
        currentName={user?.name ?? ''}
        currentEmail={user?.email ?? ''}
        onClose={() => setShowProfileModal(false)}
        onUpdate={handleUpdateProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: D.chalk },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  // Header
  header: {
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.hairline,
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: D.inkLight, marginTop: 2 },
  editBtn: {
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },

  // Section
  section:           { marginTop: 20, marginBottom: 4 },
  sectionHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar:        { width: 3, height: 16, backgroundColor: D.ink, borderRadius: 2 },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: D.ink, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12,
  },
  rowDivider: { height: 1, backgroundColor: D.hairline, marginHorizontal: 14 },

  // Info row
  infoRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIcon:    { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel:   { fontSize: 10, fontWeight: '600', color: D.inkLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue:   { fontSize: 14, fontWeight: '600', color: D.ink },

  // About
  aboutBlock:   { padding: 14 },
  aboutTitle:   { fontSize: 16, fontWeight: '700', color: D.ink, marginBottom: 2 },
  aboutVersion: { fontSize: 11, color: D.inkLight, fontWeight: '500', marginBottom: 8 },
  aboutDesc:    { fontSize: 13, color: D.inkMid, lineHeight: 19 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, paddingVertical: 15, marginTop: 24,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: D.red },

  // Footer
  footer:    { alignItems: 'center', marginTop: 32, gap: 4 },
  footerText: { fontSize: 11, color: D.inkLight, fontWeight: '500', letterSpacing: 0.2 },
  footerSub:  { fontSize: 10, color: D.inkLight, fontStyle: 'italic' },
});