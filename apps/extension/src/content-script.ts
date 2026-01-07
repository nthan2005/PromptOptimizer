import { SearchRequest, SearchResult } from './ipc/EngineAPI';

// ID for the Host Element and Card UI
const HOST_ELEMENT_ID = 'autoprompt-host';
const OPTIMIZE_BUTTON_ID = 'autoprompt-optimize-button';

/**
 * 1. Reads the draft prompt from the target page's (ChatGPT) textbox.
 * Supports various selectors for different ChatGPT versions.
 */
function getDraftText(pageContext: Document): string | null {
    console.log('🔍 Looking for draft text input...');
    
    // Try multiple selectors (ChatGPT often changes the DOM)
    const selectors = [
        'textarea#prompt-textarea',          // Old selector
        'textarea[data-id="root"]',          // New ChatGPT
        'textarea[placeholder*="Message"]',  // Based on placeholder
        'div[contenteditable="true"]',       // Contenteditable div
        'textarea',                          // Fallback: any textarea
    ];

    for (const selector of selectors) {
        const element = pageContext.querySelector(selector);
        
        if (element) {
            console.log('✅ Found input element:', selector);
            
            // Handle textarea
            if (element instanceof HTMLTextAreaElement) {
                const value = element.value?.trim() || '';
                if (value) {
                    console.log('✅ Got draft text from textarea:', value.substring(0, 50));
                    return value;
                }
            }
            
            // Handle contenteditable div
            if (element instanceof HTMLElement && element.isContentEditable) {
                const text = element.textContent?.trim() || '';
                if (text) {
                    console.log('✅ Got draft text from contenteditable:', text.substring(0, 50));
                    return text;
                }
            }
        }
    }
    
    console.warn('⚠️ No draft text found, using placeholder');
    // Fallback: Returns sample text for testing
    return "Help me write a professional email to my manager about project updates.";
}

/**
 * 2. Mounts the Shadow DOM Overlay and attaches the Optimize button.
 */
function setupUI(host: HTMLElement): ShadowRoot {
    console.log('🎨 Setting up UI...');
    
    // Create Shadow DOM
    const shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Attach basic UI
    shadowRoot.innerHTML = `
        <style>
            :host {
                --ap-width: min(480px, 90vw);
            }
            .autoprompt-wrapper {
                position: fixed;
                top: 16px;
                right: 140px; /* sits just left of the Share button area */
                width: var(--ap-width);
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .autoprompt-overlay-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 12px;
                padding: 16px 16px 18px;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
                width: var(--ap-width);
                max-width: var(--ap-width);
                min-width: var(--ap-width);
                box-sizing: border-box;
                color: white;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            .ap-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
            }
            .ap-header h4 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                line-height: 1.2;
            }
            .ap-minimize {
                background: rgba(255,255,255,0.15);
                border: none;
                width: 28px;
                height: 28px;
                border-radius: 999px;
                color: white;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.2s, transform 0.2s;
            }
            .ap-minimize:hover {
                background: rgba(255,255,255,0.25);
                transform: translateY(-1px);
            }
            #${OPTIMIZE_BUTTON_ID} {
                padding: 10px 20px;
                cursor: pointer;
                background: white;
                color: #667eea;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                width: 100%;
            }
            #${OPTIMIZE_BUTTON_ID}:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            #${OPTIMIZE_BUTTON_ID}:active {
                transform: translateY(0);
            }
            #status {
                font-size: 13px;
                opacity: 0.9;
                padding-bottom: 2px;
            }
            .candidate-list {
                max-height: 240px;
                overflow-y: auto;
                overflow-x: auto; /* keep horizontal nav/scroll visible */
                margin-top: 6px;
                padding-bottom: 4px;
                scrollbar-width: thin;
                scrollbar-gutter: stable both-edges;
            }
            .candidate-item {
                background: rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .candidate-item:hover {
                background: rgba(255,255,255,0.2);
                transform: translateX(5px);
            }
            .candidate-item strong {
                display: block;
                margin-bottom: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .autoprompt-collapsed {
                display: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 12px 16px;
                box-shadow: 0 6px 18px rgba(102, 126, 234, 0.35);
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                min-width: var(--ap-width);
                width: var(--ap-width);
                max-width: var(--ap-width);
                box-sizing: border-box;
                text-align: center;
                transition: transform 0.2s, box-shadow 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 8px;
                white-space: nowrap;
                align-self: stretch;
            }
            .autoprompt-collapsed:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 22px rgba(102, 126, 234, 0.45);
            }
        </style>
        
        <div class="autoprompt-wrapper">
            <div class="autoprompt-overlay-card" id="autoprompt-card">
                <div class="ap-header">
                    <h4>AutoPrompt MVP</h4>
                    <button class="ap-minimize" id="autoprompt-minimize" title="Minimize">−</button>
                </div>
                <button id="${OPTIMIZE_BUTTON_ID}">Optimize Draft</button>
                <div id="status">Ready to optimize your prompt!</div>
                <div id="results" class="candidate-list"></div>
            </div>
            <button class="autoprompt-collapsed" id="autoprompt-collapsed">AutoPrompt — click to expand</button>
        </div>
    `;

    console.log('✅ UI setup complete');
    return shadowRoot;
}

