import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
    private clientInstance: SupabaseClient | undefined

    // Cliente criado sob demanda: o app sobe (e os testes constroem o
    // modulo) mesmo sem env de Supabase, falhando so quando algo de fato
    // precisa autenticar.
    get client(): SupabaseClient {
        if (!this.clientInstance) {
            const url = process.env.SUPABASE_URL
            const serviceRole = process.env.SERVICE_ROLE

            if (!url || !serviceRole) {
                throw new Error('SUPABASE_URL and SERVICE_ROLE environment variables are required.')
            }

            this.clientInstance = createClient(url, serviceRole)
        }

        return this.clientInstance
    }
}
