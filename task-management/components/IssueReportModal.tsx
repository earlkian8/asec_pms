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
} from 'react-native';
import { X, Send, AlertCircle } from 'lucide-react-native';
import { AppColors, getPriorityColor } from '@/utils/colors';
import { useDialog } from '@/contexts/DialogContext';
import { Issue } from '@/types';

interface IssueReportModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  projectId: number;
  projectMilestoneId: number | null;
  projectTaskId: number;
  editingIssue?: Issue | null;
  onSubmit: (title: string, description: string, priority: string) => void;
}

const priorities = [
  { value: 'low', label: 'Low', color: AppColors.low },
  { value: 'medium', label: 'Medium', color: AppColors.medium },
  { value: 'high', label: 'High', color: AppColors.high },
  { value: 'critical', label: 'Critical', color: AppColors.critical },
];

export default function IssueReportModal({
  visible,
  onClose,
  taskTitle,
  editingIssue,
  onSubmit,
}: IssueReportModalProps) {
  const dialog = useDialog();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [loading, setLoading] = useState(false);

  // Load editing data when modal opens
  useEffect(() => {
    if (visible) {
      if (editingIssue) {
        setTitle(editingIssue.title || '');
        setDescription(editingIssue.description || '');
        setPriority(editingIssue.priority || 'medium');
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
      }
      setValidationErrors({});
    }
  }, [visible, editingIssue]);

  const [validationErrors, setValidationErrors] = useState<{ title?: string; description?: string }>({});

  const handleSubmit = async () => {
    const errors: { title?: string; description?: string } = {};
    
    if (!title.trim()) {
      errors.title = 'Please enter a title for the issue';
    }

    if (!description.trim()) {
      errors.description = 'Please describe the issue';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setLoading(true);
    try {
      await onSubmit(title, description, priority);
      if (!editingIssue) {
        setTitle('');
        setDescription('');
        setPriority('medium');
      }
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
                <Text style={styles.title}>
                  {editingIssue ? 'Edit Issue' : 'Report Issue'}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {taskTitle}
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
              {/* Title Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Issue Title *</Text>
                <TextInput
                  style={[
                    styles.input,
                    validationErrors.title && styles.inputError,
                  ]}
                  placeholder="Brief description of the issue"
                  placeholderTextColor={AppColors.textSecondary}
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    setValidationErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  editable={!loading}
                />
                {validationErrors.title && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color={AppColors.error} />
                    <Text style={styles.errorText}>{validationErrors.title}</Text>
                  </View>
                )}
              </View>

              {/* Description Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    validationErrors.description && styles.textAreaError,
                  ]}
                  placeholder="Provide detailed information about the issue, steps to reproduce, expected vs actual behavior..."
                  placeholderTextColor={AppColors.textSecondary}
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    setValidationErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!loading}
                />
                {validationErrors.description ? (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color={AppColors.error} />
                    <Text style={styles.errorText}>{validationErrors.description}</Text>
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    {description.length} characters
                  </Text>
                )}
              </View>

              {/* Priority Selection */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Priority *</Text>
                <View style={styles.priorityContainer}>
                  {priorities.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.priorityOption,
                        priority === p.value && [
                          styles.priorityOptionActive,
                          { borderColor: p.color },
                        ],
                      ]}
                      onPress={() => setPriority(p.value)}
                    >
                      <View
                        style={[
                          styles.priorityIndicator,
                          {
                            backgroundColor:
                              priority === p.value ? p.color : 'transparent',
                            borderColor: p.color,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityLabel,
                          priority === p.value && {
                            color: p.color,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helperText}>
                  Select the priority level based on impact and urgency
                </Text>
              </View>

              {/* Priority Info */}
              <View style={styles.infoBox}>
                <AlertCircle size={20} color={AppColors.info} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Priority Guidelines</Text>
                  <Text style={styles.infoText}>
                    • Critical: Blocks all work, immediate attention required{'\n'}
                    • High: Significant impact, needs prompt resolution{'\n'}
                    • Medium: Moderate impact, normal priority{'\n'}
                    • Low: Minor impact, can be addressed later
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
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
                <Send size={18} color="#ffffff" />
                <Text style={styles.submitButtonText}>
                  {loading ? 'Saving...' : editingIssue ? 'Update Issue' : 'Report Issue'}
                </Text>
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
  input: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AppColors.text,
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  textArea: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AppColors.text,
    minHeight: 120,
    borderWidth: 2,
    borderColor: AppColors.border,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  inputError: {
    borderColor: AppColors.error,
    backgroundColor: AppColors.error + '10',
  },
  textAreaError: {
    borderColor: AppColors.error,
    backgroundColor: AppColors.error + '10',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.error,
    fontWeight: '500',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  priorityOptionActive: {
    borderWidth: 2,
  },
  priorityIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  priorityLabel: {
    fontSize: 15,
    color: AppColors.text,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: AppColors.info + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.info + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 20,
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
    gap: 8,
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
    backgroundColor: AppColors.error,
    shadowColor: AppColors.error,
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

