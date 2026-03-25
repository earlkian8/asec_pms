import React, { useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Flag, Users, Plus, Trash2, Pencil, Layers, LogOut, UserCheck, MapPin, Calendar, Info } from 'lucide-react-native';
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
};

type TeamMember = {
  id: number;
  name: string;
  role: string;
  assignableType?: 'user' | 'employee' | string;
  assignmentStatus?: string;
  hourlyRate?: number | string | null;
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

type TabKey = 'milestones' | 'team';

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

  const [tab, setTab] = useState<TabKey>('milestones');
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  const [assignFormData, setAssignFormData] = useState<Record<string, { role: string; hourly_rate: string; start_date: string; end_date: string }>>({});

  // Team edit modal
  const [teamEditOpen, setTeamEditOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [teRole, setTeRole] = useState('');
  const [teHourlyRate, setTeHourlyRate] = useState('');
  const [teStartDate, setTeStartDate] = useState('');
  const [teEndDate, setTeEndDate] = useState('');

  // Confirm action modal (admin-like)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmBody, setConfirmBody] = useState('');
  const [confirmCta, setConfirmCta] = useState('Confirm');
  const [confirmTone, setConfirmTone] = useState<'neutral' | 'danger'>('neutral');
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [pRes, mRes, tRes] = await Promise.all([
        apiService.get<Project>(`/task-management/projects/${projectId}`),
        apiService.get<Milestone[]>(`/task-management/projects/${projectId}/milestones`),
        canViewTeam ? apiService.get<TeamMember[]>(`/task-management/projects/${projectId}/team`) : Promise.resolve({ success: true, data: [] } as any),
      ]);

      if (pRes.success && pRes.data) setProject(pRes.data);
      if (mRes.success && mRes.data) setMilestones(Array.isArray(mRes.data) ? mRes.data : []);
      if (tRes.success && tRes.data) setTeam(Array.isArray(tRes.data) ? tRes.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

    if (editingMilestone) {
      await apiService.put(`/task-management/projects/${projectId}/milestones/${editingMilestone.id}`, payload);
    } else {
      await apiService.post(`/task-management/projects/${projectId}/milestones`, payload);
    }

    setMilestoneModalOpen(false);
    setEditingMilestone(null);
    loadAll();
  };

  const deleteMilestone = async (m: Milestone) => {
    await apiService.delete(`/task-management/projects/${projectId}/milestones/${m.id}`);
    loadAll();
  };

  const canShowTaskActions = canManageTasks;

  const milestoneCards = useMemo(() => {
    return milestones.map((m) => {
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
        <TouchableOpacity
          key={m.id}
          style={styles.card}
          activeOpacity={0.8}
          onPress={() =>
            router.push(
              `/milestone-tasks?milestoneId=${m.id}&projectId=${projectId}&milestoneName=${encodeURIComponent(m.name)}`
            )
          }
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
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    openEditMilestone(m);
                  }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                >
                  <Pencil size={16} color={D.ink} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteMilestone(m);
                  }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={D.red} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    });
  }, [milestones, canManageMilestones, canShowTaskActions]);


  const updateTeamStatus = async (memberId: number, assignment_status: string) => {
    await apiService.put(`/task-management/projects/${projectId}/team/${memberId}/status`, { assignment_status });
    loadAll();
  };

  const releaseTeamMember = async (memberId: number) => {
    await apiService.delete(`/task-management/projects/${projectId}/team/${memberId}`);
    loadAll();
  };

  const forceRemoveTeamMember = async (memberId: number) => {
    await apiService.delete(`/task-management/projects/${projectId}/team/${memberId}/force-remove`);
    loadAll();
  };

  const openEditTeamMember = (m: TeamMember) => {
    setEditingTeamMember(m);
    setTeRole(m.role || '');
    setTeHourlyRate(m.hourlyRate !== null && m.hourlyRate !== undefined ? String(m.hourlyRate) : '');
    setTeStartDate(m.startDate || '');
    setTeEndDate(m.endDate || '');
    setTeamEditOpen(true);
  };

  const submitTeamEdit = async () => {
    if (!editingTeamMember) return;
    if (!teRole.trim() || !teHourlyRate.trim() || !teStartDate.trim() || !teEndDate.trim()) return;

    await apiService.put(`/task-management/projects/${projectId}/team/${editingTeamMember.id}`, {
      role: teRole.trim(),
      hourly_rate: Number(teHourlyRate.trim()),
      start_date: teStartDate.trim(),
      end_date: teEndDate.trim(),
    });

    setTeamEditOpen(false);
    setEditingTeamMember(null);
    loadAll();
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

  const setAssignField = (id: string, field: 'role' | 'hourly_rate' | 'start_date' | 'end_date', value: string) => {
    setAssignFormData((prev) => ({
      ...prev,
      [id]: {
        role: prev[id]?.role ?? '',
        hourly_rate: prev[id]?.hourly_rate ?? '',
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
        if (!id || !def?.start_date || !def?.end_date || !def?.hourly_rate) return null;
        return {
          id,
          type,
          role: def.role?.trim() || '',
          hourly_rate: Number(def.hourly_rate),
          start_date: def.start_date,
          end_date: def.end_date,
        };
      })
      .filter(Boolean);

    if (payload.length === 0) return;

    await apiService.post(`/task-management/projects/${projectId}/team`, {
      assignables: payload,
    });

    setTeamModalOpen(false);
    loadAll();
  };

  if (loading && !project) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={D.ink} />
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
          onPress={() => setTab('milestones')}
        >
          <Layers size={14} color={tab === 'milestones' ? '#fff' : D.ink} strokeWidth={2.5} />
          <Text style={[styles.tabText, tab === 'milestones' && styles.tabTextActive]}>Milestones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'team' && styles.tabActive]}
          onPress={() => setTab('team')}
          disabled={!canViewTeam}
        >
          <Users size={14} color={tab === 'team' ? '#fff' : D.ink} strokeWidth={2.5} />
          <Text style={[styles.tabText, tab === 'team' && styles.tabTextActive]}>
            Team
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
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
              team.map((m) => {
                const assignSt = (m.assignmentStatus ?? '').toString().toLowerCase();
                const aMap: Record<string, {c: string; bg: string; label: string}> = {
                  active: {c: D.green, bg: D.greenBg, label: 'Active'},
                  released: {c: D.amber, bg: D.amberBg, label: 'Released'},
                  completed: {c: D.blue, bg: D.blueBg, label: 'Completed'},
                };
                const as = aMap[assignSt] || {c: D.inkMid, bg: '#F0EFED', label: assignSt || '—'};

                return (
                  <View key={m.id} style={styles.card}>
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
                          {m.hourlyRate && (
                            <Text style={{fontSize: 10, color: D.inkLight, fontWeight: '700'}}>₱{m.hourlyRate}/hr</Text>
                          )}
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
                );
              })}
          </>
        )}
      </ScrollView>

      {/* Milestone modal */}
      <Modal visible={milestoneModalOpen} transparent animationType="slide" onRequestClose={() => setMilestoneModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
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
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="Start Date (YYYY-MM-DD)"
              placeholderTextColor={D.inkLight}
              value={mStartDate}
              onChangeText={setMStartDate}
            />
            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="Due Date (YYYY-MM-DD)"
              placeholderTextColor={D.inkLight}
              value={mDueDate}
              onChangeText={setMDueDate}
            />
            <Text style={styles.fieldLabel}>Billing Percentage</Text>
            <TextInput
              style={styles.input}
              placeholder="Billing % (optional)"
              placeholderTextColor={D.inkLight}
              value={mBillingPercentage}
              onChangeText={setMBillingPercentage}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setMilestoneModalOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitMilestone}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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
                      <Text style={styles.fieldLabel}>Role</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Role"
                        placeholderTextColor={D.inkLight}
                        value={assignFormData[cid]?.role ?? ''}
                        onChangeText={(v) => setAssignField(cid, 'role', v)}
                      />
                      <Text style={styles.fieldLabel}>Hourly Rate</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Hourly Rate"
                        placeholderTextColor={D.inkLight}
                        value={assignFormData[cid]?.hourly_rate ?? ''}
                        onChangeText={(v) => setAssignField(cid, 'hourly_rate', v)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.fieldLabel}>Start Date</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Start Date (YYYY-MM-DD)"
                        placeholderTextColor={D.inkLight}
                        value={assignFormData[cid]?.start_date ?? ''}
                        onChangeText={(v) => setAssignField(cid, 'start_date', v)}
                      />
                      <Text style={styles.fieldLabel}>End Date</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="End Date (YYYY-MM-DD)"
                        placeholderTextColor={D.inkLight}
                        value={assignFormData[cid]?.end_date ?? ''}
                        onChangeText={(v) => setAssignField(cid, 'end_date', v)}
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Team Member</Text>
            <Text style={styles.modalHint} numberOfLines={2}>
              Update assignment details for {editingTeamMember?.name ?? 'team member'}.
            </Text>

            <Text style={styles.fieldLabel}>Role</Text>
            <TextInput
              style={styles.input}
              placeholder="Role"
              placeholderTextColor={D.inkLight}
              value={teRole}
              onChangeText={setTeRole}
            />
            <Text style={styles.fieldLabel}>Hourly Rate</Text>
            <TextInput
              style={styles.input}
              placeholder="Hourly Rate"
              placeholderTextColor={D.inkLight}
              value={teHourlyRate}
              onChangeText={setTeHourlyRate}
              keyboardType="numeric"
            />
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="Start Date (YYYY-MM-DD)"
              placeholderTextColor={D.inkLight}
              value={teStartDate}
              onChangeText={setTeStartDate}
            />
            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput
              style={styles.input}
              placeholder="End Date (YYYY-MM-DD)"
              placeholderTextColor={D.inkLight}
              value={teEndDate}
              onChangeText={setTeEndDate}
            />

            <View style={styles.modalActions}>
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
          </View>
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

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  confirmCard: { width: '100%', backgroundColor: D.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.hairline },
  confirmTitle: { fontSize: 15, fontWeight: '900', color: D.ink, marginBottom: 8 },
  confirmBody: { fontSize: 12, color: D.inkMid, marginBottom: 14, lineHeight: 18 },
});

