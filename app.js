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
  // Piste à venir dont l'aménagement n'est pas encore décidé ("type": null dans a-venir.json)
  '?':  { label: 'Type à déterminer',                                                            color: '#94a3b8', weight: 5, dashArray: '2 6' },
};

const TYPE_ORDER = ['1a', '1b', '1c', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '5c', '6a', '6b', '6c', '7', '8', '?'];

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

// ── Lecture des données JSON ──────────────────────────────────────────────────
// pistes.json, a-venir.json : [{ nom, type, coords: [[lat, lng], ...], … }]
// intersections.json        : [{ nom, type, coord: [lat, lng] }]
// Format complet et champs des pistes à venir : DONNEES.md.

function estCoord(c) {
  return Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === 'number' && isFinite(n));
}

function lirePistes(json, aVenir = false) {
  if (!Array.isArray(json)) throw new Error('Le fichier doit contenir une liste de pistes');
  return json
    .filter((p) => p && typeof p.nom === 'string' && Array.isArray(p.coords) && p.coords.filter(estCoord).length >= 2)
    .map((p) => ({
      name: p.nom.trim(),
      type: p.type == null || p.type === '' ? '?' : String(p.type).toLowerCase(),   // '?' = type à déterminer
      coords: p.coords.filter(estCoord),
      aVenir,
      adoption: p.adoption || null,     // date d'adoption en conseil (AAAA-MM-JJ)
      prevu: p.prevu || null,           // construction prévue (pistes à venir) : 2027 ou un texte comme « été 2029 »
      annee: p.annee || null,           // construction (pistes réalisées) : 2026 ou un texte comme « août 2026 »
      source: p.source || null,         // résolution, lien ou document
      remplace: Array.isArray(p.remplace) ? p.remplace : [],   // noms de pistes actuelles remplacées
    }));
}

function lireIntersections(json) {
  if (!Array.isArray(json)) throw new Error('Le fichier doit contenir une liste d\'intersections');
  return json
    .filter((x) => x && typeof x.nom === 'string' && estCoord(x.coord))
    .map((x) => ({ name: x.nom.trim(), type: String(x.type ?? ''), coord: x.coord }));
}

