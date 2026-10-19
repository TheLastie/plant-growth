(() => {
  const canvas = document.querySelector('#plantCanvas'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const input = { age: $('ageInput'), light: $('lightInput'), water: $('waterInput'), wind: $('windInput') };
  const MAX_AGE = 120;
  const MAX_TRUNK_MULTIPLIER = 30;
  const state = { species: 'oak', age: 6, light: 72, water: 58, wind: 18 };
  let growthSettleTimer;
  const trunkGrowth = age => 1 + (MAX_TRUNK_MULTIPLIER - 1) * (Math.max(1, Math.min(MAX_AGE, age)) - 1) / (MAX_AGE - 1);
  const plants = {
    oak: { name: 'Quercus robur', height: 1.2, matureHeight: 28, maturity: 34, matureTrunkDiameter: 90, spread: .54, leaf: '#536d46', lightLeaf: '#8c9b69', bark: '#745943', width: 4.2 },
    birch: { name: 'Betula pendula', height: 1.34, matureHeight: 24, maturity: 26, matureTrunkDiameter: 60, spread: .38, leaf: '#869b64', lightLeaf: '#bdc28c', bark: '#e3ddc9', width: 3.1 },
    fern: { name: 'Pteridium aquilinum', height: .64, matureHeight: 1.8, maturity: 8, spread: .78, leaf: '#587443', lightLeaf: '#9eaa70', bark: '#506940', width: 1.4 },
    monstera: { name: 'Monstera deliciosa', height: .83, matureHeight: 3.2, maturity: 14, spread: .65, leaf: '#365d47', lightLeaf: '#8da878', bark: '#52714f', width: 2.7 }
  };
  const notes = {
    branching: ['Ветви повторяют себя', 'Каждый новый побег наследует направление ствола, но расходится под собственным углом. Повторение на разных масштабах создаёт узнаваемую крону.', 'Lₙ₊₁ = 0.72 × Lₙ', 'правило ветвления', 'Y'],
    light: ['Рост следует за светом', 'На каждом шаге побег немного поворачивается к источнику. При боковом освещении ствол изгибается, а крона смещается к открытому месту.', 'θₙ₊₁ = θₙ + 0.18ΔL', 'фототропизм', '☼'],
    wind: ['Ветер оставляет изгиб', 'Регулярная нагрузка уводит молодые ветви по ветру. Чем сильнее ветер, тем ниже крона и тем заметнее наклон ствола.', 'b = 0.34 × сила ветра', 'механический ответ', '≈']
  };

  const randomFor = seed => { let n = seed >>> 0; return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const round = n => Math.round(n * 10) / 10;

  function background(w, h, ground) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e9ebdf'); grad.addColorStop(.72, '#dce2d2'); grad.addColorStop(1, '#d3dacb');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(74,101,75,.07)'; ctx.lineWidth = 1;
    for (let x = 14.5; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ground); ctx.stroke(); }
    for (let y = 14.5; y < ground; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const sunX = w * (.12 + .76 * state.light / 100), sunY = 60;
    const glow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 76);
    glow.addColorStop(0, 'rgba(237,196,116,.34)'); glow.addColorStop(1, 'rgba(237,196,116,0)');
    ctx.fillStyle = glow; ctx.fillRect(sunX - 76, sunY - 76, 152, 152);
    ctx.fillStyle = '#e9c778'; ctx.beginPath(); ctx.arc(sunX, sunY, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c5cbb8'; ctx.beginPath(); ctx.moveTo(0, ground); ctx.quadraticCurveTo(w * .42, ground - 14, w, ground + 2); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.strokeStyle = '#9eaa96'; ctx.beginPath(); ctx.moveTo(0, ground); ctx.quadraticCurveTo(w * .42, ground - 14, w, ground + 2); ctx.stroke();
    const rng = randomFor(481);
    for (let i = 0; i < w * .32; i++) { ctx.globalAlpha = .1; ctx.fillStyle = '#77836b'; ctx.fillRect(rng() * w, ground + rng() * Math.max(8, h - ground), 1.5, 1); }
    ctx.globalAlpha = 1;
    return sunX;
  }

  function leaf(x, y, angle, size, rng, plant) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + (rng() - .5) * .6);
    ctx.fillStyle = (rng() > .48 ? plant.leaf : plant.lightLeaf);
    ctx.strokeStyle = 'rgba(38,63,43,.35)'; ctx.lineWidth = .7;
    const rx = size * (state.species === 'monstera' ? 1.15 : .95), ry = size * .65;
    ctx.beginPath();
    if (state.species === 'monstera') {
      ctx.moveTo(-rx, 0);
      ctx.bezierCurveTo(-rx * .92, -ry * .48, -rx * .76, -ry * 1.2, -rx * .43, -ry * .84);
      ctx.bezierCurveTo(-rx * .2, -ry * 1.1, -rx * .02, -ry * .58, rx * .12, -ry * .5);
      ctx.bezierCurveTo(rx * .28, -ry * .92, rx * .48, -ry * 1.08, rx * .59, -ry * .64);
      ctx.quadraticCurveTo(rx * .9, -ry * .42, rx, 0);
      ctx.quadraticCurveTo(rx * .9, ry * .42, rx * .59, ry * .64);
      ctx.bezierCurveTo(rx * .48, ry * 1.08, rx * .28, ry * .92, rx * .12, ry * .5);
      ctx.bezierCurveTo(-rx * .02, ry * .58, -rx * .2, ry * 1.1, -rx * .43, ry * .84);
      ctx.bezierCurveTo(-rx * .76, ry * 1.2, -rx * .92, ry * .48, -rx, 0);
    } else {
      ctx.moveTo(-rx, 0); ctx.quadraticCurveTo(-rx * .4, -ry * 1.25, rx, 0); ctx.quadraticCurveTo(-rx * .4, ry * 1.25, -rx, 0);
    }
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,228,196,.62)'; ctx.beginPath(); ctx.moveTo(-rx * .8, 0); ctx.lineTo(rx * .83, 0); ctx.stroke();
    if (state.species === 'monstera') {
      ctx.fillStyle = '#dce2d3';
      for (const t of [-.24, .18, .53]) {
        ctx.beginPath(); ctx.ellipse(rx * t, -ry * .48, rx * .055, ry * .19, t * .5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(rx * t, ry * .48, rx * .055, ry * .19, -t * .5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function renderPlant(w, ground, plant, rng) {
    const scale = Math.min(w / 610, 1.05);
    const ageGrowth = 1 - Math.exp(-state.age / plant.maturity);
    const maxDepth = 4 + Math.floor(Math.min(1, state.age / 80) * 7);
    const desiredHeight = Math.min(ground * .91, ground * (.17 + .77 * ageGrowth) * plant.height / 1.2);
    const size = desiredHeight * .3 / (1 - Math.pow(.7, maxDepth + 1));
    const x0 = w * .5 - (state.light - 50) * .68 * scale - state.wind * .16 * scale, y0 = ground;
    const lightLean = (state.light / 100 - .5) * 1.02, wind = state.wind / 100 * .44;
    let leaves = 0, minX = x0, maxX = x0;
    if (state.species !== 'monstera') {
      ctx.save(); ctx.strokeStyle = plant.bark; ctx.globalAlpha = .7; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const side = i % 2 ? 1 : -1, len = (12 + rng() * 26) * scale; ctx.lineWidth = 1.2 * scale; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + side * len * .45, y0 + len * .2, x0 + side * len, y0 + len * .65); ctx.stroke(); }
      ctx.restore();
    }

    if (state.species === 'fern') {
      const fronds = 5 + Math.round(ageGrowth * 12);
      for (let f = 0; f < fronds; f++) {
        const side = f % 2 ? 1 : -1, a = side * (.2 + f / fronds * .32) + lightLean * .3, len = desiredHeight * (.7 + rng() * .35);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.strokeStyle = plant.bark; ctx.lineWidth = 1.5 * scale;
        for (let j = 1; j <= 18; j++) { const t = j / 18, x = x0 + Math.sin(a) * len * t, y = y0 - len * t; ctx.lineTo(x, y); if (j % 3 === 0) { leaf(x, y, a + side * .8, (7 + (1 - t) * 5) * scale, rng, plant); leaves += 2; } }
        ctx.stroke();
      }
      minX = x0 - size * .45; maxX = x0 + size * .45;
    } else if (state.species === 'monstera') {
      const count = 7 + Math.floor(ageGrowth * 7);
      const lean = lightLean * .12 - wind * .1;
      const stemX = t => x0 + lean * desiredHeight * t;
      ctx.save(); ctx.strokeStyle = plant.bark; ctx.lineCap = 'round'; ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(stemX(.28), y0 - desiredHeight * .28, stemX(.68), y0 - desiredHeight * .68, stemX(1), y0 - desiredHeight);
      ctx.lineWidth = 3.2 * scale; ctx.stroke();
      for (let i = 0; i < count; i++) {
        const t = (i + .65) / (count + .2), y = y0 - desiredHeight * t;
        const x = stemX(t), side = i % 2 ? -1 : 1;
        const reach = (30 + ageGrowth * 20 + rng() * 10) * scale;
        const leafSize = (22 + ageGrowth * 15) * scale * (.9 + rng() * .2) * (.82 + state.water / 420);
        const angle = side > 0 ? -.34 + lightLean * .14 : Math.PI + .34 + lightLean * .14;
        const leafX = x + side * reach, leafY = y - 7 * scale;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * reach * .55, y - 9 * scale, leafX, leafY);
        ctx.lineWidth = 1.6 * scale; ctx.stroke();
        leaf(leafX, leafY, angle, leafSize, rng, plant); leaves++;
        minX = Math.min(minX, x - reach - leafSize * 1.3); maxX = Math.max(maxX, x + reach + leafSize * 1.3);
      }
      ctx.restore();
    }

    let branchCount = 0;
    const segmentLimit = 2600;
    const crownBranchWidth = plant.width * scale * (.7 + ageGrowth * 1.35);
    function branch(x, y, a, len, thick, depth) {
      if (depth > maxDepth || len < 3.5 * scale || branchCount >= segmentLimit) {
        for (let i = 0; i < 3; i++) { leaf(x + (rng() - .5) * 5 * scale, y + (rng() - .5) * 5 * scale, a + (rng() - .5), (7 + rng() * 5) * scale * (.65 + state.water / 200), rng, plant); leaves++; }
        return;
      }
      branchCount++;
      const next = a + (depth === 0 ? lightLean * .43 : lightLean * .16) + Math.sin(depth * 1.7) * wind * .12;
      const dx = Math.sin(next) * len, dy = Math.cos(next) * len, nx = x + dx, ny = y - dy;
      minX = Math.min(minX, nx); maxX = Math.max(maxX, nx);
      const controlX = x + dx * .52 + wind * len * .025, controlY = y - dy * .52;
      ctx.strokeStyle = plant.bark; ctx.lineWidth = Math.max(.6, thick); ctx.lineCap = 'round';
      if (depth === 0 && thick > crownBranchWidth) {
        const leftEdge = [], rightEdge = [], steps = 10;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps, inverse = 1 - t;
          const px = inverse * inverse * x + 2 * inverse * t * controlX + t * t * nx;
          const py = inverse * inverse * y + 2 * inverse * t * controlY + t * t * ny;
          const tangentX = 2 * inverse * (controlX - x) + 2 * t * (nx - controlX);
          const tangentY = 2 * inverse * (controlY - y) + 2 * t * (ny - controlY);
          const tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
          const halfWidth = (thick * (1 - t) + crownBranchWidth * t) / 2;
          const normalX = -tangentY / tangentLength, normalY = tangentX / tangentLength;
          leftEdge.push([px + normalX * halfWidth, py + normalY * halfWidth]);
          rightEdge.push([px - normalX * halfWidth, py - normalY * halfWidth]);
        }
        ctx.beginPath();
        ctx.moveTo(leftEdge[0][0], leftEdge[0][1]);
        for (const [px, py] of leftEdge.slice(1)) ctx.lineTo(px, py);
        for (const [px, py] of rightEdge.reverse()) ctx.lineTo(px, py);
        ctx.closePath(); ctx.fillStyle = plant.bark; ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(controlX, controlY, nx, ny); ctx.stroke();
      }
      const spread = plant.spread * (.84 + rng() * .32);
      const branchLength = len * (.68 + rng() * .05);
      const childThickness = depth === 0 ? crownBranchWidth : thick * .68;
      branch(nx, ny, next - spread, branchLength, childThickness, depth + 1);
      branch(nx, ny, next + spread, branchLength, childThickness, depth + 1);
      if (depth < 3 && rng() > .58) branch(nx, ny, next + (rng() - .5) * .3, len * .57, depth === 0 ? crownBranchWidth * .8 : thick * .55, depth + 1);
      if (depth === maxDepth - 1 || len < 22 * scale) { leaf(nx, ny, next + .2, (8 + rng() * 4) * scale, rng, plant); leaves++; }
    }
    if (state.species === 'oak' || state.species === 'birch') branch(x0, y0, lightLean * .14 - wind * .15, size, plant.width * scale * trunkGrowth(state.age), 0);
    return { leaves, width: maxX - minX, x: x0, top: y0 - desiredHeight };
  }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    ctx.clearRect(0, 0, w, h); const ground = h * .76, sunX = background(w, h, ground), plant = plants[state.species];
    const rng = randomFor(2026 + state.age * 101 + state.light * 17 + state.water * 7 + state.wind * 19 + state.species.length * 997);
    const result = renderPlant(w, ground, plant, rng);
    const badge = $('lightIndicator'); badge.style.left = `${Math.max(3, Math.min(87, sunX / w * 100))}%`; badge.style.right = 'auto';
    badge.querySelector('i').style.opacity = .42 + state.light / 180;
    updateLabels(result, plant);
  }

  function updateLabels(result, plant) {
    const lastTwo = state.age % 100, last = state.age % 10;
    const yearWord = lastTwo >= 11 && lastTwo <= 14 ? 'лет' : last === 1 ? 'год' : last >= 2 && last <= 4 ? 'года' : 'лет';
    $('ageOutput').textContent = `${state.age} ${yearWord}`;
    $('lightOutput').textContent = `${state.light < 35 ? 'Тень' : state.light < 68 ? 'Полутень' : 'Открытое место'} · ${state.light}%`;
    $('waterOutput').textContent = `${state.water < 30 ? 'Сухо' : state.water < 70 ? 'Умеренно' : 'Влажно'} · ${state.water}%`;
    $('windOutput').textContent = `${state.wind < 25 ? 'Тихо' : state.wind < 65 ? 'Лёгкий' : 'Сильный'} · ${state.wind}%`;
    Object.values(input).forEach(el => el.style.setProperty('--fill', `${(el.value - el.min) / (el.max - el.min) * 100}%`));
    $('ageSummary').textContent = `${String(state.age).padStart(3, '0')} / ${MAX_AGE} лет`; $('growthMeter').style.width = `${state.age / MAX_AGE * 100}%`;
    $('stageLabel').textContent = state.age <= 2 ? 'Укоренение' : state.age <= 12 ? 'Ювенильный рост' : state.age <= 45 ? 'Формирование кроны' : state.age <= 85 ? 'Зрелое растение' : 'Старый экземпляр';
    const estimatedHeight = plant.matureHeight * (1 - Math.exp(-state.age / plant.maturity)) * (.86 + state.water / 500) * (.9 + state.light / 1000);
    $('heightReadout').textContent = `около ${round(Math.min(plant.matureHeight, estimatedHeight))} м`;
    $('crownReadout').textContent = `${round(Math.max(.8, result.width / 29 * plant.height))} м²`; $('leafReadout').textContent = result.leaves;
    $('trunkReadout').textContent = plant.matureTrunkDiameter ? `${Math.round(plant.matureTrunkDiameter / MAX_TRUNK_MULTIPLIER * trunkGrowth(state.age))} см` : '—';
    $('plantName').textContent = plant.name;
    canvas.setAttribute('aria-label', `Процедурная иллюстрация ${plant.name}, возраст ${state.age} лет`);
  }

  function update() {
    for (const key of Object.keys(input)) state[key] = Number(input[key].value);
    const stage = canvas.parentElement;
    stage.classList.remove('is-growing');
    void stage.offsetWidth;
    stage.classList.add('is-growing');
    clearTimeout(growthSettleTimer);
    growthSettleTimer = setTimeout(() => stage.classList.remove('is-growing'), 420);
    requestAnimationFrame(draw);
  }
  function resize() { const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); if (!box.width || !box.height) return; canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  Object.values(input).forEach(el => el.addEventListener('input', update));
  document.querySelectorAll('.species-button').forEach(button => button.addEventListener('click', () => {
    state.species = button.dataset.species;
    document.querySelectorAll('.species-button').forEach(item => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active)); }); update();
  }));
  document.querySelectorAll('.note-tab').forEach((tab, index, tabs) => {
    function activate() { const [title, body, formula, caption, symbol] = notes[tab.dataset.note]; tabs.forEach(t => { const active = t === tab; t.classList.toggle('is-active', active); t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; }); $('noteContent').setAttribute('aria-labelledby', tab.id); $('noteSymbol').textContent = symbol; $('noteTitle').textContent = title; $('noteBody').textContent = body; $('noteFormula').innerHTML = `${formula} <span>· ${caption}</span>`; }
    tab.addEventListener('click', activate); tab.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; next.focus(); next.click(); });
  });
  $('resetButton').addEventListener('click', () => { state.species = 'oak'; for (const [key, value] of Object.entries({ age: 6, light: 72, water: 58, wind: 18 })) input[key].value = value; document.querySelectorAll('.species-button').forEach(b => { const active = b.dataset.species === 'oak'; b.classList.toggle('is-active', active); b.setAttribute('aria-pressed', String(active)); }); update(); });
  $('downloadButton').addEventListener('click', () => { const a = document.createElement('a'); a.download = `silva-${state.species}-${state.age}-years.png`; a.href = canvas.toDataURL('image/png'); a.click(); });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement); else addEventListener('resize', resize, { passive: true });
  resize();
})();
