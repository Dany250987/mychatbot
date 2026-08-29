function documentT(key, fallback) {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.t === "function"
  ) {
    return window.DANYBOT_I18N.t(key);
  }

  return fallback;
}

function getDocumentsLocale() {
  if (
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
  ) {
    return window.DANYBOT_I18N.getLanguage() === "en"
      ? "en-US"
      : "es-CO";
  }

  return "es-CO";
}

function getDocumentResponseText(data, key, fallback) {
  const language =
    window.DANYBOT_I18N &&
    typeof window.DANYBOT_I18N.getLanguage === "function"
      ? window.DANYBOT_I18N.getLanguage()
      : "es";

  if (language === "en") {
    return documentT(key, fallback);
  }

  return (
    data?.mensaje ||
    data?.error ||
    documentT(key, fallback)
  );
}

// =====================================================
// DANYBOT - DOCUMENTOS PERSONALES
// Lógica base compartida
// =====================================================

const DOCUMENTS_API_URL = '/api/documents';

let currentDocuments = [];
let filteredDocuments = [];
let editingDocumentId = null;


// =====================================================
// ELEMENTOS DEL DOM
// =====================================================

const documentsList =
  document.getElementById('documentsList');

const documentsCount =
  document.getElementById('documentsCount');

const documentsSearchInput =
  document.getElementById('documentsSearchInput');

const openDocumentModalButton =
  document.getElementById('openDocumentModalButton');

const documentModal =
  document.getElementById('documentModal');

const documentModalTitle =
  document.getElementById('documentModalTitle');

const documentForm =
  document.getElementById('documentForm');

const documentIdInput =
  document.getElementById('documentId');

const documentNameInput =
  document.getElementById('documentName');

const documentFileInput =
  document.getElementById('documentFile');

const documentFileName =
  document.getElementById('documentFileName');

const documentFormMessage =
  document.getElementById('documentFormMessage');

const saveDocumentButton =
  document.getElementById('saveDocumentButton');


// =====================================================
// SESIÓN Y AUTENTICACIÓN
// =====================================================

function getDocumentsAuthToken() {
  return localStorage.getItem('authToken');
}

function getDocumentsAuthHeaders() {
  const token = getDocumentsAuthToken();

  return {
    Authorization: `Bearer ${token}`
  };
}

async function handleDocumentsUnauthorizedSession(
  data = {}
) {
  localStorage.removeItem('userData');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');

  const message =
    data.error ||
    data.mensaje ||
    'Tu sesión venció o no es válida. Inicia sesión nuevamente.';

  await Swal.fire({
    title: documentT("documents.sessionExpired", "Sesión vencida"),
    text: message,
    icon: 'warning',
    confirmButtonColor: '#3c0000'
  });

  window.location.href = 'login_google.html';
}

function validateDocumentsSession() {
  const token = getDocumentsAuthToken();
  const userData = localStorage.getItem('userData');

  if (!token || !userData) {
    window.location.href = 'login_google.html';
    return false;
  }

  return true;
}


// =====================================================
// UTILIDADES
// =====================================================

function escapeDocumentHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeDocumentText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDocumentSize(bytes) {
  const size = Number(bytes || 0);

  if (!Number.isFinite(size) || size <= 0) {
    return '0 KB';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDocumentDate(dateValue) {
  if (!dateValue) {
    return 'Fecha no disponible';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    getDocumentsLocale(),
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  ).format(date);
}

function getDocumentIconClass(mimeType = '') {
  const normalizedMime =
    String(mimeType).toLowerCase();

  if (normalizedMime.includes('pdf')) {
    return 'fa-file-pdf';
  }

  if (normalizedMime.includes('image')) {
    return 'fa-file-image';
  }

  return 'fa-file';
}

function getDocumentTypeLabel(mimeType = '') {
  const normalizedMime =
    String(mimeType).toLowerCase();

  if (normalizedMime.includes('pdf')) {
    return 'PDF';
  }

  if (normalizedMime.includes('jpeg')) {
    return 'JPG';
  }

  if (normalizedMime.includes('png')) {
    return 'PNG';
  }

  if (normalizedMime.includes('webp')) {
    return 'WEBP';
  }

  return 'Archivo';
}

async function parseDocumentJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    console.error(
      'No se pudo interpretar la respuesta de Documentos:',
      error
    );

    return {};
  }
}

