/**
 * Extrai as origens permitidas a partir da variavel FRONTEND_URL.
 * Portado de apps/api/src/index.ts para manter a mesma semantica:
 * variavel obrigatoria, varias origens separadas por virgula e
 * qualquer valor que nao seja URL e um erro de boot.
 */
export function getAllowedOrigins(configured: string | undefined): string[] {
    const origins = configured
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)

    if (!origins?.length) {
        throw new Error('FRONTEND_URL environment variable is required.')
    }

    return origins.map((origin) => {
        try {
            return new URL(origin).origin
        } catch {
            throw new Error(`Invalid origin in FRONTEND_URL: ${origin}`)
        }
    })
}
