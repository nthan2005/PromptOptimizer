import"./modulepreload-polyfill-B5Qt9EMX.js";console.log("[OSD] Offscreen document loaded");chrome.runtime.onMessage.addListener((e,a,t)=>(console.log("[OSD] Received message:",e.type),e.type==="OPTIMIZE_REQUEST"?(n(e).then(t).catch(o=>{console.error("[OSD] Error processing request:",o),t({type:"ERROR",id:e.id,timestamp:Date.now(),payload:{error:o.message}})}),!0):!1));async function n(e){const a=performance.now();console.log("[OSD] Processing draft:",e.payload.draft.substring(0,50)+"...");const t=[{filledText:`Enhanced: ${e.payload.draft}

With more context and clarity.`,templateId:"mock-template-1",title:"Add Context Template",unresolved:[]},{filledText:`Professional version:
${e.payload.draft}

Formatted for business use.`,templateId:"mock-template-2",title:"Professional Tone",unresolved:[]},{filledText:`Detailed expansion:
${e.payload.draft}

With examples and explanations.`,templateId:"mock-template-3",title:"Detailed Explanation",unresolved:[]}],o=performance.now();return{type:"OPTIMIZE_RESPONSE",id:e.id,timestamp:Date.now(),payload:{cards:t,cacheKey:`mock-${Date.now()}`,timings:{total:o-a,retrieve:10,fill:5,rank:2}}}}
