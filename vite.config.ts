import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "";

  return {
    base: './',
    server: {
      host: "::",
      port: 8080,
      ...(apiUrl && {
        proxy: {
          "/api": { target: apiUrl, changeOrigin: true },
          "/uploads": { target: apiUrl, changeOrigin: true },
          "/share": { target: apiUrl, changeOrigin: true },
        },
      }),
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectRegister: false, // Nós registramos manualmente em main.tsx
        manifest: {
          name: 'Map Safety Notifier',
          short_name: 'MapSafety',
          description: 'Mapa colaborativo para segurança e infraestrutura urbana',
          theme_color: '#121212',
          background_color: '#121212',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: app updates don't force users to re-download the map libs.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            // Pure Leaflet (no React) in one chunk, React + everything built on React (incl. react-leaflet)
            // in another: keeps the chunk graph acyclic (a cycle left React undefined at startup).
            if (/[\\/]node_modules[\\/](leaflet|leaflet\.markercluster|leaflet\.heat)[\\/]/.test(id)) return 'leaflet';
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run|react-leaflet|@react-leaflet|react-leaflet-cluster)[\\/]/.test(id)) return 'react';
            if (id.includes('@tanstack')) return 'query';
            if (id.includes('date-fns')) return 'date';
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
