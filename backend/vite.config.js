import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    ...(isProduction
        ? {}
        : {
            server: {
                hmr: true,
            },
        },
    ),
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/recharts') || id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
                        return 'charts';
                    }

                    if (id.includes('node_modules/pdfjs-dist')) {
                        return 'pdf';
                    }

                    if (id.includes('node_modules/docx-preview')) {
                        return 'docx';
                    }

                    if (id.includes('node_modules/@radix-ui/')) {
                        return 'radix';
                    }
                },
            },
        },
    },
});
