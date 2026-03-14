import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react-native';
import Logo from '@/components/Logo';

const { width, height } = Dimensions.get('window');

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  // Palette
  white:      '#FFFFFF',
  surface:    '#FAFAF9',       // warm off-white
  panelBg:    '#F5F4F2',       // stone-50 equivalent
  border:     '#E8E5E0',       // warm grey border
  borderFocus:'#1A1A1A',       // near-black focus ring
  text:       '#111110',       // near-black
  textMid:    '#555350',       // warm mid-grey
  textLight:  '#9B9895',       // warm light-grey
  accent:     '#1A1A1A',       // brand black (CTA)
  accentHover:'#2D2D2D',
  errorRed:   '#C0392B',
  errorBg:    '#FEF2F0',
  divider:    '#ECEAE6',
  // Spacing
  r4: 4, r8: 8, r12: 12, r16: 16, r20: 20, r24: 24,
  // Shadow
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
};

// ─── Animated Field ────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  error?: string;
  secureTextEntry?: boolean;
  rightAction?: React.ReactNode;
  keyboardType?: any;
  autoCapitalize?: any;
  autoComplete?: any;
  delay?: number;
}

function AnimatedField({
  label, value, onChangeText, placeholder, icon, error,
  secureTextEntry, rightAction, keyboardType, autoCapitalize,
  autoComplete, delay = 0,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1, duration: 520, delay, useNativeDriver: true,
    }).start();
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
    outputRange: [error ? T.errorRed : T.border, error ? T.errorRed : T.borderFocus],
  });

  return (
    <Animated.View style={{
      opacity: mountAnim,
      transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      marginBottom: error ? 6 : 20,
    }}>
      {/* Label */}
      <Text style={styles.fieldLabel}>{label}</Text>

      {/* Input row */}
      <Animated.View style={[
        styles.inputRow,
        error ? styles.inputRowError : null,
        { borderColor },
      ]}>
        {/* Icon */}
        <View style={styles.iconSlot}>{icon}</View>

        {/* Text input */}
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.textLight}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {/* Right action (eye toggle) */}
        {rightAction && <View style={styles.rightSlot}>{rightAction}</View>}
      </Animated.View>

      {/* Error message */}
      {error && <Text style={styles.errorMsg}>{error}</Text>}
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]       = useState<{ email?: string; password?: string }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const { login } = useAuth();
  const router    = useRouter();

  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Mount animations
  const logoAnim    = useRef(new Animated.Value(0)).current;
  const headingAnim = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(logoAnim,    { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardAnim,    { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(btnAnim,     { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Banner helper ─────────────────────────────────────────────────────────
  const showBanner = (msg: string) => {
    setBannerError(msg);
    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, {
      toValue: 1, useNativeDriver: true, tension: 60, friction: 10,
    }).start();
  };

  const clearBanner = () => {
    Animated.timing(bannerAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setBannerError(null)
    );
  };

  const clearFieldError = (field: 'email' | 'password') => {
    setErrors(p => ({ ...p, [field]: undefined }));
    clearBanner();
  };

  const handleLogin = async () => {
    setErrors({});
    clearBanner();

    if (!email || !password) {
      showBanner('Please enter both email and password.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      showBanner('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      setTimeout(() => {
        if (result.mustChangePassword) router.replace('/change-password');
        else router.replace('/(tabs)');
      }, 500);
    } else {
      // Collect all error messages into the banner
      const messages: string[] = [];

      if (result.errors) {
        if (result.errors.email?.length)    messages.push(result.errors.email[0]);
        if (result.errors.password?.length) messages.push(result.errors.password[0]);
      }

      if (messages.length === 0) {
        messages.push(result.message || 'Please check your credentials and try again.');
      }

      showBanner(messages[0]);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Decorative geometry ──────────────────────────────────────────── */}
      <View style={styles.decorTopRight} />
      <View style={styles.decorBottomLeft} />
      <View style={styles.decorDot1} />
      <View style={styles.decorDot2} />

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <View style={styles.inner}>

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, {
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        }]}>
          <Logo width={140} height={36} />
        </Animated.View>

        {/* Eyebrow + heading */}
        <Animated.View style={[styles.headingWrap, {
          opacity: headingAnim,
          transform: [{ translateY: headingAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDash} />
            <Text style={styles.eyebrow}>CLIENT PORTAL</Text>
          </View>
          <Text style={styles.heading}>Welcome{'\n'}back.</Text>
          <Text style={styles.subheading}>Access your construction projects and track progress in real time.</Text>
        </Animated.View>

        {/* Form card */}
        <Animated.View style={[styles.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>

          {/* Error banner */}
          {bannerError && (
            <Animated.View style={[styles.banner, {
              opacity: bannerAnim,
              transform: [{ scale: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            }]}>
              <AlertCircle size={15} color={T.errorRed} style={styles.bannerIcon} />
              <Text style={styles.bannerText}>{bannerError}</Text>
              <TouchableOpacity onPress={clearBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.bannerDismiss}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Email */}
          <AnimatedField
            label="Email Address"
            value={email}
            onChangeText={t => { setEmail(t); clearFieldError('email'); }}
            placeholder="you@example.com"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            delay={200}
            icon={<Mail size={18} color={errors.email ? T.errorRed : T.textMid} />}
          />

          {/* Password */}
          <AnimatedField
            label="Password"
            value={password}
            onChangeText={t => { setPassword(t); clearFieldError('password'); }}
            placeholder="Enter your password"
            error={errors.password}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            autoComplete="password"
            delay={320}
            icon={<Lock size={18} color={errors.password ? T.errorRed : T.textMid} />}
            rightAction={
              <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPw
                  ? <EyeOff size={18} color={T.textMid} />
                  : <Eye    size={18} color={T.textMid} />}
              </TouchableOpacity>
            }
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* CTA */}
          <Animated.View style={{ opacity: btnAnim }}>
            <TouchableOpacity
              style={[styles.cta, loading && styles.ctaDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color={T.white} size="small" />
                : <>
                    <Text style={styles.ctaText}>Sign In</Text>
                    <View style={styles.ctaArrow}>
                      <ArrowRight size={18} color={T.white} />
                    </View>
                  </>}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Footer note */}
        <Animated.View style={[styles.footer, { opacity: btnAnim }]}>
          <Text style={styles.footerText}>
            Abdurauf Sawadjaan Engineering Consultancy
          </Text>
          <Text style={styles.footerSub}>Where Vision meets Precision</Text>
        </Animated.View>

      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.surface,
  },

  // ── Decorative elements ──────────────────────────────────────────────────
  decorTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: T.panelBg,
    borderWidth: 1,
    borderColor: T.divider,
  },
  decorBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: T.panelBg,
    borderWidth: 1,
    borderColor: T.divider,
  },
  decorDot1: {
    position: 'absolute',
    top: height * 0.18,
    right: 28,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.border,
  },
  decorDot2: {
    position: 'absolute',
    bottom: height * 0.22,
    left: 28,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.divider,
  },

  // ── Layout ───────────────────────────────────────────────────────────────
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  // ── Logo ─────────────────────────────────────────────────────────────────
  logoWrap: {
    marginBottom: 40,
  },

  // ── Heading ──────────────────────────────────────────────────────────────
  headingWrap: {
    marginBottom: 32,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  eyebrowDash: {
    width: 24,
    height: 1.5,
    backgroundColor: T.textMid,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 2.5,
    color: T.textMid,
    fontFamily: 'Inter',
  },
  heading: {
    fontSize: 44,
    fontWeight: '700',
    color: T.text,
    lineHeight: 50,
    letterSpacing: -1.2,
    marginBottom: 14,
    fontFamily: 'Inter',
  },
  subheading: {
    fontSize: 14.5,
    color: T.textMid,
    lineHeight: 22,
    fontWeight: '400',
    maxWidth: 280,
    fontFamily: 'Inter',
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: T.white,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: T.divider,
    ...T.shadow,
  },

  // ── Error banner ─────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F0',
    borderWidth: 1,
    borderColor: '#FCCAC3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 8,
  },
  bannerIcon: {
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: T.errorRed,
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 18,
  },
  bannerDismiss: {
    fontSize: 12,
    color: '#E07060',
    fontWeight: '600',
    paddingLeft: 4,
  },

  // ── Field label ──────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: T.textMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Inter',
  },

  // ── Input row ────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: T.surface,
    overflow: 'hidden',
  },
  inputRowError: {
    backgroundColor: T.errorBg,
  },
  iconSlot: {
    paddingLeft: 16,
    paddingRight: 4,
  },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 15,
    color: T.text,
    fontFamily: 'Inter',
  },
  rightSlot: {
    paddingRight: 14,
  },

  // ── Error ────────────────────────────────────────────────────────────────
  errorMsg: {
    fontSize: 12,
    color: T.errorRed,
    marginTop: 6,
    marginLeft: 2,
    fontFamily: 'Inter',
  },

  // ── Divider ──────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: T.divider,
    marginBottom: 24,
  },

  // ── CTA ──────────────────────────────────────────────────────────────────
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.accent,
    height: 56,
    borderRadius: 12,
    gap: 12,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    color: T.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: 'Inter',
  },
  ctaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11.5,
    color: T.textLight,
    fontWeight: '500',
    fontFamily: 'Inter',
    letterSpacing: 0.2,
  },
  footerSub: {
    fontSize: 10.5,
    color: T.textLight,
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
});