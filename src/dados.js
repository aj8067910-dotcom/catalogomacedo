import { supabase } from "./supabase";

/* Converte as linhas do banco (snake_case) para o formato que a interface usa
   (camelCase), e vice-versa. */

const mapProduto = (r) => ({
  id: r.id,
  sku: r.sku,
  nome: r.nome,
  descricao: r.descricao || "",
  categoria: r.categoria || "Outros",
  preco: Number(r.preco) || 0,
  precoPromocional: Number(r.preco_promocional) || 0,
  quantidadeTotal: r.quantidade_total || 0,
  quantidadeReservada: r.quantidade_reservada || 0,
  fotos: r.fotos || [],
  capa: r.capa || "",
  status: r.status,
  criadoEm: r.criado_em,
});

const mapReserva = (r) => ({
  id: r.id,
  produtoId: r.produto_id,
  produtoNome: r.produto_nome,
  precoUnitario: Number(r.preco_unitario) || 0,
  quantidade: r.quantidade,
  nomeCliente: r.nome_cliente,
  telefoneCliente: r.telefone_cliente || "",
  observacao: r.observacao || "",
  status: r.status,
  origem: r.origem,
  criadaEm: r.criada_em,
  decididaEm: r.decidida_em,
  expiraEm: r.expira_em,
});

/* ------------------------------------------------------------------ LOJA */

export async function carregarLoja() {
  const { data, error } = await supabase.from("loja").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    nome: data.nome,
    cidade: data.cidade,
    whatsapp: data.whatsapp || "",
    instagram: data.instagram || "",
    horario: data.horario || "",
    horasExpiracao: data.horas_expiracao || 48,
  };
}

export async function salvarLojaDb(l) {
  const { error } = await supabase.from("loja").update({
    nome: l.nome,
    cidade: l.cidade,
    whatsapp: l.whatsapp,
    instagram: l.instagram,
    horario: l.horario,
    horas_expiracao: Math.max(1, parseInt(l.horasExpiracao) || 48),
  }).eq("id", 1);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------- PRODUTOS */

export async function listarPublicados() {
  const { data, error } = await supabase
    .from("produtos").select("*").eq("status", "publicado")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapProduto);
}

export async function listarTodosProdutos() {
  const { data, error } = await supabase
    .from("produtos").select("*").order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapProduto);
}

export async function salvarProduto(p, existe) {
  const row = {
    sku: p.sku,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    preco: p.preco,
    preco_promocional: p.precoPromocional,
    quantidade_total: p.quantidadeTotal,
    fotos: p.fotos,
    capa: p.capa,
    status: p.status,
  };
  if (existe) {
    const { error } = await supabase.from("produtos").update(row).eq("id", p.id);
    if (error) throw new Error(error.message);
    return p.id;
  }
  const { data, error } = await supabase.from("produtos").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

// campos já em snake_case, ex.: { preco: 10 } ou { quantidade_total: 5 } ou { status: "publicado" }
export async function ajustarProduto(id, campos) {
  const { error } = await supabase.from("produtos").update(campos).eq("id", id);
  if (error) throw new Error(error.message);
}

// Cadastro em massa a partir das linhas de uma planilha (Excel/CSV).
// Linha com "id" preenchido ATUALIZA o item; sem "id" cria um novo.
export async function importarProdutos(linhas) {
  const STATUS_OK = ["publicado", "rascunho", "arquivado"];
  const inserir = [];
  const atualizar = [];
  let ignoradas = 0;

  for (const l of linhas || []) {
    const nome = String(l.nome ?? "").trim();
    const preco = paraNumeroPlan(l.preco);
    if (!nome || preco <= 0) { ignoradas++; continue; }

    const st = String(l.status ?? "").trim().toLowerCase();
    const base = {
      nome,
      descricao: String(l.descricao ?? "").trim(),
      categoria: String(l.categoria ?? "").trim() || "Outros",
      preco,
      preco_promocional: paraNumeroPlan(l.preco_promocional),
      quantidade_total: Math.max(0, parseInt(l.quantidade_total, 10) || 0),
      status: STATUS_OK.includes(st) ? st : "rascunho",
    };

    const id = String(l.id ?? "").trim();
    if (id) atualizar.push({ id, ...base });
    else inserir.push({ ...base, sku: "MU-" + Math.random().toString(36).slice(2, 7).toUpperCase() });
  }

  let inseridos = 0, atualizados = 0;
  if (inserir.length) {
    const { error } = await supabase.from("produtos").insert(inserir);
    if (error) throw new Error(error.message);
    inseridos = inserir.length;
  }
  if (atualizar.length) {
    const { error } = await supabase.from("produtos").upsert(atualizar, { onConflict: "id" });
    if (error) throw new Error(error.message);
    atualizados = atualizar.length;
  }
  return { inseridos, atualizados, ignoradas };
}

// Aceita número (célula numérica) ou texto no formato brasileiro ("1.234,56").
function paraNumeroPlan(v) {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  const s = String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* -------------------------------------------------------------- RESERVAS */

export async function listarReservas() {
  const { data, error } = await supabase
    .from("reservas").select("*").order("criada_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapReserva);
}

export async function criarReserva({ produtoId, quantidade, nome, telefone, observacao }) {
  const { data, error } = await supabase.rpc("criar_reserva", {
    p_produto_id: produtoId,
    p_quantidade: quantidade,
    p_nome: nome,
    p_telefone: telefone,
    p_observacao: observacao || "",
  });
  if (error) throw new Error(limparErro(error.message));
  return data;
}

export async function aprovarReserva(id) {
  const { error } = await supabase.rpc("aprovar_reserva", { p_reserva_id: id });
  if (error) throw new Error(limparErro(error.message));
}

export async function recusarReserva(id) {
  const { error } = await supabase.rpc("recusar_reserva", { p_reserva_id: id });
  if (error) throw new Error(limparErro(error.message));
}

export async function registrarVendaLoja({ produtoId, quantidade, nome, observacao }) {
  const { error } = await supabase.rpc("registrar_venda_loja", {
    p_produto_id: produtoId,
    p_quantidade: quantidade,
    p_nome: nome || "",
    p_obs: observacao || "",
  });
  if (error) throw new Error(limparErro(error.message));
}

export async function expirarReservas() {
  await supabase.rpc("expirar_reservas");
}

/* ---------------------------------------------------------------- FOTOS */

// Recebe um dataURL (foto comprimida). Se já for uma URL http, devolve como está.
// Caso contrário, envia ao armazenamento e devolve a URL pública.
export async function subirFoto(dataUrl) {
  if (!dataUrl) return "";
  if (dataUrl.startsWith("http")) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("fotos").upload(nome, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("fotos").getPublicUrl(nome);
  return data.publicUrl;
}

/* ----------------------------------------------------------------- AUTH */

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error("E-mail ou senha incorretos.");
}

export async function sair() {
  await supabase.auth.signOut();
}

export function aoMudarAuth(cb) {
  return supabase.auth.onAuthStateChange((_e, session) => cb(session));
}

/* --------------------------------------------------------------- ERROS */

function limparErro(msg) {
  if (!msg) return "Não foi possível concluir. Tente de novo.";
  // remove prefixos técnicos do PostgREST, deixando a mensagem em português
  return msg.replace(/^.*?:\s*/, "").trim() || msg;
}
