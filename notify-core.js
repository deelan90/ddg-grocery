/* Double D Grocery — reminder logic shared by index.html (page) and sw.js (service worker).
   One copy of the rules means the app and the background check always agree. */
(function (g) {
  const DAY = 86400000;
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmtDay = d => new Date(d).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });

  /* plan = { on, lead, hour, next (ISO), due, top[] }   sent = the shop date (YYYY-MM-DD) last reminded about.
     Returns { title, body, tag, key, url } when a reminder should be shown now, otherwise null. */
  g.ddgReminder = function (plan, sent, now) {
    if (!plan || !plan.on || !plan.next) return null;
    now = now || new Date();
    const next = new Date(plan.next);
    if (isNaN(next)) return null;
    const key = next.toISOString().slice(0, 10);
    if (sent === key) return null;                         // already reminded for this shop
    if (now - next > DAY) return null;                     // plan is stale (app not opened for a while)
    const start = startOfDay(next);
    start.setDate(start.getDate() - (plan.lead || 0));
    start.setHours(plan.hour == null ? 18 : plan.hour, 0, 0, 0);
    if (now < start) return null;                          // not time yet

    const days = Math.round((startOfDay(next) - startOfDay(now)) / DAY);
    const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : 'on ' + fmtDay(next);
    const due = plan.due || 0;
    const top = (plan.top || []).filter(Boolean).slice(0, 3);
    const body = due > 0
      ? `Your next shop looks due ${when}. ${due} item${due > 1 ? 's look' : ' looks'} low${top.length ? ' (' + top.join(', ') + ')' : ''}. Want to check your list?`
      : `Your next shop looks due ${when}. Nothing looks low yet, but now is a good time to write up your list.`;
    return { title: 'Grocery shop coming up 🛒', body, tag: 'ddg-shop-reminder', key, url: './?src=notif&view=list' };
  };

  /* Small shared store (Cache Storage) — the service worker cannot read localStorage. */
  const CACHE = 'ddg-notif';
  const url = base => new URL('ddg-notif-state.json', base).href;
  g.ddgNotifStore = {
    async read(base) {
      try { const c = await caches.open(CACHE); const r = await c.match(url(base)); return r ? await r.json() : {}; }
      catch (e) { return {}; }
    },
    async write(base, patch) {
      try {
        const cur = await g.ddgNotifStore.read(base);
        const c = await caches.open(CACHE);
        await c.put(url(base), new Response(JSON.stringify({ ...cur, ...patch }), { headers: { 'Content-Type': 'application/json' } }));
      } catch (e) {}
    }
  };
})(typeof self !== 'undefined' ? self : window);
