const TYPE_DEFINITIONS = {
  '1a':  { label: 'Chaussée désignée',                                                              color: '#c52222', weight: 3, dashArray: '8 5', arrow: true  },
  '1b':  { label: 'Chaussée désignée dans les deux sens',                                          color: '#c52222', weight: 3, dashArray: '8 5'  },
  '1c':  { label: 'Trottoir permettant la circulation à vélo',                                     color: '#a3e635', weight: 3, dashArray: '8 5'  },
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
  '6c': { label: 'Piste bidirectionnelle partagée avec piétons',                                 color: '#a3e635', weight: 6, dashArray: null   },
  '7':  { label: 'Piste unidirectionnelle protégée',                                             color: '#0891b2', weight: 6, dashArray: null,   arrow: true },
  '8':  { label: 'Deux pistes unidirectionnelles protégées',                                     color: '#164e63', weight: 8, dashArray: null   },
};

const TYPE_ORDER = ['1a', '1b', '1c', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '5c', '6a', '6b', '6c', '7', '8'];

const INTERSECTION_TYPES = {
  '1': { label: 'Intersection non gérée',   color: '#ef4444', dashArray: null, description: 'Aucun feu de circulation ni panneau d\'arrêt ne protège les déplacements cyclistes' },
  '2': { label: 'Absence de cycle protégé', color: '#c57d6d', dashArray: '5 4' },
};

// ── Map setup ─────────────────────────────────────────────────────────────────

const map = L.map('map', { zoomControl: false }).setView([45.5202, -73.5862], 14);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

const headerEl = document.querySelector('.gf-header');
const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

// Le bandeau flotte au-dessus de la carte (et peut faire 2 lignes en mobile) : on en tient compte pour l'auto-pan
function popupOptions() {
  const topPad = (headerEl ? headerEl.offsetHeight : 76) + 16;
  return { autoPanPaddingTopLeft: [24, topPad], autoPanPaddingBottomRight: [24, 24] };
}

// Padding de fitBounds : bandeau en haut, panneau latéral à gauche s'il est ouvert (desktop)
function fitPadding() {
  const top = (headerEl ? headerEl.offsetHeight : 76) + 32;
  const sidebarOpen = !isMobile() && !document.body.classList.contains('gf-sidebar-collapsed');
  const left = sidebarOpen ? document.getElementById('gfSidebar').offsetWidth + 48 : 40;
  return { paddingTopLeft: [left, top], paddingBottomRight: [40, 40] };
}

// ── State ─────────────────────────────────────────────────────────────────────

map.createPane('intersectionsPane');
map.getPane('intersectionsPane').style.zIndex = 450;

let layerGroup = L.layerGroup().addTo(map);
let intersectionLayerGroup = L.layerGroup().addTo(map);
let activeListItem = null;
let polylineRefs = [];
let circleRefs = [];
let decoratorRefs = [];

const CIRCLE_BASE_RADIUS = 7;
const CIRCLE_MIN_RADIUS = 5;

function weightForZoom(base, zoom) {
  return base * Math.max(0.4, 1 + (zoom - 14) * 0.25);
}

function pixelSizeForZoom(zoom) {
  return Math.round(10 * Math.max(1, 1 + (zoom - 14) * 0.25));
}

function radiusForZoom(zoom) {
  return Math.max(CIRCLE_MIN_RADIUS, CIRCLE_BASE_RADIUS + (zoom - 14) * 1.5);
}

