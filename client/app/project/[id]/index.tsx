import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AlertCircle, MapPin, FileText,
  ArrowLeft, Package,
} from 'lucide-react-native';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import AnimatedView from '@/components/AnimatedView';
import AnimatedCard from '@/components/AnimatedCard';
import MilestoneCard from '@/components/cards/MilestoneCard';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatCurrency';
import { getRoleIcon, getProjectStatusColors } from '@/utils/statusHelpers';
import { useDialog } from '@/contexts/DialogContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:       '#0F0F0E',
  inkMid:    '#4A4845',
  inkLight:  '#9A9691',
  chalk:     '#FAFAF8',
  surface:   '#FFFFFF',
  hairline:  '#E8E5DF',
  hairlineMd:'#D4D0C8',
  blue:      '#1D4ED8',
  blueBg:    '#EEF2FF',
  green:     '#2D7D52',
  greenBg:   '#EDF7F2',
  red:       '#C0392B',
  redBg:     '#FDF1F0',
  amber:     '#B45309',
  amberBg:   '#FFFBEB',
  purple:    '#6D28D9',
  purpleBg:  '#F5F3FF',
};

// ── Tabs — budget tab removed, contractor-internal data hidden ─────────────────
const TABS = ['overview', 'milestones', 'materials'] as const;
type Tab = typeof TABS[number];

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({
  children, accentColor = D.blue, style,
}: { children: React.ReactNode; accentColor?: string; style?: any }) {
  return (
    <View style={[styles.sectionCard, { borderLeftColor: accentColor }, style]}>
      {children}
    </View>
  );
}

function CardLabel({ children }: { children: string }) {
  return <Text style={styles.cardLabel}>{children}</Text>;
}

