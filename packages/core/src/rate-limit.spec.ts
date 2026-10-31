import { RateLimiter } from './rate-limit'

describe('RateLimiter', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('permite até o limite dentro da janela', () => {
        const limiter = new RateLimiter(3, 1_000)

        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(false)
        expect(limiter.allow('a')).toBe(false)
    })

    it('as chaves são independentes (limite é por jogador)', () => {
        const limiter = new RateLimiter(1, 1_000)

        expect(limiter.allow('alice')).toBe(true)
        expect(limiter.allow('bob')).toBe(true)
        expect(limiter.allow('alice')).toBe(false)
        expect(limiter.allow('bob')).toBe(false)
    })

    it('libera o acesso quando a janela expira', () => {
        const limiter = new RateLimiter(2, 1_000)

        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(false)

        jest.advanceTimersByTime(1_000)

        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(true)
        expect(limiter.allow('a')).toBe(false)
    })

    it('chaves novas não são penalizadas pelas antigas', () => {
        const limiter = new RateLimiter(1, 60_000)

        expect(limiter.allow('spam')).toBe(true)
        expect(limiter.allow('spam')).toBe(false)

        jest.advanceTimersByTime(1_000)

        expect(limiter.allow('outro-jogador')).toBe(true)
    })
})
