import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useDialog } from '@/contexts/DialogContext';

interface IssueReportModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export default function IssueReportModal({
  visible,
  onClose,
  projectId,
  projectName,
}: IssueReportModalProps) {
  const [issueType, setIssueType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const { refreshNotifications } = useApp();
  const dialog = useDialog();

  const issueTypes = [
    { value: 'quality', label: 'Quality Issue' },
    { value: 'delay', label: 'Delay Concern' },
    { value: 'safety', label: 'Safety Concern' },
    { value: 'budget', label: 'Budget Concern' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
    if (!issueType || !title.trim() || !description.trim()) {
      dialog.showError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    // TODO: Replace with actual API call when issue reporting endpoint is available
    // For now, simulate API call
    setTimeout(async () => {
      setLoading(false);
      dialog.showSuccess('Issue reported successfully! The project team will review it.');
      // Refresh notifications to get any new ones from backend
      await refreshNotifications();
      setIssueType('');
      setTitle('');
      setDescription('');
      setPriority('medium');
      onClose();
    }, 1000);
  };

  const backgroundColor = '#FFFFFF';
  const textColor = '#111827';
  const textSecondary = '#4B5563';
  const borderColor = '#E5E7EB';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor, borderColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>Report Issue</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.infoSection}>
              <Text style={[styles.label, { color: textSecondary }]}>Project</Text>
              <Text style={[styles.value, { color: textColor }]}>{projectName}</Text>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Issue Type</Text>
                <Text style={styles.requiredAsterisk}> *</Text>
              </View>
              <View style={styles.optionsContainer}>
                {issueTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: issueType === type.value ? '#3B82F6' : '#F3F4F6',
                        borderColor: issueType === type.value ? '#3B82F6' : borderColor,
                      },
                    ]}
                    onPress={() => setIssueType(type.value)}>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: issueType === type.value ? '#FFFFFF' : textColor,
                        },
                      ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: textColor }]}>Priority</Text>
              <View style={styles.priorityContainer}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      {
                        backgroundColor: priority === p ? '#3B82F6' : '#F3F4F6',
                        borderColor: priority === p ? '#3B82F6' : borderColor,
                      },
                    ]}
                    onPress={() => setPriority(p)}>
                    <Text
                      style={[
                        styles.priorityText,
                        {
                          color: priority === p ? '#FFFFFF' : textColor,
                        },
                      ]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Title</Text>
                <Text style={styles.requiredAsterisk}> *</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: '#F9FAFB', borderColor, color: textColor }]}
                placeholder="Brief description of the issue"
                placeholderTextColor={textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Description</Text>
                <Text style={styles.requiredAsterisk}> *</Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: '#F9FAFB', borderColor, color: textColor },
                ]}
                placeholder="Provide detailed information about the issue..."
                placeholderTextColor={textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor }]}
              onPress={onClose}
              disabled={loading}>
              <Text style={[styles.buttonText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: '#EF4444' }]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {loading ? 'Submitting...' : 'Report Issue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  infoSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  requiredAsterisk: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

