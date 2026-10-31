import { getTokenExpirationMs } from './token-expiry'

function makeJwt(payload: object): string {
    return ['header', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'assinatura'].join('.')
}

describe('getTokenExpirationMs', () => {
    it('converte o exp em milissegundos absolutos', () => {
        expect(getTokenExpirationMs(makeJwt({ exp: 1_700_000_000 }))).toBe(1_700_000_000_000)
    })

    it('retorna null quando nao ha payload', () => {
        expect(getTokenExpirationMs('sem-payload')).toBeNull()
        expect(getTokenExpirationMs('a.b')).toBeNull()
    })

    it('retorna null quando o payload nao e um JSON valido', () => {
        expect(getTokenExpirationMs('a.%%%%')).toBeNull()
    })

    it('retorna null quando exp nao e numero', () => {
        expect(getTokenExpirationMs(makeJwt({ exp: 'amanha' }))).toBeNull()
        expect(getTokenExpirationMs(makeJwt({}))).toBeNull()
    })
})
