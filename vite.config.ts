import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Honor an assigned port (e.g. from the preview harness); default to 5173
    // so `npm run dev` and the Electron loader keep working unchanged.
    port: Number(process.env.PORT) || 5173,
  },
})
