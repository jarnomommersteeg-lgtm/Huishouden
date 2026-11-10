// Inloggen, account maken, wachtwoord vergeten / opnieuw instellen
const authMsg = m => ({
  'Invalid login credentials': 'E-mailadres of wachtwoord klopt niet.',
  'Email not confirmed': 'Bevestig eerst je e-mailadres via de mail die je hebt gekregen.',
  'User already registered': 'Dit e-mailadres heeft al een account. Log in.'
}[m] || m);

function viewLogin() {
  app.innerHTML = `<h1>Inloggen</h1>
  <p class="mut">Gebruik hetzelfde account als bij Mijn boodschappen.</p>
  <label for="em">E-mail</label><input id="em" type="email" autocomplete="email">
  <label for="pw">Wachtwoord (min. 6 tekens)</label><input id="pw" type="password" autocomplete="current-password">
  <p><button id="li">Inloggen</button> <button class="s" id="su">Account maken</button></p>
  <p><button class="s" id="fp">Wachtwoord vergeten</button></p><p id="msg" role="status"></p>`;
  const em = document.getElementById('em'), pw = document.getElementById('pw'), msg = document.getElementById('msg');
  const run = async kind => {
    if (!em.value.trim() || !pw.value) { msg.textContent = 'Vul e-mailadres en wachtwoord in.'; return; }
    msg.textContent = 'Bezig…';
    const r = await db.auth[kind]({ email: em.value.trim(), password: pw.value });
    if (r.error) msg.textContent = authMsg(r.error.message);
    else msg.textContent = (kind === 'signUp' && !r.data.session) ? 'Bevestig je e-mailadres via de mail en log daarna in.' : '';
  };
  document.getElementById('li').onclick = () => run('signInWithPassword');
  document.getElementById('su').onclick = () => run('signUp');
  pw.onkeydown = e => { if (e.key === 'Enter') run('signInWithPassword'); };
  document.getElementById('fp').onclick = async () => {
    if (!em.value.trim()) { msg.textContent = 'Vul eerst je e-mailadres in.'; return; }
    const r = await db.auth.resetPasswordForEmail(em.value.trim(), { redirectTo: location.origin + location.pathname });
    msg.textContent = r.error ? authMsg(r.error.message) : 'Als dit adres bekend is, is er een e-mail verstuurd.';
  };
}

function viewNewPw() {
  app.innerHTML = `<h1>Nieuw wachtwoord</h1>
  <label for="np">Nieuw wachtwoord (min. 6 tekens)</label><input id="np" type="password" autocomplete="new-password">
  <p><button id="nb">Opslaan</button></p><p id="nm" role="status"></p>`;
  document.getElementById('nb').onclick = async () => {
    const nm = document.getElementById('nm');
    const { error } = await db.auth.updateUser({ password: document.getElementById('np').value });
    nm.textContent = error ? authMsg(error.message) : 'Wachtwoord gewijzigd.';
    if (!error) setTimeout(() => { window.REC = 0; location.hash = '#/'; route(); }, 1200);
  };
}
