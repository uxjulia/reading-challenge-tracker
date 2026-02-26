import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildDate = () => ({
  name: "build-date",
  transformIndexHtml(html) {
    return html.replace(
      "</head>",
      `  <meta name="build-date" content="${new Date().toLocaleString("en-US", { timeZone: "America/New_York", month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).replace(", ", " - ").replace(" AM", "AM").replace(" PM", "PM")}" />\n  </head>`,
    );
  },
});

export default defineConfig({
  plugins: [react(), buildDate()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
