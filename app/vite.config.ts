import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const isProd = mode === 'production';
  const isGitHubPagesBuild = process.env.VITE_DEPLOY_TARGET === 'github-pages';
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'blwatchlist';
  const appBase = isGitHubPagesBuild ? `/${repositoryName}/` : './';

  // Only load the dev-inspect plugin in non-production builds
  const devPlugins: Plugin[] = [];
  if (!isProd) {
    try {
      const { inspectAttr } = await import('kimi-plugin-inspect-react');
      devPlugins.push(inspectAttr() as Plugin);
    } catch {
      // plugin not available — continue without it
    }
  }

  return {
    base: appBase,
    plugins: [
      ...devPlugins,
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'BL Watchlist',
          short_name: 'BL Watchlist',
          description:
            'BL Watchlist Manager is a personal collection manager designed for Boys\' Love (BL) series and movies. It helps users organize their watchlist, monitor ongoing releases, evaluate favorites, create annual Top 10 rankings, and explore their viewing habits through personalized statistics and achievements.',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait',
          // GitHub Pages project sites live below /<repository>/; using an
          // absolute root here makes an installed PWA launch into a 404.
          scope: appBase,
          start_url: appBase,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cache all build assets (JS, CSS, HTML)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
          // Serve index.html for all navigation requests when offline
          // (fixes "offline" screen when launching the installed PWA)
          navigateFallback: `${appBase}index.html`,
          // Runtime caching for Google Fonts
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
          // Do NOT use skipWaiting/clientsClaim with registerType:'prompt'.
          // clientsClaim: true causes the new SW to seize control of the
          // already-open page mid-session, making lazy-loaded chunks (with
          // old content-hashed filenames) 404 from the new cache → frozen UI.
          // The update prompt handles the reload explicitly instead.
          skipWaiting: false,
          clientsClaim: false,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Raise warning threshold — we're splitting intentionally
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React runtime — tiny, always needed
            'vendor-react': ['react', 'react-dom', 'react-router'],
            // Animation library — heavy, shared everywhere
            'vendor-motion': ['framer-motion'],
            // Charts — only used in StatisticsTab (lazy-loaded)
            'vendor-charts': ['recharts'],
            // Radix UI primitives — shared across all tabs
            'vendor-radix': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-label',
              '@radix-ui/react-menubar',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
              '@radix-ui/react-tooltip',
            ],
            // Drag-and-drop — only used in Top10Tab (lazy-loaded)
            'vendor-dnd': ['@hello-pangea/dnd'],
          },
        },
      },
    },
  };
});
