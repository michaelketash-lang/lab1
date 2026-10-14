// Sorting visualization: turns each algorithm into a list of states for the step player.
// A state is { arr, marks: { index: cssClass }, comps, caption }.
(function () {
  const ALGOS = {
    bubble: { name: 'Bubble sort', blurb: 'Repeatedly compares neighbours and swaps them if they are out of order. The largest value "bubbles" to the end on every pass.' },
    merge: { name: 'Merge sort', blurb: 'Splits the array in half, sorts each half, then merges the two sorted halves by always taking the smaller front element.' },
    quick: { name: 'Quick sort', blurb: 'Picks a pivot (the last element), moves smaller values to its left, then sorts each side the same way.' },
  };

  function bubble(c) {
    const { arr: a, n, snap } = c;
    for (let pass = 0; pass < n - 1; pass++) {
      let swapped = false;
      for (let j = 0; j < n - 1 - pass; j++) {
        c.count();
        snap(`Compare the neighbours ${a[j]} and ${a[j + 1]}.`, { [j]: 'compare', [j + 1]: 'compare' });
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swapped = true;
          snap(`${a[j + 1]} is bigger than ${a[j]} but sits on the left, so swap them.`, { [j]: 'swap', [j + 1]: 'swap' });
        } else {
          snap(`${a[j]} is not bigger than ${a[j + 1]}, so they are already in order. No swap.`, { [j]: 'compare', [j + 1]: 'compare' });
        }
      }
      c.sorted.add(n - 1 - pass);
      if (!swapped) { for (let k = 0; k < n - 1 - pass; k++) c.sorted.add(k); snap('No swaps in this pass, so the array is already sorted.'); break; }
      snap(`${a[n - 1 - pass]} has bubbled to its final place.`);
    }
  }

  function merge(c) {
    const { arr: a, n, snap } = c;
    function sort(lo, hi) {
      if (lo >= hi) return;
      const mid = (lo + hi) >> 1;
      sort(lo, mid); sort(mid + 1, hi);
      const left = a.slice(lo, mid + 1), right = a.slice(mid + 1, hi + 1), out = [];
      const range = {};
      for (let k = lo; k <= hi; k++) range[k] = 'range';
      let i = 0, j = 0;
      while (i < left.length && j < right.length) {
        c.count();
        const li = i, rj = j, take = left[i] <= right[j] ? left[i++] : right[j++];
        out.push(take);
        snap(`Merging positions ${lo + 1}–${hi + 1}: compare the first unused value of the left half (${left[li]}) with the first of the right half (${right[rj]}). ${take} is smaller, so it comes next in the merged run.`,
          { ...range, [lo + li]: 'compare', [mid + 1 + rj]: 'compare' });
      }
      out.push(...left.slice(i), ...right.slice(j));
      out.forEach((v, k) => { a[lo + k] = v; });
      const done = {};
      for (let k = lo; k <= hi; k++) done[k] = 'merged';
      snap(`Positions ${lo + 1}–${hi + 1} are now merged into one sorted run.`, done);
    }
    sort(0, n - 1);
  }

  function quick(c) {
    const { arr: a, sorted, snap } = c;
    function qs(lo, hi) {
      if (lo > hi) return;
      if (lo === hi) { sorted.add(lo); snap(`${a[lo]} is the only value left in its range, so it is already in place.`); return; }
      const pivot = a[hi];
      let i = lo;
      snap(`Range ${lo + 1}–${hi + 1}: pick the last value, ${pivot}, as the pivot. Smaller values will go to its left, larger values to its right.`, { [hi]: 'pivot' });
      for (let j = lo; j < hi; j++) {
        c.count();
        snap(`Is ${a[j]} smaller than the pivot (${pivot})?`, { [hi]: 'pivot', [i]: 'range', [j]: 'compare' });
        if (a[j] < pivot) {
          [a[i], a[j]] = [a[j], a[i]];
          snap(`Yes, so it moves to the left side (position ${i + 1}).`, { [hi]: 'pivot', [i]: 'swap', [j]: 'swap' });
          i++;
        } else {
          snap(`No, ${a[j]} is not smaller, so it stays on the right side.`, { [hi]: 'pivot', [i]: 'range', [j]: 'compare' });
        }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      sorted.add(i);
      snap(`Place the pivot ${pivot} between the smaller and the larger values. That puts it in its final position.`);
      qs(lo, i - 1); qs(i + 1, hi);
    }
    qs(0, c.n - 1);
  }

  const RUN = { bubble, merge, quick };

  function buildStates(algo, input) {
    const arr = input.slice(), sorted = new Set(), states = [];
    let comps = 0;
    const c = {
      arr, n: arr.length, sorted,
      count: () => ++comps,
      snap(caption, marks = {}) {
        const m = {};
        sorted.forEach(i => { m[i] = 'sorted'; });
        states.push({ arr: arr.slice(), marks: Object.assign(m, marks), comps, caption });
      },
    };
    c.snap('Unsorted array. Press Play to watch, or use Next to go one move at a time. The colors are explained under the bars.');
    RUN[algo](c);
    arr.forEach((_, i) => sorted.add(i));
    c.snap(`Sorted! ${arr.length} elements in ${comps} comparisons.`);
    return states;
  }

  const shuffled = n => {
    const a = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  function mount(root) {
    root.innerHTML = `
      <div class="controls">
        <label>Algorithm
          <select id="algo">${Object.entries(ALGOS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        </label>
        <label>Array size: <b id="sizeVal">20</b>
          <input id="size" type="range" min="5" max="60" value="20">
        </label>
        <button class="btn" id="shuffle">Shuffle</button>
      </div>
      <p class="blurb" id="blurb"></p>
      <div class="stats"><span>Comparisons: <b id="comps">0</b></span></div>
      <div class="stage" id="stage" role="img" aria-label="Bars representing the array"></div>
      <ul class="legend">
        <li><i class="bar"></i>Unsorted</li><li><i class="bar compare"></i>Comparing</li>
        <li><i class="bar swap"></i>Swapped</li><li><i class="bar pivot"></i>Pivot</li>
        <li><i class="bar range"></i>Active range</li><li><i class="bar merged"></i>Merged</li>
        <li><i class="bar sorted"></i>In final place</li>
      </ul>
      <div id="player"></div>`;
    const $ = id => root.querySelector('#' + id);
    const stage = $('stage');

    function draw(state) {
      const n = state.arr.length;
      if (stage.children.length !== n) {
        stage.innerHTML = '<div class="bar"><span></span></div>'.repeat(n);
        stage.classList.toggle('labels', n <= 25);
      }
      state.arr.forEach((v, i) => {
        const el = stage.children[i];
        el.style.height = (v / n) * 100 + '%';
        el.className = 'bar ' + (state.marks[i] || '');
        el.firstChild.textContent = v;
      });
      $('comps').textContent = state.comps;
    }

    const player = createStepPlayer($('player'), draw);
    let input = shuffled(+$('size').value);
    const load = () => {
      $('blurb').textContent = ALGOS[$('algo').value].blurb;
      player.setStates(buildStates($('algo').value, input));
    };
    $('algo').onchange = load;
    $('shuffle').onclick = () => { input = shuffled(+$('size').value); load(); };
    $('size').oninput = () => { $('sizeVal').textContent = $('size').value; input = shuffled(+$('size').value); load(); };
    load();
  }

  (window.VIZ = window.VIZ || []).push({
    id: 'sorting',
    category: 'Algorithms',
    title: 'Sorting algorithms',
    summary: 'Watch bubble, merge and quick sort rearrange bars, and see how many comparisons each one needs.',
    mount,
  });
})();
