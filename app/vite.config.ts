import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.GEMINI_API_KEY && env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  const isGitHubPagesBuild = process.env.VITE_DEPLOY_TARGET === 'github-pages';
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'blwatchlist';
  const appBase = isGitHubPagesBuild ? `/${repositoryName}/` : './';

  return {
    base: appBase,
    plugins: [
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
      {
        name: 'gemini-api-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/gemini')) {
              return next();
            }

            let body: Record<string, any> = {};
            if (req.method === 'POST') {
              try {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(chunk);
                }
                const raw = Buffer.concat(chunks).toString('utf-8');
                if (raw) body = JSON.parse(raw);
              } catch {
                body = {};
              }
            }

            const url = req.url.split('?')[0];

            try {
              const {
                getSeriesMetadata,
                getRecommendations,
                generateContent,
                generateContentStream,
                DEFAULT_MODEL,
              } = await import('../server/geminiApi.ts');

              if (url === '/api/gemini/status') {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  status: 'ok',
                  configured: Boolean(process.env.GEMINI_API_KEY),
                  model: DEFAULT_MODEL,
                }));
                return;
              }

              if (url === '/api/gemini/metadata') {
                const { query } = body;
                if (!query) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing title query parameter.' }));
                  return;
                }
                const result = await getSeriesMetadata(query);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
                return;
              }

              if (url === '/api/gemini/recommendations') {
                const { favoriteTitles, topGenres } = body;
                const result = await getRecommendations(favoriteTitles || [], topGenres || []);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
                return;
              }

              if (url === '/api/gemini/generate') {
                const { prompt, systemInstruction } = body;
                if (!prompt) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing prompt parameter.' }));
                  return;
                }
                const text = await generateContent(prompt, systemInstruction);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ text }));
                return;
              }

              if (url === '/api/gemini/generate-stream') {
                const { prompt, systemInstruction } = body;
                if (!prompt) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing prompt parameter.' }));
                  return;
                }
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                for await (const chunk of generateContentStream(prompt, systemInstruction)) {
                  res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }

              next();
            } catch (err: unknown) {
              const formatted = (await import('../server/geminiApi.ts')).formatGeminiError(err);
              console.error('Gemini dev server error:', formatted.message);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: formatted.message }));
            }
          });
        },
      },
    ],
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
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
