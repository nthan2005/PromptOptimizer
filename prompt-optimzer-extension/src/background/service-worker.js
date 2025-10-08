// Service Worker - Router and Offscreen Manager
console.log('[SW] Service Worker initialized');
// Track offscreen document state
let offscreenCreated = false;
// Ensure offscreen document exists
async function ensureOffscreenDocument() {
    if (offscreenCreated) {
        return;
    }
    try {
        await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
            reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
            justification: 'Run BM25F retrieval and template processing engine',
        });
        offscreenCreated = true;
        console.log('[SW] Offscreen document created');
    }
    catch (error) {
        // Document might already exist
        if (error instanceof Error && error.message.includes('Only a single offscreen')) {
            offscreenCreated = true;
            console.log('[SW] Offscreen document already exists');
        }
        else {
            console.error('[SW] Failed to create offscreen document:', error);
            throw error;
        }
    }
}
// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[SW] Received message:', message.type, 'from', sender.tab?.id || 'popup');
    // Handle PING for testing
    if (message.type === 'PING') {
        sendResponse({
            type: 'PONG',
            id: message.id,
            timestamp: Date.now(),
            payload: { status: 'ok' },
        });
        return false;
    }
    // Handle OPTIMIZE_REQUEST
    if (message.type === 'OPTIMIZE_REQUEST') {
        handleOptimizeRequest(message)
            .then(sendResponse)
            .catch(error => {
            console.error('[SW] Error handling optimize request:', error);
            sendResponse({
                type: 'ERROR',
                id: message.id,
                timestamp: Date.now(),
                payload: { error: error.message },
            });
        });
        return true; // Will respond asynchronously
    }
    return false;
});
// Handle optimize request by forwarding to offscreen
async function handleOptimizeRequest(message) {
    console.log('[SW] Handling optimize request');
    // Ensure offscreen document exists
    await ensureOffscreenDocument();
    // Forward message to offscreen document
    const response = await chrome.runtime.sendMessage(message);
    console.log('[SW] Received response from offscreen');
    return response;
}
// Install handler - seed initial data
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[SW] Extension installed/updated:', details.reason);
    if (details.reason === 'install') {
        console.log('[SW] First install - will seed data in future weeks');
        // Week 2-3: Seed initial templates
    }
});
// Handle service worker lifecycle
self.addEventListener('activate', (event) => {
    console.log('[SW] Service worker activated');
});
export {};