function echapper(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function dateFr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
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
      <h3 class="gf-pop-name">${echapper(inter.name)}</h3>
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
  const avenirListEl = document.getElementById('avenir-list');
  const avenirCountEl = document.getElementById('avenir-count');
  listEl.innerHTML = '';
  avenirListEl.innerHTML = '';
  activeListItem = null;

  const actuelles = pistes.filter((p) => !p.aVenir);
  const aVenir = pistes.filter((p) => p.aVenir);
  countEl.textContent = actuelles.length ? `(${actuelles.length})` : '';
  avenirCountEl.textContent = aVenir.length ? `(${aVenir.length})` : '';
  if (actuelles.length === 0) listEl.innerHTML = '<li class="empty-hint">Aucune piste trouvée.</li>';
  if (vue === 'a-venir' && aVenir.length === 0) {
    avenirListEl.innerHTML = '<li class="empty-hint">Aucune piste à venir pour l\'instant.</li>';
  }
  if (vue === 'mandat') {
    if (actuelles.length === 0) listEl.innerHTML = '<li class="empty-hint">Aucune piste construite pendant le mandat pour l\'instant (champ « annee » de pistes.json).</li>';
    if (aVenir.length === 0) avenirListEl.innerHTML = '<li class="empty-hint">Aucune piste prévue d\'ici la fin du mandat.</li>';
  }

  pistes.forEach((piste, i) => {
    const def = TYPE_DEFINITIONS[piste.type] ?? {
      label: `Type ${piste.type}`,
      color: '#6b7280',
      weight: 4,
      dashArray: null,
    };

    const w = weightForZoom(def.weight, map.getZoom());

    // Piste à venir : halo violet pointillé autour du tracé, en plus du style de son type
    const glowLine = L.polyline(piste.coords, piste.aVenir ? {
      color: AVENIR_COLOR,
      weight: w + 8,
      opacity: 0.55,
      dashArray: '2 8',
      lineCap: 'round',
      interactive: false,
    } : {
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
      ${piste.aVenir ? '<div class="gf-pop-eyebrow avenir">À venir · adoptée en conseil</div>' : `<div class="gf-pop-eyebrow">${piste.type === '?' ? 'Type à déterminer' : `Type ${echapper(piste.type)}`}</div>`}
      <h3 class="gf-pop-name">${echapper(piste.name)}</h3>
      <div class="gf-pop-row"><span class="k">Aménagement</span><span class="v"><span class="gf-pop-dot" style="background:${def.color}"></span>${echapper(def.label)}</span></div>
      ${!piste.aVenir && piste.annee ? `<div class="gf-pop-row"><span class="k">Construite en</span><span class="v">${echapper(piste.annee)}</span></div>` : ''}
      ${piste.aVenir && piste.prevu ? `<div class="gf-pop-row"><span class="k">Construction prévue</span><span class="v">${echapper(piste.prevu)}</span></div>` : ''}
      ${piste.aVenir && piste.adoption ? `<div class="gf-pop-row"><span class="k">Adoptée le</span><span class="v">${echapper(dateFr(piste.adoption))}</span></div>` : ''}
      ${piste.aVenir && piste.source ? `<div class="gf-pop-row"><span class="k">Source</span><span class="v">${/^https?:\/\//.test(piste.source) ? `<a href="${echapper(piste.source)}" target="_blank" rel="noopener">Voir</a>` : echapper(piste.source)}</span></div>` : ''}
      ${piste.aVenir && piste.remplace.length ? `<p class="gf-pop-note">Remplace : ${piste.remplace.map(echapper).join(', ')}</p>` : ''}
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
    badge.textContent = piste.type === '?' ? 'T ?' : `T${piste.type}`;

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

    (piste.aVenir ? avenirListEl : listEl).appendChild(li);
  });
}

// ── Legend ────────────────────────────────────────────────────────────────────

function buildLegend() {
  const container = document.getElementById('legend-items');

  TYPE_ORDER.forEach((typeNum) => {
    const def = TYPE_DEFINITIONS[typeNum];
    // Chaque type est une case à cocher : décochée, ses pistes sont masquées (dans toutes les vues)
    const item = document.createElement('label');
    item.className = 'legend-item legend-filtre';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !typesMasques.has(typeNum);
    box.dataset.type = typeNum;
    box.addEventListener('change', () => {
      if (box.checked) typesMasques.delete(typeNum); else typesMasques.add(typeNum);
      majBoutonTousTypes();
      map.closePopup();
      afficher();
    });
    item.appendChild(box);

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
    label.textContent = typeNum === '?' ? def.label : `${typeNum}. ${def.label}`;
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

  // Piste à venir (vue « À venir »)
  const avenirItem = document.createElement('div');
  avenirItem.className = 'legend-item legend-avenir';
  avenirItem.innerHTML = '<div class="legend-line-wrap"><div class="legend-line legend-line-avenir"></div></div>' +
    '<span class="legend-label">Piste à venir (adoptée en conseil, pas encore construite)</span>';
  container.appendChild(avenirItem);

  const sep = document.createElement('div');
  sep.className = 'legend-separator';
  container.appendChild(sep);

  Object.entries(INTERSECTION_TYPES).forEach(([typeNum, def]) => {
    const item = document.createElement('div');
    item.className = 'legend-item legend-intersection';

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

// ── File loading (secours : fichiers JSON choisis sur le disque) ───────────────

function lireFichierJSON(input, traiter) {
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { traiter(JSON.parse(ev.target.result)); }
      catch (err) { alert(`Fichier illisible : ${err.message}`); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

lireFichierJSON(document.getElementById('file-input'), (json) => { donnees.actuelles = lirePistes(json); afficher(); });
lireFichierJSON(document.getElementById('avenir-file-input'), (json) => { donnees.aVenir = lirePistes(json, true); afficher(); });
lireFichierJSON(document.getElementById('intersection-file-input'), (json) => renderIntersections(lireIntersections(json)));

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

// ── Filtre par type (cases de la légende) ─────────────────────────────────────

const typesMasques = new Set();
const boutonTousTypes = document.getElementById('legend-tous');

function majBoutonTousTypes() {
  boutonTousTypes.textContent = typesMasques.size === TYPE_ORDER.length ? 'Tout afficher' : 'Tout masquer';
}

boutonTousTypes.addEventListener('click', () => {
  const toutAfficher = typesMasques.size === TYPE_ORDER.length;
  typesMasques.clear();
  if (!toutAfficher) TYPE_ORDER.forEach((t) => typesMasques.add(t));
  document.querySelectorAll('.legend-filtre input').forEach((b) => { b.checked = toutAfficher; });
  majBoutonTousTypes();
  map.closePopup();
  afficher();
});

// ── Vues : « Actuel », « À venir » (actuelles + adoptées en conseil) et
//    « Mandat 2025-2029 » (seulement les pistes construites ou prévues pendant le mandat) ──

const AVENIR_COLOR = '#a855f7';
// Le mandat commence avec l'élection du 2 novembre 2025, après la saison des travaux : on compte
// les pistes construites (annee) ou prévues (prevu) de 2026 à 2029. Une piste de 2025 relève du mandat précédent.
const MANDAT = { label: 'Mandat 2025-2029', premiereAnnee: 2026, derniereAnnee: 2029 };
const VUES = ['actuel', 'a-venir', 'mandat'];
// annee / prevu : un nombre (2027) ou un texte qui contient l'année (« été 2029 », « août 2026 »)
const anneeDe = (v) => { const m = /\b(\d{4})\b/.exec(String(v ?? '')); return m ? +m[1] : null; };
const dansMandat = (v) => { const an = anneeDe(v); return an !== null && an >= MANDAT.premiereAnnee && an <= MANDAT.derniereAnnee; };
const donnees = { actuelles: [], aVenir: [] };
let vue = VUES.includes(new URLSearchParams(location.search).get('vue')) ? new URLSearchParams(location.search).get('vue') : 'actuel';

function afficher() {
  let liste = donnees.actuelles;
  if (vue === 'a-venir') {
    // Une piste à venir peut remplacer une piste actuelle (champ « remplace ») : on masque l'ancienne
    const remplacees = new Set(donnees.aVenir.flatMap((p) => p.remplace));
    liste = donnees.actuelles.filter((p) => !remplacees.has(p.name)).concat(donnees.aVenir);
  } else if (vue === 'mandat') {
    liste = donnees.actuelles.filter((p) => dansMandat(p.annee))
      .concat(donnees.aVenir.filter((p) => dansMandat(p.prevu)));
  }
  // Types décochés dans la légende (un type inconnu reste toujours visible)
  liste = liste.filter((p) => !typesMasques.has(p.type));
  renderPistes(liste);
  document.body.classList.toggle('vue-a-venir', vue === 'a-venir' || vue === 'mandat');
  document.body.classList.toggle('vue-mandat', vue === 'mandat');
  document.getElementById('piste-titre').textContent = vue === 'mandat' ? 'Construites pendant le mandat' : 'Pistes';
  document.getElementById('avenir-titre').textContent = vue === 'mandat' ? 'Prévues d\'ici la fin du mandat' : 'Pistes à venir';
  // Vue « Mandat » : seulement les nouvelles pistes (pas les intersections dangereuses)
  if (vue === 'mandat') map.removeLayer(intersectionLayerGroup); else intersectionLayerGroup.addTo(map);
  document.querySelectorAll('.gf-vue-btn').forEach((b) => {
    const actif = b.dataset.vue === vue;
    b.classList.toggle('active', actif);
    b.setAttribute('aria-pressed', String(actif));
  });
}

document.querySelectorAll('.gf-vue-btn').forEach((b) => b.addEventListener('click', () => {
  vue = b.dataset.vue;
  const url = new URL(location.href);
  if (vue !== 'actuel') url.searchParams.set('vue', vue); else url.searchParams.delete('vue');
  history.replaceState(null, '', url);
  map.closePopup();
  afficher();
}));

function chargerJSON(url) {
  return fetch(url, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`${url} : ${r.status}`);
    return r.json();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

buildLegend();

Promise.all([
  chargerJSON('pistes.json').then((j) => { donnees.actuelles = lirePistes(j); }),
  chargerJSON('a-venir.json').then((j) => { donnees.aVenir = lirePistes(j, true); }).catch((e) => console.warn(e)),
])
  .then(afficher)
  .catch((e) => {
    console.error(e);
    document.getElementById('piste-list').innerHTML =
      '<li class="empty-hint">Chargez un fichier pistes.json.</li>';
  });

chargerJSON('intersections.json')
  .then((j) => renderIntersections(lireIntersections(j)))
  .catch((e) => console.warn(e));
