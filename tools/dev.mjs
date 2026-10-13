import { spawn } from 'node:child_process';
const children = ['@boot-loop/server', '@boot-loop/client'].map((workspace) => spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev', '--workspace', workspace], { stdio: 'inherit', env: process.env }));
let closing = false;
function close(code = 0) { if (closing) return; closing = true; for (const child of children) child.kill('SIGTERM'); process.exitCode = code; }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => close());
for (const child of children) { child.on('error', (error) => { console.error(error); close(1); }); child.on('exit', (code) => { if (!closing) close(code ?? 1); }); }


