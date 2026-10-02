const API_URL = 'https://script.google.com/macros/s/AKfycbwHZes5xLtTREn1jpdKSPSDmWVf1mwkJ4J_RjFqAWxGQUt0kjCjULKMPs38r4GDtqMt/exec';

const state = {
  items: [],
  filteredItems: [],
  filter: 'Todos',
  search: ''
};

const elements = {
  form: document.getElementById('participationForm'),
  nome: document.getElementById('nome'),
  pet: document.getElementById('pet'),
  tipo: document.getElementById('tipo'),
  mensagem: document.getElementById('mensagem'),
  foto: document.getElementById('foto'),
  consentimento: document.getElementById('consentimento'),
  mensagemCounter: document.getElementById('mensagemCounter'),
  submitButton: document.getElementById('submitButton'),
  formStatus: document.getElementById('formStatus'),
  mural: document.getElementById('mural'),
  search: document.getElementById('search'),
  filters: document.getElementById('filters'),
  totalCounter: document.getElementById('totalCounter'),
  dogsCounter: document.getElementById('dogsCounter'),
  catsCounter: document.getElementById('catsCounter'),
  rabbitsCounter: document.getElementById('rabbitsCounter'),
  modal: document.getElementById('modal'),
  modalContent: document.getElementById('modalContent'),
  modalClose: document.getElementById('modalClose')
};

document.addEventListener('DOMContentLoaded', () => {
  initialize();
});

async function initialize() {
  setupForm();
  setupFilters();
  setupSearch();
  setupModal();
  updateMessageCounter();
  await loadMural();
}

function setupForm() {
  if (!elements.form) return;

  elements.form.addEventListener('submit', handleSubmit);

  if (elements.mensagem) {
    elements.mensagem.addEventListener('input', updateMessageCounter);
  }

  if (elements.foto) {
    elements.foto.addEventListener('change', validatePhoto);
  }
}

function setupFilters() {
  if (!elements.filters) return;

  const buttons = elements.filters.querySelectorAll('[data-filter]');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(item => item.classList.remove('active'));

      button.classList.add('active');

      state.filter = button.dataset.filter || 'Todos';

      applyFilters();
    });
  });
}

function setupSearch() {
  if (!elements.search) return;

  elements.search.addEventListener('input', event => {
    state.search = normalizeText(event.target.value);

    applyFilters();
  });
}

function setupModal() {
  if (elements.modalClose) {
    elements.modalClose.addEventListener('click', closeModal);
  }

  if (elements.modal) {
    elements.modal.addEventListener('click', event => {
      if (event.target === elements.modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });
}

async function loadMural() {
  if (!API_URL || API_URL.includes('COLE_AQUI')) {
    showMuralMessage(
      'A URL do Google Apps Script ainda não foi configurada.'
    );

    return;
  }

  showMuralLoading();

  try {
    const response = await fetch(
      API_URL + '?action=list&callback=handleMuralResponse'
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = extractJsonFromJsonp(text);
    }

    if (!data || !data.success) {
      throw new Error(
        data && data.error
          ? data.error
          : 'Não foi possível carregar o mural.'
      );
    }

    state.items = Array.isArray(data.items)
      ? data.items
      : [];

    applyFilters();
    updateCounters();

  } catch (error) {
    console.error(error);

    showMuralMessage(
      'Não foi possível carregar o mural agora. Tente novamente em alguns instantes.'
    );
  }
}

function extractJsonFromJsonp(text) {
  const firstParenthesis = text.indexOf('(');
  const lastParenthesis = text.lastIndexOf(')');

  if (
    firstParenthesis === -1 ||
    lastParenthesis === -1
  ) {
    throw new Error('Resposta inválida do servidor.');
  }

  const json = text.substring(
    firstParenthesis + 1,
    lastParenthesis
  );

  return JSON.parse(json);
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!elements.form) return;

  clearFormStatus();

  if (!elements.form.checkValidity()) {
    elements.form.reportValidity();
    return;
  }

  if (!elements.consentimento.checked) {
    showFormStatus(
      'Você precisa autorizar a publicação da participação.',
      'error'
    );

    return;
  }

  const photo = elements.foto.files[0];

  if (photo) {
    const validation = validatePhotoFile(photo);

    if (!validation.valid) {
      showFormStatus(validation.message, 'error');
      return;
    }
  }

  if (!API_URL || API_URL.includes('COLE_AQUI')) {
    showFormStatus(
      'A integração com o Google Apps Script ainda não foi configurada.',
      'error'
    );

    return;
  }

  setSubmitting(true);

  try {
    const payload = {
      nome: elements.nome.value.trim(),
      pet: elements.pet.value.trim(),
      tipo: elements.tipo.value,
      mensagem: elements.mensagem.value.trim(),
      consentimento: true,
      foto: null
    };

    if (photo) {
      payload.foto = await fileToBase64(photo);
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = extractJsonFromJsonp(text);
    }

    if (!data || !data.success) {
      throw new Error(
        data && data.error
          ? data.error
          : 'Não foi possível enviar sua participação.'
      );
    }

    elements.form.reset();

    updateMessageCounter();

    showFormStatus(
      'Participação enviada com sucesso! Ela ficará disponível no mural após a aprovação.',
      'success'
    );

    setTimeout(() => {
      clearFormStatus();
    }, 7000);

  } catch (error) {
    console.error(error);

    showFormStatus(
      error.message ||
      'Ocorreu um erro ao enviar sua participação.',
      'error'
    );

  } finally {
    setSubmitting(false);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        data: reader.result
      });
    };

    reader.onerror = () => {
      reject(
        new Error('Não foi possível ler a imagem selecionada.')
      );
    };

    reader.readAsDataURL(file);
  });
}

