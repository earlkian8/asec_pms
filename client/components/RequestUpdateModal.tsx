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
import { apiService } from '@/services/api';

interface RequestUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
}

export default function RequestUpdateModal({
  visible,
  onClose,
  taskId,
  taskName,
  projectId,
  projectName,
}: RequestUpdateModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshNotifications } = useApp();
  const dialog = useDialog();

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      dialog.showError('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      const response = await apiService.post('/client/request-update', {
        task_id: parseInt(taskId, 10),
        project_id: parseInt(projectId, 10),
        subject: subject.trim(),
        message: message.trim(),
      });

      if (response.success) {
        dialog.showSuccess('Update request sent successfully!');
        // Refresh notifications to get any new ones from backend
        await refreshNotifications();
        setSubject('');
        setMessage('');
        onClose();
      } else {
        dialog.showError(response.message || 'Failed to send update request. Please try again.');
      }
    } catch (error) {
      console.error('Request update error:', error);
      dialog.showError('Failed to send update request. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
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
            <Text style={[styles.title, { color: textColor }]}>Request Task Update</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.infoSection}>
              <Text style={[styles.label, { color: textSecondary }]}>Project</Text>
              <Text style={[styles.value, { color: textColor }]}>{projectName}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.label, { color: textSecondary }]}>Task</Text>
              <Text style={[styles.value, { color: textColor }]}>{taskName}</Text>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Subject</Text>
                <Text style={styles.requiredAsterisk}> *</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: '#F9FAFB', borderColor, color: textColor }]}
                placeholder="Enter subject"
                placeholderTextColor={textSecondary}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Message</Text>
                <Text style={styles.requiredAsterisk}> *</Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: '#F9FAFB', borderColor, color: textColor },
                ]}
                placeholder="Enter your message or questions..."
                placeholderTextColor={textSecondary}
                value={message}
                onChangeText={setMessage}
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
              style={[styles.button, styles.submitButton, { backgroundColor: '#3B82F6' }]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {loading ? 'Sending...' : 'Send Request'}
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
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

