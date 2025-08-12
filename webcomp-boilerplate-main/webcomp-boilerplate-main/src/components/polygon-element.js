import { generateRandomColor } from '../utils/helpers.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      position: absolute;
      cursor: move;
      transform-origin: 0 0;
      will-change: transform;
      transition: transform 0.2s ease-out;
      z-index: 1;
    }
    svg {
      display: block;
      overflow: visible;
    }
    polygon {
      transition: fill 0.2s;
      vector-effect: non-scaling-stroke;
    }
    :host(:hover) polygon {
      filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
    }
    :host([dragging]) {
      z-index: 1000;
      transition: none;
      opacity: 0.8;
    }
  </style>
  <svg width="100" height="100">
    <polygon></polygon>
  </svg>
`;

class PolygonElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.svg = this.shadowRoot.querySelector('svg');
    this.polygon = this.shadowRoot.querySelector('polygon');

    this._dragging = false;
    this._startX = 0;
    this._startY = 0;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  static get observedAttributes() {
    return ['points', 'fill', 'stroke', 'stroke-width', 'data-x', 'data-y', 'data-scale'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'points') {
      this.polygon.setAttribute('points', newValue);
    } else if (name === 'fill') {
      this.polygon.setAttribute('fill', newValue);
    } else if (name === 'stroke') {
      this.polygon.setAttribute('stroke', newValue);
    } else if (name === 'stroke-width') {
      this.polygon.setAttribute('stroke-width', newValue);
    } else if (name.startsWith('data-')) {
      this.updatePosition();
    }
  }

  connectedCallback() {
    if (!this.hasAttribute('fill')) {
      this.setAttribute('fill', generateRandomColor());
    }
    this.addEventListener('mousedown', this.handleMouseDown);
    this.updatePosition();
  }

  updatePosition() {
    const x = parseFloat(this.getAttribute('data-x')) || 0;
    const y = parseFloat(this.getAttribute('data-y')) || 0;
    const scale = parseFloat(this.getAttribute('data-scale')) || 1;

    this.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
  }

  handleMouseDown(e) {
    e.preventDefault();
    this._dragging = true;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this.setAttribute('dragging', '');
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp, { once: true });
  }

  handleMouseMove(e) {
    if (!this._dragging) return;

    const scale = parseFloat(this.getAttribute('data-scale')) || 1

    const dx = (e.clientX - this._startX) / scale;
    const dy = (e.clientY - this._startY) / scale;

    this.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  handleMouseUp(e) {
    if (!this._dragging) return;
    this._dragging = false;
    this.removeAttribute('dragging');

    const event = new CustomEvent('polygon-dropped', {
      bubbles: true,
      composed: true,
      detail: {
        polygon: this,
        clientX: e.clientX,
        clientY: e.clientY
      }
    });
    this.dispatchEvent(event);

    document.removeEventListener('mousemove', this.handleMouseMove);
  }
}

customElements.define('polygon-element', PolygonElement);
