import type { EngineStatus } from './ipc/EngineAPI';

document.addEventListener('DOMContentLoaded', () => {
    const openOptionsButton = document.getElementById('open-options');
    
    // Open the options page when the user clicks
    if (openOptionsButton) {
        openOptionsButton.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Load basic stats/diagnostics 
    loadBasicStats();
});

async function loadBasicStats() {
    const engineStatusEl = document.getElementById('engine-status');
    const templateCountEl = document.getElementById('template-count');

    if (engineStatusEl) engineStatusEl.textContent = 'Checking...';
    if (templateCountEl) templateCountEl.textContent = '...';

    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ENGINE_STATUS' });
        if (response?.success) {
            const status = response.payload as EngineStatus;
            if (engineStatusEl) engineStatusEl.textContent = status.ready ? 'Ready' : 'Not ready';
            if (templateCountEl) templateCountEl.textContent = status.templateCount.toString();
        } else {
            const err = response?.error || 'Unavailable';
            if (engineStatusEl) engineStatusEl.textContent = `Error: ${err}`;
            if (templateCountEl) templateCountEl.textContent = 'N/A';
        }
    } catch (error: any) {
        console.error('Failed to load engine status', error);
        if (engineStatusEl) engineStatusEl.textContent = 'Error';
        if (templateCountEl) templateCountEl.textContent = 'N/A';
    }
}