function isDocumentsMobileApp() {
  return (
    document.documentElement.classList.contains(
      'danybot-mobile-app'
    ) ||
    document.body.classList.contains(
      'danybot-mobile-app'
    )
  );
}


// =====================================================
// ENCABEZADO
// =====================================================

function renderDocumentsUserHeader() {
  const rawUserData =
    localStorage.getItem('userData');

  let user = null;

  try {
    user = rawUserData
      ? JSON.parse(rawUserData)
      : null;
  } catch (error) {
    console.error(
      'No se pudieron leer los datos del usuario:',
      error
    );
  }

  const avatar =
    document.getElementById('user-avatar');

  if (avatar && user?.picture) {
    avatar.src = user.picture;
    avatar.alt =
      `Avatar de ${user.name || 'usuario'}`;
    avatar.style.display = 'block';
  }

  updateDocumentsDateTime();
}

function updateDocumentsDateTime() {
  const dateTimeElement =
    document.getElementById('datetime');

  if (!dateTimeElement) {
    return;
  }

  const now = new Date();

  dateTimeElement.textContent =
    new Intl.DateTimeFormat(
      getDocumentsLocale(),
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    ).format(now);
}


// =====================================================
// MODAL
// =====================================================

function resetDocumentForm() {
  editingDocumentId = null;

  documentForm?.reset();

  if (documentIdInput) {
    documentIdInput.value = '';
  }

  if (documentModalTitle) {
    documentModalTitle.textContent =
      documentT("documents.addDocument", "Agregar documento");
  }

  if (documentFileName) {
    documentFileName.textContent =
      documentT("documents.noFileSelected", "Ningún archivo seleccionado");
  }

  if (documentFormMessage) {
    documentFormMessage.textContent = '';
  }

  if (documentFileInput) {
    documentFileInput.required = true;
  }

  if (saveDocumentButton) {
    saveDocumentButton.disabled = false;

    saveDocumentButton.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      ${documentT("documents.save", "Guardar")}
    `;
  }
}

function openDocumentModal() {
  if (!documentModal) {
    return;
  }

  documentModal.classList.add('is-open');
  documentModal.setAttribute(
    'aria-hidden',
    'false'
  );

  document.body.classList.add(
    'document-modal-open'
  );

  window.setTimeout(() => {
    documentNameInput?.focus();
  }, 80);
}

function closeDocumentModal() {
  if (!documentModal) {
    return;
  }

  documentModal.classList.remove('is-open');
  documentModal.setAttribute(
    'aria-hidden',
    'true'
  );

  document.body.classList.remove(
    'document-modal-open'
  );

  resetDocumentForm();
}

function openCreateDocumentModal() {
  resetDocumentForm();
  openDocumentModal();
}

function openEditDocumentModal(documentId) {
  const documentData =
    currentDocuments.find((item) => {
      return Number(item.id) ===
        Number(documentId);
    });

  if (!documentData) {
    return;
  }

  editingDocumentId =
    Number(documentData.id);

  if (documentIdInput) {
    documentIdInput.value =
      String(documentData.id);
  }

  if (documentNameInput) {
    documentNameInput.value =
      documentData.document_name || '';
  }

  if (documentModalTitle) {
    documentModalTitle.textContent =
      documentT("documents.editDocument", "Editar documento");
  }

  if (documentFileInput) {
    documentFileInput.required = false;
  }

  if (documentFileName) {
    documentFileName.textContent =
      `${documentT("documents.currentFile", "Archivo actual")}: ${
        documentData.file_name ||
        documentT("documents.savedDocument", "Documento guardado")
      }`;
  }

  openDocumentModal();
}

function getDocumentGlobalSearchTarget() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const type =
    params.get('type');

  const id =
    Number(
      params.get('id')
    );

  if (
    type !== 'document' ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return {
    type,
    id
  };
}


function focusDocumentGlobalSearchTarget() {
  const target =
    getDocumentGlobalSearchTarget();

  if (!target) {
    return;
  }

  const targetCard =
    documentsList?.querySelector(
      `[data-document-id="${target.id}"]`
    );

  if (!targetCard) {
    return;
  }

  targetCard.classList.add(
    'document-search-target'
  );

  window.requestAnimationFrame(() => {
    targetCard.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  });

  window.setTimeout(() => {
    targetCard.classList.remove(
      'document-search-target'
    );
  }, 2600);


  /*
   * Consumimos el parámetro después
   * de localizar el documento.
   *
   * Así, si luego se recargan los
   * documentos por editar, eliminar,
   * etc., no vuelve a enfocar la card.
   */
  const url =
    new URL(
      window.location.href
    );

  url.searchParams.delete('type');
  url.searchParams.delete('id');

  const cleanUrl =
    `${url.pathname}${url.search}${url.hash}`;

  window.history.replaceState(
    {},
    '',
    cleanUrl
  );
}

// =====================================================
// CONSULTA Y RENDERIZADO
// =====================================================

async function loadDocuments() {
  if (!documentsList) {
    return;
  }

  documentsList.innerHTML = `
    <div class="documents-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>

      <p>
        ${documentT("documents.loading", "Cargando documentos...")}
      </p>
    </div>
  `;

  try {
    const response =
      await fetch(
        DOCUMENTS_API_URL,
        {
          headers:
            getDocumentsAuthHeaders()
        }
      );

    const data =
      await parseDocumentJsonResponse(
        response
      );

    if (response.status === 401) {
      await handleDocumentsUnauthorizedSession(
        data
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        getDocumentResponseText(data, "documents.loadFailedText", "No se pudieron consultar los documentos.")
      );
    }

    currentDocuments =
      Array.isArray(
        data.documents
      )
        ? data.documents
        : [];


    /*
     * Renderiza normalmente todos
     * los documentos.
     */
    applyDocumentsSearch();


    /*
     * Si llegamos desde el buscador
     * global, localizamos la card
     * después de haberla renderizado.
     */
    window.setTimeout(() => {
      focusDocumentGlobalSearchTarget();
    }, 80);

  } catch (error) {
    console.error(
      'Error al cargar documentos:',
      error
    );

    documentsList.innerHTML = `
      <div class="documents-empty-state">
        <i
          class="fa-solid fa-circle-exclamation"
        ></i>

        <h3>
          ${documentT("documents.loadErrorTitle", "No pudimos cargar tus documentos")}
        </h3>

        <p>
          ${documentT("documents.loadErrorText", "Revisa tu conexión e inténtalo nuevamente.")}
        </p>

        <button
          type="button"
          class="documents-primary-button"
          id="retryDocumentsButton"
        >
          Reintentar
        </button>
      </div>
    `;

    document
      .getElementById(
        'retryDocumentsButton'
      )
      ?.addEventListener(
        'click',
        loadDocuments
      );
  }
}

function applyDocumentsSearch() {
  const searchValue =
    normalizeDocumentText(
      documentsSearchInput?.value
    );

  filteredDocuments =
    currentDocuments.filter(
      (documentData) => {
        const searchableText =
          normalizeDocumentText(
            [
              documentData.document_name,
              documentData.file_name,
              getDocumentTypeLabel(
                documentData.file_mime_type
              )
            ].join(' ')
          );

        return searchableText.includes(
          searchValue
        );
      }
    );

  renderDocumentsList();
}

function updateDocumentsCount() {
  if (!documentsCount) {
    return;
  }

  const total =
    filteredDocuments.length;

  documentsCount.textContent =
    total === 1
      ? documentT(
          "documents.oneDocument",
          "1 documento"
        )
      : `${total} ${documentT(
          "documents.documentsSuffix",
          "documentos"
        )}`;
}

function renderDocumentsList() {
  if (!documentsList) {
    return;
  }

  updateDocumentsCount();

  if (filteredDocuments.length === 0) {
    const hasSearch =
      Boolean(
        documentsSearchInput?.value.trim()
      );

    documentsList.innerHTML = `
      <div class="documents-empty-state">
        <i class="fa-solid ${
          hasSearch
            ? 'fa-magnifying-glass'
            : 'fa-folder-open'
        }"></i>

        <h3>
          ${
            hasSearch
              ? documentT("documents.noMatchesTitle", "No encontramos coincidencias")
              : documentT("documents.noDocumentsTitle", "Aún no tienes documentos")
          }
        </h3>

        <p>
          ${
            hasSearch
              ? documentT("documents.tryAnotherName", "Prueba con otro nombre.")
              : documentT("documents.addFirstDocument", "Agrega tu primer documento personal.")
          }
        </p>

        ${
          hasSearch
            ? ''
            : `
              <button
                type="button"
                class="documents-primary-button"
                id="emptyAddDocumentButton"
              >
                <i class="fa-solid fa-plus"></i>
                ${documentT("documents.addDocument", "Agregar documento")}
              </button>
            `
        }
      </div>
    `;

    document
      .getElementById(
        'emptyAddDocumentButton'
      )
      ?.addEventListener(
        'click',
        openCreateDocumentModal
      );

    return;
  }

  documentsList.innerHTML = '';

  filteredDocuments.forEach(
    (documentData) => {
      documentsList.appendChild(
        createDocumentCard(documentData)
      );
    }
  );
}

function createDocumentCard(documentData) {
  const card =
    document.createElement('article');

  card.className = 'document-card';
  card.dataset.documentId =
    String(documentData.id);

  const safeDocumentName =
    escapeDocumentHtml(
      documentData.document_name ||
      documentT("documents.unnamedDocument", "Documento sin nombre")
    );

  const safeFileName =
    escapeDocumentHtml(
      documentData.file_name ||
      'Archivo'
    );

  const iconClass =
    getDocumentIconClass(
      documentData.file_mime_type
    );

  const typeLabel =
    escapeDocumentHtml(
      getDocumentTypeLabel(
        documentData.file_mime_type
      )
    );

  const sizeLabel =
    formatDocumentSize(
      documentData.file_size_bytes
    );

  const dateLabel =
    formatDocumentDate(
      documentData.updated_at ||
      documentData.created_at
    );

  card.innerHTML = `
    <div class="document-card-top">

      <span class="document-card-icon">
        <i class="fa-solid ${iconClass}"></i>
      </span>

      <div class="document-card-heading">
        <h3 title="${safeDocumentName}">
          ${safeDocumentName}
        </h3>

        <p title="${safeFileName}">
          ${safeFileName}
        </p>
      </div>

    </div>

    <div class="document-card-meta">

      <span>
        <i class="fa-solid fa-file"></i>
        ${typeLabel}
      </span>

      <span>
        <i class="fa-solid fa-database"></i>
        ${sizeLabel}
      </span>

      <span>
        <i class="fa-regular fa-calendar"></i>
        ${dateLabel}
      </span>

    </div>

    <div class="document-card-actions">

      <button
        type="button"
        class="document-action-button"
        data-document-action="view"
        aria-label="${documentT("documents.viewDocument", "Ver documento")}"
        title="${documentT("documents.view", "Ver")}"
      >
        <i class="fa-solid fa-eye"></i>
        <span>${documentT("documents.view", "Ver")}</span>
      </button>

      <button
        type="button"
        class="document-action-button"
        data-document-action="download"
        aria-label="${documentT("documents.downloadDocument", "Descargar documento")}"
        title="${documentT("documents.download", "Descargar")}"
      >
        <i class="fa-solid fa-download"></i>
        <span>${documentT("documents.download", "Descargar")}</span>
      </button>

      <button
        type="button"
        class="document-action-button"
        data-document-action="share"
        aria-label="${documentT("documents.shareDocument", "Compartir documento")}"
        title="${documentT("documents.share", "Compartir")}"
      >
        <i class="fa-solid fa-share-nodes"></i>
        <span>${documentT("documents.share", "Compartir")}</span>
      </button>

      <button
        type="button"
        class="document-action-button"
        data-document-action="edit"
        aria-label="${documentT("documents.editDocumentAction", "Editar documento")}"
        title="${documentT("documents.edit", "Editar")}"
      >
        <i class="fa-solid fa-pen"></i>
        <span>${documentT("documents.edit", "Editar")}</span>
      </button>

      <button
        type="button"
        class="document-action-button is-danger"
        data-document-action="delete"
        aria-label="${documentT("documents.deleteDocumentAction", "Eliminar documento")}"
        title="${documentT("documents.delete", "Eliminar")}"
      >
        <i class="fa-solid fa-trash-can"></i>
        <span>${documentT("documents.delete", "Eliminar")}</span>
      </button>

    </div>
  `;

  card.addEventListener(
    'click',
    async (event) => {
      const actionButton =
        event.target.closest(
          '[data-document-action]'
        );

      if (!actionButton) {
        return;
      }

      const action =
        actionButton.dataset.documentAction;

      await handleDocumentAction(
        action,
        documentData
      );
    }
  );

  return card;
}


// =====================================================
// GUARDAR Y EDITAR
// =====================================================

function validateDocumentFile(file) {
  if (!file) {
    return true;
  }

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    Swal.fire({
      title: documentT("documents.fileNotAllowedTitle", "Archivo no permitido"),
      text:
        documentT("documents.fileNotAllowedText", "Solo puedes cargar PDF, JPG, PNG o WEBP."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return false;
  }

  const maximumSize =
    5 * 1024 * 1024;

  if (file.size > maximumSize) {
    Swal.fire({
      title: documentT("documents.fileTooLargeTitle", "Archivo demasiado grande"),
      text:
        documentT("documents.fileTooLargeText", "El documento no puede superar los 5 MB."),
      icon: 'warning',
      confirmButtonColor: '#3c0000'
    });

    return false;
  }

  return true;
}

async function saveDocument(event) {
  event.preventDefault();

  const documentName =
    documentNameInput?.value.trim();

  const selectedFile =
    documentFileInput?.files?.[0] ||
    null;

  if (!documentName) {
    documentFormMessage.textContent =
      documentT("documents.enterDocumentName", "Escribe el nombre del documento.");

    documentNameInput?.focus();
    return;
  }

  if (
    !editingDocumentId &&
    !selectedFile
  ) {
    documentFormMessage.textContent =
      documentT("documents.selectAFile", "Selecciona un archivo.");

    return;
  }

  if (
    selectedFile &&
    !validateDocumentFile(selectedFile)
  ) {
    return;
  }

  const formData = new FormData();

  formData.append(
    'document_name',
    documentName
  );

  if (selectedFile) {
    formData.append(
      'file',
      selectedFile
    );
  }

  const url = editingDocumentId
    ? `${DOCUMENTS_API_URL}/${editingDocumentId}`
    : DOCUMENTS_API_URL;

  const method = editingDocumentId
    ? 'PUT'
    : 'POST';

  saveDocumentButton.disabled = true;

  saveDocumentButton.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    ${documentT("documents.saving", "Guardando")}
  `;

  documentFormMessage.textContent = '';

  try {
    const response = await fetch(
      url,
      {
        method,
        headers:
          getDocumentsAuthHeaders(),
        body: formData
      }
    );

    const data =
      await parseDocumentJsonResponse(
        response
      );

    if (response.status === 401) {
      await handleDocumentsUnauthorizedSession(
        data
      );
      return;
    }

    if (!response.ok) {
      throw new Error(
        getDocumentResponseText(data, "documents.saveFailedText", "No se pudo guardar el documento.")
      );
    }

    if (
      !editingDocumentId &&
      window.DANYBOT_ADS &&
      typeof window.DANYBOT_ADS.registerCreation === "function"
    ) {
      window.DANYBOT_ADS.registerCreation();
    }

    closeDocumentModal();

    await loadDocuments();

    await Swal.fire({
      title: editingDocumentId
        ? documentT("documents.updatedTitle", "Documento actualizado")
        : documentT("documents.savedTitle", "Documento guardado"),
      text: editingDocumentId
        ? getDocumentResponseText(
            data,
            "documents.updatedText",
            "El documento fue actualizado correctamente."
          )
        : getDocumentResponseText(
            data,
            "documents.savedText",
            "El documento fue guardado correctamente."
          ),
      icon: 'success',
      timer: 1700,
      showConfirmButton: false
    });

  } catch (error) {
    console.error(
      'Error al guardar documento:',
      error
    );

    documentFormMessage.textContent =
      error.message || documentT("documents.saveFailedText", "No se pudo guardar el documento.");

  } finally {
    saveDocumentButton.disabled = false;

    saveDocumentButton.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      ${documentT("documents.save", "Guardar")}
    `;
  }
}


// =====================================================
// ARCHIVOS
// =====================================================

async function fetchDocumentFile(
  documentData
) {
  const response = await fetch(
    `${DOCUMENTS_API_URL}/${documentData.id}/file`,
    {
      headers: getDocumentsAuthHeaders()
    }
  );

  if (response.status === 401) {
    const data =
      await parseDocumentJsonResponse(
        response
      );

    await handleDocumentsUnauthorizedSession(
      data
    );

    return null;
  }

  if (!response.ok) {
    const data =
      await parseDocumentJsonResponse(
        response
      );

    throw new Error(
      getDocumentResponseText(data, "documents.retrieveFileFailedText", "No se pudo recuperar el archivo.")
    );
  }

  return response.blob();
}

async function viewDocument(documentData) {
  try {
    const blob =
      await fetchDocumentFile(
        documentData
      );

    if (!blob) {
      return;
    }

    if (
      isDocumentsMobileApp() &&
      typeof window.openDocumentInMobileApp ===
        'function'
    ) {
      await window.openDocumentInMobileApp(
        documentData,
        blob
      );

      return;
    }

    const fileUrl =
      URL.createObjectURL(blob);

    const newWindow =
      window.open(
        fileUrl,
        '_blank',
        'noopener,noreferrer'
      );

    if (!newWindow) {
      throw new Error(
        'El navegador bloqueó la apertura del archivo.'
      );
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(fileUrl);
    }, 60000);

  } catch (error) {
    console.error(
      'Error al abrir documento:',
      error
    );

    await Swal.fire({
      title: documentT("documents.openFailedTitle", "No se pudo abrir"),
      text: error.message,
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

async function downloadDocument(
  documentData
) {
  try {
    const blob =
      await fetchDocumentFile(
        documentData
      );

    if (!blob) {
      return;
    }

    if (
      isDocumentsMobileApp() &&
      typeof window.downloadDocumentInMobileApp ===
        'function'
    ) {
      await window.downloadDocumentInMobileApp(
        documentData,
        blob
      );

      return;
    }

    const fileUrl =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = fileUrl;
    link.download =
      documentData.file_name ||
      `${documentData.document_name || 'documento'}`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(fileUrl);
    }, 1000);

  } catch (error) {
    console.error(
      'Error al descargar documento:',
      error
    );

    await Swal.fire({
      title: documentT("documents.downloadFailedTitle", "No se pudo descargar"),
      text: error.message,
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}

async function shareDocument(
  documentData
) {
  try {
    const blob =
      await fetchDocumentFile(
        documentData
      );

    if (!blob) {
      return;
    }

    if (
      isDocumentsMobileApp() &&
      typeof window.shareDocumentInMobileApp ===
        'function'
    ) {
      await window.shareDocumentInMobileApp(
        documentData,
        blob
      );

      return;
    }

    const file = new File(
      [blob],
      documentData.file_name ||
      'documento',
      {
        type:
          documentData.file_mime_type ||
          blob.type ||
          'application/octet-stream'
      }
    );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [file]
      })
    ) {
      await navigator.share({
        title:
          documentData.document_name,
        text:
          documentT("documents.sharedFromDanybot", "Documento compartido desde DANYBOT"),
        files: [file]
      });

      return;
    }

    await Swal.fire({
      title: documentT("documents.shareFromWebTitle", "Compartir desde la web"),
      text:
        documentT("documents.shareFromWebText", "Tu navegador no permite compartir archivos directamente. Puedes descargarlo y adjuntarlo manualmente."),
      icon: 'info',
      confirmButtonColor: '#3c0000'
    });

  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }

    console.error(
      'Error al compartir documento:',
      error
    );

    await Swal.fire({
      title: documentT("documents.shareFailedTitle", "No se pudo compartir"),
      text:
        error.message ||
        documentT("documents.shareFailedText", "No fue posible compartir el documento."),
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}


// =====================================================
// ELIMINAR
// =====================================================

async function deleteDocument(
  documentData
) {
  const result = await Swal.fire({
    title: documentT("documents.deleteTitle", "Eliminar documento"),
    html: `
      <p>
        ${documentT("documents.deletePrefix", "Se eliminará")}
        <strong>
          ${escapeDocumentHtml(
            documentData.document_name
          )}
        </strong>
        de forma permanente.
      </p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: documentT("documents.delete", "Eliminar"),
    cancelButtonText: documentT("documents.cancel", "Cancelar"),
    confirmButtonColor: '#960018',
    cancelButtonColor: '#6b7280',
    reverseButtons: true
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${DOCUMENTS_API_URL}/${documentData.id}`,
      {
        method: 'DELETE',
        headers:
          getDocumentsAuthHeaders()
      }
    );

    const data =
      await parseDocumentJsonResponse(
        response
      );

    if (response.status === 401) {
      await handleDocumentsUnauthorizedSession(
        data
      );
      return;
    }

    if (!response.ok) {
      throw new Error(
        getDocumentResponseText(data, "documents.deleteFailedText", "No se pudo eliminar el documento.")
      );
    }

    await loadDocuments();

    await Swal.fire({
      title: documentT("documents.deletedTitle", "Documento eliminado"),
      text: getDocumentResponseText(
        data,
        "documents.deletedText",
        "El documento fue eliminado correctamente."
      ),
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });

  } catch (error) {
    console.error(
      'Error al eliminar documento:',
      error
    );

    await Swal.fire({
      title: documentT("documents.deleteFailedTitle", "No se pudo eliminar"),
      text: error.message,
      icon: 'error',
      confirmButtonColor: '#3c0000'
    });
  }
}


// =====================================================
// ACCIONES
// =====================================================

async function handleDocumentAction(
  action,
  documentData
) {
  if (action === 'view') {
    await viewDocument(documentData);
    return;
  }

  if (action === 'download') {
    await downloadDocument(documentData);
    return;
  }

  if (action === 'share') {
    await shareDocument(documentData);
    return;
  }

  if (action === 'edit') {
    openEditDocumentModal(
      documentData.id
    );
    return;
  }

  if (action === 'delete') {
    await deleteDocument(documentData);
  }
}


// =====================================================
// EVENTOS
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {
    if (!validateDocumentsSession()) {
      return;
    }

    renderDocumentsUserHeader();

    openDocumentModalButton
      ?.addEventListener(
        'click',
        openCreateDocumentModal
      );

    documentForm
      ?.addEventListener(
        'submit',
        saveDocument
      );

    documentFileInput
      ?.addEventListener(
        'change',
        () => {
          const selectedFile =
            documentFileInput.files?.[0];

          if (!selectedFile) {
            documentFileName.textContent =
              editingDocumentId
                ? documentT("documents.keepCurrentFile", "Conservar archivo actual")
                : documentT("documents.noFileSelected", "Ningún archivo seleccionado");

            return;
          }

          if (
            !validateDocumentFile(
              selectedFile
            )
          ) {
            documentFileInput.value = '';

            documentFileName.textContent =
              documentT("documents.noFileSelected", "Ningún archivo seleccionado");

            return;
          }

          documentFileName.textContent =
            `${selectedFile.name} · ${
              formatDocumentSize(
                selectedFile.size
              )
            }`;
        }
      );

    documentsSearchInput
      ?.addEventListener(
        'input',
        applyDocumentsSearch
      );

    document
      .querySelectorAll(
        '[data-close-document-modal]'
      )
      .forEach((button) => {
        button.addEventListener(
          'click',
          closeDocumentModal
        );
      });

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Escape' &&
          documentModal?.classList.contains(
            'is-open'
          )
        ) {
          closeDocumentModal();
        }
      }
    );

    loadDocuments();
  }
);