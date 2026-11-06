import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
// Which build is running: the host's commit (Vercel sets it) or, on a developer machine, the checked-out one. Shown in Settings.
const commit = (() => { try { return (process.env.VERCEL_GIT_COMMIT_SHA || execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()).trim().slice(0, 7); } catch { return 'local'; } })();
const build = { commit: commit || 'local', date: new Date().toISOString().slice(0, 10) };
// Libraries change far less often than the game, so they ship as separate chunks that stay cached across deploys.
const vendor = (id: string) => /node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : /node_modules\/(zod|lucide-react)\//.test(id) ? 'libs' : undefined;
export default defineConfig({define:{__BUILD__:JSON.stringify(build)},server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5174',ws:true}}},build:{rollupOptions:{output:{manualChunks:vendor}}}});
