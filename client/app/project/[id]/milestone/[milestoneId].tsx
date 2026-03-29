import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle, CheckCircle2, Clock3, Circle, Activity, Bug, MessageSquare } from 'lucide-react-native';
import { useProjectDetail, ProjectDetailMilestone, ProjectDetailTask } from '@/hooks/useProjectDetail';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';

const D = {
  ink: '#0F0F0E',
  inkMid: '#4A4845',
  inkLight: '#9A9691',
  chalk: '#FAFAF8',
  surface: '#FFFFFF',
  hairline: '#E8E5DF',
  blue: '#1D4ED8',
  green: '#2D7D52',
};

type Filter = 'all' | 'pending' | 'in-progress' | 'completed';

export default function MilestoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, milestoneId } = useLocalSearchParams<{ id: string; milestoneId: string }>();

  const { project, loading, error, refresh } = useProjectDetail(id as string);
  const [filter, setFilter] = useState<Filter>('all');

  const milestone: ProjectDetailMilestone | null = useMemo(() => {
    if (!project) return null;
    return project.milestones.find((m) => String(m.id) === String(milestoneId)) ?? null;
  }, [project, milestoneId]);

  const tasks: ProjectDetailTask[] = useMemo(() => {
    if (!milestone?.tasks) return [];
    if (filter === 'all') return milestone.tasks;
    return milestone.tasks.filter((t) => t.status === filter);
  }, [milestone, filter]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <LoadingState message="Loading milestone..." />
      </View>
    );
  }

  if (error || !project || !milestone) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <EmptyState icon={AlertCircle} title={error || 'Milestone not found'} />
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filterOptions: Filter[] = ['all', 'pending', 'in-progress', 'completed'];

  const formatMaybeDate = (value?: string | null) => {
    if (!value) return 'Not specified';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Not specified';
    if (d.getFullYear() <= 1971) return 'Not specified';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusIcon = (status: ProjectDetailTask['status']) => {
    if (status === 'completed') return <CheckCircle2 size={16} color={D.green} />;
    if (status === 'in-progress') return <Clock3 size={16} color={D.blue} />;
    return <Circle size={16} color={D.inkLight} />;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={D.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{milestone.name}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{project.name}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filterOptions.map((f) => {
          const active = filter === f;
          const label = f === 'all' ? 'All' : f === 'in-progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1);
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => router.push(`/project/${project.id}/task/${item.id}`)}
            activeOpacity={0.85}>
            <View style={styles.taskRow}>
              <View style={styles.taskLeft}>
                {statusIcon(item.status)}
              </View>
              <View style={styles.taskBody}>
                <View style={styles.taskTopRow}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.taskDue} numberOfLines={1}>{formatMaybeDate(item.dueDate)}</Text>
                </View>
                <Text style={styles.taskMeta} numberOfLines={1}>
                  {item.assignedTo || 'Unassigned'}
                </Text>
                <View style={styles.taskStatsRow}>
                  <View style={styles.statPill}>
                    <Activity size={12} color={D.blue} strokeWidth={2} />
                    <Text style={styles.statPillText}>{item.progressUpdatesCount ?? 0}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Bug size={12} color="#C0392B" strokeWidth={2} />
                    <Text style={styles.statPillText}>{item.issuesCount ?? 0}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <MessageSquare size={12} color="#B45309" strokeWidth={2} />
                    <Text style={styles.statPillText}>{item.requestUpdatesCount ?? 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 40 }}>
            <EmptyState icon={AlertCircle} title="No tasks" subtitle="No tasks match the selected filter" />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },
  header: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: D.ink },
  headerSub: { fontSize: 12, color: D.inkLight, marginTop: 2 },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
  },
  filterChipActive: {
    backgroundColor: D.ink,
    borderColor: D.ink,
  },
  filterChipText: { fontSize: 12, color: D.inkMid, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF' },

  listContent: { padding: 16, paddingBottom: 30 },
  taskCard: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  taskRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  taskLeft: { width: 20, alignItems: 'center' },
  taskBody: { flex: 1 },
  taskTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  taskTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: D.ink, marginBottom: 4 },
  taskDue: { fontSize: 11, color: D.inkLight, fontWeight: '600' },
  taskMeta: { fontSize: 11, color: D.inkLight, fontWeight: '500' },
  taskStatsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
  },
  statPillText: { fontSize: 11, fontWeight: '800', color: D.inkMid },

  retryBtn: { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});

