import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Eye, EyeOff, ArrowRight, Shield, AlertCircle } from 'lucide-react-native';
import Logo from '@/components/Logo';
import { apiService } from '@/services/api';

// ── Design tokens — mirrors LoginScreen ──────────────────────────────────────
const D = {
  ink:        '#0F0F0E',
  inkMid:     '#555350',
  inkLight:   '#9B9895',
  chalk:      '#FAFAF9',
  surface:    '#FFFFFF',
  hairline:   '#E8E5E0',
  hairlineMd: '#D4D0C8',
  divider:    '#ECEAE6',
  accent:     '#1A1A1A',
  red:        '#C0392B',
  redBg:      '#FEF2F0',
  redBorder:  '#FCCAC3',
  blue:       '#1D4ED8',
  blueBg:     '#EEF2FF',
};

// ── Password field ─────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
  delay?: number;
}

function PasswordField({ label, value, onChange, placeholder, show, onToggleShow, delay = 0 }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, []);

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [D.hairline, D.accent],
  });

  return (
    <Animated.View style={{
      opacity: mountAnim,
      transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      marginBottom: 16,
    }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.inputRow, { borderColor }]}>
        <View style={styles.iconSlot}>
          <Lock size={17} color={D.inkMid} strokeWidth={1.8} />
        </View>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={D.inkLight}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="password"
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <TouchableOpacity
          onPress={onToggleShow}
          style={styles.eyeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {show
            ? <EyeOff size={17} color={D.inkMid} strokeWidth={1.8} />
            : <Eye    size={17} color={D.inkMid} strokeWidth={1.8} />}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChangePasswordScreen() {
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurrent,setShowCurrent]= useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);
  const [loading,    setLoading]    = useState(false);
  const [banner,     setBanner]     = useState<string | null>(null);

  const { logout } = useAuth();
  const router = useRouter();

  // Mount animations
  const logoAnim   = useRef(new Animated.Value(0)).current;
  const headingAnim= useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(logoAnim,    { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardAnim,    { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const showBannerMsg = (msg: string) => {
    setBanner(msg);
    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
  };

  const clearBanner = () => {
    Animated.timing(bannerAnim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setBanner(null));
  };

  const handleChange = async () => {
    clearBanner();

    if (!currentPw || !newPw || !confirmPw) {
      showBannerMsg('Please fill in all fields.');
      return;
    }
    if (newPw.length < 8) {
      showBannerMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      showBannerMsg('New password and confirmation do not match.');
      return;
    }
    if (currentPw === newPw) {
      showBannerMsg('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/client/change-password', {
        current_password: currentPw,
        new_password: newPw,
        new_password_confirmation: confirmPw,
      });

      if (response.success) {
        // Brief delay so user sees the button finish, then logout → login
        setTimeout(async () => {
          await logout();
          router.replace('/login');
        }, 600);
      } else {
        showBannerMsg(response.message || 'Failed to change password. Please try again.');
      }
    } catch (error) {
      showBannerMsg(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Decorative circles ─────────────────────────────────────────────── */}
      <View style={styles.decorTopRight} />
      <View style={styles.decorBottomLeft} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, {
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        }]}>
          <Logo width={140} height={36} />
        </Animated.View>

        {/* Heading */}
        <Animated.View style={[styles.headingWrap, {
          opacity: headingAnim,
          transform: [{ translateY: headingAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }]}>
          <View style={styles.shieldWrap}>
            <Shield size={22} color={D.ink} strokeWidth={1.8} />
          </View>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDash} />
            <Text style={styles.eyebrow}>SECURITY</Text>
          </View>
          <Text style={styles.heading}>Change{'\n'}Password.</Text>
          <Text style={styles.subheading}>
            For your security, please set a new password before continuing.
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>

          {/* Error banner */}
          {banner && (
            <Animated.View style={[styles.banner, {
              opacity: bannerAnim,
              transform: [{ scale: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            }]}>
              <AlertCircle size={14} color={D.red} strokeWidth={2.5} />
              <Text style={styles.bannerText}>{banner}</Text>
              <TouchableOpacity onPress={clearBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.bannerDismiss}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <PasswordField
            label="Current Password"
            value={currentPw}
            onChange={(t) => { setCurrentPw(t); clearBanner(); }}
            placeholder="Enter current password"
            show={showCurrent}
            onToggleShow={() => setShowCurrent(v => !v)}
            delay={200}
          />
          <PasswordField
            label="New Password"
            value={newPw}
            onChange={(t) => { setNewPw(t); clearBanner(); }}
            placeholder="Min. 8 characters"
            show={showNew}
            onToggleShow={() => setShowNew(v => !v)}
            delay={300}
          />
          <PasswordField
            label="Confirm New Password"
            value={confirmPw}
            onChange={(t) => { setConfirmPw(t); clearBanner(); }}
            placeholder="Re-enter new password"
            show={showConfirm}
            onToggleShow={() => setShowConfirm(v => !v)}
            delay={400}
          />

          {/* Requirements hint */}
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              · At least 8 characters{'  '}·{'  '}Mix letters, numbers & symbols
            </Text>
          </View>

          <View style={styles.divider} />

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleChange}
            activeOpacity={0.85}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <Text style={styles.ctaText}>Change Password</Text>
                  <View style={styles.ctaArrow}>
                    <ArrowRight size={17} color="#FFF" strokeWidth={2.5} />
                  </View>
                </>}
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)')}
            disabled={loading}>
            <Text style={styles.skipText}>Skip for Now</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },

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

  scrollContent: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 40,
  },

  logoWrap:    { marginBottom: 36 },

  headingWrap: { marginBottom: 28 },
  shieldWrap: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eyebrowDash:{ width: 18, height: 1.5, backgroundColor: D.inkMid },
  eyebrow:    { fontSize: 10, fontWeight: '600', letterSpacing: 2.5, color: D.inkMid },
  heading:    { fontSize: 38, fontWeight: '700', color: D.ink, letterSpacing: -1, lineHeight: 44, marginBottom: 12 },
  subheading: { fontSize: 13.5, color: D.inkMid, lineHeight: 20, maxWidth: 270 },

  card: {
    backgroundColor: D.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: D.divider,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.redBg, borderWidth: 1, borderColor: D.redBorder,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 18, gap: 8,
  },
  bannerText:    { flex: 1, fontSize: 12.5, color: D.red, fontWeight: '500', lineHeight: 17 },
  bannerDismiss: { fontSize: 11, color: '#E07060', fontWeight: '600', paddingLeft: 4 },

  // Field
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: D.inkMid,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    backgroundColor: D.chalk, overflow: 'hidden',
  },
  iconSlot:  { paddingLeft: 14, paddingRight: 4 },
  textInput: { flex: 1, height: 50, paddingHorizontal: 10, fontSize: 14.5, color: D.ink },
  eyeBtn:    { paddingRight: 14 },

  // Hint
  hint: {
    backgroundColor: D.chalk, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: D.blue,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 4,
  },
  hintText: { fontSize: 11.5, color: D.inkMid, lineHeight: 17 },

  // Divider
  divider: { height: 1, backgroundColor: D.divider, marginVertical: 20 },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.accent, height: 54, borderRadius: 12, gap: 10,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText:  { color: '#FFF', fontSize: 15.5, fontWeight: '600', letterSpacing: 0.3 },
  ctaArrow: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Skip
  skipBtn: { alignItems: 'center', paddingTop: 14, paddingBottom: 2 },
  skipText: { fontSize: 13.5, color: D.inkLight, fontWeight: '500' },
});