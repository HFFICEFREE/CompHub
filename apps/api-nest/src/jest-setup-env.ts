// Env usada pelos testes: o CORS do gateway e validado no tempo de definicao
// da classe (decorator), portanto o FRONTEND_URL precisa existir antes do
// import de app.module. Em producao quem valida e o bootstrap (main.ts).
process.env.FRONTEND_URL ??= 'http://localhost:3000'
