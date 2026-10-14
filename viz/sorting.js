// Sorting visualization: turns each algorithm into a list of states for the step player.
// A state is { arr, marks: { index: cssClass }, comps, caption, quiz? } (quiz powers the player's Predict mode).
// Race mode combines two algorithms' states into { race: true, a, b, caption }.
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
        const x = a[j], y = a[j + 1], quiz = { q: `Will bubble sort swap ${x} and ${y}?`, options: ['Swap them', 'Leave them'], answer: x > y ? 0 : 1 };
        if (x > y) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swapped = true;
          snap(`${x} is bigger than ${y} but sits on the left, so swap them.`, { [j]: 'swap', [j + 1]: 'swap' }, quiz);
        } else {
          snap(`${x} is not bigger than ${y}, so they are already in order. No swap.`, { [j]: 'compare', [j + 1]: 'compare' }, quiz);
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
          { ...range, [lo + li]: 'compare', [mid + 1 + rj]: 'compare' },
          { q: `Merging: the left half starts with ${left[li]}, the right half with ${right[rj]}. Which goes into the merged run next?`, options: [`${left[li]} (left)`, `${right[rj]} (right)`], answer: take === left[li] ? 0 : 1 });
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
        const x = a[j], quiz = { q: `Is ${x} smaller than the pivot (${pivot})?`, options: ['Yes', 'No'], answer: x < pivot ? 0 : 1 };
        if (x < pivot) {
          [a[i], a[j]] = [a[j], a[i]];
          snap(`Yes, so it moves to the left side (position ${i + 1}).`, { [hi]: 'pivot', [i]: 'swap', [j]: 'swap' }, quiz);
          i++;
        } else {
          snap(`No, ${x} is not smaller, so it stays on the right side.`, { [hi]: 'pivot', [i]: 'range', [j]: 'compare' }, quiz);
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
      snap(caption, marks = {}, quiz) {
        const m = {};
        sorted.forEach(i => { m[i] = 'sorted'; });
        states.push({ arr: arr.slice(), marks: Object.assign(m, marks), comps, caption, quiz });
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
        <label class="check"><input id="race" type="checkbox"> Race two algorithms</label>
        <label id="algoBBox" hidden>Algorithm B
          <select id="algoB">${Object.entries(ALGOS).map(([k, v], i) => `<option value="${k}"${i === 1 ? ' selected' : ''}>${v.name}</option>`).join('')}</select>
        </label>
        <label class="check"><input id="sound" type="checkbox"> Sound</label>
      </div>
      <p class="blurb" id="blurb"></p>
      <div class="stats"><span id="statA">Comparisons: <b id="comps">0</b></span><span id="statB" hidden></span></div>
      <div class="stage-title" id="titleA" hidden></div>
      <div class="stage" id="stage" role="img" aria-label="Bars representing the array"></div>
      <div class="stage-title" id="titleB" hidden></div>
      <div class="stage" id="stage2" role="img" aria-label="Bars for the second algorithm" hidden></div>
      <ul class="legend">
        <li><i class="bar"></i>Unsorted</li><li><i class="bar compare"></i>Comparing</li>
        <li><i class="bar swap"></i>Swapped</li><li><i class="bar pivot"></i>Pivot</li>
        <li><i class="bar range"></i>Active range</li><li><i class="bar merged"></i>Merged</li>
        <li><i class="bar sorted"></i>In final place</li>
      </ul>
      <div id="player"></div>`;
    const $ = id => root.querySelector('#' + id);
    const stage = $('stage'), stage2 = $('stage2');

    function paint(el, st, small) {
      const n = st.arr.length;
      el.classList.toggle('small', small);
      if (el.children.length !== n) {
        el.innerHTML = '<div class="bar"><span></span></div>'.repeat(n);
        el.classList.toggle('labels', n <= 25);
      }
      st.arr.forEach((v, i) => {
        const b = el.children[i];
        b.style.height = (v / n) * 100 + '%';
        b.className = 'bar ' + (st.marks[i] || '');
        b.firstChild.textContent = v;
      });
    }

    // sound: one short tone per step, pitched by the value being compared (left ear = A, right ear = B in a race)
    let audio = null, lastTone = 0;
    function tone(freq, pan, len = 0.09) {
      if (!audio || performance.now() - lastTone < 35) return; // very fast playback would just be noise
      lastTone = performance.now();
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      let out = g;
      if (audio.createStereoPanner) { const p = audio.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
      o.connect(g); out.connect(audio.destination); o.start(t); o.stop(t + len);
    }
    function sing(st, pan, last) {
      const n = st.arr.length, pick = c => Object.keys(st.marks).find(i => st.marks[i] === c);
      if (last) { [0, 4, 7, 12].forEach((s, k) => setTimeout(() => { lastTone = 0; tone(330 * 2 ** (s / 12), pan, 0.25); }, k * 90)); return; }
      const i = pick('swap') ?? pick('compare') ?? pick('pivot');
      if (i !== undefined) tone(200 + (st.arr[i] / n) * 900, pan);
    }

    function draw(state, idx, total) {
      const last = idx === total - 1, sound = $('sound').checked;
      if (state.race) {
        paint(stage, state.a, true); paint(stage2, state.b, true);
        $('statB').innerHTML = `${ALGOS[$('algoB').value].name}: <b>${state.b.comps}</b> comparisons`;
        $('statA').innerHTML = `${ALGOS[$('algo').value].name}: <b id="comps">${state.a.comps}</b> comparisons`;
        if (sound) { sing(state.a, -0.8, false); if (!last) sing(state.b, 0.8, false); else sing(state.a, 0, true); }
      } else {
        paint(stage, state, false);
        $('statA').innerHTML = `Comparisons: <b id="comps">${state.comps}</b>`;
        if (sound) sing(state, 0, last);
      }
    }

    const player = createStepPlayer($('player'), draw);
    let input = shuffled(+$('size').value);
    const load = () => {
      const race = $('race').checked, a = $('algo').value, b = $('algoB').value;
      $('algoBBox').hidden = !race; stage2.hidden = !race; $('statB').hidden = !race;
      $('titleA').hidden = $('titleB').hidden = !race;
      $('titleA').textContent = `A: ${ALGOS[a].name}`; $('titleB').textContent = `B: ${ALGOS[b].name}`;
      $('blurb').textContent = race ? 'Both algorithms get the same array and take one step per tick. The one with fewer steps finishes first.' : ALGOS[a].blurb;
      if (!race) { stage.classList.remove('small'); return player.setStates(buildStates(a, input)); }
      const A = buildStates(a, input), B = buildStates(b, input), len = Math.max(A.length, B.length);
      const states = Array.from({ length: len }, (_, k) => {
        const sa = A[Math.min(k, A.length - 1)], sb = B[Math.min(k, B.length - 1)];
        return { race: true, a: sa, b: sb, caption: `${ALGOS[a].name}: ${k < A.length ? sa.caption : 'finished.'}\n${ALGOS[b].name}: ${k < B.length ? sb.caption : 'finished.'}` };
      });
      const fa = A.length, fb = B.length, ca = A[fa - 1].comps, cb = B[fb - 1].comps;
      states[len - 1].caption = fa === fb ? `A tie! Both finished in ${fa - 1} steps (${ca} and ${cb} comparisons).`
        : `${ALGOS[fa < fb ? a : b].name} wins! It finished in ${Math.min(fa, fb) - 1} steps, while ${ALGOS[fa < fb ? b : a].name} needed ${Math.max(fa, fb) - 1}. Comparisons: ${ALGOS[a].name} ${ca}, ${ALGOS[b].name} ${cb}.`;
      player.setStates(states);
    };
    $('algo').onchange = $('algoB').onchange = $('race').onchange = load;
    $('sound').onchange = () => { if ($('sound').checked && !audio) { try { audio = new AudioContext(); } catch (e) { $('sound').checked = false; } } if (audio) audio.resume(); };
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
