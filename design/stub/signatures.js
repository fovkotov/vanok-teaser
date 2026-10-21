(function () {
  var COLORS = [
    { name: 'pink', hex: '#ff91f8', cast: 0xff91f8 },
    { name: 'blue', hex: '#0c6df4', cast: 0x0c6df4 },
    { name: 'green', hex: '#67c514', cast: 0x67c514 }
  ];
  var KEY = 'vanok_signatures_v1';
  var API = '/api/signatures';
  var PRESETS = [
    { id: 'preset-circle', kind: 'stamp', preset: true, text: 'Vanök Regular', src: 'design/stub/seal-circle-rings.svg' },
    { id: 'preset-apple', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stub/seal-apple-rings.svg' }
  ];
  var VB = {
    stamp: { w: 326, h: 326 },
    apple: { w: 323.17, h: 327.409 }
  };

  var items = [];
  var pending = null;
  var placed = { stamp: '', apple: '' };
  var kind = 'stamp';
  var colorIndex = 1;
  var texts = { stamp: '', apple: '' };
  var strokes = { stamp: [], apple: [] };
  var drawing = null;

  function loadLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(validItem) : [];
    } catch (err) {
      return [];
    }
  }
  function validItem(item) {
    return item && (item.kind === 'stamp' || item.kind === 'apple') && typeof item.src === 'string' && item.id;
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) {}
  }
  function userItems() {
    return items.filter(function (item) { return !item.preset; });
  }

  var store = {
    pool: function (which) {
      return userItems().filter(function (item) { return item.kind === which; });
    },
    peekNext: function () { return pending; },
    takeNext: function (which) {
      if (!pending || pending.kind !== which) return null;
      var item = pending;
      pending = null;
      return item;
    },
    lastPlaced: function (which) { return placed[which] || ''; },
    rememberPlaced: function (which, id) { placed[which] = id; },
    arm: function (item) { pending = item; }
  };
  window.VanokSignatures = store;

  var launcher = document.querySelector('.draw-sig-btn');
  var modal = document.createElement('div');
  modal.className = 'sig-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="sig-editor">' +
      '<button type="button" class="sig-close" aria-label="Close"></button>' +
      '<p class="sig-title">Draw Signature</p>' +
      '<div class="sig-stage">' +
        '<div class="sig-viewport"><div class="sig-track">' +
          slideMarkup('stamp', 'design/stub/seal-circle-rings.svg', '0 0 326 326',
            'M311 163 A148 148 0 0 0 15 163 A148 148 0 0 0 310.99 163') +
          slideMarkup('apple', 'design/stub/seal-apple-rings.svg', '0 0 323.17 327.409',
            'M270 196 A108 112 0 0 0 54 196 A108 112 0 0 0 269.9 196') +
        '</div></div>' +
        '<div class="sig-dots">' +
          '<button type="button" class="on" data-kind="stamp" aria-label="Circle template"></button>' +
          '<button type="button" data-kind="apple" aria-label="Apple template"></button>' +
        '</div>' +
        '<div class="sig-bar">' +
          '<div class="sig-swatches"></div>' +
          '<button type="button" class="sig-create">Create Signature</button>' +
        '</div>' +
      '</div>' +
      '<input class="sig-input" type="text" maxlength="160" autocomplete="off" aria-label="Signature text">' +
    '</div>' +
    '<div class="sig-library" hidden>' +
      '<button type="button" class="sig-close" aria-label="Close"></button>' +
      '<p class="sig-title">Signature Library</p>' +
      '<div class="sig-grid"></div>' +
      '<button type="button" class="draw-sig-btn sig-library-launch" aria-label="Draw Signature"></button>' +
    '</div>';
  document.body.appendChild(modal);

  function slideMarkup(name, src, viewBox, path) {
    return '<div class="sig-slide" data-kind="' + name + '">' +
      '<img alt="" src="' + src + '" draggable="false">' +
      '<svg viewBox="' + viewBox + '" aria-hidden="true">' +
        '<path id="sig-path-' + name + '" d="' + path + '" fill="none"/>' +
        '<text text-anchor="start" fill="#0c6df4">' +
          '<textPath href="#sig-path-' + name + '" startOffset="8">Type Here...</textPath>' +
        '</text>' +
      '</svg>' +
      '<canvas></canvas>' +
    '</div>';
  }

  var editor = modal.querySelector('.sig-editor');
  var library = modal.querySelector('.sig-library');
  var track = modal.querySelector('.sig-track');
  var input = modal.querySelector('.sig-input');
  var grid = modal.querySelector('.sig-grid');
  var swatches = modal.querySelector('.sig-swatches');
  var dots = modal.querySelectorAll('.sig-dots button');

  COLORS.forEach(function (color, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.style.background = color.hex;
    button.setAttribute('aria-label', color.name);
    if (index === colorIndex) button.className = 'on';
    button.addEventListener('click', function () {
      colorIndex = index;
      paintSwatches();
      paintText();
    });
    swatches.appendChild(button);
  });

  function paintSwatches() {
    var buttons = swatches.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle('on', i === colorIndex);
  }
  function selectedColor() { return COLORS[colorIndex]; }

  function paintText() {
    ['stamp', 'apple'].forEach(function (name) {
      var path = document.getElementById('sig-path-' + name);
      if (!path) return;
      var text = path.parentNode.querySelector('text');
      var node = path.parentNode.querySelector('textPath');
      var value = texts[name];
      node.textContent = value || 'Type Here...';
      text.setAttribute('fill', value ? selectedColor().hex : 'rgba(12,109,244,0.45)');
    });
  }
  paintText();

  function canvasOf(name) {
    return modal.querySelector('.sig-slide[data-kind="' + name + '"] canvas');
  }
  function redraw(name) {
    var canvas = canvasOf(name);
    var vb = VB[name];
    var ctx = canvas.getContext('2d');
    canvas.width = Math.round(vb.w * 2);
    canvas.height = Math.round(vb.h * 2);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, vb.w, vb.h);
    ctx.save();
    ctx.beginPath();
    if (name === 'stamp') ctx.arc(163, 163, 140, 0, Math.PI * 2);
    else ctx.ellipse(162, 196, 112, 118, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    strokes[name].forEach(function (stroke) {
      if (!stroke.points.length) return;
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (var i = 1; i < stroke.points.length - 1; i++) {
        var a = stroke.points[i];
        var b = stroke.points[i + 1];
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      var last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });
    ctx.restore();
  }
  redraw('stamp');
  redraw('apple');

  function zone(name, point) {
    if (name === 'stamp') {
      var d = Math.hypot(point.x - 163, point.y - 163);
      if (d < 140) return 'draw';
      if (d < 170) return 'text';
      return 'out';
    }
    var nx = (point.x - 162) / 112;
    var ny = (point.y - 196) / 118;
    var e = nx * nx + ny * ny;
    if (e < 1) return 'draw';
    if (e < 1.45) return 'text';
    return 'out';
  }
  function pointOf(event, canvas, name) {
    var rect = canvas.getBoundingClientRect();
    var vb = VB[name];
    return {
      x: (event.clientX - rect.left) / rect.width * vb.w,
      y: (event.clientY - rect.top) / rect.height * vb.h
    };
  }

  function showKind(next) {
    kind = next === 'apple' ? 'apple' : 'stamp';
    track.classList.toggle('is-apple', kind === 'apple');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', dots[i].dataset.kind === kind);
    input.value = texts[kind];
  }
  for (var d = 0; d < dots.length; d++) {
    dots[d].addEventListener('click', function (event) { showKind(event.currentTarget.dataset.kind); });
  }

  var swipe = null;
  modal.querySelectorAll('.sig-slide canvas').forEach(function (canvas) {
    canvas.addEventListener('pointerdown', function (event) {
      if (library.hidden === false) return;
      var name = canvas.parentNode.dataset.kind;
      if (name !== kind) return;
      var point = pointOf(event, canvas, name);
      var hit = zone(name, point);
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, name: name, point: point, hit: hit, moved: false };
      if (hit === 'draw') {
        drawing = { color: selectedColor().hex, points: [point] };
        strokes[name].push(drawing);
        canvas.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', function (event) {
      if (!swipe || event.pointerId !== swipe.id) return;
      var dx = event.clientX - swipe.x;
      var dy = event.clientY - swipe.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) swipe.moved = true;
      if (drawing && swipe.hit === 'draw') {
        drawing.points.push(pointOf(event, canvas, swipe.name));
        redraw(swipe.name);
      }
      event.preventDefault();
    });
    function finish(event) {
      if (!swipe || event.pointerId !== swipe.id) return;
      var dx = event.clientX - swipe.x;
      var wasDraw = swipe.hit === 'draw' && drawing && drawing.points.length > 1;
      if (!wasDraw && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - swipe.y)) {
        if (drawing) strokes[swipe.name].pop();
        showKind(dx < 0 ? 'apple' : 'stamp');
        redraw(swipe.name);
      } else if (swipe.hit === 'text' && !swipe.moved) {
        if (drawing) strokes[swipe.name].pop();
        input.focus();
      } else if (swipe.hit === 'draw' && drawing && drawing.points.length < 2 && !swipe.moved) {
        strokes[swipe.name].pop();
        redraw(swipe.name);
      }
      drawing = null;
      swipe = null;
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  });

  input.addEventListener('input', function () {
    texts[kind] = input.value.slice(0, 160);
    paintText();
  });
  modal.querySelectorAll('.sig-slide svg text').forEach(function (node) {
    node.style.cursor = 'text';
    node.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      input.focus();
    });
  });

  function openEditor() {
    modal.hidden = false;
    editor.hidden = false;
    library.hidden = true;
    if (launcher) launcher.classList.add('is-held');
    showKind(kind);
  }
  function openLibrary(freshId) {
    var from = modal.querySelector('.sig-viewport').getBoundingClientRect();
    modal.hidden = false;
    editor.hidden = true;
    library.hidden = false;
    if (launcher) launcher.classList.add('is-held');
    renderGrid(freshId, from);
  }
  function closeModal() {
    modal.hidden = true;
    editor.hidden = false;
    library.hidden = true;
    if (launcher) launcher.classList.remove('is-held');
    input.blur();
  }

  if (launcher) launcher.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (!modal.hidden && library.hidden) return;
    openEditor();
  });
  modal.querySelector('.sig-library-launch').addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    openEditor();
  });
  modal.querySelectorAll('.sig-close').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.code !== 'Escape' || modal.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    closeModal();
  }, true);

  function cardNode(item) {
    var card = document.createElement('div');
    card.className = 'sig-card';
    card.dataset.id = item.id;
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = item.src;
    card.appendChild(img);
    return card;
  }
  function renderGrid(freshId, from) {
    var list = userItems().concat(PRESETS);
    grid.replaceChildren.apply(grid, list.map(cardNode));
    if (!freshId || !from) return;
    var cards = Array.prototype.slice.call(grid.children);
    var after = cards.map(function (el) { return el.getBoundingClientRect(); });
    cards.forEach(function (el, index) {
      var to = after[index];
      var dx;
      var dy;
      var scale = 1;
      if (index === 0) {
        dx = from.left - to.left;
        dy = from.top - to.top;
        scale = from.width / Math.max(to.width, 1);
      } else {
        dx = after[index - 1].left - to.left;
        dy = after[index - 1].top - to.top;
      }
      el.style.transition = 'none';
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cards.forEach(function (el) {
          el.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
          el.style.transform = 'none';
        });
      });
    });
  }

  function drawText(ctx, path, text, color) {
    if (!path || !text) return;
    var length = path.getTotalLength();
    if (!length) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '13px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var width = ctx.measureText(text).width;
    var cursor = 8;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var w = ctx.measureText(ch).width;
      var mid = (cursor + w / 2) % length;
      var p = path.getPointAtLength(mid);
      var ahead = path.getPointAtLength((mid + 1) % length);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(ahead.y - p.y, ahead.x - p.x));
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      cursor += w;
    }
    ctx.restore();
  }

  function exportSeal(name) {
    var vb = VB[name];
    var ring = modal.querySelector('.sig-slide[data-kind="' + name + '"] img');
    return new Promise(function (resolve) {
      var draw = function () {
        var canvas = document.createElement('canvas');
        canvas.width = 539;
        canvas.height = 539;
        var ctx = canvas.getContext('2d');
        ctx.setTransform(539 / vb.w, 0, 0, 539 / vb.h, 0, 0);
        ctx.drawImage(ring, 0, 0, vb.w, vb.h);
        ctx.drawImage(canvasOf(name), 0, 0, vb.w, vb.h);
        if (texts[name]) drawText(ctx, document.getElementById('sig-path-' + name), texts[name], selectedColor().hex);
        resolve(canvas.toDataURL('image/png'));
      };
      if (ring.complete && ring.naturalWidth) draw();
      else ring.addEventListener('load', draw, { once: true });
    });
  }

  modal.querySelector('.sig-create').addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    var color = selectedColor();
    var madeKind = kind;
    exportSeal(madeKind).then(function (src) {
    var item = {
      id: 'sig-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      kind: madeKind,
      src: src,
      castHex: color.cast,
      colorName: color.name,
      text: texts[madeKind],
      createdAt: Date.now()
    };
    items.unshift(item);
    saveLocal();
    store.arm(item);
    postItem(item);
    openLibrary(item.id);
    });
  });

  function postItem(item) {
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).catch(function () {});
  }
  function merge(remote) {
    var map = new Map();
    remote.forEach(function (item) { if (validItem(item)) map.set(item.id, item); });
    items.forEach(function (item) { if (!map.has(item.id)) map.set(item.id, item); });
    items = Array.from(map.values()).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    saveLocal();
  }
  items = loadLocal();
  fetch(API).then(function (res) {
    if (!res.ok) throw new Error('signatures');
    return res.json();
  }).then(function (remote) {
    if (!Array.isArray(remote)) return;
    remote = remote.filter(validItem);
    merge(remote);
    var remoteIds = {};
    remote.forEach(function (item) { remoteIds[item.id] = true; });
    items.forEach(function (item) { if (!remoteIds[item.id]) postItem(item); });
    if (!library.hidden) renderGrid();
  }).catch(function () {});
})();
