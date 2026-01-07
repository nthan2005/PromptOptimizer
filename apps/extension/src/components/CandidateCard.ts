// src/components/CandidateCard.ts

import { SearchResult } from '../ipc/EngineAPI';

// Define Web Component (Replace/Copy/Discard)
class CandidateCard extends HTMLElement {
    constructor(candidate: SearchResult, onAction: (action: 'REPLACE' | 'COPY' | 'DISCARD', id: string) => void) {
        super();
        this.attachShadow({ mode: 'open' });
        this.candidate = candidate;
        this.onAction = onAction;
        this.render();
    }

    private candidate: SearchResult;
    private onAction: (action: 'REPLACE' | 'COPY' | 'DISCARD', id: string) => void;

    private render() {
        const scorePercent = (this.candidate.score * 100).toFixed(1);

        // Full UI with action buttons
        this.shadowRoot!.innerHTML = `
            <style>
                :host { display: block; padding: 10px; border-bottom: 1px solid #eee; }
                .title { font-weight: bold; font-size: 1.1em; margin-bottom: 5px; color: #007bff; }
                .prompt-preview { font-size: 0.9em; color: #555; margin-bottom: 10px; white-space: pre-wrap; max-height: 50px; overflow: hidden; }
                .actions button { 
                    margin-right: 5px; 
                    padding: 4px 8px; 
                    cursor: pointer; 
                    border-radius: 4px; 
                }
                .replace-btn { background-color: #28a745; color: white; border: 1px solid #28a745; }
                .copy-btn { background-color: #ffc107; color: #333; border: 1px solid #ffc107; }
                .discard-btn { background-color: #dc3545; color: white; border: 1px solid #dc3545; }
            </style>
            
            <div class="card-content">
                <div class="title">${this.candidate.templateTitle} (${scorePercent}%)</div>
                <div class="prompt-preview">${this.candidate.filledPrompt.substring(0, 100)}...</div>
                <div class="actions">
                    <button class="replace-btn" data-action="REPLACE">🔁 Replace</button>
                    <button class="copy-btn" data-action="COPY">📋 Copy</button>
                    <button class="discard-btn" data-action="DISCARD">🗑️ Discard</button>
                </div>
            </div>
        `;
        
        //Event Listener
        this.shadowRoot!.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action as 'REPLACE' | 'COPY' | 'DISCARD';
                this.onAction(action, this.candidate.candidateId);
            });
        });
    }

    // Defined trong customElements
    static register() {
        if (!customElements.get('autoprompt-card')) {
            customElements.define('autoprompt-card', CandidateCard);
        }
    }
}

export default CandidateCard;