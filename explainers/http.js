// "How HTTP works": a browser sends a request, a server sends back a response.
// The user picks the request method (GET / POST) and the response (200 / 404 / 500).
// A state is { caption, msg: 'req' | 'res' | null, hl: [message parts] | null, label, chip, chipAt, addr, view, server }.
(function () {
  const HOST = 'shop.example.com';
  const STATUS = {
    200: { reason: 'OK', color: '#16a34a' },
    404: { reason: 'Not Found', color: '#d97706' },
    500: { reason: 'Internal Server Error', color: '#dc2626' },
  };
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const part = (name, text, color) => `<span data-part="${name}"${color ? ` style="--k:${color}"` : ''}>${esc(text)}</span>`;

  // The two messages as text, with every piece wrapped in a span so a step can highlight it.
  function messages(method, status) {
    const post = method === 'POST';
    const path = post ? '/products/42/reviews' : '/products/42';
    const reqBody = post ? 'rating=5&comment=Great!' : '';
    const reqHeaders = [['Host', HOST], ['User-Agent', 'Mozilla/5.0'], ['Accept', 'text/html'],
      ...(post ? [['Content-Type', 'application/x-www-form-urlencoded'], ['Content-Length', String(reqBody.length)]] : [])];
    const resBody = status === 200 ? (post ? '<p>Thanks! Your review was saved.</p>' : '<h1>Blue Mug</h1>\n<p>A sturdy mug. $12</p>')
      : status === 404 ? '<h1>404</h1>\n<p>Page not found.</p>' : '<h1>500</h1>\n<p>Something went wrong on our side.</p>';
    const view = status === 200 ? (post ? ['Thanks!', 'Your review was saved.'] : ['Blue Mug', 'A sturdy mug. $12']) : [String(status), status === 404 ? 'Page not found.' : 'Something went wrong on our side.'];
    const resHeaders = [['Content-Type', 'text/html; charset=utf-8'], ['Content-Length', String(resBody.length)], ['Server', 'nginx']];
    const { reason, color } = STATUS[status];
    const req = `${part('method', method)} ${part('url', path)} ${part('version', 'HTTP/1.1')}\n${part('headers', reqHeaders.map(h => h.join(': ')).join('\n'))}\n` +
      (post ? `\n${part('body', reqBody)}` : '');
    const res = `${part('version', 'HTTP/1.1')} ${part('code', String(status), color)} ${part('reason', reason, color)}\n${part('headers', resHeaders.map(h => h.join(': ')).join('\n'))}\n\n${part('body', resBody)}`;
    return { post, path, req, res, view };
  }

  function build(method, status) {
    const { post, path, req, res, view } = messages(method, status);
    const { reason } = STATUS[status];
    const states = [];
    const base = { msg: null, hl: null, label: '', chip: '', chipAt: 'browser', addr: '', view: null, server: 'Waiting for requests' };
    let cur = base;
    const snap = (caption, o = {}) => { cur = { ...cur, caption, ...o }; states.push(cur); };

    snap('When you open a web page, your browser and a web server talk using HTTP. The browser sends a request, and the server sends back a response. Both are just text in a fixed format. Use the buttons above to choose the request method and the server’s answer.');
    snap('The browser writes a request. A request has a request line, then headers, and sometimes a body.', { msg: 'req', addr: `https://${HOST}${path}`, view: '…' });
    snap(post
      ? 'The first word is the method. It says what the browser wants to do. POST means “here is some data, please deal with it”, like submitting a form. Here it saves a review, so it changes something on the server.'
      : 'The first word is the method. It says what the browser wants to do. GET means “please send me this”. A GET request only asks for something and does not change anything on the server.',
    { hl: ['method'], label: 'Method' });
    snap(`Next is the path, ${path}, which says what the browser wants from this server. After it comes the version of HTTP that the browser speaks (HTTP/1.1).`, { hl: ['url', 'version'], label: 'Path and version' });
    snap(post
      ? 'Then come the headers: extra information written as Name: value lines. Host says which website this is for, since one server can host many. User-Agent names the browser. Accept lists the content it can handle. Content-Type and Content-Length describe the body that follows.'
      : 'Then come the headers: extra information written as Name: value lines. Host says which website this is for, since one server can host many. User-Agent names the browser. Accept lists the kinds of content it can handle.',
    { hl: ['headers'], label: 'Headers' });
    if (post) snap('After a blank line comes the body: the data being sent. Here it is a rating and a comment written as name=value pairs. A GET request normally has no body.', { hl: ['body'], label: 'Body' });
    snap('The request travels across the internet to the server, over the connection that was set up earlier (see “What happens when you type a URL”).',
      { hl: null, label: '', chip: method, chipAt: 'server', view: 'Loading…', server: 'Request received' });
    snap(status === 200
      ? (post ? 'The server reads the headers and the body, saves the review in its database, and prepares a successful response.' : 'The server reads the request. It looks up product 42 in its database and finds it, so it prepares a successful response.')
      : status === 404
        ? `The server reads the request but finds nothing at ${path}: there is no product 42. It prepares a “not found” response.`
        : 'The server reads the request, but while working on it something breaks on the server (a bug, or the database is down). It cannot do what was asked, so it prepares an error response.',
    { chip: '', chipAt: 'server', server: 'Working…' });
    snap('The server writes a response. It has the same three parts: a status line, headers, and a body.', { msg: 'res', server: `Sending ${status} ${reason}` });
    snap(status === 200
      ? 'The status line has the HTTP version, then a three-digit status code and its name. 200 OK means everything worked. Codes that start with 2 mean success.'
      : status === 404
        ? 'The status line has the HTTP version, then a three-digit status code and its name. 404 Not Found means the server has nothing at that address. Codes that start with 4 mean the problem is with the request, such as a wrong or missing page.'
        : 'The status line has the HTTP version, then a three-digit status code and its name. 500 Internal Server Error means the server itself failed. Codes that start with 5 mean a server-side error: nothing was wrong with the request.',
    { hl: ['version', 'code', 'reason'], label: 'Status line' });
    snap('Response headers describe the response. Content-Type says what kind of data the body holds (HTML here), Content-Length says how many characters it has, and Server names the server software.', { hl: ['headers'], label: 'Headers' });
    snap(status === 200
      ? (post ? 'The body is the actual content. Here it is a short HTML confirmation message.' : 'The body is the actual content. Here it is the HTML of the product page, which the browser will turn into the page you see.')
      : 'The body is the actual content. Even errors come with a body: a small page that explains what went wrong.',
    { hl: ['body'], label: 'Body' });
    snap('The response travels back to the browser.', { hl: null, label: '', chip: `${status} ${reason}`, chipAt: 'browser', server: 'Waiting for requests' });
    snap(status === 200
      ? `The browser reads the status code, sees that all went well, and draws the page from the body. That is one request and one response. HTTP is simple question-and-answer: every request stands on its own.`
      : status === 404
        ? 'The browser shows the error page from the body. The status code 404 tells the browser, and any other program, what happened without having to read the page. The mistake is in the address, so retrying will not help.'
        : 'The browser shows the error page from the body. The status code 500 says the fault is on the server’s side, not in the request, so trying again later may well work.',
    { chip: '', chipAt: 'browser', view });
    states[states.length - 1].link = { href: '#networking/json', text: 'What is JSON?, a common format for response bodies' };
    return states;
  }

  function mount(root) {
    const seg = (name, label, opts) => `
      <div class="seg-group"><span class="seg-label">${label}</span>
        <div class="seg" role="radiogroup" aria-label="${label}" data-name="${name}">
          ${opts.map(([v, text], i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-v="${v}">${text}</button>`).join('')}
        </div></div>`;
    root.innerHTML = `
      <div class="controls">
        ${seg('method', 'Browser sends', [['GET', 'GET'], ['POST', 'POST']])}
        ${seg('status', 'Server answers', [['200', '200 OK'], ['404', '404 Not Found'], ['500', '500 Server Error']])}
      </div>
      <div class="http stage-card">
        <div class="http-row">
          <div class="hbox"><h4>Browser</h4><div class="addr" id="addr"></div><div class="view" id="view"></div></div>
          <div class="hwire"><div class="hchip" id="hchip"></div></div>
          <div class="hbox"><h4>Server</h4><div class="hsub">${HOST}</div><div class="hstatus" id="hstatus"></div></div>
        </div>
        <div class="hmsg-head"><strong id="mtitle"></strong><span class="hlabel" id="mlabel"></span></div>
        <pre class="hmsg" id="hmsg"></pre>
      </div>
      <div id="xp"></div>`;
    const $ = id => root.querySelector('#' + id);
    let method = 'GET', status = 200, msgs = messages(method, status);

    function draw(s) {
      const chip = $('hchip');
      chip.textContent = s.chip;
      chip.style.opacity = s.chip ? 1 : 0;
      chip.style.left = s.chipAt === 'server' ? '88%' : '12%';
      $('addr').textContent = s.addr || ' ';
      const v = $('view');
      v.className = 'view' + (s.view ? '' : ' blank');
      v.innerHTML = Array.isArray(s.view) ? `<b>${esc(s.view[0])}</b><span>${esc(s.view[1])}</span>` : esc(s.view || '');
      $('hstatus').textContent = s.server;
      $('mtitle').textContent = s.msg === 'req' ? 'Request (browser → server)' : s.msg === 'res' ? 'Response (server → browser)' : '';
      $('mlabel').textContent = s.label;
      $('mlabel').hidden = !s.label;
      const pre = $('hmsg');
      pre.innerHTML = s.msg === 'req' ? msgs.req : s.msg === 'res' ? msgs.res : '<span class="placeholder">No message yet</span>';
      pre.querySelectorAll('[data-part]').forEach(el => {
        const on = !s.hl || s.hl.includes(el.dataset.part);
        el.classList.toggle('dim', !on);
        el.classList.toggle('hot', !!s.hl && on);
      });
    }

    const xp = createExplainer($('xp'), draw, { id: 'http', slow: 14 });
    xp.setStates(build(method, status));
    root.querySelectorAll('.seg').forEach(group => {
      group.onclick = e => {
        const b = e.target.closest('button');
        if (!b) return;
        group.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b));
        if (group.dataset.name === 'method') method = b.dataset.v; else status = +b.dataset.v;
        msgs = messages(method, status);
        xp.setStates(build(method, status));
        xp.goTo(1); // jump to the moment the browser writes the request, and play
        xp.play();
      };
    });
  }

  (window.EXPLAINERS = window.EXPLAINERS || []).push({
    id: 'http',
    title: 'How HTTP works',
    summary: 'Watch a browser send a request and a server answer with a response. Switch between GET and POST, and between 200, 404 and 500, to see every part change.',
    mount,
  });
})();
