import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import type {
    RealtimeChannel,
    RealtimePostgresDeletePayload,
    RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js'
import type { RealmData } from '@comphub/core'
import { SupabaseService } from '../supabase/supabase.service'
import { GameGateway } from '../sockets/game.gateway'

export type RealmRow = {
    id: string
    map_data: RealmData
    share_id: string
    only_owner: boolean
}

// Espelho do bloco de realtime de apps/api/src/index.ts: quando o dono muda o
// mapa, o link de convite ou o modo privado — ou apaga o realm — todo mundo
// online e derrubado, para ninguem continuar num cenario que ja nao existe.
//
// Diferenca intencional em relacao ao Express: la a inscricao acontecia como
// efeito colateral do import do index.ts e nunca era cancelada. Aqui ela vive
// no ciclo de vida do Nest — sobe no onApplicationBootstrap e desinscreve no
// onModuleDestroy, entao um shutdown limpo nao deixa conexao aberta.
@Injectable()
export class RealtimeService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(RealtimeService.name)
    private channel: RealtimeChannel | undefined

    constructor(
        private readonly supabase: SupabaseService,
        private readonly gateway: GameGateway,
    ) {}

    onApplicationBootstrap(): void {
        // Sem credenciais nao ha o que assinar. Mantemos o app no ar (mesma
        // filosofia do SupabaseService lazy) e avisamos no log — nos testes e
        // em dev local sem env e este caminho.
        if (!this.supabase.hasCredentials) {
            this.logger.warn(
                'SUPABASE_URL/SERVICE_ROLE ausentes: inscricao no realtime de realms nao iniciada.',
            )
            return
        }

        this.channel = this.supabase.client
            .channel('realms')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'realms' },
                (payload: RealtimePostgresUpdatePayload<RealmRow>) => this.onRealmUpdate(payload),
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'realms' },
                (payload: RealtimePostgresDeletePayload<RealmRow>) => this.onRealmDelete(payload),
            )
            .subscribe()
    }

    onModuleDestroy(): void {
        void this.channel?.unsubscribe()
        this.channel = undefined
    }

    onRealmUpdate(payload: RealtimePostgresUpdatePayload<RealmRow>): void {
        const id = payload.new.id
        const old = payload.old

        if (!old) {
            this.logger.warn(
                `Realm ${id} updated without previous data. Ensure the realms table has REPLICA IDENTITY FULL.`,
            )
            return
        }

        // Comparacao estrutural: a ordem das chaves do tilemap nao deve
        // derrubar a sessao, entao nao usamos Object.keys / referencia
        let refresh = false
        if (JSON.stringify(payload.new.map_data) !== JSON.stringify(old.map_data)) {
            refresh = true
        }
        if (payload.new.share_id !== old.share_id) {
            refresh = true
        }
        if (payload.new.only_owner !== old.only_owner) {
            refresh = true
        }

        if (refresh) {
            this.gateway.kickSessionPlayers(id, 'This realm has been changed by the owner.')
        }
    }

    onRealmDelete(payload: RealtimePostgresDeletePayload<RealmRow>): void {
        // Em DELETE o Supabase envia apenas as colunas da PK em `old`
        if (payload.old.id) {
            this.gateway.kickSessionPlayers(payload.old.id, 'This realm is no longer available.')
        }
    }
}
