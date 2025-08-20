const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      background-color: #222;
      color: #eee;
      padding: 20px;
      border-radius: 8px;
    }
    .workspace-container {
      position: relative;
      width: 100%;
      height: 500px;
      background-color: #333;
      background-image:
        linear-gradient(#444 1px, transparent 1px),
        linear-gradient(90deg, #444 1px, transparent 1px);
      background-size: 20px 20px;
      overflow: hidden;
      touch-action: none;
    }
    .workspace-content {
      position: absolute;
      transform-origin: 0 0;
      will-change: transform;
    }
    .polygons-container {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    .x-axis, .y-axis {
      position: absolute;
      background-color: rgba(0, 0, 0, 0.3);
      z-index: 10;
    }
    .x-axis {
      bottom: 0;
      left: 20px;
      width: calc(100% - 20px);
      height: 20px;
      border-top: 1px solid #666;
    }
    .y-axis {
      top: 0;
      left: 0;
      width: 20px;
      height: 100%;
      border-right: 1px solid #666;
    }
    .scale-mark {
      position: absolute;
      font-size: 10px;
      color: #aaa;
      font-family: Arial, sans-serif;
      user-select: none;
    }
    .x-axis .scale-mark {
      top: 2px;
      transform: translateX(-50%);
    }
    .y-axis .scale-mark {
      right: 2px;
      transform: translateY(50%);
    }
  </style>
  <div class="zone-title">Workspace</div>
  <div class="workspace-container">
    <div class="y-axis"></div>
    <div class="x-axis"></div>
    <div class="workspace-content">
      <div class="polygons-container"></div>
    </div>
  </div>
`;

class Workspace extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.container = this.shadowRoot.querySelector('.workspace-container');
    this.content = this.shadowRoot.querySelector('.workspace-content');
    this.polygonsContainer = this.shadowRoot.querySelector('.polygons-container');
    this.xAxis = this.shadowRoot.querySelector('.x-axis');
    this.yAxis = this.shadowRoot.querySelector('.y-axis');

    this.scale = 1;
    this.offset = { x: 0, y: 0 };
    this.isDragging = false;
    this.startDragPos = { x: 0, y: 0 };

    this.handleWheel = this.handleWheel.bind(this);
    this.startDrag = this.startDrag.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.endDrag = this.endDrag.bind(this);
    this.handlePolygonDrop = this.handlePolygonDrop.bind(this);
    this.updateContainerSize = this.updateContainerSize.bind(this);
  }

  connectedCallback() {
    this.updateContainerSize();
    this.polygonsContainer.addEventListener('polygon-dropped', this.handlePolygonDrop);
    this.container.addEventListener('wheel', this.handleWheel, { passive: false });
    this.container.addEventListener('mousedown', this.startDrag);
    window.addEventListener('resize', this.updateContainerSize);
    this.updateScaleMarks();
  }

  disconnectedCallback() {
    this.polygonsContainer.removeEventListener('polygon-dropped', this.handlePolygonDrop);
    this.container.removeEventListener('wheel', this.handleWheel);
    this.container.removeEventListener('mousedown', this.startDrag);
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('resize', this.updateContainerSize);
  }

  checkIfInside(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  addPolygonFromBuffer(polygon, clientX, clientY) {
    const rect = this.container.getBoundingClientRect();

    const polygonElement = polygon.shadowRoot.querySelector('polygon');
    const points = polygonElement.getAttribute('points').split(' ').map(coord => coord.split(',').map(Number));

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    points.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = (clientX - rect.left - this.offset.x) / this.scale - centerX;
    const y = (clientY - rect.top - this.offset.y) / this.scale - centerY;

    polygon.setAttribute('data-x', x);
    polygon.setAttribute('data-y', y);
    polygon.setAttribute('data-scale', this.scale);

    this.polygonsContainer.appendChild(polygon);
    this.updatePolygonPosition(polygon);
    return true;
  }

  addPolygon(polygonData) {
    const polygon = document.createElement('polygon-element');
    polygon.setAttribute('points', polygonData.points);
    polygon.setAttribute('fill', polygonData.fill);
    polygon.setAttribute('stroke', polygonData.stroke || '#000');
    polygon.setAttribute('stroke-width', polygonData.strokeWidth || '1');
    this.polygonsContainer.appendChild(polygon);
    return polygon;
  }

  updatePolygonPosition(polygon) {
    const x = parseFloat(polygon.getAttribute('data-x')) || 0;
    const y = parseFloat(polygon.getAttribute('data-y')) || 0;
    const scale = parseFloat(polygon.getAttribute('data-scale')) || 1;

    polygon.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
  }

  handlePolygonDrop(e) {
    e.stopPropagation();
    const { polygon, clientX, clientY } = e.detail;

    const bufferZone = this.shadowRoot.host.getRootNode().querySelector('buffer-zone');
    if (bufferZone) {
      const bufferRect = bufferZone.getBoundingClientRect();
      if (
        clientX >= bufferRect.left &&
        clientX <= bufferRect.right &&
        clientY >= bufferRect.top &&
        clientY <= bufferRect.bottom
      ) {
        const newPolygon = polygon.cloneNode(true);
        bufferZone.returnPolygon(newPolygon);
        polygon.remove();
        return;
      }
    }

    this.updatePolygonPosition(polygon);
  }

  clearContainer() {
    while (this.polygonsContainer.firstChild) {
      this.polygonsContainer.removeChild(this.polygonsContainer.firstChild);
    }
  }

  updateContainerSize() {
    const rect = this.container.getBoundingClientRect();
    this.content.style.width = `${rect.width}px`;
    this.content.style.height = `${rect.height}px`;
    this.updateScaleMarks();
  }

  updateScaleMarks() {
    this.xAxis.innerHTML = '';
    this.yAxis.innerHTML = '';

    const containerWidth = this.container.clientWidth - 20;
    const containerHeight = this.container.clientHeight;
    const step = this.getStepForScale();

    for (let x = 0; x <= containerWidth; x += step) {
      const mark = document.createElement('div');
      mark.className = 'scale-mark';
      mark.style.left = `${x}px`;
      mark.textContent = Math.round(x / this.scale).toString();
      this.xAxis.appendChild(mark);
    }

    for (let y = 0; y <= containerHeight; y += step) {
      const mark = document.createElement('div');
      mark.className = 'scale-mark';
      mark.style.bottom = `${y}px`;
      mark.textContent = Math.round(y / this.scale).toString();
      this.yAxis.appendChild(mark);
    }
  }

  getStepForScale() {
    if (this.scale < 0.5) return 200;
    if (this.scale < 1) return 100;
    if (this.scale < 2) return 50;
    return 25;
  }

  handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(0.1, this.scale + delta), 3);

    if (newScale !== this.scale) {
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const contentX = (mouseX - this.offset.x) / this.scale;
      const contentY = (mouseY - this.offset.y) / this.scale;

      this.scale = newScale;
      this.offset.x = mouseX - contentX * this.scale;
      this.offset.y = mouseY - contentY * this.scale;

      this.updateTransform();
      this.updateScaleMarks();
    }
  }

  updateTransform() {
    this.content.style.transform = `
            translate(${this.offset.x}px, ${this.offset.y}px)
            scale(${this.scale})
        `;

    this.polygonsContainer.querySelectorAll('polygon-element').forEach(polygon => {
      this.updatePolygonPosition(polygon);
    });
  }

  startDrag(e) {
    if (e.button !== 0 || e.target !== this.container) return;
    e.preventDefault();
    this.isDragging = true;
    this.startDragPos = {
      x: e.clientX - this.offset.x,
      y: e.clientY - this.offset.y
    };
    this.container.classList.add('grabbing');
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.endDrag);
  }

  onDrag(e) {
    if (!this.isDragging) return;
    this.offset.x = e.clientX - this.startDragPos.x;
    this.offset.y = e.clientY - this.startDragPos.y;
    this.updateTransform();
  }

  endDrag() {
    this.isDragging = false;
    this.container.classList.remove('grabbing');
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.endDrag);
  }
}

customElements.define('workspace-zone', Workspace);
