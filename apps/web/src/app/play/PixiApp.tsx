'use client'
import React, { useRef } from 'react'
import { PlayApp } from '@/utils/pixi/PlayApp'
import { useEffect } from 'react'
import { RealmData } from '@/utils/pixi/types'
import { useModal } from '../hooks/useModal'
import { server } from '@/utils/backend/server'

type PixiAppProps = {
    className?: string
    mapData: RealmData
    username: string
    access_token: string
    realmId: string
    uid: string
    shareId: string
    initialSkin: string
}

const PixiApp:React.FC<PixiAppProps> = ({ className, mapData, username, access_token, realmId, uid, shareId, initialSkin }) => {

    const appRef = useRef<PlayApp | null>(null)
    const { setModal, setLoadingText, setFailedConnectionMessage, setErrorModal } = useModal()

    useEffect(() => {
        let cancelled = false
        let app: PlayApp | null = null

        const mount = async () => {
            app = new PlayApp(uid, realmId, mapData, username, initialSkin)
            appRef.current = app
            setModal('Loading')
            setLoadingText('Connecting to server...')
            const { success, errorMessage } = await server.connect(realmId, uid, shareId, access_token, {
                mapData,
                skin: initialSkin,
            })

            // O efeito pode ter sido desmontado (StrictMode) enquanto conectava.
            if (cancelled) return

            if (!success) {
                setErrorModal('Failed To Connect')
                setFailedConnectionMessage(errorMessage)
                return
            }

            setLoadingText('Loading game...')
            await app.init()

            if (cancelled) return

            setModal('None')
            const pixiApp = app.getApp()
            
            document.getElementById('app-container')!.appendChild(pixiApp.canvas)
        }

        mount()
        
        return () => {
            cancelled = true
            app?.destroy()
            if (appRef.current === app) {
                appRef.current = null
            }
        }
    }, [])

    return (
        <div id='app-container' className={`overflow-hidden ${className}`}>
            
        </div>
    )
}

export default PixiApp
