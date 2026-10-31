import { findPath } from './pathfinding'

describe('findPath (espelha o BFS do cliente)', () => {
    it('encontra caminho em espaço aberto', () => {
        const path = findPath([0, 0], [3, 0], new Set())

        expect(path).not.toBeNull()
        // Como no cliente: o path exclui o tile de partida (slice(1))
        expect([...(path ?? [])].pop()).toEqual([3, 0])
        expect(path).toHaveLength(3)
    })

    it('devolve caminho vazio quando já está no destino', () => {
        // mover para o mesmo tile é um no-op válido, não um ataque
        expect(findPath([0, 0], [0, 0], new Set())).toEqual([])
    })

    it('retorna null quando o destino é bloqueado', () => {
        expect(findPath([0, 0], [2, 0], new Set(['2, 0']))).toBeNull()
    })

    it('desvia de obstáculo no meio', () => {
        const blocked = new Set(['1, 0'])
        const path = findPath([0, 0], [2, 0], blocked)

        expect(path).not.toBeNull()
        expect([...(path ?? [])].pop()).toEqual([2, 0])
        expect((path ?? []).some(([x, y]) => blocked.has(`${x}, ${y}`))).toBe(false)
    })

    it('retorna null quando o destino está cercado', () => {
        const blocked = new Set(['3, -1', '4, 0', '3, 1', '2, 0', '2, -1', '2, 1'])
        expect(findPath([0, 0], [3, 0], blocked)).toBeNull()
    })

    it('respeita o teto de tentativas', () => {
        expect(findPath([0, 0], [100, 100], new Set(), 5)).toBeNull()
    })

    it('rejeita coordenadas fora dos limites plausíveis', () => {
        expect(findPath([0, 0], [5_000, 0], new Set())).toBeNull()
        expect(findPath([0, 0], [0, -9_999], new Set())).toBeNull()
    })

    it('sprites collider do cliente não bloqueiam o servidor', () => {
        // No cliente, tiles de sprite collider entram no Set de obstáculos;
        // no servidor só o `impassable` do tilemap. Um destino cercado apenas
        // por colliders é inalcançável no cliente mas alcançável aqui — o
        // servidor é sempre mais permissivo, nunca mais restritivo.
        const clientOnlyObstacle = new Set([
            '1, 0', '1, 1', '1, -1',
            '2, 1', '2, -1',
            '3, 0', '3, 1', '3, -1',
        ])

        expect(findPath([0, 0], [2, 0], clientOnlyObstacle)).toBeNull()
        expect(findPath([0, 0], [2, 0], new Set())).not.toBeNull()
    })
})
