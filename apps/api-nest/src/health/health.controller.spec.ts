import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../app.module'

describe('HealthController', () => {
    let app: INestApplication

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
        app = moduleRef.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('GET /health responde 200 com status ok', async () => {
        const response = await request(app.getHttpServer()).get('/health').expect(200)

        expect(response.body).toEqual({ status: 'ok', service: 'comphub-api' })
    })

    it('rotas inexistentes continuam respondendo 404', async () => {
        await request(app.getHttpServer()).get('/rota-que-nao-existe').expect(404)
    })
})
