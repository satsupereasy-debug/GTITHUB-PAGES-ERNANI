/**
 * shared.js — Template #3 Multi-página
 * localStorage + renderItens reutilizável
 */

const STORAGE_KEY = 'selecao';

/* ── STORAGE ── */
function lerSelecao() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function salvarSelecao(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
function totalSelecionados() {
  return Object.keys(lerSelecao()).length;
}
function atualizarBadge() {
  const el = document.getElementById('badge-count');
  if (el) el.textContent = totalSelecionados();
}

/* ── TOGGLE ── */
function toggleItem(id, label, pagina, checked, qty) {
  const s = lerSelecao();
  if (checked) s[id] = { id, label, pagina, qty: parseInt(qty) || 1 };
  else delete s[id];
  salvarSelecao(s);
  atualizarBadge();
}

/* ── QUANTIDADE ── */
function atualizarQty(id, label, pagina, qty) {
  const s = lerSelecao();
  if (s[id]) { s[id].qty = parseInt(qty) || 1; salvarSelecao(s); }
}

/* ── RENDER ITENS (reutilizável em todas as páginas) ── */
function renderItens(gridId, itens, pagina) {
  const selecao = lerSelecao();
  const grid    = document.getElementById(gridId);
  if (!grid) return;

  grid.innerHTML = itens.map(item => {
    const sel = selecao[item.id];
    const checked = sel ? 'checked' : '';
    const qty     = sel ? sel.qty : 1;

    const options = [1,2,3,4,5,6,7,8,9,10].map(n =>
      `<option ${n === qty ? 'selected' : ''}>${n}</option>`
    ).join('');

    return `
    <label class="item-card">
      <input type="checkbox" value="${item.id}" ${checked}
             onchange="
               toggleItem('${item.id}','${item.label}',${pagina},this.checked,
                 this.closest('.item-card').querySelector('.qty-select').value);
               toast(this.checked ? '✓ ${item.label} adicionado' : '${item.label} removido')
             "/>
      <div class="item-inner">
        <div class="chk-box">✓</div>
        <img class="item-img" src="${item.img}" alt="${item.label}"
             onerror="this.src='https://placehold.co/300x225/f4f2ee/8a8680?text=${encodeURIComponent(item.label)}'"/>
        <span class="item-label">${item.label}</span>
        <span class="item-id">${item.id}</span>
        <div class="qty-wrap">
          <span class="qty-label">Qtd:</span>
          <select class="qty-select"
                  onchange="atualizarQty('${item.id}','${item.label}',${pagina},this.value)"
                  onclick="event.stopPropagation()">
            ${options}
          </select>
        </div>
      </div>
    </label>`;
  }).join('');

  atualizarBadge();
}

/* ── LIMPAR TUDO ── */
function limparTudo() {
  if (!confirm('Limpar todas as seleções?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/* ── TOAST ── */
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
