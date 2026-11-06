/* Didáctica Aumentada 3.0 — El Diario
   Sitio estático: lee data/noticias.json (generado por GitHub Actions) y lo muestra.
   Sin dependencias. Compatible con navegadores modernos de escritorio y móviles. */
(function () {
  'use strict';

  var PAGE_SIZE = 12;
  var state = { items: [], filter: 'all', q: '', shown: PAGE_SIZE };
  var app = document.getElementById('app');

  /* ---------- utilidades ---------- */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function safeUrl(u) { return typeof u === 'string' && /^(https?:\/\/|img\/|\.\/img\/|\/)/i.test(u) ? u : ''; }
  function fmtDate(iso, long) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    try {
      return d.toLocaleDateString('es-AR', long
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function label(it) { return it.source === 'instagram' ? 'Instagram' : (it.category || 'Redacción'); }
  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return s;
  }

  /* ---------- filtros ---------- */
  function buildChips() {
    var box = document.getElementById('chips');
    clear(box);
    var cats = [];
    state.items.forEach(function (it) {
      if (it.source !== 'instagram' && it.category && cats.indexOf(it.category) < 0) cats.push(it.category);
    });
    var defs = [['all', 'Todas'], ['instagram', 'Instagram'], ['redaccion', 'Redacción']];
    cats.forEach(function (c) { defs.push(['cat:' + c, c]); });
    defs.forEach(function (d) {
      var b = el('button', { 'class': 'chip', type: 'button', role: 'tab', 'aria-selected': String(state.filter === d[0]), text: d[1] });
      b.addEventListener('click', function () {
        state.filter = d[0]; state.shown = PAGE_SIZE;
        if (location.hash.indexOf('#/n/') === 0) location.hash = '#/'; else { buildChips(); renderList(); }
      });
      box.appendChild(b);
    });
  }
  function matches(it) {
    var f = state.filter;
    if (f === 'instagram' && it.source !== 'instagram') return false;
    if (f === 'redaccion' && it.source === 'instagram') return false;
    if (f.indexOf('cat:') === 0 && it.category !== f.slice(4)) return false;
    if (state.q) {
      var hay = norm([it.title, it.summary, it.body, (it.tags || []).join(' '), label(it)].join(' '));
      if (hay.indexOf(norm(state.q)) < 0) return false;
    }
    return true;
  }

  /* ---------- piezas visuales ---------- */
  function media(it) {
    var m = el('div', { 'class': 'media' });
    var src = safeUrl(it.images && it.images[0]);
    m.appendChild(el('div', { 'class': 'ph', 'aria-hidden': 'true', text: (label(it) || 'D').charAt(0).toUpperCase() }));
    if (src) {
      var img = el('img', { src: src, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', function () { if (img.parentNode) img.parentNode.removeChild(img); });
      m.appendChild(img);
    }
    return m;
  }
  function kicker(it) {
    return el('div', { 'class': 'kicker' }, [label(it), el('span', { 'class': 'dot', text: '·' }), el('time', { datetime: it.date, text: fmtDate(it.date) })]);
  }
  function card(it, hero) {
    var link = el('a', { 'class': 'card-link', href: '#/n/' + encodeURIComponent(it.id) });
    var body = el('div', { 'class': 'body' }, [
      kicker(it),
      el(hero ? 'h2' : 'h3', { text: it.title }),
      it.summary ? el('p', { 'class': 'summary', text: it.summary }) : null
    ]);
    link.appendChild(media(it));
    link.appendChild(body);
    return el(hero ? 'section' : 'article', { 'class': hero ? 'hero' : 'card' }, [link]);
  }

  /* ---------- vistas ---------- */
  function renderList() {
    document.title = 'Didáctica Aumentada 3.0 — El Diario';
    clear(app);
    var list = state.items.filter(matches);
    if (!list.length) {
      app.appendChild(el('p', { 'class': 'empty', text: state.items.length ? 'No hay noticias que coincidan con tu búsqueda.' : 'Todavía no hay noticias publicadas.' }));
      return;
    }
    var rest = list;
    if (!state.q) { app.appendChild(card(list[0], true)); rest = list.slice(1); }
    var grid = el('div', { 'class': 'grid' });
    rest.slice(0, state.shown).forEach(function (it) { grid.appendChild(card(it, false)); });
    app.appendChild(grid);
    if (rest.length > state.shown) {
      var more = el('button', { 'class': 'more', type: 'button', text: 'Ver más noticias' });
      more.addEventListener('click', function () { state.shown += PAGE_SIZE; renderList(); });
      app.appendChild(more);
    }
  }

  function paragraphs(text) {
    var frag = document.createDocumentFragment();
    String(text || '').split(/\n\s*\n/).forEach(function (block) {
      if (!block.trim()) return;
      var p = el('p');
      block.split(/(https?:\/\/[^\s]+)/g).forEach(function (part) {
        if (/^https?:\/\//.test(part)) p.appendChild(el('a', { href: part, target: '_blank', rel: 'noopener noreferrer nofollow', text: part }));
        else if (part) p.appendChild(document.createTextNode(part));
      });
      frag.appendChild(p);
    });
    return frag;
  }

  /* Publicación original de Instagram (incrustado oficial), para notas manuales con enlace */
  function embedFor(url) {
    var m = /^https:\/\/www\.instagram\.com\/(p|reel|reels|tv)\/[\w-]+/i.exec(url || '');
    if (!m) return null;
    var clean = m[0] + '/';
    return el('div', { 'class': 'embed' }, [
      el('blockquote', { 'class': 'instagram-media', 'data-instgrm-permalink': clean, 'data-instgrm-version': '14' }, [
        el('a', { href: clean, target: '_blank', rel: 'noopener noreferrer', text: 'Ver esta publicación en Instagram' })
      ])
    ]);
  }
  function loadEmbedScript() {
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if (document.getElementById('igembed')) return;
    var s = document.createElement('script');
    s.id = 'igembed'; s.async = true; s.src = 'https://www.instagram.com/embed.js';
    document.body.appendChild(s);
  }

  function renderArticle(id) {
    clear(app);
    var it = null;
    state.items.forEach(function (x) { if (x.id === id) it = x; });
    var back = el('a', { 'class': 'back', href: '#/', text: '← Volver a la portada' });
    if (!it) {
      app.appendChild(el('div', { 'class': 'article' }, [back, el('p', { 'class': 'empty', text: 'No encontramos esa noticia.' })]));
      return;
    }
    document.title = it.title + ' — Didáctica Aumentada 3.0';
    var art = el('article', { 'class': 'article' });
    art.appendChild(back);
    art.appendChild(kicker(it));
    art.appendChild(el('h1', { text: it.title }));
    var by = [];
    if (it.author) by.push('Por ' + it.author);
    by.push(fmtDate(it.date, true));
    if (it.source === 'instagram') by.push('Publicado originalmente en Instagram');
    art.appendChild(el('div', { 'class': 'byline', text: by.join(' · ') }));

    var imgs = (it.images || []).map(safeUrl).filter(Boolean);
    if (imgs.length) {
      var g = el('div', { 'class': 'gallery', tabindex: '0', 'aria-label': 'Imágenes de la noticia' });
      imgs.forEach(function (u, i) {
        var im = el('img', { src: u, alt: 'Imagen ' + (i + 1) + ' de ' + imgs.length + ' — ' + it.title, loading: i ? 'lazy' : 'eager', decoding: 'async' });
        im.addEventListener('error', function () { if (im.parentNode && im.parentNode.parentNode) im.parentNode.parentNode.removeChild(im.parentNode); });
        g.appendChild(el('figure', null, [im]));
      });
      art.appendChild(g);
      if (imgs.length > 1) art.appendChild(el('p', { 'class': 'gallery-hint', text: imgs.length + ' imágenes · deslizá para ver más' }));
    }

    var text = el('div', { 'class': 'text' });
    text.appendChild(paragraphs(it.body || it.summary));
    art.appendChild(text);
    var emb = it.source !== 'instagram' ? embedFor(it.instagram_url) : null;
    if (emb) art.appendChild(emb);

    if (it.tags && it.tags.length) {
      art.appendChild(el('div', { 'class': 'tags' }, it.tags.map(function (t) { return el('span', { 'class': 'tag', text: '#' + String(t).replace(/^#/, '') }); })));
    }

    var actions = el('div', { 'class': 'actions' });
    var ig = safeUrl(it.url || it.instagram_url);
    if (ig) actions.appendChild(el('a', { 'class': 'btn', href: ig, target: '_blank', rel: 'noopener noreferrer', text: 'Ver en Instagram' }));
    var share = el('button', { 'class': 'btn ghost', type: 'button', text: 'Compartir' });
    share.addEventListener('click', function () {
      var url = location.href;
      if (navigator.share) { navigator.share({ title: it.title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { share.textContent = '¡Enlace copiado!'; });
      } else { window.prompt('Copiá el enlace:', url); }
    });
    actions.appendChild(share);
    art.appendChild(actions);
    app.appendChild(art);
    if (emb) loadEmbedScript();
  }

  function route() {
    var h = location.hash || '';
    if (h.indexOf('#/n/') === 0) {
      var id; try { id = decodeURIComponent(h.slice(4)); } catch (e) { id = h.slice(4); }
      renderArticle(id);
    } else {
      buildChips(); renderList();
    }
    window.scrollTo(0, 0);
  }

  /* ---------- arranque ---------- */
  function init() {
    var today = document.getElementById('today');
    if (today) today.textContent = fmtDate(new Date().toISOString(), true);
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

    var q = document.getElementById('q');
    q.addEventListener('input', function () {
      state.q = q.value.trim(); state.shown = PAGE_SIZE;
      if (location.hash.indexOf('#/n/') === 0) location.hash = '#/'; else renderList();
    });
    window.addEventListener('hashchange', route);

    fetch('data/noticias.json?v=' + Date.now(), { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        state.items = (data.items || []).filter(function (i) { return i && i.id && i.title; });
        var u = document.getElementById('updated');
        if (u && data.generated) u.textContent = 'Última actualización: ' + fmtDate(data.generated, true);
        route();
      })
      .catch(function () {
        clear(app);
        app.appendChild(el('p', { 'class': 'empty', text: 'No se pudieron cargar las noticias. Si abriste el archivo directamente desde tu computadora, probalo desde GitHub Pages o con un servidor local.' }));
      });
  }
  init();
})();
