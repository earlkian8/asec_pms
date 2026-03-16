import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Receipt, AlertCircle } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import { formatCurrency } from '@/utils/formatCurrency';
import { Billing } from '@/hooks/useBillings';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:      '#0F0F0E',
  inkMid:   '#4A4845',
  inkLight: '#9A9691',
  chalk:    '#FAFAF8',
  surface:  '#FFFFFF',
  hairline: '#E8E5DF',
  blue:     '#1D4ED8',
  blueBg:   '#EEF2FF',
  green:    '#2D7D52',
  greenBg:  '#EDF7F2',
  red:      '#C0392B',
  redBg:    '#FDF1F0',
  amber:    '#B45309',
  amberBg:  '#FFFBEB',
};

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  unpaid:  { color: D.red,   bg: D.redBg,   label: 'Unpaid'  },
  partial: { color: D.amber, bg: D.amberBg, label: 'Partial' },
  paid:    { color: D.green, bg: D.greenBg, label: 'Paid'    },
};

interface BillingCardProps {
  billing: Billing;
  index: number;
  onPress: () => void;
}

export default function BillingCard({ billing, index, onPress }: BillingCardProps) {
  const meta = STATUS_META[billing.status] ?? STATUS_META.unpaid;
  const pct  = Math.min(Math.round(billing.payment_percentage || 0), 100);

  const isOverdue =
    billing.due_date &&
    new Date(billing.due_date) < new Date() &&
    (billing.status === 'unpaid' || billing.status === 'partial');

  return (
    <AnimatedCard
      index={index}
      delay={100}
      onPress={onPress}
      style={StyleSheet.flatten([styles.card])}>

      {/* ── Top row: code + status ─────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={styles.iconWrap}>
            <Receipt size={14} color={D.blue} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.code}>{billing.billing_code}</Text>
            <Text style={styles.projectName} numberOfLines={1}>
              {billing.project.project_name}
            </Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* ── Amount ────────────────────────────────────────────────────────── */}
      <View style={styles.amountRow}>
        <Text style={styles.amountValue}>{formatCurrency(billing.billing_amount)}</Text>
        {billing.milestone?.name && (
          <View style={styles.milestonePill}>
            <Ionicons name="flag-outline" size={10} color={D.inkMid} />
            <Text style={styles.milestoneText} numberOfLines={1}>
              {billing.milestone.name}
            </Text>
          </View>
        )}
      </View>

      {/* ── Progress bar — only if not fully paid ─────────────────────────── */}
      {billing.status !== 'paid' && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${pct}%`,
              backgroundColor: pct === 100 ? D.green : D.blue,
            }]} />
          </View>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
      )}

      {/* ── Paid / remaining figures ──────────────────────────────────────── */}
      <View style={styles.figuresRow}>
        {billing.total_paid > 0 && (
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>Paid</Text>
            <Text style={[styles.figureValue, { color: D.green }]}>
              {formatCurrency(billing.total_paid)}
            </Text>
          </View>
        )}
        {billing.remaining_amount > 0 && (
          <View style={[styles.figureItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.figureLabel}>Remaining</Text>
            <Text style={[styles.figureValue, { color: D.red }]}>
              {formatCurrency(billing.remaining_amount)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Date row ─────────────────────────────────────────────────────── */}
      <View style={styles.dateRow}>
        {billing.billing_date && (
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={12} color={D.inkLight} />
            <Text style={styles.dateText}>
              Issued {new Date(billing.billing_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>
        )}
        {billing.due_date && (
          <View style={styles.dateItem}>
            <Ionicons
              name={isOverdue ? 'alert-circle' : 'time-outline'}
              size={12}
              color={isOverdue ? D.red : D.inkLight}
            />
            <Text style={[styles.dateText, isOverdue && { color: D.red, fontWeight: '600' }]}>
              {isOverdue ? 'Overdue · ' : 'Due '}
              {new Date(billing.due_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },

  // Top row
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  topLeft:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, marginRight: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 7,
    backgroundColor: D.blueBg, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  code:        { fontSize: 14, fontWeight: '700', color: D.ink, letterSpacing: -0.1, marginBottom: 2 },
  projectName: { fontSize: 11, color: D.inkLight, maxWidth: 200 },
  statusPill:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Amount
  amountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: D.hairline, paddingTop: 10, marginBottom: 10,
  },
  amountValue: { fontSize: 22, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },
  milestonePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F4F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    maxWidth: 140,
  },
  milestoneText: { fontSize: 10, color: D.inkMid, fontWeight: '500' },

  // Progress
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTrack:   { flex: 1, height: 4, backgroundColor: D.hairline, borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 2 },
  progressPct:     { fontSize: 11, fontWeight: '700', color: D.ink, minWidth: 30, textAlign: 'right' },

  // Figures
  figuresRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: D.hairline,
    paddingTop: 10, marginBottom: 10,
  },
  figureItem:  { gap: 2 },
  figureLabel: { fontSize: 10, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  figureValue: { fontSize: 13, fontWeight: '700' },

  // Dates
  dateRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: D.inkLight, fontWeight: '500' },
});