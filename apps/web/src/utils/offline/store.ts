import 'server-only'
import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import defaultMap from '@/utils/defaultmap.json'
import { defaultSkin } from '@/utils/pixi/Player/skins'
import type { RealmData } from '@/utils/pixi/types'
import { isOfflineMode } from './config'
import type { OfflineQueryResult, OfflineQuerySpec } from './query'

type OfflineRow = Record<string, unknown>

export type OfflineProfile = {
    id: string
    skin: string
    visited_realms: string[]
}

export type OfflineRealm = {
    id: string
    owner_id: string
    name: string
    share_id: string
    only_owner: boolean
    map_data: unknown
}

type OfflineStore = {
    version: 1
    /** Uids que ja receberam o realm inicial (para nao recriar apos delete). */
    seeded: Record<string, boolean>
    profiles: OfflineProfile[]
    realms: OfflineRealm[]
}

const OFFLINE_TABLES = ['realms', 'profiles'] as const
type OfflineTable = (typeof OFFLINE_TABLES)[number]

// apps/web roda com cwd = apps/web; a raiz do monorepo fica dois niveis acima.
// OFFLINE_DATA_FILE permite apontar para outro lugar (testes/smoke).
const dataFile = process.env.OFFLINE_DATA_FILE
    ? path.resolve(process.env.OFFLINE_DATA_FILE)
    : path.resolve(process.cwd(), '..', '..', '.offline', 'data.json')

// Serializa leitura/escrita no processo do Next. Em dev ha um unico servidor;
// a fila evita corromper o JSON quando duas requisicoes chegam juntas.
let queue: Promise<unknown> = Promise.resolve()

function emptyStore(): OfflineStore {
    return {
        version: 1,
        seeded: {},
        profiles: [],
        realms: [],
    }
}

async function readStore(): Promise<OfflineStore> {
    try {
        const raw = await fs.readFile(dataFile, 'utf8')
        const parsed = JSON.parse(raw) as Partial<OfflineStore>

        return {
            version: 1,
            seeded: parsed.seeded ?? {},
            profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
            realms: Array.isArray(parsed.realms) ? parsed.realms : [],
        }
    } catch {
        return emptyStore()
    }
}

async function writeStore(store: OfflineStore): Promise<void> {
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8')
}

function withStore<T>(fn: (store: OfflineStore) => { result: T; changed: boolean }): Promise<T> {
    const run = queue.then(async () => {
        const store = await readStore()
        const { result, changed } = fn(store)
        if (changed) {
            await writeStore(store)
        }
        return result
    })

    queue = run.then(
        () => undefined,
        () => undefined,
    )

    return run
}

function isOfflineTable(table: string): table is OfflineTable {
    return (OFFLINE_TABLES as readonly string[]).includes(table)
}

function rowsOf(store: OfflineStore, table: OfflineTable): OfflineRow[] {
    return (table === 'realms' ? store.realms : store.profiles) as unknown as OfflineRow[]
}

function matches(row: OfflineRow, filters: OfflineQuerySpec['filters']): boolean {
    return filters.every((filter) => row[filter.column] === filter.value)
}

function project(row: OfflineRow, columns?: string): OfflineRow {
    if (!columns || columns.trim() === '*') return { ...row }

    const projected: OfflineRow = {}
    for (const column of columns.split(',').map((value) => value.trim()).filter(Boolean)) {
        projected[column] = row[column]
    }
    return projected
}

function collectSeedUids(spec: OfflineQuerySpec): string[] {
    const uids = new Set<string>()
    // `profiles.id` e o uid; `realms.id` e o id do realm. Confundir os dois
    // criaria um "usuario" para cada realm consultado por id.
    const uidColumns = spec.table === 'profiles' ? ['id'] : ['owner_id']
    const collectFromRow = (row: unknown) => {
        if (!row || typeof row !== 'object') return
        for (const column of uidColumns) {
            const value = (row as Record<string, unknown>)[column]
            if (typeof value === 'string') uids.add(value)
        }
    }

    for (const filter of spec.filters) {
        if (uidColumns.includes(filter.column) && typeof filter.value === 'string') {
            uids.add(filter.value)
        }
    }

    if (spec.action === 'insert' || spec.action === 'update') {
        const values = Array.isArray(spec.values) ? spec.values : spec.values ? [spec.values] : []
        for (const value of values) collectFromRow(value)
    }

    return [...uids]
}

