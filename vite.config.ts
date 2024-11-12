import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';
// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: {'GeoserverTerrainProvider':'src/plugin/index.ts'},
      formats: ['iife','es','cjs'],
      name:'GeoserverTerrainProvider'
    },
    outDir:'dist',
    minify:'terser',terserOptions:{},
    rollupOptions: {
			// https://rollupjs.org/configuration-options/#external
			external: ['cesium']
		}
  },
  publicDir:'dist',
  plugins: [svelte(),dts({ rollupTypes: true })],
})
