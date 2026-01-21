import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Logo from '@/components/Logo';
import Toast from '@/components/Toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { login } = useAuth();
  const dialog = useDialog();
  const router = useRouter();

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    setShowToast(false);
    
    // Validate inputs
    const newErrors: { email?: string; password?: string } = {};
    if (!email || !email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password || !password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Clear errors on success
      setErrors({});
      setShowToast(false);
      // Redirect to change password page if password needs to be changed
      if (result.mustChangePassword) {
        router.replace('/change-password');
      } else {
        router.replace('/(tabs)');
      }
    } else {
      // Handle validation errors from backend
      const fieldErrors: { email?: string; password?: string } = {};
      
      if (result.errors) {
        // Map backend validation errors to fields
        if (result.errors.email && Array.isArray(result.errors.email)) {
          fieldErrors.email = result.errors.email[0];
        }
        if (result.errors.password && Array.isArray(result.errors.password)) {
          fieldErrors.password = result.errors.password[0];
        }
      }

      // If we have field-specific errors, show them on fields
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        // Otherwise show general error message in toast
        const errorMessage = result.message || 'Login failed. Please check your credentials.';
        setToastMessage(errorMessage);
        setShowToast(true);
      }
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
    if (showToast) {
      setShowToast(false);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
    if (showToast) {
      setShowToast(false);
    }
  };

  const backgroundColor = '#F3F4F6'; // gray-100
  const textColor = '#111827'; // gray-900
  const inputBg = '#FFFFFF'; // white
  const borderColor = '#E5E7EB'; // gray-200
  const errorBorderColor = '#EF4444'; // red-500

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Toast
        visible={showToast}
        message={toastMessage}
        type="error"
        duration={5000}
        onDismiss={() => setShowToast(false)}
      />
      <LinearGradient
        colors={['#F3F4F6', '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Logo width={157} height={40} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Client Portal</Text>
            <Text style={[styles.subtitle, { color: '#6B7280' }]}>Access your construction projects</Text>
          </View>

          <View style={[styles.form, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.inputWrapper}>
              {errors.email && (
                <View style={styles.errorRing} />
              )}
              <View style={styles.inputContainer}>
                <Mail
                  size={20}
                  color={errors.email ? errorBorderColor : '#6B7280'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: textColor,
                      backgroundColor: inputBg,
                      borderColor: errors.email ? errorBorderColor : borderColor,
                    },
                    errors.email && styles.inputError,
                  ]}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <View style={styles.inputWrapper}>
              {errors.password && (
                <View style={styles.errorRing} />
              )}
              <View style={styles.inputContainer}>
                <Lock
                  size={20}
                  color={errors.password ? errorBorderColor : '#6B7280'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: textColor,
                      backgroundColor: inputBg,
                      borderColor: errors.password ? errorBorderColor : borderColor,
                    },
                    errors.password && styles.inputError,
                  ]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}>
                  {showPassword ? (
                    <EyeOff size={20} color={errors.password ? errorBorderColor : '#6B7280'} />
                  ) : (
                    <Eye size={20} color={errors.password ? errorBorderColor : '#6B7280'} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  form: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  inputWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  inputError: {
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  errorRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    pointerEvents: 'none',
    zIndex: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#111827',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  demoText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

