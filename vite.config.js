import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const buildTime = new Date().toISOString()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    port: 4000,
  },
})
