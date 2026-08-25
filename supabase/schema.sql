-- ============================================================================
-- Macedo Utilidades — estrutura do banco (Supabase / PostgreSQL)
-- Cole tudo isto no Supabase → SQL Editor → New query → Run.
-- Pode rodar de novo sem medo (é idempotente).
-- ============================================================================

-- ------------------------------------------------------------------ TABELAS

create table if not exists public.loja (
  id             int primary key default 1,
  nome           text not null default 'Macedo Utilidades',
  cidade         text not null default 'Jacobina, BA',
  whatsapp       text default '',
  instagram      text default '@macedo.casa',
  horario        text default 'Seg a Sex, 8h às 18h · Sáb, 8h às 12h',
  horas_expiracao int not null default 48,
  constraint loja_unica check (id = 1)
);
insert into public.loja (id) values (1) on conflict (id) do nothing;

create table if not exists public.produtos (
  id                  uuid primary key default gen_random_uuid(),
  sku                 text,
  nome                text not null,
  descricao           text default '',
  categoria           text default 'Outros',
  preco               numeric(12,2) not null default 0,
  preco_promocional   numeric(12,2) not null default 0,
  quantidade_total    int not null default 0,
  quantidade_reservada int not null default 0,
  fotos               text[] not null default '{}',
  capa                text default '',
  status              text not null default 'rascunho',  -- rascunho | publicado | arquivado
  criado_em           timestamptz not null default now()
);

create table if not exists public.reservas (
  id                uuid primary key default gen_random_uuid(),
  produto_id        uuid references public.produtos(id) on delete set null,
  produto_nome      text,
  preco_unitario    numeric(12,2) not null default 0,
  quantidade        int not null,
  nome_cliente      text,
  telefone_cliente  text default '',
  observacao        text default '',
  status            text not null default 'pendente',  -- pendente | aprovada | recusada | expirada | concluída
  origem            text not null default 'site',      -- site | venda_loja
  criada_em         timestamptz not null default now(),
  decidida_em       timestamptz,
  expira_em         timestamptz
);

create index if not exists reservas_status_idx on public.reservas (status);
create index if not exists produtos_status_idx on public.produtos (status);

-- ------------------------------------------------------- SEGURANÇA (RLS)
-- Regra geral:
--   público (anon)         -> só LÊ produtos publicados e os dados da loja
--   vendedor (autenticado) -> lê e escreve tudo
--   reservas de clientes   -> criadas só pela função atômica (RPC), nunca direto

alter table public.loja     enable row level security;
alter table public.produtos enable row level security;
alter table public.reservas enable row level security;

-- LOJA: qualquer um lê; só vendedor logado altera
drop policy if exists loja_leitura on public.loja;
create policy loja_leitura on public.loja for select using (true);
drop policy if exists loja_update on public.loja;
create policy loja_update on public.loja for update to authenticated using (true) with check (true);

-- PRODUTOS: público vê só os publicados; vendedor logado vê e faz tudo
drop policy if exists produtos_leitura_publica on public.produtos;
create policy produtos_leitura_publica on public.produtos
  for select using (status = 'publicado');
drop policy if exists produtos_vendedor_tudo on public.produtos;
create policy produtos_vendedor_tudo on public.produtos
  for all to authenticated using (true) with check (true);

