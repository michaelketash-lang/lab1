// Shared layout for every "Complex Algorithms" page, built on the step player:
//   1. "What problem does this solve?"   2. input controls   3. the visualization
//   4. a live state panel                5. pseudocode with the running line highlighted
//   6. the step player: a caption that says WHY, plus the Predict-the-next-step mode
// createAlgoPage(root, {
//   problem: 'plain-English paragraph',
//   code: ['pseudocode line', ...],
//   controls: [{ id, type: 'range' | 'select' | 'button', label, ... }],   // see below
//   (an empty problem and no controls give a bare replay, which the interview rounds use)
//   build(inputs) -> [state, ...]    // state: { caption, line (number or array), vars: [[label, html, hot?]], quiz? }
//   draw(vizElement, state)          // paints the visualization for one state
// })
// controls: range { min, max, value }, select { options: [[value, text]], value } and text { value, max, clean(text) }
// call build() again when changed; a button { action(inputs, set) } may change inputs with set(id, value) (the
// matching control on the page follows), then build() runs again.
// algoTable(rowHeads, colHeads, (row, col) => ({ t: text, c: cssClass })) draws a table for dynamic-programming pages.
function createAlgoPage(root, spec) {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inputs = {};
  const control = c => {
    inputs[c.id] = c.value;
    if (c.type === 'range') return `<label>${c.label}: <b id="v-${c.id}">${c.value}</b><input id="in-${c.id}" type="range" min="${c.min}" max="${c.max}" value="${c.value}"></label>`;
    if (c.type === 'select') return `<label>${c.label}<select id="in-${c.id}">${c.options.map(([v, t]) => `<option value="${v}"${v === c.value ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
    if (c.type === 'text') return `<label>${c.label}<input id="in-${c.id}" type="text" value="${c.value}" maxlength="${c.max || 12}" size="${c.size || 10}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`;
    return `<button type="button" class="btn" id="in-${c.id}">${c.label}</button>`;
  };
  root.innerHTML = `
    ${spec.problem ? `<section class="problem"><h2>What problem does this solve?</h2><p>${spec.problem}</p></section>` : ''}
    ${spec.controls.length ? `<div class="controls">${spec.controls.map(control).join('')}</div>` : ''}
    <div class="algo-viz stage-card" id="algoViz"></div>
    <div class="algo-panels">
      <section class="panel"><h3>State</h3><dl class="vars" id="algoVars"></dl></section>
      <section class="panel"><h3>Pseudocode</h3><ol class="code" id="algoCode">${spec.code.map(l => `<li><code>${esc(l)}</code></li>`).join('')}</ol></section>
    </div>
    <div id="algoPlayer"></div>`;
  const $ = id => root.querySelector('#' + id);
  const lines = [...$('algoCode').children];

  function draw(s) {
    spec.draw($('algoViz'), s);
    $('algoVars').innerHTML = s.vars.map(([k, v, hot]) => `<div class="var${hot ? ' hot' : ''}"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const on = [].concat(s.line);
    lines.forEach((li, n) => li.classList.toggle('on', on.includes(n)));
  }
  const player = createStepPlayer($('algoPlayer'), draw);
  const rerun = () => player.setStates(spec.build(inputs));

  spec.controls.forEach(c => {
    const el = $('in-' + c.id);
    if (c.type === 'range') el.oninput = () => { inputs[c.id] = +el.value; $('v-' + c.id).textContent = el.value; rerun(); };
    else if (c.type === 'select') el.onchange = () => { inputs[c.id] = el.value; rerun(); };
    else if (c.type === 'text') el.oninput = () => { const v = c.clean ? c.clean(el.value) : el.value; if (v !== el.value) el.value = v; inputs[c.id] = v; rerun(); };
    else el.onclick = () => {
      c.action(inputs, (id, v) => { // change an input, and let the control on the page follow
        inputs[id] = v;
        const ctl = $('in-' + id), label = $('v-' + id);
        if (ctl && ctl.tagName !== 'BUTTON') ctl.value = v;
        if (label) label.textContent = v;
      });
      rerun();
    };
  });
  rerun();
  return player;
}

// A table for dynamic-programming pages: cell(row, col) returns { t: text, c: css class }.
function algoTable(rowHeads, colHeads, cell) {
  return `<div class="dp-wrap"><table class="dp"><thead><tr><th></th>${colHeads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
    rowHeads.map((h, i) => `<tr><th>${h}</th>${colHeads.map((_, j) => { const x = cell(i, j); return `<td class="${x.c || ''}">${x.t}</td>`; }).join('')}</tr>`).join('') + '</tbody></table></div>';
}

// Small seeded random numbers: the same seed always gives the same sequence, so a page can rebuild the same random input.
function algoRng(seed) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
