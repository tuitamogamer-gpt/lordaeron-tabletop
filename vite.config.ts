import { defineConfig } from 'vite';
// Libraries change far less often than the game, so they ship as separate chunks that stay cached across deploys.
const vendor = (id: string) => /node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : /node_modules\/(zod|lucide-react)\//.test(id) ? 'libs' : undefined;
export default defineConfig({server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5174',ws:true}}},build:{rollupOptions:{output:{manualChunks:vendor}}}});
