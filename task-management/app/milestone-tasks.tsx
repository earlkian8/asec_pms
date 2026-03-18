import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Pencil, Calendar, User } from 'lucide-react-native';
import { D, getStatusColor, getStatusBg } from '@/utils/colors';
import { apiService } from '@/services/api';

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
  const { milestoneId, milestoneName } = useLocalSearchParams<{ milestoneId: string; milestoneName?: string }>();
  const mid = Number(milestoneId || 0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await apiService.get<Task[]>(`/task-management/milestones/${mid}/tasks`);
      if (res.success && res.data) setTasks(Array.isArray(res.data) ? res.data : []);
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
    setStatus('pending');
    setDueDate('');
    setAssignedTo('');
    setModalOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setTitle(t.title || '');
    setDesc(t.description || '');
    setStatus(t.status);
    setDueDate(t.dueDate || '');
    setAssignedTo(t.assignedTo ? String(t.assignedTo) : '');
    setModalOpen(true);
  };

  const submit = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: desc.trim() ? desc.trim() : null,
      status,
      due_date: dueDate.trim() ? dueDate.trim() : null,
      assigned_to: assignedTo.trim() ? Number(assignedTo.trim()) : null,
    };

    if (editing) {
      await apiService.put(`/task-management/milestones/${mid}/tasks/${editing.id}`, payload);
    } else {
      await apiService.post(`/task-management/milestones/${mid}/tasks`, payload);
    }
    setModalOpen(false);
    setEditing(null);
    loadTasks();
  };

  const remove = async (t: Task) => {
    await apiService.delete(`/task-management/milestones/${mid}/tasks/${t.id}`);
    loadTasks();
  };

  const headerSubtitle = useMemo(() => {
    if (milestoneName) return decodeURIComponent(milestoneName);
    return 'Milestone';
  }, [milestoneName]);

  const renderItem = ({ item }: { item: Task }) => {
    const c = getStatusColor(item.status);
    const bg = getStatusBg(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/task-detail?id=${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description || 'No description'}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={(e) => {
                e.stopPropagation();
                openEdit(item);
              }}
              activeOpacity={0.7}
            >
              <Pencil size={16} color={D.ink} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={(e) => {
                e.stopPropagation();
                remove(item);
              }}
              activeOpacity={0.7}
            >
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
            <Text style={styles.metaText}>{item.dueDate || 'No due date'}</Text>
          </View>
          <View style={styles.metaItem}>
            <User size={12} color={D.inkLight} strokeWidth={2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.assignedToName || 'Unassigned'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={D.ink} />
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
        <TouchableOpacity onPress={openAdd} style={styles.addBtn} activeOpacity={0.75}>
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
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusRow}>
              {(['pending', 'in_progress', 'completed'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, status === s && styles.chipActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="Due Date (YYYY-MM-DD)"
              placeholderTextColor={D.inkLight}
              value={dueDate}
              onChangeText={setDueDate}
            />
            <Text style={styles.fieldLabel}>Assigned To (User ID)</Text>
            <TextInput
              style={styles.input}
              placeholder="Assign to User ID (optional)"
              placeholderTextColor={D.inkLight}
              value={assignedTo}
              onChangeText={setAssignedTo}
              keyboardType="numeric"
            />
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

  empty: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 28, alignItems: 'center', marginTop: 18 },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: D.ink },
  emptySub: { fontSize: 12, color: D.inkLight, marginTop: 6, textAlign: 'center' },

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
});

