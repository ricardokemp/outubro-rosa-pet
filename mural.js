(() => {
  const config = window.MURAL_CONFIG || {};
  const apiUrl = config.apiUrl;
  const grid = document.getElementById("muralGrid");
  const empty = document.getElementById("muralEmpty");
  const loading = document.getElementById("muralLoading");
  const search = document.getElementById("muralSearch");
  const filters = document.querySelectorAll("[data-mural-filter]");
  const totalEl = document.getElementById("muralTotal");
  const dogsEl = document.getElementById("muralDogs");
  const catsEl = document.getElementById("muralCats");
  const othersEl = document.getElementById("muralOthers");
  const form = document.getElementById("participationForm");
  const formStatus = document.getElementById("formStatus");
  const fileInput = document.getElementById("petPhoto");
  const fileName = document.getElementById("fileName");
  const submitButton = document.getElementById("submitParticipation");
  const lightbox = document.getElementById("muralLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxTitle = document.getElementById("lightboxTitle");
  const lightboxMessage = document.getElementById("lightboxMessage");
  const lightboxAuthor = document.getElementById("lightboxAuthor");
  const lightboxClose = document.getElementById("lightboxClose");

  let items = [];
  let activeFilter = "todos";

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function petEmoji(tipo) {
    const t = normalize(tipo);
    if (t.includes("gato")) return "🐱";
    if (t.includes("cachorro") || t.includes("cao")) return "🐶";
    if (t.includes("coelho")) return "🐰";
    return "🐾";
  }

  function renderStats() {
    const dogs = items.filter(i => normalize(i.tipo).includes("cachorro") || normalize(i.tipo).includes("cao")).length;
    const cats = items.filter(i => normalize(i.tipo).includes("gato")).length;
    const others = Math.max(0, items.length - dogs - cats);
    totalEl.textContent = items.length;
    dogsEl.textContent = dogs;
    catsEl.textContent = cats;
    othersEl.textContent = others;
  }

  function filteredItems() {
    const term = normalize(search.value);
    return items.filter(item => {
      const type = normalize(item.tipo);
      const matchesFilter = activeFilter === "todos"
        || (activeFilter === "cachorros" && (type.includes("cachorro") || type.includes("cao")))
        || (activeFilter === "gatos" && type.includes("gato"))
        || (activeFilter === "outros" && !type.includes("gato") && !type.includes("cachorro") && !type.includes("cao"));
      const haystack = normalize(`${item.pet} ${item.nome} ${item.mensagem}`);
      return matchesFilter && haystack.includes(term);
    });
  }

  function render() {
    const visible = filteredItems();
    grid.innerHTML = "";
    empty.hidden = visible.length !== 0;

    visible.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "mural-card";
      card.style.setProperty("--delay", `${Math.min(index * 45, 350)}ms`);
      card.innerHTML = `
        <button class="mural-photo" type="button" aria-label="Abrir foto de ${escapeHtml(item.pet)}">
          <img src="${escapeHtml(item.foto)}" alt="Foto de ${escapeHtml(item.pet)}" loading="lazy">
          <span class="mural-photo-badge">${petEmoji(item.tipo)}</span>
          <span class="mural-expand" aria-hidden="true">↗</span>
        </button>
        <div class="mural-card-body">
          <div class="mural-meta">
            <span>${escapeHtml(item.tipo || "Pet")}</span>
            <span>Outubro Rosa Pet</span>
          </div>
          <h3>${escapeHtml(item.pet || "Meu pet")}</h3>
          <p>“${escapeHtml(item.mensagem || "Uma história de carinho e cuidado.") }”</p>
          <strong>${escapeHtml(item.nome || "Participante")}</strong>
        </div>
      `;
      card.querySelector(".mural-photo").addEventListener("click", () => openLightbox(item));
      grid.appendChild(card);
    });
  }

  function openLightbox(item) {
    lightboxImage.src = item.foto;
    lightboxImage.alt = `Foto de ${item.pet || "pet"}`;
    lightboxTitle.textContent = `${petEmoji(item.tipo)} ${item.pet || "Meu pet"}`;
    lightboxMessage.textContent = `“${item.mensagem || "Uma história de carinho e cuidado."}”`;
    lightboxAuthor.textContent = item.nome ? `Por ${item.nome}` : "Participação da campanha";
    lightbox.hidden = false;
    document.body.classList.add("modal-open");
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.body.classList.remove("modal-open");
  }

  function loadMural() {
    if (!apiUrl || apiUrl.startsWith("COLE_AQUI")) {
      loading.hidden = true;
      empty.hidden = false;
      empty.innerHTML = `
        <div class="mural-empty-icon">💗</div>
        <h3>O mural está sendo preparado</h3>
        <p>Configure a URL do Google Apps Script em <strong>config.js</strong> para carregar as participações.</p>
      `;
      return;
    }

    const callback = `muralCallback_${Date.now()}`;
    window[callback] = data => {
      delete window[callback];
      script.remove();
      loading.hidden = true;
      if (!data || !data.ok) {
        empty.hidden = false;
        empty.innerHTML = `<div class="mural-empty-icon">🌸</div><h3>Não foi possível carregar o mural</h3><p>Tente novamente em alguns instantes.</p>`;
        return;
      }
      items = Array.isArray(data.items) ? data.items : [];
      renderStats();
      render();
    };

    const script = document.createElement("script");
    script.src = `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}action=list&callback=${callback}`;
    script.onerror = () => {
      delete window[callback];
      script.remove();
      loading.hidden = true;
      empty.hidden = false;
      empty.innerHTML = `<div class="mural-empty-icon">🌸</div><h3>Não foi possível carregar o mural</h3><p>Verifique a publicação do Google Apps Script.</p>`;
    };
    document.head.appendChild(script);
  }

  function showStatus(message, type = "info") {
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
    formStatus.hidden = false;
  }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function submitViaHiddenForm(payload) {
    return new Promise((resolve) => {
      const frameName = `submitFrame_${Date.now()}`;
      const iframe = document.createElement("iframe");
      iframe.name = frameName;
      iframe.className = "hidden-submit-frame";
      document.body.appendChild(iframe);

      const formEl = document.createElement("form");
      formEl.method = "POST";
      formEl.action = apiUrl;
      formEl.target = frameName;
      formEl.style.display = "none";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(payload);
      formEl.appendChild(input);
      document.body.appendChild(formEl);
      formEl.submit();

      setTimeout(() => {
        formEl.remove();
        iframe.remove();
        resolve();
      }, 1800);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!apiUrl || apiUrl.startsWith("COLE_AQUI")) {
      showStatus("Configure primeiro a URL do Google Apps Script em config.js.", "error");
      return;
    }

    const file = fileInput.files[0];
    if (!file) {
      showStatus("Escolha uma foto para participar do mural.", "error");
      fileInput.focus();
      return;
    }

    if (!file.type.startsWith("image/")) {
      showStatus("Envie somente uma imagem.", "error");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showStatus("A foto deve ter no máximo 8 MB.", "error");
      return;
    }

    if (!document.getElementById("consent").checked) {
      showStatus("É necessário autorizar a publicação para participar do mural.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Enviando...";
    showStatus("Estamos enviando sua participação. Aguarde um instante.", "info");

    try {
      const payload = {
        nome: document.getElementById("participantName").value.trim(),
        pet: document.getElementById("petName").value.trim(),
        tipo: document.getElementById("petType").value,
        mensagem: document.getElementById("petMessage").value.trim(),
        consentimento: true,
        fileName: file.name,
        mimeType: file.type,
        base64: await fileToBase64(file)
      };

      await submitViaHiddenForm(payload);
      form.reset();
      fileName.textContent = "Nenhuma foto selecionada";
      showStatus("💗 Participação enviada! Ela ficará aguardando aprovação antes de aparecer no mural.", "success");
    } catch (error) {
      console.error(error);
      showStatus("Não foi possível enviar agora. Tente novamente.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Enviar para o mural";
    }
  }

  filters.forEach(button => {
    button.addEventListener("click", () => {
      filters.forEach(item => item.classList.remove("is-active"));
      button.classList.add("is-active");
      activeFilter = button.dataset.muralFilter;
      render();
    });
  });

  search.addEventListener("input", render);
  fileInput.addEventListener("change", () => {
    fileName.textContent = fileInput.files[0] ? fileInput.files[0].name : "Nenhuma foto selecionada";
  });
  form.addEventListener("submit", handleSubmit);
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  loadMural();
})();
