export async function GET(request: Request) {
  enum WidgetType {
    SEARCH = "search",
    POPUP = "popup",
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") as WidgetType) || WidgetType.POPUP;
  const buttonText = searchParams.get("buttonText") || "Ask AI";

  const domain =
    process.env.NODE_ENV === "development" ? "http://localhost:3000/" : "//" + request.headers.get("host") + "/";

  const commonStyles = `
    .ragrabbit-base {
      font-family: system-ui, -apple-system, sans-serif;
    }
    .ragrabbit-search-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .ragrabbit-search-input:focus {
      border-color: #0070f3;
      box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.1);
    }
  `;

  const popupStyles = `
    .ragrabbit-widget-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background-color: #0070f3;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }
    .ragrabbit-widget-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .ragrabbit-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
    }
    .ragrabbit-modal-content {
      position: fixed;
      right: 20px;
      bottom: 80px;
      width: 600px;
      height: 600px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }
    .ragrabbit-modal-content.centered {
      max-width: 56rem;
      margin: auto;
      right: 20%;
      left: 20%;
      top: 15%;
      bottom: 15%;
      height: 70%;
      width: auto;
    }
    .ragrabbit-close {
      position: absolute;
      top: 10px;
      right: 20px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }
    .ragrabbit-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  `;

  const popupScript = `
    (function() {
      if (document.getElementById('ragrabbit-button')) {
        return;
      }

      // Create styles
      const style = document.createElement('style');
      style.textContent = \`${commonStyles}${popupStyles}\`;
      style.id = 'ragrabbit-button-styles';
      document.head.appendChild(style);

      // Create button
      const button = document.createElement('button');
      button.className = 'ragrabbit-widget-button ragrabbit-base';
      button.id = 'ragrabbit-button';
      button.textContent = '${buttonText}';

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'ragrabbit-modal';
      modal.id = 'ragrabbit-button-modal';
      modal.innerHTML = \`
        <div class="ragrabbit-modal-content">
          <button class="ragrabbit-close">&times;</button>
          <iframe class="ragrabbit-iframe" src="${domain}widget/chat"></iframe>
        </div>
      \`;

      // Add event listeners
      button.addEventListener('click', () => {
        modal.style.display = 'block';
      });

      modal.querySelector('.ragrabbit-close').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });

      // Add elements to page
      document.body.appendChild(button);
      document.body.appendChild(modal);
    })();
  `;

  const searchStyles = `
    .ragrabbit-search-wrapper {
      position: relative;
      width: 100%;
    }
    .ragrabbit-search-input {
      width: 100%;
      padding: 8px 12px;
      padding-right: 80px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      background-color: #f1f5f9;
      transition: all 0.2s ease;
    }
    .ragrabbit-search-input:focus {
      background-color: white;
      border-color: #0070f3;
      box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.1);
    }
    .ragrabbit-keyboard-shortcut {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      padding: 2px 6px;
      background-color: white;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 12px;
      color: #64748b;
      pointer-events: none;
    }
  `;

  const searchScript = `
    (function() {
      function createStyles() {
        if (document.getElementById('ragrabbit-styles')) {
          return;
        }

        const style = document.createElement('style');
        style.textContent = \`${commonStyles}${searchStyles}${popupStyles}\`;
        style.id = 'ragrabbit-styles';
        document.head.appendChild(style);
      }

      function createModal() {
        if (document.getElementById('ragrabbit-modal')) {
          return document.getElementById('ragrabbit-modal');
        }

        // Create modal with centered content
        const modal = document.createElement('div');
        modal.className = 'ragrabbit-modal';
        modal.id = 'ragrabbit-modal';
        modal.innerHTML = \`
          <div class="ragrabbit-modal-content centered">
            <button class="ragrabbit-close">&times;</button>
            <iframe class="ragrabbit-iframe" src="${domain}widget/chat"></iframe>
          </div>
        \`;

        // Add modal event listeners
        modal.querySelector('.ragrabbit-close').addEventListener('click', () => {
          modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.style.display = 'none';
          }
        });
        document.body.appendChild(modal);
        return modal;
      }

      // Create mountSearch function
      window.mountSearch = function(divId, options) {
        const targetDiv = document.getElementById(divId);
        if (!targetDiv) {
          console.error('RagRabbit: Target div not found:', divId);
          return;
        }

        const defaultOptions = {
          searchPlaceholder: 'Search documentation...',
        };

        options = {
          ...defaultOptions,
          ...options,
        };

        // Create search wrapper and input
        const wrapper = document.createElement('div');
        wrapper.className = 'ragrabbit-search-wrapper ragrabbit-base';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ragrabbit-search-input ragrabbit-base';
        searchInput.placeholder = options.searchPlaceholder;

        const shortcut = document.createElement('span');
        shortcut.className = 'ragrabbit-keyboard-shortcut';
        shortcut.textContent = '⌘K';

        createStyles();

        // Add event listeners
        searchInput.addEventListener('click', () => {
          const modal = createModal();
          modal.style.display = 'block';
        });

        // Add keyboard shortcut
        document.addEventListener('keydown', (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const modal = createModal();
            modal.style.display = 'block';
          }
        });

        // Clear existing content and append elements
        targetDiv.innerHTML = '';
        wrapper.appendChild(searchInput);
        wrapper.appendChild(shortcut);
        targetDiv.appendChild(wrapper);
      };

      window.unmountSearch = function() {
        document.body.removeChild(document.getElementById('ragrabbit-modal'));
        document.body.removeChild(document.getElementById('ragrabbit-styles'));
      };

      class RagRabbitSearch extends HTMLElement {
        constructor() {
          super();
        }

        connectedCallback() {
          if (this.created) { return }
          this.created = true

          createStyles();

          this.innerHTML = "<div class='ragrabbit-search-wrapper ragrabbit-base'>" +
            "<input class='ragrabbit-search-input ragrabbit-base' type='text' placeholder='Search documentation...'>" +
            "<span class='ragrabbit-keyboard-shortcut'>⌘K</span>" +
            "</div>";

          // Add event listeners
          this.addEventListener('click', () => {
            const modal = createModal();
            modal.style.display = 'block';
          });

          // Add keyboard shortcut
          this.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              const modal = createModal();
              modal.style.display = 'block';
            }
          });
        }
      }

      // Register the custom element
      customElements.define('ragrabbit-search', RagRabbitSearch);

    })();
  `;

  const script = type === WidgetType.SEARCH ? searchScript : popupScript;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
