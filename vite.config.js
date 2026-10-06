import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      ignored: ['**/*.fbx', '**/*.glb', '**/*.gltf', '**/*.blend', '**/*.max'],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
