// Content Script - Inject Optimize Button and Overlay

console.log('[CS] Content script loaded');

// Configuration
const TEXTAREA_SELECTOR = '#prompt-textarea, textarea[placeholder*="Message"], textarea';
const BUTTON_ID = 'prompt-optimizer-btn';
const OVERLAY_ID = 'prompt-optimizer-overlay';

// State
let shadowRoot: ShadowRoot | null = null;
let optimizeButton: HTMLButtonElement | null = null;

// Initialize when DOM is ready
function init() {
  console.log('[CS] Initializing...');
  
  // Find target textarea
  const textarea = findTargetTextarea();
  if (!textarea) {
    console.log('[CS] Textarea not found, will retry...');
    // Retry after delay (ChatGPT may load dynamically)
    setTimeout(init, 1000);
    return;
  }

  console.log('[CS] Textarea found:', textarea);
  
  // Inject optimize button
  injectOptimizeButton(textarea);
  
  // Create overlay container
  createOverlayContainer();
}

// Find the target textarea
function findTargetTextarea(): HTMLTextAreaElement | null {
  const elements = document.querySelectorAll(TEXTAREA_SELECTOR);
  
  for (const el of elements) {
    if (el instanceof HTMLTextAreaElement && el.offsetParent !== null) {
      return el;
    }
  }
  
  return null;
}

// Inject the optimize button
function injectOptimizeButton(textarea: HTMLTextAreaElement) {
  // Check if button already exists
  if (document.getElementById(BUTTON_ID)) {
    console.log('[CS] Button already exists');
    return;
  }

  // Create button
  optimizeButton = document.createElement('button');
  optimizeButton.id = BUTTON_ID;
  optimizeButton.textContent = '✨ Optimize';
  optimizeButton.style.cssText = `
    position: absolute;
    z-index: 10000;
    padding: 6px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    transition: all 0.2s;
  `;

  // Hover effect
  optimizeButton.addEventListener('mouseenter', () => {
    if (optimizeButton) {
      optimizeButton.style.transform = 'translateY(-2px)';
      optimizeButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    }
  });

  optimizeButton.addEventListener('mouseleave', () => {
    if (optimizeButton) {
      optimizeButton.style.transform = 'translateY(0)';
      optimizeButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
    }
  });

  // Click handler
  optimizeButton.addEventListener('click', handleOptimizeClick);

  // Position button near textarea
  positionButton(textarea);

  // Append to document
  document.body.appendChild(optimizeButton);
  console.log('[CS] Optimize button injected');

  // Reposition on window resize
  window.addEventListener('resize', () => positionButton(textarea));
}

// Position button relative to textarea
function positionButton(textarea: HTMLTextAreaElement) {
  if (!optimizeButton) return;

  const rect = textarea.getBoundingClientRect();
  optimizeButton.style.top = `${rect.bottom + window.scrollY + 8}px`;
  optimizeButton.style.left = `${rect.left + window.scrollX}px`;
}

// Handle optimize button click
async function handleOptimizeClick() {
  console.log('[CS] Optimize button clicked');

  const textarea = findTargetTextarea();
  if (!textarea || !textarea.value.trim()) {
    showToast('Please enter some text first', 'warning');
    return;
  }

  const draft = textarea.value;
  console.log('[CS] Draft length:', draft.length);

  // Show loading state
  if (optimizeButton) {
    optimizeButton.textContent = '⏳ Optimizing...';
    optimizeButton.disabled = true;
  }

  try {
    // Send message to service worker
    const response = await sendMessageToBackground({
      type: 'OPTIMIZE_REQUEST',
      id: generateId(),
      timestamp: Date.now(),
      payload: {
        draft,
        site: 'chatgpt',
        lang: 'en',
      },
    });

    console.log('[CS] Received response:', response);

    // Show overlay with results
    showOverlay(response.payload.cards, textarea);

  } catch (error) {
    console.error('[CS] Error:', error);
    showToast('Failed to optimize. Please try again.', 'error');
  } finally {
    // Reset button
    if (optimizeButton) {
      optimizeButton.textContent = '✨ Optimize';
      optimizeButton.disabled = false;
    }
  }
}

