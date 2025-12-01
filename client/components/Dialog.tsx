import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

export type DialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface DialogButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
}

export interface DialogProps {
  visible: boolean;
  type?: DialogType;
  title?: string;
  message: string;
  buttons?: DialogButton[];
  onClose?: () => void;
}

const AppColors = {
  primary: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  card: '#FFFFFF',
  background: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
};

export default function Dialog({
  visible,
  type = 'info',
  title,
  message,
  buttons,
  onClose,
}: DialogProps) {
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

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={32} color={AppColors.success} />;
      case 'error':
        return <AlertCircle size={32} color={AppColors.error} />;
      case 'warning':
        return <AlertCircle size={32} color={AppColors.warning} />;
      case 'confirm':
        return <Info size={32} color={AppColors.primary} />;
      default:
        return <Info size={32} color={AppColors.primary} />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return AppColors.success;
      case 'error':
        return AppColors.error;
      case 'warning':
        return AppColors.warning;
      case 'confirm':
        return AppColors.primary;
      default:
        return AppColors.primary;
    }
  };

  const getDefaultButtons = (): DialogButton[] => {
    if (buttons) return buttons;

    if (type === 'confirm') {
      return [
        {
          text: 'Cancel',
          onPress: () => onClose?.(),
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () => onClose?.(),
          style: 'default',
        },
      ];
    }

    return [
      {
        text: 'OK',
        onPress: () => onClose?.(),
        style: 'default',
      },
    ];
  };

  const dialogButtons = getDefaultButtons();

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
            styles.dialogContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.dialog}>
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
                {getIcon()}
              </View>
              {title && (
                <Text style={styles.title}>{title}</Text>
              )}
            </View>

            <Text style={styles.message}>{message}</Text>

            <View style={styles.buttonContainer}>
              {dialogButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    button.style === 'destructive' && styles.destructiveButton,
                    button.style === 'cancel' && styles.cancelButton,
                    button.style === 'default' && styles.defaultButton,
                    index > 0 && styles.buttonSpacing,
                  ]}
                  onPress={button.onPress}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'destructive' && styles.destructiveButtonText,
                      button.style === 'cancel' && styles.cancelButtonText,
                      button.style === 'default' && styles.defaultButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  dialogContainer: {
    width: '85%',
    maxWidth: 400,
  },
  dialog: {
    backgroundColor: AppColors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonSpacing: {
    marginLeft: 0,
  },
  defaultButton: {
    backgroundColor: AppColors.primary,
  },
  destructiveButton: {
    backgroundColor: AppColors.error,
  },
  cancelButton: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: '#FFFFFF',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: AppColors.text,
  },
});

