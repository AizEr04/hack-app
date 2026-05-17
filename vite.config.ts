import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repo name for GitHub Pages base path. Override via env if needed.
const base = process.env.VITE_BASE_PATH ?? '/hack-app/';

export default defineConfig({
  plugins: [react()],
  base,
});

