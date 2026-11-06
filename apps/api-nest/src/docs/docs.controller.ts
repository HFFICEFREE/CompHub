import { Controller, Get, Res } from '@nestjs/common'
import type { Response } from 'express'
import path from 'path'

// O spec vive na raiz do monorepo (openapi.json) para ser servido identico
// pelo backend Express e por este. Daqui (src/docs em dev ou dist/docs apos
// o build) sao quatro niveis ate a raiz.
const SPEC_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'openapi.json')

const SWAGGER_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui'
        });
      }
    </script>
  </body>
</html>`

// Publico de proposito, igual ao Express: documentacao nao exige token.
@Controller()
export class DocsController {
    @Get('openapi.json')
    getOpenApiSpec(@Res() response: Response): void {
        response.sendFile(SPEC_PATH)
    }

    @Get('docs')
    getDocs(@Res() response: Response): void {
        response.setHeader('Content-Type', 'text/html')
        response.send(SWAGGER_HTML)
    }
}
