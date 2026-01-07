import { OFFSCREEN_DOCUMENT_PATH, EngineCallMessage, EngineResponseMessage } from './ipc/EngineAPI';

// Constants for reliability
const ENGINE_TIMEOUT_MS = 5000; 
const MAX_RETRIES = 3;

// -----------------------------------------------------------
// A. READY STATE AND PROMISE WAITING MECHANISM
// -----------------------------------------------------------

let isEngineReady = false;
let resolveEngineReady: (() => void) | null = null;
// Create a global Promise that the SW can wait on
const engineReadyPromise = new Promise<void>(resolve => {
    resolveEngineReady = resolve;
});

// Listen for the READY signal from the Offscreen Document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // We only care about messages coming from the OSD itself, not tabs
    if (sender.tab) {
        return false;
    }

    if (message.type === 'ENGINE_READY' && !isEngineReady) {
        isEngineReady = true;
        if (resolveEngineReady) {
            resolveEngineReady();
            console.log("Service Worker received ENGINE_READY signal. Engine is now fully ready.");
        }
    }
    // Must return false/undefined if not sending an async response
});

/**
 * Ensures the Offscreen Document (hosting the Engine) is running and initialized.
 */
async function ensureOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({
        // Cast ContextType and Reason to satisfy TypeScript requirements
        contextTypes: ['OFFSCREEN_DOCUMENT'] as chrome.runtime.ContextType[],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
    });

    if (contexts.length === 0) {
        // Case 1: OSD does not exist -> Create and wait for the READY signal
        try {
            await chrome.offscreen.createDocument({
                url: OFFSCREEN_DOCUMENT_PATH,
                reasons: ['WORKERS'] as chrome.offscreen.Reason[],
                justification: 'Host the AutoPrompt Engine and IndexedDB.',
            });
            console.log("OSD created. Waiting for Engine READY signal...");
            
            // Wait until the OSD sends the READY signal
            await engineReadyPromise; 

        } catch (error) {
            console.error("Failed to create Offscreen Document or wait for ready:", error);
            throw new Error("Failed to initialize OSD.");
        }
    } else {
        // Case 2: OSD already exists -> Assume ready state (must be initialized by OSD script)
        isEngineReady = true; 
        if (resolveEngineReady) {
            resolveEngineReady();
        }
    }
    
    // If not ready (for any reason), enforce waiting on the Promise (for safety)
    if (!isEngineReady) {
        await engineReadyPromise;
    }
}

// -----------------------------------------------------------
// B. TIMEOUT/RETRY LOGIC 🛡️ (S5 Enhancement)
// -----------------------------------------------------------

async function sendEngineMessageWithRetry(message: EngineCallMessage, retries = 0): Promise<EngineResponseMessage> {
    
    // Ensure OSD is created and the Engine is ready
    await ensureOffscreenDocument(); 

    try {
        // 1. Set up Timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Engine call timed out (T > 500ms).')), ENGINE_TIMEOUT_MS)
        );

        // 2. Send the message and wait for response or timeout
        const responsePromise = chrome.runtime.sendMessage(message) as Promise<EngineResponseMessage>;
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        // 3. Type Narrowing and Error Propagation
        if (response && response.success === true) {
            return response;
        } 
        
        // Handle explicit error response (success: false)
        if (response && response.success === false) {
             throw new Error(response.error); 
        }

        // Handle generic send failure (e.g., if OSD crashes)
        throw new Error("Engine returned an undefined or invalid response.");

    } catch (error: any) {
        if (retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * 100; // Exponential backoff
            console.warn(`Engine call failed. Retrying in ${delay}ms... (Attempt ${retries + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Recursive call to retry
            return sendEngineMessageWithRetry(message, retries + 1); 
        }
        
        // If all retries fail, throw the final error
        throw error; 
    }
}

// -----------------------------------------------------------
// C. ROUTER AND SEEDING 🔄
// -----------------------------------------------------------

// Trigger Seeding on install/upgrade
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`Extension installed/updated. Reason: ${details.reason}. Triggering initial seed.`);
    const seedMessage: EngineCallMessage = { type: 'seedFromManifest' };
    try {
        // Use Retry/Timeout logic for seeding
        await sendEngineMessageWithRetry(seedMessage);
        console.log("Initial seeding completed successfully.");
    } catch (error) {
        console.error("Seeding failed after all retries:", error);
    }
});

// Router (Handles messages from the Content Script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_ENGINE_STATUS') {
        (async () => {
            try {
                const response = await sendEngineMessageWithRetry({ type: 'getStatus' });
                sendResponse(response);
            } catch (error: any) {
                console.error("Engine status retrieval failed:", error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    // Only route messages that originate from the Content Script
    if (message.type === 'PROCESS_DRAFT' || message.type === 'RECORD_EVENT') {
        
        // Use an IIFE to handle the async logic and call sendResponse
        (async () => {
            try {
                // Map CS message type to OSD engine command type
                const engineRequest: EngineCallMessage = { 
                    type: message.type === 'PROCESS_DRAFT' ? 'searchTemplates' : 'recordEvent', 
                    payload: message.payload 
                } as EngineCallMessage; 
                
                // Use the Retry/Timeout wrapper function
                const response = await sendEngineMessageWithRetry(engineRequest);
                sendResponse(response); // Send response back to Content Script
                
            } catch (error: any) {
                console.error("Final Engine Error for CS:", error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Must return true to signal asynchronous response
    }
});
