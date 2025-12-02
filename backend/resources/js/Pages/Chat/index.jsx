import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { MessageSquare, Search, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatIndex() {
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Chat Management", href: route('chat.index') },
  ];

  const pagination = usePage().props.chats;
  const chats = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';
  const sortBy = usePage().props.sort_by || 'last_message_at';
  const sortOrder = usePage().props.sort_order || 'desc';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const debounceTimer = useRef(null);

  const handleSearch = (value) => {
    setSearchInput(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      router.get(route('chat.index'), {
        search: value,
        sort_by: sortBy,
        sort_order: sortOrder,
      }, {
        preserveState: true,
        preserveScroll: true,
      });
    }, 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No messages';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Chat Management" />

      <div className="py-6">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Chat Management
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage conversations with clients
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search by client name, code, or email..."
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Chats Table */}
              {chats.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    No chats found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Start a conversation with a client to see chats here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Last Message</TableHead>
                        <TableHead>Unread</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chats.map((chat) => (
                        <TableRow key={chat.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {chat.client?.client_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {chat.client?.client_code} • {chat.client?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {chat.user ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{chat.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              {formatDate(chat.last_message_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {chat.unread_count > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {chat.unread_count}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link href={route('chat.show', chat.id)}>
                              <Button variant="outline" size="sm">
                                View Chat
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {paginationLinks && paginationLinks.length > 3 && (
                <div className="mt-6 flex justify-center gap-2">
                  {paginationLinks.map((link, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (link.url) {
                          router.visit(link.url, {
                            preserveState: true,
                            preserveScroll: true,
                          });
                        }
                      }}
                      disabled={!link.url}
                      className={`px-3 py-2 rounded-md text-sm ${
                        link.active
                          ? 'bg-blue-600 text-white'
                          : link.url
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      }`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

