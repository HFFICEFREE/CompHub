// Port do pathfinding do cliente (apps/web/src/utils/pixi/pathfinding.ts)
// com a MESMA semântica: BFS 4-direcional, `blocked` como obstáculos e
// teto de tentativas. O servidor usa apenas os tiles `impassable` como
// obstáculos (subconjunto do conjunto do cliente), então todo caminho
// encontrado pelo cliente também existe aqui.

export type Coordinate = [number, number]

const DIRECTIONS: Coordinate[] = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
]

// Coordenadas absurdas nunca são movimento legítimo (salas têm no máximo
// 10k tiles) e protegem o BFS de explorar o "vazio" infinito
const MAX_COORD = 2_000

// O cliente corta em 10k; usamos 5x mais folga para nunca sermos mais
// restritivos que ele (com menos obstáculos, as camadas do BFS são mais largas)
const DEFAULT_MAX_ATTEMPTS = 50_000

export function findPath(
    start: Coordinate,
    end: Coordinate,
    blocked: Set<string>,
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): Coordinate[] | null {
    if (Math.abs(end[0]) > MAX_COORD || Math.abs(end[1]) > MAX_COORD) {
        return null
    }
    if (blocked.has(`${end[0]}, ${end[1]}`)) {
        return null
    }

    const queue: [Coordinate, Coordinate[]][] = [[start, [start]]]
    const visited = new Set<string>(blocked)
    visited.add(`${start[0]}, ${start[1]}`)

    let attempts = 0

    while (queue.length > 0) {
        if (attempts >= maxAttempts) {
            return null
        }
        attempts++

        const [currentPos, path] = queue.shift()!
        const [x, y] = currentPos

        if (x === end[0] && y === end[1]) {
            return path.slice(1)
        }

        for (const [dx, dy] of DIRECTIONS) {
            const nextPos: Coordinate = [x + dx, y + dy]
            const nextPosStr = `${nextPos[0]}, ${nextPos[1]}`
            if (!visited.has(nextPosStr)) {
                visited.add(nextPosStr)
                queue.push([nextPos, path.concat([nextPos])])
            }
        }
    }

    return null
}
