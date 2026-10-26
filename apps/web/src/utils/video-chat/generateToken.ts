'use server'
import { RtcRole, RtcTokenBuilder } from 'agora-token'
import { createClient } from '../supabase/server'

export async function generateToken() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const channelResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agoraChannel`, {
        headers: {
            Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
    }).catch(() => null)

    if (!channelResponse?.ok) return null

    const { channelName } = await channelResponse.json().catch(() => ({}))
    if (typeof channelName !== 'string' || !channelName) return null

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!
    const appCertificate = process.env.APP_CERTIFICATE!
    const uid = 0
    const role = RtcRole.PUBLISHER
    const expireTime = 3600
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const expiredTs = currentTimestamp + expireTime

    const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        role,
        expiredTs,
        expiredTs,
    )

    return { token, channelName }
}