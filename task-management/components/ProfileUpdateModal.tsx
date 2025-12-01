import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, User, Lock, Eye, EyeOff, Mail } from 'lucide-react-native';
import { AppColors } from '@/utils/colors';
import { useDialog } from '@/contexts/DialogContext';

interface ProfileUpdateModalProps {
  visible: boolean;
  currentName: string;
  currentEmail: string;
  onClose: () => void;
  onUpdate: (name: string, email: string, currentPassword?: string, newPassword?: string) => Promise<void>;
}

export default function ProfileUpdateModal({
  visible,
  currentName,
  currentEmail,
  onClose,
  onUpdate,
}: ProfileUpdateModalProps) {
  const dialog = useDialog();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatePassword, setUpdatePassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setEmail(currentEmail);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setUpdatePassword(false);
      setValidationErrors({});
    }
  }, [visible, currentName, currentEmail]);

  const handleSubmit = async () => {
    const errors: typeof validationErrors = {};

    // Validate name
    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    // Validate email
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate password fields if updating password
    if (updatePassword) {
      if (!currentPassword.trim()) {
        errors.currentPassword = 'Current password is required';
      }
      if (!newPassword.trim()) {
        errors.newPassword = 'New password is required';
      } else if (newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters';
      }
      if (!confirmPassword.trim()) {
        errors.confirmPassword = 'Please confirm your new password';
      } else if (newPassword !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setLoading(true);

    try {
      await onUpdate(
        name.trim(),
        email.trim(),
        updatePassword ? currentPassword : undefined,
        updatePassword ? newPassword : undefined
      );
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Update Profile</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {currentEmail}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Name Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Full Name *</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <User size={20} color={AppColors.textSecondary} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      validationErrors.name && styles.inputError,
                    ]}
                    placeholder="Enter your full name"
                    placeholderTextColor={AppColors.textSecondary}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setValidationErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    editable={!loading}
                  />
                </View>
                {validationErrors.name && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{validationErrors.name}</Text>
                  </View>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Mail size={20} color={AppColors.textSecondary} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      validationErrors.email && styles.inputError,
                    ]}
                    placeholder="Enter your email address"
                    placeholderTextColor={AppColors.textSecondary}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setValidationErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>
                {validationErrors.email && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{validationErrors.email}</Text>
                  </View>
                )}
              </View>

              {/* Password Update Toggle */}
              <View style={styles.inputSection}>
                <TouchableOpacity
                  style={styles.toggleContainer}
                  onPress={() => {
                    setUpdatePassword(!updatePassword);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setValidationErrors(prev => ({
                      ...prev,
                      currentPassword: undefined,
                      newPassword: undefined,
                      confirmPassword: undefined,
                    }));
                  }}
                  disabled={loading}
                >
                  <View style={styles.toggleContent}>
                    <Lock size={20} color={AppColors.primary} />
                    <Text style={styles.toggleLabel}>Change Password</Text>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      updatePassword && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleSwitchThumb,
                        updatePassword && styles.toggleSwitchThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Current Password */}
              {updatePassword && (
                <>
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>Current Password *</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIcon}>
                        <Lock size={20} color={AppColors.textSecondary} />
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          validationErrors.currentPassword && styles.inputError,
                        ]}
                        placeholder="Enter current password"
                        placeholderTextColor={AppColors.textSecondary}
                        value={currentPassword}
                        onChangeText={(text) => {
                          setCurrentPassword(text);
                          setValidationErrors(prev => ({ ...prev, currentPassword: undefined }));
                        }}
                        secureTextEntry={!showCurrentPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={20} color={AppColors.textSecondary} />
                        ) : (
                          <Eye size={20} color={AppColors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {validationErrors.currentPassword && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                          {validationErrors.currentPassword}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* New Password */}
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>New Password *</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIcon}>
                        <Lock size={20} color={AppColors.textSecondary} />
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          validationErrors.newPassword && styles.inputError,
                        ]}
                        placeholder="Enter new password (min. 8 characters)"
                        placeholderTextColor={AppColors.textSecondary}
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          setValidationErrors(prev => ({ ...prev, newPassword: undefined }));
                        }}
                        secureTextEntry={!showNewPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff size={20} color={AppColors.textSecondary} />
                        ) : (
                          <Eye size={20} color={AppColors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {validationErrors.newPassword && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                          {validationErrors.newPassword}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>Confirm New Password *</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIcon}>
                        <Lock size={20} color={AppColors.textSecondary} />
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          validationErrors.confirmPassword && styles.inputError,
                        ]}
                        placeholder="Confirm new password"
                        placeholderTextColor={AppColors.textSecondary}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
                        }}
                        secureTextEntry={!showConfirmPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} color={AppColors.textSecondary} />
                        ) : (
                          <Eye size={20} color={AppColors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {validationErrors.confirmPassword && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                          {validationErrors.confirmPassword}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flexDirection: 'column',
    shadowColor: AppColors.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
  },
  inputError: {
    borderColor: AppColors.error,
    backgroundColor: AppColors.error + '10',
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.error,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: AppColors.primary,
  },
  toggleSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  submitButton: {
    backgroundColor: AppColors.primary,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

