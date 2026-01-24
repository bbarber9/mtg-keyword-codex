// vite.config.ts
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
    server: {
        port: 3000,
    },
    plugins: [
        tsConfigPaths(),
        tanstackStart(),
        // react's vite plugin must come after start's vite plugin
        viteReact(),
        vanillaExtractPlugin()
    ],
})