# Dominó Suporte

Aplicação web de dominó online para quatro jogadores em duplas, com regras clássicas.

## Tecnologias
- React + Vite
- Supabase (autenticação, banco de dados e sincronização em tempo real)
- Vercel (hospedagem)

## Desenvolvimento local
1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local`.
4. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do projeto Supabase.
5. Execute `npm run dev`.

## Publicação
Importe este repositório na Vercel e configure as mesmas variáveis de ambiente nas configurações do projeto.

> Não coloque a chave `service_role` do Supabase no frontend. Use somente a chave pública anon/publishable com políticas RLS adequadas.

## Estado
Estrutura inicial e interface visual. A lógica de salas, regras, persistência e sincronização multiplayer será adicionada na próxima etapa antes de considerar o jogo pronto para partidas reais.