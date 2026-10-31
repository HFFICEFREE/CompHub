import { getAllowedOrigins } from './origins'

describe('getAllowedOrigins', () => {
    it('normaliza a origem para o formato origin (sem barra final)', () => {
        expect(getAllowedOrigins('http://localhost:3000')).toEqual(['http://localhost:3000'])
        expect(getAllowedOrigins('https://app.exemplo.com/')).toEqual(['https://app.exemplo.com'])
    })

    it('aceita multiplas origens separadas por virgula e ignora espacos/vazios', () => {
        expect(
            getAllowedOrigins('http://localhost:3000, https://app.exemplo.com , ,'),
        ).toEqual(['http://localhost:3000', 'https://app.exemplo.com'])
    })

    it('falha no boot quando FRONTEND_URL esta ausente', () => {
        expect(() => getAllowedOrigins(undefined)).toThrow(
            'FRONTEND_URL environment variable is required.',
        )
        expect(() => getAllowedOrigins('')).toThrow(
            'FRONTEND_URL environment variable is required.',
        )
        expect(() => getAllowedOrigins('   ')).toThrow(
            'FRONTEND_URL environment variable is required.',
        )
    })

    it('falha no boot quando alguma origem nao e uma URL valida', () => {
        expect(() => getAllowedOrigins('http://localhost:3000,nao-e-url')).toThrow(
            'Invalid origin in FRONTEND_URL: nao-e-url',
        )
        expect(() => getAllowedOrigins('http://localhost:3000, http://')).toThrow(
            'Invalid origin in FRONTEND_URL: http://',
        )
    })

    it('comportamento herdado do Express: origem sem esquema vira "null" em vez de falhar', () => {
        // `new URL('localhost:3000')` nao lanca (e um esquema nao-especial),
        // entao a origem aceita vira "null" e o CORS bloqueia tudo em runtime.
        // Mantido em paridade com apps/api/src/index.ts — nao alterar comportamento
        // na migracao; corrigir num PR dedicado (validar esquema http/https).
        expect(getAllowedOrigins('localhost:3000')).toEqual(['null'])
    })
})
