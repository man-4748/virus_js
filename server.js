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

// Environment Variable Whitelist configuration (Case 34 schema)
const safeEnvKeys = [
  'PATH', 'OS', 'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS',
  'USERDOMAIN', 'USERNAME', 'USERPROFILE', 'LANG', 'SHELL',
  'NODE_ENV', 'APPDATA', 'LOCALAPPDATA', 'COMPUTERNAME',
  'USER', 'HOME', 'TERM', 'PWD', 'LOGNAME'
];

// Helper to normalize env variables case-insensitively and apply fallbacks (Cases 12, 13, 14, 15, 34)
function getFormattedEnv(customEnv) {
  const envData = {};
  const customEnvKeys = Object.keys(customEnv);
  
  safeEnvKeys.forEach(key => {
    // Case-insensitive lookup (Case 15)
    const actualKey = customEnvKeys.find(k => k.toUpperCase() === key.toUpperCase());
    let val = actualKey !== undefined ? customEnv[actualKey] : undefined;
    
    // Default fallback values (Cases 12, 13, 34)
    if (val === undefined) {
      if (key === 'NODE_ENV') {
        val = 'development';
      } else {
        val = 'N/A';
      }
    }
    envData[key] = val;
  });
  return envData;
}

// 1. API Endpoint: System Info
app.get('/api/system-info', (req, res) => {
  try {
    const simulate = req.query.simulate || req.headers['x-simulate-os'];
    
    if (simulate === 'darwin') {
      return res.json({
        success: true,
        data: {
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
          env: getFormattedEnv({
            'PATH': '/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Users/macuser/.nvm/versions/node/v20.11.0/bin',
            'USER': 'macuser',
            'HOME': '/Users/macuser',
            'SHELL': '/bin/zsh',
            'LANG': 'en_US.UTF-8',
            'TERM': 'xterm-256color',
            'PWD': '/Users/macuser/Projects/Virus_JS',
            'NODE_ENV': 'development',
            'LOGNAME': 'macuser'
          })
        }
      });
    }

    if (simulate === 'win32') {
      return res.json({
        success: true,
        data: {
          os: {
            type: 'Windows_NT',
            platform: 'win32',
            release: '10.0.22631',
            arch: 'x64',
            uptime: 86400,
            totalMemory: 34359738368, // 32 GB
            freeMemory: 17179869184,  // 16 GB (50% used)
          },
          cpu: {
            model: 'Intel(R) Core(TM) i9-14900K',
            speed: 5800,
            cores: 24,
          },
          hostname: 'DESKTOP-WIN11PRO',
          nodeVersion: 'v21.7.1',
          homeDir: 'C:\\Users\\winuser',
          env: getFormattedEnv({
            'PATH': 'C:\\Windows\\system32;C:\\Windows;C:\\Program Files\\nodejs\\',
            'OS': 'Windows_NT',
            'PROCESSOR_ARCHITECTURE': 'AMD64',
            'NUMBER_OF_PROCESSORS': '24',
            'USERNAME': 'winuser',
            'USERPROFILE': 'C:\\Users\\winuser',
            'COMPUTERNAME': 'DESKTOP-WIN11PRO',
            'NODE_ENV': 'development'
          })
        }
      });
    }

    if (simulate === 'edge_memory') {
      return res.json({
        success: true,
        data: {
          os: {
            type: 'EdgeCaseOS',
            platform: 'linux',
            release: '1.0',
            arch: 'x64',
            uptime: 100,
            totalMemory: 0, // Edge case: zero memory
            freeMemory: 0,
          },
          cpu: {
            model: 'Edge Memory CPU',
            speed: 100,
            cores: 1,
          },
          hostname: 'edge-memory-host',
          nodeVersion: 'v20.0.0',
          homeDir: '/home/edge',
          env: getFormattedEnv({})
        }
      });
    }

    if (simulate === 'edge_cpu') {
      return res.json({
        success: true,
        data: {
          os: {
            type: 'EdgeCaseOS',
            platform: 'linux',
            release: '1.0',
            arch: 'x64',
            uptime: 100,
            totalMemory: 8589934592,
            freeMemory: 4294967296,
          },
          cpu: {
            model: '', // Empty CPU model
            speed: 0,  // Zero speed
            cores: 0,  // Zero cores
          },
          hostname: 'edge-cpu-host',
          nodeVersion: 'v20.0.0',
          homeDir: '/home/edge',
          env: getFormattedEnv({})
        }
      });
    }

    const envData = getFormattedEnv(process.env);

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
    
    // Check if it is a directory
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Cannot read directory contents as a file.' });
    }

    // Limit read size to prevent Out of Memory (Case 31)
    if (stats.size > 5 * 1024 * 1024) { // 5MB limit
      return res.status(400).json({ success: false, error: 'File is too large to read (5MB limit).' });
    }

    // Refuse binary files (Case 27)
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.js', '.css', '.html', '.json', '.txt', '.md'];
    if (ext && !allowedExtensions.includes(ext)) {
      return res.status(400).json({ success: false, error: 'Binary file reading is not supported.' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ success: false, error: 'File not found.' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
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

    // Check if file already exists (Case 26)
    try {
      await fs.access(filePath);
      return res.status(400).json({ success: false, error: 'File already exists.' });
    } catch {
      // File doesn't exist, proceed to create
    }

    // Ensure the parent directory exists recursively (Case 23)
    await fs.mkdir(path.dirname(filePath), { recursive: true });

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
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, content || '', 'utf-8');
    res.json({ success: true, message: 'File updated successfully.' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ success: false, error: 'File not found.' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// 6. API Endpoint: CRUD - Delete file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = safeResolvePath(filename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      res.json({ success: true, message: 'File deleted successfully.' });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File already deleted or doesn't exist (Case 24 - handle gracefully)
        res.json({ success: true, message: 'File already deleted.' });
      } else {
        throw err;
      }
    }
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
