// Big-O page: curves for four growth rates plus the concrete operation count at the chosen n.
// Not step-based, so it does not use the step player.
(function () {
  const CURVES = [
    { id: 'log', name: 'O(log n)', formula: 'log₂ n', color: 'var(--sorted)', f: n => Math.log2(n), ops: n => Math.ceil(Math.log2(n)) },
    { id: 'lin', name: 'O(n)', formula: 'n', color: 'var(--accent)', f: n => n, ops: n => n },
    { id: 'nlogn', name: 'O(n log n)', formula: 'n × log₂ n', color: 'var(--compare)', f: n => n * Math.log2(n), ops: n => Math.round(n * Math.log2(n)) },
    { id: 'quad', name: 'O(n²)', formula: 'n × n', color: 'var(--swap)', f: n => n * n, ops: n => n * n },
  ];
  const commas = v => v.toLocaleString('en-US');
  const compact = v => v >= 1e9 ? +(v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? +(v / 1e3).toFixed(1) + 'K' : +v.toFixed(1) + '';

  function chart(n) {
    const W = 650, H = 340, L = 56, R = 110, T = 14, B = 36, pw = W - L - R, ph = H - T - B, max = n * n;
    const X = v => L + ((v - 1) / (n - 1)) * pw, Y = v => T + ph - (v / max) * ph;
    const grid = [0, .25, .5, .75, 1].map(t =>
      `<line class="gl" x1="${L}" x2="${L + pw}" y1="${Y(max * t)}" y2="${Y(max * t)}"/><text class="tick" x="${L - 8}" y="${Y(max * t) + 4}" text-anchor="end">${compact(max * t)}</text>`).join('');
    const xticks = [1, Math.round((n + 1) / 2), n].map(v =>
      `<text class="tick" x="${X(v)}" y="${T + ph + 18}" text-anchor="middle">${commas(v)}</text>`).join('');
    const lines = CURVES.map(c => {
      const pts = Array.from({ length: 101 }, (_, k) => { const x = 1 + ((n - 1) * k) / 100; return `${X(x).toFixed(1)},${Y(c.f(x)).toFixed(1)}`; });
      return `<polyline class="curve" style="stroke:${c.color}" points="${pts.join(' ')}"/><circle cx="${X(n)}" cy="${Y(c.f(n))}" r="4" style="fill:${c.color}"/>`;
    }).join('');
    // end labels, nudged apart so the small curves near the bottom stay readable
    const labels = CURVES.map(c => ({ c, y: Y(c.f(n)) })).sort((a, b) => b.y - a.y);
    labels.forEach((l, i) => { if (i && l.y > labels[i - 1].y - 18) l.y = labels[i - 1].y - 18; });
    const ends = labels.map(l => `<text class="end" x="${L + pw + 12}" y="${l.y + 4}" style="fill:${l.c.color}">${l.c.name}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:700px" role="img" aria-label="Growth curves for O(log n), O(n), O(n log n) and O(n squared)">
      ${grid}${xticks}${lines}${ends}
      <text class="tick" x="${L}" y="${T - 3}">operations</text>
      <text class="tick" x="${L + pw / 2}" y="${H - 4}" text-anchor="middle">n (input size)</text></svg>`;
  }

  function mount(root) {
    root.innerHTML = `
      <div class="controls">
        <label>Input size: n = <b id="nVal">100</b>
          <input id="n" type="range" min="2" max="1000" value="100" style="width:min(420px,80vw)">
        </label>
      </div>
      <div class="chart" id="chart"></div>
      <div class="ops" id="ops"></div>
      <p class="compare" id="compare"></p>
      <div class="explain">
        <h2>What does this mean?</h2>
        <p>Big-O describes how the amount of work an algorithm does <em>grows</em> as its input gets bigger. It ignores small constant factors and focuses on the shape of the growth, because that shape is what decides whether a program is still fast when the input is a million items instead of a hundred.</p>
        <ul>
          <li><b>O(log n)</b>: the problem is cut down (usually halved) at every step, like binary search. Even a huge input takes only a handful of steps.</li>
          <li><b>O(n)</b>: touch every item once, like scanning a list for a value. Double the input, double the work.</li>
          <li><b>O(n log n)</b>: the cost of good sorting algorithms such as merge sort. A little worse than linear, and still very manageable.</li>
          <li><b>O(n²)</b>: compare every item with every other item, like bubble sort or two nested loops. Double the input and the work quadruples, so it falls apart quickly.</li>
        </ul>
        <p>The chart always stretches to fit O(n²), so the curves keep a similar shape as you drag the slider. Watch the numbers on the left axis and in the boxes instead: they show how quickly O(n²) runs away from the rest. To see this in real code, compare the comparison counts of bubble sort and merge sort in <a href="#sorting">Sorting algorithms</a>.</p>
      </div>`;
    const $ = id => root.querySelector('#' + id);

    function draw() {
      const n = +$('n').value;
      $('nVal').textContent = commas(n);
      $('chart').innerHTML = chart(n);
      $('ops').innerHTML = CURVES.map(c => {
        const v = c.ops(n);
        return `<div class="op" style="--c:${c.color}"><span class="op-name">${c.name}</span><span class="op-formula">${c.formula}${c.id === 'log' ? ', rounded up' : ''}</span><b class="op-count">${commas(v)}</b><span class="op-label">operations</span></div>`;
      }).join('');
      const quad = n * n, nlogn = Math.round(n * Math.log2(n));
      $('compare').innerHTML = `At n = ${commas(n)}, O(n²) does <b>${commas(quad)}</b> operations: about <b>${commas(Math.round(quad / nlogn))}×</b> as many as O(n log n) and <b>${commas(n)}×</b> as many as O(n).`;
    }
    $('n').oninput = draw;
    draw();
  }

  (window.VIZ = window.VIZ || []).push({
    id: 'bigo',
    category: 'Fundamentals',
    title: 'Big-O growth',
    summary: 'Compare how O(log n), O(n), O(n log n) and O(n²) grow as the input gets bigger.',
    mount,
  });
})();
