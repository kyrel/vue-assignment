/// <reference types="vitest" />

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import StylelintPlugin from 'vite-plugin-stylelint'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        StylelintPlugin({
            include: ['src/**/*.css', 'src/**/*.scss', 'src/**/*.sass', 'src/**/*.less', 'src/**/*.styl', 'src/**/*.vue'],
            emitErrorAsWarning: true
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        deps: {
            inline: ['vitest-canvas-mock'],
        },
        // check https://github.com/vitest-dev/vitest/issues/740
        threads: false,
        environmentOptions: {
            jsdom: {
                resources: 'usable',
            }
        }
        
    }
})
