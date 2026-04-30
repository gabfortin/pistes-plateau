const TYPE_DEFINITIONS = {
  '1a':  { label: 'Chaussée désignée',                                                              color: '#c52222', weight: 3, dashArray: '8 5', arrow: true  },
  '1b':  { label: 'Chaussée désignée dans les deux sens',                                          color: '#c52222', weight: 3, dashArray: '8 5'  },
  '2a': { label: 'Chaussée désignée + bande cyclable en sens inverse',                            color: '#f97316', weight: 3, dashArray: '8 5'  },
  '2b': { label: 'Chaussée désignée + bande cyclable en sens inverse (protégée)',                 color: '#22c55e', weight: 4, dashArray: '8 5'  },
  '3a': { label: 'Vélo rue unidirectionnelle',                                                    color: '#3b82f6', weight: 4, dashArray: '14 5', arrow: true },
  '3b': { label: 'Vélo rue bidirectionnelle',                                                     color: '#1d4ed8', weight: 5, dashArray: null   },
  '4a': { label: 'Bande cyclable dans le sens des voitures seulement',                           color: '#d97706', weight: 4, dashArray: '12 4', arrow: true },
  '4b': { label: 'Bande cyclable à sens inverse seulement',                                      color: '#d97706', weight: 4, dashArray: '12 4', arrow: true },
  '5a':  { label: 'Bandes cyclables dans chaque direction, collées sur stationnement',                                       color: '#ee9313', weight: 4, dashArray: '12 4' },
  '5b':  { label: 'Bandes cyclables dans chaque direction, sans stationnement, ou avec espacement',                                       color: '#fff700', weight: 4, dashArray: '12 4' },
  '5c':  { label: 'Bandes cyclables dans chaque direction, avec une certaine protection',                                       color: '#7dea08', weight: 4, dashArray: '12 4' },
  '6a': { label: 'Piste bidirectionnelle',                                                        color: '#16a34a', weight: 6, dashArray: null   },
  '6b': { label: 'Piste bidirectionnelle protégée',                                              color: '#14532d', weight: 8, dashArray: null   },
  '7':  { label: 'Piste unidirectionnelle protégée',                                             color: '#0891b2', weight: 6, dashArray: null,   arrow: true },
  '8':  { label: 'Deux pistes unidirectionnelles protégées',                                     color: '#164e63', weight: 8, dashArray: null   },
};

const TYPE_ORDER = ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '5c', '6a', '6b', '7', '8'];

const INTERSECTION_TYPES = {
  '1': { label: 'Intersection non gérée',   color: '#ef4444', dashArray: null },
  '2': { label: 'Absence de cycle protégé', color: '#ef4444', dashArray: '5 4' },
};

// ── Map setup ─────────────────────────────────────────────────────────────────

const map = L.map('map').setView([45.5202, -73.5862], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

// ── State ─────────────────────────────────────────────────────────────────────

map.createPane('intersectionsPane');
map.getPane('intersectionsPane').style.zIndex = 450;

let layerGroup = L.layerGroup().addTo(map);
let intersectionLayerGroup = L.layerGroup().addTo(map);
let activeListItem = null;
let polylineRefs = [];
let circleRefs = [];

const CIRCLE_BASE_RADIUS = 7;
const CIRCLE_MIN_RADIUS = 5;

function weightForZoom(base, zoom) {
  return base * Math.max(1, 1 + (zoom - 14) * 0.25);
}

function radiusForZoom(zoom) {
  return Math.max(CIRCLE_MIN_RADIUS, CIRCLE_BASE_RADIUS + (zoom - 14) * 1.5);
}

map.on('zoomend', () => {
  const zoom = map.getZoom();
  polylineRefs.forEach(({ polyline, baseWeight }) => {
    polyline.setStyle({ weight: weightForZoom(baseWeight, zoom) });
  });
  const r = radiusForZoom(zoom);
  circleRefs.forEach((circle) => circle.setRadius(r));
});

// ── Parser ────────────────────────────────────────────────────────────────────

function parsePistes(text) {
  const pistes = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (line.startsWith('## ')) {
      if (current && current.coords.length >= 2) pistes.push(current);
      current = { name: line.slice(3).trim(), type: null, coords: [] };
      continue;
    }

    if (!current) continue;

    const typeMatch = line.match(/^type\s*:+\s*(\w+)/i);
    if (typeMatch) {
      current.type = typeMatch[1].toLowerCase();
      continue;
    }

    const coordMatch = line.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordMatch) {
      current.coords.push([parseFloat(coordMatch[1]), parseFloat(coordMatch[2])]);
    }
  }

  if (current && current.coords.length >= 2) pistes.push(current);
  return pistes;
}

