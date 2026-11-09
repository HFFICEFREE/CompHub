/**
 * `pnpm dev:offline`: sobe web + backend Nest sem Supabase.
 *
 * - OFFLINE_MODE=true: a API aceita o uid como token e ignora Supabase.
 * - NEXT_PUBLIC_OFFLINE_MODE=true: o front usa o store em .offline/data.json.
 * - web em 3000, API em 3001 (NEXT_PUBLIC_BACKEND_URL vem do .env.local).
 *
 * De proposito nao sobe o backend Express: os dois usam a porta 3001 e o
 * objetivo aqui e exercitar o Nest, que e o runtime do cutover da Fase 2.
 */
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm'

// Env comum aos dois processos. PORT NAO entra aqui: o Next respeita PORT e
// subiria na mesma porta da API (EADDRINUSE). Cada filho recebe a sua.
const sharedEnv = {
    ...process.env,
    OFFLINE_MODE: 'true',
    NEXT_PUBLIC_OFFLINE_MODE: 'true',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001',
    FRONTEND_URL:
        process.env.FRONTEND_URL ?? 'http://localhost:3000,http://127.0.0.1:3000',
}

const webEnv = {
    ...sharedEnv,
    PORT: process.env.WEB_PORT ?? '3000',
}

const apiEnv = {
    ...sharedEnv,
    PORT: process.env.API_PORT ?? '3001',
}

function spawnPnpm(args, env = sharedEnv) {
    return spawn(pnpm, args, {
        stdio: 'inherit',
        env,
        shell: isWindows,
    })
}

function run(args) {
    return new Promise((resolve, reject) => {
        const child = spawnPnpm(args)
        child.on('error', reject)
        child.on('exit', (code) => {
            if (code === 0) resolve()
            else reject(new Error(`pnpm ${args.join(' ')} saiu com codigo ${code}`))
        })
    })
}

const children = []
let shuttingDown = false

function shutdown(code) {
    if (shuttingDown) return
    shuttingDown = true

    for (const child of children) {
        if (child.exitCode !== null || !child.pid) continue

        if (isWindows) {
            spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
        } else {
            child.kill('SIGTERM')
        }
    }

    process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

try {
    console.log('Offline mode: compilando @comphub/core...')
    await run(['--filter', '@comphub/core', 'build'])

    children.push(spawnPnpm(['--filter', '@comphub/web', 'dev'], webEnv))
    children.push(spawnPnpm(['--filter', '@comphub/api-nest', 'dev'], apiEnv))

    for (const child of children) {
        child.on('exit', (code) => {
            // Qualquer um dos dois caindo derruba o conjunto: evita deixar
            // um servidor orfao segurando a porta depois de um crash.
            if (!shuttingDown) shutdown(code ?? 1)
        })
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : error)
    shutdown(1)
}
