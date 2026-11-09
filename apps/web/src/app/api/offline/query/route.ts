import { NextResponse } from 'next/server'
import { isOfflineMode } from '@/utils/offline/config'
import type { OfflineQuerySpec } from '@/utils/offline/query'
import { executeOfflineQuery } from '@/utils/offline/store'

// O store e um arquivo local: nunca cachear entre requisicoes.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    if (!isOfflineMode()) {
        return NextResponse.json({ message: 'Not found.' }, { status: 404 })
    }

    let spec: OfflineQuerySpec
    try {
        spec = (await request.json()) as OfflineQuerySpec
    } catch {
        return NextResponse.json({ data: null, error: { message: 'Invalid JSON body.' } }, { status: 400 })
    }

    const result = await executeOfflineQuery(spec)
    return NextResponse.json(result)
}
