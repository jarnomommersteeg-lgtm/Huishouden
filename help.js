// Hulpbolletje (?): compact venster rechtsboven, blokkeert de rest van de app niet
const SOON_TXT = 'Dit onderdeel wordt in de volgende bouwfase toegevoegd.';
const HELP = [
  ['Dashboard', 'Het startscherm. <b>Nu doen</b>: taken en onderhoud die vandaag aan de beurt zijn. <b>Binnenkort</b>: de komende 14 dagen, met het aantal dagen dat nog rest. <b>Achterstallig</b>: de uiterste datum is verstreken. Tik op ✓ om af te vinken; de volgende datum wordt dan automatisch berekend. <b>Slimme suggesties</b>: een takenpakket voor vandaag dat past binnen jouw beschikbare tijd; achterstallige taken gaan voor, dan hoge prioriteit, dan de rest.'],
  ['Taken', SOON_TXT],
  ['Onderhoud woning', SOON_TXT],
  ['Weekplanner', SOON_TXT],
  ['Toekomstige plannen', SOON_TXT],
  ['Uitgevoerd', SOON_TXT],
  ['Gebruikers en huishoudens', 'Je kunt bij meerdere huishoudens horen en wisselen via Instellingen. Iemand uitnodigen kan met de code of de uitnodigingslink (die stuur je zelf). De beheerder kan leden verwijderen; ieder ander kan zelf weggaan. Huishoudens en accounts zijn gedeeld met Mijn boodschappen.'],
  ['Instellingen', 'Je naam en foto, de leden van het huishouden, de uitnodigingscode en jouw beschikbare minuten per weekdag (die gebruikt het dashboard voor het voorstel van vandaag). Ook kun je hier uitloggen.']
];

function toggleHelp() {
  const old = document.getElementById('helpwin');
  if (old) { old.remove(); return; }
  const d = document.createElement('div');
  d.id = 'helpwin'; d.className = 'card help';
  d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>Hoe werkt het?</h3><button class="s" style="padding:0;width:44px" id="hx" aria-label="Sluiten">✕</button></div>` +
    HELP.map(h => `<details><summary>${h[0]}</summary><p>${h[1]}</p></details>`).join('');
  document.body.appendChild(d);
  document.getElementById('hx').onclick = () => d.remove();
}
