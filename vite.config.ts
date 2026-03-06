import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "";

  return {
    server: {
      host: "::",
      port: 8080,
      ...(apiUrl && {
        proxy: {
          "/api": { target: apiUrl, changeOrigin: true },
          "/uploads": { target: apiUrl, changeOrigin: true },
        },
      }),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
