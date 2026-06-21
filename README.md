# SysOps System Information & File CRUD Dashboard

A secure, interactive Node.js local dashboard designed to monitor core operating system metrics and perform full CRUD (Create, Read, Update, Delete) operations on code files inside a designated, sandboxed workspace.

---

## 🚀 Key Features

- **Real-Time System Monitoring:** Track OS details, CPU model/speed, hostname, Node.js version, home directory, and safe environment variables.
- **Visual Memory Gauge:** Glowing memory consumption bar that automatically changes colors based on utilization (green for low, orange/red for high).
- **Sandboxed Workspace Editor:** Full CRUD manager for code files (`.js`, `.css`, `.html`, `.json`) strictly locked inside the `./workspace` directory.
- **Directory Traversal Protection:** Absolute path resolve checks prevent unauthorized file manipulation outside the sandbox directory.
- **Premium Glassmorphic Design:** Glowing background gradients, backdrop blur, custom scrollbars, and animations built entirely with HTML and Vanilla CSS.

---

## 🛠️ System Architecture & Code Flow

The application follows a clean client-server architecture built on Node.js and Vanilla JS.

```
┌────────────────────────────────────────────────────────┐
│                        BROWSER                         │
│  (public/index.html, public/style.css, public/app.js)  │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            │ GET /api/system-info           │ GET, POST, PUT, DELETE
            │ (Polls every 5s)               │ /api/files/* (Workspace Editor)
            ▼                                ▼
┌────────────────────────────────────────────────────────┐
│                   NODE.JS WEB SERVER                   │
│                      (server.js)                       │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼ (using Node 'os' API)          ▼ (using Node 'fs' API)
   System Metrics Gathered             Restricted to ./workspace/
```

### 1. Backend Design (`server.js`)
- **Express Server:** Listens on port 3000 and serves static files from the `public/` directory.
- **Safe Metric Extraction:** Accesses operating system properties using the built-in Node `os` module. Safely filters environment variables using a whitelist (`safeEnvKeys`) to avoid leaking passwords or database keys.
- **Safe Path Resolving:** Path traversal represents a common security risk in custom file managers. The server guards against this with `safeResolvePath`:
  ```js
  const cleanName = path.normalize(fileName).replace(/^(\.\.[\/\\])+/, '');
  const resolved = path.resolve(WORKSPACE_DIR, cleanName);
  if (!resolved.startsWith(WORKSPACE_DIR)) {
      throw new Error('Access denied: Out of workspace bounds.');
  }
  ```
- **CRUD REST Endpoints:**
  - `GET /api/files` - Read directory file list and statistics.
  - `GET /api/files/:filename` - Read content.
  - `POST /api/files` - Create new file.
  - `PUT /api/files/:filename` - Save edits.
  - `DELETE /api/files/:filename` - Delete file.

### 2. Frontend Design (`public/app.js` & `public/style.css`)
- **System Specifications:** On DOM load, fetches data from `/api/system-info` and builds the layout. Polling runs every 5 seconds to update RAM indicators.
- **Live Memory Progress Bar:** Compares `os.totalMemory` and `os.freeMemory` to calculate a dynamic width percentage.
- **Workspace Editor:** Features a sidebar showing all code files in the workspace. Selecting a file loads it into the editor textarea. An "unsaved changes" warning checks for mismatch between current textarea value and initial file content.

---

## 📊 Documented System Metrics

Below are the data fields gathered by the backend and visualized on the dashboard:

| Metric | Origin Source | Explanation |
|---|---|---|
| **Operating System** | `os.type()` | The name of the operating system (e.g., Windows_NT, Linux). |
| **Platform / Release** | `os.platform()` / `os.release()` | Node's platform identifier and the kernel version release. |
| **CPU Architecture** | `os.arch()` / `os.cpus()` | Processor core architecture (e.g. x64, arm64) along with cores count and clock speeds. |
| **Hostname** | `os.hostname()` | The unique hostname identifier of the local computer. |
| **Node.js Version** | `process.version` | The version of the Node.js process executing the server. |
| **Home Directory** | `os.homedir()` | The home directory of the current user. |
| **Memory Info** | `os.totalmem()` / `os.freemem()` | Total physical system RAM and currently free RAM. |
| **Environment Variables** | `process.env` | Filtered configuration variables (e.g., `PATH`, `USERNAME`, `NODE_ENV`). |

---

## ⚙️ How to Run & Verify

1. **Install Dependencies:**
   Make sure you have [Node.js](https://nodejs.org/) installed. Run this command inside the project directory:
   ```bash
   npm install
   ```

2. **Start the Application:**
   Run the dev script:
   ```bash
   npm run dev
   ```

3. **Access the Dashboard:**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

4. **Verify CRUD Operations:**
   - Click the **+ New File** button.
   - Enter a filename (e.g. `test.js`) and click Create.
   - Select the newly created file from the list.
   - Add content in the text editor, and note the `* modified` label.
   - Click **Save File** to persist it, then check the file size in the sidebar.
   - Click **Delete** to remove it.
