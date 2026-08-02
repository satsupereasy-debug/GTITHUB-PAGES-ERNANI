/**
 * shared.js — Template #3 Multi-página
 * Gerencia seleção de itens no localStorage entre páginas
 *
 * Estrutura salva no localStorage (chave: "selecao"):
 * {
 *   "item_1": { id: "item_1", label: "Item 1", pagina: 1, qty: 2 },
 *   "item_4": { id: "item_4", label: "Item 4", pagina: 2, qty: 1 },
 *   ...
 * }
 */

const STORAGE_KEY = 'selecao';

/* ── COMPLEMENTOS (marmitex) ──────────────────────────────────────────────
   Lista muda todo dia — busca uma vez na API e reaproveita em todas as
   páginas (cache em memória, dura só enquanto a aba estiver aberta). */
const COMPLEMENTOS_API = 'https://api.nfcesupereasy.com.br/complementos/hoje';

let _complementosCache = null;

async function carregarComplementos() {
  if (_complementosCache) return _complementosCache;
  try {
    const resp = await fetch(COMPLEMENTOS_API);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const dados = await resp.json();
    _complementosCache = dados.itens || [];
  } catch (e) {
    console.error('Erro ao buscar complementos do dia:', e);
    _complementosCache = [];
  }
  return _complementosCache;
}

/* Monta os checkboxes de complementos dentro de um .complementos-wrap */
async function montarComplementosUI(wrapEl) {
  const itemId  = wrapEl.dataset.item;
  const label   = wrapEl.dataset.label;
  const pagina  = parseInt(wrapEl.dataset.pagina);
  const lista   = wrapEl.querySelector('.complementos-list');

  const itens = await carregarComplementos();
  if (!itens.length) {
    lista.innerHTML = '<span class="complementos-vazio">Complementos indisponíveis no momento</span>';
    return;
  }

  const selecao = lerSelecao();
  const atuais  = (selecao[itemId] && selecao[itemId].complementos) || [];

  lista.innerHTML = itens.map(comp => `
    <label class="complemento-chk">
      <input type="checkbox" value="${comp}"
             ${atuais.includes(comp) ? 'checked' : ''}
             onchange="toggleComplemento('${itemId}','${label}',${pagina},this.value,this.checked)"/>
      ${comp}
    </label>
  `).join('');
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

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.complementos-wrap').forEach(montarComplementosUI);
});


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
    // desmarca os checkboxes de complemento na tela, se existirem nesta página
    const wrap = document.querySelector(`.complementos-wrap[data-item="${id}"]`);
    if (wrap) wrap.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
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

/* ── RESTAURAR ESTADO DOS CHECKBOXES AO CARREGAR A PÁGINA ── */
function restaurarEstado() {
  const selecao = lerSelecao();
  document.querySelectorAll('.item-card input[type="checkbox"]').forEach(chk => {
    const id = chk.value;
    if (selecao[id]) {
      chk.checked = true;
      // Restaura a quantidade no select
      const qtySelect = chk.closest('.item-card')?.querySelector('.qty-select');
      if (qtySelect) qtySelect.value = selecao[id].qty || 1;
    }
  });
  atualizarBadge();
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

/* Restaura ao carregar */
document.addEventListener('DOMContentLoaded', restaurarEstado);
