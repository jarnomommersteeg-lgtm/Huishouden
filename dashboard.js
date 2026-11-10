// Dashboard: Nu doen / Binnenkort / Achterstallig / Slimme suggesties
const SOON = 14;   // "binnenkort" = binnen 14 dagen

function when(d) {
  if (d < 0) return `${-d} ${-d === 1 ? 'dag' : 'dagen'} te laat`;
  if (d === 0) return 'uiterlijk vandaag';
  return `over ${d} ${d === 1 ? 'dag' : 'dagen'}`;
}

// Voorstel binnen beschikbare tijd: 1 achterstallig, 2 hoge prioriteit (binnen 7 dagen), 3 overige taken binnenkort.
// Alleen taken (onderhoud heeft geen tijdsduur). Past een taak niet meer, dan wordt hij overgeslagen.
function suggestPack(items, avail) {
  const rank = i => i.d < 0 ? 0 : ((i.priority === 'zeer_hoog' || i.priority === 'hoog') && i.d <= 7) ? 1 : 2;
  const c = items.filter(i => i.kind === 'task' && i.d <= SOON)
    .sort((a, b) => rank(a) - rank(b) || PW[a.priority] - PW[b.priority] || a.d - b.d);
  let left = avail; const pick = [];
  for (const i of c) { if (i.minutes <= left) { pick.push(i); left -= i.minutes; } }
  return { pick, left };
}

async function viewDashboard() {
  const H = S.hh.id;
  const [t, m, a] = await Promise.all([
    db.from('hh_tasks').select('*').eq('household_id', H).eq('active', true),
    db.from('hh_maintenance').select('*').eq('household_id', H).eq('active', true),
    db.from('hh_availability').select('minutes').eq('household_id', H).eq('user_id', S.user.id).eq('weekday', isoDay())
  ]);
  [t, m, a].forEach(r => { if (r.error) throw r.error; });
  const td = today();
  const items = [
    ...t.data.map(x => ({ kind: 'task', id: x.id, name: x.name, minutes: x.minutes, priority: x.priority, due: x.next_due })),
    ...m.data.map(x => ({ kind: 'mnt', id: x.id, name: x.name, minutes: null, priority: null, due: x.next_due }))
  ].filter(i => i.due).map(i => ({ ...i, d: daysBetween(td, i.due) }));

  const byPrio = (x, y) => (PW[x.priority] ?? 2) - (PW[y.priority] ?? 2);
  const now = items.filter(i => i.d === 0).sort(byPrio);
  const soon = items.filter(i => i.d > 0 && i.d <= SOON).sort((x, y) => x.d - y.d || byPrio(x, y));
  const late = items.filter(i => i.d < 0).sort((x, y) => x.d - y.d);

  const row = i => `<div class="it ${i.d < 0 ? 'late' : ''}">
    <button class="chk" data-k="${i.kind}" data-id="${esc(i.id)}" aria-label="Afvinken: ${esc(i.name)}">✓</button>
    <div class="tx"><b>${i.kind === 'mnt' ? '🔧 ' : ''}${esc(i.name)}</b>
    <small>${i.minutes ? '⏱ ' + dur(i.minutes) + ' · ' : ''}${i.priority ? `<span class="pill ${PW[i.priority] <= 1 ? 'hi' : ''}">${PRIO[i.priority]}</span> · ` : ''}<span class="${i.d < 0 ? 'late-t' : ''}">${when(i.d)}</span> (${esc(dFmt(i.due))})</small></div></div>`;

  // slimme suggesties
  let sug;
  const avail = a.data?.[0]?.minutes;
  if (avail === undefined) sug = `<div class="card empty">Stel je beschikbare tijd voor vandaag in via <a href="#/instellingen">Instellingen</a>, dan stelt de app een takenpakket voor.</div>`;
  else if (avail === 0) sug = `<div class="card empty">Je hebt vandaag geen tijd ingesteld.</div>`;
  else {
    const { pick, left } = suggestPack(items, avail);
    sug = pick.length
      ? pick.map(row).join('') + `<div class="sum"><span>Totaal ${dur(avail - left)} van ${dur(avail)}</span><span>${left ? dur(left) + ' over' : 'precies vol'}</span></div>`
      : `<div class="card empty">Geen taken die binnen ${dur(avail)} passen.</div>`;
  }

  const sect = (title, list, emptyTxt) => `<h2>${title}</h2>` + (list.length ? list.map(row).join('') : `<div class="card empty">${emptyTxt}</div>`);
  const name = S.profile.name ? ' ' + esc(S.profile.name) : '';
  app.innerHTML = `<h1>Hallo${name}</h1>
  <div class="stats"><div class="card stat"><b>${now.length}</b><small>Nu doen</small></div><div class="card stat"><b>${soon.length}</b><small>Binnenkort</small></div><div class="card stat ${late.length ? 'late' : ''}"><b>${late.length}</b><small>Achterstallig</small></div></div>
  ${items.length ? '' : '<div class="card empty" style="margin-top:12px">Hier verschijnen je taken en onderhoud zodra je ze hebt toegevoegd.</div>'}
  ${sect('Nu doen', now, 'Niets voor vandaag. 🎉')}
  ${sect(`Binnenkort <small>(komende ${SOON} dagen)</small>`, soon, 'Niets gepland voor de komende weken.')}
  ${late.length ? `<details class="lt" open><summary>Achterstallig (${late.length})</summary>${late.map(row).join('')}</details>` : '<h2>Achterstallig</h2><div class="card empty">Niets achterstallig.</div>'}
  <h2>Slimme suggesties voor vandaag</h2>${sug}`;

  app.querySelectorAll('.chk').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const task = b.dataset.k === 'task';
    const { error } = await db.rpc(task ? 'hh_complete_task' : 'hh_complete_maintenance',
      task ? { p_task: b.dataset.id, p_date: td } : { p_id: b.dataset.id, p_date: td });
    if (error) { alert(errMsg(error)); b.disabled = false; return; }
    viewDashboard();
  });
}
