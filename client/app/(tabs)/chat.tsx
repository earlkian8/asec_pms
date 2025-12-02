import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/services/api';
import { MessageCircle, Send, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: number;
  chat_id: number;
  sender_type: 'client' | 'admin';
  sender_id: number;
  sender_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface Chat {
  id: number;
  client_id: number;
  client_name: string;
  user_id: number | null;
  user_name: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export default function ChatScreen() {
  
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChat();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Real-time message updates via Pusher (optional - can be enabled later)
  useEffect(() => {
    if (!chat) return;

    let channel: any = null;
    let pusher: any = null;

    // Import Pusher dynamically to avoid import errors if not configured
    const setupPusher = async () => {
      try {
        const { getPusher } = await import('@/services/pusher');
        pusher = getPusher();
        
        if (!pusher) {
          // Pusher not initialized, skip real-time updates
          return;
        }

        channel = pusher.subscribe(`private-chat.${chat.id}`);

        channel.bind('message.sent', (data: Message) => {
          setMessages((prev) => {
            const exists = prev.find((msg) => msg.id === data.id);
            if (exists) return prev;
            return [...prev, data];
          });
          scrollToBottom();
        });
      } catch (error) {
        // Silently fail if Pusher is not available
        console.debug('Pusher not available for real-time updates:', error);
      }
    };

    setupPusher();

    // Cleanup function
    return () => {
      if (channel) {
        try {
          channel.unbind('message.sent');
          if (pusher) {
            pusher.unsubscribe(`private-chat.${chat.id}`);
          }
        } catch (error) {
          console.debug('Error cleaning up Pusher channel:', error);
        }
      }
    };
  }, [chat]);

  const loadChat = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<{ chat: Chat }>('/client/chat');
      if (typeof response === 'object' && 'success' in response && response.success && response.data) {
        setChat(response.data.chat);
        loadMessages(response.data.chat.id);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await apiService.get<{
        messages: Message[];
        pagination: any;
      }>(`/client/chat/${chatId}/messages`);
      if (typeof response === 'object' && 'success' in response && response.success && response.data) {
        setMessages(response.data.messages.reverse()); // Reverse to show oldest first
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !chat || isSending) return;

    const tempId = Date.now();
    const tempMessage: Message = {
      id: tempId,
      chat_id: chat.id,
      sender_type: 'client',
      sender_id: user?.id || 0,
      sender_name: user?.name || 'You',
      message: messageInput,
      read: false,
      created_at: new Date().toISOString(),
    };

    setMessages([...messages, tempMessage]);
    const messageToSend = messageInput;
    setMessageInput('');
    setIsSending(true);

    try {
      const response = await apiService.post<{ message: Message }>(
        `/client/chat/${chat.id}/messages`,
        { message: messageToSend }
      );

      if (response.success && response.data) {
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? response.data!.message : msg
          )
        );
        // Reload chat to update last_message_at
        loadChat();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setMessageInput(messageToSend); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (chat) {
      await loadMessages(chat.id);
    } else {
      await loadChat();
    }
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No chat found</Text>
          <TouchableOpacity onPress={loadChat} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Support</Text>
        <Text style={styles.headerSubtitle}>Message us directly</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <View key={date}>
            <View style={styles.dateDivider}>
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </View>
            {dateMessages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.sender_type === 'client'
                    ? styles.messageRight
                    : styles.messageLeft,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.sender_type === 'client'
                      ? styles.messageBubbleRight
                      : styles.messageBubbleLeft,
                  ]}
                >
                  {message.sender_type === 'admin' && (
                    <Text style={styles.senderName}>
                      {message.sender_name || 'Support'}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.sender_type === 'client'
                        ? styles.messageTextRight
                        : styles.messageTextLeft,
                    ]}
                  >
                    {message.message}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Clock size={12} color="#9CA3AF" />
                    <Text style={styles.messageTime}>
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={messageInput}
          onChangeText={setMessageInput}
          multiline
          maxLength={5000}
          editable={!isSending}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!messageInput.trim() || isSending}
          style={[
            styles.sendButton,
            (!messageInput.trim() || isSending) && styles.sendButtonDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: '#111827',
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

