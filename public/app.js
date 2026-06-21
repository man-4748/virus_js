// Frontend controller for Developer Dashboard

let state = {
  systemInfo: null,
  files: [],
  activeFile: null, // { name, content }
  originalContent: ''
};

// DOM Elements
const elSpecOs = document.getElementById('spec-os');
const elSpecPlatform = document.getElementById('spec-platform');
const elSpecArch = document.getElementById('spec-arch');
const elSpecHost = document.getElementById('spec-host');
const elSpecNode = document.getElementById('spec-node');
const elSpecHome = document.getElementById('spec-home');

const elMemoryPercent = document.getElementById('memory-percent');
const elMemoryFill = document.getElementById('memory-fill');
const elMemoryFree = document.getElementById('memory-free');
const elMemoryTotal = document.getElementById('memory-total');

const elEnvTableBody = document.getElementById('env-table-body');
const elEnvSearch = document.getElementById('env-search');

const elFileListUl = document.getElementById('file-list-ul');
const elActiveFilename = document.getElementById('active-filename');
const elCodeTextarea = document.getElementById('code-textarea');
const elDirtyIndicator = document.getElementById('editor-dirty-indicator');

const elBtnNew = document.getElementById('btn-new');
const elBtnSave = document.getElementById('btn-save');
const elBtnDelete = document.getElementById('btn-delete');

// Modal Elements
const elNewFileModal = document.getElementById('new-file-modal');
const elNewFilenameInput = document.getElementById('new-filename-input');
const elBtnModalCreate = document.getElementById('btn-modal-create');
const elBtnModalCancel = document.getElementById('btn-modal-cancel');

// Helpers
function formatBytesToGb(bytes) {
  if (!bytes) return '0 GB';
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}

