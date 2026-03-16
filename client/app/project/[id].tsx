import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, RefreshControl, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FIRM_CONTACT } from '@/constants/contact';
import { Ionicons } from '@expo/vector-icons';
import {
  Mail, MessageSquare, AlertCircle, MapPin, FileText,
  ArrowLeft, MessageCircle, Package,
} from 'lucide-react-native';
import RequestUpdateModal from '@/components/RequestUpdateModal';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import AnimatedView from '@/components/AnimatedView';
import AnimatedCard from '@/components/AnimatedCard';
import MilestoneCard from '@/components/cards/MilestoneCard';
import UpdateCard from '@/components/cards/UpdateCard';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppColors } from '@/constants/colors';
import { getRoleIcon, getProjectStatusColors } from '@/utils/statusHelpers';
import { useDialog } from '@/contexts/DialogContext';

const { width } = Dimensions.get('window');

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
const TABS = ['overview', 'milestones', 'updates', 'issues', 'materials'] as const;
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
  const dialog  = useDialog();

  const [refreshing,        setRefreshing]        = useState(false);
  const [showRequestUpdate, setShowRequestUpdate] = useState(false);
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

  const handleContact = async () => {
    const emailUrl = `mailto:${FIRM_CONTACT.email}?subject=Project Update Request: ${project.name}`;
    dialog.showConfirm(
      `Would you like to email ${project.projectManager}?\n\nEmail: ${FIRM_CONTACT.email}`,
      async () => {
        try {
          const canOpen = await Linking.canOpenURL(emailUrl);
          if (canOpen) await Linking.openURL(emailUrl);
          else dialog.showError('Unable to open email client');
        } catch { dialog.showError('Failed to open email client'); }
      },
      'Contact Project Manager', 'Email', 'Cancel'
    );
  };

  const statusMeta = getProjectStatusColors(project.status);

  // Material status color map
  const MATERIAL_STATUS: Record<string, { bg: string; text: string }> = {
    received: { bg: D.greenBg, text: D.green },
    partial:  { bg: D.amberBg, text: D.amber },
    pending:  { bg: '#F0EFED', text: D.inkMid },
  };

  // Issue color maps
  const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    high:   { bg: D.redBg,   text: D.red   },
    medium: { bg: D.amberBg, text: D.amber },
    low:    { bg: D.blueBg,  text: D.blue  },
  };
  const ISSUE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    open:          { bg: D.redBg,   text: D.red   },
    'in-progress': { bg: D.blueBg,  text: D.blue  },
    resolved:      { bg: D.greenBg, text: D.green },
    closed:        { bg: '#F0EFED', text: D.inkMid },
  };

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={D.ink} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleContact}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Mail size={17} color={D.inkMid} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: D.ink }]}
              onPress={() => setShowRequestUpdate(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MessageCircle size={17} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
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

        {/* Progress bar — % only, no money figures */}
        <View style={styles.headerProgressBlock}>
          <View style={styles.headerProgressLabelRow}>
            <Text style={styles.headerProgressLabel}>Overall Progress</Text>
            <Text style={styles.headerProgressPct}>{project.progress}%</Text>
          </View>
          <View style={styles.headerProgressTrack}>
            <View style={[styles.headerProgressFill, { width: `${project.progress}%` }]} />
          </View>
        </View>
      </View>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
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

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />}>

        {/* ════════════════════ OVERVIEW ═══════════════════════════════════ */}
        {selectedTab === 'overview' && (
          <AnimatedView delay={0}>

            {/* Compact stat strip — dates + contract value only */}
            <View style={styles.statsStrip}>
              <StatCell
                label="Contract Value"
                value={formatCurrency(project.budget)}
              />
              <View style={styles.statsDivider} />
              <StatCell
                label="Started"
                value={new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              />
              <View style={styles.statsDivider} />
              <StatCell
                label="Due"
                value={new Date(project.expectedCompletion).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              />
            </View>

            {/* Project details */}
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

            {/* Team members */}
            {project.teamMembers.length > 0 && (
              <SectionCard accentColor={D.purple} style={styles.mb12}>
                <CardLabel>Team</CardLabel>
                {project.teamMembers.map((member, i) => {
                  const roleIcon = getRoleIcon(member.role || '');
                  return (
                    <View key={member.id} style={[
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

        {/* ════════════════════ MILESTONES ══════════════════════════════════ */}
        {selectedTab === 'milestones' && (
          <AnimatedView delay={0}>
            {project.milestones.length > 0 ? (
              <View style={styles.listGap}>
                {project.milestones.map((milestone, index) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} index={index} />
                ))}
              </View>
            ) : (
              <EmptyState icon={AlertCircle} title="No milestones yet" />
            )}
          </AnimatedView>
        )}

        {/* ════════════════════ UPDATES ════════════════════════════════════ */}
        {selectedTab === 'updates' && (
          <AnimatedView delay={0}>
            {project.recentUpdates.length > 0 ? (
              <View style={styles.listGap}>
                {project.recentUpdates.map((update, index) => (
                  <UpdateCard key={update.id} update={update} index={index} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No updates yet"
                subtitle="Updates and progress reports will appear here"
                iconColor={D.inkLight}
              />
            )}
          </AnimatedView>
        )}

        {/* ════════════════════ ISSUES ═════════════════════════════════════ */}
        {selectedTab === 'issues' && (
          <AnimatedView delay={0}>
            {project.issues && project.issues.length > 0 ? (
              <View style={styles.listGap}>
                {project.issues.map((issue, index) => {
                  const priority = PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.medium;
                  const status   = ISSUE_STATUS_COLORS[issue.status] || ISSUE_STATUS_COLORS.open;
                  return (
                    <AnimatedCard
                      key={issue.id} index={index} delay={100}
                      style={StyleSheet.flatten([styles.issueCard])}>
                      <View style={styles.issueTitleRow}>
                        <Text style={styles.issueTitle} numberOfLines={2}>{issue.title}</Text>
                        <View style={[styles.badge, { backgroundColor: priority.bg }]}>
                          <Text style={[styles.badgeText, { color: priority.text }]}>
                            {issue.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.issueStatusRow}>
                        <View style={[styles.badge, { backgroundColor: status.bg }]}>
                          <Text style={[styles.badgeText, { color: status.text }]}>
                            {issue.status.replace('-', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {issue.description ? (
                        <Text style={styles.issueDesc}>{issue.description}</Text>
                      ) : null}
                      <View style={styles.issueMeta}>
                        <View style={styles.issueMetaItem}>
                          <Ionicons name="person-outline" size={12} color={D.inkLight} />
                          <Text style={styles.issueMetaText}>Reported by: {issue.reportedBy}</Text>
                        </View>
                        {issue.dueDate && (
                          <View style={styles.issueMetaItem}>
                            <Ionicons name="calendar-outline" size={12} color={D.inkLight} />
                            <Text style={styles.issueMetaText}>
                              Due {new Date(issue.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                        {issue.resolvedAt && (
                          <View style={styles.issueMetaItem}>
                            <Ionicons name="checkmark-circle-outline" size={12} color={D.green} />
                            <Text style={[styles.issueMetaText, { color: D.green }]}>
                              Resolved {new Date(issue.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                      </View>
                    </AnimatedCard>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCenter}>
                <Ionicons name="checkmark-circle-outline" size={48} color={D.inkLight} />
                <Text style={styles.emptyTitle}>No issues reported</Text>
                <Text style={styles.emptySub}>All issues have been resolved</Text>
              </View>
            )}
          </AnimatedView>
        )}

        {/* ════════════════════ MATERIALS ══════════════════════════════════ */}
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
                      key={alloc.id} index={index} delay={100}
                      style={StyleSheet.flatten([styles.materialCard])}>
                      {/* Title + status */}
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

                      {/* Delivery progress — quantities only, no price */}
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

                      {/* Quantities only — unit price and total cost hidden from client */}
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

      <RequestUpdateModal
        visible={showRequestUpdate}
        onClose={() => setShowRequestUpdate(false)}
        projectId={project.id}
        projectName={project.name}
        projectManager={project.projectManager}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },

  // Header
  header: {
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.hairline,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 0,
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
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
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

  // Tab bar
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

  // Section card
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

  // Stats strip
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

  // Detail rows
  detailRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detailText: { flex: 1, fontSize: 13, color: D.inkMid, lineHeight: 19 },

  // Team
  teamRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  teamRowBorder: { borderBottomWidth: 1, borderBottomColor: D.hairline },
  teamAvatar:    { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  teamInfo:      { flex: 1 },
  teamName:      { fontSize: 13, fontWeight: '600', color: D.ink, marginBottom: 1 },
  teamRole:      { fontSize: 11, color: D.inkLight },

  listGap: { gap: 10 },

  // Issue card
  issueCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 10, padding: 14,
  },
  issueTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 8, marginBottom: 6,
  },
  issueTitle:    { flex: 1, fontSize: 15, fontWeight: '700', color: D.ink },
  issueStatusRow:{ marginBottom: 8 },
  issueDesc:     { fontSize: 12, color: D.inkMid, lineHeight: 17, marginBottom: 10 },
  issueMeta:     { gap: 5 },
  issueMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  issueMetaText: { fontSize: 11, color: D.inkLight },

  badge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // Material card
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

  // Empty states
  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle:  { fontSize: 15, fontWeight: '600', color: D.ink, marginTop: 10 },
  emptySub:    { fontSize: 12, color: D.inkLight, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  retryBtn:     { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  mb12: { marginBottom: 12 },
});