import { ArgumentsHost, Catch, WsExceptionFilter } from '@nestjs/common'

// Paridade com o withErrorBoundary do backend Express: um erro num handler
// de socket e LOGADO e engolido, nunca propagado de volta ao cliente como
// evento `exception` (que o front nao espera nem trata).
@Catch()
export class WsErrorFilter implements WsExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const pattern = host.switchToWs().getPattern() ?? 'connection'
        console.error(`Socket handler error (${pattern}):`, exception)
    }
}
