import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Flag, Users, Plus, Trash2, Pencil, Layers, LogOut, UserCheck, MapPin, Calendar, Package, Boxes } from 'lucide-react-native';
import { D } from '@/utils/colors';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type Project = {
  id: number;
  projectCode?: string | null;
  projectName: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  location?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  milestonesCount?: number;
  teamCount?: number;
};

type Milestone = {
  id: number;
  projectId: number;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  billingPercentage?: number | null;
  status: 'pending' | 'in_progress' | 'completed';
  totalTasks?: number;
  completedTasks?: number;
  progress?: number;
  materialUsages?: MaterialUsage[];
};

type MaterialUsage = {
  id: number;
  projectMilestoneId: number;
  projectMaterialAllocationId: number;
  quantityUsed: number;
  notes?: string | null;
  recordedBy?: string | null;
  itemName?: string | null;
  itemCode?: string | null;
  unit?: string | null;
  isDirect?: boolean;
  createdAt?: string | null;
};

type ProjectAllocation = {
  id: number;
  name: string;
  code: string;
  unit: string;
  isDirect: boolean;
  qtyAllocated: number;
  qtyReceived: number;
  qtyUsed: number;
};

type TeamMember = {
  id: number;
  name: string;
  role: string;
  assignableType?: 'user' | 'employee' | string;
  assignmentStatus?: string;
  payType?: 'hourly' | 'salary' | 'fixed' | string;
  hourlyRate?: number | string | null;
  monthlySalary?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type Assignable = {
  id: number;
  type: 'user' | 'employee';
  name: string;
  email?: string | null;
  position?: string | null;
  roleSuggestion?: string | null;
};

type ReceivingReport = {
  id: number;
  quantityReceived: number;
  condition?: string | null;
  notes?: string | null;
  receivedAt?: string | null;
  receivedBy?: string | null;
};

type MaterialAllocation = {
  id: number;
  isDirect?: boolean;
  itemName?: string | null;
  itemCode?: string | null;
  unit?: string | null;
  quantityAllocated: number;
  quantityReceived: number;
  quantityRemaining: number;
  totalUsed?: number;
  available?: number;
  status: string;
  notes?: string | null;
  receivingReports: ReceivingReport[];
};

type TabKey = 'milestones' | 'team' | 'materials';

// ─── Toast ────────────────────────────────────────────────────────────────────
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

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, show, hide };
}

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const bg = toast.type === 'success' ? D.green : toast.type === 'error' ? D.red : D.blue;
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ';
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.springify().damping(14)}
      exiting={FadeOutUp.duration(200)}
      style={[toastStyles.wrap, { backgroundColor: bg }]}
    >
      <Text style={toastStyles.icon}>{icon}</Text>
      <Text style={toastStyles.msg} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: { fontSize: 14, color: '#fff', fontWeight: '900' },
  msg: { fontSize: 13, color: '#fff', fontWeight: '700', flex: 1 },
});

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withTiming(0.4, { duration: 700 }, () => {
      opacity.value = withTiming(1, { duration: 700 });
    });
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[skeletonStyles.card, animStyle]}>
      <View style={skeletonStyles.iconBox} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[skeletonStyles.line, { width: '60%' }]} />
        <View style={[skeletonStyles.line, { width: '40%', height: 8 }]} />
        <View style={[skeletonStyles.line, { width: '80%', height: 6, marginTop: 4 }]} />
      </View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E5DF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E8E5DF' },
  line: { height: 12, borderRadius: 6, backgroundColor: '#E8E5DF' },
});