-- RESERVAS: só o vendedor logado enxerga/gerencia (protege dados do cliente).
-- O cliente NÃO lê reservas; ele só cria via a função criar_reserva().
drop policy if exists reservas_vendedor_tudo on public.reservas;
create policy reservas_vendedor_tudo on public.reservas
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------- FUNÇÃO: RESERVA ATÔMICA
-- Impede que dois clientes reservem a última unidade ao mesmo tempo:
-- trava a linha do produto (FOR UPDATE) antes de conferir o disponível.
create or replace function public.criar_reserva(
  p_produto_id uuid,
  p_quantidade int,
  p_nome       text,
  p_telefone   text,
  p_observacao text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod     public.produtos%rowtype;
  v_disp     int;
  v_horas    int;
  v_reserva  uuid;
begin
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
  end if;

  select * into v_prod from public.produtos where id = p_produto_id for update;
  if not found then
    raise exception 'Produto não encontrado.';
  end if;
  if v_prod.status <> 'publicado' then
    raise exception 'Produto indisponível.';
  end if;

  v_disp := v_prod.quantidade_total - v_prod.quantidade_reservada;
  if v_disp < p_quantidade then
    raise exception 'Restam apenas % unidade(s).', v_disp;
  end if;

  select horas_expiracao into v_horas from public.loja where id = 1;
  v_horas := coalesce(v_horas, 48);

  update public.produtos
     set quantidade_reservada = quantidade_reservada + p_quantidade
   where id = p_produto_id;

  insert into public.reservas
    (produto_id, produto_nome, preco_unitario, quantidade, nome_cliente,
     telefone_cliente, observacao, status, origem, expira_em)
  values
    (v_prod.id, v_prod.nome,
     case when v_prod.preco_promocional > 0 then v_prod.preco_promocional else v_prod.preco end,
     p_quantidade, p_nome, coalesce(p_telefone,''), coalesce(p_observacao,''),
     'pendente', 'site', now() + (v_horas || ' hours')::interval)
  returning id into v_reserva;

  return v_reserva;
end;
$$;
-- Só o público anônimo e o vendedor podem criar reserva por esta função:
grant execute on function public.criar_reserva(uuid, int, text, text, text) to anon, authenticated;

-- --------------------------------------- FUNÇÕES DO VENDEDOR (autenticado)

-- Aprovar: baixa definitiva (total e reservada caem juntos).
create or replace function public.aprovar_reserva(p_reserva_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_r public.reservas%rowtype;
begin
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found or v_r.status <> 'pendente' then
    raise exception 'Reserva não está pendente.';
  end if;
  update public.produtos
     set quantidade_total     = greatest(0, quantidade_total - v_r.quantidade),
         quantidade_reservada = greatest(0, quantidade_reservada - v_r.quantidade)
   where id = v_r.produto_id;
  update public.reservas
     set status = 'aprovada', decidida_em = now()
   where id = p_reserva_id;
end;
$$;
grant execute on function public.aprovar_reserva(uuid) to authenticated;

-- Recusar: devolve a quantidade reservada ao estoque.
create or replace function public.recusar_reserva(p_reserva_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_r public.reservas%rowtype;
begin
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found or v_r.status <> 'pendente' then
    raise exception 'Reserva não está pendente.';
  end if;
  update public.produtos
     set quantidade_reservada = greatest(0, quantidade_reservada - v_r.quantidade)
   where id = v_r.produto_id;
  update public.reservas
     set status = 'recusada', decidida_em = now()
   where id = p_reserva_id;
end;
$$;
grant execute on function public.recusar_reserva(uuid) to authenticated;

-- Registrar venda na loja: baixa definitiva + registro no histórico.
create or replace function public.registrar_venda_loja(
  p_produto_id uuid, p_quantidade int, p_nome text default '', p_obs text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_prod public.produtos%rowtype; v_disp int; v_id uuid;
begin
  if p_quantidade is null or p_quantidade < 1 then raise exception 'Quantidade inválida.'; end if;
  select * into v_prod from public.produtos where id = p_produto_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;
  v_disp := v_prod.quantidade_total - v_prod.quantidade_reservada;
  if v_disp < p_quantidade then raise exception 'Você tem % em estoque livre.', v_disp; end if;
  update public.produtos
     set quantidade_total = greatest(0, quantidade_total - p_quantidade)
   where id = p_produto_id;
  insert into public.reservas
    (produto_id, produto_nome, preco_unitario, quantidade, nome_cliente,
     telefone_cliente, observacao, status, origem, decidida_em)
  values
    (v_prod.id, v_prod.nome,
     case when v_prod.preco_promocional > 0 then v_prod.preco_promocional else v_prod.preco end,
     p_quantidade, coalesce(nullif(p_nome,''),'Venda na loja'), '', coalesce(p_obs,''),
     'concluída', 'venda_loja', now())
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.registrar_venda_loja(uuid, int, text, text) to authenticated;

-- Expirar pendentes vencidas (devolve o estoque). Pode ser chamada pelo app
-- ou agendada com pg_cron.
create or replace function public.expirar_reservas()
returns int language plpgsql security definer set search_path = public as $$
declare v_r public.reservas%rowtype; v_n int := 0;
begin
  for v_r in
    select * from public.reservas
     where status = 'pendente' and expira_em is not null and expira_em < now()
     for update
  loop
    update public.produtos
       set quantidade_reservada = greatest(0, quantidade_reservada - v_r.quantidade)
     where id = v_r.produto_id;
    update public.reservas set status = 'expirada', decidida_em = now() where id = v_r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
grant execute on function public.expirar_reservas() to anon, authenticated;

-- ----------------------------------------------------- FOTOS (Storage)
-- Cria o bucket público "fotos" e libera leitura pública / escrita do vendedor.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists fotos_leitura_publica on storage.objects;
create policy fotos_leitura_publica on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists fotos_vendedor_escreve on storage.objects;
create policy fotos_vendedor_escreve on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists fotos_vendedor_apaga on storage.objects;
create policy fotos_vendedor_apaga on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

-- ============================================================================
-- FIM. Próximo: criar o usuário do vendedor em Authentication → Users → Add user
-- (e-mail + senha), e me enviar a Project URL e a chave anon public.
-- ============================================================================
