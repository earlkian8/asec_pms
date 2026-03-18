import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2, Clock, AlertCircle,
  Calendar, FileText, ArrowRight, BarChart3,
} from 'lucide-react-native';
import { D, AppColors, getStatusColor, getStatusBg } from '@/utils/colors';
import { formatDate, isOverdue, getDaysUntilDue } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Task } from '@/types';
import AnimatedView from '@/components/AnimatedView';
import Logo from '@/components/Logo';

interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  critical: number;
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function StatChip({
  icon: Icon, value, label, accent, bg,
}: {
  icon: any; value: number; label: string; accent: string; bg: string;
}) {
  return (
    <View style={[styles.statChip, { borderLeftColor: accent }]}>
      <View style={[styles.statChipIcon, { backgroundColor: bg }]}>
        <Icon size={13} color={accent} strokeWidth={2.5} />
      </View>
      <View>
        <Text style={styles.statChipValue}>{value}</Text>
        <Text style={styles.statChipLabel}>{label}</Text>
      </View>
    </View>
  );
}

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

// ── Main screen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    total: 0, pending: 0, inProgress: 0,
    completed: 0, overdue: 0, critical: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, tasksRes] = await Promise.all([
        apiService.get<DashboardStats>('/task-management/dashboard/statistics'),
        apiService.get<Task[]>('/task-management/dashboard/upcoming-tasks?limit=5'),
      ]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (tasksRes.success && tasksRes.data)
        setUpcomingTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={D.ink} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />
      }>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'User'}</Text>
        </View>
        <Logo width={120} height={30} />
      </View>

      {/* ── Stat chips ─────────────────────────────────────────────────────── */}
      <AnimatedView delay={80}>
        <View style={styles.statsRow}>
          <StatChip icon={BarChart3}    value={stats.total}      label="Total"     accent={D.blue}  bg={D.blueBg}  />
          <View style={styles.statDiv} />
          <StatChip icon={Clock}        value={stats.inProgress} label="In Progress" accent={D.amber} bg={D.amberBg} />
          <View style={styles.statDiv} />
          <StatChip icon={CheckCircle2} value={stats.completed}  label="Done"      accent={D.green} bg={D.greenBg} />
        </View>
      </AnimatedView>

      {/* ── Overdue / critical alert ────────────────────────────────────────── */}
      {(stats.overdue > 0 || stats.critical > 0) && (
        <AnimatedView delay={140}>
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(tabs)/tasks')}
            activeOpacity={0.8}>
            <View style={styles.alertIconWrap}>
              <AlertCircle size={16} color={D.red} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              {stats.overdue > 0 && (
                <Text style={styles.alertText}>
                  <Text style={styles.alertCount}>{stats.overdue}</Text> overdue task{stats.overdue !== 1 ? 's' : ''}
                </Text>
              )}
              {stats.critical > 0 && (
                <Text style={styles.alertText}>
                  <Text style={styles.alertCount}>{stats.critical}</Text> critical task{stats.critical !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <ArrowRight size={14} color={D.red} strokeWidth={2.5} />
          </TouchableOpacity>
        </AnimatedView>
      )}

      {/* ── Upcoming tasks ──────────────────────────────────────────────────── */}
      <AnimatedView delay={200}>
        <View style={styles.section}>
          <SectionHeader title="Upcoming Tasks" onSeeAll={() => router.push('/(tabs)/tasks')} />

          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task, idx) => {
              const statusColor = getStatusColor(task.status);
              const statusBg    = getStatusBg(task.status);
              const overdue     = task.dueDate && isOverdue(task.dueDate);
              const daysUntil   = task.dueDate ? getDaysUntilDue(task.dueDate) : null;

              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => router.push(`/task-detail?id=${task.id}`)}
                  activeOpacity={0.7}>

                  {/* left accent bar */}
                  <View style={[styles.taskAccentBar, { backgroundColor: statusColor }]} />

                  <View style={styles.taskCardInner}>
                    <View style={styles.taskCardTop}>
                      <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusPillText, { color: statusColor }]}>
                          {task.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {task.description ? (
                      <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                    ) : null}

                    <View style={styles.taskMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={12} color={overdue ? D.red : D.inkLight} strokeWidth={2} />
                        <Text style={[styles.metaText, overdue && { color: D.red, fontWeight: '600' }]}>
                          {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                          {overdue ? ' · Overdue' : (daysUntil !== null && daysUntil <= 3 && daysUntil > 0 ? ` · ${daysUntil}d left` : '')}
                        </Text>
                      </View>
                      <Text style={styles.taskProject} numberOfLines={1}>{task.projectName}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={32} color={D.green} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No upcoming tasks</Text>
            </View>
          )}
        </View>
      </AnimatedView>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <AnimatedView delay={260}>
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/tasks')}
              activeOpacity={0.7}>
              <View style={[styles.quickIcon, { backgroundColor: D.blueBg }]}>
                <FileText size={18} color={D.blue} strokeWidth={2} />
              </View>
              <Text style={styles.quickLabel}>All Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/history')}
              activeOpacity={0.7}>
              <View style={[styles.quickIcon, { backgroundColor: D.greenBg }]}>
                <CheckCircle2 size={18} color={D.green} strokeWidth={2} />
              </View>
              <Text style={styles.quickLabel}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedView>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: D.chalk },
  center:  { justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  // Header
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 12, color: D.inkLight, fontWeight: '500', letterSpacing: 0.3, marginBottom: 2 },
  userName: { fontSize: 24, fontWeight: '700', color: D.ink, letterSpacing: -0.5, lineHeight: 28 },

  // Stat chips row
  statsRow: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 12,
    marginBottom: 14, alignItems: 'center',
  },
  statChip:      { flex: 1, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 10, gap: 8 },
  statChipIcon:  { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  statChipValue: { fontSize: 17, fontWeight: '700', color: D.ink, lineHeight: 20 },
  statChipLabel: { fontSize: 10, fontWeight: '500', color: D.inkLight },
  statDiv:       { width: 1, height: 32, backgroundColor: D.hairline, marginHorizontal: 8 },

  // Alert card
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, borderWidth: 1, borderColor: '#FCCAC3',
    borderRadius: 10, padding: 12, marginBottom: 20,
  },
  alertIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: D.redBg, justifyContent: 'center', alignItems: 'center',
  },
  alertText:  { fontSize: 13, color: D.inkMid, lineHeight: 18 },
  alertCount: { fontWeight: '700', color: D.red },

  // Section
  section:           { marginBottom: 8 },
  sectionHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar:        { width: 3, height: 16, backgroundColor: D.ink, borderRadius: 2 },
  sectionTitle:      { fontSize: 15, fontWeight: '700', color: D.ink },
  seeAllBtn:         { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText:        { fontSize: 12, fontWeight: '600', color: D.ink },

  // Task card
  taskCard: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline, borderRadius: 12,
    marginBottom: 10, overflow: 'hidden',
  },
  taskAccentBar:  { width: 4 },
  taskCardInner:  { flex: 1, padding: 14 },
  taskCardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  taskTitle:      { flex: 1, fontSize: 14, fontWeight: '700', color: D.ink, lineHeight: 20 },
  statusPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  taskDesc:       { fontSize: 12, color: D.inkMid, lineHeight: 17, marginBottom: 10 },
  taskMeta:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:       { fontSize: 11, color: D.inkLight, fontWeight: '500' },
  taskProject:    { fontSize: 11, color: D.inkLight, fontWeight: '500', maxWidth: 120 },

  // Empty
  emptyCard:     { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: D.ink, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: D.inkLight, marginTop: 4 },

  // Quick actions
  quickRow:    { flexDirection: 'row', gap: 10 },
  quickCard:   { flex: 1, backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  quickIcon:   { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  quickLabel:  { fontSize: 12, fontWeight: '600', color: D.ink },
});