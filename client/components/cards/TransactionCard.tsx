import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedCard from '@/components/AnimatedCard';
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
  blueBg:   '#EEF2FF',
  green:    '#2D7D52',
  greenBg:  '#EDF7F2',
  red:      '#C0392B',
  redBg:    '#FDF1F0',
  amber:    '#B45309',
  amberBg:  '#FFFBEB',
  grey:     '#6B7280',
  greyBg:   '#F3F4F6',
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  paid:      { color: D.green, bg: D.greenBg },
  pending:   { color: D.amber, bg: D.amberBg },
  failed:    { color: D.red,   bg: D.redBg   },
  cancelled: { color: D.grey,  bg: D.greyBg  },
};

const METHOD_LABEL: Record<string, string> = {
  paymongo: 'PayMongo',
  cash:     'Cash',
  bank:     'Bank Transfer',
  check:    'Check',
};

interface Transaction {
  id: string;
  payment_code?: string;
  payment_amount?: number;
  payment_date?: string;
  payment_method?: string;
  payment_status?: string;
  reference_number?: string;
  // billing_id added — may or may not be present depending on API response
  billing_id?: number | string;
  billing?: {
    id?: number | string;
    billing_code?: string;
    project?: {
      project_name?: string;
    };
  };
}

interface TransactionCardProps {
  transaction: Transaction;
  index: number;
}

export default function TransactionCard({ transaction, index }: TransactionCardProps) {
  const router = useRouter();

  const status      = transaction.payment_status || 'pending';
  const statusMeta  = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  const method      = transaction.payment_method || 'unknown';
  const methodLabel = METHOD_LABEL[method] ?? method.replace('_', ' ').toUpperCase();

  // Resolve billing ID — check top-level billing_id first, then nested billing.id
  const billingId = transaction.billing_id ?? transaction.billing?.id;

  const handlePress = () => {
    if (billingId) {
      router.push(`/billing-detail?id=${billingId}`);
    }
    // If no billingId available yet, tap is silently a no-op
    // (card still renders as pressable once API returns billing_id)
  };

  return (
    <AnimatedCard
      index={index}
      delay={100}
      onPress={billingId ? handlePress : undefined}
      style={StyleSheet.flatten([styles.card])}>

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <CreditCard size={15} color={D.blue} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.code} numberOfLines={1}>
            {transaction.payment_code || 'N/A'}
          </Text>
          <Text style={styles.billingRef} numberOfLines={1}>
            {transaction.billing?.billing_code
              ? `${transaction.billing.billing_code}${transaction.billing.project?.project_name ? ' · ' + transaction.billing.project.project_name : ''}`
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {status.toUpperCase()}
            </Text>
          </View>
          {billingId && (
            <ArrowRight size={14} color={D.inkLight} strokeWidth={2} style={{ marginTop: 6 }} />
          )}
        </View>
      </View>

      {/* ── Amount ────────────────────────────────────────────────────────── */}
      <View style={styles.amountRow}>
        <Text style={styles.amountValue}>
          {formatCurrency(transaction.payment_amount || 0)}
        </Text>
      </View>

      {/* ── Meta row ─────────────────────────────────────────────────────── */}
      <View style={styles.metaRow}>
        {transaction.payment_date && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={D.inkLight} />
            <Text style={styles.metaText}>
              {new Date(transaction.payment_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Ionicons name="card-outline" size={12} color={D.inkLight} />
          <Text style={styles.metaText}>{methodLabel}</Text>
        </View>
        {transaction.reference_number && (
          <View style={styles.metaItem}>
            <Ionicons name="receipt-outline" size={12} color={D.inkLight} />
            <Text style={[styles.metaText, styles.refText]} numberOfLines={1}>
              {transaction.reference_number}
            </Text>
          </View>
        )}
      </View>

      {/* ── Tap hint — only when billing ID available ─────────────────────── */}
      {billingId && (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>View billing receipt</Text>
          <ArrowRight size={11} color={D.blue} strokeWidth={2.5} />
        </View>
      )}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.hairline,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: D.blueBg,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  headerText: { flex: 1 },
  code:       { fontSize: 14, fontWeight: '700', color: D.ink, letterSpacing: -0.2, marginBottom: 2 },
  billingRef: { fontSize: 11, color: D.inkLight },
  headerRight:{ alignItems: 'flex-end', gap: 0 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // Amount
  amountRow: {
    borderTopWidth: 1, borderTopColor: D.hairline,
    paddingTop: 10, marginBottom: 10,
  },
  amountValue: { fontSize: 22, fontWeight: '700', color: D.ink, letterSpacing: -0.5 },

  // Meta
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: D.inkLight, fontWeight: '500' },
  refText:  { maxWidth: 160 },

  // Tap hint
  tapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: D.hairline,
  },
  tapHintText: { fontSize: 11, fontWeight: '600', color: D.blue },
});