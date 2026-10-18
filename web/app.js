import { DOMANDE, PASSI, costruisciProfilo, opzioniFondoPensione, SCUOLE } from '../src/questionario.mjs';
import { valuta } from '../src/motore.mjs';
import { descriviAvvisi, formattaData, raggruppaPerCategoria, testoImporto, urlSicuro } from '../src/presentazione.mjs';

const app = document.getElementById('app');
const domandaPer = (id) => DOMANDE.find((d) => d.id === id);

// Stato dell'interfaccia: sostituito, mai modificato in place.
let stato = { passo: 0, risposte: { figli: [] }, risultati: null };
const imposta = (parziale) => { stato = { ...stato, ...parziale }; render(); };

function el(tag, attributi = {}, figli = []) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(attributi)) {
    if (k === 'testo') nodo.textContent = v;
    else if (v !== false && v !== undefined && v !== null) nodo.setAttribute(k, v === true ? '' : v);
  }
  nodo.append(...figli);
  return nodo;
}

// ---------- campi ----------

function schedeOpzioni(id, opzioni, selezionato) {
  return el('div', { class: 'opzioni', role: 'radiogroup', 'aria-labelledby': `q-${id}` }, opzioni.map((o) => {
    const input = el('input', { type: 'radio', name: id, value: String(o.valore), checked: String(o.valore) === String(selezionato) });
    return el('label', { class: 'opzione' }, [input, el('span', { testo: o.etichetta })]);
  }));
}

function campoFigli(figli) {
  const lista = el('div', { class: 'figli' });
  const aggiungi = (valori = {}) => {
    const riga = el('div', { class: 'figlio' }, [
      el('label', {}, ['Data di nascita', el('input', { type: 'date', name: 'data_nascita', value: valori.data_nascita ?? '' })]),
      el('label', {}, ['Asilo o scuola frequentati', el('select', { name: 'scuola' },
        SCUOLE.map((o) => el('option', { value: o.valore, testo: o.etichetta, selected: o.valore === (valori.scuola ?? 'nessuna') })))]),
      el('button', { type: 'button', class: 'testuale', testo: 'Rimuovi' }),
    ]);
    riga.querySelector('button').addEventListener('click', () => riga.remove());
    lista.append(riga);
  };
  figli.forEach(aggiungi);
  const bottone = el('button', { type: 'button', class: 'secondario', testo: '+ Aggiungi un figlio' });
  bottone.addEventListener('click', () => aggiungi());
  return el('div', { id: 'campo-figli' }, [lista, bottone]);
}

function campoPer(d, risposte) {
  const valore = risposte[d.id];
  switch (d.tipo) {
    case 'scelta': {
      const opzioni = d.id === 'fondo_pensione' ? opzioniFondoPensione(risposte.ccnl) : d.opzioni;
      return schedeOpzioni(d.id, opzioni, valore);
    }
    case 'booleano':
      return schedeOpzioni(d.id, [{ valore: 'si', etichetta: 'Si' }, { valore: 'no', etichetta: 'No' }],
        valore === true ? 'si' : valore === false ? 'no' : undefined);
    case 'data':
      return el('input', { type: 'date', name: d.id, value: valore ?? '' });
    case 'numero':
      return el('input', { type: 'number', name: d.id, min: d.min, max: d.max, step: 'any', inputmode: 'decimal', value: valore ?? '' });
    default:
      return campoFigli(valore ?? []);
  }
}

// ---------- lettura risposte della scheda ----------

function leggiDomanda(d, radice) {
  const nome = (n) => radice.querySelector(`[name="${n}"]`);
  switch (d.tipo) {
    case 'scelta': return radice.querySelector(`[name="${d.id}"]:checked`)?.value;
    case 'booleano': {
      const v = radice.querySelector(`[name="${d.id}"]:checked`)?.value;
      return v === 'si' ? true : v === 'no' ? false : undefined;
    }
    case 'figli':
      return [...radice.querySelectorAll('.figlio')].map((riga) => ({
        data_nascita: riga.querySelector('[name=data_nascita]').value,
        scuola: riga.querySelector('[name=scuola]').value,
      }));
    default: return nome(d.id)?.value ?? '';
  }
}

