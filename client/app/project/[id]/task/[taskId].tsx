import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, Activity, MessageSquare, Bug, FileText } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import RequestUpdateModal from '@/components/RequestUpdateModal';

const D = {
  ink: '#0F0F0E',
  inkMid: '#4A4845',
  inkLight: '#9A9691',
  chalk: '#FAFAF8',
  surface: '#FFFFFF',
  hairline: '#E8E5DF',
  blue: '#1D4ED8',
  blueBg: '#EEF2FF',
  green: '#2D7D52',
  greenBg: '#EDF7F2',
  red: '#C0392B',
  redBg: '#FDF1F0',
  amber: '#B45309',
  amberBg: '#FFFBEB',
};

const TABS = ['progress', 'issues', 'requests'] as const;
type Tab = typeof TABS[number];

export default function TaskDetailScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const { data, loading, error, refresh } = useTaskDetail(taskId as string);

  const [tab, setTab] = useState<Tab>('progress');
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const headerTitle = data?.task?.name ?? 'Task';
  const headerSub = useMemo(() => {
    if (!data) return '';
    return `${data.project.name} · ${data.milestone.name}`;
  }, [data]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <LoadingState message="Loading task..." />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <EmptyState icon={AlertCircle} title={error || 'Task not found'} />
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const priorityColors: Record<string, { bg: string; text: string }> = {
    high: { bg: D.redBg, text: D.red },
    critical: { bg: D.redBg, text: D.red },
    medium: { bg: D.amberBg, text: D.amber },
    low: { bg: D.blueBg, text: D.blue },
  };

  const issueStatusColors: Record<string, { bg: string; text: string }> = {
    open: { bg: D.redBg, text: D.red },
    'in-progress': { bg: D.blueBg, text: D.blue },
    in_progress: { bg: D.blueBg, text: D.blue },
    resolved: { bg: D.greenBg, text: D.green },
    closed: { bg: '#F0EFED', text: D.inkMid },
  };

  const isProbablyImage = (mime?: string | null, nameOrPath?: string | null) => {
    if (mime && mime.startsWith('image/')) return true;
    const n = (nameOrPath || '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some((ext) => n.endsWith(ext));
  };
  const isPdf = (mime?: string | null, nameOrPath?: string | null) => {
    if (mime && mime.includes('pdf')) return true;
    const n = (nameOrPath || '').toLowerCase();
    return n.endsWith('.pdf');
  };
  const isDoc = (mime?: string | null, nameOrPath?: string | null) => {
    const n = (nameOrPath || '').toLowerCase();
    if (mime && (mime.includes('word') || mime.includes('officedocument'))) return true;
    return n.endsWith('.doc') || n.endsWith('.docx');
  };
  const openAttachment = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={D.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{headerSub}</Text>
        </View>
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={() => setShowRequestModal(true)}>
          <MessageSquare size={16} color="#FFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'progress' ? 'Progress' : t === 'issues' ? 'Issues' : 'Requests'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />}>

        {tab === 'progress' && (
          <View style={styles.section}>
            {data.progressUpdates.length > 0 ? (
              <View style={styles.listGap}>
                {data.progressUpdates.map((u) => (
                  <View key={u.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconPill, { backgroundColor: D.blueBg }]}>
                        <Activity size={14} color={D.blue} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{u.author}</Text>
                        <Text style={styles.cardSub}>
                          {new Date(u.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardBody}>{u.description || '(No description)'}</Text>
                    {u.file?.url ? (
                      <View style={styles.attachmentBox}>
                        {isProbablyImage(u.file.type, u.file.name || u.file.path) ? (
                          <TouchableOpacity activeOpacity={0.9} onPress={() => openAttachment(u.file!.url!)}>
                            <Image
                              source={{ uri: u.file.url }}
                              style={styles.attachmentImage}
                              contentFit="cover"
                              transition={150}
                            />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.attachmentRow} activeOpacity={0.85} onPress={() => openAttachment(u.file!.url!)}>
                            <View style={[
                              styles.fileBadge,
                              isPdf(u.file.type, u.file.name || u.file.path) ? styles.fileBadgePdf :
                              isDoc(u.file.type, u.file.name || u.file.path) ? styles.fileBadgeDoc :
                              styles.fileBadgeFile,
                            ]}>
                              <Text style={styles.fileBadgeText}>
                                {isPdf(u.file.type, u.file.name || u.file.path) ? 'PDF' : isDoc(u.file.type, u.file.name || u.file.path) ? 'DOC' : 'FILE'}
                              </Text>
                            </View>
                            <FileText size={16} color={D.inkMid} strokeWidth={2} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.attachmentName} numberOfLines={1}>
                                {u.file.name || 'Attachment'}
                              </Text>
                              <Text style={styles.attachmentSub} numberOfLines={1}>
                                Tap to open
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState icon={Activity} title="No progress updates yet" subtitle="Progress updates will appear here" />
            )}
          </View>
        )}

        {tab === 'issues' && (
          <View style={styles.section}>
            {data.issues.length > 0 ? (
              <View style={styles.listGap}>
                {data.issues.map((issue) => {
                  const pr = priorityColors[issue.priority] || priorityColors.medium;
                  const st = issueStatusColors[issue.status] || issueStatusColors.open;
                  return (
                    <View key={issue.id} style={styles.card}>
                      <View style={styles.issueTitleRow}>
                        <Text style={styles.issueTitle} numberOfLines={2}>{issue.title}</Text>
                        <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                          <Text style={[styles.badgeText, { color: pr.text }]}>
                            {(issue.priority || 'medium').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.issueStatusRow}>
                        <View style={[styles.badge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.badgeText, { color: st.text }]}>
                            {String(issue.status).replace('-', ' ').replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {issue.description ? <Text style={styles.cardBody}>{issue.description}</Text> : null}
                      <Text style={styles.issueMeta}>
                        Reported by {issue.reportedBy} · Assigned to {issue.assignedTo}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <EmptyState icon={Bug} title="No issues reported" subtitle="Issues linked to this task will appear here" />
            )}
          </View>
        )}

        {tab === 'requests' && (
          <View style={styles.section}>
            {data.requestUpdates.length > 0 ? (
              <View style={styles.listGap}>
                {data.requestUpdates.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconPill, { backgroundColor: D.amberBg }]}>
                        <MessageSquare size={14} color={D.amber} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{r.subject}</Text>
                        <Text style={styles.cardSub}>
                          {new Date(r.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardBody}>{r.message}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState icon={MessageSquare} title="No requests yet" subtitle="Your task-based update requests will appear here" />
            )}
          </View>
        )}
      </ScrollView>

      <RequestUpdateModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        taskId={data.task.id}
        taskName={data.task.name}
        projectId={data.project.id}
        projectName={data.project.name}
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
    paddingTop: 56,
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
  requestBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBar: { flexDirection: 'row', backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.hairline },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: D.ink },
  tabText: { fontSize: 12, color: D.inkLight, fontWeight: '600' },
  tabTextActive: { color: D.ink, fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { paddingTop: 4 },
  listGap: { gap: 10 },
  card: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  iconPill: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: D.ink },
  cardSub: { fontSize: 11, color: D.inkLight, marginTop: 1 },
  cardBody: { fontSize: 12, color: D.inkMid, lineHeight: 17 },
  attachmentBox: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: '#F9FAFB',
  },
  attachmentImage: { width: '100%', height: 220, backgroundColor: '#F3F4F6' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  fileBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fileBadgePdf: { backgroundColor: D.redBg },
  fileBadgeDoc: { backgroundColor: D.blueBg },
  fileBadgeFile: { backgroundColor: '#F0EFED' },
  fileBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6, color: D.inkMid },
  attachmentName: { fontSize: 12, fontWeight: '700', color: D.ink },
  attachmentSub: { fontSize: 11, color: D.inkLight, marginTop: 2, fontWeight: '600' },

  issueTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  issueTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: D.ink },
  issueStatusRow: { marginBottom: 8 },
  issueMeta: { marginTop: 10, fontSize: 11, color: D.inkLight, fontWeight: '500' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  retryBtn: { backgroundColor: D.ink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});

