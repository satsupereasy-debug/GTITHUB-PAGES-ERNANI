/**
 * shared.js — Template #3 Dinâmico
 * Busca produtos + complementos paginados da API e gerencia a seleção
 * no localStorage (a seleção viaja entre a página de catálogo e o resumo).
 *
 * Estrutura salva no localStorage (chave: "selecao"):
 * {
 *   "item_1": { id, label, pagina, qty, complementos: [...] },
 *   ...
 * }
 */

const STORAGE_KEY = 'selecao';

/* URL do backend no VPS — troca pro domínio real quando for publicar */
const PRODUTOS_API = 'https://pedidos-food.nfcesupereasy.com.br/produtos';

/* ── PAGINAÇÃO (via query string ?pagina=N na própria index.html) ── */
function paginaAtual() {
  const params = new URLSearchParams(location.search);
  const p = parseInt(params.get('pagina') || '1');
  return isNaN(p) || p < 1 ? 1 : p;
}

function irPagina(delta) {
  const nova = paginaAtual() + delta;
  location.href = `index.html?pagina=${nova}`;
}

/* ── BUSCAR E RENDERIZAR PRODUTOS DA PÁGINA ATUAL ── */
async function carregarProdutos() {
  const pagina = paginaAtual();
  const grid = document.getElementById('itens-grid');
  if (!grid) return; // esta página não tem grid de produtos (ex: resumo.html)

  grid.innerHTML = '<div class="carregando">Carregando produtos…</div>';

  try {
    const resp = await fetch(`${PRODUTOS_API}?pagina=${pagina}`);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const dados = await resp.json();
    renderizarProdutos(dados);
  } catch (e) {
    console.error('Erro ao carregar produtos:', e);
    grid.innerHTML = '<div class="carregando">Não foi possível carregar os produtos. Tente novamente em instantes.</div>';
  }
}

function renderizarProdutos(dados) {
  const grid = document.getElementById('itens-grid');
  const selecao = lerSelecao();

  if (!dados.itens || !dados.itens.length) {
    grid.innerHTML = '<div class="carregando">Nenhum produto encontrado nesta página.</div>';
  } else {
    grid.innerHTML = dados.itens.map(item => montarCardHtml(item, dados.pagina, selecao)).join('');
  }

  const titulo = document.getElementById('page-title');
  if (titulo) titulo.textContent = `Página ${dados.pagina}`;

  const btnAnterior = document.getElementById('btn-anterior');
  const btnProxima  = document.getElementById('btn-proxima');
  if (btnAnterior) btnAnterior.disabled = dados.pagina <= 1;
  if (btnProxima)  btnProxima.disabled  = !dados.tem_proxima;

  atualizarBadge();
}

function montarCardHtml(item, pagina, selecao) {
  const marcado    = !!selecao[item.id];
  const qtyAtual   = (selecao[item.id] && selecao[item.id].qty) || 1;
  const compsAtuais = (selecao[item.id] && selecao[item.id].complementos) || [];
  const temComplementos = item.complementos && item.complementos.length > 0;

  const optionsQty = [1,2,3,4,5,6,7,8,9,10]
    .map(n => `<option ${n === qtyAtual ? 'selected' : ''}>${n}</option>`)
    .join('');

  const complementosHtml = temComplementos ? `
    <div class="complementos-wrap" onclick="event.stopPropagation()">
      <span class="complementos-label">Complementos do dia</span>
      <div class="complementos-list">
        ${item.complementos.map(comp => `
          <label class="complemento-chk">
            <input type="checkbox" value="${comp}"
                   ${compsAtuais.includes(comp) ? 'checked' : ''}
                   onchange="toggleComplemento('${item.id}','${item.nome}',${pagina},this.value,this.checked)"/>
            ${comp}
          </label>
        `).join('')}
      </div>
    </div>` : '';

  const descricaoHtml = item.descricao
    ? `<span class="item-desc">${item.descricao}</span>` : '';

  return `
    <label class="item-card">
      <input type="checkbox" value="${item.id}" ${marcado ? 'checked' : ''}
             onchange="toggleItem('${item.id}','${item.nome}',${pagina},this.checked,
               this.closest('.item-card').querySelector('.qty-select').value);
               toast(this.checked ? '✓ ${item.nome} adicionado' : '${item.nome} removido')"/>
      <div class="item-inner">
        <div class="chk-box">✓</div>
        <img class="item-img" src="images/${item.imagem}" alt="${item.nome}"
             onerror="this.src='https://placehold.co/300x225/f4f2ee/8a8680?text=${encodeURIComponent(item.nome)}'"/>
        <span class="item-label">${item.nome}</span>
        ${descricaoHtml}
        <div class="qty-wrap">
          <span class="qty-label">Qtd:</span>
          <select class="qty-select" onclick="event.stopPropagation()"
                  onchange="atualizarQty('${item.id}','${item.nome}',${pagina},this.value)">
            ${optionsQty}
          </select>
        </div>
        ${complementosHtml}
      </div>
    </label>
  `;
}

