import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Initialize Pusher and Echo only if credentials are available
const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;
const csrfMeta = document.querySelector('meta[name="csrf-token"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

if (pusherKey && pusherCluster && csrfToken) {
    import('laravel-echo').then((EchoModule) => {
        return import('pusher-js').then((PusherModule) => {
            const Echo = EchoModule.default;
            const Pusher = PusherModule.default;
            
            window.Pusher = Pusher;

            window.Echo = new Echo({
                broadcaster: 'pusher',
                key: pusherKey,
                cluster: pusherCluster,
                forceTLS: true,
                encrypted: true,
                authEndpoint: '/broadcasting/auth',
                auth: {
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                    },
                },
            });
        });
    }).catch((error) => {
        console.warn('Failed to initialize Pusher/Echo:', error);
    });
} else {
    if (!pusherKey || !pusherCluster) {
        console.debug('Pusher credentials not configured. Real-time features will be unavailable.');
    }
}