// Send message to background and wait for response
function sendMessageToBackground(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Create overlay container with Shadow DOM
function createOverlayContainer() {
  // Check if overlay already exists
  if (document.getElementById(OVERLAY_ID)) {
    console.log('[CS] Overlay container already exists');
    return;
  }

  // Create container
  const container = document.createElement('div');
  container.id = OVERLAY_ID;
  
  // Attach shadow DOM
  shadowRoot = container.attachShadow({ mode: 'open' });
  
  // Add styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
    }
    
    .overlay-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s;
    }
    
    .overlay-backdrop.show {
      display: flex;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .overlay-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 800px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .overlay-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .overlay-title {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .close-btn:hover {
      background: #f0f0f0;
      color: #1a1a1a;
    }
    
    .cards-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
      transition: all 0.2s;
    }
    
    .card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .card-title {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 14px;
    }
    
    .card-body {
      color: #333;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 12px;
      white-space: pre-wrap;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .card-actions {
      display: flex;
      gap: 8px;
    }
    
    .btn {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .btn-replace {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-replace:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .btn-copy {
      background: #f0f0f0;
      color: #333;
    }
    
    .btn-copy:hover {
      background: #e0e0e0;
    }
    
    .btn-discard {
      background: transparent;
      color: #999;
    }
    
    .btn-discard:hover {
      color: #666;
    }
  `;
  
  shadowRoot.appendChild(style);
  
  // Add overlay structure
  const backdrop = document.createElement('div');
  backdrop.className = 'overlay-backdrop';
  backdrop.innerHTML = `
    <div class="overlay-content">
      <div class="overlay-header">
        <h2 class="overlay-title">✨ Optimized Prompts</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="cards-container"></div>
    </div>
  `;
  
  shadowRoot.appendChild(backdrop);
  
  // Close overlay on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      hideOverlay();
    }
  });
  
  // Close button
  const closeBtn = shadowRoot.querySelector('.close-btn');
  closeBtn?.addEventListener('click', hideOverlay);
  
  // Append to body
  document.body.appendChild(container);
  console.log('[CS] Overlay container created with Shadow DOM');
}

// Show overlay with cards
function showOverlay(cards: any[], textarea: HTMLTextAreaElement) {
  if (!shadowRoot) return;

  const backdrop = shadowRoot.querySelector('.overlay-backdrop');
  const cardsContainer = shadowRoot.querySelector('.cards-container');
  
  if (!backdrop || !cardsContainer) return;

  // Clear previous cards
  cardsContainer.innerHTML = '';

  // Add cards
  cards.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.innerHTML = `
      <div class="card-header">
        <span class="card-title">${escapeHtml(card.title)}</span>
      </div>
      <div class="card-body">${escapeHtml(card.filledText)}</div>
      <div class="card-actions">
        <button class="btn btn-replace" data-action="replace">Replace</button>
        <button class="btn btn-copy" data-action="copy">Copy</button>
        <button class="btn btn-discard" data-action="discard">Discard</button>
      </div>
    `;

    // Action handlers
    const replaceBtn = cardEl.querySelector('[data-action="replace"]');
    const copyBtn = cardEl.querySelector('[data-action="copy"]');
    const discardBtn = cardEl.querySelector('[data-action="discard"]');

    replaceBtn?.addEventListener('click', () => {
      textarea.value = card.filledText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      hideOverlay();
      showToast('Prompt replaced!', 'success');
    });

    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(card.filledText);
      showToast('Copied to clipboard!', 'success');
    });

    discardBtn?.addEventListener('click', () => {
      cardEl.remove();
      showToast('Card discarded', 'info');
    });

    cardsContainer.appendChild(cardEl);
  });

  // Show overlay
  backdrop.classList.add('show');
}

// Hide overlay
function hideOverlay() {
  if (!shadowRoot) return;
  const backdrop = shadowRoot.querySelector('.overlay-backdrop');
  backdrop?.classList.remove('show');
}

// Show toast notification
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 1000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideInRight 0.3s;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
export{};
