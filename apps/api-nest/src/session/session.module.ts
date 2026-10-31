import { Global, Module } from '@nestjs/common'
import { SessionManager, sessionManager } from '@comphub/core'

// O SessionManager e um singleton de memoria por processo — mesma instancia
// que o backend Express usa (apps/api/src/index.ts). Injetamos o valor como
// provider para os testes poderem troca-lo por um fake via overrideProvider.
@Global()
@Module({
    providers: [{ provide: SessionManager, useValue: sessionManager }],
    exports: [SessionManager],
})
export class SessionModule {}