function leggiScheda(passo, radice) {
  return Object.fromEntries(passo.domande.map((id) => [id, leggiDomanda(domandaPer(id), radice)]));
}

// ---------- scheda ----------

function titoloDomanda(d) {
  return el(d.tipo === 'figli' || d.tipo === 'scelta' || d.tipo === 'booleano' ? 'p' : 'label',
    { class: 'domanda-testo', id: `q-${d.id}`, for: d.tipo === 'data' || d.tipo === 'numero' ? `i-${d.id}` : undefined, testo: d.testo });
}

function renderDomanda(d, risposte) {
  const campo = campoPer(d, risposte);
  if (d.tipo === 'data' || d.tipo === 'numero') campo.id = `i-${d.id}`;
  return el('div', { class: 'domanda', 'data-campo': d.id }, [
    titoloDomanda(d), campo, el('p', { class: 'errore', role: 'alert', hidden: true }),
  ]);
}

function mostraErrori(form, errori) {
  form.querySelectorAll('.errore').forEach((p) => { p.hidden = true; p.textContent = ''; });
  for (const { campo, messaggio } of errori) {
    const p = form.querySelector(`[data-campo="${campo}"] .errore`);
    if (p) { p.hidden = false; p.textContent = messaggio; }
  }
  form.querySelector('.errore:not([hidden])')?.closest('.domanda')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function barraProgresso(indice) {
  const perc = Math.round(((indice + 1) / PASSI.length) * 100);
  return el('div', { class: 'progresso' }, [
    el('p', { class: 'passo-n', testo: `Passo ${indice + 1} di ${PASSI.length}` }),
    el('div', { class: 'barra', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': perc },
      [el('div', { class: 'riempimento', style: `width:${perc}%` })]),
  ]);
}

function renderScheda() {
  const indice = stato.passo;
  const passo = PASSI[indice];
  const ultimo = indice === PASSI.length - 1;
  const form = el('form', { class: 'scheda', novalidate: true }, [
    barraProgresso(indice),
    el('h1', { tabindex: -1, testo: passo.titolo }),
    el('p', { class: 'sottotitolo', testo: passo.sottotitolo }),
    ...passo.domande.map((id) => renderDomanda(domandaPer(id), stato.risposte)),
    el('div', { class: 'azioni' }, [
      indice > 0 ? el('button', { type: 'button', class: 'secondario', id: 'indietro', testo: 'Indietro' }) : el('span'),
      el('button', { type: 'submit', class: 'primario', testo: ultimo ? 'Vedi le agevolazioni' : 'Avanti' }),
    ]),
  ]);

  form.querySelector('#indietro')?.addEventListener('click', () => {
    imposta({ passo: indice - 1, risposte: { ...stato.risposte, ...leggiScheda(passo, form) } });
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); avanti(form, passo, ultimo); });
  return form;
}

async function avanti(form, passo, ultimo) {
  const lette = leggiScheda(passo, form);
  // Cambiare CCNL rende non valido un fondo pensione scelto prima.
  const fondoOk = opzioniFondoPensione(lette.ccnl ?? stato.risposte.ccnl).some((o) => o.valore === stato.risposte.fondo_pensione);
  const base = fondoOk ? stato.risposte : { ...stato.risposte, fondo_pensione: undefined };
  const risposte = { ...base, ...lette };

  const { profilo, errori = [] } = costruisciProfilo(risposte);
  const dellaScheda = errori.filter((e) => passo.domande.includes(e.campo));
  if (dellaScheda.length > 0) { mostraErrori(form, dellaScheda); return; }
  if (!ultimo) { imposta({ passo: stato.passo + 1, risposte }); return; }
  if (!profilo) {
    // Errore in una scheda precedente: riporta li l'utente.
    const primo = PASSI.findIndex((p) => p.domande.includes(errori[0].campo));
    imposta({ passo: primo, risposte });
    return;
  }
  let risultati;
  try {
    const risposta = await fetch('dati.json');
    if (!risposta.ok) throw new Error(`dati.json non disponibile (HTTP ${risposta.status})`);
    const { regole, tabelle } = await risposta.json();
    risultati = valuta(profilo, regole, tabelle);
  } catch (e) {
    console.error(e);
    mostraErrori(form, [{ campo: passo.domande.at(-1), messaggio: `Impossibile calcolare le agevolazioni (${e.message}). Riprova piu tardi.` }]);
    return;
  }
  imposta({ risposte, risultati });
}

// ---------- risultati ----------

function renderFonte(voce) {
  const riga = el('div', { class: 'fonte' }, [
    el('p', { testo: `Fonte: ${voce.fonte.riferimento} (verificato il ${formattaData(voce.verificato_il)})` }),
  ]);
  const url = voce.fonte.url ? urlSicuro(voce.fonte.url) : null;
  if (url) {
    riga.append(el('a', { class: 'pulsante', href: url, target: '_blank', rel: 'noopener noreferrer',
      'aria-label': `Vai al sito ufficiale: ${voce.titolo}`, testo: 'Vai al sito ufficiale' }));
  }
  if (voce.fonte.pdf) {
    riga.append(' ', el('a', { class: 'link-pdf', href: `../${voce.fonte.pdf}`, target: '_blank', rel: 'noopener',
      testo: 'PDF del documento' }));
  }
  return riga;
}

// Dettagli tecnici dietro un "Perche e come": chiusi di default per non appesantire la pagina.
function renderDettagli(voce) {
  const righe = [];
  if (voce.note) righe.push(el('p', { testo: voce.note }));
  if (voce.importo_nota) righe.push(el('p', { testo: voce.importo_stimato === null ? voce.importo_nota : `Stima: ${voce.importo_nota}` }));
  righe.push(el('p', { testo: `Anno d'imposta: ${voce.anno_imposta}` }));
  return el('details', {}, [el('summary', { testo: 'Dettagli' }), ...righe]);
}

function renderVoce(voce) {
  const titolo = el('h3', { class: 'titolo', testo: voce.titolo });
  if (voce.da_verificare) titolo.append(' ', el('span', { class: 'badge', testo: 'da verificare' }));
  const importo = voce.nascondi_importo ? null : testoImporto(voce);
  return el('li', {}, [
    titolo,
    ...(voce.in_breve ? [el('p', { class: 'in-breve', testo: voce.in_breve })] : []),
    ...(importo ? [el('p', { class: 'importo', testo: importo })] : []),
    renderDettagli(voce),
    renderFonte(voce),
  ]);
}

function renderRisultati() {
  const visibili = stato.risultati.regole.filter((v) => !v.nascosta);
  const avvisi = descriviAvvisi(stato.risultati.avvisi_incompatibilita, visibili);
  const modifica = el('button', { type: 'button', class: 'secondario', testo: 'Modifica le risposte' });
  modifica.addEventListener('click', () => imposta({ passo: PASSI.length - 1, risultati: null }));
  return el('section', { class: 'risultati' }, [
    el('h1', { tabindex: -1, testo: 'Le tue agevolazioni' }),
    el('p', { class: 'sottotitolo', testo: visibili.length === 0
      ? 'Con queste risposte non risulta nessuna agevolazione.'
      : `Abbiamo trovato ${visibili.length} agevolazioni che potrebbero spettarti. Gli importi sono stime annuali.` }),
    ...avvisi.map((t) => el('p', { class: 'avviso-incompat', role: 'alert', testo: t })),
    ...raggruppaPerCategoria(visibili).map((g) => el('section', { class: 'gruppo' }, [
      el('h2', { testo: g.etichetta }),
      el('ul', { class: 'checklist' }, g.voci.map(renderVoce)),
    ])),
    modifica,
  ]);
}

function render() {
  const nodo = stato.risultati ? renderRisultati() : renderScheda();
  app.replaceChildren(nodo);
  nodo.querySelector('h1')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

render();
