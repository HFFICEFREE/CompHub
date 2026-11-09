/**
 * Mini implementacao do query builder do Supabase usada pelo modo offline.
 * Cobre apenas o subconjunto que o app usa hoje (select/insert/update/delete
 * + eq + single), tanto no servidor (arquivo local) quanto no browser (via
 * `/api/offline/query`). O builder e puro: quem executa e o `runner`.
 */

export type OfflineFilter = {
    column: string
    value: unknown
}

export type OfflineQueryAction = 'select' | 'insert' | 'update' | 'delete'

export type OfflineQuerySpec = {
    table: string
    action: OfflineQueryAction | null
    columns?: string
    values?: Record<string, unknown> | Record<string, unknown>[]
    filters: OfflineFilter[]
    single?: boolean
    returning?: boolean
}

export type OfflineQueryError = { message: string }

export type OfflineQueryResult = {
    data: unknown
    error: OfflineQueryError | null
}

export type OfflineQueryRunner = (spec: OfflineQuerySpec) => Promise<OfflineQueryResult>

export class OfflineQueryBuilder implements PromiseLike<OfflineQueryResult> {
    private readonly spec: OfflineQuerySpec

    constructor(
        table: string,
        private readonly runner: OfflineQueryRunner,
    ) {
        this.spec = {
            table,
            action: null,
            filters: [],
        }
    }

    select(columns = '*'): this {
        // `.insert(x).select()` no Supabase significa "retorne as linhas
        // inseridas"; um select sem action e uma leitura normal.
        if (this.spec.action) {
            this.spec.returning = true
        } else {
            this.spec.action = 'select'
        }
        this.spec.columns = columns
        return this
    }

    insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
        this.spec.action = 'insert'
        this.spec.values = values
        return this
    }

    update(values: Record<string, unknown>): this {
        this.spec.action = 'update'
        this.spec.values = values
        return this
    }

    delete(): this {
        this.spec.action = 'delete'
        return this
    }

    eq(column: string, value: unknown): this {
        this.spec.filters.push({ column, value })
        return this
    }

    single(): this {
        this.spec.single = true
        return this
    }

    then<TResult1 = OfflineQueryResult, TResult2 = never>(
        onfulfilled?: ((value: OfflineQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this.runner(this.spec).then(onfulfilled, onrejected)
    }
}
