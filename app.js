// Navigatie en router
const NAV = [
  ['#/', '🏠', 'Dashboard', 'Home'],
  ['#/taken', '✅', 'Taken', 'Taken'],
  ['#/onderhoud', '🔧', 'Onderhoud', 'Onderhoud'],
  ['#/week', '📅', 'Weekplanner', 'Week'],
  ['#/plannen', '💡', 'Toekomstige plannen', 'Plannen'],
  ['#/uitgevoerd', '🏁', 'Uitgevoerd', 'Gedaan'],
  ['#/instellingen', '⚙️', 'Instellingen', 'Instel.']
];
const COMING = {
  taken: 'Taken', onderhoud: 'Onderhoud', week: 'Weekplanner', plannen: 'Toekomstige plannen', uitgevoerd: 'Uitgevoerd'
};
const viewComing = key => { app.innerHTML = `<h1>${COMING[key]}</h1><div class="card empty">Dit tabblad wordt in de volgende bouwfase gebouwd.</div>`; };
const VIEWS = {
  '': viewDashboard, instellingen: viewSettings,
  taken: () => viewComing('taken'), onderhoud: () => viewComing('onderhoud'), week: () => viewComing('week'),
  plannen: () => viewComing('plannen'), uitgevoerd: () => viewComing('uitgevoerd')
};

function chrome() {
  const on = !!(S.user && S.hh);
  document.getElementById('helpbtn').hidden = !S.user;
  const hn = document.getElementById('hhn');
  hn.hidden = !on;
  if (on) hn.textContent = '🏠 ' + S.hh.name;
  const cur = '#/' + ((location.hash || '#/').slice(2).split('/')[0]);
  document.getElementById('nav').innerHTML = on
    ? NAV.map(n => `<a href="${n[0]}" class="${cur === n[0] ? 'on' : ''}"><b>${n[1]}</b><span class="lf">${n[2]}</span><span class="ls">${n[3]}</span></a>`).join('')
    : '';
}

let RID = 0;
async function route() {
  if (window.REC) return;
  const join = /^#\/join\/(.+)$/.exec(location.hash);
  if (join) { store.set('hh_pending', decodeURIComponent(join[1])); location.replace('#/'); return; }
  const my = ++RID;
  try {
    const { data: { session } } = await db.auth.getSession();
    if (my !== RID) return;
    S.user = session?.user || null;
    if (!S.user) { S.loaded = false; S.hh = null; chrome(); return viewLogin(); }
    if (!S.loaded) { await loadAll(); if (my !== RID) return; }
    await pendingJoin();
    if (my !== RID) return;
    chrome();
    const p = (location.hash || '#/').slice(2).split('/')[0];
    if (!S.hh || p === 'kies') return viewChoose();
    await (VIEWS[p] || viewDashboard)();
  } catch (e) {
    app.innerHTML = `<h1>Er ging iets mis</h1><p>${esc(errMsg(e))}</p><p><button onclick="location.reload()">Opnieuw proberen</button></p>`;
  }
}

// start
const logo = document.getElementById('logo');
logo.src = CONFIG.LOGO;
logo.onerror = () => { logo.outerHTML = `<span class="logotxt">${esc(CONFIG.APP_NAME)}</span>`; };
document.getElementById('helpbtn').onclick = toggleHelp;
document.getElementById('hhn').onclick = () => go(S.hhs.length > 1 ? '#/kies' : '#/instellingen');
addEventListener('hashchange', route);
let lastUid;
db.auth.onAuthStateChange((ev, se) => {
  if (ev === 'PASSWORD_RECOVERY') { window.REC = 1; setTimeout(viewNewPw, 0); return; }
  const u = se?.user?.id || null;
  if (u !== lastUid) { lastUid = u; S.loaded = false; S.hh = null; setTimeout(route, 0); }
});
route();
