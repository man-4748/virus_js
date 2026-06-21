import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure safe workspace directory
const WORKSPACE_DIR = path.resolve(__dirname, 'workspace');

// Initialize the workspace folder
async function ensureWorkspaceExists() {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    // Add a default sample file if workspace is empty
    const files = await fs.readdir(WORKSPACE_DIR);
    if (files.length === 0) {
      await fs.writeFile(
        path.join(WORKSPACE_DIR, 'welcome.js'),
        `// Welcome to the Developer Workspace!\n// You can perform safe CRUD operations on JS/CSS/HTML code files here.\n\nconsole.log("Hello from Antigravity Developer Tool!");\n`
      );
      await fs.writeFile(
        path.join(WORKSPACE_DIR, 'helper.css'),
        `/* Sample stylesheet in workspace */\nbody {\n  background: #0d0e15;\n  color: #f1f1f1;\n}\n`
      );
    }
  } catch (error) {
    console.error('Failed to initialize workspace directory:', error);
  }
}

// Security Helper: Resolve paths and guard against Directory Traversal attacks
function safeResolvePath(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name.');
  }
  // Remove any leading/trailing slashes and normalize
  const cleanName = path.normalize(fileName).replace(/^(\.\.[\/\\])+/, '');
  const resolved = path.resolve(WORKSPACE_DIR, cleanName);

  if (!resolved.startsWith(WORKSPACE_DIR)) {
    throw new Error('Access denied: Out of workspace bounds.');
  }
  return resolved;
}

// 1. API Endpoint: System Info
app.get('/api/system-info', (req, res) => {
  try {
    // Whitelist environment variables to prevent sensitive leak
    const safeEnvKeys = [
      'PATH', 'OS', 'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS',
      'USERDOMAIN', 'USERNAME', 'USERPROFILE', 'LANG', 'SHELL',
      'NODE_ENV', 'APPDATA', 'LOCALAPPDATA', 'COMPUTERNAME'
    ];
    const envData = {};
    safeEnvKeys.forEach(key => {
      if (process.env[key]) {
        envData[key] = process.env[key];
      }
    });

    const cpuInfo = os.cpus();
    const systemInfo = {
      os: {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        uptime: os.uptime(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
      cpu: {
        model: cpuInfo[0]?.model || 'Unknown',
        speed: cpuInfo[0]?.speed || 0,
        cores: cpuInfo.length,
      },
      hostname: os.hostname(),
      nodeVersion: process.version,
      homeDir: os.homedir(),
      env: envData,
    };

    res.json({ success: true, data: systemInfo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API Endpoint: CRUD - Read/List all files
app.get('/api/files', async (req, res) => {
  try {
    await ensureWorkspaceExists();
    const fileNames = await fs.readdir(WORKSPACE_DIR);
    const files = await Promise.all(
      fileNames.map(async (name) => {
        const filePath = path.join(WORKSPACE_DIR, name);
        const stats = await fs.stat(filePath);
        return {
          name,
          size: stats.size,
          mtime: stats.mtime,
          isDir: stats.isDirectory()
        };
      })
    );
    // Filter to code files or regular files, ignoring subfolders for simplicity
    const regularFiles = files.filter(f => !f.isDir);
    res.json({ success: true, data: regularFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. API Endpoint: CRUD - Read single file content
app.get('/api/files/:filename', async (req, res) => {
  try {
    const filePath = safeResolvePath(req.params.filename);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// 4. API Endpoint: CRUD - Create new file
app.post('/api/files', async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    const filePath = safeResolvePath(filename);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      return res.status(400).json({ success: false, error: 'File already exists.' });
    } catch {
      // File doesn't exist, proceed to create
    }

    await fs.writeFile(filePath, content || '', 'utf-8');
    res.json({ success: true, message: 'File created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. API Endpoint: CRUD - Update existing file
app.put('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const { content } = req.body;
    const filePath = safeResolvePath(filename);

    // Verify it exists first
    await fs.access(filePath);
    await fs.writeFile(filePath, content || '', 'utf-8');
    res.json({ success: true, message: 'File updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. API Endpoint: CRUD - Delete file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = safeResolvePath(filename);

    await fs.access(filePath);
    await fs.unlink(filePath);
    res.json({ success: true, message: 'File deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start the server
ensureWorkspaceExists().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
