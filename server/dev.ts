import { createServer } from 'node:http';
import { handler } from './http.js';
import { attachWebSockets } from './websocket.js';
const server=createServer((req,res)=>{void handler(req,res);});
attachWebSockets(server);
server.listen(5174,'127.0.0.1',()=>process.stdout.write('Lordaeron authoritative multiplayer API: http://127.0.0.1:5174\n'));
