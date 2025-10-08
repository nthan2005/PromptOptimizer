// Offscreen Document - Engine Host

console.log('[OSD] Offscreen document loaded');

// Handle messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OSD] Received message:', message.type);

  if (message.type === 'OPTIMIZE_REQUEST') {
    handleOptimizeRequest(message)
      .then(sendResponse)
      .catch(error => {
        console.error('[OSD] Error processing request:', error);
        sendResponse({
          type: 'ERROR',
          id: message.id,
          timestamp: Date.now(),
          payload: { error: error.message },
        });
      });
    return true; // Async response
  }

  return false;
});

// Process optimize request
async function handleOptimizeRequest(message: any): Promise<any> {
  const startTime = performance.now();
  
  console.log('[OSD] Processing draft:', message.payload.draft.substring(0, 50) + '...');

  // Week 1: Return mock data
  const mockCards = [
    {
      filledText: `Enhanced: ${message.payload.draft}\n\nWith more context and clarity.`,
      templateId: 'mock-template-1',
      title: 'Add Context Template',
      unresolved: [],
    },
    {
      filledText: `Professional version:\n${message.payload.draft}\n\nFormatted for business use.`,
      templateId: 'mock-template-2',
      title: 'Professional Tone',
      unresolved: [],
    },
    {
      filledText: `Detailed expansion:\n${message.payload.draft}\n\nWith examples and explanations.`,
      templateId: 'mock-template-3',
      title: 'Detailed Explanation',
      unresolved: [],
    },
  ];

  const endTime = performance.now();

  return {
    type: 'OPTIMIZE_RESPONSE',
    id: message.id,
    timestamp: Date.now(),
    payload: {
      cards: mockCards,
      cacheKey: `mock-${Date.now()}`,
      timings: {
        total: endTime - startTime,
        retrieve: 10,
        fill: 5,
        rank: 2,
      },
    },
  };
}
export{};