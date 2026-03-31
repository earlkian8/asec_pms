import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Pencil, Calendar, User, ChevronDown, X } from 'lucide-react-native';
import { D, getStatusColor, getStatusBg } from '@/utils/colors';
import { apiService } from '@/services/api';
import { formatDate, isOverdue } from '@/utils/dateUtils';

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
type ToastState = { message: string; type: ToastType; id: number } | null;
function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, id: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);
  return { toast, show };
}
function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const bg = toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6';
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ';
  return (
    <Animated.View key={toast.id} entering={FadeInDown.springify().damping(14)} exiting={FadeOutUp.duration(200)}
      style={[toastSt.wrap, { backgroundColor: bg }]}>
      <Text style={toastSt.icon}>{icon}</Text>
      <Text style={toastSt.msg} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}
const toastSt = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 8 },
  icon: { fontSize: 14, color: '#fff', fontWeight: '900' },
  msg:  { fontSize: 13, color: '#fff', fontWeight: '700', flex: 1 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  const opacity = useSharedValue(1);
  useEffect(() => { opacity.value = withTiming(0.4, { duration: 700 }, () => { opacity.value = withTiming(1, { duration: 700 }); }); }, []);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[skelSt.card, s]}>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[skelSt.line, { width: '55%' }]} />
        <View style={[skelSt.line, { width: '35%', height: 8 }]} />
        <View style={[skelSt.line, { width: '70%', height: 6, marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
}
const skelSt = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E5DF', borderRadius: 12, padding: 14, marginBottom: 10 },
  line: { height: 12, borderRadius: 6, backgroundColor: '#E8E5DF' },
});