function validatePhoto() {
  const file = elements.foto.files[0];

  if (!file) return;

  const validation = validatePhotoFile(file);

  if (!validation.valid) {
    elements.foto.value = '';

    showFormStatus(
      validation.message,
      'error'
    );

    return;
  }

  clearFormStatus();
}

function validatePhotoFile(file) {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  const maxSize = 8 * 1024 * 1024;

  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      message: 'Formato de imagem não permitido. Use JPG, PNG ou WEBP.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      message: 'A foto deve ter no máximo 8 MB.'
    };
  }

  return {
    valid: true
  };
}

function updateMessageCounter() {
  if (!elements.mensagem || !elements.mensagemCounter) return;

  const length = elements.mensagem.value.length;

  elements.mensagemCounter.textContent =
    `${length}/250`;
}

function setSubmitting(isSubmitting) {
  if (!elements.submitButton) return;

  elements.submitButton.disabled = isSubmitting;

  if (isSubmitting) {
    elements.submitButton.dataset.originalText =
      elements.submitButton.textContent;

    elements.submitButton.textContent =
      'Enviando...';

  } else {
    elements.submitButton.textContent =
      elements.submitButton.dataset.originalText ||
      'Participar do mural';
  }
}

function applyFilters() {
  const search = normalizeText(state.search);

  state.filteredItems = state.items.filter(item => {
    const typeMatches =
      state.filter === 'Todos' ||
      normalizeText(item.tipo) === normalizeText(state.filter);

    const searchMatches =
      !search ||
      normalizeText(item.pet).includes(search) ||
      normalizeText(item.nome).includes(search) ||
      normalizeText(item.mensagem).includes(search);

    return typeMatches && searchMatches;
  });

  renderMural();
}

function renderMural() {
  if (!elements.mural) return;

  if (!state.filteredItems.length) {
    elements.mural.innerHTML = `
      <div class="mural-empty">
        <div class="mural-empty-icon">🐾</div>
        <h3>Nenhuma participação encontrada</h3>
        <p>
          Ainda não há mensagens publicadas com esses critérios.
        </p>
      </div>
    `;

    return;
  }

  elements.mural.innerHTML =
    state.filteredItems
      .map((item, index) => createCard(item, index))
      .join('');

  const cards =
    elements.mural.querySelectorAll('[data-card-index]');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const index =
        Number(card.dataset.cardIndex);

      const item =
        state.filteredItems[index];

      if (item) {
        openModal(item);
      }
    });
  });
}