// ── Compact stat cell ─────────────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statCellValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statCellLabel}>{label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  useDialog(); // kept for parity with other screens (no email/contact actions)

  const [refreshing,        setRefreshing]        = useState(false);
  const [selectedTab,       setSelectedTab]       = useState<Tab>('overview');

  const { project, loading, error, refresh } = useProjectDetail(id as string);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <LoadingState message="Loading project details..." />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <EmptyState icon={AlertCircle} title={error || 'Project not found'} iconColor={D.red} />
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!project) return null;

  const payment = project.paymentStatus;
  const paymentLabel = payment?.status
    ? payment.status.toUpperCase()
    : 'N/A';
  const paymentMeta =
    payment?.status === 'paid' ? { bg: D.greenBg, text: D.green } :
    payment?.status === 'partial' ? { bg: D.amberBg, text: D.amber } :
    payment?.status === 'unpaid' ? { bg: D.redBg, text: D.red } :
    { bg: '#F0EFED', text: D.inkMid };

  const formatMaybeDate = (value?: string | null) => {
    if (!value) return 'Not specified';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Not specified';
    if (d.getFullYear() <= 1971) return 'Not specified';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusMeta = getProjectStatusColors(project.status);

  const MATERIAL_STATUS: Record<string, { bg: string; text: string }> = {
    received: { bg: D.greenBg, text: D.green },
    partial:  { bg: D.amberBg, text: D.amber },
    pending:  { bg: '#F0EFED', text: D.inkMid },
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={D.ink} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerActions} />
        </View>

        <View style={styles.headerTitleBlock}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={styles.statusText}>
              {project.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={2}>{project.name}</Text>
          {project.location ? (
            <View style={styles.headerLocation}>
              <MapPin size={12} color={D.inkLight} strokeWidth={2} />
              <Text style={styles.headerLocationText}>{project.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerProgressBlock}>
          <View style={styles.headerProgressLabelRow}>
            <Text style={styles.headerProgressLabel}>Overall Progress</Text>
            <Text style={styles.headerProgressPct}>{parseFloat(Number(project.progress).toFixed(2))}%</Text>
          </View>
          <View style={styles.headerProgressTrack}>
            <View style={[styles.headerProgressFill, { width: `${project.progress}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />}>

        {selectedTab === 'overview' && (
          <AnimatedView delay={0}>
            <View style={styles.statsStrip}>
              <StatCell label="Contract Value" value={formatCurrencyCompact(project.budget)} />
              <View style={styles.statsDivider} />
              <StatCell label="Payment" value={paymentLabel} />
              <View style={styles.statsDivider} />
              <StatCell label="Started" value={formatMaybeDate(project.startDate)} />
              <View style={styles.statsDivider} />
              <StatCell label="Due" value={formatMaybeDate(project.expectedCompletion)} />
            </View>

            {payment?.status ? (
              <View style={[styles.paymentChip, { backgroundColor: paymentMeta.bg, borderColor: paymentMeta.text }]}>
                <Text style={[styles.paymentChipText, { color: paymentMeta.text }]}>{paymentLabel}</Text>
                <Text style={[styles.paymentChipSub, { color: paymentMeta.text }]}>
                  {payment.remainingAmount > 0 ? `${formatCurrency(payment.remainingAmount)} remaining` : 'No remaining balance'}
                </Text>
              </View>
            ) : null}

            {(project.description || project.location) && (
              <SectionCard accentColor={D.inkMid} style={styles.mb12}>
                <CardLabel>Project Details</CardLabel>
                {project.location && (
                  <View style={styles.detailRow}>
                    <MapPin size={14} color={D.inkLight} strokeWidth={1.8} />
                    <Text style={styles.detailText}>{project.location}</Text>
                  </View>
                )}
                {project.description && (
                  <View style={styles.detailRow}>
                    <FileText size={14} color={D.inkLight} strokeWidth={1.8} />
                    <Text style={styles.detailText}>{project.description}</Text>
                  </View>
                )}
              </SectionCard>
            )}

            {project.teamMembers.length > 0 && (
              <SectionCard accentColor={D.purple} style={styles.mb12}>
                <CardLabel>Team</CardLabel>
                {project.teamMembers.map((member, i) => {
                  const roleIcon = getRoleIcon(member.role || '');
                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.teamRow,
                        i < project.teamMembers.length - 1 && styles.teamRowBorder,
                      ]}>
                      <View style={[styles.teamAvatar, { backgroundColor: roleIcon.bgColor }]}>
                        <Ionicons name={roleIcon.icon as any} size={15} color={roleIcon.color} />
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={styles.teamName}>{member.name || 'Unnamed'}</Text>
                        <Text style={styles.teamRole}>{member.role || 'No role'}</Text>
                      </View>
                    </View>
                  );
                })}
              </SectionCard>
            )}
          </AnimatedView>
        )}

        {selectedTab === 'milestones' && (
          <AnimatedView delay={0}>
            {project.milestones.length > 0 ? (
              <View style={styles.listGap}>
                {project.milestones.map((milestone, index) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                    onPress={() => router.push(`/project/${project.id}/milestone/${milestone.id}`)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState icon={AlertCircle} title="No milestones yet" />
            )}
          </AnimatedView>
        )}

        {selectedTab === 'materials' && (
          <AnimatedView delay={0}>
            {project.materialAllocations && project.materialAllocations.length > 0 ? (
              <View style={styles.listGap}>
                {project.materialAllocations.map((alloc, index) => {
                  const mStatus = MATERIAL_STATUS[alloc.status] || MATERIAL_STATUS.pending;
                  const receivedPct = alloc.quantityAllocated > 0
                    ? Math.round((alloc.quantityReceived / alloc.quantityAllocated) * 100)
                    : 0;
                  return (
                    <AnimatedCard
                      key={alloc.id}
                      index={index}
                      delay={100}
                      style={StyleSheet.flatten([styles.materialCard])}>
                      <View style={styles.materialTitleRow}>
                        <View style={styles.materialTitleBlock}>
                          <Text style={styles.materialTitle}>{alloc.itemName}</Text>
                          <Text style={styles.materialCode}>#{alloc.itemCode}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: mStatus.bg }]}>
                          <Text style={[styles.badgeText, { color: mStatus.text }]}>
                            {alloc.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.materialProgressRow}>
                        <Text style={styles.materialProgressLabel}>
                          {alloc.quantityReceived}/{alloc.quantityAllocated} {alloc.unit} delivered
                        </Text>
                        <Text style={styles.materialProgressPct}>{receivedPct}%</Text>
                      </View>
                      <View style={styles.materialTrack}>
                        <View style={[styles.materialFill, {
                          width: `${receivedPct}%`,
                          backgroundColor: receivedPct === 100 ? D.green : D.blue,
                        }]} />
                      </View>

                      <View style={styles.materialDetails}>
                        {[
                          { label: 'Allocated',  value: `${alloc.quantityAllocated} ${alloc.unit}` },
                          { label: 'Received',   value: `${alloc.quantityReceived} ${alloc.unit}` },
                          { label: 'Remaining',  value: `${alloc.quantityRemaining} ${alloc.unit}` },
                        ].map((row) => (
                          <View key={row.label} style={styles.materialDetailRow}>
                            <Text style={styles.materialDetailLabel}>{row.label}</Text>
                            <Text style={styles.materialDetailValue}>{row.value}</Text>
                          </View>
                        ))}
                      </View>

                      {alloc.notes ? (
                        <View style={styles.materialNotes}>
                          <Text style={styles.materialNotesText}>{alloc.notes}</Text>
                        </View>
                      ) : null}
                    </AnimatedCard>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCenter}>
                <Package size={48} color={D.inkLight} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No materials allocated yet</Text>
                <Text style={styles.emptySub}>Material delivery status will appear here</Text>
              </View>
            )}
          </AnimatedView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },

  header: {
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.hairline,
    paddingHorizontal: 20, paddingBottom: 0,
  },
  headerTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  headerActions:   { flexDirection: 'row', gap: 8 },
  headerTitleBlock: { marginBottom: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  statusDot:          { width: 6, height: 6, borderRadius: 3 },
  statusText:         { fontSize: 10, fontWeight: '700', color: D.inkMid, letterSpacing: 0.8 },
  headerTitle:        { fontSize: 22, fontWeight: '700', color: D.ink, letterSpacing: -0.4, lineHeight: 28, marginBottom: 6 },
  headerLocation:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerLocationText: { fontSize: 12, color: D.inkLight },

  headerProgressBlock:    { paddingBottom: 14 },
  headerProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  headerProgressLabel:    { fontSize: 11, color: D.inkLight, fontWeight: '500' },
  headerProgressPct:      { fontSize: 11, fontWeight: '700', color: D.ink },
  headerProgressTrack:    { height: 4, backgroundColor: D.hairline, borderRadius: 2, overflow: 'hidden' },
  headerProgressFill:     { height: '100%', backgroundColor: D.blue, borderRadius: 2 },

  tabBar:      { backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.hairline },
  tabBarInner: { paddingHorizontal: 20, flexDirection: 'row' },
  tab: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: D.ink },
  tabText:       { fontSize: 13, fontWeight: '500', color: D.inkLight },
  tabTextActive: { color: D.ink, fontWeight: '700' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline,
    borderLeftWidth: 3, borderRadius: 10,
    padding: 14,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '700', color: D.inkLight,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8,
    marginBottom: 12,
  },
  statCell:      { flex: 1, alignItems: 'center' },
  statCellValue: { fontSize: 13, fontWeight: '700', color: D.ink, marginBottom: 2 },
  statCellLabel: { fontSize: 10, color: D.inkLight, fontWeight: '500', textAlign: 'center' },
  statsDivider:  { width: 1, height: 28, backgroundColor: D.hairline },

  paymentChip: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  paymentChipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  paymentChipSub: { fontSize: 11, fontWeight: '600', marginTop: 3, opacity: 0.9 },

  detailRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detailText: { flex: 1, fontSize: 13, color: D.inkMid, lineHeight: 19 },

  teamRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  teamRowBorder: { borderBottomWidth: 1, borderBottomColor: D.hairline },
  teamAvatar:    { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  teamInfo:      { flex: 1 },
  teamName:      { fontSize: 13, fontWeight: '600', color: D.ink, marginBottom: 1 },
  teamRole:      { fontSize: 11, color: D.inkLight },

  listGap: { gap: 10 },

  materialCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, padding: 14,
  },
  materialTitleRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  materialTitleBlock:    { flex: 1 },
  materialTitle:         { fontSize: 14, fontWeight: '700', color: D.ink, marginBottom: 2 },
  materialCode:          { fontSize: 11, color: D.inkLight },
  materialProgressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  materialProgressLabel: { fontSize: 11, color: D.inkLight },
  materialProgressPct:   { fontSize: 11, fontWeight: '700', color: D.ink },
  materialTrack:         { height: 4, backgroundColor: D.hairline, borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  materialFill:          { height: '100%', borderRadius: 2 },
  materialDetails:       { gap: 8, borderTopWidth: 1, borderTopColor: D.hairline, paddingTop: 10 },
  materialDetailRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  materialDetailLabel:   { fontSize: 12, color: D.inkLight, fontWeight: '500' },
  materialDetailValue:   { fontSize: 12, color: D.inkMid, fontWeight: '600' },
  materialNotes:         { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: D.hairline },
  materialNotesText:     { fontSize: 12, color: D.inkLight, lineHeight: 17 },

  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle:  { fontSize: 15, fontWeight: '600', color: D.ink, marginTop: 10 },
  emptySub:    { fontSize: 12, color: D.inkLight, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  badge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  retryBtn:     { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  mb12: { marginBottom: 12 },
});

