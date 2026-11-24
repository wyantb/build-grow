import { defineConfig } from 'vite';
export default defineConfig({
    root: './public',
    build: {
        outDir: '../dist',
        emptyOutDir: true
    },
    server: {
        port: 3000
    }
});
//# sourceMappingURL=vite.config.js.map