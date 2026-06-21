import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001; // Run on port 3001 to avoid conflict

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const WORKSPACE_DIR = path.resolve(__dirname, 'workspace');

async function ensureWorkspaceExists() {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  } catch (error) {
    console.error(error);
  }
}

// 1. API Endpoint: System Info (MOCKED FOR MAC LAPTOP)
app.get('/api/system-info', (req, res) => {
  try {
    const systemInfo = {
      os: {
        type: 'Darwin',
        platform: 'darwin',
        release: '23.4.0',
        arch: 'arm64',
        uptime: 36820,
        totalMemory: 17179869184, // 16 GB
        freeMemory: 3221225472,  // 3 GB (approx 81% used)
      },
      cpu: {
        model: 'Apple M3 Max',
        speed: 4050,
        cores: 16,
      },
      hostname: 'MacBook-Pro-M3.local',
      nodeVersion: 'v20.11.0',
      homeDir: '/Users/macuser',
      env: {
        'PATH': '/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Users/macuser/.nvm/versions/node/v20.11.0/bin',
        'USER': 'macuser',
        'HOME': '/Users/macuser',
        'SHELL': '/bin/zsh',
        'LANG': 'en_US.UTF-8',
        'TERM': 'xterm-256color',
        'PWD': '/Users/macuser/Projects/Virus_JS',
        'NODE_ENV': 'development',
        'LOGNAME': 'macuser'
      },
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
    const regularFiles = files.filter(f => !f.isDir);
    res.json({ success: true, data: regularFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. API Endpoint: CRUD - Read single file content
app.get('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const cleanName = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.resolve(WORKSPACE_DIR, cleanName);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

ensureWorkspaceExists().then(() => {
  app.listen(PORT, () => {
    console.log(`MAC Mock Server running at http://localhost:${PORT}`);
  });
});
