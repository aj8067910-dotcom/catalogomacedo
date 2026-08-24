import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================ ARMAZENAMENTO ============================ */
/* Persistência local no navegador via IndexedDB (sem servidor).
   Os dados ficam salvos apenas neste dispositivo/navegador. */

const K = {
  produtos: "catalogo:produtos",
  reservas: "catalogo:reservas",
  loja: "catalogo:loja",
  fotos: (id) => `catalogo:fotos:${id}`,
};

const BANCO = "catalogo-macedo";
const TABELA = "kv";

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TABELA);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function ler(chave, padrao) {
  try {
    const db = await abrirBanco();
    const texto = await new Promise((resolve, reject) => {
      const req = db.transaction(TABELA, "readonly").objectStore(TABELA).get(chave);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return texto ? JSON.parse(texto) : padrao;
  } catch (e) {
    return padrao;
  }
}

async function gravar(chave, valor) {
  const texto = JSON.stringify(valor);
  try {
    const db = await abrirBanco();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TABELA, "readwrite");
      tx.objectStore(TABELA).put(texto, chave);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    throw new Error("Não foi possível salvar. O armazenamento do navegador pode estar cheio.");
  }
}

/* ============================== UTILIDADES ============================== */

const CATEGORIAS = [
  "Cozinha",
  "Cama, mesa e banho",
  "Organização",
  "Limpeza",
  "Plásticos",
  "Elétricos",
  "Decoração",
  "Outros",
];

const brl = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n) || 0
  );

const paraNumero = (txt) => {
  const limpo = String(txt).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
};

const soDigitos = (t) => String(t || "").replace(/\D/g, "");

const paraWhats = (tel) => {
  const d = soDigitos(tel);
  if (!d) return "";
  return d.length <= 11 ? "55" + d : d;
};