/* Marca/desmarca um complemento. Se o item ainda não estiver selecionado,
   marca ele automaticamente (com qty=1) — assim o cliente pode começar
   escolhendo o complemento sem precisar marcar o item antes. */
function toggleComplemento(itemId, label, pagina, complemento, checked) {
  const selecao = lerSelecao();

  if (!selecao[itemId]) {
    selecao[itemId] = { id: itemId, label, pagina, qty: 1, complementos: [] };
    const chkPrincipal = document.querySelector(`.item-card input[value="${itemId}"]`);
    if (chkPrincipal) chkPrincipal.checked = true;
  }
  if (!selecao[itemId].complementos) selecao[itemId].complementos = [];

  if (checked) {
    if (!selecao[itemId].complementos.includes(complemento)) {
      selecao[itemId].complementos.push(complemento);
    }
  } else {
    selecao[itemId].complementos = selecao[itemId].complementos.filter(c => c !== complemento);
  }

  salvarSelecao(selecao);
  atualizarBadge();
}

/* ── LER SELEÇÃO ── */
function lerSelecao() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

/* ── SALVAR SELEÇÃO ── */
function salvarSelecao(selecao) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selecao));
}

/* ── TOTAL DE ITENS SELECIONADOS ── */
function totalSelecionados() {
  return Object.keys(lerSelecao()).length;
}

/* ── ATUALIZAR BADGE DO TOPO ── */
function atualizarBadge() {
  const el = document.getElementById('badge-count');
  if (el) el.textContent = totalSelecionados();
}

/* ── TOGGLE DE ITEM (checkbox) ── */
function toggleItem(id, label, pagina, checked, qty) {
  const selecao = lerSelecao();
  if (checked) {
    const complementosExistentes = (selecao[id] && selecao[id].complementos) || [];
    selecao[id] = { id, label, pagina, qty: qty || 1, complementos: complementosExistentes };
  } else {
    delete selecao[id];
    // desmarca os checkboxes de complemento na tela, se existirem
    const card = document.querySelector(`.item-card input[value="${id}"]`)?.closest('.item-card');
    if (card) card.querySelectorAll('.complementos-wrap input[type="checkbox"]').forEach(c => c.checked = false);
  }
  salvarSelecao(selecao);
  atualizarBadge();
}

/* ── ATUALIZAR QUANTIDADE ── */
function atualizarQty(id, label, pagina, qty) {
  const selecao = lerSelecao();
  if (selecao[id]) {
    selecao[id].qty = parseInt(qty) || 1;
    salvarSelecao(selecao);
  }
}

/* ── TOAST ── */
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

/* ── LIMPAR TUDO ── */
function limparTudo() {
  if (!confirm('Limpar todas as seleções?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  atualizarBadge();
});
