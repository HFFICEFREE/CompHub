// Le o `exp` de um JWT sem validar a assinatura — serve SO para agendar a
// desconexao do socket quando o token vencer (o Supabase ja validou a
// assinatura no handshake). Espelho de apps/api/src/sockets/sockets.ts.
export function getTokenExpirationMs(token: string): number | null {
    const payload = token.split('.')[1]
    if (!payload) return null

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown }
        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
    } catch {
        return null
    }
}
