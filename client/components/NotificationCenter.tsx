import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'expo-router';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationAsRead, clearAllNotifications } = useApp();
  const router = useRouter();

  const backgroundColor = '#FFFFFF';
  const textColor = '#111827';
  const textSecondary = '#4B5563';
  const borderColor = '#E5E7EB';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'update':
        return 'information-circle';
      case 'milestone':
        return 'flag';
      case 'issue':
        return 'alert-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'update':
        return '#3B82F6';
      case 'milestone':
        return '#10B981';
      case 'issue':
        return '#EF4444';
      default:
        return '#8B5CF6';
    }
  };

  const handleNotificationPress = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
    if (notification.projectId) {
      router.push(`/project/${notification.projectId}`);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor, borderColor }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textColor }]}>Notifications</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {notifications.length} total
              </Text>
            </View>
            <View style={styles.headerActions}>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={clearAllNotifications}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.clearText, { color: '#EF4444' }]}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={64} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textColor }]}>No notifications</Text>
                <Text style={[styles.emptySubtext, { color: textSecondary }]}>
                  You're all caught up!
                </Text>
              </View>
            ) : (
              notifications.map((notification) => {
                const iconColor = getNotificationColor(notification.type);
                const isUnread = !notification.read;

                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      {
                        backgroundColor: isUnread ? '#EFF6FF' : backgroundColor,
                        borderColor,
                      },
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${iconColor}15` },
                      ]}>
                      <Ionicons name={getNotificationIcon(notification.type) as any} size={24} color={iconColor} />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[styles.notificationTitle, { color: textColor }]}>
                          {notification.title}
                        </Text>
                        {isUnread && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
                      </View>
                      <Text style={[styles.notificationMessage, { color: textSecondary }]} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={[styles.notificationDate, { color: textSecondary }]}>
                        {new Date(notification.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    fontWeight: '400',
  },
});