function createCard(item, index) {
  const photo = item.foto
    ? `
      <img
        src="${escapeAttribute(item.foto)}"
        alt="Foto de ${escapeHtml(item.pet)}"
        loading="lazy"
        onerror="this.style.display='none';"
      >
    `
    : `
      <div class="card-placeholder">
        ${getAnimalEmoji(item.tipo)}
      </div>
    `;

  return `
    <article
      class="mural-card"
      data-card-index="${index}"
      tabindex="0"
      role="button"
      aria-label="Ver participação de ${escapeAttribute(item.pet)}"
    >
      <div class="mural-card-photo">
        ${photo}
      </div>

      <div class="mural-card-body">
        <span class="animal-badge">
          ${getAnimalEmoji(item.tipo)}
          ${escapeHtml(item.tipo || 'Pet')}
        </span>

        <h3>
          ${escapeHtml(item.pet || 'Meu pet')}
        </h3>

        <p class="mural-message">
          “${escapeHtml(item.mensagem || '')}”
        </p>

        <div class="mural-author">
          <strong>${escapeHtml(item.nome || '')}</strong>

          ${
            item.data
              ? `<span>${escapeHtml(item.data)}</span>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

function openModal(item) {
  if (!elements.modal || !elements.modalContent) return;

  const photo = item.foto
    ? `
      <img
        class="modal-photo"
        src="${escapeAttribute(item.foto)}"
        alt="Foto de ${escapeHtml(item.pet)}"
      >
    `
    : `
      <div class="modal-placeholder">
        ${getAnimalEmoji(item.tipo)}
      </div>
    `;

  elements.modalContent.innerHTML = `
    <div class="modal-inner">
      ${photo}

      <div class="modal-info">

        <span class="animal-badge">
          ${getAnimalEmoji(item.tipo)}
          ${escapeHtml(item.tipo || 'Pet')}
        </span>

        <h2>
          ${escapeHtml(item.pet || 'Meu pet')}
        </h2>

        <blockquote>
          “${escapeHtml(item.mensagem || '')}”
        </blockquote>

        <p>
          <strong>Mensagem enviada por:</strong>
          ${escapeHtml(item.nome || '')}
        </p>

        ${
          item.data
            ? `<small>${escapeHtml(item.data)}</small>`
            : ''
        }

      </div>
    </div>
  `;

  elements.modal.classList.add('is-open');
  document.body.classList.add('modal-open');

  if (elements.modalClose) {
    elements.modalClose.focus();
  }
}

function closeModal() {
  if (!elements.modal) return;

  elements.modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

function updateCounters() {
  const total = state.items.length;

  const dogs =
    state.items.filter(
      item => normalizeText(item.tipo) === 'cachorro'
    ).length;

  const cats =
    state.items.filter(
      item => normalizeText(item.tipo) === 'gato'
    ).length;

  const rabbits =
    state.items.filter(
      item => normalizeText(item.tipo) === 'coelho'
    ).length;

  if (elements.totalCounter) {
    elements.totalCounter.textContent = total;
  }

  if (elements.dogsCounter) {
    elements.dogsCounter.textContent = dogs;
  }

  if (elements.catsCounter) {
    elements.catsCounter.textContent = cats;
  }

  if (elements.rabbitsCounter) {
    elements.rabbitsCounter.textContent = rabbits;
  }
}

function getAnimalEmoji(type) {
  switch (normalizeText(type)) {
    case 'cachorro':
      return '🐶';

    case 'gato':
      return '🐱';

    case 'coelho':
      return '🐰';

    default:
      return '🐾';
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showMuralLoading() {
  if (!elements.mural) return;

  elements.mural.innerHTML = `
    <div class="mural-loading">
      <div class="loading-spinner"></div>
      <p>Carregando participações...</p>
    </div>
  `;
}

function showMuralMessage(message) {
  if (!elements.mural) return;

  elements.mural.innerHTML = `
    <div class="mural-empty">
      <div class="mural-empty-icon">🐾</div>
      <h3>Ops!</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function showFormStatus(message, type) {
  if (!elements.formStatus) return;

  elements.formStatus.textContent = message;

  elements.formStatus.className =
    `form-status ${type || ''}`;

  elements.formStatus.hidden = false;
}

function clearFormStatus() {
  if (!elements.formStatus) return;

  elements.formStatus.textContent = '';
  elements.formStatus.className = 'form-status';
  elements.formStatus.hidden = true;
}

/*
 * Esta função existe para compatibilidade
 * com respostas JSONP, caso necessário.
 */
function handleMuralResponse(data) {
  if (!data || !data.success) {
    showMuralMessage(
      'Não foi possível carregar o mural.'
    );

    return;
  }

  state.items =
    Array.isArray(data.items)
      ? data.items
      : [];

  applyFilters();
  updateCounters();
}
