/* ================= ZOMBIE COLABS — interactions ================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Preloader ---------- */
  const loader = $('#loader');
  const pctEl = $('#loaderPct');
  function finishLoad() {
    if (!loader) { document.body.classList.remove('is-loading'); document.body.classList.add('loaded'); return; }
    loader.classList.add('done');
    document.body.classList.remove('is-loading');
    setTimeout(() => {
      document.body.classList.add('loaded');
      setTimeout(() => document.body.classList.add('settled'), 1600);
      $$('.hero__title .glitch').forEach((g, i) => setTimeout(() => glitch(g), 600 + i * 200));
    }, 350);
    setTimeout(() => loader.remove(), 1400);
  }
  if (loader && !reduce) {
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + rand(2, 9));
      pctEl.textContent = Math.floor(p);
      if (p < 100) setTimeout(tick, rand(20, 70));
      else setTimeout(finishLoad, 250);
    };
    // wait for hero image (or 2.5s max) while counting
    const img = new Image(); img.src = 'assets/img/hero.jpg';
    Promise.race([img.decode().catch(() => {}), new Promise(r => setTimeout(r, 2500))]).then(tick);
  } else finishLoad();

  /* ---------- Glitch ---------- */
  function glitch(el) {
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }
  if (!reduce) setInterval(() => { const g = $$('.glitch'); if (g.length) glitch(pick(g)); }, 2600);

  /* ---------- Cursor ---------- */
  const cursor = $('#cursor'), dot = $('#cursorDot');
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = { x: mouse.x, y: mouse.y };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  if (finePointer && cursor) {
    const loop = () => {
      ring.x += (mouse.x - ring.x) * .18;
      ring.y += (mouse.y - ring.y) * .18;
      cursor.style.transform = `translate(${ring.x}px, ${ring.y}px)`;
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', e => { if (e.target.closest('[data-hover], a, button, input, textarea, select')) cursor.classList.add('hover'); });
    document.addEventListener('pointerout', e => { if (e.target.closest('[data-hover], a, button, input, textarea, select')) cursor.classList.remove('hover'); });
    addEventListener('pointerdown', () => cursor.classList.add('click'));
    addEventListener('pointerup', () => cursor.classList.remove('click'));
  }

  /* ---------- Spores: rising embers that flee the cursor ---------- */
  const cv = $('#spores');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W, H, dpr;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
    size(); addEventListener('resize', size);
    const N = innerWidth < 700 ? 35 : 80;
    const colors = ['255,31,122', '255,43,214', '164,217,108'];
    const P = Array.from({ length: N }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.6, 2.4), vy: rand(.2, .9), vx: rand(-.2, .2), c: pick(colors), a: rand(.2, .9), t: rand(0, 6) }));
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const mx = mouse.x * dpr, my = mouse.y * dpr;
      for (const p of P) {
        p.t += .02;
        p.y -= p.vy * dpr; p.x += (p.vx + Math.sin(p.t) * .3) * dpr;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy, R = 120 * dpr;
        if (d2 < R * R) { const f = (1 - Math.sqrt(d2) / R) * 4; p.x += dx / Math.sqrt(d2 + 1) * f; p.y += dy / Math.sqrt(d2 + 1) * f; }
        if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c},${p.a * (.6 + .4 * Math.sin(p.t * 3))})`;
        ctx.shadowColor = `rgb(${p.c})`; ctx.shadowBlur = 8 * dpr;
        ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  /* ---------- Nav: hide on scroll down, mobile menu, active link ---------- */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  let lastY = 0;
  const bar = $('#infectionBar');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hide', y > lastY && y > 400 && !links.classList.contains('open'));
    lastY = y;
    if (bar) bar.style.height = (y / (document.documentElement.scrollHeight - innerHeight) * 100) + '%';
    stackCards();
  };
  addEventListener('scroll', onScroll, { passive: true });
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = '';
  }));
  const secObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$('a', links).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secObs.observe(s));

  /* ---------- Reveal + scramble + in-view ---------- */
  $$('.cards .reveal, .steps .reveal').forEach((el, i, arr) => el.style.setProperty('--d', (i % 5) * 0.09 + 's'));
  const chars = 'ZOMB!E#%&@$*<>/\\01ﾊﾐﾋｰｳ';
  function scramble(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    const nodes = [];
    const walk = n => n.childNodes.forEach(c => c.nodeType === 3 ? nodes.push({ n: c, t: c.textContent }) : walk(c));
    walk(el);
    let f = 0; const total = 28;
    const step = () => {
      f++;
      nodes.forEach(({ n, t }) => {
        n.textContent = [...t].map((ch, i) => ch === ' ' || i / t.length < f / total ? ch : chars[Math.floor(Math.random() * chars.length)]).join('');
      });
      if (f < total) requestAnimationFrame(() => setTimeout(step, 30));
    };
    step();
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target;
    if (t.matches('[data-scramble]')) { if (!reduce) scramble(t); }
    else if (t.matches('.ritual, .contact')) { t.classList.add('in-view'); }
    else t.classList.add('in');
    io.unobserve(t);
  }), { threshold: .15 });
  $$('.reveal, [data-scramble], .ritual, .contact').forEach(el => io.observe(el));

  /* ---------- Hero parallax + eye zap ---------- */
  const hero = $('#hero'), art = $('#heroArt');
  if (hero && finePointer && !reduce) {
    hero.addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
      art.style.setProperty('--px', (x * -24) + 'px');
      art.style.setProperty('--py', (y * -16) + 'px');
    });
  }
  hero && hero.addEventListener('click', () => { hero.classList.remove('zap'); void hero.offsetWidth; hero.classList.add('zap'); });

  /* ---------- Magnetic buttons + goo origin ---------- */
  $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      b.style.setProperty('--bx', x + 'px'); b.style.setProperty('--by', y + 'px');
      if (finePointer && b.classList.contains('magnetic')) b.style.transform = `translate(${(x - r.width / 2) * .25}px, ${(y - r.height / 2) * .35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- Tilt cards ---------- */
  if (finePointer && !reduce) $$('[data-tilt]').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
      c.style.setProperty('--rx', (.5 - y) * 12 + 'deg'); c.style.setProperty('--ry', (x - .5) * 14 + 'deg');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- Stacking project cards ---------- */
  const projs = $$('.proj');
  projs.forEach((p, i) => p.style.setProperty('--i', i));
  function stackCards() {
    if (innerWidth <= 900 || reduce) return;
    projs.forEach((p, i) => {
      const next = projs[i + 1];
      if (!next) return;
      const r = p.getBoundingClientRect(), nr = next.getBoundingClientRect();
      // how far the next card has slid over this one (0..1)
      const k = Math.min(1, Math.max(0, 1 - (nr.top - r.top) / r.height));
      p.style.setProperty('--s', 1 - k * .06);
      p.style.setProperty('--b', 1 - k * .55);
    });
  }

  /* only animate demos while visible */
  const visible = new Set();
  const vio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  projs.forEach(p => vio.observe(p));
  const isOn = el => visible.has(el.closest('.proj'));

  /* ---------- P1: n8n lead counter ---------- */
  const leadCount = $('#leadCount');
  if (leadCount) {
    let n = 0;
    setInterval(() => {
      if (!isOn(leadCount)) return;
      n += Math.ceil(rand(1, 4)); leadCount.textContent = n;
      const nodes = $$('.flow .node:not(.node--ai)', leadCount.closest('.proj'));
      const nd = pick(nodes); nd.classList.add('flash'); setTimeout(() => nd.classList.remove('flash'), 400);
    }, 1100);
  }

  /* ---------- P2: scraper filling a sheet (sample data) ---------- */
  const body = $('#sheetBody');
  if (body) {
    const names = ['Nova Dental', 'Apex Roofing', 'Bloom Florists', 'Iron Gym Co', 'Pixel Print', 'Sunrise Bakery', 'Metro Movers', 'Blue Fin Sushi', 'Harbor Law', 'Green Leaf Cafe', 'Vertex Auto', 'Luna Salon', 'Summit HVAC', 'Oak & Co Realty', 'Swift Plumbing', 'Coral Spa'];
    const cats = ['Dental', 'Construction', 'Retail', 'Fitness', 'Printing', 'Food', 'Logistics', 'Restaurant', 'Legal', 'Cafe', 'Automotive', 'Beauty', 'HVAC', 'Real Estate', 'Plumbing', 'Wellness'];
    const cities = ['London', 'Dubai', 'New York', 'Lahore', 'Toronto', 'Austin', 'Manchester', 'Sydney'];
    const urls = ['maps.google.com/search?q=dentists', 'yelp.com/biz?page=2', 'directory.site/category/hvac', 'linkedin.com/company/…', 'yellowpages.com/…/page/3'];
    const MAX = 7; let idx = 0, pct = 0;
    setInterval(() => {
      if (!isOn(body)) return;
      const i = idx % names.length, score = Math.floor(rand(30, 99));
      const cls = score > 80 ? 'hot' : score > 55 ? 'warm' : 'cold';
      const tr = document.createElement('tr'); tr.className = 'new';
      tr.innerHTML = `<td>${idx + 1}</td><td>${names[i]}</td><td>${cats[i]}</td><td>${pick(cities)}</td><td><span class="score ${cls}">${score}</span></td>`;
      body.prepend(tr);
      if (body.children.length > MAX) body.lastElementChild.remove();
      idx++;
      pct = (pct + rand(4, 11)) % 100;
      $('#scrapePct').textContent = Math.floor(pct) + '%';
      $('#scrapeBar').style.width = pct + '%';
      $('#scrapeUrl').textContent = 'crawling ' + pick(urls);
    }, 900);
  }

  /* ---------- P3: trading bot sim (random walk, clearly labelled as simulation) ---------- */
  const tc = $('#tradeChart'), log = $('#tradeLog');
  if (tc) {
    const g = tc.getContext('2d');
    let cw, ch, dpr;
    const fit = () => { dpr = Math.min(devicePixelRatio || 1, 2); cw = tc.width = tc.clientWidth * dpr; ch = tc.height = tc.clientHeight * dpr; };
    fit(); addEventListener('resize', fit);
    let price = 64000; const candles = [], marks = [];
    const newCandle = () => { const o = price; candles.push({ o, h: o, l: o, c: o }); if (candles.length > 48) { candles.shift(); marks.forEach(m => m.i--); } };
    for (let i = 0; i < 40; i++) { newCandle(); for (let k = 0; k < 8; k++) walk(); }
    function walk() {
      price += rand(-1, 1.02) * 60;
      const c = candles[candles.length - 1];
      c.c = price; c.h = Math.max(c.h, price); c.l = Math.min(c.l, price);
    }
    function render() {
      g.clearRect(0, 0, cw, ch);
      const hi = Math.max(...candles.map(c => c.h)), lo = Math.min(...candles.map(c => c.l)), pad = 20 * dpr;
      const Y = v => pad + (hi - v) / (hi - lo || 1) * (ch - pad * 2);
      const w = cw / 50;
      g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, ch * i / 5); g.lineTo(cw, ch * i / 5); g.stroke(); }
      candles.forEach((c, i) => {
        const x = i * w + w / 2, up = c.c >= c.o, col = up ? '#a4d96c' : '#ff1f7a';
        g.strokeStyle = g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 6 * dpr;
        g.beginPath(); g.moveTo(x, Y(c.h)); g.lineTo(x, Y(c.l)); g.stroke();
        const top = Y(Math.max(c.o, c.c)); g.fillRect(x - w * .32, top, w * .64, Math.max(1.5 * dpr, Y(Math.min(c.o, c.c)) - top));
      });
      g.shadowBlur = 0;
      marks.forEach(m => {
        if (m.i < 0) return;
        const x = m.i * w + w / 2, y = Y(m.p);
        g.fillStyle = m.buy ? '#a4d96c' : '#ff2bd6';
        g.beginPath();
        if (m.buy) { g.moveTo(x, y + 8 * dpr); g.lineTo(x - 6 * dpr, y + 18 * dpr); g.lineTo(x + 6 * dpr, y + 18 * dpr); }
        else { g.moveTo(x, y - 8 * dpr); g.lineTo(x - 6 * dpr, y - 18 * dpr); g.lineTo(x + 6 * dpr, y - 18 * dpr); }
        g.fill();
      });
      const ly = Y(price);
      g.setLineDash([4 * dpr, 4 * dpr]); g.strokeStyle = 'rgba(255,255,255,.4)';
      g.beginPath(); g.moveTo(0, ly); g.lineTo(cw, ly); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ff1f7a'; g.fillRect(cw - 78 * dpr, ly - 10 * dpr, 78 * dpr, 20 * dpr);
      g.fillStyle = '#000'; g.font = `700 ${11 * dpr}px JetBrains Mono, monospace`;
      g.fillText(price.toFixed(1), cw - 72 * dpr, ly + 4 * dpr);
    }
    let t = 0;
    setInterval(() => {
      if (!isOn(tc)) return;
      walk(); t++;
      if (t % 6 === 0) {
        newCandle();
        if (Math.random() < .3) {
          const buy = candles[candles.length - 2].c > candles[candles.length - 3].c;
          marks.push({ i: candles.length - 2, p: price, buy });
          const li = document.createElement('li'); li.className = buy ? 'buy' : 'sell';
          li.innerHTML = `<b>${buy ? 'BUY ' : 'SELL'}</b> BTC/USDT<br>@ ${price.toFixed(1)} · ${buy ? 'EMA cross ↑' : 'take-profit'}`;
          log.prepend(li); if (log.children.length > 6) log.lastElementChild.remove();
        }
      }
      render();
    }, 160);
    render();
  }

  /* ---------- Contact form ---------- */
  const form = $('#contactForm'), msg = $('#formMsg');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('.field', form).forEach(f => {
      const el = $('input, textarea, select', f);
      const bad = !el.checkValidity() || (el.required && !el.value.trim());
      f.classList.toggle('bad', bad); if (bad) ok = false;
    });
    if (!ok) { msg.className = 'form__msg err'; msg.textContent = 'Missing brains… fill every field properly.'; return; }
    const btn = $('button[type=submit] span', form), old = btn.textContent;
    btn.textContent = 'Summoning…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.ok || String(data.success) === 'true')) throw new Error(data.error || data.message || 'Server error');
      form.classList.remove('sent'); void form.offsetWidth; form.classList.add('sent');
      msg.className = 'form__msg ok'; msg.textContent = '🧟 Got it! The horde will reply within 24h.';
      form.reset();
    } catch (err) {
      msg.className = 'form__msg err';
      msg.textContent = 'Could not send (' + err.message + '). Email us directly instead.';
    } finally { btn.textContent = old; }
  });

  onScroll();
})();
