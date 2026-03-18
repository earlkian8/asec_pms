import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'expo-router';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationAsRead, clearAllNotifications, refreshNotifications, isLoadingNotifications } = useApp();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(width)).current;

  // Refresh notifications when modal opens
  useEffect(() => {
    if (visible) {
      console.log('NotificationCenter opened, refreshing notifications...');
      refreshNotifications();
      // Slide in from right (going to the left)
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out to the right
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, refreshNotifications, slideAnim]);

  useEffect(() => {
    console.log('Notifications updated:', notifications.length);
  }, [notifications]);

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
      case 'status_change':
        return 'sync';
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
      case 'status_change':
        return '#8B5CF6';
      default:
        return '#8B5CF6';
    }
  };

  const handleNotificationPress = async (notification: typeof notifications[0]) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    if (notification.projectId) {
      router.push(`/project/${notification.projectId}`);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop - tap to close */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        {/* Slide panel from right (going to the left) */}
        <Animated.View 
          style={[
            styles.panel, 
            { 
              backgroundColor,
              transform: [{ translateX: slideAnim }],
            }
          ]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: textColor }]}>Notifications</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={async () => {
                    await clearAllNotifications();
                  }}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.clearText, { color: '#EF4444' }]}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {isLoadingNotifications ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={[styles.loadingText, { color: textSecondary }]}>Loading notifications...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={64} color={textSecondary} />
                  <Text style={[styles.emptyText, { color: textColor }]}>No notifications</Text>
                  <Text style={[styles.emptySubtext, { color: textSecondary }]}>
                    You’re all caught up!
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
                          borderBottomColor: borderColor,
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
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    width: width,
    height: height,
    position: 'absolute',
    right: 0,
    top: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
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
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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

