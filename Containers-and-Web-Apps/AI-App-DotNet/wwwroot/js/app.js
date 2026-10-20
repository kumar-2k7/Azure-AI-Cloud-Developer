/* ==========================================================================
   Azure AI Cloud Developer - Client-Side Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initTelemetryClock();
  initApiInspector();
  initAiPlayground();
});

/* ==========================================================================
   Theme Toggle (Dark / Light)
   ========================================================================== */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem('site-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  toggleBtn.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme');
    const newTheme = active === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('site-theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
  });
}

function updateThemeIcon(theme) {
  const iconSpan = document.getElementById('theme-toggle-icon');
  if (iconSpan) {
    iconSpan.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

/* ==========================================================================
   Telemetry & Live Metrics Simulation
   ========================================================================== */
function initTelemetryClock() {
  const uptimeEl = document.getElementById('metric-uptime');
  const requestsEl = document.getElementById('metric-requests');
  const memoryEl = document.getElementById('metric-memory');

  let secondsRunning = 1420;
  let totalRequests = 2841;

  setInterval(() => {
    secondsRunning++;
    const hours = Math.floor(secondsRunning / 3600);
    const mins = Math.floor((secondsRunning % 3600) / 60);
    const secs = secondsRunning % 60;
    if (uptimeEl) {
      uptimeEl.textContent = `${hours}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
    }

    if (Math.random() > 0.4) {
      totalRequests += Math.floor(Math.random() * 3) + 1;
      if (requestsEl) {
        requestsEl.textContent = totalRequests.toLocaleString();
      }
    }

    if (memoryEl && Math.random() > 0.7) {
      const baseMem = 48.2 + (Math.sin(Date.now() / 10000) * 3.4);
      memoryEl.textContent = `${baseMem.toFixed(1)} MB`;
    }
  }, 1000);
}

/* ==========================================================================
   Backend API Live Inspector
   ========================================================================== */
function initApiInspector() {
  const btnHealth = document.getElementById('btn-api-health');
  const btnInfo = document.getElementById('btn-api-info');
  const statusEl = document.getElementById('api-status-display');
  const codeViewer = document.getElementById('api-code-viewer');
  const latencyEl = document.getElementById('api-latency-display');

  if (btnHealth) {
    btnHealth.addEventListener('click', () => {
      fetchEndpoint('/api/health', btnHealth, btnInfo);
    });
  }

  if (btnInfo) {
    btnInfo.addEventListener('click', () => {
      fetchEndpoint('/api/info', btnInfo, btnHealth);
    });
  }

  // Pre-load /api/health automatically to showcase live ASP.NET Core connection
  if (btnHealth) {
    fetchEndpoint('/api/health', btnHealth, btnInfo);
  }

  async function fetchEndpoint(url, activeBtn, inactiveBtn) {
    if (activeBtn) activeBtn.classList.add('active');
    if (inactiveBtn) inactiveBtn.classList.remove('active');

    if (codeViewer) {
      codeViewer.textContent = '// Querying ASP.NET Core backend...';
    }

    const startTime = performance.now();
    try {
      const response = await fetch(url);
      const elapsed = Math.round(performance.now() - startTime);
      const data = await response.json();

      if (statusEl) {
        statusEl.innerHTML = `<span style="color: var(--accent-emerald);">●</span> HTTP ${response.status} OK`;
      }
      if (latencyEl) {
        latencyEl.textContent = `${elapsed} ms`;
      }
      if (codeViewer) {
        codeViewer.textContent = JSON.stringify(data, null, 2);
      }
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: var(--accent-amber);">●</span> Standalone Mode (API Offline)`;
      }
      if (codeViewer) {
        // Fallback for static viewing without server
        codeViewer.textContent = JSON.stringify({
          endpoint: url,
          message: "Could not reach live ASP.NET Core endpoint. Ensure 'dotnet run' is running.",
          error: err.message
        }, null, 2);
      }
    }
  }
}

/* ==========================================================================
   AI Playground & Streaming Response Simulation
   ========================================================================== */
const samplePrompts = {
  vector: "Explain how Vector Embeddings enable semantic search in Azure AI Search.",
  container: "What are the key architectural benefits of running ASP.NET Core in Azure Container Apps?",
  perf: "How does .NET 10 enhance throughput and memory efficiency for cloud-native microservices?",
  rag: "Generate a step-by-step Retrieval-Augmented Generation (RAG) pipeline workflow."
};

const sampleAnswers = {
  vector: `### Vector Embeddings in Azure AI Search

Vector embeddings represent high-dimensional numerical representations of text, images, or audio:

1. **Semantic Understanding:** Words and documents with similar conceptual meanings reside near each other in vector space (cosine similarity).
2. **Azure AI Search Integration:** Combines vector indexing (HNSW algorithm) with traditional BM25 keyword search for **hybrid search**.
3. **Semantic Re-ranking:** Uses Bing-powered deep neural ranking models to elevate the most contextually relevant chunks before passing to the LLM.`,

  container: `### ASP.NET Core on Azure Container Apps (ACA)

1. **Serverless Microservice Scaling:** Automatically scales from zero to N instances based on HTTP requests or KEDA event triggers (e.g., Azure Service Bus).
2. **Built-in Ingress & Traffic Splitting:** Effortless Blue/Green and Canary deployments directly with revision management.
3. **Dapr Integration:** Seamless distributed application runtime support for state management, pub/sub, and service invocation.
4. **Optimized Resource Footprint:** Alpine/chiseled Ubuntu .NET 10 base images achieve sub-50MB footprints and rapid cold starts.`,

  perf: `### .NET 10 Cloud-Native Performance Highlights

- **Dynamic PGO (Profile-Guided Optimization):** Tier-1 JIT compilation dynamically specializes frequently executed loops and method dispatches.
- **Garbage Collection (DATAS):** Dynamic Adaptation To Application Sizes optimizes memory ceiling specifically inside container memory limits.
- **Zero-Allocation Slices & UTF8 Literals:** High-throughput JSON deserialization without allocating intermediate managed strings.
- **Minimal API Fast-Paths:** Pre-compiled route endpoints bypass standard MVC pipeline overhead.`,

  rag: `### End-to-End Enterprise RAG Pipeline

\`\`\`mermaid
[User Query] --> [Embedding Generator]
[Embedding Generator] --> [Azure AI Search (Hybrid + Re-rank)]
[Retrieved Chunks] --> [Prompt Orchestrator / Semantic Kernel]
[Prompt Orchestrator] --> [Azure OpenAI GPT-4o] --> [Streamed Response]
\`\`\`

1. **Ingestion:** Documents chunked, embedded via \`text-embedding-3-small\`, indexed in Azure.
2. **Retrieval:** Hybrid vector + keyword retrieval with threshold filtering.
3. **Augmentation:** System prompt enriched with verified ground-truth context.
4. **Generation:** Low-temperature generation with guardrails and citations.`
};

function initAiPlayground() {
  const promptInput = document.getElementById('playground-prompt');
  const generateBtn = document.getElementById('playground-submit-btn');
  const responseWindow = document.getElementById('playground-response');
  const charCounter = document.getElementById('prompt-char-count');
  const copyBtn = document.getElementById('copy-response-btn');
  const tokensCountEl = document.getElementById('stat-tokens-count');
  const latencyDisplay = document.getElementById('stat-latency-val');
  const chips = document.querySelectorAll('.prompt-chip');

  let isGenerating = false;

  // Character counter
  if (promptInput && charCounter) {
    promptInput.addEventListener('input', () => {
      charCounter.textContent = `${promptInput.value.length} / 500`;
    });
  }

  // Quick Chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.getAttribute('data-type');
      if (promptInput && samplePrompts[type]) {
        promptInput.value = samplePrompts[type];
        if (charCounter) charCounter.textContent = `${promptInput.value.length} / 500`;
        promptInput.focus();
      }
    });
  });

  // Submit Handler
  if (generateBtn && promptInput) {
    generateBtn.addEventListener('click', () => {
      const text = promptInput.value.trim();
      if (!text) {
        showToast('Please type or select a prompt first.');
        return;
      }
      if (isGenerating) return;

      runStreamSimulation(text);
    });
  }

  // Copy Button
  if (copyBtn && responseWindow) {
    copyBtn.addEventListener('click', () => {
      const text = responseWindow.innerText;
      if (!text || text.includes('Responses generated by AI will appear here')) {
        showToast('Nothing to copy yet.');
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied response to clipboard!');
      }).catch(() => {
        showToast('Failed to copy.');
      });
    });
  }

  function runStreamSimulation(userText) {
    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⚡</span> Generating...';

    // Pick response
    let answer = sampleAnswers.perf;
    const lower = userText.toLowerCase();
    if (lower.includes('vector') || lower.includes('embed')) answer = sampleAnswers.vector;
    else if (lower.includes('container') || lower.includes('azure')) answer = sampleAnswers.container;
    else if (lower.includes('rag') || lower.includes('retriev')) answer = sampleAnswers.rag;

    responseWindow.innerHTML = '';
    const startMs = performance.now();
    let currentIdx = 0;
    const tokens = answer.split(' ');
    let wordCount = 0;

    const streamInterval = setInterval(() => {
      if (currentIdx < tokens.length) {
        const nextWord = tokens[currentIdx] + ' ';
        responseWindow.textContent += nextWord;
        responseWindow.scrollTop = responseWindow.scrollHeight;
        currentIdx++;
        wordCount = currentIdx;

        if (tokensCountEl) {
          tokensCountEl.textContent = `${Math.round(wordCount * 1.3)} tokens`;
        }
      } else {
        clearInterval(streamInterval);
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>✨</span> Run Prompt';

        const totalTime = ((performance.now() - startMs) / 1000).toFixed(2);
        if (latencyDisplay) {
          latencyDisplay.textContent = `${totalTime}s`;
        }
        showToast('AI response completed');
      }
    }, 28);
  }
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutToast 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
