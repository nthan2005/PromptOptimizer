(function(){console.log("[CS] Content script loaded");const h='#prompt-textarea, textarea[placeholder*="Message"], textarea',p="prompt-optimizer-btn",u="prompt-optimizer-overlay";let a=null,o=null;function d(){console.log("[CS] Initializing...");const e=m();if(!e){console.log("[CS] Textarea not found, will retry..."),setTimeout(d,1e3);return}console.log("[CS] Textarea found:",e),v(e),C()}function m(){const e=document.querySelectorAll(h);for(const t of e)if(t instanceof HTMLTextAreaElement&&t.offsetParent!==null)return t;return null}function v(e){if(document.getElementById(p)){console.log("[CS] Button already exists");return}o=document.createElement("button"),o.id=p,o.textContent="✨ Optimize",o.style.cssText=`
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
  `,o.addEventListener("mouseenter",()=>{o&&(o.style.transform="translateY(-2px)",o.style.boxShadow="0 4px 12px rgba(102, 126, 234, 0.4)")}),o.addEventListener("mouseleave",()=>{o&&(o.style.transform="translateY(0)",o.style.boxShadow="0 2px 8px rgba(102, 126, 234, 0.3)")}),o.addEventListener("click",w),b(e),document.body.appendChild(o),console.log("[CS] Optimize button injected"),window.addEventListener("resize",()=>b(e))}function b(e){if(!o)return;const t=e.getBoundingClientRect();o.style.top=`${t.bottom+window.scrollY+8}px`,o.style.left=`${t.left+window.scrollX}px`}async function w(){console.log("[CS] Optimize button clicked");const e=m();if(!e||!e.value.trim()){c("Please enter some text first","warning");return}const t=e.value;console.log("[CS] Draft length:",t.length),o&&(o.textContent="⏳ Optimizing...",o.disabled=!0);try{const n=await E({type:"OPTIMIZE_REQUEST",id:S(),timestamp:Date.now(),payload:{draft:t,site:"chatgpt",lang:"en"}});console.log("[CS] Received response:",n),k(n.payload.cards,e)}catch(n){console.error("[CS] Error:",n),c("Failed to optimize. Please try again.","error")}finally{o&&(o.textContent="✨ Optimize",o.disabled=!1)}}function E(e){return new Promise((t,n)=>{chrome.runtime.sendMessage(e,i=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):t(i)})})}function C(){if(document.getElementById(u)){console.log("[CS] Overlay container already exists");return}const e=document.createElement("div");e.id=u,a=e.attachShadow({mode:"open"});const t=document.createElement("style");t.textContent=`
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
  `,a.appendChild(t);const n=document.createElement("div");n.className="overlay-backdrop",n.innerHTML=`
    <div class="overlay-content">
      <div class="overlay-header">
        <h2 class="overlay-title">✨ Optimized Prompts</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="cards-container"></div>
    </div>
  `,a.appendChild(n),n.addEventListener("click",s=>{s.target===n&&l()}),a.querySelector(".close-btn")?.addEventListener("click",l),document.body.appendChild(e),console.log("[CS] Overlay container created with Shadow DOM")}function k(e,t){if(!a)return;const n=a.querySelector(".overlay-backdrop"),i=a.querySelector(".cards-container");!n||!i||(i.innerHTML="",e.forEach(s=>{const r=document.createElement("div");r.className="card",r.innerHTML=`
      <div class="card-header">
        <span class="card-title">${f(s.title)}</span>
      </div>
      <div class="card-body">${f(s.filledText)}</div>
      <div class="card-actions">
        <button class="btn btn-replace" data-action="replace">Replace</button>
        <button class="btn btn-copy" data-action="copy">Copy</button>
        <button class="btn btn-discard" data-action="discard">Discard</button>
      </div>
    `;const x=r.querySelector('[data-action="replace"]'),g=r.querySelector('[data-action="copy"]'),y=r.querySelector('[data-action="discard"]');x?.addEventListener("click",()=>{t.value=s.filledText,t.dispatchEvent(new Event("input",{bubbles:!0})),l(),c("Prompt replaced!","success")}),g?.addEventListener("click",()=>{navigator.clipboard.writeText(s.filledText),c("Copied to clipboard!","success")}),y?.addEventListener("click",()=>{r.remove(),c("Card discarded","info")}),i.appendChild(r)}),n.classList.add("show"))}function l(){if(!a)return;a.querySelector(".overlay-backdrop")?.classList.remove("show")}function c(e,t="info"){const n=document.createElement("div");n.textContent=e,n.style.cssText=`
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    background: ${t==="success"?"#10b981":t==="error"?"#ef4444":t==="warning"?"#f59e0b":"#3b82f6"};
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 1000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideInRight 0.3s;
  `,document.body.appendChild(n),setTimeout(()=>{n.style.animation="slideOutRight 0.3s",setTimeout(()=>n.remove(),300)},3e3)}function f(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function S(){return`${Date.now()}-${Math.random().toString(36).substr(2,9)}`}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d();
})()
