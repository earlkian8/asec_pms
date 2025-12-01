import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { X, CheckCircle2, Clock, Circle } from 'lucide-react-native';
import { AppColors, getStatusColor } from '@/utils/colors';

interface StatusOption {
  label: string;
  value: 'pending' | 'in_progress' | 'completed';
  icon: React.ReactNode;
}

interface StatusSelectorModalProps {
  visible: boolean;
  currentStatus: 'pending' | 'in_progress' | 'completed';
  progressUpdatesCount?: number;
  onClose: () => void;
  onSelect: (status: 'pending' | 'in_progress' | 'completed') => void;
}

export default function StatusSelectorModal({
  visible,
  currentStatus,
  progressUpdatesCount = 0,
  onClose,
  onSelect,
}: StatusSelectorModalProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const statusOptions: StatusOption[] = [
    {
      label: 'Pending',
      value: 'pending',
      icon: <Circle size={20} color={AppColors.pending} />,
    },
    {
      label: 'In Progress',
      value: 'in_progress',
      icon: <Clock size={20} color={AppColors.inProgress} />,
    },
    {
      label: 'Completed',
      value: 'completed',
      icon: <CheckCircle2 size={20} color={AppColors.completed} />,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Change Task Status</Text>
                <Text style={styles.subtitle}>Select a new status for this task</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Status Indicator */}
            <View style={styles.currentStatusContainer}>
              <Text style={styles.currentStatusLabel}>Current Status:</Text>
              <View
                style={[
                  styles.currentStatusBadge,
                  { backgroundColor: getStatusColor(currentStatus) + '20' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(currentStatus) },
                  ]}
                />
                <Text
                  style={[
                    styles.currentStatusText,
                    { color: getStatusColor(currentStatus) },
                  ]}
                >
                  {currentStatus.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Status Options */}
            <View style={styles.optionsContainer}>
              {statusOptions.map((option) => {
                const isSelected = option.value === currentStatus;
                const isCompletedWithoutUpdates = option.value === 'completed' && progressUpdatesCount === 0;
                const isDisabled = isSelected || isCompletedWithoutUpdates;
                const statusColor = getStatusColor(option.value);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                      isCompletedWithoutUpdates && styles.optionButtonDisabled,
                      isSelected && { borderColor: statusColor },
                      isCompletedWithoutUpdates && { borderColor: AppColors.border },
                      !isDisabled && { borderColor: AppColors.border },
                    ]}
                    onPress={() => {
                      if (!isDisabled) {
                        onSelect(option.value);
                        onClose();
                      }
                    }}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <View
                        style={[
                          styles.optionIconContainer,
                          { backgroundColor: statusColor + '15' },
                          isCompletedWithoutUpdates && { backgroundColor: AppColors.border },
                        ]}
                      >
                        {option.icon}
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && { color: statusColor },
                            isDisabled && styles.optionLabelDisabled,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {isSelected && (
                          <Text style={styles.optionHint}>Current status</Text>
                        )}
                        {isCompletedWithoutUpdates && (
                          <Text style={styles.optionHintError}>
                            Requires at least 1 progress update
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <View
                          style={[
                            styles.checkmarkContainer,
                            { backgroundColor: statusColor },
                          ]}
                        >
                          <CheckCircle2 size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 420,
  },
  modal: {
    backgroundColor: AppColors.card,
    borderRadius: 24,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingVertical: 16,
    backgroundColor: AppColors.background,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  currentStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionsContainer: {
    padding: 20,
    gap: 12,
  },
  optionButton: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.card,
    minHeight: 64,
  },
  optionButtonSelected: {
    backgroundColor: AppColors.background,
  },
  optionButtonDisabled: {
    backgroundColor: AppColors.background,
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 2,
  },
  optionLabelDisabled: {
    opacity: 0.6,
  },
  optionHint: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  optionHintError: {
    fontSize: 12,
    color: AppColors.error,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
});