// ── Intersection parser ───────────────────────────────────────────────────────

function parseIntersections(text) {
  const intersections = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (line.startsWith('## ')) {
      if (current && current.coord) intersections.push(current);
      current = { name: line.slice(3).trim(), type: null, coord: null };
      continue;
    }

    if (!current) continue;

    const typeMatch = line.match(/^type\s*:+\s*(\w+)/i);
    if (typeMatch) { current.type = typeMatch[1]; continue; }

    const coordMatch = line.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordMatch && !current.coord) {
      current.coord = [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
    }
  }

  if (current && current.coord) intersections.push(current);
  return intersections;
}

// ── Intersection renderer ─────────────────────────────────────────────────────

function renderIntersections(intersections) {
  intersectionLayerGroup.clearLayers();
  circleRefs = [];

  const listEl = document.getElementById('intersection-list');
  const countEl = document.getElementById('intersection-count');
  listEl.innerHTML = '';

  if (intersections.length === 0) {
    countEl.textContent = '';
    return;
  }

  countEl.textContent = `(${intersections.length})`;

  intersections.forEach((inter) => {
    const def = INTERSECTION_TYPES[inter.type] ?? INTERSECTION_TYPES['1'];

    const circleOptions = {
      radius: radiusForZoom(map.getZoom()),
      color: '#7f1d1d',
      weight: 2,
      opacity: 1,
      fillColor: def.color,
      fillOpacity: 0.85,
      pane: 'intersectionsPane',
    };
    if (def.dashArray) circleOptions.dashArray = def.dashArray;

    const circle = L.circleMarker(inter.coord, circleOptions);
    circleRefs.push(circle);
    circle.bindPopup(`
      <strong>${inter.name}</strong><br/>
      <span style="color:#dc2626;font-size:12px">⚠ ${def.label}</span>
    `);
    intersectionLayerGroup.addLayer(circle);

    const li = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = 'piste-dot';
    dot.style.background = def.color;

    const nameEl = document.createElement('span');
    nameEl.className = 'piste-name';
    nameEl.textContent = inter.name;

    const badge = document.createElement('span');
    badge.className = 'piste-type-badge intersection-badge';
    badge.textContent = `T${inter.type}`;

    li.appendChild(dot);
    li.appendChild(nameEl);
    li.appendChild(badge);

    li.addEventListener('click', () => {
      map.setView(inter.coord, 17);
      circle.openPopup();
      if (window.innerWidth < 768) closeSidebar();
    });

    listEl.appendChild(li);
  });
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderPistes(pistes) {
  layerGroup.clearLayers();
  polylineRefs = [];

  const listEl = document.getElementById('piste-list');
  const countEl = document.getElementById('piste-count');
  listEl.innerHTML = '';
  activeListItem = null;

  if (pistes.length === 0) {
    countEl.textContent = '';
    listEl.innerHTML = '<li class="empty-hint">Aucune piste trouvée.</li>';
    return;
  }

  countEl.textContent = `(${pistes.length})`;

  pistes.forEach((piste, i) => {
    const def = TYPE_DEFINITIONS[piste.type] ?? {
      label: `Type ${piste.type}`,
      color: '#6b7280',
      weight: 4,
      dashArray: null,
    };

    const polylineOptions = {
      color: def.color,
      weight: weightForZoom(def.weight, map.getZoom()),
      opacity: 0.85,
    };
    if (def.dashArray) polylineOptions.dashArray = def.dashArray;

    const polyline = L.polyline(piste.coords, polylineOptions);
    polylineRefs.push({ polyline, baseWeight: def.weight });
    polyline.bindPopup(`
      <strong>${piste.name}</strong><br/>
      <span style="color:#6b7280;font-size:12px">Type ${piste.type} — ${def.label}</span>
    `);
    layerGroup.addLayer(polyline);

    if (def.arrow) {
      const decorator = L.polylineDecorator(polyline, {
        patterns: [{
          offset: '10%',
          repeat: '20%',
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: def.color,
              weight: 2.5,
              opacity: 1,
            },
          }),
        }],
      });
      layerGroup.addLayer(decorator);
    }

    // Sidebar list item
    const li = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = 'piste-dot';
    dot.style.background = def.color;

    const nameEl = document.createElement('span');
    nameEl.className = 'piste-name';
    nameEl.textContent = piste.name;

    const badge = document.createElement('span');
    badge.className = 'piste-type-badge';
    badge.textContent = `T${piste.type}`;

    li.appendChild(dot);
    li.appendChild(nameEl);
    li.appendChild(badge);

    li.addEventListener('click', () => {
      if (activeListItem) activeListItem.classList.remove('active');
      li.classList.add('active');
      activeListItem = li;
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      polyline.openPopup();
      if (window.innerWidth < 768) closeSidebar();
    });

    listEl.appendChild(li);
  });
}

