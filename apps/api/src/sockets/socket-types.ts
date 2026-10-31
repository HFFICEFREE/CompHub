import { z } from 'zod'
import type { Session } from '@comphub/core'

// O contrato de rede (JoinRealm, MovePlayer, Teleport, ChangedSkin,
// NewMessage) mora em @comphub/core e e compartilhado com o backend Nest.
// Aqui ficam so o que e exclusivo desta implementacao Express.

export const Disconnect = z.any()

export type OnEventCallback<T = unknown> = (args: { session: Session, data: T }) => void
