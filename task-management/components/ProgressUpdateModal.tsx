import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Upload, FileText, Send } from 'lucide-react-native';
import { AppColors } from '@/utils/colors';

import { ProgressUpdate } from '@/types';

interface ProgressUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: number;
  editingUpdate?: ProgressUpdate | null;
  onSubmit: (description: string, file?: any) => void;
}

export default function ProgressUpdateModal({
  visible,
  onClose,
  taskTitle,
  editingUpdate,
  onSubmit,
}: ProgressUpdateModalProps) {
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load editing data when modal opens
  useEffect(() => {
    if (visible) {
      if (editingUpdate) {
        setDescription(editingUpdate.description || '');
        setSelectedFile(null); // Don't pre-load file, user needs to re-upload if changing
      } else {
        setDescription('');
        setSelectedFile(null);
      }
    }
  }, [visible, editingUpdate]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your progress update');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(description, selectedFile);
      if (!editingUpdate) {
        setDescription('');
        setSelectedFile(null);
      }
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    // For web, use input element
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          // Check file size (20MB max)
          if (file.size > 20 * 1024 * 1024) {
            Alert.alert('Error', 'File size must be less than 20MB');
            return;
          }
          setSelectedFile(file);
        }
      };
      input.click();
    } else {
      // For mobile, would use expo-document-picker
      Alert.alert('File Upload', 'File picker would open here. In production, use expo-document-picker.');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
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
                  {editingUpdate ? 'Edit Progress Update' : 'Add Progress Update'}
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
              {/* Description Input */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe your progress, what you've completed, any blockers, or next steps..."
                  placeholderTextColor={AppColors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={true}
                />
                <Text style={styles.helperText}>
                  {description.length} characters
                </Text>
              </View>

              {/* File Upload Section */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Attach File (Optional)</Text>
                {selectedFile ? (
                  <View style={styles.fileContainer}>
                    <View style={styles.fileInfo}>
                      <FileText size={20} color={AppColors.primary} />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {selectedFile.name || 'Selected file'}
                        </Text>
                        <Text style={styles.fileSize}>
                          {selectedFile.size
                            ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                            : 'File selected'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveFile}
                      style={styles.removeFileButton}
                    >
                      <X size={18} color={AppColors.error} />
                    </TouchableOpacity>
                  </View>
                ) : editingUpdate?.file_path ? (
                  <View style={styles.fileContainer}>
                    <View style={styles.fileInfo}>
                      <FileText size={20} color={AppColors.primary} />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {editingUpdate.original_name || 'Existing file'}
                        </Text>
                        <Text style={styles.fileSize}>
                          {editingUpdate.file_size
                            ? `${(editingUpdate.file_size / 1024).toFixed(2)} KB`
                            : 'File attached'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={handleFileSelect}
                    >
                      <Text style={styles.uploadButtonText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleFileSelect}
                  >
                    <Upload size={20} color={AppColors.primary} />
                    <Text style={styles.uploadButtonText}>
                      Choose file to upload
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.helperText}>
                  Supported: Images, PDFs, Documents (Max 20MB)
                  {editingUpdate && !selectedFile && editingUpdate.file_path && ' - Click Replace to change file'}
                </Text>
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
                  {loading ? 'Submitting...' : 'Submit Update'}
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '500',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  removeFileButton: {
    padding: 8,
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

