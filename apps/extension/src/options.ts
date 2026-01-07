// ----------------------------------------------------
// 1. CONSTANTS & INTERFACE (Type Safety)
// ----------------------------------------------------

const SAVE_BUTTON_ID = 'save-settings';
const STATUS_MESSAGE_ID = 'status-message';
const RETRIEVAL_WEIGHT_ID = 'retrieval-weight';
const ENABLE_EXTENSION_ID = 'enable-extension'; // Added ID for the toggle

/**
 * Interface for small preferences (settings) saved in chrome.storage.local.
 */
interface Preferences {
    retrievalWeight: number;
    enableExtension: boolean;
    // Add other small settings here if needed
}

// ----------------------------------------------------
// 2. LIFECYCLE HOOKS
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    
    const saveButton = document.getElementById(SAVE_BUTTON_ID);
    if (saveButton) {
        saveButton.addEventListener('click', savePreferences);
    }
    
    // Logic for Import/Export (shell only in S3)
    const exportButton = document.getElementById('export-packs');
    if (exportButton) {
        // This will require a request via the Service Worker to the Engine (B) to aggregate and export
        exportButton.addEventListener('click', () => console.log("Export triggered. Implementation pending in S6."));
    }
});

// ----------------------------------------------------
// 3. LOGIC
// ----------------------------------------------------

/**
 * Loads and displays small preferences from chrome.storage.local.
 */
async function loadPreferences() {
    // 1. Fetch data
    const data = await chrome.storage.local.get(['prefs']);
    
    // 2. Define complete default values
    const defaultPrefs: Preferences = {
        retrievalWeight: 0.8, 
        enableExtension: true,
    };

    // 3. Merge saved and default data
    // Data in storage (data.prefs) will override default values.
    const savedPrefs: Partial<Preferences> = data.prefs || {};
    
    const prefs: Preferences = {
        ...defaultPrefs,
        ...savedPrefs,
    } as Preferences; 

    // Load Retrieval Weight
    const weightInput = document.getElementById(RETRIEVAL_WEIGHT_ID) as HTMLInputElement;
    if (weightInput) {
        weightInput.value = String(prefs.retrievalWeight); 
    }
    
    // Load Enable Toggle
    const enableToggle = document.getElementById(ENABLE_EXTENSION_ID) as HTMLInputElement;
    if (enableToggle) {
        enableToggle.checked = prefs.enableExtension; 
    }
}

/**
 * Saves small preferences to chrome.storage.local.
 */
async function savePreferences() {
    const weightInput = document.getElementById(RETRIEVAL_WEIGHT_ID) as HTMLInputElement;
    const enableToggle = document.getElementById(ENABLE_EXTENSION_ID) as HTMLInputElement;

    // Create a new prefs object and ensure type safety
    const newPrefs: Preferences = { 
        retrievalWeight: parseFloat(weightInput.value),
        enableExtension: enableToggle.checked,
    };

    // Save to chrome.storage.local
    await chrome.storage.local.set({ prefs: newPrefs });
    
    // Display saved message
    const statusEl = document.getElementById(STATUS_MESSAGE_ID);
    if (statusEl) {
        statusEl.textContent = 'Preferences saved!';
        setTimeout(() => statusEl.textContent = '', 2000);
    }
}