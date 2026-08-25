# Deixar o catálogo compartilhado (Supabase) — passo a passo

Objetivo: sair da versão "cada aparelho separado" para **um catálogo só**, que
você cadastra e todos os clientes veem, de qualquer celular.

Você faz os passos 1 a 4 (uns 5–10 min). O restante (ligar no site) é comigo.

---

## 1. Criar a conta e o projeto
1. Acesse **https://supabase.com** → **Start your project** → entre com o Google/GitHub.
2. **New project**.
   - **Name:** macedo-utilidades (ou o que quiser)
   - **Database Password:** crie uma senha forte e **guarde** (você quase não vai usar).
   - **Region:** **South America (São Paulo)**.
3. Clique em **Create new project** e espere ~2 min ficar pronto.

## 2. Criar as tabelas e regras
1. No menu à esquerda, abra **SQL Editor** → **New query**.
2. Abra o arquivo **`supabase/schema.sql`** deste projeto, copie **tudo** e cole no editor.
3. Clique em **Run** (ou Ctrl/Cmd + Enter). Deve aparecer "Success".
   - Pode rodar mais de uma vez sem problema.

## 3. Criar o seu usuário de vendedor (login do painel)
1. Menu à esquerda → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Coloque um **e-mail** e uma **senha** (serão seu login no painel). Confirme.
   - É só para você. Cliente nenhum precisa de login.

## 4. Copiar os 2 valores e me enviar
1. Menu à esquerda → **Project Settings** (engrenagem) → **API**.
2. Copie e me mande aqui no chat:
   - **Project URL** — ex.: `https://abcdefgh.supabase.co`
   - **Project API keys → `anon` `public`** — uma chave longa que começa com `eyJ...`
3. Me diga também o **e-mail** do vendedor que você criou (a senha **não** precisa).

> ⚠️ Segurança: a chave **anon public** e a URL são feitas para ficar no site — são
> públicas e seguras (a proteção está nas regras que o schema criou).
> **NUNCA** me mande a chave **`service_role`** nem a senha do banco/usuário.

---

## O que acontece depois (comigo)
Com a URL + a chave anon, eu:
- ligo o site ao seu banco,
- troco o login por PIN pelo login de verdade (e-mail + senha),
- passo as fotos para o armazenamento online,
- e a partir daí: você cadastra em um aparelho → aparece para todo mundo. ✅

O visual e as telas continuam idênticos aos de hoje.
