import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../app.module'

describe('DocsController (/openapi.json e /docs)', () => {
    let app: INestApplication

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
        app = moduleRef.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('GET /openapi.json serve o spec da raiz do monorepo, sem autenticacao', async () => {
        const response = await request(app.getHttpServer()).get('/openapi.json').expect(200)

        expect(response.headers['content-type']).toMatch(/application\/json/)
        expect(response.body.openapi).toBe('3.0.3')
        expect(response.body.info.title).toBe('CompHub Backend API')
        expect(Object.keys(response.body.paths).sort()).toEqual([
            '/getPlayerCounts',
            '/getPlayersInRoom',
        ])
    })

    it('GET /docs serve a pagina do Swagger UI apontando para /openapi.json', async () => {
        const response = await request(app.getHttpServer()).get('/docs').expect(200)

        expect(response.headers['content-type']).toMatch(/text\/html/)
        expect(response.text).toContain('id="swagger-ui"')
        expect(response.text).toContain("url: '/openapi.json'")
        expect(response.text).toContain('swagger-ui-bundle.js')
    })
})
