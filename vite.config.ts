import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal config to test base path
export default defineConfig({
  plugins: [react()],
  base: '/',
  clearScreen: false // Adding this just to make build logs potentially more verbose
});