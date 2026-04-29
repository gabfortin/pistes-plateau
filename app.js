const TYPE_DEFINITIONS = {
  '1a':  { label: 'Chaussée désignée',                                                              color: '#c52222', weight: 3, dashArray: '8 5'  },
  '1b':  { label: 'Chaussée désignée dans les deux sens',                                          color: '#c52222', weight: 3, dashArray: '8 5'  },
  '2a': { label: 'Chaussée désignée + bande cyclable en sens inverse',                            color: '#f97316', weight: 3, dashArray: '8 5'  },
  '2b': { label: 'Chaussée désignée + bande cyclable en sens inverse (protégée)',                 color: '#22c55e', weight: 4, dashArray: '8 5'  },
  '3a': { label: 'Vélo rue unidirectionnelle',                                                    color: '#3b82f6', weight: 4, dashArray: '14 5', arrow: true },
  '3b': { label: 'Vélo rue bidirectionnelle',                                                     color: '#1d4ed8', weight: 5, dashArray: null   },
  '4a': { label: 'Bande cyclable dans le sens des voitures seulement',                           color: '#d97706', weight: 4, dashArray: '12 4', arrow: true },
  '4b': { label: 'Bande cyclable à sens inverse seulement',                                      color: '#d97706', weight: 4, dashArray: '12 4', arrow: true },
  '5a':  { label: 'Bandes cyclables dans chaque direction, collées sur stationnement',                                       color: '#eab308', weight: 4, dashArray: '12 4' },
  '5b':  { label: 'Bandes cyclables dans chaque direction, avec espacement',                                       color: '#fff700', weight: 4, dashArray: '12 4' },
  '5c':  { label: 'Bandes cyclables dans chaque direction, avec une certaine protection',                                       color: '#7dea08', weight: 4, dashArray: '12 4' },
  '6a': { label: 'Piste bidirectionnelle',                                                        color: '#16a34a', weight: 6, dashArray: null   },
  '6b': { label: 'Piste bidirectionnelle protégée',                                              color: '#14532d', weight: 8, dashArray: null   },
  '7':  { label: 'Piste unidirectionnelle protégée',                                             color: '#0891b2', weight: 6, dashArray: null,   arrow: true },
  '8':  { label: 'Deux pistes unidirectionnelles protégées',                                     color: '#164e63', weight: 8, dashArray: null   },
};

const TYPE_ORDER = ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5', '6a', '6b', '7', '8'];

// ── Map setup ─────────────────────────────────────────────────────────────────

const map = L.map('map').setView([45.5202, -73.5862], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

// ── State ─────────────────────────────────────────────────────────────────────

let layerGroup = L.layerGroup().addTo(map);
let activeListItem = null;

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

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderPistes(pistes) {
  layerGroup.clearLayers();

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
      weight: def.weight,
      opacity: 0.85,
    };
    if (def.dashArray) polylineOptions.dashArray = def.dashArray;

    const polyline = L.polyline(piste.coords, polylineOptions);
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
