import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { FIRM_CONTACT } from '@/constants/contact';
import {
  User, Mail, Building2, Phone, HelpCircle, MessageSquare,
  LogOut, ChevronRight, Shield,
} from 'lucide-react-native';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:       '#0F0F0E',
  inkMid:    '#4A4845',
  inkLight:  '#9A9691',
  chalk:     '#FAFAF8',
  surface:   '#FFFFFF',
  hairline:  '#E8E5DF',
  hairlineMd:'#D4D0C8',
  red:       '#C0392B',
  redBg:     '#FDF1F0',
  blue:      '#1D4ED8',
  blueBg:    '#EEF2FF',
};

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionLabelLine} />
    </View>
  );
}

// ── Info row (non-tappable) ───────────────────────────────────────────────────
function InfoRow({
  icon: Icon, label, value,
}: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <Icon size={15} color={D.inkMid} strokeWidth={1.8} />
      </View>
      <View style={styles.infoRowBody}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

// ── Action row (tappable) ─────────────────────────────────────────────────────
function ActionRow({
  icon: Icon, label, subtitle, onPress, destructive, iconColor,
}: {
  icon: any; label: string; subtitle?: string;
  onPress: () => void; destructive?: boolean; iconColor?: string;
}) {
  const color = destructive ? D.red : iconColor ?? D.inkMid;
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionRowIcon, destructive && { backgroundColor: D.redBg }]}>
        <Icon size={16} color={color} strokeWidth={1.8} />
      </View>
      <View style={styles.actionRowBody}>
        <Text style={[styles.actionRowLabel, destructive && { color: D.red }]}>{label}</Text>
        {subtitle && <Text style={styles.actionRowSub}>{subtitle}</Text>}
      </View>
      {!destructive && <ChevronRight size={16} color={D.inkLight} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const displayName = user?.name || 'Client';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Profile hero ────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Avatar name={displayName} />
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroCompany} numberOfLines={1}>{user?.company || 'Construction Client'}</Text>
            {user?.client_code && (
              <View style={styles.heroCodeBadge}>
                <Text style={styles.heroCode}>{user.client_code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Account info ─────────────────────────────────────────────────── */}
        <SectionLabel title="Account" />
        <View style={styles.card}>
          <InfoRow icon={User}     label="Full Name"     value={user?.name    || ''} />
          <View style={styles.cardDivider} />
          <InfoRow icon={Mail}     label="Email"         value={user?.email   || ''} />
          <View style={styles.cardDivider} />
          <InfoRow icon={Building2} label="Company"      value={user?.company || ''} />
          {user?.phone_number && <>
            <View style={styles.cardDivider} />
            <InfoRow icon={Phone} label="Phone" value={user.phone_number} />
          </>}
        </View>

        {/* ── Support ──────────────────────────────────────────────────────── */}
        <SectionLabel title="Support" />
        <View style={styles.card}>
          <ActionRow
            icon={HelpCircle}
            label="Help Center"
            subtitle="FAQs and platform guides"
            onPress={() => router.push('/help-center')}
          />
          <View style={styles.cardDivider} />
          <ActionRow
            icon={MessageSquare}
            label="Contact Support"
            subtitle={FIRM_CONTACT.email}
            onPress={() => Linking.openURL(`mailto:${FIRM_CONTACT.email}?subject=Support Request`)}
          />
        </View>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <SectionLabel title="About" />
        <View style={styles.card}>
          <View style={styles.aboutBlock}>
            <View style={styles.aboutTop}>
              <Shield size={18} color={D.inkMid} strokeWidth={1.8} />
              <Text style={styles.aboutTitle}>Client Portal</Text>
            </View>
            <Text style={styles.aboutVersion}>Version 1.0</Text>
            <Text style={styles.aboutDesc}>
              Your construction project management portal. Track progress, view milestones, and stay updated on all your projects in one place.
            </Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutFirm}>Abdurauf Sawadjaan Engineering Consultancy</Text>
            <Text style={styles.aboutTagline}>Where Vision meets Precision</Text>
          </View>
        </View>

        {/* ── Sign out ─────────────────────────────────────────────────────── */}
        <View style={[styles.card, styles.logoutCard]}>
          <ActionRow
            icon={LogOut}
            label="Sign Out"
            onPress={logout}
            destructive
          />
        </View>

        <Text style={styles.footer}>© 2026 Abdurauf Sawadjaan Engineering Consultancy</Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: D.chalk },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: 14,
    borderWidth: 1, borderColor: D.hairline,
    padding: 18, marginBottom: 24, gap: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: D.ink,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFF', letterSpacing: -0.5 },
  heroText:    { flex: 1 },
  heroName:    { fontSize: 18, fontWeight: '700', color: D.ink, letterSpacing: -0.3 },
  heroCompany: { fontSize: 12, color: D.inkMid, marginTop: 2 },
  heroCodeBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: '#F0EFED', borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  heroCode: { fontSize: 10, fontWeight: '700', color: D.inkMid, letterSpacing: 0.5 },

  // Section label
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: D.inkLight, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionLabelLine:{ flex: 1, height: 1, backgroundColor: D.hairline },

  // Card
  card: {
    backgroundColor: D.surface, borderRadius: 12,
    borderWidth: 1, borderColor: D.hairline, marginBottom: 20,
    overflow: 'hidden',
  },
  cardDivider: { height: 1, backgroundColor: D.hairline, marginLeft: 52 },
  logoutCard: { marginBottom: 12 },

  // Info row
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 0,
  },
  infoRowIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#F5F4F2',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  infoRowBody:  { flex: 1 },
  infoRowLabel: { fontSize: 10, fontWeight: '600', color: D.inkLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoRowValue: { fontSize: 14, fontWeight: '600', color: D.ink },

  // Action row
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 0,
  },
  actionRowIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#F5F4F2',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  actionRowBody:  { flex: 1 },
  actionRowLabel: { fontSize: 14, fontWeight: '600', color: D.ink },
  actionRowSub:   { fontSize: 12, color: D.inkLight, marginTop: 1 },

  // About block
  aboutBlock: { padding: 16 },
  aboutTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  aboutTitle: { fontSize: 15, fontWeight: '700', color: D.ink },
  aboutVersion: { fontSize: 11, color: D.inkLight, marginBottom: 10 },
  aboutDesc:  { fontSize: 13, color: D.inkMid, lineHeight: 19 },
  aboutDivider: { height: 1, backgroundColor: D.hairline, marginVertical: 14 },
  aboutFirm:  { fontSize: 12, fontWeight: '700', color: D.ink },
  aboutTagline: { fontSize: 11, color: D.inkLight, fontStyle: 'italic', marginTop: 2 },

  // Footer
  footer: { textAlign: 'center', fontSize: 11, color: D.inkLight, marginTop: 8, marginBottom: 8 },
});