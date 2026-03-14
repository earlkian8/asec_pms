import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ArrowRight, Receipt } from 'lucide-react-native';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  ink:      '#0F0F0E',
  inkMid:   '#4A4845',
  inkLight: '#9A9691',
  chalk:    '#FAFAF8',
  surface:  '#FFFFFF',
  hairline: '#E8E5DF',
  divider:  '#ECEAE6',
  green:    '#2D7D52',
  greenBg:  '#EDF7F2',
  greenMid: '#3D9B68',
  accent:   '#1A1A1A',
};

export default function PaymentSuccessScreen() {
  const { billing_id } = useLocalSearchParams();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  // Animations
  const circleAnim  = useRef(new Animated.Value(0)).current;
  const iconAnim    = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Circle pops in → icon appears → content slides up → buttons fade in
    Animated.sequence([
      Animated.spring(circleAnim,  { toValue: 1, useNativeDriver: true, tension: 50, friction: 7, delay: 100 }),
      Animated.timing(iconAnim,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(btnAnim,     { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* ── Decorative circles ────────────────────────────────────────────── */}
      <View style={styles.decorTopRight} />
      <View style={styles.decorBottomLeft} />

      <View style={styles.inner}>

        {/* ── Success icon ─────────────────────────────────────────────────── */}
        <Animated.View style={[styles.iconWrap, {
          transform: [{ scale: circleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          opacity: circleAnim,
        }]}>
          <Animated.View style={{ opacity: iconAnim, transform: [{ scale: iconAnim }] }}>
            <CheckCircle size={52} color={D.green} strokeWidth={1.5} />
          </Animated.View>
        </Animated.View>

        {/* ── Message ──────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.messageWrap, {
          opacity: contentAnim,
          transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDash} />
            <Text style={styles.eyebrow}>PAYMENT</Text>
          </View>
          <Text style={styles.heading}>Payment{'\n'}Successful.</Text>
          <Text style={styles.subheading}>
            Your payment has been received and processed. A confirmation has been recorded for your transaction.
          </Text>
        </Animated.View>

        {/* ── Confirmation card ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.confirmCard, {
          opacity: contentAnim,
          transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={styles.confirmRow}>
            <View style={styles.confirmIconWrap}>
              <Receipt size={15} color={D.green} strokeWidth={2} />
            </View>
            <View style={styles.confirmBody}>
              <Text style={styles.confirmLabel}>Billing Reference</Text>
              <Text style={styles.confirmValue}>
                #{billing_id ?? '—'}
              </Text>
            </View>
            <View style={[styles.confirmBadge, { backgroundColor: D.greenBg }]}>
              <Text style={[styles.confirmBadgeText, { color: D.green }]}>Paid</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.actions, { opacity: btnAnim }]}>
          {/* Primary: view billing detail */}
          {billing_id && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace(`/billing-detail?id=${billing_id}`)}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>View Receipt</Text>
              <View style={styles.primaryBtnArrow}>
                <ArrowRight size={16} color="#FFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}

          {/* Secondary: go home */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.75}>
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <Text style={styles.footer}>Abdurauf Sawadjaan Engineering Consultancy</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: D.chalk },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  // Decor
  decorTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#F0EDE8', borderWidth: 1, borderColor: D.divider,
  },
  decorBottomLeft: {
    position: 'absolute', bottom: -80, left: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#F0EDE8', borderWidth: 1, borderColor: D.divider,
  },

  // Icon
  iconWrap: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: D.greenBg, borderWidth: 1.5, borderColor: D.green + '40',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32, alignSelf: 'flex-start',
  },

  // Message
  messageWrap:  { marginBottom: 28 },
  eyebrowRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eyebrowDash:  { width: 18, height: 1.5, backgroundColor: D.inkMid },
  eyebrow:      { fontSize: 10, fontWeight: '600', letterSpacing: 2.5, color: D.inkMid },
  heading:      { fontSize: 38, fontWeight: '700', color: D.ink, letterSpacing: -1, lineHeight: 44, marginBottom: 12 },
  subheading:   { fontSize: 14, color: D.inkMid, lineHeight: 21, maxWidth: 290 },

  // Confirm card
  confirmCard: {
    backgroundColor: D.surface, borderRadius: 12,
    borderWidth: 1, borderColor: D.hairline,
    padding: 14, marginBottom: 32,
  },
  confirmRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: D.greenBg, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  confirmBody:     { flex: 1 },
  confirmLabel:    { fontSize: 10, color: D.inkLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  confirmValue:    { fontSize: 15, fontWeight: '700', color: D.ink },
  confirmBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  confirmBadgeText:{ fontSize: 11, fontWeight: '700' },

  // Actions
  actions:       { gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.accent, height: 54, borderRadius: 12, gap: 10,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '600', letterSpacing: 0.3 },
  primaryBtnArrow:{
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtn: {
    height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.hairline, backgroundColor: D.surface,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '500', color: D.inkMid },

  // Footer
  footer: {
    textAlign: 'center', fontSize: 11, color: D.inkLight,
    paddingBottom: 16, paddingHorizontal: 20,
  },
});