// ─── Reusable date picker field ───────────────────────────────────────────────
function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const toYMD = (v: string) => (v ? v.split('T')[0] : '');
  const ymd = toYMD(value);
  const dateObj = ymd ? new Date(ymd + 'T00:00:00') : new Date();
  const fmt = (d: string) => {
    const clean = toYMD(d);
    if (!clean) return 'Select date';
    try { return new Date(clean + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return clean; }
  };
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)} activeOpacity={0.75}>
        <Text style={[styles.dateBtnText, !ymd && { color: D.inkLight }]}>{fmt(value)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          value={dateObj}
          onChange={(_e, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) onChange(selected.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

type Task = {
  id: number;
  projectMilestoneId: number;
  title: string;
  description?: string | null;
  assignedTo?: number | null;
  assignedToName?: string | null;
  dueDate?: string | null;
  status: 'pending' | 'in_progress' | 'completed';
};

export default function MilestoneTasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { milestoneId, milestoneName, projectId } = useLocalSearchParams<{ milestoneId: string; milestoneName?: string; projectId?: string }>();
  const mid = Number(milestoneId || 0);
  const pid = Number(projectId || 0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Only users (not employees) can be assigned to tasks
  type TeamUser = { id: number; userId: number; name: string; role: string };
  const [teamMembers, setTeamMembers] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const loadTeamMembers = async () => {
    if (!pid) return;
    try {
      setTeamLoading(true);
      const res = await apiService.get<any[]>(`/task-management/projects/${pid}/team`);
      if (typeof res === 'object' && 'success' in res && res.success && res.data) {
        const users = (Array.isArray(res.data) ? res.data : [])
          .filter((m: any) => m.assignableType === 'user' && m.userId)
          .map((m: any) => ({ id: m.id, userId: m.userId, name: m.name, role: m.role }));
        setTeamMembers(users);
      }
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, [pid]);

  const { toast, show: showToast } = useToast();

  const loadTasks = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiService.get<Task[]>(`/task-management/milestones/${mid}/tasks`);
      if (typeof res === 'object' && 'success' in res && res.success && res.data) setTasks(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [mid]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setDesc('');
    setDueDate('');
    setAssignedTo(null);
    setModalOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setTitle(t.title || '');
    setDesc(t.description || '');
    setDueDate(t.dueDate || '');
    setAssignedTo(t.assignedTo ?? null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isEdit = !!editing;
    const payload = {
      title: title.trim(),
      description: desc.trim() ? desc.trim() : null,
      status: editing ? editing.status : 'pending',
      due_date: dueDate.trim() ? dueDate.trim() : null,
      assigned_to: assignedTo || null,
    };
    // Optimistic
    if (isEdit && editing) {
      setTasks(prev => prev.map(t => t.id === editing.id ? { ...t, ...payload, title: payload.title } : t));
    } else {
      const tempId = -Date.now();
      setTasks(prev => [...prev, { id: tempId, projectMilestoneId: mid, title: payload.title, description: payload.description, dueDate: payload.due_date, assignedTo: payload.assigned_to, assignedToName: null, status: 'pending' }]);
    }
    setModalOpen(false);
    setEditing(null);
    try {
      if (isEdit && editing) {
        await apiService.put(`/task-management/milestones/${mid}/tasks/${editing.id}`, payload);
      } else {
        await apiService.post(`/task-management/milestones/${mid}/tasks`, payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(isEdit ? 'Task updated' : 'Task added', 'success');
      loadTasks(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to save task', 'error');
      loadTasks(true);
    }
  };

  const remove = async (t: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTasks(prev => prev.filter(x => x.id !== t.id));
    try {
      await apiService.delete(`/task-management/milestones/${mid}/tasks/${t.id}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Task deleted', 'info');
      loadTasks(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to delete task', 'error');
      loadTasks(true);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (milestoneName) return decodeURIComponent(milestoneName);
    return 'Milestone';
  }, [milestoneName]);

  const renderItem = ({ item, index }: { item: Task; index: number }) => {
    const c = getStatusColor(item.status);
    const bg = getStatusBg(item.status);
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(14)}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/task-detail?id=${item.id}`); }}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>{item.description || 'No description'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.iconBtn} onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openEdit(item); }} activeOpacity={0.7}>
                <Pencil size={16} color={D.ink} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={(e) => { e.stopPropagation(); remove(item); }} activeOpacity={0.7}>
                <Trash2 size={16} color={D.red} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: bg, borderColor: c + '40' }]}>
              <Text style={[styles.badgeText, { color: c }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={12} color={D.inkLight} strokeWidth={2} />
              <Text style={[styles.metaText, item.dueDate && isOverdue(item.dueDate) && { color: D.red, fontWeight: '700' }]}>
                {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                {item.dueDate && isOverdue(item.dueDate) ? ' · Overdue' : ''}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <User size={12} color={D.inkLight} strokeWidth={2} />
              <Text style={styles.metaText} numberOfLines={1}>{item.assignedToName || 'Unassigned'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, { padding: 16, paddingTop: 80 }]}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={D.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openAdd(); }} style={styles.addBtn} activeOpacity={0.75}>
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySub}>Create the first task for this milestone.</Text>
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Task' : 'Add Task'}</Text>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={D.inkLight}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={D.inkLight}
              value={desc}
              onChangeText={setDesc}
              multiline
            />
            <DatePickerField label="Due Date" value={dueDate} onChange={setDueDate} />
            <Text style={styles.fieldLabel}>Assign To</Text>
            <TouchableOpacity
              style={styles.userPickerButton}
              onPress={() => setShowUserPicker(!showUserPicker)}
              activeOpacity={0.7}
            >
              <User size={14} color={D.inkMid} strokeWidth={2} />
              <Text style={[styles.userPickerText, !assignedTo && { color: D.inkLight }]}>
                {assignedTo
                  ? teamMembers.find(m => m.userId === assignedTo)?.name || `User #${assignedTo}`
                  : 'Unassigned'}
              </Text>
              <ChevronDown size={14} color={D.inkLight} strokeWidth={2} />
            </TouchableOpacity>
            {showUserPicker && (
              <View style={styles.userPickerDropdown}>
                <TouchableOpacity
                  style={[styles.userPickerItem, !assignedTo && styles.userPickerItemActive]}
                  onPress={() => { setAssignedTo(null); setShowUserPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.userPickerItemText, !assignedTo && styles.userPickerItemTextActive]}>Unassigned</Text>
                </TouchableOpacity>
                {teamLoading ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={D.ink} />
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                    {teamMembers.map(m => (
                      <TouchableOpacity
                        key={m.userId}
                        style={[styles.userPickerItem, assignedTo === m.userId && styles.userPickerItemActive]}
                        onPress={() => { setAssignedTo(m.userId); setShowUserPicker(false); }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.userPickerItemText, assignedTo === m.userId && styles.userPickerItemTextActive]} numberOfLines={1}>{m.name}</Text>
                          <Text style={styles.userPickerItemSub}>{m.role}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {teamMembers.length === 0 && (
                      <Text style={styles.userPickerEmpty}>No users in this project's team</Text>
                    )}
                  </ScrollView>
                )}
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submit}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Toast toast={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: D.ink },
  headerSub: { fontSize: 11, color: D.inkLight, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: D.ink, alignItems: 'center', justifyContent: 'center' },

  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', gap: 12 },
  title: { fontSize: 14, fontWeight: '900', color: D.ink },
  desc: { fontSize: 11, color: D.inkMid, marginTop: 4, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  metaItem: { flexDirection: 'row', gap: 5, alignItems: 'center', maxWidth: '48%' },
  metaText: { fontSize: 11, color: D.inkLight, fontWeight: '600' },

  empty: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: D.ink, marginBottom: 6 },
  emptySub: { fontSize: 13, color: D.inkLight, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderTopWidth: 1,
    borderColor: D.hairline,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: D.ink, marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: D.inkMid, marginBottom: 6, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: D.ink,
    marginBottom: 10,
  },
  textArea: { minHeight: 80 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flex: 1, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: D.hairline, backgroundColor: D.chalk, alignItems: 'center' },
  chipActive: { backgroundColor: D.ink, borderColor: D.ink },
  chipText: { fontSize: 11, fontWeight: '800', color: D.inkMid, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: D.ink, borderColor: D.ink },
  modalBtnText: { fontSize: 13, fontWeight: '900', color: D.ink },
  dateBtn: {
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateBtnText: { fontSize: 14, color: D.ink },
  userPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  userPickerText: { flex: 1, fontSize: 13, fontWeight: '600', color: D.ink },
  userPickerDropdown: {
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    backgroundColor: D.surface,
    marginBottom: 10,
    overflow: 'hidden',
  },
  userPickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  userPickerItemActive: { backgroundColor: D.chalk },
  userPickerItemText: { fontSize: 13, fontWeight: '700', color: D.ink },
  userPickerItemTextActive: { color: D.blue },
  userPickerItemSub: { fontSize: 10, color: D.inkLight, marginTop: 2 },
  userPickerEmpty: { fontSize: 12, color: D.inkLight, textAlign: 'center', paddingVertical: 14 },
});

