// "What is JSON?": a user profile object and the same data as JSON text, built up piece by piece,
// sent across the network and parsed back into an object. Plus an editable box with a live tree view.
// A state is { caption, count, brace, hot, send, arrow, aDim, floatAt, bJson, bObj, access }.
(function () {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const PROFILE = { name: 'Ada Lovelace', age: 36, isMember: true, languages: ['en', 'fr'], address: { city: 'London', country: 'UK' }, phone: null };

  // one entry per property: how it looks as an object card row, and as lines of JSON
  const FIELDS = [
    { id: 'name', color: '#6366f1', tag: 'text', value: 'Ada Lovelace', lines: ['"name": "Ada Lovelace"'] },
    { id: 'age', color: '#0284c7', tag: 'number', value: '36', lines: ['"age": 36'] },
    { id: 'isMember', color: '#7c3aed', tag: 'true / false', value: 'yes', lines: ['"isMember": true'] },
    { id: 'languages', color: '#d97706', tag: 'list', value: '<span class="chip">en</span><span class="chip">fr</span>', lines: ['"languages": ["en", "fr"]'] },
    { id: 'address', color: '#059669', tag: 'object inside the object', value: 'city: London<br>country: UK', lines: ['"address": {', '  "city": "London",', '  "country": "UK"', '}'] },
    { id: 'phone', color: '#6b7280', tag: 'no value', value: '(none)', lines: ['"phone": null'] },
  ];

  const cardHtml = hot => `<div class="ocard"><div class="ohead"><span class="avatar">A</span>User profile</div>${FIELDS.map(f =>
    `<div class="orow${hot === f.id || hot === 'all' ? ' hot' : ''}" style="--c:${f.color}"><span class="ok">${f.id}</span><span class="ov">${f.value}</span><span class="otag">${f.tag}</span></div>`).join('')}</div>`;

  function jsonHtml(count, hot, brace) {
    if (!brace) return '';
    const shown = FIELDS.slice(0, count);
    return '{' + shown.map((f, i) =>
      `\n  <span class="f${hot === f.id || hot === 'all' ? ' hot' : ''}" style="--c:${f.color}">${esc(f.lines.join('\n  '))}</span>${i < shown.length - 1 ? ',' : ''}`).join('') + '\n}';
  }

  function build() {
    const states = [];
    let cur = { count: 0, brace: false, hot: null, send: false, arrow: null, aDim: false, floatAt: null, bJson: false, bObj: false, access: false };
    const snap = (caption, o = {}) => { cur = { ...cur, hot: null, arrow: null, ...o, caption }; states.push(cur); };

    snap('Programs keep data as objects: a thing with named properties. Here is a user profile as a program might hold it, on the left. To send it to another computer, it has to be written down as plain text. The most popular format for that is called JSON. Let’s build it piece by piece.');
    snap('JSON writes an object between curly braces { }. Everything inside the braces belongs to the profile.', { brace: true });
    snap('Each property becomes a key and a value, joined by a colon. The key “name” goes in double quotes. A text value (a string) goes in double quotes too.', { count: 1, hot: 'name' });
    snap('Numbers are written as they are, with no quotes. Writing "36" in quotes would make it text instead of a number. Notice the comma: it separates one property from the next.', { count: 2, hot: 'age' });
    snap('The values true and false, in lowercase and without quotes, are booleans: yes-or-no answers.', { count: 3, hot: 'isMember' });
    snap('A list of values is called an array. It is written in square brackets, with the items separated by commas, and the order is kept.', { count: 4, hot: 'languages' });
    snap('A value can itself be an object. The address is an object inside the profile, with its own braces and its own keys. Objects can be nested as deep as you like.', { count: 5, hot: 'address' });
    snap('null means “there is no value”: this person has no phone number on file. It is not the same as an empty text or the number 0.', { count: 6, hot: 'phone' });
    snap('That is all of JSON: just six kinds of value (text, number, true/false, null, array and object), written as plain text that both people and programs can read. Commas go between properties, but never after the last one.', { hot: 'all' });
    snap('Now let’s send the profile to another computer. The network carries text, in the form of bytes, not objects. Computer A holds the profile as an object in its memory. Computer B, on the other side, has nothing yet.', { send: true });
    snap('Turning an object into JSON text is called serializing (in JavaScript: JSON.stringify). We just did it by hand. The result is an ordinary string of characters.', { arrow: 'stringify', hot: 'all' });
    snap('The JSON text is sent over the network, inside packets and HTTP messages. The network only sees characters. It does not know or care that they describe a user.', { aDim: true, floatAt: 'B' });
    snap('The text arrives on Computer B. B can’t use it yet: it is just characters. The program wants an object whose parts it can read directly, like user.name.', { aDim: true, floatAt: null, bJson: true });
    snap('Parsing (in JavaScript: JSON.parse) reads the text and rebuilds the object: text, numbers, true/false, lists and nested objects all come back as real values.', { aDim: true, bJson: true, bObj: true, arrow: 'parse' });
    snap('Now B can use the data, for example user.name gives “Ada Lovelace”. Same data, two shapes: an object inside a program, and text on the wire. Almost every programming language can read and write JSON, which is why web services use it so much. Try your own below.', { aDim: true, bJson: true, bObj: true, access: true });
    return states;
  }

  // ---- the "try it yourself" box ----
  function hint(text, pos, extra) {
    const ch = text[pos], before = text.slice(0, pos).trimEnd();
    if (extra) return /[}\]]/.test(ch) ? 'This closing bracket has no matching opening one. Remove it.' : 'There is extra text after the end of the JSON. A JSON document holds just one value.';
    if (pos >= text.length) return 'The JSON stops too soon. Something is still open: check for a missing }, ] or closing quote.';
    if (ch === "'") return 'Text and keys need double quotes (") in JSON, not single quotes (\').';
    if ((ch === '}' || ch === ']') && before.endsWith(',')) return 'There is a comma after the last item. JSON does not allow that: remove the comma.';
    if (ch === '/') return 'JSON does not allow comments.';
    if (/^(True|False|None|undefined|NaN)\b/.test(text.slice(pos))) return 'JSON uses lowercase true, false and null. There is no None, undefined or NaN.';
    if (/[A-Za-z_$]/.test(ch || '') && (before.endsWith('{') || before.endsWith(','))) return 'Keys must be written in double quotes, like "name": … ';
    if (/[\d"{[\w-]/.test(ch || '') && /["\d}\]el]$/.test(before)) return 'Two values are next to each other. You probably forgot a comma between them.';
    if (ch === ':') return 'A colon is only allowed between a key and its value.';
    return 'This character is not allowed here. Check the spelling and punctuation just before it.';
  }
  // Finds where the JSON first goes wrong, the same way in every browser (their own messages differ,
  // and some give no position). Returns { pos, extra } or null when the text is valid.
  function findError(text) {
    let i = 0;
    const ws = () => { while (i < text.length && ' \t\n\r'.includes(text[i])) i++; };
    const str = () => {
      i++;
      for (;;) {
        const c = text[i];
        if (c === undefined || c < ' ') throw i;
        if (c === '"') { i++; return; }
        i += c === '\\' ? 2 : 1; // shortcut: any character is accepted after a backslash
      }
    };
    const value = () => {
      ws();
      const c = text[i];
      if (c === '{') {
        i++; ws();
        if (text[i] === '}') { i++; return; }
        for (;;) {
          ws(); if (text[i] !== '"') throw i; str();
          ws(); if (text[i] !== ':') throw i; i++;
          value(); ws();
          if (text[i] === ',') { i++; continue; }
          if (text[i] === '}') { i++; return; }
          throw i;
        }
      }
      if (c === '[') {
        i++; ws();
        if (text[i] === ']') { i++; return; }
        for (;;) {
          value(); ws();
          if (text[i] === ',') { i++; continue; }
          if (text[i] === ']') { i++; return; }
          throw i;
        }
      }
      if (c === '"') return str();
      const lit = ['true', 'false', 'null'].find(l => text.startsWith(l, i));
      if (lit) { i += lit.length; return; }
      const num = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
      num.lastIndex = i;
      const m = num.exec(text);
      if (!m) throw i;
      i += m[0].length;
    };
    try { value(); ws(); } catch (e) { if (typeof e === 'number') return { pos: e }; throw e; }
    return i < text.length ? { pos: i, extra: true } : null;
  }
  function tree(value, key) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const label = key === undefined ? '' : `<span class="tk">${esc(key)}</span>: `;
    if (type === 'object' || type === 'array') {
      const entries = Object.entries(value), n = entries.length;
      const head = `${label}<span class="tt">${type} · ${n} ${type === 'array' ? 'item' : 'key'}${n === 1 ? '' : 's'}</span>`;
      if (!n) return `<div class="leaf">${head}</div>`;
      return `<details open><summary>${head}</summary><div class="kids">${entries.map(([k, v]) => tree(v, type === 'array' ? `[${k}]` : k)).join('')}</div></details>`;
    }
    const shown = type === 'string' ? `“${esc(value)}”` : esc(value);
    return `<div class="leaf">${label}<span class="v-${type}">${shown}</span> <span class="tt">${type}</span></div>`;
  }
  function inspect(text) { // -> { html, ok }
    if (!text.trim()) return { ok: false, html: '<p class="try-empty">Type some JSON on the left to see its tree.</p>', status: '' };
    try {
      return { ok: true, html: `<div class="tree">${tree(JSON.parse(text))}</div>`, status: '' };
    } catch (err) {
      const msg = String(err.message), found = findError(text);
      let where = '', excerpt = '', help = 'Check the brackets, quotes and commas.';
      if (found) {
        const pos = found.pos;
        const upTo = text.slice(0, pos).split('\n'), line = upTo.length, col = upTo[upTo.length - 1].length + 1;
        where = `Problem found at line ${line}, column ${col}. `;
        excerpt = `<pre class="err-code">${esc(text.split('\n')[line - 1] || '')}\n${' '.repeat(col - 1)}^</pre>`;
        help = hint(text, pos, found.extra);
      }
      return { ok: false, html: `<div class="err" role="alert"><strong>Invalid JSON</strong><p>${where}${esc(help)}</p>${excerpt}<p class="err-raw">The browser says: ${esc(msg)}</p></div>` };
    }
  }

  function mount(root) {
    const side = (title, kind, id) => `<div class="jpanel"><div class="jlabel">${title}</div><div class="jbody ${kind}" id="${id}"></div></div>`;
    root.innerHTML = `
      <div class="jstage stage-card" id="jstage">
        <div class="jrow" id="rowA"><div class="jname">Computer A <span>(sender)</span></div>
          <div class="jgrid">${side('Object in the program', 'obj', 'aObj')}<div class="jarrow" id="arrA"></div>${side('JSON text', 'txt', 'aJson')}</div></div>
        <div class="jrow" id="rowB"><div class="jname">Computer B <span>(receiver)</span></div>
          <div class="jgrid">${side('Object in the program', 'obj', 'bObj')}<div class="jarrow" id="arrB"></div>${side('JSON text', 'txt', 'bJson')}</div>
          <div class="jaccess" id="access"><code>user.name</code> → “Ada Lovelace” &nbsp; <code>user.address.city</code> → “London”</div></div>
        <pre class="jfloat" id="jfloat"></pre>
      </div>
      <div id="xp"></div>
      <section class="try">
        <h2>Try it yourself</h2>
        <p class="blurb">Type or paste your own JSON. The tree on the right updates as you type, and if something is wrong you will see where and why.</p>
        <div class="try-grid">
          <div><label class="try-label" for="jsonIn">Your JSON</label>
            <textarea id="jsonIn" spellcheck="false" autocomplete="off" autocapitalize="off" rows="14"></textarea></div>
          <div><div class="try-label">Tree view <span id="tryStatus" class="try-status"></span></div><div id="treeOut" class="tree-out"></div></div>
        </div>
      </section>`;
    const $ = id => root.querySelector('#' + id);
    const stage = $('jstage'), fl = $('jfloat');
    const allJson = jsonHtml(6, null, true);
    let last = null;

    function placeFloat(s) {
      const target = $(s.floatAt === 'B' ? 'bJson' : 'aJson'), sr = stage.getBoundingClientRect(), r = target.getBoundingClientRect();
      Object.assign(fl.style, { left: r.left - sr.left + 'px', top: r.top - sr.top + 'px', width: r.width + 'px', height: r.height + 'px', opacity: s.floatAt ? 1 : 0 });
    }
    function draw(s) {
      last = s;
      $('rowB').classList.toggle('idle', !s.send);
      $('aObj').innerHTML = cardHtml(s.hot);
      $('aJson').innerHTML = jsonHtml(s.count, s.hot, s.brace) || '<span class="ph">JSON text appears here</span>';
      $('aJson').classList.toggle('dim', s.aDim);
      $('bJson').innerHTML = s.bJson ? allJson : '<span class="ph">nothing received yet</span>';
      $('bObj').innerHTML = s.bObj ? cardHtml('all') : '<span class="ph">nothing yet</span>';
      $('arrA').textContent = s.arrow === 'stringify' ? 'stringify\n→' : '';
      $('arrB').textContent = s.arrow === 'parse' ? 'parse\n←' : '';
      $('access').classList.toggle('on', s.access);
      fl.innerHTML = allJson;
      placeFloat(s);
    }
    addEventListener('resize', () => last && last.floatAt !== undefined && placeFloat(last));

    createExplainer($('xp'), draw, { id: 'json', slow: 14 }).setStates(build());

    const input = $('jsonIn');
    input.value = JSON.stringify(PROFILE, null, 2);
    const update = () => {
      const r = inspect(input.value);
      $('treeOut').innerHTML = r.html;
      $('tryStatus').textContent = r.ok ? '✓ valid JSON' : input.value.trim() ? '✗ invalid' : '';
      $('tryStatus').className = 'try-status ' + (r.ok ? 'good' : input.value.trim() ? 'bad' : '');
      input.setAttribute('aria-invalid', !r.ok && !!input.value.trim());
    };
    input.oninput = update;
    update();
  }

  (window.EXPLAINERS = window.EXPLAINERS || []).push({
    id: 'json',
    title: 'What is JSON?',
    summary: 'See a user profile turn into JSON piece by piece, travel across the network and be parsed back into an object. Then type your own JSON and explore it as a tree.',
    mount,
  });
})();
