import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "PsychoCore — Gestión Clínica",
        short_name: "PsychoCore",
        description: "Sistema de Gestión Integral para Psicólogos Clínicos",
        theme_color: "#3A6B6E",
        background_color: "#F4F2EE",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/app",
        scope: "/app",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Librerías externas — cambian poco, se cachean bien
          vendor:   ["react", "react-dom"],
          icons:    ["lucide-react"],
          supabase: ["@supabase/supabase-js"],
          // Módulos clínicos pesados — se cargan bajo demanda
          "mod-patients":  ["./src/modules/Patients.jsx"],
          "mod-sessions":  ["./src/modules/Sessions.jsx"],
          "mod-scales":    ["./src/modules/Scales.jsx"],
          "mod-treatment": ["./src/modules/TreatmentPlan.jsx"],
          "mod-reports":   ["./src/modules/Reports.jsx"],
          "mod-agenda":    ["./src/modules/Agenda.jsx"],
          "mod-risk":      ["./src/modules/RiskAssessment.jsx"],
          "mod-stats":     ["./src/modules/Stats.jsx"],
          "mod-finance":   ["./src/modules/Finance.jsx"],
          "mod-tasks":     ["./src/modules/Tasks.jsx"],
        }
      }
    }
  }
});
