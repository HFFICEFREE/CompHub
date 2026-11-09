import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { videoChat } from '../../utils/video-chat/video-chat'

interface VideoChatContextType {
    toggleCamera: () => void
    toggleMicrophone: () => void
    isCameraMuted: boolean
    isMicMuted: boolean
}

const VideoChatContext = createContext<VideoChatContextType | undefined>(undefined)

interface AgoraVideoChatProviderProps {
    children: ReactNode
    uid: string
}

interface VideoChatProviderProps {
  children: ReactNode
}

// O provider antigo criava um client Agora no render. O SDK acessa `window`
// no import, o que quebrava o SSR de /play; o client agora e criado sob
// demanda dentro de utils/video-chat/video-chat.ts, so quando usado.
export const AgoraVideoChatProvider: React.FC<AgoraVideoChatProviderProps> = ({ children }) => {
    return (
        <VideoChatProvider>
            {children}
        </VideoChatProvider>
    )
}

const VideoChatProvider: React.FC<VideoChatProviderProps> = ({ children }) => {
    const [isCameraMuted, setIsCameraMuted] = useState(true)
    const [isMicMuted, setIsMicMuted] = useState(true)

    useEffect(() => {
        return () => {
            videoChat.destroy()
        }
    }, [])

    const toggleCamera = async () => {
        const muted = await videoChat.toggleCamera()
        setIsCameraMuted(muted)
    }

    const toggleMicrophone = async () => {
        const muted = await videoChat.toggleMicrophone()
        setIsMicMuted(muted)
    }

    const value: VideoChatContextType = {
        toggleCamera,
        toggleMicrophone,
        isCameraMuted,
        isMicMuted,
    }

    return (
        <VideoChatContext.Provider value={value}>
            {children}
        </VideoChatContext.Provider>
    )
}

export const useVideoChat = () => {
  const context = useContext(VideoChatContext)
  if (context === undefined) {
    throw new Error('useVideoChat must be used within a VideoChatProvider')
  }
  return context
}
