import { generateRandomPolygon } from '../utils/helpers.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      background-color: #222;
      color: #eee;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .polygons-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      min-height: 150px;
    }
    #create-btn, #save-btn, #reset-btn {
      margin-right: 10px;
      padding: 8px 16px;
      background-color: #444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    #create-btn:hover, #save-btn:hover {
      background-color: #666;
    }
    #reset-btn {
      background-color: #822;
    }
    #reset-btn:hover {
      background-color: #a33;
    }
  </style>
  <div class="zone-title">Buffer Zone</div>
  <div class="controls">
    <button id="create-btn">Create Polygons</button>
    <button id="save-btn">Save</button>
    <button id="reset-btn">Reset</button>
  </div>
  <div class="polygons-container"></div>
`;

class BufferZone extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.container = this.shadowRoot.querySelector('.polygons-container');
    this.workspace = null;
  }

  connectedCallback() {
    this.shadowRoot.getElementById('create-btn').addEventListener('click', () => this.createPolygons());
    this.shadowRoot.getElementById('save-btn').addEventListener('click', () => this.savePolygons());
    this.shadowRoot.getElementById('reset-btn').addEventListener('click', () => this.resetPolygons());
    this.addEventListener('polygon-dropped', this.handlePolygonDrop);
    this.loadPolygons();
  }

  setWorkspace(workspace) {
    this.workspace = workspace;
  }

  handlePolygonDrop = (e) => {
    e.stopPropagation();
    const { polygon, clientX, clientY } = e.detail;

    if (!this.workspace) {
      console.error('Workspace not connected');
      this.returnPolygon(polygon);
      return;
    }

    const isInside = this.workspace.checkIfInside(clientX, clientY);
    if (isInside) {
      const newPolygon = polygon.cloneNode(true);
      this.workspace.addPolygonFromBuffer(newPolygon, clientX, clientY);

      if (polygon.parentNode === this.container) {
        this.container.removeChild(polygon);
      }
    } else {
      this.returnPolygon(polygon);
    }
  };

  returnPolygon(polygon) {
    polygon.style.transform = 'translate(0, 0)';
    if (!this.container.contains(polygon)) {
      this.container.appendChild(polygon);
    }
  }

  createPolygons() {
    this.clearContainer();
    const count = Math.floor(Math.random() * 16) + 5;
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    for (let i = 0; i < count; i++) {
      const polygonData = generateRandomPolygon(containerWidth, containerHeight);
      this.addPolygon(polygonData);
    }
  }

  addPolygon(polygonData) {
    const polygon = document.createElement('polygon-element');
    polygon.setAttribute('points', polygonData.points);
    polygon.setAttribute('fill', polygonData.fill);
    polygon.setAttribute('stroke', polygonData.stroke || '#000');
    polygon.setAttribute('stroke-width', polygonData.strokeWidth || '1');
    this.container.appendChild(polygon);
    return polygon;
  }

  savePolygons() {
    const polygonsData = Array.from(this.container.children).map(polygon => ({
      points: polygon.getAttribute('points'),
      fill: polygon.getAttribute('fill'),
      stroke: polygon.getAttribute('stroke'),
      strokeWidth: polygon.getAttribute('stroke-width')
    }));
    localStorage.setItem('bufferZonePolygons', JSON.stringify(polygonsData));
  }

  loadPolygons() {
    const savedData = localStorage.getItem('bufferZonePolygons');
    if (savedData) {
      try {
        const polygonsData = JSON.parse(savedData);
        this.clearContainer();
        polygonsData.forEach(data => this.addPolygon(data));
      } catch (e) {
        console.error('Failed to load polygons:', e);
      }
    }
  }

  resetPolygons() {
    if (confirm('Are you sure you want to reset all polygons?')) {
      localStorage.removeItem('bufferZonePolygons');
      this.clearContainer();
    }
  }

  clearContainer() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}

customElements.define('buffer-zone', BufferZone);
