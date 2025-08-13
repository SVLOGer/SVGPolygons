const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background-color: #1a1a1a;
      padding: 20px;
      box-sizing: border-box;
    }
  </style>
  <buffer-zone></buffer-zone>
  <workspace-zone></workspace-zone>
`;

class AppContainer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    Promise.all([
      customElements.whenDefined('buffer-zone'),
      customElements.whenDefined('workspace-zone')
    ]).then(() => {
      const bufferZone = this.shadowRoot.querySelector('buffer-zone');
      const workspaceZone = this.shadowRoot.querySelector('workspace-zone');

      if (bufferZone && workspaceZone) {
        bufferZone.setWorkspace(workspaceZone);
      }
    });
  }
}

customElements.define('app-container', AppContainer);
