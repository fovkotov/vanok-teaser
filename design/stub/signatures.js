(function () {
  var COLORS = [
    { name: 'pink', hex: '#ff91f8', cast: 0xff91f8 },
    { name: 'blue', hex: '#0c6df4', cast: 0x0c6df4 },
    { name: 'green', hex: '#67c514', cast: 0x67c514 }
  ];
  var KEY = 'vanok_signatures_v1';
  var CLEARED = 'vanok_signatures_v1_cleared';
  var POOL_KEY = 'vanok_signature_pool_v1';
  var API = '/api/signatures';
  var PRESETS = [
    { id: 'preset-apple-01', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stamps/apple-01.png', colorName: 'blue', castHex: 0x0c6df4 },
    { id: 'preset-stamp-01', kind: 'stamp', preset: true, text: 'Vanök Regular', src: 'design/stamps/stamp-01.png', colorName: 'blue', castHex: 0x0c70f4 },
    { id: 'preset-apple-02', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stamps/apple-02.png', colorName: 'pink', castHex: 0xff91f8 },
    { id: 'preset-stamp-02', kind: 'stamp', preset: true, text: 'Vanök Regular', src: 'design/stamps/stamp-02.png', colorName: 'pink', castHex: 0xff91f8 },
    { id: 'preset-apple-green', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stamps/apple-green.png', colorName: 'green', castHex: 0x67c514 },
    { id: 'preset-stamp-green', kind: 'stamp', preset: true, text: 'Vanök Regular', src: 'design/stamps/stamp-green.png', colorName: 'green', castHex: 0x67c514 },
    { id: 'preset-apple-281', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stamps/apple-281.png', colorName: 'blue', castHex: 0x0c6df4 },
    { id: 'preset-apple-282', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stamps/apple-282.png', colorName: 'pink', castHex: 0xff91f8 },
    { id: 'preset-apple-283', kind: 'apple', preset: true, text: 'Vanök Regular', src: 'design/stamps/apple-283.png', colorName: 'yellow', castHex: 0xffcc00 }
  ];
  var REMOVED_IDS = {
    'sig-mvipeu03-ril8': 1,
    'sig-mvipa8wh-qk2b': 1,
    'sig-mvioj76c-6nf4': 1,
    'sig-mvilqgeo-bzqn': 1,
    'sig-mvil8zgt-atu1': 1,
    'sig-mvijbazk-aqoh': 1,
    'sig-mvie2wct-9m0d': 1
  };
  var VB = {
    stamp: { w: 326, h: 326 },
    apple: { w: 323.17, h: 327.409 }
  };

  // Ink stays inside the bold outer contour. The path is a clip only.
  var INK_CLIP = {
    stamp: { cx: 163.003, cy: 162.999, r: 159.096 },
    apple: 'M175.172 4.22925L170.12 84.5456C187.131 71.0317 210.154 61.0921 231.416 61.092C262.138 61.092 284.799 79.3737 299.193 103.219C313.542 126.99 320.127 156.905 318.744 182.062C315.897 233.767 289.173 284.91 252.047 309.313L252.025 309.328L252.002 309.342L250.752 310.146L250.735 310.157L250.717 310.168C237.065 318.789 222.864 323.184 208.492 323.184H207.448L207.406 323.183C199.449 323.058 191.511 321.554 183.797 318.708L183.767 318.697C181.415 317.812 179.255 316.95 177.343 316.187L176.998 316.05L176.988 316.046L176.549 315.87C169.733 313.142 165.416 311.483 160.506 311.483C156.342 311.483 151.638 312.709 145.157 315.611L144.986 315.687L144.966 315.694C133.952 320.649 123.512 323.082 113.068 323.082C97.0881 323.082 81.4004 317.197 65.1475 305.265L65.1234 305.247L65.1 305.229C34.2531 282.035 11.5496 240.141 5.53045 195.696L5.39147 194.646C1.78082 166.756 6.34693 134.105 20.2692 108.229C34.2863 82.1775 58.0629 62.6491 92.4728 62.649C105.416 62.6491 119.03 66.6322 131.203 72.3306C138.796 75.8849 145.969 80.1723 152.225 84.741L143.196 4.22925H175.172Z'
  };
  function clipDrawing(ctx, name) {
    if (name === 'stamp') {
      var c = INK_CLIP.stamp;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.clip();
      return;
    }
    ctx.clip(new Path2D(INK_CLIP.apple));
  }
  function clipMarkup(name) {
    if (name === 'stamp') {
      var c = INK_CLIP.stamp;
      return '<clipPath id="sig-ink-clip"><circle cx="' + c.cx + '" cy="' + c.cy + '" r="' + c.r + '"/></clipPath>';
    }
    return '<clipPath id="sig-ink-clip"><path d="' + INK_CLIP.apple + '"/></clipPath>';
  }

  var items = [];
  var pending = null;
  var placed = { stamp: '', apple: '' };
  var kind = 'stamp';
  var colorIndex = 1;
  var texts = { stamp: '', apple: '' };
  var strokes = { stamp: [], apple: [] };
  var photos = { stamp: null, apple: null };
  var photoSources = { stamp: null, apple: null };
  var dither = { bias: -0.31, grain: 633 };
  var drawing = null;
  var photoPointers = [];
  var pinch = null;

  function loadLocal() {
    try {
      if (localStorage.getItem(CLEARED) !== '1') {
        localStorage.removeItem(KEY);
        localStorage.setItem(CLEARED, '1');
        return [];
      }
      var raw = localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      var kept = parsed.filter(validItem);
      if (kept.length !== parsed.length) {
        try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch (err) {}
      }
      return kept;
    } catch (err) {
      return [];
    }
  }
  function validItem(item) {
    return item && (item.kind === 'stamp' || item.kind === 'apple') && typeof item.src === 'string' && item.id && !REMOVED_IDS[item.id];
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) {}
  }
  function userItems() {
    return items.filter(function (item) { return !item.preset; });
  }
  var STOCK_FILES = {
    'apple-01.png': 1,
    'apple-02.png': 1,
    'apple-green.png': 1,
    'stamp-01.png': 1,
    'stamp-02.png': 1,
    'stamp-green.png': 1
  };
  var adopted = {};
  function fileName(src) {
    return String(src || '').split('/').pop().split('?')[0];
  }
  function listedSeal(item) {
    if (!item) return false;
    if (item.colorName === 'yellow') return false;
    var name = fileName(item.src || '');
    if (name === 'apple-281.png' || name === 'apple-282.png' || name === 'apple-283.png') return false;
    if (name === 'apple-03.png' || name === 'stamp-03.png') return false;
    return true;
  }
  function loadAdopted() {
    try {
      var raw = localStorage.getItem(POOL_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return;
      parsed.forEach(function (id) {
        var preset = null;
        for (var i = 0; i < PRESETS.length; i++) {
          if (PRESETS[i].id === id) preset = PRESETS[i];
        }
        if (preset && !STOCK_FILES[fileName(preset.src)]) adopted[id] = 1;
      });
    } catch (err) {}
  }
  function saveAdopted() {
    var ids = [];
    for (var id in adopted) if (adopted[id]) ids.push(id);
    try { localStorage.setItem(POOL_KEY, JSON.stringify(ids)); } catch (err) {}
  }
  function ensurePooled(item) {
    if (!item || !item.preset) return;
    if (STOCK_FILES[fileName(item.src)]) return;
    if (adopted[item.id]) return;
    adopted[item.id] = 1;
    saveAdopted();
  }

  var store = {
    pool: function (which) {
      var mine = userItems().filter(function (item) { return item.kind === which && listedSeal(item); });
      var extra = PRESETS.filter(function (item) {
        if (item.kind !== which) return false;
        if (STOCK_FILES[fileName(item.src)]) return true;
        return adopted[item.id] && listedSeal(item);
      });
      return mine.concat(extra);
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
    placeKey: function (item) {
      if (!item) return '';
      if (item.preset && STOCK_FILES[fileName(item.src)]) return fileName(item.src);
      return item.id || '';
    },
    arm: function (item) { pending = item; }
  };
  window.VanokSignatures = store;

  var launchers = Array.prototype.slice.call(document.querySelectorAll('.draw-sig-btn, .catalog-entry'));
  var modal = document.createElement('div');
  modal.className = 'sig-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="sig-editor" inert>' +
      '<div class="sig-head"><div class="sig-head-side">' +
        '<button type="button" class="sig-back" aria-label="Back"></button>' +
        '<p class="sig-title">Draw Signature</p>' +
      '</div><button type="button" class="sig-close" aria-label="Close"></button></div>' +
      '<div class="sig-stage">' +
          slideMarkup('stamp', 'design/stub/seal-circle-rings.svg', '0 0 326 326',
            'M297 163 A134 134 0 0 0 29 163 A134 134 0 0 0 296.99 163', '8') +
          slideMarkup('apple', 'design/stub/seal-apple-rings.svg', '0 0 323.17 327.409',
            'M154.0 107.8L166.1 108.1L169.7 107.0L174.7 103.3L176.9 101.2L178.9 99.5L181.0 97.8L183.1 96.2L185.2 94.6L187.4 93.1L189.8 91.5L192.0 90.3L194.2 88.9L196.9 87.6L198.9 86.6L201.6 85.2L204.0 84.3L206.2 83.3L209.0 82.3L211.4 81.5L214.0 80.7L216.8 80.1L219.1 79.6L221.3 79.1L224.0 78.7L226.5 78.4L228.7 78.3L231.4 78.1L234.0 78.3L236.5 78.4L239.0 78.7L241.3 79.1L243.4 79.5L245.9 80.1L248.8 80.9L250.8 81.8L252.7 82.5L255.2 83.6L257.4 84.8L259.7 86.0L261.7 87.4L263.6 88.6L265.7 90.2L267.8 91.8L269.8 93.7L271.6 95.4L273.4 97.3L275.0 99.0L276.6 100.9L278.5 103.1L280.1 105.4L281.4 107.3L283.0 109.6L284.4 111.8L285.8 114.2L287.0 116.4L288.4 119.0L289.6 121.5L290.7 123.7L291.9 126.6L292.8 129.1L293.6 131.2L294.7 133.9L295.6 136.8L296.4 139.3L297.1 141.8L297.8 144.5L298.5 147.2L299.1 149.8L299.7 152.6L300.1 155.3L300.6 158.1L300.9 160.8L301.2 163.4L301.5 166.5L301.6 169.2L301.7 171.5L301.8 174.3L301.8 177.3L301.7 179.9L301.6 182.6L301.4 185.2L301.2 188.1L300.8 190.9L300.5 193.8L300.0 196.5L299.6 198.9L299.2 201.8L298.5 204.9L297.9 207.3L297.4 210.1L296.6 212.9L296.0 215.4L295.1 218.3L294.3 220.8L293.5 223.6L292.5 226.4L291.7 228.7L290.6 231.5L289.6 234.0L288.5 236.7L287.3 239.3L286.3 241.6L285.0 244.3L283.7 246.9L282.4 249.3L281.2 251.5L279.7 254.1L278.3 256.4L276.8 259.0L275.3 261.2L274.0 263.3L272.2 265.9L270.4 268.2L268.8 270.3L267.3 272.2L265.5 274.5L263.6 276.6L261.9 278.5L259.9 280.6L257.9 282.6L256.1 284.3L254.2 286.1L251.9 288.1L249.9 289.7L248.0 291.3L245.7 292.9L243.4 294.5L241.3 295.9L239.3 297.1L236.7 298.6L234.6 299.6L232.1 300.9L229.6 301.8L227.6 302.6L225.1 303.5L222.5 304.2L220.5 304.7L217.8 305.3L215.1 305.6L213.0 305.9L210.8 306.0L208.2 306.2L205.6 306.0L203.4 305.9L200.8 305.6L198.1 305.1L195.6 304.5L193.4 303.9L191.4 303.3L188.4 302.2L186.0 301.2L183.5 300.3L180.4 299.0L177.4 297.8L174.1 296.7L170.4 295.7L166.4 294.9L162.3 294.4L158.0 294.5L153.8 295.0L150.1 295.7L146.3 296.9L142.9 298.0L139.9 299.3L137.2 300.4L134.5 301.6L131.9 302.5L129.9 303.2L127.3 304.1L124.7 304.6L122.1 305.2L119.6 305.5L117.6 305.8L114.9 305.9L112.8 305.9L110.7 305.9L107.6 305.7L105.0 305.3L103.5 305.0L100.9 304.5L98.0 303.6L95.8 302.8L93.6 302.0L91.2 301.0L89.0 299.9L86.8 298.9L84.4 297.5L82.0 296.1L79.5 294.5L77.7 293.2L75.5 291.7L73.3 289.9L71.5 288.5L69.2 286.6L67.0 284.5L65.4 282.9L63.5 281.1L61.3 278.8L59.6 276.9L57.9 274.9L56.2 273.0L54.4 270.7L52.6 268.3L51.0 266.2L49.5 264.0L47.8 261.7L46.3 259.2L44.9 256.9L43.5 254.5L42.3 252.4L40.7 249.7L39.3 246.9L38.3 244.8L37.1 242.5L35.8 239.7L34.7 237.0L33.6 234.6L32.6 232.1L31.5 229.4L30.5 226.4L29.7 224.1L28.9 221.7L28.0 218.8L27.1 215.8L26.5 213.3L25.8 210.9L25.0 207.8L24.5 205.0L24.0 202.6L23.4 199.8L22.9 196.7L22.6 194.0L22.3 191.5L22.0 188.9L21.7 186.0L21.5 183.3L21.4 180.2L21.4 177.4L21.4 175.1L21.4 172.3L21.5 169.5L21.6 166.7L21.9 163.7L22.2 161.2L22.4 158.4L22.8 155.7L23.2 152.8L23.8 149.8L24.3 147.8L24.7 145.2L25.5 142.1L26.2 139.4L27.0 136.8L27.8 134.1L28.7 131.5L29.6 129.2L30.5 126.9L31.6 124.0L32.7 121.7L33.8 119.2L35.2 116.6L36.4 114.6L37.6 112.2L39.2 109.9L40.6 107.8L41.9 105.8L43.8 103.4L45.4 101.5L46.9 99.8L48.7 97.9L50.6 96.0L52.6 94.3L54.5 92.7L56.5 91.2L58.6 89.7L60.6 88.4L62.5 87.2L64.9 86.0L67.1 84.9L69.9 83.7L72.3 83.0L73.9 82.5L76.4 81.7L79.3 81.1L81.4 80.7L84.0 80.3L86.5 80.0L89.2 79.9L91.4 79.8L94.2 79.8L96.7 79.9L99.2 80.2L101.4 80.6L104.0 81.0L106.8 81.7L109.0 82.2L111.7 83.0L114.0 83.8L116.3 84.6L119.0 85.6L121.7 86.8L124.1 87.9L126.4 89.0L128.6 90.1L131.3 91.5L133.7 93.0L136.1 94.4L138.2 95.8L140.5 97.3L142.7 99.0L144.6 100.4L146.9 102.2L148.4 103.6L154.6 108.1Z',
            '25.8%') +
      '</div>' +
      '<div class="sig-swatches"></div>' +
      '<div class="sig-bar">' +
        '<button type="button" class="sig-upload"><span class="sig-upload-mark" aria-hidden="true"></span>Upload Image</button>' +
        '<button type="button" class="sig-create">Create Signature<span class="sig-create-mark" aria-hidden="true"></span></button>' +
        '<input class="sig-file" type="file" accept="image/*" tabindex="-1" aria-hidden="true">' +
      '</div>' +
      '<input class="sig-input" type="text" maxlength="160" autocomplete="off" aria-label="Signature text">' +
    '</div>' +
    '<div class="sig-shapes" inert>' +
      '<div class="sig-head"><div class="sig-head-side">' +
        '<button type="button" class="sig-back" aria-label="Back"></button>' +
        '<p class="sig-title">Choose form</p>' +
      '</div><button type="button" class="sig-close" aria-label="Close"></button></div>' +
      '<button type="button" class="sig-shape" data-kind="stamp" aria-label="Circle"><span class="sig-shape-art" style="-webkit-mask:url(design/stub/seal-circle-rings.svg) center / 100% 100% no-repeat;mask:url(design/stub/seal-circle-rings.svg) center / 100% 100% no-repeat"></span></button>' +
      '<button type="button" class="sig-shape" data-kind="apple" aria-label="Apple"><span class="sig-shape-art" style="-webkit-mask:url(design/stub/seal-apple-rings.svg) center / 100% 100% no-repeat;mask:url(design/stub/seal-apple-rings.svg) center / 100% 100% no-repeat"></span></button>' +
    '</div>' +
    '<div class="sig-library" inert>' +
      '<div class="sig-head">' +
        '<p class="sig-title">Signature Library</p>' +
        '<button type="button" class="sig-close" aria-label="Close"></button>' +
      '</div>' +
      '<div class="sig-grid"></div>' +
    '</div>';
  document.body.appendChild(modal);

  function slideMarkup(name, src, viewBox, path, offset) {
    var mask = 'url(' + src + ') center / 100% 100% no-repeat';
    return '<div class="sig-slide' + (name === 'stamp' ? ' is-on' : '') + '" data-kind="' + name + '">' +
      '<div class="sig-seal">' +
        '<div class="sig-rings" style="-webkit-mask:' + mask + ';mask:' + mask + '"></div>' +
        '<svg viewBox="' + viewBox + '" aria-hidden="true">' +
          '<path id="sig-path-' + name + '" d="' + path + '" fill="none"/>' +
          '<text text-anchor="start" fill="#0c6df4">' +
            '<textPath href="#sig-path-' + name + '" startOffset="' + offset + '">Type Here...</textPath>' +
          '</text>' +
          '<line class="sig-caret" x1="0" y1="-7" x2="0" y2="5" stroke-width="1.4" stroke-linecap="round"></line>' +
        '</svg>' +
      '</div>' +
      '<canvas></canvas>' +
    '</div>';
  }

  var editor = modal.querySelector('.sig-editor');
  var shapes = modal.querySelector('.sig-shapes');
  var library = modal.querySelector('.sig-library');
  var input = modal.querySelector('.sig-input');
  var grid = modal.querySelector('.sig-grid');
  var swatches = modal.querySelector('.sig-swatches');

  COLORS.forEach(function (color, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.style.background = color.hex;
    button.setAttribute('aria-label', color.name);
    if (index === colorIndex) button.className = 'on';
    button.addEventListener('click', function () {
      colorIndex = index;
      paintSwatches();
      applyInk();
    });
    swatches.appendChild(button);
  });

  function paintSwatches() {
    var buttons = swatches.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle('on', i === colorIndex);
  }
  function selectedColor() { return COLORS[colorIndex]; }

  var editing = false;

  function paintText() {
    ['stamp', 'apple'].forEach(function (name) {
      var path = document.getElementById('sig-path-' + name);
      if (!path) return;
      var text = path.parentNode.querySelector('text');
      var node = path.parentNode.querySelector('textPath');
      var value = texts[name];
      var placeholder = !value && !(editing && name === kind);
      node.textContent = placeholder ? 'Type Here...' : (value || '');
      text.setAttribute('fill', selectedColor().hex);
      text.setAttribute('fill-opacity', placeholder ? '0.45' : '1');
    });
  }
  function textWidth(value) {
    if (!value) return 0;
    var ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '13px Arial, Helvetica, sans-serif';
    return ctx.measureText(value).width;
  }
  function placeCaret() {
    ['stamp', 'apple'].forEach(function (name) {
      var caret = document.querySelector('.sig-slide[data-kind="' + name + '"] .sig-caret');
      if (!caret) return;
      if (!editing || name !== kind) {
        caret.classList.remove('is-on');
        return;
      }
      var path = document.getElementById('sig-path-' + name);
      var value = texts[name] || '';
      var index = input.selectionStart == null ? value.length : input.selectionStart;
      var length = path.getTotalLength();
      var raw = pathStart(path) + textWidth(value.slice(0, index));
      var offset = ((raw % length) + length) % length;
      var point = path.getPointAtLength(offset);
      var ahead = path.getPointAtLength(Math.min(offset + 1, path.getTotalLength()));
      var angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI;
      caret.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ') rotate(' + angle + ')');
      caret.setAttribute('stroke', selectedColor().hex);
      caret.classList.add('is-on');
    });
  }
  var editingLock = false;
  function beginEdit() {
    editing = true;
    editingLock = true;
    input.value = texts[kind] || '';
    paintText();
    var caption = modal.querySelector('.sig-slide[data-kind="' + kind + '"] text');
    if (caption) caption.style.visibility = '';
    placeCaret();
    try { input.focus({ preventScroll: true }); }
    catch (err) { input.focus(); }
    clearTimeout(beginEdit.timer);
    beginEdit.timer = setTimeout(function () { editingLock = false; }, 400);
  }
  function paintRings() {
    var hex = selectedColor().hex;
    modal.querySelectorAll('.sig-rings').forEach(function (el) { el.style.background = hex; });
  }
  function hexToRgb(hex) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function ditherImage(img) {
    var maxSide = dither.grain;
    var scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
    var w = Math.max(1, Math.round(img.width * scale));
    var h = Math.max(1, Math.round(img.height * scale));
    var sample = document.createElement('canvas');
    sample.width = w;
    sample.height = h;
    var ctx = sample.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h).data;
    var mask = new Uint8Array(w * h);
    var bias = dither.bias;
    for (var i = 0; i < w * h; i++) {
      var o = i * 4;
      var lum = (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) * (data[o + 3] / 255);
      var chance = lum / 255;
      if (bias) chance = Math.min(1, Math.max(0, chance + bias));
      mask[i] = Math.random() < chance ? 1 : 0;
    }
    return { mask: mask, w: w, h: h };
  }
  function tintPhoto(photo, hex) {
    var canvas = document.createElement('canvas');
    canvas.width = photo.w;
    canvas.height = photo.h;
    var ctx = canvas.getContext('2d');
    var image = ctx.createImageData(photo.w, photo.h);
    var rgb = hexToRgb(hex);
    var out = image.data;
    for (var i = 0; i < photo.mask.length; i++) {
      if (!photo.mask[i]) continue;
      var o = i * 4;
      out[o] = rgb[0];
      out[o + 1] = rgb[1];
      out[o + 2] = rgb[2];
      out[o + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    photo.tinted = canvas;
  }
  function placePhoto(name, img) {
    photoSources[name] = img;
    var dithered = ditherImage(img);
    var vb = VB[name];
    var photo = {
      mask: dithered.mask,
      w: dithered.w,
      h: dithered.h,
      userScale: 1,
      cx: vb.w / 2,
      cy: vb.h / 2,
      fit: Math.max(vb.w / dithered.w, vb.h / dithered.h)
    };
    tintPhoto(photo, selectedColor().hex);
    photos[name] = photo;
    redraw(name);
  }
  function reditherPhoto(name) {
    var img = photoSources[name];
    var photo = photos[name];
    if (!img || !photo) return;
    var dithered = ditherImage(img);
    var vb = VB[name];
    photo.mask = dithered.mask;
    photo.w = dithered.w;
    photo.h = dithered.h;
    photo.fit = Math.max(vb.w / dithered.w, vb.h / dithered.h);
    tintPhoto(photo, selectedColor().hex);
    redraw(name);
  }
  function setDither(next) {
    if (next) {
      if (typeof next.bias === 'number' && isFinite(next.bias)) {
        dither.bias = Math.abs(next.bias) < 1e-6 ? 0 : next.bias;
      }
      if (typeof next.grain === 'number' && isFinite(next.grain)) dither.grain = next.grain;
      reditherPhoto('stamp');
      reditherPhoto('apple');
    }
    return { bias: dither.bias, grain: dither.grain };
  }
  store.setDither = setDither;
  function scalePhoto(name, photo, next, anchor) {
    next = Math.max(0.35, Math.min(6, next));
    var k = next / photo.userScale;
    if (anchor) {
      photo.cx = anchor.x - (anchor.x - photo.cx) * k;
      photo.cy = anchor.y - (anchor.y - photo.cy) * k;
    }
    photo.userScale = next;
    redraw(name);
  }
  function drawPhoto(ctx, name) {
    var photo = photos[name];
    if (!photo || !photo.tinted) return;
    var dw = photo.w * photo.fit * photo.userScale;
    var dh = photo.h * photo.fit * photo.userScale;
    ctx.drawImage(photo.tinted, photo.cx - dw / 2, photo.cy - dh / 2, dw, dh);
  }
  function applyInk() {
    var hex = selectedColor().hex;
    ['stamp', 'apple'].forEach(function (name) {
      strokes[name].forEach(function (stroke) { stroke.color = hex; });
      if (photos[name]) tintPhoto(photos[name], hex);
      redraw(name);
    });
    paintText();
    paintRings();
    placeCaret();
  }

  function canvasOf(name) {
    return modal.querySelector('.sig-slide[data-kind="' + name + '"] canvas');
  }
  function redraw(name) {
    var canvas = canvasOf(name);
    var seal = canvas.parentNode.querySelector('.sig-seal');
    var vb = VB[name];
    var ctx = canvas.getContext('2d');
    var canvasRect = canvas.getBoundingClientRect();
    var sealRect = seal.getBoundingClientRect();
    var unit = 2;
    var originX = 0;
    var originY = 0;
    if (canvasRect.width > 2 && sealRect.width > 2) {
      var dpr = 2;
      canvas.width = Math.round(canvasRect.width * dpr);
      canvas.height = Math.round(canvasRect.height * dpr);
      var px = canvas.width / canvasRect.width;
      unit = px * (sealRect.width / vb.w);
      originX = (sealRect.left - canvasRect.left) * px;
      originY = (sealRect.top - canvasRect.top) * (canvas.height / canvasRect.height);
      ctx.setTransform(unit, 0, 0, unit, originX, originY);
      ctx.clearRect(-originX / unit - 20, -originY / unit - 20, canvas.width / unit + 40, canvas.height / unit + 40);
    } else {
      canvas.width = Math.round(vb.w * 2);
      canvas.height = Math.round(vb.h * 2);
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, vb.w, vb.h);
    }
    ctx.save();
    clipDrawing(ctx, name);
    drawPhoto(ctx, name);
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
  applyInk();

  function zone(name, point) {
    if (name === 'stamp') {
      var d = Math.hypot(point.x - 163, point.y - 163);
      if (d >= 120 && d < 152) return 'text';
      return 'draw';
    }
    if (nearPath(document.getElementById('sig-path-apple'), point, 18)) return 'text';
    return 'draw';
  }
  function pathStart(path) {
    var node = path.parentNode.querySelector('textPath');
    var offset = node.getAttribute('startOffset') || '0';
    var length = path.getTotalLength();
    if (String(offset).indexOf('%') >= 0) return length * parseFloat(offset) / 100;
    return parseFloat(offset) || 0;
  }
  function nearPath(path, point, maxDist) {
    if (!path) return false;
    var length = path.getTotalLength();
    var best = 1e9;
    for (var d = 0; d <= length; d += 6) {
      var p = path.getPointAtLength(d);
      var dist = Math.hypot(p.x - point.x, p.y - point.y);
      if (dist < best) best = dist;
    }
    return best <= maxDist;
  }
  function pointOf(event, canvas, name) {
    var seal = canvas.parentNode.querySelector('.sig-seal');
    var rect = seal.getBoundingClientRect();
    var vb = VB[name];
    return {
      x: (event.clientX - rect.left) / Math.max(rect.width, 1) * vb.w,
      y: (event.clientY - rect.top) / Math.max(rect.height, 1) * vb.h
    };
  }

  function showKind(next) {
    var nextKind = next === 'apple' ? 'apple' : 'stamp';
    if (nextKind !== kind) editing = false;
    kind = nextKind;
    modal.querySelectorAll('.sig-slide').forEach(function (slide) {
      slide.classList.toggle('is-on', slide.dataset.kind === kind);
    });
    input.value = texts[kind] || '';
    paintText();
    placeCaret();
  }

  var swipe = null;
  function rememberPointer(event) {
    for (var i = 0; i < photoPointers.length; i++) {
      if (photoPointers[i].id === event.pointerId) {
        photoPointers[i].x = event.clientX;
        photoPointers[i].y = event.clientY;
        return;
      }
    }
    photoPointers.push({ id: event.pointerId, x: event.clientX, y: event.clientY });
  }
  function forgetPointer(id) {
    photoPointers = photoPointers.filter(function (pointer) { return pointer.id !== id; });
    if (photoPointers.length < 2) pinch = null;
  }
  modal.querySelectorAll('.sig-slide canvas').forEach(function (canvas) {
    canvas.addEventListener('pointerdown', function (event) {
      if (!editor.classList.contains('is-on')) return;
      var name = canvas.parentNode.dataset.kind;
      if (name !== kind) return;
      var point = pointOf(event, canvas, name);
      var hit = zone(name, point);
      if (hit === 'text') {
        event.preventDefault();
        event.stopPropagation();
        beginEdit();
        return;
      }
      rememberPointer(event);
      if (photos[name] && photoPointers.length >= 2) {
        if (drawing) {
          strokes[name].pop();
          drawing = null;
          redraw(name);
        }
        var a = photoPointers[0];
        var b = photoPointers[1];
        pinch = {
          name: name,
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          scale: photos[name].userScale,
          cx: photos[name].cx,
          cy: photos[name].cy,
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2
        };
        swipe = { id: event.pointerId, name: name, hit: 'pinch', moved: true };
        event.preventDefault();
        return;
      }
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, name: name, point: point, hit: hit, moved: false };
      if (hit === 'draw') {
        drawing = { color: selectedColor().hex, points: [point] };
        strokes[name].push(drawing);
        canvas.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', function (event) {
      rememberPointer(event);
      if (pinch && photos[pinch.name] && photoPointers.length >= 2) {
        var a = photoPointers[0];
        var b = photoPointers[1];
        var photo = photos[pinch.name];
        var dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        var next = Math.max(0.35, Math.min(6, pinch.scale * dist / pinch.dist));
        var seal = canvas.parentNode.querySelector('.sig-seal');
        var rect = seal.getBoundingClientRect();
        var vb = VB[pinch.name];
        var mx = (a.x + b.x) / 2;
        var my = (a.y + b.y) / 2;
        photo.userScale = next;
        photo.cx = pinch.cx + (mx - pinch.mx) / Math.max(rect.width, 1) * vb.w;
        photo.cy = pinch.cy + (my - pinch.my) / Math.max(rect.height, 1) * vb.h;
        redraw(pinch.name);
        event.preventDefault();
        return;
      }
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
      forgetPointer(event.pointerId);
      if (!swipe || event.pointerId !== swipe.id) return;
      if (swipe.hit === 'draw' && drawing && drawing.points.length < 2 && !swipe.moved) {
        strokes[swipe.name].pop();
        redraw(swipe.name);
      }
      drawing = null;
      swipe = null;
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    canvas.addEventListener('wheel', function (event) {
      var name = canvas.parentNode.dataset.kind;
      var photo = photos[name];
      if (!photo || !editor.classList.contains('is-on') || name !== kind) return;
      event.preventDefault();
      var point = pointOf(event, canvas, name);
      var next = photo.userScale * Math.exp(-event.deltaY * 0.0012);
      scalePhoto(name, photo, next, point);
    }, { passive: false });
  });

  function syncFromInput() {
    texts[kind] = input.value.slice(0, 160);
    paintText();
    placeCaret();
  }
  input.addEventListener('input', syncFromInput);
  input.addEventListener('keyup', placeCaret);
  input.addEventListener('click', placeCaret);
  input.addEventListener('blur', function () {
    if (editingLock) {
      try { input.focus({ preventScroll: true }); }
      catch (err) { input.focus(); }
      return;
    }
    editing = false;
    paintText();
    placeCaret();
  });
  document.addEventListener('selectionchange', function () {
    if (document.activeElement === input) placeCaret();
  });
  modal.querySelectorAll('.sig-slide svg text').forEach(function (node) {
    node.style.cursor = 'text';
    node.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      beginEdit();
    });
  });

  function leaveDraw() {
    editing = false;
    editingLock = false;
    clearTimeout(beginEdit.timer);
    paintText();
    placeCaret();
    try { input.blur(); } catch (err) {}
  }
  function holdLauncher(held) {
    for (var i = 0; i < launchers.length; i++) launchers[i].classList.toggle('is-held', held);
  }
  function motionOff() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  var modalGen = 0;
  function setScreen(name) {
    var map = { library: library, shapes: shapes, editor: editor };
    Object.keys(map).forEach(function (key) {
      var el = map[key];
      var on = key === name;
      el.classList.toggle('is-on', on);
      if (on) el.removeAttribute('inert');
      else el.setAttribute('inert', '');
    });
  }
  function revealModal() {
    modalGen += 1;
    var opening = modal.hidden;
    modal.hidden = false;
    holdLauncher(true);
    if (!opening || motionOff()) {
      modal.classList.add('is-open');
      return;
    }
    modal.classList.remove('is-open');
    void modal.offsetWidth;
    modal.classList.add('is-open');
  }
  function openEditor(nextKind) {
    leaveDraw();
    setScreen('editor');
    revealModal();
    showKind(nextKind || kind);
    requestAnimationFrame(function () {
      redraw('stamp');
      redraw('apple');
    });
  }
  function openShapes() {
    clearFlight();
    leaveDraw();
    setScreen('shapes');
    revealModal();
  }
  function openLibrary(freshId) {
    var from = null;
    if (freshId) {
      var seal = modal.querySelector('.sig-slide[data-kind="' + kind + '"] .sig-seal');
      if (seal) from = seal.getBoundingClientRect();
    }
    clearFlight();
    leaveDraw();
    setScreen('library');
    revealModal();
    grid.scrollTop = 0;
    renderGrid(freshId, from);
  }
  function closeModal() {
    clearFlight();
    leaveDraw();
    holdLauncher(false);
    if (modal.hidden) return;
    var gen = modalGen;
    modal.classList.remove('is-open');
    function finish() {
      if (gen !== modalGen) return;
      modal.hidden = true;
    }
    if (motionOff()) {
      finish();
      return;
    }
    var timer = setTimeout(finish, 320);
    function onEnd(event) {
      if (event.target !== modal || event.propertyName !== 'opacity') return;
      clearTimeout(timer);
      modal.removeEventListener('transitionend', onEnd);
      finish();
    }
    modal.addEventListener('transitionend', onEnd);
  }

  for (var li = 0; li < launchers.length; li++) {
    launchers[li].addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!modal.hidden) return;
      openLibrary();
    });
  }
  function findCatalogItem(id) {
    var list = catalog();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function paintArmed() {
    var armed = pending && pending.id;
    var cards = grid.querySelectorAll('.sig-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('is-armed', !!armed && cards[i].dataset.id === armed);
    }
  }
  function placeLibrarySeal(item) {
    ensurePooled(item);
    closeModal();
    var vw = window.innerWidth || 1;
    var vh = window.innerHeight || 1;
    var reach = vh * 0.15 + 24;
    var mx = Math.min(reach, vw * 0.32);
    var my = Math.min(reach, vh * 0.32);
    var x = mx + Math.random() * Math.max(1, vw - mx * 2);
    var y = my + Math.random() * Math.max(1, vh - my * 2);
    if (typeof window.__vanokPlaceSeal === 'function') window.__vanokPlaceSeal(item, x, y);
  }
  grid.addEventListener('click', function (event) {
    if (event.target.closest('.sig-add')) {
      event.preventDefault();
      event.stopPropagation();
      openShapes();
      return;
    }
    var card = event.target.closest('.sig-card');
    if (!card || !card.dataset.id) return;
    event.preventDefault();
    event.stopPropagation();
    var item = findCatalogItem(card.dataset.id);
    if (!item) return;
    placeLibrarySeal(item);
  });
  var flightArt = null;
  var flightHome = null;
  var flightToken = 0;
  var flightTimer = 0;
  var flightWatch = null;
  function restoreFlightArt() {
    var art = flightArt;
    var home = flightHome;
    if (art && flightWatch) art.removeEventListener('transitionend', flightWatch);
    flightWatch = null;
    if (flightTimer) clearTimeout(flightTimer);
    flightTimer = 0;
    if (art) {
      if (home) home.appendChild(art);
      art.style.transition = '';
      art.style.transform = '';
      art.style.left = '';
      art.style.top = '';
      art.style.width = '';
      art.style.height = '';
      art.classList.remove('sig-flight');
    }
    flightArt = null;
    flightHome = null;
    var targets = modal.querySelectorAll('.sig-seal.is-flight-target');
    for (var ti = 0; ti < targets.length; ti++) targets[ti].classList.remove('is-flight-target');
  }
  function clearFlight() {
    flightToken += 1;
    restoreFlightArt();
  }
  function flyToDraw(button) {
    var nextKind = button.dataset.kind === 'apple' ? 'apple' : 'stamp';
    if (motionOff()) {
      openEditor(nextKind);
      return;
    }
    var art = button.querySelector('.sig-shape-art');
    var from = art && art.getBoundingClientRect();
    if (!art || !from || from.width < 2 || from.height < 2) {
      openEditor(nextKind);
      return;
    }
    clearFlight();
    var token = flightToken;
    art.classList.add('sig-flight');
    art.style.left = from.left + 'px';
    art.style.top = from.top + 'px';
    art.style.width = from.width + 'px';
    art.style.height = from.height + 'px';
    art.style.transform = 'translate3d(0,0,0)';
    art.style.transition = 'none';
    modal.appendChild(art);
    flightArt = art;
    flightHome = button;
    openEditor(nextKind);
    var seal = modal.querySelector('.sig-slide[data-kind="' + nextKind + '"] .sig-seal');
    if (!seal) {
      clearFlight();
      return;
    }
    seal.classList.add('is-flight-target');
    var to = seal.getBoundingClientRect();
    if (to.width < 2 || to.height < 2) {
      clearFlight();
      return;
    }
    var dx = to.left - from.left;
    var dy = to.top - from.top;
    var sx = to.width / from.width;
    var sy = to.height / from.height;
    var landed = false;
    var spins = 0;
    function editorShown() {
      return parseFloat(window.getComputedStyle(editor).opacity) >= 0.99;
    }
    function land() {
      if (token !== flightToken || landed) return;
      if (!editorShown() && spins < 45) {
        spins += 1;
        requestAnimationFrame(land);
        return;
      }
      landed = true;
      restoreFlightArt();
    }
    function onMove(event) {
      if (event.target !== art || event.propertyName !== 'transform') return;
      land();
    }
    flightWatch = onMove;
    art.addEventListener('transitionend', onMove);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (token !== flightToken) return;
        art.style.transition = 'transform 560ms cubic-bezier(0.22, 1, 0.36, 1)';
        art.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(' + sx + ',' + sy + ')';
      });
    });
    flightTimer = setTimeout(land, 980);
  }
  modal.querySelectorAll('.sig-shape').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      flyToDraw(button);
    });
  });
  modal.addEventListener('click', function (event) {
    var control = event.target.closest('.sig-back, .sig-close');
    if (!control) return;
    event.preventDefault();
    event.stopPropagation();
    if (control.classList.contains('sig-close')) {
      closeModal();
      return;
    }
    if (editor.classList.contains('is-on')) openShapes();
    else if (shapes.classList.contains('is-on')) openLibrary();
    else closeModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.code !== 'Escape' || modal.hidden || !modal.classList.contains('is-open')) return;
    event.preventDefault();
    event.stopPropagation();
    if (editor.classList.contains('is-on')) openShapes();
    else if (shapes.classList.contains('is-on')) openLibrary();
    else closeModal();
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
    if (pending && pending.id === item.id) card.classList.add('is-armed');
    return card;
  }
  function catalog() {
    var presets = PRESETS.filter(function (item) {
      if (STOCK_FILES[fileName(item.src)]) return true;
      return listedSeal(item);
    });
    return userItems().filter(listedSeal).concat(presets);
  }
  function addCard() {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'sig-card sig-add';
    button.setAttribute('aria-label', 'Create Signature');
    return button;
  }
  function renderGrid(freshId, from) {
    var list = catalog();
    var nodes = [addCard()].concat(list.map(cardNode));
    grid.replaceChildren.apply(grid, nodes);
    if (!freshId || !from || from.width < 1) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    var cards = Array.prototype.slice.call(grid.children);
    var fresh = null;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].dataset.id === freshId) fresh = cards[i];
    }
    if (!fresh) return;
    var after = cards.map(function (el) { return el.getBoundingClientRect(); });
    var movers = [];
    cards.forEach(function (el, index) {
      if (el.classList.contains('sig-add')) return;
      var to = after[index];
      var dx = 0;
      var dy = 0;
      var scale = 1;
      if (el === fresh) {
        dx = from.left - to.left;
        dy = from.top - to.top;
        scale = from.width / Math.max(to.width, 1);
      } else if (index > 0) {
        dx = after[index - 1].left - to.left;
        dy = after[index - 1].top - to.top;
      }
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.02) return;
      el.style.transition = 'none';
      el.style.transformOrigin = 'top left';
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
      movers.push(el);
    });
    if (!movers.length) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        function release(el) {
          el.style.transform = '';
          el.style.transition = '';
          el.style.transformOrigin = '';
        }
        function onEnd(event) {
          if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
          event.currentTarget.removeEventListener('transitionend', onEnd);
          release(event.currentTarget);
        }
        movers.forEach(function (el) {
          el.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease';
          el.style.transform = 'none';
          el.addEventListener('transitionend', onEnd);
        });
        setTimeout(function () {
          movers.forEach(function (el) {
            el.removeEventListener('transitionend', onEnd);
            release(el);
          });
        }, 500);
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
    var cursor = pathStart(path);
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

  var RING_BODY = {
    stamp: "<g id=\"Frame 315\">\n<path id=\"Ellipse 13\" d=\"M310.056 162.998C310.056 244.216 244.216 310.056 162.998 310.056C81.7798 310.056 15.9398 244.216 15.9398 162.998C15.9398 81.7798 81.7798 15.9398 162.998 15.9398C244.216 15.9398 310.056 81.7798 310.056 162.998Z\" stroke-width=\"0.650699\" stroke=\"#0C6DF4\"/>\n\n<path id=\"Ellipse 15\" d=\"M325.675 163C325.675 252.843 252.843 325.675 163 325.675C73.1573 325.675 0.325349 252.843 0.325349 163C0.325349 73.1573 73.1573 0.325349 163 0.325349C252.843 0.325349 325.675 73.1573 325.675 163Z\" stroke-width=\"0.650699\" stroke=\"#0C6DF4\"/>\n<path id=\"Ellipse 14\" d=\"M319.496 162.999C319.496 249.428 249.432 319.492 163.003 319.492C76.5746 319.492 6.5103 249.428 6.5103 162.999C6.5103 76.5707 76.5746 6.5064 163.003 6.5064C249.432 6.5064 319.496 76.5707 319.496 162.999Z\" stroke-width=\"5.20559\" stroke=\"#0C6DF4\"/>\n</g>",
    apple: "<g id=\"Group 2136141260\">\n<path id=\"Vector (Stroke) (Stroke)\" d=\"M175.172 4.22925L170.12 84.5456C187.131 71.0317 210.154 61.0921 231.416 61.092C262.138 61.092 284.799 79.3737 299.193 103.219C313.542 126.99 320.127 156.905 318.744 182.062C315.897 233.767 289.173 284.91 252.047 309.313L252.025 309.328L252.002 309.342L250.752 310.146L250.735 310.157L250.717 310.168C237.065 318.789 222.864 323.184 208.492 323.184H207.448L207.406 323.183C199.449 323.058 191.511 321.554 183.797 318.708L183.767 318.697C181.415 317.812 179.255 316.95 177.343 316.187L176.998 316.05L176.988 316.046L176.549 315.87C169.733 313.142 165.416 311.483 160.506 311.483C156.342 311.483 151.638 312.709 145.157 315.611L144.986 315.687L144.966 315.694C133.952 320.649 123.512 323.082 113.068 323.082C97.0881 323.082 81.4004 317.197 65.1475 305.265L65.1234 305.247L65.1 305.229C34.2531 282.035 11.5496 240.141 5.53045 195.696L5.39147 194.646C1.78082 166.756 6.34693 134.105 20.2692 108.229C34.2863 82.1775 58.0629 62.6491 92.4728 62.649C105.416 62.6491 119.03 66.6322 131.203 72.3306C138.796 75.8849 145.969 80.1723 152.225 84.741L143.196 4.22925H175.172ZM149.044 9.45776L158.867 97.0393C143.952 82.7725 116.779 68.1086 93.0328 67.8803L92.4728 67.8776C28.383 67.8776 3.5968 140.056 10.5773 193.976C16.2307 237.666 38.4675 278.662 68.2423 301.05C83.8486 312.507 98.4765 317.853 113.068 317.853C122.715 317.853 132.485 315.602 143.007 310.843L143.021 310.839C149.809 307.799 155.29 306.254 160.506 306.254C166.595 306.254 171.855 308.36 178.491 311.015L178.931 311.192L179.281 311.331C181.195 312.095 183.311 312.939 185.608 313.803C192.561 316.369 199.68 317.752 206.8 317.941L207.488 317.955H208.492L209.113 317.952C222.165 317.828 235.199 313.783 247.925 305.747L249.175 304.943C284.389 281.797 310.341 232.916 313.453 182.955L313.523 181.775C316.171 133.625 288.302 66.8449 232.079 66.3239L231.416 66.3205C207.413 66.3206 180.436 80.0459 164.096 97.0393L169.603 9.45776H149.044Z\" fill=\"#0C6DF4\" fill-rule=\"evenodd\"/>\n<mask id=\"stroke0_0_4\" maskUnits=\"userSpaceOnUse\" x=\"-0.295491\" y=\"-0.295434\" width=\"324\" height=\"328\" fill=\"black\">\n<rect fill=\"white\" stroke=\"none\" x=\"-0.295491\" y=\"-0.295434\" width=\"324\" height=\"328\"/>\n<path d=\"M178.942 0.704566L174.13 77.2057C190.79 65.6962 211.71 57.5674 231.435 57.5673C263.769 57.5674 287.419 76.864 302.228 101.396C316.963 125.807 323.7 156.431 322.28 182.253C319.384 234.858 292.229 287.128 254.001 312.255L253.999 312.257L253.977 312.271L253.956 312.284L253.935 312.298L253.913 312.313L253.912 312.312L252.675 313.107L252.67 313.111L252.653 313.122L252.627 313.139L252.582 313.166C238.453 322.081 223.62 326.704 208.511 326.705H207.437L207.408 326.704L207.367 326.703C199.006 326.571 190.681 324.992 182.612 322.016L182.582 322.006L182.546 321.992C180.157 321.094 177.966 320.219 176.056 319.457L175.717 319.322L175.673 319.305L175.655 319.297L175.258 319.138C168.529 316.445 164.869 315.09 160.909 315.008L160.525 315.004C157.071 315.004 152.891 316.014 146.616 318.824L146.611 318.826L146.316 318.958L146.289 318.967C134.947 324.05 124.06 326.603 113.087 326.603C96.1716 326.603 79.7701 320.354 63.0818 308.102L63.0736 308.097L63.066 308.091L63.0419 308.073L63.022 308.058L63.0027 308.043L63.002 308.043L62.2596 307.48C30.9147 283.518 8.13295 241.021 2.05845 196.167L2.05776 196.162L2.05707 196.157L1.91809 195.107L1.9174 195.102L1.91671 195.097C-1.77503 166.579 2.86808 133.169 17.186 106.558C31.6612 79.6548 56.4866 59.1244 92.4919 59.1244C106.113 59.1244 120.247 63.3015 132.716 69.1383C138.026 71.6237 143.135 74.4582 147.887 77.4974L139.275 0.704566H178.942Z\"/>\n</mask>\n<path id=\"Vector (Stroke) (Stroke) (Stroke)\" d=\"M178.942 0.704566H139.275L147.887 77.4974C143.135 74.4582 138.026 71.6237 132.716 69.1383C120.247 63.3015 106.113 59.1244 92.4919 59.1244C56.4866 59.1244 31.6612 79.6548 17.186 106.558C2.86808 133.169 -1.77503 166.579 1.91671 195.097L1.9174 195.102L1.91809 195.107L2.05707 196.157L2.05776 196.162L2.05845 196.167C8.13295 241.021 30.9147 283.518 62.2596 307.48L63.002 308.043L63.0027 308.043L63.022 308.058L63.0419 308.073L63.066 308.091L63.0736 308.097L63.0818 308.102C79.7701 320.355 96.1716 326.603 113.087 326.603C124.06 326.603 134.947 324.05 146.289 318.967L146.316 318.958L146.611 318.826L146.616 318.824C152.891 316.014 157.071 315.004 160.525 315.004L160.909 315.008C164.869 315.09 168.529 316.445 175.258 319.138L175.655 319.297L175.673 319.305L175.717 319.322L176.056 319.457C177.966 320.219 180.157 321.094 182.546 321.992L182.582 322.006L182.612 322.016C190.681 324.992 199.006 326.571 207.367 326.703L207.408 326.704L207.437 326.705H208.511C223.62 326.704 238.453 322.081 252.582 313.166L252.627 313.139L252.653 313.122L252.67 313.111L252.675 313.107L253.912 312.312L253.913 312.313L253.935 312.298L253.956 312.284L253.977 312.271L253.999 312.257L254.001 312.255C292.229 287.128 319.384 234.858 322.28 182.253C323.7 156.431 316.963 125.807 302.228 101.396C287.419 76.864 263.769 57.5674 231.435 57.5673C211.71 57.5674 190.79 65.6962 174.13 77.2057L178.942 0.704566Z\" stroke-width=\"1.40913\" stroke=\"#0C6DF4\" mask=\"url(#stroke0_0_4)\"/>\n\n</g>"
  };

  function xmlEscape(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function strokeMarkup(name, hex) {
    var marks = '';
    strokes[name].forEach(function (stroke) {
      if (!stroke.points.length) return;
      var d = 'M' + stroke.points[0].x + ' ' + stroke.points[0].y;
      for (var i = 1; i < stroke.points.length - 1; i++) {
        var a = stroke.points[i];
        var b = stroke.points[i + 1];
        d += ' Q' + a.x + ' ' + a.y + ' ' + ((a.x + b.x) / 2) + ' ' + ((a.y + b.y) / 2);
      }
      var last = stroke.points[stroke.points.length - 1];
      d += ' L' + last.x + ' ' + last.y;
      marks += '<path d="' + d + '" fill="none" stroke="' + (stroke.color || hex) + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    return marks;
  }

  function exportSeal(name) {
    var vb = VB[name];
    var hex = selectedColor().hex;
    var rings = '<g fill="none" stroke="none">' + (RING_BODY[name] || '').replace(/#0C6DF4/gi, hex) + '</g>';
    var letters = '';
    var value = texts[name] || '';
    if (value) {
      var path = document.getElementById('sig-path-' + name);
      var offset = path.parentNode.querySelector('textPath').getAttribute('startOffset') || '0';
      letters = '<path id="sig-export-path" d="' + xmlEscape(path.getAttribute('d')) + '" fill="none"/>' +
        '<text fill="' + hex + '" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="13">' +
        '<textPath href="#sig-export-path" startOffset="' + xmlEscape(offset) + '">' + xmlEscape(value) + '</textPath></text>';
    }
    var picture = '';
    if (photos[name] && photos[name].tinted) {
      var shot = document.createElement('canvas');
      shot.width = Math.round(vb.w * 2);
      shot.height = Math.round(vb.h * 2);
      var shotCtx = shot.getContext('2d');
      shotCtx.setTransform(2, 0, 0, 2, 0, 0);
      shotCtx.save();
      clipDrawing(shotCtx, name);
      drawPhoto(shotCtx, name);
      shotCtx.restore();
      picture = '<image href="' + shot.toDataURL('image/png') + '" x="0" y="0" width="' + vb.w + '" height="' + vb.h + '"/>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vb.w + ' ' + vb.h + '" width="539" height="539" preserveAspectRatio="none">' +
      '<defs>' + clipMarkup(name) + '</defs>' +
      rings + '<g clip-path="url(#sig-ink-clip)">' + picture + strokeMarkup(name, hex) + '</g>' + letters + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var fileInput = modal.querySelector('.sig-file');
  modal.querySelector('.sig-upload').addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    fileInput.value = '';
    fileInput.click();
  });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      placePhoto(kind, img);
    };
    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  });

  modal.querySelector('.sig-create').addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    var color = selectedColor();
    var madeKind = kind;
    var item = {
      id: 'sig-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      kind: madeKind,
      src: exportSeal(madeKind),
      castHex: color.cast,
      colorName: color.name,
      text: texts[madeKind],
      createdAt: Date.now()
    };
    items.unshift(item);
    texts[madeKind] = '';
    strokes[madeKind] = [];
    photos[madeKind] = null;
    photoSources[madeKind] = null;
    drawing = null;
    swipe = null;
    editing = false;
    editingLock = false;
    clearTimeout(beginEdit.timer);
    input.value = '';
    redraw(madeKind);
    paintText();
    placeCaret();
    try { input.blur(); } catch (err) {}
    placeLibrarySeal(item);
    setTimeout(function () {
      saveLocal();
      postItem(item);
    }, 0);
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
  loadAdopted();
  renderGrid();
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
    renderGrid();
  }).catch(function () {});
})();
