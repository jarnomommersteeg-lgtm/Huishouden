// Gedeelde basis: databaseverbinding, status en hulpfuncties
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const app = document.getElementById('app');
const S = { user: null, profile: { name: '', avatar: null }, hhs: [], hh: null, loaded: false };

const go = h => { location.hash = h; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} },
  del(k) { try { localStorage.removeItem(k) } catch (e) {} }
};

// datums (lokale tijd van de gebruiker)
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymd(new Date());
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const dFmt = d => new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
const isoDay = () => (new Date().getDay() + 6) % 7 + 1;   // 1 = maandag ... 7 = zondag

const PRIO = { zeer_hoog: 'Zeer hoog', hoog: 'Hoog', gemiddeld: 'Gemiddeld', laag: 'Laag' };
const PW = { zeer_hoog: 0, hoog: 1, gemiddeld: 2, laag: 3 };
const dur = m => m >= 60 ? Math.floor(m / 60) + ' u' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
const errMsg = e => /Failed to fetch|NetworkError/i.test(e?.message || '') ? 'Geen verbinding. Probeer het opnieuw.' : (e?.message || 'Onbekende fout');

const avatarUrl = p => db.storage.from('avatars').getPublicUrl(p).data.publicUrl;
const avatarHtml = (p, name) => p && p.avatar
  ? `<img class="av" src="${esc(avatarUrl(p.avatar))}" alt="">`
  : `<span class="av">${esc((name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;

// foto verkleinen vóór uploaden
const shrink = f => new Promise(res => {
  const im = new Image();
  im.onload = () => {
    const m = 600, s = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = im.width * s; c.height = im.height * s;
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    c.toBlob(res, 'image/jpeg', .8);
  };
  im.src = URL.createObjectURL(f);
});
