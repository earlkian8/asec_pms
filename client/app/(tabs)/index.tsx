import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useDashboard, DashboardProject } from '@/hooks/useDashboard';
import { useBillings } from '@/hooks/useBillings';
import {
  Briefcase, CheckCircle, Clock, Receipt,
  AlertCircle, Bell, ArrowRight,
} from 'lucide-react-native';
import NotificationCenter from '@/components/NotificationCenter';
import AnimatedView from '@/components/AnimatedView';
import ProjectCard from '@/components/cards/ProjectCard';
import BillingCard from '@/components/cards/BillingCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { formatCurrency } from '@/utils/formatCurrency';
import { useDialog } from '@/contexts/DialogContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:      '#0F0F0E',
  inkMid:   '#4A4845',
  inkLight: '#9A9691',
  chalk:    '#FAFAF8',
  surface:  '#FFFFFF',
  hairline: '#E8E5DF',
  green:    '#2D7D52',
  greenBg:  '#EDF7F2',
  red:      '#C0392B',
  redBg:    '#FDF1F0',
  blue:     '#1D4ED8',
  blueBg:   '#EEF2FF',
  amber:    '#B45309',
  amberBg:  '#FFFBEB',
};

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, value, label, accent }: {
  icon: any; value: string | number; label: string; accent: string;
}) {
  return (
    <View style={[styles.statChip, { borderLeftColor: accent }]}>
      <View style={[styles.statChipIcon, { backgroundColor: accent + '18' }]}>
        <Icon size={13} color={accent} strokeWidth={2.5} />
      </View>
      <View>
        <Text style={styles.statChipValue}>{value}</Text>
        <Text style={[styles.statChipLabel, { color: D.inkLight }]}>{label}</Text>
      </View>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See all</Text>
          <ArrowRight size={12} color={D.ink} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Billing pill ──────────────────────────────────────────────────────────────
function BillingPill({ label, count, color, bg }: {
  label: string; count: number; color: string; bg: string;
}) {
  return (
    <View style={[styles.billingPill, { backgroundColor: bg }]}>
      <Text style={[styles.billingPillCount, { color }]}>{count}</Text>
      <Text style={[styles.billingPillLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, displayBillingModule } = useAuth();
  const { unreadCount, refreshNotifications } = useApp();
  const { statistics, projects, loading, error, refresh } = useDashboard();
  const { billings, loading: billingsLoading, refresh: refreshBillings } = useBillings({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const dialog   = useDialog();

  const [refreshing,       setRefreshing]       = useState(false);
  const [showNotifications,setShowNotifications] = useState(false);

  const activeProjects  = projects.filter((p) => p.status === 'active');
  const recentProjects  = activeProjects.slice(0, 3);
  const recentBillings  = billings.slice(0, 5);

  const billingStats = React.useMemo(() => {
    const unpaid  = billings.filter((b) => b.status === 'unpaid').length;
    const partial = billings.filter((b) => b.status === 'partial').length;
    const paid    = billings.filter((b) => b.status === 'paid').length;
    const totalUnpaid = billings
      .filter((b) => b.status === 'unpaid' || b.status === 'partial')
      .reduce((sum, b) => sum + b.remaining_amount, 0);
    const overdue = billings.filter((b) => {
      if (!b.due_date) return false;
      const dueDate = new Date(b.due_date);
      const today   = new Date();
      today.setHours(0, 0, 0, 0);
      return (b.status === 'unpaid' || b.status === 'partial') && dueDate < today;
    }).length;
    return { unpaid, partial, paid, totalUnpaid, overdue };
  }, [billings]);

  const getProjectPaymentStatus = (projectId: string) => {
    const projectBillings = billings.filter((b) => b.project.id.toString() === projectId.toString());
    if (projectBillings.length === 0) return null;
    const hasUnpaid  = projectBillings.some((b) => b.status === 'unpaid');
    const hasPartial = projectBillings.some((b) => b.status === 'partial');
    const totalUnpaid = projectBillings
      .filter((b) => b.status === 'unpaid' || b.status === 'partial')
      .reduce((sum, b) => sum + b.remaining_amount, 0);
    if (hasUnpaid)  return { status: 'unpaid'  as const, amount: totalUnpaid };
    if (hasPartial) return { status: 'partial' as const, amount: totalUnpaid };
    return { status: 'paid' as const, amount: 0 };
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshBillings(), refreshNotifications()]);
    setRefreshing(false);
  }, [refresh, refreshBillings, refreshNotifications]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
        }>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>Good day,</Text>
            <Text style={styles.headerName} numberOfLines={1}>{user?.name || 'Client'}</Text>
            <Text style={styles.headerCompany} numberOfLines={1}>{user?.company || ''}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => setShowNotifications(true)}>
            <Bell size={19} color={D.ink} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {loading && !statistics && <LoadingState message="Loading dashboard..." />}

        {!loading && !statistics && error ? (
          <View style={{ marginTop: 18 }}>
            <EmptyState
              icon={AlertCircle}
              title="Dashboard unavailable"
              subtitle={error}
            />
            <TouchableOpacity
              style={{
                marginTop: 14,
                alignSelf: 'center',
                backgroundColor: D.ink,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
              }}
              onPress={onRefresh}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {statistics && (
          <>
            {/* ── Project stat chips — counts only, no financials ─────────── */}
            <AnimatedView delay={80}>
              <View style={styles.statsRow}>
                <StatChip icon={Briefcase}   value={statistics.activeProjects}    label="Active"    accent={D.blue}  />
                <View style={styles.statDiv} />
                <StatChip icon={CheckCircle} value={statistics.completedProjects} label="Completed" accent={D.green} />
                <View style={styles.statDiv} />
                <StatChip icon={Clock}       value={statistics.onTimeProjects}    label="On Time"   accent={D.amber} />
              </View>
            </AnimatedView>

            {/* ── Billing summary ──────────────────────────────────────────── */}
            {displayBillingModule && (
              <AnimatedView delay={140}>
                <View style={styles.billingCard}>
                  <View style={styles.billingCardHeader}>
                    <View style={styles.billingCardTitleRow}>
                      <Receipt size={14} color={D.inkMid} strokeWidth={2} />
                      <Text style={styles.billingCardTitle}>Billing Summary</Text>
                    </View>
                    {billingStats.overdue > 0 && (
                      <View style={styles.overdueChip}>
                        <AlertCircle size={11} color={D.red} strokeWidth={2.5} />
                        <Text style={styles.overdueText}>{billingStats.overdue} overdue</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.billingPillsRow}>
                    <BillingPill label="Unpaid"  count={billingStats.unpaid}  color={D.red}   bg={D.redBg}   />
                    <BillingPill label="Partial" count={billingStats.partial} color={D.amber} bg={D.amberBg} />
                    <BillingPill label="Paid"    count={billingStats.paid}    color={D.green} bg={D.greenBg} />
                  </View>

                  {billingStats.totalUnpaid > 0 && (
                    <View style={styles.billingOutstanding}>
                      <Text style={styles.billingOutstandingLabel}>Outstanding</Text>
                      <Text style={styles.billingOutstandingValue}>
                        {formatCurrency(billingStats.totalUnpaid)}
                      </Text>
                    </View>
                  )}
                </View>
              </AnimatedView>
            )}

            {/* ── Recent billings ──────────────────────────────────────────── */}
            {displayBillingModule && (
              <AnimatedView delay={200}>
                <View style={styles.section}>
                  <SectionHeader title="Recent Billings" onSeeAll={() => router.push('/(tabs)/billings')} />
                  {billingsLoading ? (
                    <LoadingState message="Loading billings..." />
                  ) : recentBillings.length > 0 ? (
                    recentBillings.map((billing, index) => (
                      <BillingCard
                        key={billing.id}
                        billing={billing}
                        index={index}
                        onPress={() => router.push(`/billing-detail?id=${billing.id}`)}
                      />
                    ))
                  ) : (
                    <EmptyState icon={Receipt} title="No recent billings" iconSize={40} />
                  )}
                </View>
              </AnimatedView>
            )}

            {/* ── Active projects ──────────────────────────────────────────── */}
            <AnimatedView delay={260}>
              <View style={styles.section}>
                <SectionHeader title="Active Projects" onSeeAll={() => router.push('/(tabs)/projects')} />
                {recentProjects.length > 0 ? (
                  recentProjects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={{
                        id: project.id,
                        name: project.name,
                        location: project.location,
                        status: project.status,
                        progress: project.progress,
                        expectedCompletion: project.expectedCompletion,
                        budget: project.budget,
                        spent: project.spent,
                        projectManager: project.projectManager,
                      }}
                      index={index}
                      onPress={() => router.push(`/project/${project.id}`)}
                      paymentStatus={getProjectPaymentStatus(project.id)}
                    />
                  ))
                ) : (
                  <EmptyState icon={Briefcase} title="No active projects" iconSize={40} />
                )}
              </View>
            </AnimatedView>
          </>
        )}
      </ScrollView>
      <NotificationCenter
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: D.chalk },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLeft:    { flex: 1, marginRight: 12 },
  headerGreeting:{ fontSize: 12, color: D.inkLight, fontWeight: '500', letterSpacing: 0.3, marginBottom: 2 },
  headerName:    { fontSize: 24, fontWeight: '700', color: D.ink, letterSpacing: -0.5, lineHeight: 28 },
  headerCompany: { fontSize: 12, color: D.inkMid, marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: D.red, borderRadius: 8,
    minWidth: 17, height: 17,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: D.chalk,
  },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12,
    marginBottom: 14, alignItems: 'center',
  },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, paddingLeft: 10, gap: 8,
  },
  statChipIcon: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  statChipValue: { fontSize: 17, fontWeight: '700', color: D.ink, lineHeight: 20 },
  statChipLabel: { fontSize: 10, fontWeight: '500' },
  statDiv: { width: 1, height: 32, backgroundColor: D.hairline, marginHorizontal: 8 },

  billingCard: {
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, padding: 14, marginBottom: 22,
  },
  billingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  billingCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  billingCardTitle:    { fontSize: 13, fontWeight: '700', color: D.ink },
  overdueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.redBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  overdueText: { fontSize: 10, fontWeight: '600', color: D.red },
  billingPillsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  billingPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  billingPillCount: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  billingPillLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginTop: 1 },
  billingOutstanding: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: D.hairline, paddingTop: 10,
  },
  billingOutstandingLabel: { fontSize: 12, fontWeight: '600', color: D.inkMid },
  billingOutstandingValue: { fontSize: 15, fontWeight: '700', color: D.red },

  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar:   { width: 3, height: 16, backgroundColor: D.ink, borderRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: D.ink },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText:   { fontSize: 12, fontWeight: '600', color: D.ink },
});