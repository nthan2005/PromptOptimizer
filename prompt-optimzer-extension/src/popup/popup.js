"use strict";
// Popup Script
console.log('[Popup] Loaded');
// Test connection to service worker
chrome.runtime.sendMessage({
    type: 'PING',
    id: `ping-${Date.now()}`,
    timestamp: Date.now(),
}, (response) => {
    if (chrome.runtime.lastError) {
        console.error('[Popup] Error:', chrome.runtime.lastError);
    }
    else {
        console.log('[Popup] Pong received:', response);
    }
});