// ─── Reusable date picker field ───────────────────────────────────────────────
function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [show, setShow] = useState(false);

  // Normalize any ISO string to plain YYYY-MM-DD so appending T00:00:00 is safe
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
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_e, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) onChange(selected.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id || 0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useAuth();

  const canManageMilestones = hasPermission('tm.milestones.manage');
  const canManageTasks = hasPermission('tm.tasks.manage');
  const canViewTeam = hasPermission('tm.team.view');
  const canAssignTeam = hasPermission('tm.team.assign');
  const canReleaseTeam = hasPermission('tm.team.release');
  const canReactivateTeam = hasPermission('tm.team.reactivate');
  const canForceRemoveTeam = hasPermission('tm.team.force-remove');
  const canReceivingReport = hasPermission('material-allocations.receiving-report');
  const canUsageMaterialView = hasPermission('milestone-material-usage.view');
  const canUsageMaterialCreate = hasPermission('milestone-material-usage.create');
  const canUsageMaterialUpdate = hasPermission('milestone-material-usage.update');
  const canUsageMaterialDelete = hasPermission('milestone-material-usage.delete');

  const { toast, show: showToast } = useToast();
  const tabAnim = useSharedValue(0);

  const [tab, setTab] = useState<TabKey>('milestones');
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [materials, setMaterials] = useState<MaterialAllocation[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Material usage modal
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageMilestone, setUsageMilestone] = useState<Milestone | null>(null);
  const [editingUsage, setEditingUsage] = useState<MaterialUsage | null>(null);
  const [usageAllocId, setUsageAllocId] = useState('');
  const [usageQty, setUsageQty] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [usageAllocPickerOpen, setUsageAllocPickerOpen] = useState(false);
  const [usageSubmitting, setUsageSubmitting] = useState(false);

  // Receiving report modal
  const [rrModalOpen, setRrModalOpen] = useState(false);
  const [rrAllocation, setRrAllocation] = useState<MaterialAllocation | null>(null);
  const [rrQty, setRrQty] = useState('');
  const [rrCondition, setRrCondition] = useState<string>('');
  const [rrConditionOpen, setRrConditionOpen] = useState(false);
  const [rrNotes, setRrNotes] = useState('');
  const [rrSubmitting, setRrSubmitting] = useState(false);

  const RR_CONDITIONS = ['Good', 'Slightly Damaged', 'Damaged', 'Defective', 'Incomplete'] as const;

  // Milestone modal
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [mName, setMName] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mStartDate, setMStartDate] = useState('');
  const [mDueDate, setMDueDate] = useState('');
  const [mBillingPercentage, setMBillingPercentage] = useState('');

  // Team assign modal (admin-like assignables)
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [assignables, setAssignables] = useState<Assignable[]>([]);
  const [assignablesLoading, setAssignablesLoading] = useState(false);
  const [assignablesSearch, setAssignablesSearch] = useState('');
  const [selectedAssignables, setSelectedAssignables] = useState<string[]>([]);
  const [assignFormData, setAssignFormData] = useState<Record<string, { role: string; pay_type: string; hourly_rate: string; monthly_salary: string; start_date: string; end_date: string }>>({});

  // Team edit modal
  const [teamEditOpen, setTeamEditOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [teRole, setTeRole] = useState('');
  const [tePayType, setTePayType] = useState<'hourly' | 'salary' | 'fixed'>('hourly');
  const [teHourlyRate, setTeHourlyRate] = useState('');
  const [teMonthlySalary, setTeMonthlySalary] = useState('');
  const [teStartDate, setTeStartDate] = useState('');
  const [teEndDate, setTeEndDate] = useState('');

  // Confirm action modal (admin-like)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmBody, setConfirmBody] = useState('');
  const [confirmCta, setConfirmCta] = useState('Confirm');
  const [confirmTone, setConfirmTone] = useState<'neutral' | 'danger'>('neutral');
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  const switchTab = (t: TabKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tabAnim.value = withTiming(0, { duration: 0 }, () => {
      tabAnim.value = withSpring(1, { damping: 16, stiffness: 180 });
    });
    setTab(t);
  };

  const tabContentStyle = useAnimatedStyle(() => ({
    opacity: tabAnim.value,
    transform: [{ translateX: withTiming(0) }],
  }));

  const loadAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [pRes, mRes, tRes, matRes] = await Promise.all([
        apiService.get<Project>(`/task-management/projects/${projectId}`),
        apiService.get<Milestone[]>(`/task-management/projects/${projectId}/milestones`),
        canViewTeam ? apiService.get<TeamMember[]>(`/task-management/projects/${projectId}/team`) : Promise.resolve({ success: true, data: [] } as any),
        apiService.get<MaterialAllocation[]>(`/task-management/projects/${projectId}/material-allocations`),
      ]);

      if (pRes.success && pRes.data) setProject(pRes.data);
      if (mRes.success) {
        const mData = (mRes as any);
        const freshMilestones = Array.isArray(mData.data) ? mData.data : [];
        setMilestones(freshMilestones);
        setProjectAllocations(Array.isArray(mData.projectAllocations) ? mData.projectAllocations : []);
        setUsageMilestone(prev => prev ? (freshMilestones.find((m: Milestone) => m.id === prev.id) ?? prev) : null);
      }
      if (tRes.success && tRes.data) setTeam(Array.isArray(tRes.data) ? tRes.data : []);
      if (matRes.success && matRes.data) setMaterials(Array.isArray(matRes.data) ? matRes.data : []);

      if (!silent) {
        tabAnim.value = withSpring(1, { damping: 16, stiffness: 180 });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openReceivingReport = (alloc: MaterialAllocation) => {
    setRrAllocation(alloc);
    setRrQty(String(alloc.quantityRemaining));
    setRrCondition('');
    setRrConditionOpen(false);
    setRrNotes('');
    setRrModalOpen(true);
  };

  const submitReceivingReport = async () => {
    if (!rrAllocation) return;
    const qty = rrQty.trim() ? parseFloat(rrQty) : rrAllocation.quantityRemaining;
    if (isNaN(qty) || qty <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Optimistic update
    setMaterials(prev => prev.map(a => a.id === rrAllocation.id
      ? { ...a, quantityReceived: a.quantityReceived + qty, quantityRemaining: Math.max(0, a.quantityRemaining - qty) }
      : a
    ));
    setRrModalOpen(false);
    try {
      setRrSubmitting(true);
      await apiService.post(`/task-management/projects/${projectId}/material-allocations/${rrAllocation.id}/receiving-report`, {
        quantity_received: qty,
        condition: rrCondition || null,
        notes: rrNotes.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Receiving report submitted', 'success');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to submit report', 'error');
      loadAll(true);
    } finally {
      setRrSubmitting(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [projectId, canViewTeam]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const openAddMilestone = () => {
    setEditingMilestone(null);
    setMName('');
    setMDesc('');
    setMStartDate(project?.startDate ?? '');
    setMDueDate(project?.plannedEndDate ?? '');
    setMBillingPercentage('');
    setMilestoneModalOpen(true);
  };

  const openEditMilestone = (m: Milestone) => {
    setEditingMilestone(m);
    setMName(m.name || '');
    setMDesc(m.description || '');
    setMStartDate(m.startDate || '');
    setMDueDate(m.dueDate || '');
    setMBillingPercentage(
      m.billingPercentage !== null && m.billingPercentage !== undefined ? String(m.billingPercentage) : ''
    );
    setMilestoneModalOpen(true);
  };

  const submitMilestone = async () => {
    const payload = {
      name: mName.trim(),
      description: mDesc.trim() ? mDesc.trim() : null,
      start_date: mStartDate.trim() ? mStartDate.trim() : null,
      due_date: mDueDate.trim() ? mDueDate.trim() : null,
      billing_percentage: mBillingPercentage.trim() ? Number(mBillingPercentage.trim()) : null,
    };
    if (!payload.name) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isEdit = !!editingMilestone;
    // Optimistic update
    if (isEdit && editingMilestone) {
      setMilestones(prev => prev.map(m => m.id === editingMilestone.id ? { ...m, ...payload, name: payload.name } : m));
    } else {
      const tempId = -Date.now();
      setMilestones(prev => [...prev, { id: tempId, projectId, name: payload.name, description: payload.description, startDate: payload.start_date, dueDate: payload.due_date, billingPercentage: payload.billing_percentage, status: 'pending', totalTasks: 0, completedTasks: 0, progress: 0 }]);
    }
    setMilestoneModalOpen(false);
    setEditingMilestone(null);

    try {
      if (isEdit && editingMilestone) {
        await apiService.put(`/task-management/projects/${projectId}/milestones/${editingMilestone.id}`, payload);
      } else {
        await apiService.post(`/task-management/projects/${projectId}/milestones`, payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(isEdit ? 'Milestone updated' : 'Milestone added', 'success');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to save milestone', 'error');
      loadAll(true);
    }
  };

  const deleteMilestone = async (m: Milestone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setMilestones(prev => prev.filter(x => x.id !== m.id));
    try {
      await apiService.delete(`/task-management/projects/${projectId}/milestones/${m.id}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Milestone deleted', 'info');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to delete milestone', 'error');
      loadAll(true);
    }
  };

  const canShowTaskActions = canManageTasks;

  const openUsageModal = (m: Milestone) => {
    setUsageMilestone(m);
    setEditingUsage(null);
    setUsageAllocId('');
    setUsageQty('');
    setUsageNotes('');
    setUsageAllocPickerOpen(false);
    setUsageModalOpen(true);
  };

  const openEditUsage = (u: MaterialUsage) => {
    setEditingUsage(u);
    setUsageAllocId(String(u.projectMaterialAllocationId));
    setUsageQty(String(u.quantityUsed));
    setUsageNotes(u.notes ?? '');
    setUsageAllocPickerOpen(false);
  };

  const resetUsageForm = () => {
    setEditingUsage(null);
    setUsageAllocId('');
    setUsageQty('');
    setUsageNotes('');
    setUsageAllocPickerOpen(false);
  };

  const submitUsage = async () => {
    if (!usageMilestone || !usageAllocId || !usageQty) return;
    const qty = parseFloat(usageQty);
    if (isNaN(qty) || qty <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isEdit = !!editingUsage;
    const allocId = Number(usageAllocId);
    const alloc = projectAllocations.find(a => a.id === allocId);
    const allocName = alloc?.name ?? 'material';

    // Optimistic: patch the milestone's materialUsages in state
    if (isEdit && editingUsage) {
      const patched: MaterialUsage = { ...editingUsage, quantityUsed: qty, notes: usageNotes.trim() || null };
      setMilestones(prev => prev.map(m => m.id === usageMilestone.id
        ? { ...m, materialUsages: (m.materialUsages ?? []).map(u => u.id === editingUsage.id ? patched : u) }
        : m
      ));
      setUsageMilestone(prev => prev ? { ...prev, materialUsages: (prev.materialUsages ?? []).map(u => u.id === editingUsage.id ? patched : u) } : prev);
    } else {
      const tempUsage: MaterialUsage = {
        id: -Date.now(),
        projectMilestoneId: usageMilestone.id,
        projectMaterialAllocationId: allocId,
        quantityUsed: qty,
        notes: usageNotes.trim() || null,
        itemName: alloc?.name ?? null,
        unit: alloc?.unit ?? null,
      };
      setMilestones(prev => prev.map(m => m.id === usageMilestone.id
        ? { ...m, materialUsages: [...(m.materialUsages ?? []), tempUsage] }
        : m
      ));
      setUsageMilestone(prev => prev ? { ...prev, materialUsages: [...(prev.materialUsages ?? []), tempUsage] } : prev);
    }
    resetUsageForm();

    setUsageSubmitting(true);
    try {
      const payload = { project_material_allocation_id: allocId, quantity_used: qty, notes: usageNotes.trim() || null };
      if (isEdit && editingUsage) {
        await apiService.put(`/task-management/projects/${projectId}/milestones/${usageMilestone.id}/material-usage/${editingUsage.id}`, payload);
      } else {
        await apiService.post(`/task-management/projects/${projectId}/milestones/${usageMilestone.id}/material-usage`, payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(isEdit ? `Updated usage for ${allocName}` : `Recorded ${qty} ${alloc?.unit ?? ''} of ${allocName}`, 'success');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to save usage', 'error');
      loadAll(true);
    } finally {
      setUsageSubmitting(false);
    }
  };

  const deleteUsage = async (u: MaterialUsage) => {
    if (!usageMilestone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Optimistic: remove from milestone's materialUsages
    setMilestones(prev => prev.map(m => m.id === usageMilestone.id
      ? { ...m, materialUsages: (m.materialUsages ?? []).filter(x => x.id !== u.id) }
      : m
    ));
    setUsageMilestone(prev => prev ? { ...prev, materialUsages: (prev.materialUsages ?? []).filter(x => x.id !== u.id) } : prev);
    try {
      await apiService.delete(`/task-management/projects/${projectId}/milestones/${usageMilestone.id}/material-usage/${u.id}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Usage record removed', 'info');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to delete usage', 'error');
      loadAll(true);
    }
  };

  const milestoneCards = useMemo(() => {
    return milestones.map((m, index) => {
      const progress = m.progress ?? 0;
      const statusMap: Record<string, {c: string; bg: string}> = {
        pending: {c: D.amber, bg: D.amberBg},
        in_progress: {c: D.blue, bg: D.blueBg},
        completed: {c: D.green, bg: D.greenBg},
      };
      const ms = statusMap[m.status] || {c: D.inkMid, bg: '#F0EFED'};

      const fmtDate = (d?: string | null) => {
        if (!d) return null;
        try { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); } catch { return d; }
      };

      return (
        <Animated.View key={m.id} entering={FadeInDown.delay(index * 40).duration(200)}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/milestone-tasks?milestoneId=${m.id}&projectId=${projectId}&milestoneName=${encodeURIComponent(m.name)}`);
            }}
          >
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconWrap, {backgroundColor: ms.bg}]}>
              <Flag size={16} color={ms.c} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {m.name}
              </Text>
              {m.description ? (
                <Text style={styles.cardSub} numberOfLines={2}>
                  {m.description}
                </Text>
              ) : null}
              {/* Status badge + dates */}
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap'}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ms.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6}}>
                  <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: ms.c}} />
                  <Text style={{fontSize: 10, fontWeight: '700', color: ms.c}}>{m.status.replace('_',' ').toUpperCase()}</Text>
                </View>
                {(m.startDate || m.dueDate) && (
                  <Text style={{fontSize: 10, color: D.inkLight}}>{fmtDate(m.startDate) || '\u2014'} \ {fmtDate(m.dueDate) || '\u2014'}</Text>
                )}
              </View>
              {/* Progress bar */}
              <View style={{marginTop: 8}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                  <Text style={{fontSize: 10, color: D.inkLight, fontWeight: '700'}}>{m.completedTasks ?? 0}/{m.totalTasks ?? 0} tasks</Text>
                  <Text style={{fontSize: 10, color: ms.c, fontWeight: '800'}}>{progress}%</Text>
                </View>
                <View style={{height: 6, backgroundColor: D.chalk, borderRadius: 3, overflow: 'hidden'}}>
                  <View style={{height: '100%', width: `${Math.min(progress, 100)}%`, backgroundColor: ms.c, borderRadius: 3}} />
                </View>
              </View>
            </View>

            {canManageMilestones && (
              <View style={styles.rowActions}>
                {canUsageMaterialView && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openUsageModal(m); }}
                    style={styles.iconBtn}
                    activeOpacity={0.7}
                  >
                    <Boxes size={16} color={D.green} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openEditMilestone(m); }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                >
                  <Pencil size={16} color={D.ink} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); deleteMilestone(m); }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={D.red} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
        </Animated.View>
      );
    });
  }, [milestones, canManageMilestones, canShowTaskActions]);


  const updateTeamStatus = async (memberId: number, assignment_status: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTeam(prev => prev.map(m => m.id === memberId ? { ...m, assignmentStatus: assignment_status } : m));
    try {
      await apiService.put(`/task-management/projects/${projectId}/team/${memberId}/status`, { assignment_status });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Member set to ${assignment_status}`, 'success');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to update status', 'error');
      loadAll(true);
    }
  };

  const releaseTeamMember = async (memberId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTeam(prev => prev.map(m => m.id === memberId ? { ...m, assignmentStatus: 'released' } : m));
    try {
      await apiService.delete(`/task-management/projects/${projectId}/team/${memberId}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Member released', 'info');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to release member', 'error');
      loadAll(true);
    }
  };

  const forceRemoveTeamMember = async (memberId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTeam(prev => prev.filter(m => m.id !== memberId));
    try {
      await apiService.delete(`/task-management/projects/${projectId}/team/${memberId}/force-remove`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Member removed', 'info');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to remove member', 'error');
      loadAll(true);
    }
  };

  const openEditTeamMember = (m: TeamMember) => {
    setEditingTeamMember(m);
    setTeRole(m.role || '');
    setTePayType((m.payType as any) || 'hourly');
    setTeHourlyRate(m.hourlyRate !== null && m.hourlyRate !== undefined ? String(m.hourlyRate) : '');
    setTeMonthlySalary(m.monthlySalary !== null && m.monthlySalary !== undefined ? String(m.monthlySalary) : '');
    setTeStartDate(m.startDate || '');
    setTeEndDate(m.endDate || '');
    setTeamEditOpen(true);
  };

  const submitTeamEdit = async () => {
    if (!editingTeamMember) return;
    if (!teRole.trim() || !teStartDate.trim() || !teEndDate.trim()) return;
    if (tePayType === 'hourly' && !teHourlyRate.trim()) return;
    if (tePayType === 'salary' && !teMonthlySalary.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = {
      role: teRole.trim(),
      pay_type: tePayType,
      hourly_rate: tePayType === 'hourly' ? Number(teHourlyRate.trim()) : null,
      monthly_salary: tePayType === 'salary' ? Number(teMonthlySalary.trim()) : null,
      start_date: teStartDate.trim(),
      end_date: teEndDate.trim(),
    };
    setTeam(prev => prev.map(m => m.id === editingTeamMember.id ? { ...m, role: updated.role, payType: updated.pay_type, hourlyRate: updated.hourly_rate, monthlySalary: updated.monthly_salary, startDate: updated.start_date, endDate: updated.end_date } : m));
    setTeamEditOpen(false);
    setEditingTeamMember(null);
    try {
      await apiService.put(`/task-management/projects/${projectId}/team/${editingTeamMember.id}`, updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Team member updated', 'success');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to update member', 'error');
      loadAll(true);
    }
  };

  const openConfirm = (opts: {
    title: string;
    body: string;
    cta: string;
    tone?: 'neutral' | 'danger';
    action: () => Promise<void>;
  }) => {
    setConfirmTitle(opts.title);
    setConfirmBody(opts.body);
    setConfirmCta(opts.cta);
    setConfirmTone(opts.tone ?? 'neutral');
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  };

  const runConfirm = async () => {
    const act = confirmAction;
    setConfirmOpen(false);
    setConfirmAction(null);
    if (act) await act();
  };

  const compositeId = (a: Assignable) => `${a.type}-${a.id}`;

  const toggleAssignable = (id: string) => {
    setSelectedAssignables((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const setAssignField = (id: string, field: 'role' | 'pay_type' | 'hourly_rate' | 'monthly_salary' | 'start_date' | 'end_date', value: string) => {
    setAssignFormData((prev) => ({
      ...prev,
      [id]: {
        role: prev[id]?.role ?? '',
        pay_type: prev[id]?.pay_type ?? 'hourly',
        hourly_rate: prev[id]?.hourly_rate ?? '',
        monthly_salary: prev[id]?.monthly_salary ?? '',
        start_date: prev[id]?.start_date ?? '',
        end_date: prev[id]?.end_date ?? '',
        [field]: value,
      },
    }));
  };

  const loadAssignables = async () => {
    try {
      setAssignablesLoading(true);
      const res = await apiService.get<Assignable[]>(`/task-management/projects/${projectId}/team/assignables`);
      if (res.success && res.data) setAssignables(Array.isArray(res.data) ? res.data : []);
    } finally {
      setAssignablesLoading(false);
    }
  };

  const openAssignTeam = async () => {
    setTeamModalOpen(true);
    setAssignablesSearch('');
    setSelectedAssignables([]);
    setAssignFormData({});
    await loadAssignables();
  };

  const submitTeamAssign = async () => {
    if (selectedAssignables.length === 0) return;

    const payload = selectedAssignables
      .map((cid) => {
        const [type, rawId] = cid.split('-');
        const id = Number(rawId);
        const def = assignFormData[cid];
        const payType = def?.pay_type || 'hourly';
        if (!id || !def?.start_date || !def?.end_date) return null;
        if (payType === 'hourly' && !def?.hourly_rate) return null;
        if (payType === 'salary' && !def?.monthly_salary) return null;
        return {
          id,
          type,
          role: def.role?.trim() || '',
          pay_type: payType,
          hourly_rate: payType === 'hourly' ? Number(def.hourly_rate) : null,
          monthly_salary: payType === 'salary' ? Number(def.monthly_salary) : null,
          start_date: def.start_date,
          end_date: def.end_date,
        };
      })
      .filter(Boolean);

    if (payload.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await apiService.post(`/task-management/projects/${projectId}/team`, {
      assignables: payload,
    });
    setTeamModalOpen(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`${payload.length} member(s) assigned`, 'success');
      loadAll(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Failed to assign members', 'error');
      loadAll(true);
    }
  };

  if (loading && !project) {
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
      {/* Header: back button only */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={D.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project?.projectName || 'Project'}</Text>
      </View>

      {/* Hero section — project identity + metadata */}
      {project && (
        <View style={styles.hero}>
          {/* Top line: name + code */}
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName} numberOfLines={2}>{project.projectName}</Text>
              {project.projectCode ? (
                <Text style={styles.heroCode}>{project.projectCode}</Text>
              ) : null}
            </View>
            {/* Status badge */}
            {project.status && (() => {
              const sm: Record<string, {c: string; bg: string}> = {
                active: {c: D.green, bg: D.greenBg},
                planning: {c: D.amber, bg: D.amberBg},
                completed: {c: D.blue, bg: D.blueBg},
                on_hold: {c: D.red, bg: '#FEF2F2'},
              };
              const s = sm[(project.status ?? '').toLowerCase()] || {c: D.inkMid, bg: '#F0EFED'};
              return (
                <View style={[styles.heroStatusBadge, {backgroundColor: s.bg}]}>
                  <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: s.c}} />
                  <Text style={[styles.heroStatusText, {color: s.c}]}>{project.status.replace('_', ' ')}</Text>
                </View>
              );
            })()}
          </View>

          {/* Description */}
          {project.description ? (
            <Text style={styles.heroDesc}>{project.description}</Text>
          ) : null}

          {/* Meta chips row */}
          <View style={styles.heroMeta}>
            {project.priority && (() => {
              const pm: Record<string, {c: string; bg: string}> = {
                high: {c: D.red, bg: '#FEF2F2'},
                medium: {c: D.amber, bg: D.amberBg},
                low: {c: D.green, bg: D.greenBg},
                critical: {c: '#9333EA', bg: '#F5F3FF'},
              };
              const p = pm[(project.priority ?? '').toLowerCase()];
              return p ? (
                <View style={[styles.heroChip, {backgroundColor: p.bg}]}>
                  <Flag size={10} color={p.c} strokeWidth={2.5} />
                  <Text style={[styles.heroChipText, {color: p.c}]}>{project.priority}</Text>
                </View>
              ) : null;
            })()}
            {(project.startDate || project.plannedEndDate) && (
              <View style={styles.heroChip}>
                <Calendar size={10} color={D.inkMid} strokeWidth={2} />
                <Text style={styles.heroChipText}>
                  {project.startDate || '—'} – {project.plannedEndDate || '—'}
                </Text>
              </View>
            )}
            {project.location && (
              <View style={styles.heroChip}>
                <MapPin size={10} color={D.inkMid} strokeWidth={2} />
                <Text style={styles.heroChipText}>{project.location}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'milestones' && styles.tabActive]}
          onPress={() => switchTab('milestones')}
        >
          <Layers size={14} color={tab === 'milestones' ? '#fff' : D.ink} strokeWidth={2.5} />
          <Text style={[styles.tabText, tab === 'milestones' && styles.tabTextActive]}>Milestones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'team' && styles.tabActive]}
          onPress={() => switchTab('team')}
          disabled={!canViewTeam}
        >
          <Users size={14} color={tab === 'team' ? '#fff' : D.ink} strokeWidth={2.5} />
          <Text style={[styles.tabText, tab === 'team' && styles.tabTextActive]}>Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'materials' && styles.tabActive]}
          onPress={() => switchTab('materials')}
        >
          <Package size={14} color={tab === 'materials' ? '#fff' : D.ink} strokeWidth={2.5} />
          <Text style={[styles.tabText, tab === 'materials' && styles.tabTextActive]}>Materials</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={tabContentStyle}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.ink} />}
        showsVerticalScrollIndicator={false}
      >

        {tab === 'milestones' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Milestones</Text>
              {canManageMilestones && (
                <TouchableOpacity style={styles.addBtn} onPress={openAddMilestone} activeOpacity={0.75}>
                  <Plus size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {milestoneCards}
          </>
        )}

        {tab === 'team' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team</Text>
              {canAssignTeam && (
                <TouchableOpacity style={styles.addBtn} onPress={openAssignTeam} activeOpacity={0.75}>
                  <Plus size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.addBtnText}>Assign</Text>
                </TouchableOpacity>
              )}
            </View>

            {!canViewTeam && <Text style={styles.hintText}>Grant `tm.team.view` to view team.</Text>}

            {canViewTeam &&
              team.map((m, index) => {
                const assignSt = (m.assignmentStatus ?? '').toString().toLowerCase();
                const aMap: Record<string, {c: string; bg: string; label: string}> = {
                  active: {c: D.green, bg: D.greenBg, label: 'Active'},
                  released: {c: D.amber, bg: D.amberBg, label: 'Released'},
                  completed: {c: D.blue, bg: D.blueBg, label: 'Completed'},
                };
                const as = aMap[assignSt] || {c: D.inkMid, bg: '#F0EFED', label: assignSt || '—'};

                return (
                  <Animated.View key={m.id} entering={FadeInDown.delay(index * 40).duration(200)}>
                  <View style={styles.card}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.cardIconWrap, { backgroundColor: as.bg }]}>
                        <Users size={16} color={as.c} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={styles.cardSub} numberOfLines={1}>
                          {m.role || 'No role'} · {m.assignableType === 'employee' ? 'Employee' : 'User'}
                        </Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6}}>
                          <View style={[styles.infoPill, {backgroundColor: as.bg}]}>
                            <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: as.c}} />
                            <Text style={[styles.infoPillText, {color: as.c}]}>{as.label}</Text>
                          </View>
                          {m.payType === 'salary' && m.monthlySalary ? (
                            <Text style={{fontSize: 10, color: D.inkLight, fontWeight: '700'}}>₱{m.monthlySalary}/mo</Text>
                          ) : m.payType === 'fixed' ? (
                            <Text style={{fontSize: 10, color: D.inkLight, fontWeight: '700'}}>Fixed</Text>
                          ) : m.hourlyRate ? (
                            <Text style={{fontSize: 10, color: D.inkLight, fontWeight: '700'}}>₱{m.hourlyRate}/hr</Text>
                          ) : null}
                        </View>
                      </View>

                    <View style={styles.rowActions}>
                      {canAssignTeam && (
                        <TouchableOpacity
                          onPress={() => openEditTeamMember(m)}
                          style={styles.iconBtn}
                          activeOpacity={0.7}
                        >
                          <Pencil size={16} color={D.ink} strokeWidth={2.5} />
                        </TouchableOpacity>
                      )}

                      {m.assignableType === 'employee' && (m.assignmentStatus ?? '').toString() === 'active' && canReleaseTeam && (
                        <TouchableOpacity
                          onPress={() =>
                            openConfirm({
                              title: 'Release employee',
                              body:
                                `This sets ${m.name} to Released and makes them available for other projects. ` +
                                `Their assignment history stays in this project.`,
                              cta: 'Release',
                              action: async () => updateTeamStatus(m.id, 'released'),
                            })
                          }
                          style={styles.iconBtn}
                          activeOpacity={0.7}
                        >
                          <LogOut size={16} color={D.amber} strokeWidth={2.6} />
                        </TouchableOpacity>
                      )}

                      {m.assignableType === 'employee' && (m.assignmentStatus ?? '').toString() === 'released' && canReactivateTeam && (
                        <TouchableOpacity
                          onPress={() =>
                            openConfirm({
                              title: 'Re-activate employee',
                              body:
                                `This will set ${m.name} to Active on this project. ` +
                                `If they’re already active on another project, the backend will block it (admin parity).`,
                              cta: 'Set Active',
                              action: async () => updateTeamStatus(m.id, 'active'),
                            })
                          }
                          style={styles.iconBtn}
                          activeOpacity={0.7}
                        >
                          <UserCheck size={16} color={D.green} strokeWidth={2.6} />
                        </TouchableOpacity>
                      )}

                      {canForceRemoveTeam && (
                        <TouchableOpacity
                          onPress={() =>
                            openConfirm({
                              title: 'Remove team member',
                              body:
                                `This will permanently remove ${m.name} from this project. ` +
                                `This cannot be undone. If you only want to rotate an employee, use Release instead.`,
                              cta: 'Remove',
                              tone: 'danger',
                              action: async () => forceRemoveTeamMember(m.id),
                            })
                          }
                          style={styles.iconBtn}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color={D.red} strokeWidth={2.5} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
                  </Animated.View>
                );
              })}
          </>
        )}

        {tab === 'materials' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Material Allocations</Text>
            </View>

            {materials.length === 0 && (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
                <Package size={28} color={D.inkLight} strokeWidth={1.5} />
                <Text style={[styles.cardTitle, { marginTop: 10, color: D.inkMid }]}>No allocations</Text>
                <Text style={[styles.cardSub, { textAlign: 'center', marginTop: 4 }]}>No materials have been allocated to this project yet.</Text>
              </View>
            )}

            {materials.map((alloc) => {
              const statusMap: Record<string, { c: string; bg: string }> = {
                pending:  { c: D.amber, bg: D.amberBg },
                partial:  { c: D.blue,  bg: D.blueBg  },
                received: { c: D.green, bg: D.greenBg },
              };
              const sc = statusMap[alloc.status] || { c: D.inkMid, bg: '#F0EFED' };
              const pct = alloc.quantityAllocated > 0
                ? Math.min(100, Math.round((alloc.quantityReceived / alloc.quantityAllocated) * 100))
                : 0;
              const available = alloc.available ?? Math.max(0, alloc.quantityReceived - (alloc.totalUsed ?? 0));
              const availPct = alloc.quantityReceived > 0 ? available / alloc.quantityReceived : 1;

              return (
                <View key={alloc.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.cardIconWrap, { backgroundColor: sc.bg }]}>
                      <Package size={16} color={sc.c} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{alloc.itemName || 'Unknown Item'}</Text>
                        {alloc.isDirect && (
                          <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#3B82F6' }}>DIRECT</Text>
                          </View>
                        )}
                      </View>
                      {alloc.itemCode ? <Text style={styles.cardSub}>{alloc.itemCode}</Text> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <View style={[styles.infoPill, { backgroundColor: sc.bg }]}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.c }} />
                          <Text style={[styles.infoPillText, { color: sc.c }]}>{alloc.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      {/* Received progress */}
                      <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, color: D.inkLight, fontWeight: '700' }}>
                            Received: {alloc.quantityReceived} / {alloc.quantityAllocated} {alloc.unit}
                          </Text>
                          <Text style={{ fontSize: 10, color: sc.c, fontWeight: '800' }}>{pct}%</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: D.chalk, borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: sc.c, borderRadius: 3 }} />
                        </View>
                      </View>
                      {/* Used + Available */}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: D.inkLight }}>
                          Used: <Text style={{ fontWeight: '800', color: D.inkMid }}>{alloc.totalUsed ?? 0} {alloc.unit}</Text>
                        </Text>
                        <Text style={{ fontSize: 10, color: D.inkLight }}>
                          Available: <Text style={{ fontWeight: '800', color: available === 0 ? D.red : availPct <= 0.2 ? D.amber : D.green }}>{available} {alloc.unit}</Text>
                        </Text>
                      </View>
                    </View>
                    {canReceivingReport && alloc.quantityRemaining > 0 && (
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openReceivingReport(alloc)} activeOpacity={0.7}>
                        <Plus size={16} color={D.green} strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {alloc.receivingReports.length > 0 && (
                    <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: D.hairline, paddingTop: 10, gap: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: D.inkMid, marginBottom: 2 }}>RECEIVING HISTORY</Text>
                      {alloc.receivingReports.map((rr) => (
                        <View key={rr.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: D.inkMid, flex: 1 }}>
                            {rr.quantityReceived} {alloc.unit}{rr.condition ? ` · ${rr.condition}` : ''}
                          </Text>
                          <Text style={{ fontSize: 10, color: D.inkLight }}>
                            {rr.receivedAt ? new Date(rr.receivedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </Animated.ScrollView>

      <Toast toast={toast} />

      {/* Receiving report modal */}
      <Modal visible={rrModalOpen} transparent animationType="slide" onRequestClose={() => setRrModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Submit Receiving Report</Text>
            <Text style={styles.modalHint} numberOfLines={2}>
              {rrAllocation?.itemName} · Remaining: {rrAllocation?.quantityRemaining} {rrAllocation?.unit}
            </Text>
            <Text style={styles.fieldLabel}>Quantity Received <Text style={{ color: D.inkLight }}>(leave blank to receive all remaining)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={`${rrAllocation?.quantityRemaining ?? ''} ${rrAllocation?.unit ?? ''} (full remaining)`}
              placeholderTextColor={D.inkLight}
              value={rrQty}
              onChangeText={setRrQty}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Condition</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setRrConditionOpen((v) => !v)}
              activeOpacity={0.75}
            >
              <Text style={[{ fontSize: 14 }, !rrCondition && { color: D.inkLight }]}>
                {rrCondition || 'Select condition (optional)'}
              </Text>
              <Text style={{ fontSize: 12, color: D.inkLight }}>{rrConditionOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {rrConditionOpen && (
              <View style={styles.conditionDropdown}>
                <TouchableOpacity
                  style={[styles.conditionOption, !rrCondition && styles.conditionOptionActive]}
                  onPress={() => { setRrCondition(''); setRrConditionOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.conditionOptionText, !rrCondition && { color: D.ink, fontWeight: '700' }]}>— None —</Text>
                </TouchableOpacity>
                {RR_CONDITIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.conditionOption, rrCondition === c && styles.conditionOptionActive]}
                    onPress={() => { setRrCondition(c); setRrConditionOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.conditionOptionText, rrCondition === c && { color: D.ink, fontWeight: '700' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes (optional)"
              placeholderTextColor={D.inkLight}
              value={rrNotes}
              onChangeText={setRrNotes}
              multiline
            />
            <View style={[styles.modalActions, { marginTop: 6 }]}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setRrModalOpen(false)} disabled={rrSubmitting}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, rrSubmitting && { opacity: 0.6 }]}
                onPress={submitReceivingReport}
                disabled={rrSubmitting}
              >
                {rrSubmitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[styles.modalBtnText, { color: '#fff' }]}>Submit</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={milestoneModalOpen} transparent animationType="slide" onRequestClose={() => setMilestoneModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</Text>
            <Text style={styles.fieldLabel}>Name <Text style={{ color: D.red }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Milestone name"
              placeholderTextColor={D.inkLight}
              value={mName}
              onChangeText={setMName}
            />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={D.inkLight}
              value={mDesc}
              onChangeText={setMDesc}
              multiline
            />
            <DatePickerField
              label="Start Date"
              value={mStartDate}
              onChange={setMStartDate}
              minimumDate={project?.startDate ? new Date(project.startDate + 'T00:00:00') : undefined}
              maximumDate={project?.plannedEndDate ? new Date(project.plannedEndDate + 'T00:00:00') : undefined}
            />
            <DatePickerField
              label="Due Date"
              value={mDueDate}
              onChange={setMDueDate}
              minimumDate={mStartDate ? new Date(mStartDate + 'T00:00:00') : (project?.startDate ? new Date(project.startDate + 'T00:00:00') : undefined)}
              maximumDate={project?.plannedEndDate ? new Date(project.plannedEndDate + 'T00:00:00') : undefined}
            />
            <Text style={styles.fieldLabel}>Billing Percentage (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25 (optional)"
              placeholderTextColor={D.inkLight}
              value={mBillingPercentage}
              onChangeText={setMBillingPercentage}
              keyboardType="decimal-pad"
            />
            <View style={[styles.modalActions, { marginTop: 6 }]}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setMilestoneModalOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitMilestone}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign team modal (admin-like) */}
      <Modal visible={teamModalOpen} transparent animationType="slide" onRequestClose={() => setTeamModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Team Member</Text>
            <Text style={styles.modalHint}>
              Employees who are already occupied on another project are hidden, matching admin behavior.
              Users can be assigned to multiple projects.
            </Text>

            <Text style={styles.fieldLabel}>Search</Text>
            <TextInput
              style={styles.input}
              placeholder="Search users/employees…"
              placeholderTextColor={D.inkLight}
              value={assignablesSearch}
              onChangeText={setAssignablesSearch}
            />

            {assignablesLoading ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={D.ink} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator>
                {assignables
                  .filter((a) => {
                    const q = assignablesSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q);
                  })
                  .map((a) => {
                    const cid = compositeId(a);
                    const selected = selectedAssignables.includes(cid);
                    return (
                      <TouchableOpacity
                        key={cid}
                        style={[styles.assignableRow, selected && styles.assignableRowSelected]}
                        onPress={() => {
                          toggleAssignable(cid);
                          if (!assignFormData[cid]) {
                            setAssignField(cid, 'role', a.roleSuggestion || a.position || '');
                          }
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.assignableLeft}>
                          <Text style={styles.assignableName} numberOfLines={1}>
                            {a.name}
                          </Text>
                          <Text style={styles.assignableSub} numberOfLines={1}>
                            {(a.type === 'employee' ? 'Employee' : 'User') + (a.email ? ` • ${a.email}` : '')}
                          </Text>
                        </View>
                        <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}

            {selectedAssignables.length > 0 && (
              <ScrollView style={{ maxHeight: 260, marginTop: 10 }} showsVerticalScrollIndicator>
                {selectedAssignables.map((cid) => {
                  const a = assignables.find((x) => compositeId(x) === cid);
                  if (!a) return null;
                  return (
                    <View key={cid} style={styles.assignFormCard}>
                      <Text style={styles.assignFormTitle} numberOfLines={1}>{a.name}</Text>
                      <Text style={styles.fieldLabel}>Role <Text style={{ color: D.red }}>*</Text></Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Role"
                        placeholderTextColor={D.inkLight}
                        value={assignFormData[cid]?.role ?? ''}
                        onChangeText={(v) => setAssignField(cid, 'role', v)}
                      />
                      <Text style={styles.fieldLabel}>Pay Type <Text style={{ color: D.red }}>*</Text></Text>
                      <View style={[styles.segmentRow, { marginBottom: 10 }]}>
                        {(['hourly', 'salary', 'fixed'] as const).map((pt) => (
                          <TouchableOpacity
                            key={pt}
                            style={[styles.segmentBtn, (assignFormData[cid]?.pay_type || 'hourly') === pt && styles.segmentBtnActive]}
                            onPress={() => setAssignField(cid, 'pay_type', pt)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.segmentBtnText, (assignFormData[cid]?.pay_type || 'hourly') === pt && styles.segmentBtnTextActive]}>
                              {pt.charAt(0).toUpperCase() + pt.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {(assignFormData[cid]?.pay_type || 'hourly') === 'hourly' && (
                        <>
                          <Text style={styles.fieldLabel}>Hourly Rate (₱) <Text style={{ color: D.red }}>*</Text></Text>
                          <TextInput
                            style={styles.input}
                            placeholder="e.g. 150.00"
                            placeholderTextColor={D.inkLight}
                            value={assignFormData[cid]?.hourly_rate ?? ''}
                            onChangeText={(v) => setAssignField(cid, 'hourly_rate', v)}
                            keyboardType="decimal-pad"
                          />
                        </>
                      )}
                      {assignFormData[cid]?.pay_type === 'salary' && (
                        <>
                          <Text style={styles.fieldLabel}>Monthly Salary (₱) <Text style={{ color: D.red }}>*</Text></Text>
                          <TextInput
                            style={styles.input}
                            placeholder="e.g. 20000.00"
                            placeholderTextColor={D.inkLight}
                            value={assignFormData[cid]?.monthly_salary ?? ''}
                            onChangeText={(v) => setAssignField(cid, 'monthly_salary', v)}
                            keyboardType="decimal-pad"
                          />
                        </>
                      )}
                      {assignFormData[cid]?.pay_type === 'fixed' && (
                        <Text style={[styles.fieldLabel, { color: D.inkLight, fontStyle: 'italic', marginBottom: 10 }]}>
                          Fixed pay — gross amount entered per payroll period.
                        </Text>
                      )}
                      <DatePickerField
                        label="Start Date *"
                        value={assignFormData[cid]?.start_date ?? ''}
                        onChange={(v) => setAssignField(cid, 'start_date', v)}
                        minimumDate={project?.startDate ? new Date(project.startDate + 'T00:00:00') : undefined}
                        maximumDate={project?.plannedEndDate ? new Date(project.plannedEndDate + 'T00:00:00') : undefined}
                      />
                      <DatePickerField
                        label="End Date *"
                        value={assignFormData[cid]?.end_date ?? ''}
                        onChange={(v) => setAssignField(cid, 'end_date', v)}
                        minimumDate={assignFormData[cid]?.start_date ? new Date(assignFormData[cid].start_date + 'T00:00:00') : (project?.startDate ? new Date(project.startDate + 'T00:00:00') : undefined)}
                        maximumDate={project?.plannedEndDate ? new Date(project.plannedEndDate + 'T00:00:00') : undefined}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setTeamModalOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitTeamAssign}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit team member modal */}
      <Modal visible={teamEditOpen} transparent animationType="slide" onRequestClose={() => setTeamEditOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Team Member</Text>
            <Text style={styles.modalHint} numberOfLines={2}>
              Update assignment details for {editingTeamMember?.name ?? 'team member'}.
            </Text>

            <Text style={styles.fieldLabel}>Role <Text style={{ color: D.red }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Role"
              placeholderTextColor={D.inkLight}
              value={teRole}
              onChangeText={setTeRole}
            />
            <Text style={styles.fieldLabel}>Pay Type <Text style={{ color: D.red }}>*</Text></Text>
            <View style={[styles.segmentRow, { marginBottom: 10 }]}>
              {(['hourly', 'salary', 'fixed'] as const).map((pt) => (
                <TouchableOpacity
                  key={pt}
                  style={[styles.segmentBtn, tePayType === pt && styles.segmentBtnActive]}
                  onPress={() => setTePayType(pt)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentBtnText, tePayType === pt && styles.segmentBtnTextActive]}>
                    {pt.charAt(0).toUpperCase() + pt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {tePayType === 'hourly' && (
              <>
                <Text style={styles.fieldLabel}>Hourly Rate (₱) <Text style={{ color: D.red }}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 150.00"
                  placeholderTextColor={D.inkLight}
                  value={teHourlyRate}
                  onChangeText={setTeHourlyRate}
                  keyboardType="decimal-pad"
                />
              </>
            )}
            {tePayType === 'salary' && (
              <>
                <Text style={styles.fieldLabel}>Monthly Salary (₱) <Text style={{ color: D.red }}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 20000.00"
                  placeholderTextColor={D.inkLight}
                  value={teMonthlySalary}
                  onChangeText={setTeMonthlySalary}
                  keyboardType="decimal-pad"
                />
              </>
            )}
            {tePayType === 'fixed' && (
              <Text style={[styles.fieldLabel, { color: D.inkLight, fontStyle: 'italic', marginBottom: 10 }]}>
                Fixed pay — gross amount entered per payroll period.
              </Text>
            )}
            <DatePickerField
              label="Start Date *"
              value={teStartDate}
              onChange={setTeStartDate}
              minimumDate={project?.startDate ? new Date(project.startDate + 'T00:00:00') : undefined}
              maximumDate={project?.plannedEndDate ? new Date(project.plannedEndDate + 'T00:00:00') : undefined}
            />
            <DatePickerField
              label="End Date *"
              value={teEndDate}
              onChange={setTeEndDate}
              minimumDate={teStartDate ? new Date(teStartDate + 'T00:00:00') : (project?.startDate ? new Date(project.startDate + 'T00:00:00') : undefined)}
              maximumDate={project?.plannedEndDate ? new Date(project.plannedEndDate + 'T00:00:00') : undefined}
            />

            <View style={[styles.modalActions, { marginTop: 6 }]}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setTeamEditOpen(false);
                  setEditingTeamMember(null);
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitTeamEdit}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Material Usage Modal */}
      <Modal visible={usageModalOpen} transparent animationType="slide" onRequestClose={() => { setUsageModalOpen(false); resetUsageForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Material Usage</Text>
            <Text style={styles.modalHint} numberOfLines={1}>{usageMilestone?.name}</Text>

            {/* Add / Edit form */}
            {(canUsageMaterialCreate || canUsageMaterialUpdate) && (
              <View style={{ borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 12, marginBottom: 14, backgroundColor: D.chalk }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>{editingUsage ? 'Edit Usage' : 'Record Usage'}</Text>

                {/* Allocation picker */}
                <Text style={styles.fieldLabel}>Material <Text style={{ color: D.red }}>*</Text></Text>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => setUsageAllocPickerOpen(v => !v)}
                  activeOpacity={0.75}
                >
                  <Text style={[{ fontSize: 13 }, !usageAllocId && { color: D.inkLight }]} numberOfLines={1}>
                    {usageAllocId
                      ? (() => {
                          const a = projectAllocations.find(x => String(x.id) === usageAllocId);
                          if (!a) return 'Unknown';
                          const avail = Math.max(0, a.qtyReceived - a.qtyUsed);
                          return `${a.name} — ${avail} ${a.unit} avail.`;
                        })()
                      : 'Select material...'}
                  </Text>
                  <Text style={{ fontSize: 12, color: D.inkLight }}>{usageAllocPickerOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {usageAllocPickerOpen && (
                  <View style={styles.conditionDropdown}>
                    {projectAllocations.map(a => {
                      const avail = Math.max(0, a.qtyReceived - a.qtyUsed);
                      const editingOwnQty = editingUsage && String(editingUsage.projectMaterialAllocationId) === String(a.id) ? editingUsage.quantityUsed : 0;
                      const effectiveAvail = avail + editingOwnQty;
                      const disabled = effectiveAvail <= 0;
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={[styles.conditionOption, usageAllocId === String(a.id) && styles.conditionOptionActive, disabled && { opacity: 0.4 }]}
                          onPress={() => { if (!disabled) { setUsageAllocId(String(a.id)); setUsageAllocPickerOpen(false); } }}
                          activeOpacity={disabled ? 1 : 0.7}
                        >
                          <Text style={{ fontSize: 12, color: disabled ? D.inkLight : D.ink, fontWeight: '700' }} numberOfLines={1}>
                            {a.name} ({a.code})
                          </Text>
                          <Text style={{ fontSize: 10, color: disabled ? D.red : D.green, fontWeight: '700', marginTop: 1 }}>
                            {effectiveAvail} {a.unit} available
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.fieldLabel}>Quantity Used <Text style={{ color: D.red }}>*</Text></Text>
                {usageAllocId && (() => {
                  const a = projectAllocations.find(x => String(x.id) === usageAllocId);
                  const editingOwnQty = editingUsage && String(editingUsage.projectMaterialAllocationId) === usageAllocId ? editingUsage.quantityUsed : 0;
                  const maxQty = a ? Math.max(0, a.qtyReceived - a.qtyUsed) + editingOwnQty : undefined;
                  return maxQty !== undefined ? (
                    <Text style={{ fontSize: 10, color: D.inkLight, marginBottom: 4 }}>Max: {maxQty} {a?.unit}</Text>
                  ) : null;
                })()}
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={D.inkLight}
                  value={usageQty}
                  onChangeText={setUsageQty}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional notes..."
                  placeholderTextColor={D.inkLight}
                  value={usageNotes}
                  onChangeText={setUsageNotes}
                />

                <View style={styles.modalActions}>
                  {editingUsage && (
                    <TouchableOpacity style={styles.modalBtn} onPress={resetUsageForm}>
                      <Text style={styles.modalBtnText}>Cancel Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary, { flex: 2 }, usageSubmitting && { opacity: 0.6 }]}
                    onPress={submitUsage}
                    disabled={usageSubmitting}
                  >
                    {usageSubmitting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.modalBtnText, { color: '#fff' }]}>{editingUsage ? 'Update' : 'Save'}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Usage list */}
            <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>
              Recorded Usages ({(usageMilestone?.materialUsages ?? []).length})
            </Text>
            {(usageMilestone?.materialUsages ?? []).length === 0 ? (
              <Text style={{ fontSize: 12, color: D.inkLight, textAlign: 'center', paddingVertical: 16 }}>No usages recorded yet.</Text>
            ) : (
              (usageMilestone?.materialUsages ?? []).map(u => {
                const allocMeta = projectAllocations.find(a => String(a.id) === String(u.projectMaterialAllocationId));
                const available = allocMeta ? Math.max(0, allocMeta.qtyReceived - allocMeta.qtyUsed) : null;
                const availPct = allocMeta && allocMeta.qtyReceived > 0 ? available! / allocMeta.qtyReceived : 1;
                return (
                  <View key={u.id} style={{ borderWidth: 1, borderColor: D.hairline, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#fff' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: D.ink }} numberOfLines={1}>{u.itemName ?? 'Unknown'}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                          <Text style={{ fontSize: 11, color: D.inkMid }}>Used: <Text style={{ fontWeight: '800' }}>{u.quantityUsed} {u.unit}</Text></Text>
                          {available !== null && (
                            <Text style={{ fontSize: 11, color: D.inkMid }}>
                              Remaining: <Text style={{ fontWeight: '800', color: available === 0 ? D.red : availPct <= 0.2 ? D.amber : D.green }}>{available} {u.unit}</Text>
                            </Text>
                          )}
                        </View>
                        {u.notes ? <Text style={{ fontSize: 10, color: D.inkLight, marginTop: 2 }}>{u.notes}</Text> : null}
                        {u.recordedBy ? <Text style={{ fontSize: 10, color: D.inkLight, marginTop: 1 }}>By {u.recordedBy}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {canUsageMaterialUpdate && (
                          <TouchableOpacity style={styles.iconBtn} onPress={() => openEditUsage(u)} activeOpacity={0.7}>
                            <Pencil size={14} color={D.ink} strokeWidth={2.5} />
                          </TouchableOpacity>
                        )}
                        {canUsageMaterialDelete && (
                          <TouchableOpacity style={styles.iconBtn} onPress={() => deleteUsage(u)} activeOpacity={0.7}>
                            <Trash2 size={14} color={D.red} strokeWidth={2.5} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <TouchableOpacity style={[styles.modalBtn, { marginTop: 4 }]} onPress={() => { setUsageModalOpen(false); resetUsageForm(); }}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirmation modal */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{confirmTitle}</Text>
            <Text style={styles.confirmBody}>{confirmBody}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  confirmTone === 'danger' && { backgroundColor: D.red, borderColor: D.red },
                ]}
                onPress={runConfirm}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{confirmCta}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
  },
  headerTitle: { fontSize: 15, fontWeight: '900', color: D.ink, flex: 1 },

  // Hero section
  hero: {
    backgroundColor: D.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  heroName: { fontSize: 18, fontWeight: '900', color: D.ink, lineHeight: 24 },
  heroCode: { fontSize: 11, color: D.inkLight, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  heroStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  heroDesc: { fontSize: 12, color: D.inkMid, lineHeight: 18, marginBottom: 10, marginTop: 2 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: D.chalk,
    borderWidth: 1,
    borderColor: D.hairline,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroChipText: { fontSize: 10, fontWeight: '700', color: D.inkMid },

  tabRow: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: D.surface },
  tab: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
    flex: 1,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: D.ink, borderColor: D.ink },
  tabText: { fontSize: 12, fontWeight: '800', color: D.ink },
  tabTextActive: { color: '#fff' },

  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: D.ink },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: D.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  card: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: D.greenBg },
  cardTitle: { fontSize: 14, fontWeight: '900', color: D.ink },
  cardSub: { fontSize: 11, color: D.inkMid, marginTop: 2, lineHeight: 16 },
  cardMeta: { fontSize: 11, color: D.inkLight, marginTop: 8, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: D.chalk, borderWidth: 1, borderColor: D.hairline, justifyContent: 'center', alignItems: 'center' },

  infoCard: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoDesc: { fontSize: 12, color: D.inkMid, lineHeight: 18, marginBottom: 8 },
  infoRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  infoPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  infoMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoMetaText: { fontSize: 11, color: D.inkLight },

  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  primaryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: D.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  hintText: { fontSize: 11, color: D.inkLight, fontStyle: 'italic', flex: 1 },

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
  modalHint: { fontSize: 11, color: D.inkLight, marginBottom: 10 },
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

  assignableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    backgroundColor: D.chalk,
    marginBottom: 8,
  },
  assignableRowSelected: {
    borderColor: D.ink,
    backgroundColor: '#fff',
  },
  assignableLeft: { flex: 1, paddingRight: 12 },
  assignableName: { fontSize: 13, fontWeight: '900', color: D.ink },
  assignableSub: { fontSize: 11, color: D.inkLight, marginTop: 2 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: D.hairline, backgroundColor: '#fff' },
  checkboxSelected: { borderColor: D.ink, backgroundColor: D.ink },

  assignFormCard: {
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  assignFormTitle: { fontSize: 12, fontWeight: '900', color: D.ink, marginBottom: 8 },

  segmentRow: { flexDirection: 'row', borderWidth: 1, borderColor: D.hairline, borderRadius: 10, overflow: 'hidden' },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: D.chalk },
  segmentBtnActive: { backgroundColor: D.ink },
  segmentBtnText: { fontSize: 11, fontWeight: '800', color: D.inkMid },
  segmentBtnTextActive: { color: '#fff' },

  dateBtn: {
    borderWidth: 1,
    borderColor: D.hairline,
    backgroundColor: D.chalk,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dateBtnText: { fontSize: 14, color: D.ink },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  confirmCard: { width: '100%', backgroundColor: D.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.hairline },
  confirmTitle: { fontSize: 15, fontWeight: '900', color: D.ink, marginBottom: 8 },
  confirmBody: { fontSize: 12, color: D.inkMid, marginBottom: 14, lineHeight: 18 },

  conditionDropdown: {
    borderWidth: 1,
    borderColor: D.hairline,
    borderRadius: 12,
    backgroundColor: D.surface,
    marginTop: -6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  conditionOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: D.hairline,
  },
  conditionOptionActive: { backgroundColor: '#F0EFED' },
  conditionOptionText: { fontSize: 13, color: D.inkMid },
});