const formatarTel = (t) => {
  const d = soDigitos(t).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const abrirWhats = (tel, msg) => {
  const n = paraWhats(tel);
  if (!n) return;
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`, "_blank");
};

const disponivel = (p) => Math.max(0, (p.quantidadeTotal || 0) - (p.quantidadeReservada || 0));

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const dataCurta = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function comprimir(arquivo, ladoMaximo, qualidade) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", qualidade));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui ler essa imagem."));
    };
    img.src = url;
  });
}

/* ================================ ESTILO ================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.mac { --tinta:#0F3149; --tinta2:#1B5273; --porcelana:#EEF1F4; --papel:#FFFFFF;
  --pimenta:#C4322B; --milho:#E0A029; --musgo:#2F7D5B; --grafite:#3C4B57; --linha:#D3DBE2;
  font-family:'IBM Plex Sans',system-ui,sans-serif; color:var(--tinta);
  background:var(--porcelana); min-height:100vh; -webkit-font-smoothing:antialiased; }
.mac *{box-sizing:border-box;}
.mac button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit;}
.mac input,.mac select,.mac textarea{font-family:inherit;font-size:15px;width:100%;
  padding:11px 12px;border:1.5px solid var(--linha);border-radius:8px;background:var(--papel);color:var(--tinta);}
.mac input:focus,.mac select:focus,.mac textarea:focus{outline:2px solid var(--tinta2);outline-offset:1px;border-color:var(--tinta2);}
.mac :focus-visible{outline:2px solid var(--tinta2);outline-offset:2px;}

.esmalte{background-color:var(--tinta);
  background-image:radial-gradient(rgba(255,255,255,.20) 1.1px,transparent 1.5px),
                   radial-gradient(rgba(255,255,255,.12) 1px,transparent 1.4px);
  background-size:15px 15px,24px 24px; background-position:0 0,8px 12px;}

.display{font-family:'Archivo',system-ui,sans-serif;font-weight:900;letter-spacing:-.03em;line-height:.95;}
.num{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600;font-variant-numeric:tabular-nums;}
.rotulo{font-family:'Archivo',sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;}

.env{max-width:1080px;margin:0 auto;padding:0 16px;}
.topo{padding:22px 0 26px;color:#fff;}
.linha-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px 18px;
  border-radius:8px;font-weight:600;font-size:15px;transition:filter .15s,transform .06s;}
.btn:active{transform:translateY(1px);}
.btn:disabled{opacity:.5;cursor:not-allowed;}
.btn-1{background:var(--pimenta);color:#fff;}
.btn-1:hover:not(:disabled){filter:brightness(1.08);}
.btn-2{background:var(--tinta);color:#fff;}
.btn-2:hover:not(:disabled){filter:brightness(1.25);}
.btn-3{background:var(--papel);color:var(--tinta);border:1.5px solid var(--linha);}
.btn-3:hover:not(:disabled){border-color:var(--tinta2);}
.btn-ok{background:var(--musgo);color:#fff;}
.btn-p{padding:8px 12px;font-size:13.5px;border-radius:7px;}

.chip{padding:7px 13px;border-radius:999px;background:var(--papel);border:1.5px solid var(--linha);
  font-size:13.5px;font-weight:500;white-space:nowrap;}
.chip-on{background:var(--tinta);color:#fff;border-color:var(--tinta);}

.grade{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
@media(min-width:640px){.grade{grid-template-columns:repeat(3,1fr);gap:16px;}}
@media(min-width:900px){.grade{grid-template-columns:repeat(4,1fr);}}

.card{background:var(--papel);border-radius:12px;overflow:hidden;border:1px solid var(--linha);
  text-align:left;display:flex;flex-direction:column;transition:box-shadow .16s,transform .16s;}
.card:hover{box-shadow:0 6px 20px rgba(15,49,73,.13);transform:translateY(-2px);}
.foto{aspect-ratio:1;width:100%;object-fit:cover;background:var(--porcelana);display:block;}
.sem-foto{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--porcelana);color:#93A3AF;font-size:12px;}

.tag{display:inline-block;padding:3px 8px;border-radius:5px;font-size:10.5px;
  font-family:'Archivo',sans-serif;font-weight:700;letter-spacing:.07em;text-transform:uppercase;}
.t-ok{background:#E4F0EA;color:var(--musgo);}
.t-baixo{background:#FBF0DA;color:#96660F;}
.t-fora{background:#F5E3E2;color:var(--pimenta);}
.t-neutro{background:var(--porcelana);color:var(--grafite);}

.painel-cx{background:var(--papel);border:1px solid var(--linha);border-radius:12px;padding:16px;}
.campo{margin-bottom:14px;}
.campo > label{display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--grafite);}

.folha{position:fixed;inset:0;background:rgba(15,49,73,.55);z-index:60;display:flex;
  align-items:flex-end;justify-content:center;padding:0;}
@media(min-width:640px){.folha{align-items:center;padding:24px;}}
.folha-cx{background:var(--porcelana);width:100%;max-width:520px;max-height:92vh;overflow-y:auto;
  border-radius:16px 16px 0 0;}
@media(min-width:640px){.folha-cx{border-radius:14px;}}

.aviso{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:90;
  background:var(--tinta);color:#fff;padding:12px 18px;border-radius:9px;font-size:14px;
  box-shadow:0 8px 26px rgba(15,49,73,.3);max-width:92vw;}

.flutua{position:fixed;right:16px;bottom:16px;z-index:50;width:54px;height:54px;border-radius:50%;
  background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 18px rgba(0,0,0,.24);}

.vazio{text-align:center;padding:56px 20px;background:var(--papel);border:1px dashed var(--linha);border-radius:12px;}
.esq{background:var(--papel);border-radius:12px;height:210px;border:1px solid var(--linha);
  animation:pulso 1.4s ease-in-out infinite;}
@keyframes pulso{0%,100%{opacity:1}50%{opacity:.55}}
@media(prefers-reduced-motion:reduce){.mac *{animation:none!important;transition:none!important;}}
`;

/* ================================= APP ================================= */

export default function App() {
  const [tela, setTela] = useState("vitrine");
  const [produtos, setProdutos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loja, setLoja] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState("");
  const [aviso, setAviso] = useState("");
  const [selecionado, setSelecionado] = useState(null);

  const notificar = useCallback((t) => {
    setAviso(t);
    setTimeout(() => setAviso(""), 3400);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let cfg = await ler(K.loja, null);
        if (!cfg) {
          cfg = {
            nome: "Macedo Utilidades",
            cidade: "Jacobina, BA",
            whatsapp: "",
            horario: "Seg a Sex, 8h às 18h · Sáb, 8h às 12h",
            pin: "1234",
            horasExpiracao: 48,
          };
          await gravar(K.loja, cfg);
        }
        const [ps, rs] = await Promise.all([ler(K.produtos, []), ler(K.reservas, [])]);
        const { ps2, rs2, expirou } = expirarPendentes(ps, rs, cfg.horasExpiracao);
        if (expirou) {
          await gravar(K.produtos, ps2);
          await gravar(K.reservas, rs2);
        }
        setLoja(cfg);
        setProdutos(ps2);
        setReservas(rs2);
      } catch (e) {
        setFalha("Não consegui carregar o catálogo. Recarregue a página.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  /* Grava sempre relendo antes, para não sobrescrever o que outro
     dispositivo salvou nesse meio tempo. */
  const alterar = useCallback(async (fn) => {
    const [ps, rs] = await Promise.all([ler(K.produtos, []), ler(K.reservas, [])]);
    const r = fn(ps, rs);
    if (r.produtos) {
      await gravar(K.produtos, r.produtos);
      setProdutos(r.produtos);
    }
    if (r.reservas) {
      await gravar(K.reservas, r.reservas);
      setReservas(r.reservas);
    }
    return r;
  }, []);

  const salvarLoja = async (nova) => {
    await gravar(K.loja, nova);
    setLoja(nova);
  };

  if (carregando) {
    return (
      <div className="mac">
        <style>{CSS}</style>
        <div className="esmalte topo">
          <div className="env">
            <div className="display" style={{ fontSize: 30 }}>Carregando o catálogo</div>
          </div>
        </div>
        <div className="env" style={{ paddingTop: 20 }}>
          <div className="grade">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="esq" />)}
          </div>
        </div>
      </div>
    );
  }

  if (falha) {
    return (
      <div className="mac">
        <style>{CSS}</style>
        <div className="env" style={{ paddingTop: 60 }}>
          <div className="vazio">
            <div className="display" style={{ fontSize: 22, marginBottom: 8 }}>{falha}</div>
            <button className="btn btn-2" onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mac">
      <style>{CSS}</style>

      {tela === "painel" ? (
        <Painel
          loja={loja}
          produtos={produtos}
          reservas={reservas}
          alterar={alterar}
          salvarLoja={salvarLoja}
          notificar={notificar}
          sair={() => setTela("vitrine")}
        />
      ) : (
        <Vitrine
          loja={loja}
          produtos={produtos}
          abrirPainel={() => setTela("painel")}
          abrirProduto={setSelecionado}
        />
      )}

      {selecionado && (
        <TelaProduto
          produto={produtos.find((p) => p.id === selecionado.id) || selecionado}
          loja={loja}
          fechar={() => setSelecionado(null)}
          alterar={alterar}
          notificar={notificar}
        />
      )}

      {tela !== "painel" && loja.whatsapp && (
        <button
          className="flutua"
          aria-label="Falar no WhatsApp"
          onClick={() => abrirWhats(loja.whatsapp, `Olá! Vi o catálogo da ${loja.nome} e queria tirar uma dúvida.`)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2z" />
          </svg>
        </button>
      )}

      {aviso && <div className="aviso">{aviso}</div>}
    </div>
  );
}

/* =========================== REGRAS DE ESTOQUE =========================== */

function expirarPendentes(produtos, reservas, horas) {
  const agora = Date.now();
  let expirou = false;
  const ps = produtos.map((p) => ({ ...p }));
  const rs = reservas.map((r) => {
    if (r.status !== "pendente") return r;
    const limite = new Date(r.criadaEm).getTime() + (horas || 48) * 3600 * 1000;
    if (agora < limite) return r;
    expirou = true;
    const p = ps.find((x) => x.id === r.produtoId);
    if (p) p.quantidadeReservada = Math.max(0, (p.quantidadeReservada || 0) - r.quantidade);
    return { ...r, status: "expirada" };
  });
  return { ps2: ps, rs2: rs, expirou };
}

/* ================================ VITRINE ================================ */

function Vitrine({ loja, produtos, abrirPainel, abrirProduto }) {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("Tudo");
  const [ordem, setOrdem] = useState("novidades");

  const publicados = produtos.filter((p) => p.status === "publicado");
  const usadas = ["Tudo", ...CATEGORIAS.filter((c) => publicados.some((p) => p.categoria === c))];

  let lista = publicados.filter((p) => {
    const okCat = cat === "Tudo" || p.categoria === cat;
    const t = busca.trim().toLowerCase();
    const okBusca = !t || p.nome.toLowerCase().includes(t) || (p.sku || "").toLowerCase().includes(t);
    return okCat && okBusca;
  });

  if (ordem === "menor") lista = [...lista].sort((a, b) => precoAtual(a) - precoAtual(b));
  else if (ordem === "maior") lista = [...lista].sort((a, b) => precoAtual(b) - precoAtual(a));
  else lista = [...lista].sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

  return (
    <>
      <header className="esmalte topo">
        <div className="env">
          <div className="linha-topo">
            <div>
              <div className="rotulo" style={{ opacity: 0.72, marginBottom: 6 }}>
                Catálogo · {loja.cidade}
              </div>
              <h1 className="display" style={{ fontSize: "clamp(30px,8vw,50px)", margin: 0 }}>
                {loja.nome}
              </h1>
            </div>
            <button className="btn btn-p" onClick={abrirPainel}
              style={{ background: "rgba(255,255,255,.14)", color: "#fff", flexShrink: 0 }}>
              Painel
            </button>
          </div>
          <p style={{ marginTop: 14, marginBottom: 0, fontSize: 14, opacity: 0.82, maxWidth: 460 }}>
            Escolha o item, reserve pelo site e retire na loja. {loja.horario}
          </p>
        </div>
      </header>

      <div className="env" style={{ paddingTop: 18, paddingBottom: 90 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Buscar por nome ou código"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar produto"
          />
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)}
            style={{ width: "auto", minWidth: 132 }} aria-label="Ordenar">
            <option value="novidades">Novidades</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>
        </div>

        {usadas.length > 1 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
            {usadas.map((c) => (
              <button key={c} className={"chip" + (cat === c ? " chip-on" : "")} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {lista.length === 0 ? (
          <div className="vazio">
            <div className="display" style={{ fontSize: 21, marginBottom: 8 }}>
              {publicados.length === 0 ? "O catálogo está sendo montado" : "Nada encontrado por aqui"}
            </div>
            <p style={{ color: "var(--grafite)", fontSize: 14.5, margin: 0 }}>
              {publicados.length === 0
                ? "Assim que os primeiros itens forem publicados, eles aparecem nesta página."
                : "Tente outra palavra ou escolha a categoria Tudo."}
            </p>
          </div>
        ) : (
          <div className="grade">
            {lista.map((p) => <CardProduto key={p.id} p={p} aoClicar={() => abrirProduto(p)} />)}
          </div>
        )}
      </div>
    </>
  );
}

const precoAtual = (p) => (p.precoPromocional > 0 ? p.precoPromocional : p.preco);

function CardProduto({ p, aoClicar }) {
  const d = disponivel(p);
  return (
    <button className="card" onClick={aoClicar}>
      {p.capa ? (
        <img src={p.capa} alt={p.nome} className="foto" loading="lazy" />
      ) : (
        <div className="sem-foto">sem foto</div>
      )}
      <div style={{ padding: "10px 11px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{p.nome}</div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
          {p.precoPromocional > 0 && (
            <span className="num" style={{ fontSize: 12, textDecoration: "line-through", color: "#8B9AA6" }}>
              {brl(p.preco)}
            </span>
          )}
          <span className="num" style={{ fontSize: 18, color: "var(--pimenta)" }}>{brl(precoAtual(p))}</span>
        </div>
        <span className={"tag " + (d === 0 ? "t-fora" : d <= 2 ? "t-baixo" : "t-ok")}>
          {d === 0 ? "Esgotado" : d <= 2 ? `Últimas ${d}` : "Disponível"}
        </span>
      </div>
    </button>
  );
}

/* ============================= TELA DO PRODUTO ============================= */

function TelaProduto({ produto, loja, fechar, alterar, notificar }) {
  const [fotos, setFotos] = useState(null);
  const [i, setI] = useState(0);
  const [reservando, setReservando] = useState(false);

  useEffect(() => {
    let vivo = true;
    ler(K.fotos(produto.id), []).then((f) => {
      if (vivo) setFotos(f && f.length ? f : produto.capa ? [produto.capa] : []);
    });
    return () => { vivo = false; };
  }, [produto.id]);

  const d = disponivel(produto);
  const galeria = fotos || (produto.capa ? [produto.capa] : []);

  return (
    <div className="folha" onClick={fechar} role="dialog" aria-label={produto.nome}>
      <div className="folha-cx" onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "relative", background: "var(--papel)" }}>
          {galeria.length > 0 ? (
            <img src={galeria[i]} alt={produto.nome} className="foto" style={{ aspectRatio: "4/3" }} />
          ) : (
            <div className="sem-foto" style={{ aspectRatio: "4/3" }}>sem foto</div>
          )}
          <button onClick={fechar} aria-label="Fechar"
            style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: "50%",
              background: "rgba(15,49,73,.82)", color: "#fff", fontSize: 19, lineHeight: 1 }}>
            ×
          </button>
          {galeria.length > 1 && (
            <div style={{ display: "flex", gap: 6, padding: 10, overflowX: "auto" }}>
              {galeria.map((f, k) => (
                <button key={k} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`}>
                  <img src={f} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 6,
                    border: k === i ? "2.5px solid var(--tinta)" : "2.5px solid transparent" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 18 }}>
          <div className="rotulo" style={{ color: "var(--grafite)", marginBottom: 7 }}>
            {produto.categoria} · {produto.sku}
          </div>
          <h2 className="display" style={{ fontSize: 26, margin: "0 0 12px" }}>{produto.nome}</h2>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            {produto.precoPromocional > 0 && (
              <span className="num" style={{ fontSize: 15, textDecoration: "line-through", color: "#8B9AA6" }}>
                {brl(produto.preco)}
              </span>
            )}
            <span className="num" style={{ fontSize: 30, color: "var(--pimenta)" }}>{brl(precoAtual(produto))}</span>
          </div>

          <span className={"tag " + (d === 0 ? "t-fora" : d <= 2 ? "t-baixo" : "t-ok")}>
            {d === 0 ? "Esgotado" : `${d} em estoque`}
          </span>

          {produto.descricao && (
            <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.6, color: "var(--grafite)", whiteSpace: "pre-wrap" }}>
              {produto.descricao}
            </p>
          )}

          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button className="btn btn-1" style={{ flex: 1 }} disabled={d === 0} onClick={() => setReservando(true)}>
              {d === 0 ? "Esgotado" : "Reservar item"}
            </button>
            <button className="btn btn-3" onClick={fechar}>Voltar</button>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--grafite)", marginTop: 10, marginBottom: 0 }}>
            A reserva segura o item por {loja.horasExpiracao}h até a loja confirmar. Pagamento na retirada.
          </p>
        </div>
      </div>

      {reservando && (
        <FormReserva
          produto={produto}
          loja={loja}
          alterar={alterar}
          notificar={notificar}
          fechar={() => setReservando(false)}
          concluir={() => { setReservando(false); fechar(); }}
        />
      )}
    </div>
  );
}

/* ============================ FORMULÁRIO RESERVA ============================ */

function FormReserva({ produto, loja, alterar, notificar, fechar, concluir }) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (nome.trim().length < 2) return setErro("Escreva seu nome completo.");
    if (soDigitos(tel).length < 10) return setErro("Informe o WhatsApp com DDD.");
    setErro("");
    setEnviando(true);
    try {
      const r = await alterar((ps, rs) => {
        const p = ps.find((x) => x.id === produto.id);
        if (!p) return { erro: "Este item saiu do catálogo." };
        if (disponivel(p) < qtd) return { erro: "Alguém reservou antes. Restam " + disponivel(p) + "." };
        const atualizados = ps.map((x) =>
          x.id === p.id ? { ...x, quantidadeReservada: (x.quantidadeReservada || 0) + qtd } : x
        );
        const reserva = {
          id: novoId(), produtoId: p.id, produtoNome: p.nome, precoUnitario: precoAtual(p),
          quantidade: qtd, nomeCliente: nome.trim(), telefoneCliente: tel,
          observacao: obs.trim(), status: "pendente", criadaEm: new Date().toISOString(),
        };
        return { produtos: atualizados, reservas: [reserva, ...rs] };
      });
      if (r.erro) { setErro(r.erro); setEnviando(false); return; }

      if (loja.whatsapp) {
        abrirWhats(
          loja.whatsapp,
          `*Nova reserva pelo catálogo*\n\n` +
          `Item: ${produto.nome} (${produto.sku})\n` +
          `Quantidade: ${qtd}\n` +
          `Valor: ${brl(precoAtual(produto) * qtd)}\n` +
          `Nome: ${nome.trim()}\n` +
          `WhatsApp: ${tel}` +
          (obs.trim() ? `\nObservação: ${obs.trim()}` : "")
        );
      }
      notificar("Reserva enviada. Aguarde a confirmação da loja.");
      concluir();
    } catch (e) {
      setErro(e.message || "Não consegui registrar a reserva. Tente de novo.");
      setEnviando(false);
    }
  };

  const max = disponivel(produto);

  return (
    <div className="folha" onClick={fechar} style={{ zIndex: 70 }}>
      <div className="folha-cx" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 430 }}>
        <div className="esmalte" style={{ padding: "16px 18px", color: "#fff" }}>
          <div className="rotulo" style={{ opacity: 0.7 }}>Reservar</div>
          <div className="display" style={{ fontSize: 20, marginTop: 4 }}>{produto.nome}</div>
        </div>
        <div style={{ padding: 18 }}>
          <div className="campo">
            <label htmlFor="r-nome">Seu nome</label>
            <input id="r-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" />
          </div>
          <div className="campo">
            <label htmlFor="r-tel">WhatsApp</label>
            <input id="r-tel" inputMode="numeric" value={tel}
              onChange={(e) => setTel(formatarTel(e.target.value))} placeholder="(74) 90000-0000" />
          </div>
          <div className="campo">
            <label htmlFor="r-qtd">Quantidade</label>
            <select id="r-qtd" value={qtd} onChange={(e) => setQtd(Number(e.target.value))}>
              {Array.from({ length: Math.min(max, 10) }, (_, k) => k + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="r-obs">Observação (opcional)</label>
            <textarea id="r-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder="Cor, tamanho, horário de retirada..." />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 14px",
            borderTop: "1px solid var(--linha)", fontSize: 15 }}>
            <span>Total</span>
            <span className="num" style={{ fontSize: 19, color: "var(--pimenta)" }}>
              {brl(precoAtual(produto) * qtd)}
            </span>
          </div>

          {erro && (
            <div style={{ background: "#F5E3E2", color: "var(--pimenta)", padding: "10px 12px",
              borderRadius: 8, fontSize: 13.5, marginBottom: 12 }}>{erro}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-1" style={{ flex: 1 }} onClick={enviar} disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar reserva"}
            </button>
            <button className="btn btn-3" onClick={fechar}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================= PAINEL ================================= */

function Painel({ loja, produtos, reservas, alterar, salvarLoja, notificar, sair }) {
  const [liberado, setLiberado] = useState(false);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("reservas");
  const [editando, setEditando] = useState(null);

  if (!liberado) {
    return (
      <div className="esmalte" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "var(--porcelana)", padding: 26, borderRadius: 14, width: "100%", maxWidth: 340 }}>
          <div className="rotulo" style={{ color: "var(--grafite)" }}>Acesso do vendedor</div>
          <h2 className="display" style={{ fontSize: 25, margin: "6px 0 18px" }}>Entrar no painel</h2>
          <div className="campo">
            <label htmlFor="pin">PIN</label>
            <input id="pin" type="password" inputMode="numeric" value={pin} autoFocus
              onChange={(e) => { setPin(e.target.value); setErro(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { pin === loja.pin ? setLiberado(true) : setErro("PIN incorreto."); } }} />
          </div>
          {erro && <div style={{ color: "var(--pimenta)", fontSize: 13.5, marginBottom: 12 }}>{erro}</div>}
          <button className="btn btn-2" style={{ width: "100%" }}
            onClick={() => (pin === loja.pin ? setLiberado(true) : setErro("PIN incorreto."))}>
            Entrar
          </button>
          <button className="btn btn-3" style={{ width: "100%", marginTop: 8 }} onClick={sair}>
            Voltar ao catálogo
          </button>
        </div>
      </div>
    );
  }

  const pendentes = reservas.filter((r) => r.status === "pendente");
  const publicados = produtos.filter((p) => p.status === "publicado");
  const baixos = publicados.filter((p) => disponivel(p) > 0 && disponivel(p) <= 2);
  const valorEstoque = produtos.reduce((s, p) => s + precoAtual(p) * (p.quantidadeTotal || 0), 0);

  const abas = [
    ["reservas", `Reservas${pendentes.length ? ` (${pendentes.length})` : ""}`],
    ["produtos", "Produtos"],
    ["novo", editando ? "Editar item" : "Novo item"],
    ["ajustes", "Ajustes"],
  ];

  return (
    <>
      <header className="esmalte" style={{ padding: "18px 0", color: "#fff" }}>
        <div className="env">
          <div className="linha-topo">
            <div>
              <div className="rotulo" style={{ opacity: 0.7 }}>Painel do vendedor</div>
              <div className="display" style={{ fontSize: 24, marginTop: 3 }}>{loja.nome}</div>
            </div>
            <button className="btn btn-p" onClick={sair}
              style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>Ver catálogo</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 16 }}>
            <Indicador rotulo="Publicados" valor={publicados.length} />
            <Indicador rotulo="Reservas" valor={pendentes.length} alerta={pendentes.length > 0} />
            <Indicador rotulo="Estoque baixo" valor={baixos.length} alerta={baixos.length > 0} />
            <Indicador rotulo="Em estoque" valor={brl(valorEstoque)} pequeno />
          </div>
        </div>
      </header>

      <div style={{ background: "var(--papel)", borderBottom: "1px solid var(--linha)", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="env" style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {abas.map(([id, txt]) => (
            <button key={id} onClick={() => { setAba(id); if (id !== "novo") setEditando(null); }}
              style={{ padding: "13px 12px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                color: aba === id ? "var(--tinta)" : "var(--grafite)",
                borderBottom: aba === id ? "2.5px solid var(--pimenta)" : "2.5px solid transparent" }}>
              {txt}
            </button>
          ))}
        </div>
      </div>

      <div className="env" style={{ paddingTop: 16, paddingBottom: 60 }}>
        {aba === "reservas" && (
          <AbaReservas reservas={reservas} loja={loja} alterar={alterar} notificar={notificar} />
        )}
        {aba === "produtos" && (
          <AbaProdutos produtos={produtos} alterar={alterar} notificar={notificar}
            editar={(p) => { setEditando(p); setAba("novo"); }} />
        )}
        {aba === "novo" && (
          <FormProduto produto={editando} alterar={alterar} notificar={notificar}
            aoSalvar={() => { setEditando(null); setAba("produtos"); }} />
        )}
        {aba === "ajustes" && <AbaAjustes loja={loja} salvarLoja={salvarLoja} notificar={notificar} />}
      </div>
    </>
  );
}

function Indicador({ rotulo, valor, alerta, pequeno }) {
  return (
    <div style={{ background: alerta ? "rgba(224,160,41,.22)" : "rgba(255,255,255,.11)",
      padding: "9px 10px", borderRadius: 9 }}>
      <div className="num" style={{ fontSize: pequeno ? 14 : 22, color: "#fff", lineHeight: 1.2 }}>{valor}</div>
      <div className="rotulo" style={{ opacity: 0.72, marginTop: 3, fontSize: 9.5 }}>{rotulo}</div>
    </div>
  );
}

/* ============================== ABA RESERVAS ============================== */

function AbaReservas({ reservas, loja, alterar, notificar }) {
  const [filtro, setFiltro] = useState("pendente");
  const [ocupado, setOcupado] = useState("");

  const decidir = async (reserva, aprovar) => {
    setOcupado(reserva.id);
    try {
      await alterar((ps, rs) => {
        const produtos = ps.map((p) => {
          if (p.id !== reserva.produtoId) return p;
          const reservada = Math.max(0, (p.quantidadeReservada || 0) - reserva.quantidade);
          return aprovar
            ? { ...p, quantidadeReservada: reservada,
                quantidadeTotal: Math.max(0, (p.quantidadeTotal || 0) - reserva.quantidade) }
            : { ...p, quantidadeReservada: reservada };
        });
        const atualizadas = rs.map((r) =>
          r.id === reserva.id
            ? { ...r, status: aprovar ? "aprovada" : "recusada", decididaEm: new Date().toISOString() }
            : r
        );
        return { produtos, reservas: atualizadas };
      });

      if (aprovar) {
        abrirWhats(
          reserva.telefoneCliente,
          `Olá, ${reserva.nomeCliente}! Aqui é da ${loja.nome}.\n\n` +
          `Sua reserva de *${reserva.quantidade}x ${reserva.produtoNome}* está confirmada. ` +
          `Total: ${brl(reserva.precoUnitario * reserva.quantidade)}.\n\n` +
          `Pode retirar na loja${loja.horario ? " — " + loja.horario : ""}.`
        );
        notificar("Reserva aprovada e baixada do estoque.");
      } else {
        notificar("Reserva recusada. Item devolvido ao catálogo.");
      }
    } catch (e) {
      notificar(e.message || "Não consegui atualizar a reserva.");
    } finally {
      setOcupado("");
    }
  };

  const lista = reservas.filter((r) => (filtro === "todas" ? true : r.status === filtro));

  const cores = { pendente: "t-baixo", aprovada: "t-ok", recusada: "t-fora", expirada: "t-neutro" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        {["pendente", "aprovada", "recusada", "expirada", "todas"].map((f) => (
          <button key={f} className={"chip" + (filtro === f ? " chip-on" : "")} onClick={() => setFiltro(f)}
            style={{ textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="vazio">
          <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>Nenhuma reserva aqui</div>
          <p style={{ color: "var(--grafite)", fontSize: 14.5, margin: 0 }}>
            As reservas feitas no catálogo aparecem nesta lista para você aprovar ou recusar.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map((r) => (
            <div key={r.id} className="painel-cx">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5 }}>{r.quantidade}x {r.produtoNome}</div>
                  <div className="num" style={{ fontSize: 16, color: "var(--pimenta)", marginTop: 3 }}>
                    {brl(r.precoUnitario * r.quantidade)}
                  </div>
                </div>
                <span className={"tag " + cores[r.status]} style={{ height: "fit-content" }}>{r.status}</span>
              </div>

              <div style={{ fontSize: 14, color: "var(--grafite)", lineHeight: 1.55 }}>
                {r.nomeCliente} · {r.telefoneCliente}
                <br />
                <span style={{ fontSize: 12.5 }}>Pedida em {dataCurta(r.criadaEm)}</span>
                {r.observacao && <><br /><em style={{ fontSize: 13.5 }}>“{r.observacao}”</em></>}
              </div>

              {r.status === "pendente" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ok btn-p" style={{ flex: 1 }} disabled={ocupado === r.id}
                    onClick={() => decidir(r, true)}>Aprovar</button>
                  <button className="btn btn-3 btn-p" style={{ flex: 1 }} disabled={ocupado === r.id}
                    onClick={() => decidir(r, false)}>Recusar</button>
                  <button className="btn btn-3 btn-p"
                    onClick={() => abrirWhats(r.telefoneCliente, `Olá, ${r.nomeCliente}! Aqui é da ${loja.nome}, sobre sua reserva de ${r.produtoNome}.`)}>
                    Chamar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================== ABA PRODUTOS ============================== */

function AbaProdutos({ produtos, alterar, notificar, editar }) {
  const [busca, setBusca] = useState("");
  const [rascunhos, setRascunhos] = useState(false);

  const lista = produtos
    .filter((p) => p.status !== "arquivado")
    .filter((p) => (rascunhos ? p.status === "rascunho" : true))
    .filter((p) => {
      const t = busca.trim().toLowerCase();
      return !t || p.nome.toLowerCase().includes(t) || (p.sku || "").toLowerCase().includes(t);
    });

  const ajustar = async (id, campo, valor) => {
    await alterar((ps) => ({ produtos: ps.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)) }));
  };

  const arquivar = async (p) => {
    await alterar((ps) => ({ produtos: ps.map((x) => (x.id === p.id ? { ...x, status: "arquivado" } : x)) }));
    notificar("Item arquivado. Saiu do catálogo público.");
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Buscar item" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className={"chip" + (rascunhos ? " chip-on" : "")} onClick={() => setRascunhos(!rascunhos)}>
          Rascunhos
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="vazio">
          <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>Nenhum item cadastrado</div>
          <p style={{ color: "var(--grafite)", fontSize: 14.5, margin: 0 }}>
            Abra a aba Novo item, fotografe o produto e publique.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map((p) => (
            <div key={p.id} className="painel-cx" style={{ display: "flex", gap: 12 }}>
              {p.capa ? (
                <img src={p.capa} alt="" style={{ width: 66, height: 66, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div className="sem-foto" style={{ width: 66, height: 66, borderRadius: 8, aspectRatio: "auto", flexShrink: 0 }}>—</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome}</div>
                  <span className={"tag " + (p.status === "publicado" ? "t-ok" : "t-neutro")}>{p.status}</span>
                </div>
                <div className="rotulo" style={{ color: "var(--grafite)", margin: "4px 0 9px" }}>
                  {p.sku} · {p.categoria}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, color: "var(--grafite)" }}>
                    Preço
                    <input className="num" defaultValue={p.preco} style={{ width: 92, padding: "6px 8px", marginLeft: 5 }}
                      onBlur={(e) => ajustar(p.id, "preco", paraNumero(e.target.value))} />
                  </label>
                  <label style={{ fontSize: 12, color: "var(--grafite)" }}>
                    Estoque
                    <input className="num" type="number" min="0" defaultValue={p.quantidadeTotal}
                      style={{ width: 66, padding: "6px 8px", marginLeft: 5 }}
                      onBlur={(e) => ajustar(p.id, "quantidadeTotal", Math.max(0, parseInt(e.target.value) || 0))} />
                  </label>
                  <span className="tag t-neutro">{disponivel(p)} livre{p.quantidadeReservada ? ` · ${p.quantidadeReservada} reservado` : ""}</span>
                </div>

                <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
                  <button className="btn btn-3 btn-p" onClick={() => editar(p)}>Editar</button>
                  <button className="btn btn-3 btn-p"
                    onClick={() => ajustar(p.id, "status", p.status === "publicado" ? "rascunho" : "publicado")}>
                    {p.status === "publicado" ? "Despublicar" : "Publicar"}
                  </button>
                  <button className="btn btn-3 btn-p" style={{ color: "var(--pimenta)" }} onClick={() => arquivar(p)}>
                    Arquivar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================ FORMULÁRIO PRODUTO ============================ */

function FormProduto({ produto, alterar, notificar, aoSalvar }) {
  const [nome, setNome] = useState(produto?.nome || "");
  const [descricao, setDescricao] = useState(produto?.descricao || "");
  const [categoria, setCategoria] = useState(produto?.categoria || CATEGORIAS[0]);
  const [preco, setPreco] = useState(produto ? String(produto.preco) : "");
  const [promo, setPromo] = useState(produto?.precoPromocional ? String(produto.precoPromocional) : "");
  const [qtd, setQtd] = useState(produto ? String(produto.quantidadeTotal) : "1");
  const [fotos, setFotos] = useState([]);
  const [carregandoFotos, setCarregandoFotos] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const entrada = useRef(null);

  useEffect(() => {
    if (produto) ler(K.fotos(produto.id), produto.capa ? [produto.capa] : []).then(setFotos);
    else setFotos([]);
  }, [produto?.id]);

  const receberFotos = async (e) => {
    const arquivos = Array.from(e.target.files || []).slice(0, 5 - fotos.length);
    if (!arquivos.length) return;
    setCarregandoFotos(true);
    setErro("");
    try {
      const novas = [];
      for (const a of arquivos) novas.push(await comprimir(a, 1000, 0.72));
      setFotos((f) => [...f, ...novas].slice(0, 5));
    } catch (er) {
      setErro(er.message);
    } finally {
      setCarregandoFotos(false);
      if (entrada.current) entrada.current.value = "";
    }
  };

  const mover = (i, passo) => {
    setFotos((f) => {
      const n = [...f];
      const j = i + passo;
      if (j < 0 || j >= n.length) return n;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  const salvar = async (publicar) => {
    if (nome.trim().length < 2) return setErro("Dê um nome ao item.");
    if (paraNumero(preco) <= 0) return setErro("Informe o preço de venda.");
    setErro("");
    setSalvando(true);
    try {
      const id = produto?.id || novoId();
      const capa = fotos[0] ? await recomprimirCapa(fotos[0]) : "";

      if (fotos.length) await gravar(K.fotos(id), fotos);

      await alterar((ps) => {
        const base = {
          id,
          sku: produto?.sku || "MU-" + id.slice(-5).toUpperCase(),
          nome: nome.trim(),
          descricao: descricao.trim(),
          categoria,
          preco: paraNumero(preco),
          precoPromocional: paraNumero(promo),
          quantidadeTotal: Math.max(0, parseInt(qtd) || 0),
          quantidadeReservada: produto?.quantidadeReservada || 0,
          capa,
          status: publicar ? "publicado" : "rascunho",
          criadoEm: produto?.criadoEm || new Date().toISOString(),
        };
        const existe = ps.some((p) => p.id === id);
        return { produtos: existe ? ps.map((p) => (p.id === id ? base : p)) : [base, ...ps] };
      });

      notificar(publicar ? "Item publicado no catálogo." : "Rascunho salvo.");
      aoSalvar();
    } catch (e) {
      setErro(e.message || "Não consegui salvar o item.");
      setSalvando(false);
    }
  };

  return (
    <div className="painel-cx" style={{ maxWidth: 560 }}>
      <div className="campo">
        <label>Fotos (até 5 · a primeira é a capa)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
          {fotos.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={f} alt="" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 8,
                border: i === 0 ? "2.5px solid var(--pimenta)" : "1px solid var(--linha)" }} />
              <button onClick={() => setFotos((x) => x.filter((_, k) => k !== i))} aria-label="Remover foto"
                style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%",
                  background: "var(--pimenta)", color: "#fff", fontSize: 13, lineHeight: 1 }}>×</button>
              {i > 0 && (
                <button onClick={() => mover(i, -1)} aria-label="Mover para frente"
                  style={{ position: "absolute", bottom: -6, left: -6, width: 22, height: 22, borderRadius: "50%",
                    background: "var(--tinta)", color: "#fff", fontSize: 12, lineHeight: 1 }}>‹</button>
              )}
            </div>
          ))}
          {fotos.length < 5 && (
            <button onClick={() => entrada.current?.click()} disabled={carregandoFotos}
              style={{ width: 76, height: 76, borderRadius: 8, border: "1.5px dashed var(--linha)",
                background: "var(--porcelana)", fontSize: 12, color: "var(--grafite)" }}>
              {carregandoFotos ? "..." : "+ foto"}
            </button>
          )}
        </div>
        <input ref={entrada} type="file" accept="image/*" capture="environment" multiple
          onChange={receberFotos} style={{ display: "none" }} />
      </div>

      <div className="campo">
        <label htmlFor="p-nome">Nome do item</label>
        <input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Jogo de panelas antiaderente 5 peças" />
      </div>

      <div className="campo">
        <label htmlFor="p-desc">Descrição</label>
        <textarea id="p-desc" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Material, tamanho, cores disponíveis, marca..." />
      </div>

      <div className="campo">
        <label htmlFor="p-cat">Categoria</label>
        <select id="p-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div className="campo">
          <label htmlFor="p-preco">Preço</label>
          <input id="p-preco" className="num" inputMode="decimal" value={preco}
            onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
        </div>
        <div className="campo">
          <label htmlFor="p-promo">Promoção</label>
          <input id="p-promo" className="num" inputMode="decimal" value={promo}
            onChange={(e) => setPromo(e.target.value)} placeholder="—" />
        </div>
        <div className="campo">
          <label htmlFor="p-qtd">Estoque</label>
          <input id="p-qtd" className="num" type="number" min="0" value={qtd}
            onChange={(e) => setQtd(e.target.value)} />
        </div>
      </div>

      {erro && (
        <div style={{ background: "#F5E3E2", color: "var(--pimenta)", padding: "10px 12px",
          borderRadius: 8, fontSize: 13.5, marginBottom: 12 }}>{erro}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-1" style={{ flex: 1 }} disabled={salvando} onClick={() => salvar(true)}>
          {salvando ? "Salvando..." : "Publicar no catálogo"}
        </button>
        <button className="btn btn-3" disabled={salvando} onClick={() => salvar(false)}>Salvar rascunho</button>
      </div>
    </div>
  );
}

function recomprimirCapa(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 380 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* =============================== ABA AJUSTES =============================== */

function AbaAjustes({ loja, salvarLoja, notificar }) {
  const [f, setF] = useState(loja);
  const [salvando, setSalvando] = useState(false);

  const campo = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarLoja({ ...f, horasExpiracao: Math.max(1, parseInt(f.horasExpiracao) || 48) });
      notificar("Ajustes salvos.");
    } catch (e) {
      notificar("Não consegui salvar os ajustes.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="painel-cx" style={{ maxWidth: 480 }}>
      <div className="campo">
        <label htmlFor="a-nome">Nome da loja</label>
        <input id="a-nome" value={f.nome} onChange={(e) => campo("nome", e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="a-cid">Cidade</label>
        <input id="a-cid" value={f.cidade} onChange={(e) => campo("cidade", e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="a-wpp">WhatsApp da loja</label>
        <input id="a-wpp" inputMode="numeric" value={f.whatsapp}
          onChange={(e) => campo("whatsapp", formatarTel(e.target.value))} placeholder="(74) 90000-0000" />
        <p style={{ fontSize: 12.5, color: "var(--grafite)", margin: "6px 0 0" }}>
          É para cá que as reservas dos clientes são enviadas.
        </p>
      </div>
      <div className="campo">
        <label htmlFor="a-hor">Horário de funcionamento</label>
        <input id="a-hor" value={f.horario} onChange={(e) => campo("horario", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="campo">
          <label htmlFor="a-pin">PIN do painel</label>
          <input id="a-pin" value={f.pin} onChange={(e) => campo("pin", e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="a-exp">Reserva expira em (h)</label>
          <input id="a-exp" className="num" type="number" min="1" value={f.horasExpiracao}
            onChange={(e) => campo("horasExpiracao", e.target.value)} />
        </div>
      </div>
      <button className="btn btn-2" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar ajustes"}
      </button>
    </div>
  );
}
