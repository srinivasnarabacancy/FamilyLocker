import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

/**
 * Standalone SPA build.
 *
 * The Laravel/Inertia setup is gone: there is no `laravel-vite-plugin`, no
 * blade entry point and no manifest for PHP to read. Vite serves index.html
 * directly and proxies /api to the Node service.
 *
 * `publicDir` deliberately points at resources/static rather than public/,
 * which is still Laravel's web root and holds index.php, .htaccess and the
 * storage symlink — none of which belong in the SPA bundle.
 */
export default defineConfig({
    plugins: [vue()],
    publicDir: 'resources/static',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY || 'http://localhost:3000',
                changeOrigin: true,
            },
            // Uploaded files are served by the API host in development.
            '/storage': {
                target: process.env.VITE_API_PROXY || 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
