import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Send, MessageSquare, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
// import { useEffect } from 'react';

export default function ChatShow() {
  const { chat, messages, allChats } = usePage().props;
  const messagesList = messages?.data || [];
  const paginationLinks = messages?.links || [];
  useEffect(() => {
    if (window.Echo && chat) {
        const channel = window.Echo.private(`chat.${chat.id}`);
        
        channel.listen('.message.sent', (data) => {
            // Add new message to local state
            setLocalMessages((prev) => {
                // Check if message already exists
                const exists = prev.find((msg) => msg.id === data.id);
                if (exists) return prev;
                return [...prev, data];
            });
            scrollToBottom();
        });

        return () => {
            channel.stopListening('.message.sent');
            window.Echo.leave(`chat.${chat.id}`);
        };
    }
}, [chat]);

  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState(messagesList);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Chat Management", href: route('chat.index') },
    { title: `Chat with ${chat?.client?.client_name}` },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setLocalMessages(messagesList);
    scrollToBottom();
  }, [messagesList]);

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const sendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      chat_id: chat.id,
      sender_type: 'admin',
      sender_id: chat.user_id,
      sender_name: chat.user?.name || 'You',
      message: messageInput,
      read: false,
      created_at: new Date().toISOString(),
    };

    setLocalMessages([...localMessages, tempMessage]);
    setMessageInput('');
    setIsSending(true);

    try {
      const response = await axios.post(route('chat.send-message', chat.id), {
        message: messageInput,
      });

      if (response.data.success) {
        // Replace temp message with real one
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? response.data.data.message : msg
          )
        );
        toast.success('Message sent');
      } else {
        throw new Error(response.data.message || 'Failed to send message');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      // Remove temp message on error
      setLocalMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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

  const loadMoreMessages = (url) => {
    if (url) {
      router.visit(url, {
        preserveState: true,
        preserveScroll: false,
        onSuccess: () => {
          scrollToBottom();
        },
      });
    }
  };

  // Group messages by date
  const groupedMessages = localMessages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title={`Chat with ${chat?.client?.client_name}`} />

      <div className="py-6">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg h-[calc(100vh-12rem)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {chat?.client?.client_name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {chat?.client?.email} • {chat?.client?.client_code}
                  </p>
                </div>
                <Link href={route('chat.index')}>
                  <Button variant="outline" size="sm">
                    Back to Chats
                  </Button>
                </Link>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {/* Load More Button */}
              {messages?.prev_page_url && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMoreMessages(messages.prev_page_url)}
                  >
                    Load Previous Messages
                  </Button>
                </div>
              )}

              {/* Messages */}
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      {formatDate(date)}
                    </span>
                  </div>
                  {dateMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_type === 'admin' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.sender_type === 'admin'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {message.sender_name}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {message.message}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            message.sender_type === 'admin'
                              ? 'text-blue-100'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || isSending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

