import { CATEGORIES, PIECES } from './gallery-data.js';

const state = {
  category: 'All',
  query: '',
  removed: new Set(),
};

const $ = (id) => document.getElementById(id);

const els = {
  filters: $('filters'),
  search: $('search'),
  gallery: $('gallery'),
  resultCount: $('resultCount'),
  emptyState: $('emptyState'),
  resetFilters: $('resetFilters'),
};

const currentYearEl = $('currentYear');
if (currentYearEl) {
  currentYearEl.textContent = new Date().getFullYear();
}

function getVisiblePieces() {
  const query = state.query.trim().toLowerCase();
  return PIECES.filter((piece) => {
    if (state.removed.has(piece.id)) return false;
    if (state.category !== 'All' && piece.category !== state.category) return false;
    if (!query) return true;
    return [piece.title, piece.glaze, piece.clay, piece.category].some((field) =>
      field.toLowerCase().includes(query)
    );
  });
}

function renderFilters() {
  els.filters.innerHTML = CATEGORIES.map((category) => {
    const active = category === state.category;
    return `<button type="button" class="btn btn-sm rounded-pill ${active ? 'btn-primary' : 'btn-outline-secondary'}"
      data-category="${category}" aria-pressed="${active}">${category}</button>`;
  }).join('');
}

function createCard(piece) {
  const col = document.createElement('div');
  col.className = 'col';
  col.innerHTML = `
    <article class="card piece-card h-100">
      <div class="position-relative">
        <img src="${piece.image}" alt="${piece.title}, ${piece.glaze} glaze" class="card-img-top img-thumbnail" loading="lazy" />
        <button type="button"
          class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 remove-btn"
          data-remove="${piece.id}" aria-label="Remove ${piece.title}">
          &times;
        </button>
      </div>
      <div class="card-body">
        <h2 class="h6 fw-semibold mb-1">${piece.title}</h2>
        <p class="small text-body-secondary mb-0">${piece.category} &middot; ${piece.glaze}</p>
      </div>
    </article>`;
  return col;
}

function renderGallery() {
  const visible = getVisiblePieces();
  const fragment = document.createDocumentFragment();
  visible.forEach((piece) => fragment.appendChild(createCard(piece)));
  els.gallery.replaceChildren(fragment);

  const count = visible.length;
  els.resultCount.textContent = `${count} ${count === 1 ? 'piece' : 'pieces'}`;
  els.emptyState.classList.toggle('d-none', count > 0);
  els.gallery.classList.toggle('d-none', count === 0);
}

function removePiece(id) {
  state.removed.add(id);
  renderGallery();
}

els.filters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderGallery();
});

els.search.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderGallery();
});

els.resetFilters.addEventListener('click', () => {
  Object.assign(state, { category: 'All', query: '' });
  state.removed.clear();
  els.search.value = '';
  renderFilters();
  renderGallery();
});

els.gallery.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-remove]');
  if (removeButton) {
    removePiece(removeButton.dataset.remove);
  }
});

renderFilters();
renderGallery();
