// Rate limiter em memória (janela deslizante simples por chave).
// Para escalar horizontalmente (Fase 3) esta classe sai atrás de uma
// interface — a implementação em Redis entra no lugar sem mudar os call sites.

type Bucket = {
    count: number
    resetAt: number
}

// Se o mapa crescer demais, varremos os buckets expirados
const SWEEP_THRESHOLD = 500

export class RateLimiter {
    private buckets = new Map<string, Bucket>()

    constructor(private readonly limit: number, private readonly windowMs: number) {}

    public allow(key: string): boolean {
        const now = Date.now()
        this.cleanup(now)

        const bucket = this.buckets.get(key)
        if (!bucket || now >= bucket.resetAt) {
            this.buckets.set(key, { count: 1, resetAt: now + this.windowMs })
            return true
        }

        if (bucket.count >= this.limit) {
            return false
        }

        bucket.count++
        return true
    }

    private cleanup(now: number) {
        if (this.buckets.size < SWEEP_THRESHOLD) return

        for (const [key, bucket] of this.buckets) {
            if (now >= bucket.resetAt) {
                this.buckets.delete(key)
            }
        }
    }
}
