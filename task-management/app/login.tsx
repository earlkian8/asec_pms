import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react-native';
import Logo from '@/components/Logo';
import { D } from '@/utils/colors';

const { height } = Dimensions.get('window');

// ── Animated field ─────────────────────────────────────────────────────────────
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
  const mountAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, { toValue: 1, duration: 520, delay, useNativeDriver: true }).start();
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
    outputRange: [error ? D.red : D.hairline, error ? D.red : D.ink],
  });

  return (
    <Animated.View style={{
      opacity: mountAnim,
      transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      marginBottom: 20,
    }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.inputRow, { borderColor }, error && styles.inputRowError]}>
        <View style={styles.iconSlot}>{icon}</View>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={D.inkLight}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightAction && <View style={styles.rightSlot}>{rightAction}</View>}
      </Animated.View>
      {error && <Text style={styles.errorMsg}>{error}</Text>}
    </Animated.View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const { login } = useAuth();
  const router    = useRouter();

  const bannerAnim  = useRef(new Animated.Value(0)).current;
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

  const showBanner = (msg: string) => {
    setBannerError(msg);
    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
  };

  const clearBanner = () => {
    Animated.timing(bannerAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setBannerError(null));
  };

  const handleLogin = async () => {
    setErrors({});
    clearBanner();
    if (!email || !password) { showBanner('Please enter both email and password.'); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { showBanner('Please enter a valid email address.'); return; }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      setTimeout(() => router.replace('/(tabs)'), 400);
    } else {
      const messages: string[] = [];
      if (result.errors?.email?.length)    messages.push(result.errors.email[0]);
      if (result.errors?.password?.length) messages.push(result.errors.password[0]);
      showBanner(messages[0] || result.message || 'Please check your credentials and try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Decorative geometry */}
      <View style={styles.decorTopRight} />
      <View style={styles.decorBottomLeft} />
      <View style={styles.decorDot1} />
      <View style={styles.decorDot2} />

      <View style={styles.inner}>

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, {
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        }]}>
          <Logo width={140} height={36} />
        </Animated.View>

        {/* Heading */}
        <Animated.View style={[styles.headingWrap, {
          opacity: headingAnim,
          transform: [{ translateY: headingAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDash} />
            <Text style={styles.eyebrow}>TASK PORTAL</Text>
          </View>
          <Text style={styles.heading}>Welcome{'\n'}back.</Text>
          <Text style={styles.subheading}>Track your assigned tasks and report progress in real time.</Text>
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
              <AlertCircle size={14} color={D.red} />
              <Text style={styles.bannerText}>{bannerError}</Text>
              <TouchableOpacity onPress={clearBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.bannerDismiss}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <AnimatedField
            label="Email Address"
            value={email}
            onChangeText={t => { setEmail(t); clearBanner(); }}
            placeholder="you@example.com"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            delay={200}
            icon={<Mail size={17} color={errors.email ? D.red : D.inkMid} />}
          />

          <AnimatedField
            label="Password"
            value={password}
            onChangeText={t => { setPassword(t); clearBanner(); }}
            placeholder="Enter your password"
            error={errors.password}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            autoComplete="password"
            delay={320}
            icon={<Lock size={17} color={errors.password ? D.red : D.inkMid} />}
            rightAction={
              <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPw
                  ? <EyeOff size={17} color={D.inkMid} />
                  : <Eye    size={17} color={D.inkMid} />}
              </TouchableOpacity>
            }
          />

          <View style={styles.divider} />

          <Animated.View style={{ opacity: btnAnim }}>
            <TouchableOpacity
              style={[styles.cta, loading && styles.ctaDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color="#FFF" size="small" />
                : <>
                    <Text style={styles.ctaText}>Sign In</Text>
                    <View style={styles.ctaArrow}>
                      <ArrowRight size={17} color="#FFF" />
                    </View>
                  </>}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: btnAnim }]}>
          <Text style={styles.footerText}>Abdurauf Sawadjaan Engineering Consultancy</Text>
          <Text style={styles.footerSub}>Where Vision meets Precision</Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.chalk },

  // Decorative geometry
  decorTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
  },
  decorBottomLeft: {
    position: 'absolute', bottom: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.hairline,
  },
  decorDot1: {
    position: 'absolute', top: height * 0.18, right: 28,
    width: 6, height: 6, borderRadius: 3, backgroundColor: D.hairline,
  },
  decorDot2: {
    position: 'absolute', bottom: height * 0.22, left: 28,
    width: 8, height: 8, borderRadius: 4, backgroundColor: D.hairlineMd,
  },

  // Layout
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },

  // Logo
  logoWrap: { marginBottom: 40 },

  // Heading
  headingWrap: { marginBottom: 32 },
  eyebrowRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  eyebrowDash: { width: 24, height: 1.5, backgroundColor: D.inkMid },
  eyebrow:     { fontSize: 10.5, fontWeight: '600', letterSpacing: 2.5, color: D.inkMid },
  heading:     { fontSize: 44, fontWeight: '700', color: D.ink, lineHeight: 50, letterSpacing: -1.2, marginBottom: 14 },
  subheading:  { fontSize: 14.5, color: D.inkMid, lineHeight: 22, maxWidth: 280 },

  // Card
  card: {
    backgroundColor: D.surface, borderRadius: 20,
    padding: 28, borderWidth: 1, borderColor: D.hairline,
  },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.redBg, borderWidth: 1, borderColor: '#FCCAC3',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 20, gap: 8,
  },
  bannerText:    { flex: 1, fontSize: 13, color: D.red, fontWeight: '500', lineHeight: 18 },
  bannerDismiss: { fontSize: 12, color: '#E07060', fontWeight: '600', paddingLeft: 4 },

  // Fields
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: D.inkMid,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, backgroundColor: D.chalk,
  },
  inputRowError: { backgroundColor: D.redBg },
  iconSlot:      { paddingLeft: 16, paddingRight: 4 },
  textInput:     { flex: 1, height: 52, paddingHorizontal: 12, fontSize: 15, color: D.ink },
  rightSlot:     { paddingRight: 14 },
  errorMsg:      { fontSize: 12, color: D.red, marginTop: 6, marginLeft: 2 },

  // Divider
  divider: { height: 1, backgroundColor: D.hairline, marginBottom: 24 },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.ink, height: 56, borderRadius: 12, gap: 12,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText:     { color: '#FFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Footer
  footer:     { marginTop: 40, alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11.5, color: D.inkLight, fontWeight: '500', letterSpacing: 0.2 },
  footerSub:  { fontSize: 10.5, color: D.inkLight, fontStyle: 'italic' },
});