map.on('zoomend', () => {
  const zoom = map.getZoom();
  polylineRefs.forEach(({ glow, main, highlight, baseWeight }) => {
    const w = weightForZoom(baseWeight, zoom);
    glow.setStyle({ weight: w + 6 });
    main.setStyle({ weight: w });
    if (highlight) highlight.setStyle({ weight: Math.max(1, w * 0.35) });
  });
  const r = radiusForZoom(zoom);
  circleRefs.forEach((circle) => circle.setRadius(r));
  const px = pixelSizeForZoom(zoom);
  decoratorRefs.forEach(({ decorator, color }) => {
    decorator.setPatterns([{
      offset: '10%',
      repeat: '20%',
      symbol: L.Symbol.arrowHead({
        pixelSize: px,
        polygon: false,
        pathOptions: { stroke: true, color, weight: 2.5, opacity: 1 },
      }),
    }]);
  });
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
      <div class="gf-pop-eyebrow danger">⚠ Intersection dangereuse</div>
      <h3 class="gf-pop-name">${inter.name}</h3>
      <div class="gf-pop-row"><span class="k">Type ${inter.type}</span><span class="v"><span class="gf-pop-dot" style="background:${def.color}"></span>${def.label}</span></div>
      ${def.description ? `<p class="gf-pop-note">${def.description}</p>` : ''}
    `, popupOptions());
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
      if (isMobile()) setSidebarOpenMobile(false);
    });

    listEl.appendChild(li);
  });
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderPistes(pistes) {
  layerGroup.clearLayers();
  polylineRefs = [];
  decoratorRefs = [];

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

    const w = weightForZoom(def.weight, map.getZoom());

    const glowLine = L.polyline(piste.coords, {
      color: def.color,
      weight: w + 6,
      opacity: 0.15,
      interactive: false,
    });

    const mainOpts = { color: def.color, weight: w, opacity: 0.9 };
    if (def.dashArray) mainOpts.dashArray = def.dashArray;
    const mainLine = L.polyline(piste.coords, mainOpts);

    const highlightLine = !def.dashArray ? L.polyline(piste.coords, {
      color: '#ffffff',
      weight: Math.max(1, w * 0.35),
      opacity: 0.28,
      interactive: false,
    }) : null;

    polylineRefs.push({ glow: glowLine, main: mainLine, highlight: highlightLine, baseWeight: def.weight });
    mainLine.bindPopup(`
      <div class="gf-pop-eyebrow">Type ${piste.type}</div>
      <h3 class="gf-pop-name">${piste.name}</h3>
      <div class="gf-pop-row"><span class="k">Aménagement</span><span class="v"><span class="gf-pop-dot" style="background:${def.color}"></span>${def.label}</span></div>
    `, popupOptions());
    layerGroup.addLayer(glowLine);
    layerGroup.addLayer(mainLine);
    if (highlightLine) layerGroup.addLayer(highlightLine);

    if (def.arrow) {
      const decorator = L.polylineDecorator(mainLine, {
        patterns: [{
          offset: '10%',
          repeat: '20%',
          symbol: L.Symbol.arrowHead({
            pixelSize: pixelSizeForZoom(map.getZoom()),
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
      decoratorRefs.push({ decorator, color: def.color });
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
      map.fitBounds(mainLine.getBounds(), fitPadding());
      mainLine.openPopup();
      if (isMobile()) setSidebarOpenMobile(false);
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

// ── Sidebar toggle (ouverte par défaut sur desktop, fermée sur mobile) ────────

const sidebarToggle = document.getElementById('gfSidebarToggle');
const sidebar = document.getElementById('gfSidebar');
const sidebarScrim = document.getElementById('gfSidebarScrim');

function setSidebarOpenMobile(open) {
  sidebar.classList.toggle('open', open);
  sidebarScrim.classList.toggle('open', open);
  sidebarToggle.setAttribute('aria-expanded', String(open));
}

function toggleSidebar() {
  if (isMobile()) {
    setSidebarOpenMobile(!sidebar.classList.contains('open'));
  } else {
    const collapsed = document.body.classList.toggle('gf-sidebar-collapsed');
    sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  }
}

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarScrim.addEventListener('click', () => setSidebarOpenMobile(false));
if (isMobile()) sidebarToggle.setAttribute('aria-expanded', 'false');

// Le bouton flottant se place sous le bandeau, dont la hauteur varie en mobile (nav sur 2 lignes)
const syncHeaderH = () => document.documentElement.style.setProperty('--gf-header-h', headerEl.offsetHeight + 'px');
new ResizeObserver(syncHeaderH).observe(headerEl);

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
