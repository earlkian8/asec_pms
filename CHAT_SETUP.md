# Chat System Setup Guide

This guide will help you set up the real-time chat system with Pusher for both the admin panel and client app.

## Prerequisites

- Pusher account (sign up at https://pusher.com)
- Pusher credentials in your `.env` files

## Backend Setup

### 1. Run Migrations

```bash
cd backend
php artisan migrate
```

This will create the `chats` and `messages` tables.

### 2. Configure Broadcasting

The broadcasting configuration is already set up in `routes/channels.php` and `bootstrap/app.php`.

Make sure your `.env` file in the backend has:

```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=your_cluster
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
```

### 3. Queue Configuration (Optional but Recommended)

For better performance, you can use queues for broadcasting:

```env
QUEUE_CONNECTION=database
```

Then run:

```bash
php artisan queue:work
```

## Admin Frontend Setup

### 1. Install Dependencies

```bash
cd backend
npm install laravel-echo pusher-js
```

### 2. Create Echo Configuration

Create or update `backend/resources/js/bootstrap.js`:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
    encrypted: true,
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        },
    },
});
```

### 3. Add Environment Variables

Add to `backend/.env`:

```env
VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

### 4. Update Chat Show Component

Update `backend/resources/js/Pages/Chat/show.jsx` to listen for real-time messages:

```javascript
import { useEffect } from 'react';

// Add this inside the component
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
```

## Client App Setup

### 1. Install Dependencies

The client app already has `pusher-js` installed. You may need to install additional dependencies:

```bash
cd client
npm install @react-native-async-storage/async-storage
```

### 2. Create Pusher Service

Create `client/services/pusher.ts`:

```typescript
import Pusher from 'pusher-js';
import { apiService } from './api';

let pusherInstance: Pusher | null = null;

export const initializePusher = (token: string) => {
  if (pusherInstance) {
    pusherInstance.disconnect();
  }

  const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_APP_KEY || '';
  const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER || '';

  pusherInstance = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    authEndpoint: `${process.env.EXPO_PUBLIC_API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return pusherInstance;
};

export const getPusher = () => {
  if (!pusherInstance) {
    throw new Error('Pusher not initialized. Call initializePusher first.');
  }
  return pusherInstance;
};

export const disconnectPusher = () => {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
};
```

### 3. Add Environment Variables

Add to `client/.env` or your environment configuration:

```env
EXPO_PUBLIC_PUSHER_APP_KEY=your_pusher_key
EXPO_PUBLIC_PUSHER_APP_CLUSTER=your_pusher_cluster
```

### 4. Update AuthContext

Update `client/contexts/AuthContext.tsx` to initialize Pusher on login:

```typescript
import { initializePusher, disconnectPusher } from '@/services/pusher';

// In login function, after successful login:
if (response.data.token) {
  apiService.setToken(response.data.token);
  initializePusher(response.data.token);
}

// In logout function:
disconnectPusher();
```

### 5. Update Chat Screen

Update `client/app/(tabs)/chat.tsx` to listen for real-time messages:

```typescript
import { useEffect } from 'react';
import { getPusher } from '@/services/pusher';
import { useAuth } from '@/contexts/AuthContext';

// Inside the component, add:
useEffect(() => {
  if (!chat) return;

  try {
    const pusher = getPusher();
    const channel = pusher.subscribe(`private-chat.${chat.id}`);

    channel.bind('message.sent', (data: Message) => {
      setMessages((prev) => {
        const exists = prev.find((msg) => msg.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });
      scrollToBottom();
    });

    return () => {
      channel.unbind('message.sent');
      pusher.unsubscribe(`private-chat.${chat.id}`);
    };
  } catch (error) {
    console.error('Error setting up Pusher:', error);
  }
}, [chat]);
```

## Broadcasting Authentication

The broadcasting authentication is handled automatically through Laravel's broadcasting system. Make sure:

1. CSRF protection is configured for web routes
2. Sanctum authentication is working for API routes
3. The `routes/channels.php` file is properly configured

## Testing

1. **Admin Side:**
   - Log in to the admin panel
   - Navigate to Chat Management
   - Open a chat with a client
   - Send a message and verify it appears in real-time

2. **Client Side:**
   - Log in to the client app
   - Navigate to the Chat tab
   - Send a message
   - Verify it appears in the admin panel in real-time

## Troubleshooting

### Messages not appearing in real-time

1. Check browser console for Pusher connection errors
2. Verify Pusher credentials are correct
3. Check that the broadcasting driver is set to `pusher`
4. Ensure the queue worker is running if using queues

### Authentication errors

1. Verify CSRF token is included in requests
2. Check that the user is authenticated
3. Verify channel authorization in `routes/channels.php`

### Client app connection issues

1. Verify Pusher credentials in environment variables
2. Check that the auth token is being sent correctly
3. Ensure the API URL is correct in the Pusher auth endpoint

## Notes

- The chat system creates a chat automatically when a client first accesses it
- Each client has one chat with the system
- Admins can view all chats and assign themselves to chats
- Messages are marked as read when viewed by the recipient
- The system supports pagination for message history

