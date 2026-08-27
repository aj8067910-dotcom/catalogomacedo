import * as XLSX from "xlsx";

/* Colunas da planilha de produtos. A coluna "id" só é preenchida quando a
   planilha vem da própria exportação — serve para ATUALIZAR itens já existentes
   sem duplicar. Deixe "id" em branco para cadastrar um item novo. */
const COLUNAS = [
  "id", "sku", "nome", "descricao", "categoria",
  "preco", "preco_promocional", "quantidade_total", "status",
];

export function exportarProdutos(produtos) {
  const linhas = produtos.map((p) => ({
    id: p.id,
    sku: p.sku,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    preco: p.preco,
    preco_promocional: p.precoPromocional,
    quantidade_total: p.quantidadeTotal,
    status: p.status,
  }));

  // Se ainda não há itens, entrega um modelo com uma linha de exemplo.
  if (linhas.length === 0) {
    linhas.push({
      id: "", sku: "", nome: "Ex.: Jogo de panelas antiaderente 5 peças",
      descricao: "Material, tamanho, cores...", categoria: "Cozinha",
      preco: 289.9, preco_promocional: 0, quantidade_total: 10, status: "rascunho",
    });
  }

  const ws = XLSX.utils.json_to_sheet(linhas, { header: COLUNAS });
  ws["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 34 }, { wch: 38 }, { wch: 18 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `macedo-produtos-${hoje}.xlsx`);
}

// Lê um arquivo .xlsx/.xls/.csv e devolve as linhas como objetos.
export async function lerPlanilha(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}
