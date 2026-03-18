import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, AlertCircle, CreditCard } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/utils/formatCurrency';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:      '#0F0F0E',
  inkMid:   '#4A4845',
  inkLight: '#9A9691',
  chalk:    '#FAFAF8',
  surface:  '#FFFFFF',
  hairline: '#E8E5DF',
  blue:     '#1D4ED8',
  green:    '#2D7D52',
  red:      '#C0392B',
  redBg:    '#FDF1F0',
  amber:    '#B45309',
  amberBg:  '#FFFBEB',
};

export interface ProjectCardProject {
  id: string;
  name: string;
  location?: string;
  status: 'active' | 'on-hold' | 'completed' | 'pending';
  progress: number;
  expectedCompletion: string;
  budget: number;
  spent: number;       // kept in interface for API compatibility, not displayed
  projectManager: string;
  description?: string;
  startDate?: string;
}

interface ProjectCardProps {
  project: ProjectCardProject;
  index: number;
  onPress: () => void;
  paymentStatus?: { status: 'unpaid' | 'partial' | 'paid'; amount: number } | null;
}

export default function ProjectCard({
  project, index, onPress, paymentStatus,
}: ProjectCardProps) {
  const hasPaymentAlert = paymentStatus && paymentStatus.status !== 'paid';

  return (
    <AnimatedCard
      index={index}
      delay={400}
      onPress={onPress}
      style={StyleSheet.flatten([styles.card])}>

      {/* ── Name + status ─────────────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
          {project.location ? (
            <Text style={styles.location} numberOfLines={1}>{project.location}</Text>
          ) : null}
        </View>
        <View style={styles.badgeStack}>
          <StatusBadge status={project.status} type="project" />
          {hasPaymentAlert && (
            <View style={[
              styles.payBadge,
              { backgroundColor: paymentStatus!.status === 'unpaid' ? D.redBg : D.amberBg },
            ]}>
              <CreditCard size={9} color={paymentStatus!.status === 'unpaid' ? D.red : D.amber} strokeWidth={2.5} />
              <Text style={[
                styles.payBadgeText,
                { color: paymentStatus!.status === 'unpaid' ? D.red : D.amber },
              ]}>
                {paymentStatus!.status === 'unpaid' ? 'UNPAID' : 'PARTIAL'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Progress strip — % only ────────────────────────────────────────── */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
        </View>
        <Text style={styles.progressPct}>{project.progress}%</Text>
      </View>

      {/* ── Meta: due date + payment alert ────────────────────────────────── */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Calendar size={12} color={D.inkLight} strokeWidth={2} />
          <Text style={styles.metaText}>
            Due {new Date(project.expectedCompletion).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </View>
        {hasPaymentAlert && (
          <View style={styles.metaItem}>
            <AlertCircle size={12} color={paymentStatus!.status === 'unpaid' ? D.red : D.amber} strokeWidth={2} />
            <Text style={[
              styles.metaText,
              { color: paymentStatus!.status === 'unpaid' ? D.red : D.amber, fontWeight: '600' },
            ]}>
              {formatCurrency(paymentStatus!.amount)} {paymentStatus!.status === 'unpaid' ? 'unpaid' : 'remaining'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Contract value ────────────────────────────────────────────────── */}
      <View style={styles.contractRow}>
        <Text style={styles.contractLabel}>Contract Value</Text>
        <Text style={styles.contractValue}>{formatCurrency(project.budget)}</Text>
      </View>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View style={styles.actions}>
        <View style={styles.actionSpacer} />
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },

  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14, gap: 10,
  },
  titleBlock: { flex: 1 },
  name:       { fontSize: 16, fontWeight: '700', color: D.ink, letterSpacing: -0.2, marginBottom: 2 },
  location:   { fontSize: 12, color: D.inkLight },
  badgeStack: { flexDirection: 'column', alignItems: 'flex-end', gap: 5 },
  payBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  payBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTrack:{ flex: 1, height: 4, backgroundColor: D.hairline, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: D.blue },
  progressPct:  { fontSize: 11, fontWeight: '700', color: D.ink, minWidth: 28, textAlign: 'right' },

  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: D.inkLight, fontWeight: '500' },

  // Contract value row — replaces the budget/spent breakdown
  contractRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: D.hairline,
    paddingTop: 12, marginBottom: 14,
  },
  contractLabel: { fontSize: 11, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  contractValue: { fontSize: 14, fontWeight: '700', color: D.ink },

  actions: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: D.hairline, paddingTop: 12,
  },
  actionSpacer: { height: 1 },
});