/**
 * Strava Accordion JavaScript
 * Gestisce l'accordion per gli shortcode Strava e il caricamento lazy degli iframe
 */

(function() {
    'use strict';

    // Stato per tracciare gli embed già caricati
    const loadedEmbeds = new Set();

    /**
     * Carica lo script Strava embed se non è già stato caricato
     */
    function loadStravaEmbedScript() {
        return new Promise((resolve) => {
            // Controlla se lo script è già presente
            if (document.querySelector('script[src*="strava-embeds.com"]')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://strava-embeds.com/embed.js';
            script.onload = resolve;
            script.onerror = resolve; // Risolvi anche in caso di errore per non bloccare
            document.head.appendChild(script);
        });
    }

    /**
     * Carica l'embed Strava per un accordion specifico
     */
    async function loadStravaEmbed(accordion) {
        const activityId = accordion.dataset.activityId;
        
        // Se già caricato, non ricaricare
        if (loadedEmbeds.has(activityId)) {
            return;
        }

        try {
            // Carica lo script Strava se necessario
            await loadStravaEmbedScript();
            
            // Trova il placeholder nell'accordion
            const placeholder = accordion.querySelector('.strava-embed-placeholder');
            if (!placeholder) {
                return;
            }

            // Marca come caricato per evitare duplicati
            loadedEmbeds.add(activityId);

            // Se esiste window.StravaEmbeds, inizializza l'embed
            if (window.StravaEmbeds && window.StravaEmbeds.initEmbed) {
                window.StravaEmbeds.initEmbed(placeholder);
            } else {
                // Fallback: ricrea il placeholder con gli attributi giusti
                placeholder.innerHTML = '';
                placeholder.setAttribute('data-embed-type', 'activity');
                placeholder.setAttribute('data-embed-id', activityId);
                placeholder.setAttribute('data-style', 'standard');
                
                // Trigger dell'inizializzazione se lo script è disponibile
                if (window.StravaEmbeds && window.StravaEmbeds.init) {
                    window.StravaEmbeds.init();
                }
            }
        } catch (error) {
            console.warn('Errore nel caricamento dell\'embed Strava:', error);
        }
    }

    /**
     * Gestisce il toggle dell'accordion
     */
    function toggleAccordion(toggle, content) {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const toggleText = toggle.querySelector('.strava-toggle-text');
        
        if (isExpanded) {
            // Chiudi l'accordion
            content.classList.add('closing');
            content.classList.remove('opening');
            
            setTimeout(() => {
                content.style.display = 'none';
                content.classList.remove('closing');
            }, 300);
            
            toggle.setAttribute('aria-expanded', 'false');
            if (toggleText) {
                toggleText.textContent = 'Mostra dettagli';
            }
        } else {
            // Apri l'accordion
            content.style.display = 'block';
            content.classList.add('opening');
            content.classList.remove('closing');
            
            setTimeout(() => {
                content.classList.remove('opening');
            }, 300);
            
            toggle.setAttribute('aria-expanded', 'true');
            if (toggleText) {
                toggleText.textContent = 'Nascondi dettagli';
            }
            
            // Carica l'embed Strava quando viene aperto per la prima volta
            const accordion = toggle.closest('.strava-accordion');
            if (accordion) {
                loadStravaEmbed(accordion);
            }
        }
    }

    /**
     * Inizializza tutti gli accordion Strava nella pagina
     */
    function initStravaAccordions() {
        const accordions = document.querySelectorAll('.strava-accordion');
        
        accordions.forEach(accordion => {
            const toggle = accordion.querySelector('.strava-accordion-toggle');
            const content = accordion.querySelector('.strava-accordion-content');
            
            if (!toggle || !content) {
                return;
            }

            // Aggiungi event listener per il toggle
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleAccordion(toggle, content);
            });

            // Inizializza lo stato
            toggle.setAttribute('aria-expanded', 'false');
            content.style.display = 'none';
        });
    }

    // Inizializza quando il DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStravaAccordions);
    } else {
        initStravaAccordions();
    }

    // Re-inizializza se vengono aggiunti nuovi elementi dinamicamente
    // (utile per temi che caricano contenuto via AJAX)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.querySelector && node.querySelector('.strava-accordion')) {
                    initStravaAccordions();
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();