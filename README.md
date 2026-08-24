# Catálogo Macedo Utilidades

Catálogo virtual da **Macedo Utilidades** — utilidades domésticas em Jacobina/BA.
Aplicação web (React + Vite) com **vitrine pública** e **painel do vendedor** em uma
única página, mobile-first.

## Como colocar no ar (GitHub Pages)

O deploy é **automático**. A cada envio de código para o repositório, o GitHub
compila o site e publica sozinho. Você só precisa ligar o GitHub Pages **uma vez**:

1. Abra o repositório no GitHub.
2. Vá em **Settings** (Configurações) → **Pages** (menu à esquerda).
3. Em **Build and deployment → Source**, escolha **GitHub Actions**.
4. Pronto. Vá na aba **Actions** e aguarde o fluxo "Publicar no GitHub Pages"
   terminar (fica verde). O link do site aparece em **Settings → Pages** no topo,
   algo como `https://aj8067910-dotcom.github.io/catalogomacedo/`.

> Se o site não abrir de primeira, espere 1–2 minutos e recarregue — o primeiro
> deploy leva um pouco mais.

## Primeiro acesso

- A vitrine é a página inicial (link aberto, sem senha).
- O botão **Painel** (canto superior direito) abre o acesso do vendedor.
  PIN inicial: **1234** — troque em **Ajustes** assim que entrar.
- Em **Ajustes**, preencha o **WhatsApp da loja** para receber as reservas.

## Rodar localmente (opcional)

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão de produção na pasta dist/
```

## Onde os dados ficam salvos (importante)

Esta versão guarda produtos, fotos e reservas **no próprio navegador**
(IndexedDB) — não há servidor. Consequências:

- Os dados existem **apenas no aparelho/navegador** em que foram cadastrados.
  O que o vendedor cadastra no celular dele **não** aparece automaticamente no
  celular do cliente.
- Limpar os dados do navegador apaga o catálogo.

Para um catálogo **compartilhado** de verdade (o vendedor cadastra e todos os
clientes veem na hora, de qualquer aparelho), o próximo passo é ligar um banco
de dados online (ex.: Supabase). Este projeto já está pronto para receber essa
evolução.
