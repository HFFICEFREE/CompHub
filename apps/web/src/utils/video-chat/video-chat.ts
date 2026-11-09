import type {
    IAgoraRTCClient,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
    IAgoraRTCRemoteUser,
    IDataChannelConfig,
} from 'agora-rtc-sdk-ng'
import signal from '../signal'
import { generateToken } from './generateToken'

// No offline o Agora nao existe; os botoes de mic/camera viram no-ops para
// nao abrir dispositivos nem tentar conectar com credenciais dummy.
const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true'

// O SDK do Agora acessa `window` no proprio import. Carregando sob demanda
// (e so no browser), o SSR de /play deixa de quebrar com "window is not
// defined" — o chunk do Agora nem e baixado no modo offline.
type AgoraSdk = {
    createClient: (config: { codec: string; mode: string }) => IAgoraRTCClient
    createCameraVideoTrack: () => Promise<ICameraVideoTrack>
    createMicrophoneAudioTrack: () => Promise<IMicrophoneAudioTrack>
    setLogLevel: (level: number) => void
}

let agoraSdk: Promise<AgoraSdk> | null = null

function loadAgora(): Promise<AgoraSdk> {
    if (!agoraSdk) {
        agoraSdk = import('agora-rtc-sdk-ng').then((mod) => {
            const sdk = (mod as unknown as { default?: AgoraSdk }).default ?? (mod as unknown as AgoraSdk)
            return sdk
        })
    }

    return agoraSdk
}

export class VideoChat {
    private client: IAgoraRTCClient | null = null
    private microphoneTrack: IMicrophoneAudioTrack | null = null
    private cameraTrack: ICameraVideoTrack | null = null
    private currentChannel: string = ''

    private remoteUsers: { [uid: string]: IAgoraRTCRemoteUser } = {}

    private channelTimeout: NodeJS.Timeout | null = null

    private async getClient(): Promise<IAgoraRTCClient> {
        if (this.client) return this.client

        const AgoraRTC = await loadAgora()
        AgoraRTC.setLogLevel(4)

        const client = AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' })
        client.on('user-published', this.onUserPublished)
        client.on('user-unpublished', this.onUserUnpublished)
        client.on('user-left', this.onUserLeft)
        client.on('user-info-updated', this.onUserInfoUpdated)
        client.on('user-joined', this.onUserJoined)

        this.client = client
        return client
    }

    private onUserInfoUpdated = (uid: string) => {
        if (!this.remoteUsers[uid]) return
        signal.emit('user-info-updated', this.remoteUsers[uid])
    }

    private onUserJoined = (user: IAgoraRTCRemoteUser) => {
        this.remoteUsers[user.uid] = user
        signal.emit('user-info-updated', user)
    }

    public onUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel", config?: IDataChannelConfig) => {
        this.remoteUsers[user.uid] = user
        if (this.client) {
            await this.client.subscribe(user, mediaType)
        }

        if (mediaType === 'audio') {
            user.audioTrack?.play()
        }

        if (mediaType === 'audio' || mediaType === 'video') {
            signal.emit('user-info-updated', user)
        }
    }

    public onUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
        if (mediaType === 'audio') {
            user.audioTrack?.stop()
        }
    }

    public onUserLeft = (user: IAgoraRTCRemoteUser, reason: string) => {
        delete this.remoteUsers[user.uid]
        signal.emit('user-left', user)
    }

    public async toggleCamera() {
        if (OFFLINE_MODE) return true

        const AgoraRTC = await loadAgora()
        const client = await this.getClient()

        if (!this.cameraTrack) {
            this.cameraTrack = await AgoraRTC.createCameraVideoTrack()
            this.cameraTrack.play('local-video')

            if (client.connectionState === 'CONNECTED') {
                await client.publish([this.cameraTrack])
            }

            return false
        }
        await this.cameraTrack.setEnabled(!this.cameraTrack.enabled)

        if (client.connectionState === 'CONNECTED' && this.cameraTrack.enabled) {
            await client.publish([this.cameraTrack])
        }

        return !this.cameraTrack.enabled
    }

    // TODO: Set it up so microphone gets muted and unmuted instead of enabled and disabled

    public async toggleMicrophone() {
        if (OFFLINE_MODE) return true

        const AgoraRTC = await loadAgora()
        const client = await this.getClient()

        if (!this.microphoneTrack) {
            this.microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack()

            if (client.connectionState === 'CONNECTED') {
                await client.publish([this.microphoneTrack])
            }

            return false
        }
        await this.microphoneTrack.setMuted(!this.microphoneTrack.muted)

        return this.microphoneTrack.muted
    }

    public playVideoTrackAtElementId(elementId: string) {
        if (this.cameraTrack) {
            this.cameraTrack.play(elementId)
        }
    }

    private resetRemoteUsers() {
        this.remoteUsers = {}
        signal.emit('reset-users')
    }

    public async joinChannel(channel: string, uid: string) {
        if (OFFLINE_MODE) return

        if (this.channelTimeout) {
            clearTimeout(this.channelTimeout)
        }

        this.channelTimeout = setTimeout(async () => {
            if (channel === this.currentChannel) return
            const credentials = await generateToken()
            if (!credentials) return
            const { token, channelName } = credentials

            const client = await this.getClient()

            if (client.connectionState === 'CONNECTED') {
                await client.leave()
            }
            this.resetRemoteUsers()

            await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, channelName, token, uid)
            this.currentChannel = channel

            if (this.microphoneTrack && this.microphoneTrack.enabled) {
                await client.publish([this.microphoneTrack])
            }
            if (this.cameraTrack && this.cameraTrack.enabled) {
                await client.publish([this.cameraTrack])
            }
        }, 1000)
    }

    public async leaveChannel() {
        if (OFFLINE_MODE) return

        if (this.channelTimeout) {
            clearTimeout(this.channelTimeout)
        }

        this.channelTimeout = setTimeout(async () => {
            if (this.currentChannel === '') return

            if (this.client?.connectionState === 'CONNECTED') {
                await this.client.leave()
                this.currentChannel = ''
            }
            this.resetRemoteUsers()
        }, 1000)
        
    }

    public destroy() {
        if (this.cameraTrack) {
            this.cameraTrack.stop()
            this.cameraTrack.close()
        }
        if (this.microphoneTrack) {
            this.microphoneTrack.stop()
            this.microphoneTrack.close()
        }
        this.microphoneTrack = null
        this.cameraTrack = null
    }

}

export const videoChat = new VideoChat()
