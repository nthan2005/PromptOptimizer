import { EngineAPI } from './ipc/EngineAPIImpl';
import { EngineCallMessage, EngineResponseMessage } from './ipc/EngineAPI';

console.log('Offscreen Document script loaded');

// Initialize the Engine (Step 4: Real Engine)
const engine = new EngineAPI();

console.log('Engine instance created');

// Listen for messages from the Service Worker (SW -> OSD)
chrome.runtime.onMessage.addListener((message: EngineCallMessage, sender, sendResponse) => {
    console.log('Offscreen received message:', message.type, message);
    
    // IMPORTANT: Only process messages from the Service Worker (background)
    // Ignore messages from the Content Script
    if (sender.tab) {
        console.log('Ignoring message from content script (tab:', sender.tab.id, ')');
        return false;
    }
    
    // Only process defined engine commands
    const validCommands = ['seedFromManifest', 'searchTemplates', 'recordEvent', 'getStatus'];
    if (!validCommands.includes(message.type)) {
        console.warn('Unknown or invalid message type for offscreen:', message.type);
        return false;
    }
    
    console.log('Valid engine command, processing...');
    
    // Must return true to use asynchronous sendResponse
    (async () => {
        try {
            let result: any;

            switch (message.type) {
                case 'seedFromManifest':
                    console.log('Engine: Seeding from manifest...');
                    await engine.seedFromManifest();
                    result = undefined;
                    console.log('Engine: Seed completed');
                    break;
                    
                case 'searchTemplates':
                    console.log('Engine: Searching templates with:', message.payload);
                    result = await engine.searchTemplates(message.payload);
                    console.log('Engine: Search completed, results:', result);
                    break;
                    
                case 'recordEvent':
                    console.log('Engine: Recording event:', message.payload);
                    await engine.recordEvent(message.payload);
                    result = undefined;
                    console.log('Engine: Event recorded');
                    break;

                case 'getStatus':
                    console.log('Engine: Getting status...');
                    result = await engine.getStatus();
                    console.log('Engine: Status:', result);
                    break;
                    
                default:
                    const unknownMessage = message as any;
                    console.error('Engine: Unknown command:', unknownMessage.type);
                    throw new Error(`Unknown engine command: ${unknownMessage.type}`);
            }

            const response: EngineResponseMessage = { success: true, payload: result };
            console.log('Engine: Sending success response:', response);
            sendResponse(response);

        } catch (error: any) {
            console.error(`Engine Error on command ${message.type}:`, error);
            const response: EngineResponseMessage = { 
                success: false, 
                error: error.message || String(error)
            };
            console.log('Engine: Sending error response:', response);
            sendResponse(response);
        }
    })();
    
    return true; // Indicates to Chrome that sendResponse will be called asynchronously
});

console.log('Message listener registered');

// Initialize the Engine when OSD loads and notify the Service Worker
console.log('Initializing engine...');
engine.init()
    .then(async () => {
        console.log('Engine initialized successfully');
        try {
            await chrome.runtime.sendMessage({ type: 'ENGINE_READY' });
            console.log('ENGINE_READY signal sent to Service Worker');
        } catch (err) {
            console.error('Failed to send ENGINE_READY signal', err);
        }
    })
    .catch(e => console.error("Offscreen Engine Initialization Failed:", e));
