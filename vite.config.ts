import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));
const [major, minor] = version.split('.');
const patch = (() => {
  try { return execSync('git rev-list --count HEAD').toString().trim(); }
  catch { return '0'; }
})();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${major}.${minor}.${patch}`),
  },
})
