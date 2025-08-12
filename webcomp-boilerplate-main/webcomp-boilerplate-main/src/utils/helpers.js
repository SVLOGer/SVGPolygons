export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

export function generateRandomPolygon(containerWidth, containerHeight) {
    const sides = getRandomInt(3, 8);
    const centerX = getRandomInt(50, containerWidth - 50);
    const centerY = getRandomInt(50, containerHeight - 50);
    const radius = getRandomInt(20, 50);

    let points = '';
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) + (Math.random() * 0.5 - 0.25);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points += `${x},${y} `;
    }

    return {
        points: points.trim(),
        fill: generateRandomColor(),
        stroke: '#000',
        strokeWidth: 1
    };
}

export function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

export function loadFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}