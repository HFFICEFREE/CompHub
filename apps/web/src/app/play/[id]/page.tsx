import React from 'react'
import NotFound from '@/app/not-found'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getPlayRealmData } from '@/utils/supabase/getPlayRealmData'
import PlayClient from '../PlayClient'
import { updateVisitedRealms } from '@/utils/supabase/updateVisitedRealms'
import { formatEmailToName } from '@/utils/formatEmailToName'

export default async function Play({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ shareId?: string }> }) {
    // No Next 15 `params` e `searchParams` sao assincronos.
    const { id } = await params
    const { shareId } = await searchParams

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!session || !user) {
        return redirect('/signin')
    }
    const { data, error } = !shareId ? await supabase.from('realms').select('map_data, owner_id, name').eq('id', id).single() : await getPlayRealmData(session.access_token, shareId)
    const { data: profile, error: profileError } = await supabase.from('profiles').select('skin').eq('id', user.id).single()
    // Show not found page if no data is returned
    if (!data || !profile) {
        const message = error?.message || profileError?.message

        return <NotFound specialMessage={message}/>
    }

    const realm = data
    const map_data = realm.map_data

    let skin = profile.skin

    if (shareId && realm.owner_id !== user.id) {
        updateVisitedRealms(session.access_token, shareId)
    }

    return (
        <PlayClient 
            mapData={map_data} 
            username={formatEmailToName(user.user_metadata.email)} 
            access_token={session.access_token} 
            realmId={id}
            uid={user.id}
            shareId={shareId || ''}
            initialSkin={skin}
            name={realm.name}
        />
    )
}