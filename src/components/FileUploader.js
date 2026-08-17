export function createFileUploader({ onWhatsAppLoaded, onArrivalLoaded }) {
  const container = document.createElement('div');
  container.className = 'uploader-grid';

  container.innerHTML = `
    <!-- WhatsApp Upload Card -->
    <div class="upload-card" id="card-whatsapp">
      <div class="card-header">
        <div class="card-title-group">
          <div class="card-icon icon-whatsapp">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div>
            <h3>WhatsApp Chat Export</h3>
            <p>Upload <code>.txt</code> chat export file or paste chat text</p>
          </div>
        </div>
        <span class="status-badge badge-pending" id="badge-whatsapp">Pending Upload</span>
      </div>

      <div class="dropzone" id="dz-whatsapp">
        <input type="file" id="input-whatsapp" accept=".txt" style="display:none;" />
        <div class="dropzone-content">
          <svg class="dropzone-icon" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          <p class="dropzone-text"><strong>Click to browse</strong> or drag & drop WhatsApp <code>.txt</code> file here</p>
          <span class="file-name-display" id="name-whatsapp">No file chosen</span>
        </div>
      </div>

      <div class="paste-toggle-area">
        <button type="button" class="btn-link" id="btn-toggle-paste">or paste raw WhatsApp text</button>
        <div class="paste-box" id="paste-box-whatsapp" style="display:none;">
          <textarea id="textarea-whatsapp" placeholder="Paste WhatsApp chat export content here..."></textarea>
          <button type="button" class="btn btn-sm btn-primary" id="btn-apply-paste">Apply Pasted Text</button>
        </div>
      </div>
    </div>

    <!-- Arrival CSV Upload Card -->
    <div class="upload-card" id="card-arrival">
      <div class="card-header">
        <div class="card-title-group">
          <div class="card-icon icon-arrival">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h3>Arrival / Reservation File</h3>
            <p>Upload system <code>.csv</code> or Excel (<code>.xlsx</code>)</p>
          </div>
        </div>
        <span class="status-badge badge-pending" id="badge-arrival">Pending Upload</span>
      </div>

      <div class="dropzone" id="dz-arrival">
        <input type="file" id="input-arrival" accept=".csv,.xlsx,.xls" style="display:none;" />
        <div class="dropzone-content">
          <svg class="dropzone-icon" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          <p class="dropzone-text"><strong>Click to browse</strong> or drag & drop <code>reservations-data.csv</code></p>
          <span class="file-name-display" id="name-arrival">No file chosen</span>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers after DOM insertion
  setTimeout(() => {
    setupDropzone('dz-whatsapp', 'input-whatsapp', 'name-whatsapp', 'badge-whatsapp', async (file) => {
      const text = await file.text();
      onWhatsAppLoaded(text, file.name);
    });

    setupDropzone('dz-arrival', 'input-arrival', 'name-arrival', 'badge-arrival', async (file) => {
      onArrivalLoaded(file, file.name);
    });

    // Paste toggle
    const toggleBtn = document.getElementById('btn-toggle-paste');
    const pasteBox = document.getElementById('paste-box-whatsapp');
    const applyPasteBtn = document.getElementById('btn-apply-paste');
    const textarea = document.getElementById('textarea-whatsapp');

    toggleBtn?.addEventListener('click', () => {
      pasteBox.style.display = pasteBox.style.display === 'none' ? 'block' : 'none';
    });

    applyPasteBtn?.addEventListener('click', () => {
      const val = textarea.value.trim();
      if (val) {
        onWhatsAppLoaded(val, 'Pasted Text');
        document.getElementById('name-whatsapp').textContent = 'Pasted Text Content';
        const badge = document.getElementById('badge-whatsapp');
        badge.textContent = 'Loaded';
        badge.className = 'status-badge badge-success';
      }
    });
  }, 0);

  return container;
}

function setupDropzone(dzId, inputId, nameId, badgeId, handleFileFn) {
  const dz = document.getElementById(dzId);
  const input = document.getElementById(inputId);
  const nameDisp = document.getElementById(nameId);
  const badge = document.getElementById(badgeId);

  if (!dz || !input) return;

  dz.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      nameDisp.textContent = file.name;
      badge.textContent = 'Loaded';
      badge.className = 'status-badge badge-success';
      handleFileFn(file);
    }
  });

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('drag-over');
  });

  dz.addEventListener('dragleave', () => {
    dz.classList.remove('drag-over');
  });

  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      nameDisp.textContent = file.name;
      badge.textContent = 'Loaded';
      badge.className = 'status-badge badge-success';
      handleFileFn(file);
    }
  });
}
