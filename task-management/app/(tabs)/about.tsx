import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, ActivityIndicator, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, HelpCircle, MessageCircle, LogOut, ChevronRight, Edit, Shield, UserPlus, X, Search, Trash2 } from 'lucide-react-native';
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
  const { user, logout, checkAuth, hasPermission } = useAuth();
  const dialog  = useDialog();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const canDelegate = hasPermission('tm.projects.view-assigned');

  // Permission delegation state
  const [grantedUsers, setGrantedUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [grantedLoading, setGrantedLoading] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [grantSearch, setGrantSearch] = useState('');
  const [granting, setGranting] = useState<number | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  const loadGrantedUsers = async () => {
    try {
      setGrantedLoading(true);
      const res = await apiService.get<{ id: number; name: string; email: string }[]>('/task-management/permissions/granted-users');
      if (res.success && res.data) setGrantedUsers(Array.isArray(res.data) ? res.data : []);
    } finally {
      setGrantedLoading(false);
    }
  };

  const openGrantModal = async () => {
    setShowGrantModal(true);
    setGrantSearch('');
    try {
      setEligibleLoading(true);
      const res = await apiService.get<{ id: number; name: string; email: string }[]>('/task-management/permissions/eligible-users');
      if (res.success && res.data) setEligibleUsers(Array.isArray(res.data) ? res.data : []);
    } finally {
      setEligibleLoading(false);
    }
  };

  const grantAccess = async (userId: number) => {
    try {
      setGranting(userId);
      const res = await apiService.post('/task-management/permissions/grant', { user_id: userId });
      if (res.success) {
        setShowGrantModal(false);
        loadGrantedUsers();
        dialog.showSuccess(res.message || 'Access granted successfully');
      } else {
        dialog.showError(res.message || 'Failed to grant access');
      }
    } finally {
      setGranting(null);
    }
  };

  const revokeAccess = (u: { id: number; name: string }) => {
    dialog.showConfirm(
      `Revoke Task Management access from ${u.name}? They will no longer be able to use the app.`,
      async () => {
        try {
          setRevoking(u.id);
          const res = await apiService.post('/task-management/permissions/revoke', { user_id: u.id });
          if (res.success) {
            loadGrantedUsers();
            dialog.showSuccess(res.message || 'Access revoked');
          } else {
            dialog.showError(res.message || 'Failed to revoke access');
          }
        } finally {
          setRevoking(null);
        }
      },
      'Revoke Access',
      'Revoke',
      'Cancel'
    );
  };

  useEffect(() => {
    if (canDelegate) loadGrantedUsers();
  }, [canDelegate]);

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

        {/* ── Permissions (only for users who can delegate) ──────────────────── */}
        {canDelegate && (
          <AnimatedView delay={120}>
            <View style={styles.section}>
              <SectionHeader
                title="Permissions"
                action={
                  <TouchableOpacity style={styles.grantBtn} onPress={openGrantModal} activeOpacity={0.7}>
                    <UserPlus size={13} color="#fff" strokeWidth={2} />
                    <Text style={styles.grantBtnText}>Grant Access</Text>
                  </TouchableOpacity>
                }
              />
              <View style={styles.card}>
                {grantedLoading ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={D.ink} />
                  </View>
                ) : grantedUsers.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Shield size={22} color={D.inkLight} strokeWidth={1.5} />
                    <Text style={[styles.infoLabel, { marginTop: 8, textAlign: 'center' }]}>No users granted access yet</Text>
                    <Text style={[styles.infoValue, { fontSize: 11, color: D.inkLight, textAlign: 'center', marginTop: 2 }]}>
                      Tap "Grant Access" to trust someone with the Task Management app.
                    </Text>
                  </View>
                ) : (
                  grantedUsers.map((u, i) => (
                    <View key={u.id}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <View style={styles.permRow}>
                        <View style={styles.permAvatar}>
                          <Text style={styles.permAvatarText}>{(u.name || '?')[0].toUpperCase()}</Text>
                        </View>
                        <View style={styles.permInfo}>
                          <Text style={styles.permName} numberOfLines={1}>{u.name}</Text>
                          <Text style={styles.permEmail} numberOfLines={1}>{u.email}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.revokeBtn, revoking === u.id && { opacity: 0.5 }]}
                          onPress={() => revokeAccess(u)}
                          disabled={revoking === u.id}
                          activeOpacity={0.7}
                        >
                          {revoking === u.id
                            ? <ActivityIndicator size="small" color={D.red} />
                            : <Trash2 size={15} color={D.red} strokeWidth={2} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </AnimatedView>
        )}

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

      {/* Grant Access modal */}
      <Modal visible={showGrantModal} transparent animationType="slide" onRequestClose={() => setShowGrantModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.sheetHeader}>
              <Text style={modalStyles.sheetTitle}>Grant TM Access</Text>
              <TouchableOpacity onPress={() => setShowGrantModal(false)} style={modalStyles.closeBtn}>
                <X size={20} color={D.ink} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.sheetHint}>
              Select a user to grant full Task Management access. They will be able to view projects, manage milestones, tasks, and team.
            </Text>
            <View style={modalStyles.searchBar}>
              <Search size={14} color={D.inkLight} strokeWidth={2} />
              <TextInput
                style={modalStyles.searchInput}
                placeholder="Search by name or email…"
                placeholderTextColor={D.inkLight}
                value={grantSearch}
                onChangeText={setGrantSearch}
              />
              {grantSearch.length > 0 && (
                <TouchableOpacity onPress={() => setGrantSearch('')}>
                  <X size={13} color={D.inkLight} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            {eligibleLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={D.ink} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {eligibleUsers
                  .filter((u) => {
                    const q = grantSearch.trim().toLowerCase();
                    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                  })
                  .map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[modalStyles.userRow, granting === u.id && { opacity: 0.6 }]}
                      onPress={() => grantAccess(u.id)}
                      disabled={granting === u.id}
                      activeOpacity={0.75}
                    >
                      <View style={modalStyles.userAvatar}>
                        <Text style={modalStyles.userAvatarText}>{(u.name || '?')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.userName} numberOfLines={1}>{u.name}</Text>
                        <Text style={modalStyles.userEmail} numberOfLines={1}>{u.email}</Text>
                      </View>
                      {granting === u.id
                        ? <ActivityIndicator size="small" color={D.ink} />
                        : <UserPlus size={16} color={D.green} strokeWidth={2} />}
                    </TouchableOpacity>
                  ))}
                {eligibleUsers.filter((u) => {
                  const q = grantSearch.trim().toLowerCase();
                  return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                }).length === 0 && (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: D.inkLight }}>No eligible users found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Permissions section
  grantBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.ink, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  grantBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  permRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  permAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: D.blueBg, justifyContent: 'center', alignItems: 'center',
  },
  permAvatarText: { fontSize: 14, fontWeight: '700', color: D.blue },
  permInfo: { flex: 1 },
  permName: { fontSize: 13, fontWeight: '700', color: D.ink },
  permEmail: { fontSize: 11, color: D.inkLight, marginTop: 1 },
  revokeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: D.redBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: D.red + '30',
  },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderColor: D.hairline,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: D.ink },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  sheetHint: { fontSize: 11, color: D.inkLight, marginBottom: 12, lineHeight: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: D.ink },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: D.hairline,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D.greenBg, justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 15, fontWeight: '700', color: D.green },
  userName: { fontSize: 13, fontWeight: '700', color: D.ink },
  userEmail: { fontSize: 11, color: D.inkLight, marginTop: 1 },
});