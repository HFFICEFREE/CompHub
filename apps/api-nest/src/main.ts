import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getAllowedOrigins } from './config/origins'

async function bootstrap(): Promise<void> {
    const allowedOrigins = getAllowedOrigins(process.env.FRONTEND_URL)

    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })

    app.enableCors({ origin: allowedOrigins })

    const PORT = process.env.PORT || 3001
    await app.listen(PORT)
    console.log(`Server is running on port ${PORT}.`)
}

void bootstrap()