// 1. Fetch & Render System Information
async function fetchSystemInfo() {
  try {
    const res = await fetch('/api/system-info');
    const json = await res.json();
    if (json.success) {
      state.systemInfo = json.data;
      renderSystemSpecs(json.data);
    } else {
      console.error('API Error:', json.error);
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

function renderSystemSpecs(data) {
  elSpecOs.textContent = `${data.os.type}`;
  elSpecPlatform.textContent = `${data.os.platform} (${data.os.release})`;
  elSpecArch.textContent = `${data.os.arch} (${data.cpu.cores} Cores @ ${data.cpu.speed}MHz)`;
  elSpecHost.textContent = data.hostname;
  elSpecNode.textContent = data.nodeVersion;
  elSpecHome.textContent = data.homeDir;

  // Memory usage calculation
  const total = data.os.totalMemory;
  const free = data.os.freeMemory;
  const used = total - free;
  const percent = total > 0 ? Math.round((used / total) * 100) : 0;

  elMemoryPercent.textContent = `${percent}%`;
  elMemoryFill.style.width = `${percent}%`;
  elMemoryFree.textContent = `Free: ${formatBytesToGb(free)}`;
  elMemoryTotal.textContent = `Total: ${formatBytesToGb(total)}`;

  // Update memory fill bar color based on usage
  if (percent > 85) {
    elMemoryFill.style.background = 'var(--danger-color)';
  } else if (percent > 65) {
    elMemoryFill.style.background = 'var(--warning-color)';
  } else {
    elMemoryFill.style.background = 'linear-gradient(90deg, var(--accent-color) 0%, #818cf8 100%)';
  }

  renderEnvTable(data.env);
}

// 2. Render Environment Variables Table
function renderEnvTable(env) {
  const query = elEnvSearch.value.toLowerCase().trim();
  elEnvTableBody.innerHTML = '';

  const keys = Object.keys(env).filter(key => key.toLowerCase().includes(query));

  if (keys.length === 0) {
    elEnvTableBody.innerHTML = `<tr><td colspan="2" class="empty-state">No matching environment variables found.</td></tr>`;
    return;
  }

  // Sort keys alphabetically
  keys.sort();

  keys.forEach(key => {
    const row = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.textContent = key;
    const tdVal = document.createElement('td');
    tdVal.textContent = env[key];
    row.appendChild(tdKey);
    row.appendChild(tdVal);
    elEnvTableBody.appendChild(row);
  });
}

// 3. Fetch & Render Workspace File List
async function fetchFiles() {
  try {
    const res = await fetch('/api/files');
    const json = await res.json();
    if (json.success) {
      state.files = json.data;
      renderFileList(json.data);
    } else {
      elFileListUl.innerHTML = `<li class="empty-state">Error: ${json.error}</li>`;
    }
  } catch (err) {
    elFileListUl.innerHTML = `<li class="empty-state">Failed to load workspace</li>`;
  }
}

function renderFileList(files) {
  elFileListUl.innerHTML = '';
  if (files.length === 0) {
    elFileListUl.innerHTML = '<li class="empty-state">Workspace is empty</li>';
    return;
  }

  files.forEach(file => {
    const li = document.createElement('li');
    li.className = `file-item ${state.activeFile?.name === file.name ? 'active' : ''}`;
    
    // File icon based on extension
    let icon = '📄';
    if (file.name.endsWith('.js')) icon = '🟨';
    else if (file.name.endsWith('.css')) icon = '🟦';
    else if (file.name.endsWith('.html')) icon = '🟥';
    else if (file.name.endsWith('.json')) icon = '⚙️';

    li.innerHTML = `
      <div class="file-meta-info">
        <span class="file-icon">${icon}</span>
        <span class="file-name" title="${file.name}">${file.name}</span>
      </div>
      <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
    `;

    li.addEventListener('click', () => {
      // Prevent losing unsaved changes
      if (isDirty()) {
        if (!confirm('You have unsaved changes. Discard them?')) return;
      }
      selectFile(file.name);
    });

    elFileListUl.appendChild(li);
  });
}

// 4. Select and Read a File
async function selectFile(filename) {
  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`);
    const json = await res.json();
    if (json.success) {
      state.activeFile = { name: filename, content: json.content };
      state.originalContent = json.content;
      
      elActiveFilename.textContent = filename;
      elCodeTextarea.value = json.content;
      elCodeTextarea.disabled = false;
      elBtnSave.disabled = true;
      elBtnDelete.disabled = false;
      elDirtyIndicator.classList.add('hidden');
      
      // Update sidebar active class
      document.querySelectorAll('.file-item').forEach(item => {
        const nameSpan = item.querySelector('.file-name');
        if (nameSpan && nameSpan.textContent === filename) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    } else {
      alert(`Failed to load file: ${json.error}`);
    }
  } catch (err) {
    alert(`Error loading file: ${err.message}`);
  }
}

// Check if active file has unsaved edits
function isDirty() {
  if (!state.activeFile) return false;
  return elCodeTextarea.value !== state.originalContent;
}

// 5. Save/Update File Content
async function saveFile() {
  if (!state.activeFile) return;
  const content = elCodeTextarea.value;
  const filename = state.activeFile.name;

  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const json = await res.json();
    if (json.success) {
      state.activeFile.content = content;
      state.originalContent = content;
      elBtnSave.disabled = true;
      elDirtyIndicator.classList.add('hidden');
      fetchFiles(); // Refresh file list sizes
    } else {
      alert(`Save failed: ${json.error}`);
    }
  } catch (err) {
    alert(`Error saving file: ${err.message}`);
  }
}

// 6. Delete File
async function deleteFile() {
  if (!state.activeFile) return;
  const filename = state.activeFile.name;
  if (!confirm(`Are you sure you want to permanently delete "${filename}"?`)) return;

  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) {
      state.activeFile = null;
      state.originalContent = '';
      elActiveFilename.textContent = 'No file selected';
      elCodeTextarea.value = '';
      elCodeTextarea.disabled = true;
      elBtnSave.disabled = true;
      elBtnDelete.disabled = true;
      elDirtyIndicator.classList.add('hidden');
      fetchFiles();
    } else {
      alert(`Delete failed: ${json.error}`);
    }
  } catch (err) {
    alert(`Error deleting file: ${err.message}`);
  }
}

// 7. Create New File
async function createNewFile(filename) {
  if (!filename) return;
  
  // Clean filename representation
  const cleanName = filename.trim();
  if (!cleanName) return;

  try {
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: cleanName, content: `// File: ${cleanName}\n\n` })
    });
    const json = await res.json();
    if (json.success) {
      elNewFileModal.classList.add('hidden');
      elNewFilenameInput.value = '';
      await fetchFiles();
      selectFile(cleanName);
    } else {
      alert(`Creation failed: ${json.error}`);
    }
  } catch (err) {
    alert(`Error creating file: ${err.message}`);
  }
}

// Event Listeners
elEnvSearch.addEventListener('input', () => {
  if (state.systemInfo) {
    renderEnvTable(state.systemInfo.env);
  }
});

elCodeTextarea.addEventListener('input', () => {
  if (state.activeFile) {
    const dirty = isDirty();
    elBtnSave.disabled = !dirty;
    if (dirty) {
      elDirtyIndicator.classList.remove('hidden');
    } else {
      elDirtyIndicator.classList.add('hidden');
    }
  }
});

// Save button click
elBtnSave.addEventListener('click', saveFile);

// Delete button click
elBtnDelete.addEventListener('click', deleteFile);

// Open new file modal
elBtnNew.addEventListener('click', () => {
  elNewFileModal.classList.remove('hidden');
  elNewFilenameInput.focus();
});

// Close new file modal
elBtnModalCancel.addEventListener('click', () => {
  elNewFileModal.classList.add('hidden');
  elNewFilenameInput.value = '';
});

// Confirm create file
elBtnModalCreate.addEventListener('click', () => {
  createNewFile(elNewFilenameInput.value);
});

elNewFilenameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    createNewFile(elNewFilenameInput.value);
  } else if (e.key === 'Escape') {
    elNewFileModal.classList.add('hidden');
    elNewFilenameInput.value = '';
  }
});

// Initial load
async function init() {
  await fetchSystemInfo();
  await fetchFiles();

  // Poll system info updates every 5 seconds to show live metrics
  setInterval(fetchSystemInfo, 5000);
}

window.addEventListener('DOMContentLoaded', init);
