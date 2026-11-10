// Huishoudens kiezen/maken/aansluiten, leden, uitnodigen, profiel, beschikbare tijd
const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

async function loadAll() {
  const [m, p] = await Promise.all([
    db.from('members').select('household_id,households(id,name,code)').eq('user_id', S.user.id),
    db.from('profiles').select('name,avatar').eq('user_id', S.user.id)
  ]);
  if (m.error) throw m.error;
  S.hhs = (m.data || []).map(x => x.households).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  S.profile = p.data?.[0] || { name: '', avatar: null };
  const id = store.get('hh_active');
  S.hh = S.hhs.find(h => h.id === id) || (S.hhs.length === 1 ? S.hhs[0] : null);
  S.loaded = true;
}

function setHH(id) {
  S.hh = S.hhs.find(h => h.id === id) || null;
  if (S.hh) store.set('hh_active', id);
  if (location.hash !== '#/') location.hash = '#/';
  route();
}

// aansluiten via uitnodigingslink (#/join/CODE): code onthouden tot je bent ingelogd
async function pendingJoin() {
  const c = store.get('hh_pending');
  if (!c) return;
  store.del('hh_pending');
  const { error } = await db.rpc('join_household', { hcode: c });
  if (error) { alert(errMsg(error)); return; }
  await loadAll();
  const h = S.hhs.find(x => x.code === c.trim().toLowerCase());
  if (h) { S.hh = h; store.set('hh_active', h.id); }
}

const createJoinHtml = () => `
  <h2>Nieuw huishouden</h2>
  <input id="hn" placeholder="Bijv. Thuis">
  <p><button id="hc">Huishouden maken</button></p>
  <p><small>Let op: huishoudens zijn gedeeld met Mijn boodschappen. Een nieuw huishouden verschijnt daar ook.</small></p>
  <h2>Aansluiten met code</h2>
  <input id="hj" placeholder="Code van het huishouden" autocapitalize="none">
  <p><button class="s" id="hb">Aansluiten</button></p><p id="hm" role="status"></p>`;

function wireCreateJoin() {
  const hm = document.getElementById('hm');
  document.getElementById('hc').onclick = async () => {
    hm.textContent = 'Bezig…';
    const { data, error } = await db.rpc('create_household', { hname: document.getElementById('hn').value.trim() || 'Thuis' });
    if (error) { hm.textContent = errMsg(error); return; }
    await db.rpc('hh_claim_owner', { h: data });      // maakt jou beheerder (zie script 4); fout negeren
    await loadAll(); setHH(data);
  };
  document.getElementById('hb').onclick = async () => {
    const code = document.getElementById('hj').value.trim().toLowerCase();
    if (!code) { hm.textContent = 'Vul een code in.'; return; }
    hm.textContent = 'Bezig…';
    const { error } = await db.rpc('join_household', { hcode: code });
    if (error) { hm.textContent = errMsg(error); return; }
    await loadAll();
    const h = S.hhs.find(x => x.code === code);
    if (h) setHH(h.id); else route();
  };
}

function viewChoose() {
  app.innerHTML = `<h1>Kies je huishouden</h1>` +
    (S.hhs.length
      ? S.hhs.map(h => `<button class="pick" data-id="${esc(h.id)}">🏠 ${esc(h.name)}</button>`).join('')
      : '<p>Je hoort nog bij geen huishouden. Maak er een aan, of sluit aan met een code.</p>') +
    createJoinHtml() + `<p><button class="s" id="lo">Uitloggen</button></p>`;
  app.querySelectorAll('.pick').forEach(b => b.onclick = () => setHH(b.dataset.id));
  document.getElementById('lo').onclick = () => db.auth.signOut();
  wireCreateJoin();
}