/** Cria perfil + realm inicial na primeira vez que um uid aparece no store. */
function seedUser(store: OfflineStore, uid: string): boolean {
    if (!uid || store.seeded[uid]) return false

    store.seeded[uid] = true

    if (!store.profiles.some((profile) => profile.id === uid)) {
        store.profiles.push({
            id: uid,
            skin: defaultSkin,
            visited_realms: [],
        })
    }

    if (!store.realms.some((realm) => realm.owner_id === uid)) {
        store.realms.push({
            id: `seed-realm-${uid}`,
            owner_id: uid,
            name: 'My Space',
            share_id: `seed-share-${uid}`,
            only_owner: false,
            map_data: defaultMap as unknown as RealmData,
        })
    }

    return true
}

function makeRow(table: OfflineTable, value: Record<string, unknown>): OfflineRow {
    if (table === 'realms') {
        return {
            id: randomUUID(),
            share_id: randomUUID(),
            only_owner: false,
            ...value,
        }
    }

    return {
        skin: defaultSkin,
        visited_realms: [],
        ...value,
    }
}

function runAction(store: OfflineStore, spec: OfflineQuerySpec): { result: OfflineQueryResult; changed: boolean } {
    const rows = rowsOf(store, spec.table as OfflineTable)

    switch (spec.action) {
        case 'select': {
            const matched = rows.filter((row) => matches(row, spec.filters))

            if (spec.single) {
                if (matched.length !== 1) {
                    return {
                        result: {
                            data: null,
                            error: {
                                message:
                                    matched.length === 0
                                        ? 'No rows found.'
                                        : 'Multiple rows found for a single request.',
                            },
                        },
                        changed: false,
                    }
                }

                return {
                    result: { data: project(matched[0], spec.columns), error: null },
                    changed: false,
                }
            }

            return {
                result: { data: matched.map((row) => project(row, spec.columns)), error: null },
                changed: false,
            }
        }

        case 'insert': {
            const values = Array.isArray(spec.values) ? spec.values : spec.values ? [spec.values] : []
            const inserted = values.map((value) => makeRow(spec.table as OfflineTable, value))
            rows.push(...inserted)

            return {
                result: {
                    data: spec.returning ? inserted.map((row) => project(row, spec.columns)) : null,
                    error: null,
                },
                changed: inserted.length > 0,
            }
        }

        case 'update': {
            const values = spec.values && !Array.isArray(spec.values) ? spec.values : {}
            const matched = rows.filter((row) => matches(row, spec.filters))

            for (const row of matched) {
                Object.assign(row, values)
            }

            return {
                result: {
                    data: spec.returning ? matched.map((row) => project(row, spec.columns)) : null,
                    error: null,
                },
                changed: matched.length > 0,
            }
        }

        case 'delete': {
            const removed: OfflineRow[] = []

            for (let index = rows.length - 1; index >= 0; index--) {
                if (matches(rows[index], spec.filters)) {
                    removed.push(rows[index])
                    rows.splice(index, 1)
                }
            }

            return {
                result: {
                    data: spec.returning ? removed.map((row) => project(row, spec.columns)) : null,
                    error: null,
                },
                changed: removed.length > 0,
            }
        }

        default:
            return {
                result: { data: null, error: { message: 'Unsupported offline query.' } },
                changed: false,
            }
    }
}

/**
 * Garante perfil + realm inicial para um uid sem bloquear a resposta.
 * A fila do store garante que qualquer query enfileirada depois desta
 * encontra o usuario ja semeado (importante para abrir /play ou /editor
 * direto pela URL, sem passar por /app).
 */
export function ensureOfflineUser(uid: string | null | undefined): void {
    if (!uid || !/^[A-Za-z0-9._-]{1,128}$/.test(uid)) return

    void executeOfflineQuery({
        table: 'profiles',
        action: 'select',
        filters: [{ column: 'id', value: uid }],
        single: true,
    })
}

export async function executeOfflineQuery(spec: OfflineQuerySpec): Promise<OfflineQueryResult> {
    if (!isOfflineMode()) {
        return { data: null, error: { message: 'Offline mode is disabled.' } }
    }

    if (!spec || typeof spec !== 'object' || !isOfflineTable(spec.table)) {
        return { data: null, error: { message: 'Invalid offline query.' } }
    }

    if (!spec.action) {
        return { data: null, error: { message: 'Missing offline query action.' } }
    }

    // Specs vindos do browser sempre trazem filters, mas aceitar a ausencia
    // deixa a ponte tolerante a chamadas manuais (curl/testes).
    const query: OfflineQuerySpec = {
        ...spec,
        filters: Array.isArray(spec.filters) ? spec.filters : [],
    }

    try {
        return await withStore((store) => {
            let changed = false
            for (const uid of collectSeedUids(query)) {
                changed = seedUser(store, uid) || changed
            }

            const outcome = runAction(store, query)
            return {
                result: outcome.result,
                changed: changed || outcome.changed,
            }
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown offline store error.'
        return { data: null, error: { message } }
    }
}