// ── Legend ────────────────────────────────────────────────────────────────────

function buildLegend() {
  const container = document.getElementById('legend-items');

  TYPE_ORDER.forEach((typeNum) => {
    const def = TYPE_DEFINITIONS[typeNum];
    const item = document.createElement('div');
    item.className = 'legend-item';

    const wrap = document.createElement('div');
    wrap.className = 'legend-line-wrap';

    const line = document.createElement('div');
    line.className = 'legend-line';
    line.style.height = `${Math.max(def.weight, 3)}px`;
    line.style.background = def.dashArray
      ? buildDashGradient(def.color, def.dashArray)
      : def.color;

    wrap.appendChild(line);

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = `${typeNum}. ${def.label}`;
    if (def.arrow) {
      const arrow = document.createElement('span');
      arrow.className = 'legend-arrow';
      arrow.textContent = '→';
      label.appendChild(arrow);
    }

    item.appendChild(wrap);
    item.appendChild(label);
    container.appendChild(item);
  });

  const sep = document.createElement('div');
  sep.className = 'legend-separator';
  container.appendChild(sep);

  Object.entries(INTERSECTION_TYPES).forEach(([typeNum, def]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const wrap = document.createElement('div');
    wrap.className = 'legend-circle-wrap';

    const circle = document.createElement('div');
    circle.className = 'legend-circle';
    circle.style.background = def.color;
    if (def.dashArray) circle.style.outline = '2px dashed #7f1d1d';
    else circle.style.outline = '2px solid #7f1d1d';

    wrap.appendChild(circle);

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = `${typeNum}. ${def.label}`;

    item.appendChild(wrap);
    item.appendChild(label);
    container.appendChild(item);
  });
}

function buildDashGradient(color, dashArray) {
  const [dash, gap] = dashArray.split(' ').map(Number);
  const total = dash + gap;
  const pct = (dash / total) * 100;
  return `repeating-linear-gradient(to right, ${color} 0%, ${color} ${pct}%, transparent ${pct}%, transparent 100%)`;
}

// ── File loading ──────────────────────────────────────────────────────────────

function loadText(text) {
  const pistes = parsePistes(text);
  renderPistes(pistes);
}

document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => loadText(ev.target.result);
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('intersection-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => renderIntersections(parseIntersections(ev.target.result));
  reader.readAsText(file);
  e.target.value = '';
});

// ── Mobile sidebar toggle ─────────────────────────────────────────────────────

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
const closeBtn = document.getElementById('close-btn');
const overlay = document.getElementById('overlay');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
}

toggleBtn.addEventListener('click', openSidebar);
closeBtn.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// ── Init ──────────────────────────────────────────────────────────────────────

buildLegend();

fetch('https://raw.githubusercontent.com/gabfortin/pistes-plateau/refs/heads/main/pistes.md')
  .then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.text();
  })
  .then(loadText)
  .catch(() => {
    document.getElementById('piste-list').innerHTML =
      '<li class="empty-hint">Chargez un fichier pistes.md.</li>';
  });

fetch('https://raw.githubusercontent.com/gabfortin/pistes-plateau/refs/heads/main/intersections.md')
  .then((r) => r.ok ? r.text() : Promise.reject())
  .then((text) => renderIntersections(parseIntersections(text)))
  .catch(() => {});