async function viewSettings() {
  const H = S.hh.id;
  const [mem, own, av] = await Promise.all([
    db.from('members').select('user_id').eq('household_id', H),
    db.from('hh_owners').select('owner_id').eq('household_id', H),
    db.from('hh_availability').select('weekday,minutes').eq('household_id', H).eq('user_id', S.user.id)
  ]);
  [mem, own, av].forEach(r => { if (r.error) throw r.error; });
  const ids = (mem.data || []).map(x => x.user_id);
  const prof = ids.length ? ((await db.from('profiles').select('user_id,name,avatar').in('user_id', ids)).data || []) : [];
  const owner = own.data?.[0]?.owner_id || null, iOwn = owner === S.user.id;
  const mins = Object.fromEntries((av.data || []).map(x => [x.weekday, x.minutes]));
  const link = location.origin + location.pathname + '#/join/' + S.hh.code;

  app.innerHTML = `<h1>Instellingen</h1>
  <h2>Jouw profiel</h2>
  <div class="card pad">
    <div style="display:flex;gap:12px;align-items:center">${avatarHtml(S.profile, S.profile.name)}<div><b>${esc(S.profile.name || 'Nog geen naam')}</b><br><small>${esc(S.user.email)} (alleen voor jou zichtbaar)</small></div></div>
    <label for="pn">Je naam</label><input id="pn" value="${esc(S.profile.name)}">
    <label>Foto</label>
    <label class="btn s" style="display:inline-block;color:var(--ink);margin:0">📷 Foto kiezen<input id="pf" type="file" accept="image/*" hidden></label>
    ${S.profile.avatar ? '<button class="s" id="pr">Foto verwijderen</button>' : ''}
    <p><button id="ps">Opslaan</button></p><p id="pm" role="status"></p>
  </div>

  <h2>Huishouden: ${esc(S.hh.name)}</h2>
  <div class="card">${prof.length ? '' : '<p class="empty">Geen leden gevonden.</p>'}${ids.map(id => {
    const p = prof.find(x => x.user_id === id) || {}, me = id === S.user.id;
    return `<div class="mem">${avatarHtml(p, p.name)}<div class="tx"><b>${esc(p.name || 'Huisgenoot')}${me ? ' (jij)' : ''}</b>${id === owner ? '<small>beheerder</small>' : ''}</div>
      ${iOwn && !me && id !== owner ? `<button class="s" data-rm="${esc(id)}" data-n="${esc(p.name || 'deze persoon')}">Verwijderen</button>` : ''}</div>`;
  }).join('')}</div>
  ${!owner ? '<p><small>Dit huishouden heeft nog geen beheerder.</small> <button class="s" id="claim">Ik word beheerder</button></p>' : ''}
  <div class="bar">${S.hhs.length > 1 ? '<button class="s" id="sw">Ander huishouden kiezen</button>' : ''}${owner !== S.user.id ? '<button class="s" id="lv">Dit huishouden verlaten</button>' : ''}</div>

  <h2>Iemand uitnodigen</h2>
  <div class="card pad">
    <p>Code: <span class="code">${esc(S.hh.code)}</span></p>
    <div class="bar"><button class="s" id="cc">Code kopiëren</button><button class="s" id="cl">Uitnodigingslink kopiëren</button></div>
    <p><small>Wie de code of link heeft, kan zich aansluiten. Deel hem dus alleen met mensen die je vertrouwt. Een link werkt ook voor iemand die nog geen account heeft: die maakt eerst een account en sluit daarna automatisch aan. Er wordt geen e-mail verstuurd; je stuurt de link zelf.</small></p>
  </div>

  <h2>Jouw beschikbare tijd (minuten per dag)</h2>
  <div class="card pad"><div class="days">${DAYS.map((d, i) => `<label for="d${i + 1}">${d}</label><input id="d${i + 1}" data-d="${i + 1}" type="number" min="0" step="5" inputmode="numeric" placeholder="0" value="${mins[i + 1] ?? ''}">`).join('')}</div>
  <p><button id="as">Opslaan</button></p><p id="am" role="status"></p>
  <p><small>Hiermee maakt het dashboard een voorstel voor vandaag.</small></p></div>

  <details class="card pad" style="margin-top:16px"><summary><b>Nog een huishouden maken of aansluiten</b></summary>${createJoinHtml()}</details>
  <p><button class="s" id="lo">Uitloggen</button></p>`;

  // profiel
  let file = null;
  const pm = document.getElementById('pm');
  document.getElementById('pf').onchange = e => { file = e.target.files[0]; pm.textContent = 'Foto gekozen. Klik op Opslaan.'; };
  const pr = document.getElementById('pr');
  if (pr) pr.onclick = async () => {
    await db.storage.from('avatars').remove([S.profile.avatar]);
    const { error } = await db.from('profiles').upsert({ user_id: S.user.id, name: S.profile.name, avatar: null });
    if (error) { pm.textContent = errMsg(error); return; }
    S.profile.avatar = null; viewSettings();
  };
  document.getElementById('ps').onclick = async () => {
    let avatar = S.profile.avatar;
    if (file) {
      const path = `${S.user.id}/${Date.now()}.jpg`;
      const up = await db.storage.from('avatars').upload(path, await shrink(file), { contentType: 'image/jpeg' });
      if (up.error) { pm.textContent = errMsg(up.error); return; }
      if (avatar) await db.storage.from('avatars').remove([avatar]);
      avatar = path;
    }
    const name = document.getElementById('pn').value.trim();
    const { error } = await db.from('profiles').upsert({ user_id: S.user.id, name, avatar });
    if (error) { pm.textContent = errMsg(error); return; }
    S.profile = { name, avatar }; viewSettings();
  };

  // leden
  app.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
    if (!confirm(`${b.dataset.n} verwijderen uit dit huishouden? Dit geldt ook voor Mijn boodschappen.`)) return;
    const { error } = await db.rpc('hh_remove_member', { h: H, u: b.dataset.rm });
    if (error) return alert(errMsg(error));
    viewSettings();
  });
  const lv = document.getElementById('lv');
  if (lv) lv.onclick = async () => {
    if (!confirm('Dit huishouden verlaten? Je ziet de gegevens dan niet meer, ook niet in Mijn boodschappen.')) return;
    const { error } = await db.rpc('hh_remove_member', { h: H, u: S.user.id });
    if (error) return alert(errMsg(error));
    store.del('hh_active'); S.loaded = false; S.hh = null; route();
  };
  const cl = document.getElementById('claim');
  if (cl) cl.onclick = async () => {
    const { error } = await db.rpc('hh_claim_owner', { h: H });
    if (error) return alert('Dit werkt pas na het uitvoeren van script 4 in Supabase. ' + errMsg(error));
    viewSettings();
  };
  const sw = document.getElementById('sw');
  if (sw) sw.onclick = () => { S.hh = null; store.del('hh_active'); go('#/kies'); };

  // uitnodigen
  const copy = async t => { try { await navigator.clipboard.writeText(t); alert('Gekopieerd'); } catch (e) { prompt('Kopieer dit:', t); } };
  document.getElementById('cc').onclick = () => copy(S.hh.code);
  document.getElementById('cl').onclick = () => copy(link);

  // beschikbare tijd
  document.getElementById('as').onclick = async () => {
    const am = document.getElementById('am');
    const rows = [...app.querySelectorAll('[data-d]')].map(i => ({ household_id: H, user_id: S.user.id, weekday: +i.dataset.d, minutes: Math.max(0, parseInt(i.value) || 0) }));
    const { error } = await db.from('hh_availability').upsert(rows, { onConflict: 'household_id,user_id,weekday' });
    am.textContent = error ? errMsg(error) : 'Opgeslagen.';
  };

  document.getElementById('lo').onclick = () => db.auth.signOut();
  wireCreateJoin();
}