function findWritableTarget(pageContext: Document): HTMLTextAreaElement | HTMLElement | null {
    const selectors = [
        'textarea#prompt-textarea',
        'textarea[data-id="root"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"]',
        'textarea'
    ];
    for (const selector of selectors) {
        const el = pageContext.querySelector(selector);
        if (el instanceof HTMLTextAreaElement) return el;
        if (el instanceof HTMLElement && el.isContentEditable) return el;
    }
    return null;
}

function injectPromptIntoPage(prompt: string): boolean {
    const target = findWritableTarget(document);
    if (!target) return false;

    // Try to mimic native input events so ChatGPT notices the change.
    if (target instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(target, prompt);
    } else {
        target.textContent = prompt;
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function stripTopic(title?: string): string {
    if (!title) return '';
    return title.replace(/\s*Topic:\s*[^-]+-[A-Za-z0-9]+$/i, '').trim();
}

/**
 * 3. Sends the optimization request to the Service Worker.
 */
async function triggerOptimize(draft: string, shadowRoot: ShadowRoot) {
    console.log('🚀 Triggering optimization for:', draft.substring(0, 50));
    
    const statusEl = shadowRoot.getElementById('status');
    const resultsEl = shadowRoot.getElementById('results');

    if (statusEl) statusEl.textContent = '⏳ Processing...';
    if (resultsEl) resultsEl.innerHTML = '<p style="opacity:0.7">Loading candidates...</p>';
    
    const request: SearchRequest = { 
        draft, 
        context: { url: window.location.href } 
    };

    try {
        console.log('📤 Sending message to Service Worker...');
        
        // Send message to Service Worker (CS -> SW)
        const response = await chrome.runtime.sendMessage({ 
            type: 'PROCESS_DRAFT', 
            payload: request 
        });

        console.log('📥 Received response:', response);

        if (response && response.success) {
            const candidates: SearchResult[] = response.payload || [];
            if (statusEl) {
                statusEl.textContent = `✅ Found ${candidates.length} optimized templates!`;
            }
            renderCandidates(candidates, resultsEl, statusEl);
        } else {
            const errorMsg = response?.error || 'Unknown error';
            console.error('❌ Optimization failed:', errorMsg);
            if (statusEl) statusEl.textContent = `❌ Error: ${errorMsg}`;
            if (resultsEl) resultsEl.innerHTML = '';
        }
    } catch (error) {
        console.error('❌ Failed to communicate with Service Worker:', error);
        if (statusEl) statusEl.textContent = '❌ Connection error. Please reload.';
        if (resultsEl) resultsEl.innerHTML = '';
    }
}

/**
 * 4. Displays the search results (MVP)
 */
function renderCandidates(candidates: SearchResult[], resultsEl: HTMLElement | null, statusEl?: HTMLElement | null) {
    console.log('🎨 Rendering', candidates.length, 'candidates');
    
    if (!resultsEl) {
        console.warn('⚠️ Results element not found');
        return;
    }
    
    resultsEl.innerHTML = '';

    if (candidates.length === 0) {
        resultsEl.innerHTML = '<p style="opacity:0.7">No templates found. Try a different prompt!</p>';
        return;
    }

    candidates.forEach((candidate, index) => {
        // Soften perfect scores; cap at 92% to avoid implying certainty.
        const displayScore = Math.round(Math.min(candidate.score, 0.92) * 100);
        const item = document.createElement('div');
        item.className = 'candidate-item';
        item.innerHTML = `
            <strong title="${candidate.templateTitle || `Template ${index + 1}`}">${stripTopic(candidate.templateTitle) || `Template ${index + 1}`}</strong>
            <div style="font-size:11px; margin:5px 0;">Score: ~${displayScore}%</div>
        `;
        
        // Click to insert into the active prompt box; fallback to clipboard.
        item.addEventListener('click', async () => {
            const prompt = candidate.filledPrompt || '';
            const inserted = injectPromptIntoPage(prompt);
            if (inserted) {
                if (statusEl) statusEl.textContent = '✅ Inserted into chat box';
            } else {
                try {
                    await navigator.clipboard.writeText(prompt);
                    if (statusEl) statusEl.textContent = '📋 Copied. Paste into the chat box.';
                } catch (err) {
                    console.error('Failed to copy prompt', err);
                    if (statusEl) statusEl.textContent = '⚠️ Could not insert or copy. Please paste manually.';
                }
            }
            item.style.background = 'rgba(255,255,255,0.3)';
            setTimeout(() => {
                item.style.background = 'rgba(255,255,255,0.1)';
            }, 200);
            console.log('Applied candidate:', candidate.templateTitle);
        });
        
        resultsEl.appendChild(item);
    });
}

// -----------------------------------------------------------
// 5. MAIN ENTRYPOINT
// -----------------------------------------------------------

function initialize() {
    console.log('🚀 AutoPrompt Content Script initializing...');
    
    // Check if the host element already exists
    let host = document.getElementById(HOST_ELEMENT_ID);
    if (host) {
        console.log('⚠️ Host element already exists, removing old instance');
        host.remove();
    }
    
    // Create and append the host to the DOM
    host = document.createElement('div');
    host.id = HOST_ELEMENT_ID;
    document.body.appendChild(host);
    console.log('✅ Host element created');

    const shadowRoot = setupUI(host);
    const card = shadowRoot.getElementById('autoprompt-card') as HTMLElement | null;
    const collapsedBtn = shadowRoot.getElementById('autoprompt-collapsed') as HTMLElement | null;
    const minimizeBtn = shadowRoot.getElementById('autoprompt-minimize') as HTMLElement | null;

    const setCollapsed = (collapsed: boolean) => {
        if (card) card.style.display = collapsed ? 'none' : 'flex';
        if (collapsedBtn) {
            collapsedBtn.style.display = collapsed ? 'flex' : 'none';
            collapsedBtn.textContent = collapsed ? 'AutoPrompt — click to expand' : 'AutoPrompt — click to collapse';
        }
    };
    setCollapsed(false);
    minimizeBtn?.addEventListener('click', () => setCollapsed(true));
    collapsedBtn?.addEventListener('click', () => setCollapsed(false));
    
    // Attach Event Listener to the Optimize button
    const optimizeButton = shadowRoot.getElementById(OPTIMIZE_BUTTON_ID);
    if (optimizeButton) {
        optimizeButton.addEventListener('click', () => {
            console.log('🖱️ Optimize button clicked');
            const draft = getDraftText(document);
            if (draft) {
                triggerOptimize(draft, shadowRoot);
            } else {
                alert("Please enter a draft prompt first.");
            }
        });
        console.log('✅ Event listener attached to optimize button');
    } else {
        console.error('❌ Failed to find optimize button');
    }
}

// Wait until DOM is fully loaded before running
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

console.log('📦 Content Script loaded');
