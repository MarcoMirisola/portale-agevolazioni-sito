// Questionario: definizione delle domande e conversione delle risposte in profilo per il motore.
// Nessun accesso al DOM: la UI legge `DOMANDE` e chiama `costruisciProfilo`.

export const CCNL = [
  { valore: 'terziario', etichetta: 'Terziario (Confcommercio)' },
  { valore: 'metalmeccanico_industria', etichetta: 'Metalmeccanico Industria' },
];
export const QUALIFICHE = [
  { valore: 'operaio', etichetta: 'Operaio' },
  { valore: 'impiegato', etichetta: 'Impiegato' },
  { valore: 'quadro', etichetta: 'Quadro' },
];
export const CONTRATTI = [
  { valore: 'tempo_indeterminato', etichetta: 'Tempo indeterminato' },
  { valore: 'tempo_determinato', etichetta: 'Tempo determinato' },
  { valore: 'apprendistato', etichetta: 'Apprendistato' },
];
export const FONDI_PENSIONE = [
  { valore: 'no', etichetta: 'Nessun fondo pensione' },
  { valore: 'fonte', etichetta: 'Fon.Te', soloCcnl: 'terziario' },
  { valore: 'cometa', etichetta: 'Cometa', soloCcnl: 'metalmeccanico_industria' },
  { valore: 'altro', etichetta: 'Altro fondo pensione' },
];
export const GENITORI = [
  { valore: 'madre', etichetta: 'Madre' },
  { valore: 'padre', etichetta: 'Padre' },
];
export const SCUOLE = [
  { valore: 'nessuna', etichetta: 'Non frequenta / altro' },
  { valore: 'nido', etichetta: 'Asilo nido' },
  { valore: 'infanzia', etichetta: 'Scuola dell\'infanzia' },
  { valore: 'primo_ciclo', etichetta: 'Primaria o secondaria di primo grado' },
  { valore: 'secondaria_secondo_grado', etichetta: 'Secondaria di secondo grado' },
];

// Fondi pensione selezionabili per un CCNL: nessuno, quello di riferimento, altro.
export const opzioniFondoPensione = (ccnl) =>
  FONDI_PENSIONE.filter((o) => !o.soloCcnl || o.soloCcnl === ccnl);

export const ETA_MAX_LAVORATORE = 70;
export const ETA_MAX_FIGLIO = 25;
export const ISEE_MAX = 1_000_000;
// Soglia di legge: il bonus nido distingue i nati dal 1 gennaio 2024.
export const ANNO_NASCITA_SOGLIA_NIDO = 2024;

// Ordine e testo delle domande: la UI le mostra in questo ordine.
export const DOMANDE = [
  { id: 'ccnl', testo: 'Quale CCNL ti si applica?', tipo: 'scelta', opzioni: CCNL },
  { id: 'qualifica', testo: 'Qual e la tua qualifica?', tipo: 'scelta', opzioni: QUALIFICHE },
  { id: 'contratto', testo: 'Che tipo di contratto hai?', tipo: 'scelta', opzioni: CONTRATTI },
  { id: 'data_assunzione', testo: 'Quando sei stato assunto?', tipo: 'data' },
  { id: 'eta', testo: 'Quanti anni hai?', tipo: 'numero', min: 16, max: ETA_MAX_LAVORATORE },
  { id: 'figli', testo: 'Hai figli a carico? Indica la data di nascita e se frequentano asilo o scuola.', tipo: 'figli' },
  { id: 'genitore', testo: 'Sei madre o padre? (serve se hai figli)', tipo: 'scelta', opzioni: GENITORI, facoltativa: true },
  { id: 'isee', testo: 'Qual e il tuo ISEE? (facoltativo)', tipo: 'numero', min: 0, max: ISEE_MAX, facoltativa: true },
  { id: 'fondo_pensione', testo: 'A quale fondo pensione sei iscritto?', tipo: 'scelta', opzioni: FONDI_PENSIONE },
  { id: 'fondo_sanitario', testo: 'Sei iscritto a un fondo sanitario (Est, mètaSalute, QuAS...)?', tipo: 'booleano' },
];

// Schede del percorso: ogni domanda compare in una sola scheda, nell'ordine di DOMANDE.
export const PASSI = [
  { id: 'lavoro', titolo: 'Il tuo lavoro', sottotitolo: 'Contratto collettivo, qualifica e tipo di contratto.', domande: ['ccnl', 'qualifica', 'contratto'] },
  { id: 'storia', titolo: 'Da quando lavori', sottotitolo: 'Servono per le regole che dipendono dalla data di assunzione.', domande: ['data_assunzione', 'eta'] },
  { id: 'famiglia', titolo: 'La tua famiglia', sottotitolo: 'Figli, se sei madre o padre e ISEE. Se non hai figli, vai avanti.', domande: ['figli', 'genitore', 'isee'] },
  { id: 'fondi', titolo: 'Fondi e tutele', sottotitolo: 'Previdenza complementare e sanita integrativa.', domande: ['fondo_pensione', 'fondo_sanitario'] },
];

const ammessi = (opzioni) => new Set(opzioni.map((o) => o.valore));
const OGGI_ISO = (adesso) => adesso.toISOString().slice(0, 10);

function intero(valore) {
  if (valore === '' || valore === null || valore === undefined) return null;
  const n = Number(valore);
  return Number.isFinite(n) ? n : NaN;
}

function dataIsoValida(testo, adesso) {
  if (typeof testo !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(testo)) return false;
  const d = new Date(`${testo}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === testo && testo <= OGGI_ISO(adesso);
}

// Anni compiuti alla data `adesso`, dato che `nascita` e `adesso` sono date ISO (AAAA-MM-GG).
export function anniCompiuti(nascita, adesso) {
  const oggi = adesso.toISOString().slice(0, 10);
  const compiuto = oggi.slice(5) >= nascita.slice(5);
  return Number(oggi.slice(0, 4)) - Number(nascita.slice(0, 4)) - (compiuto ? 0 : 1);
}

function costruisciFiglio(f, indice, errori, adesso) {
  const etichetta = `figlio ${indice + 1}`;
  if (!dataIsoValida(f.data_nascita, adesso)) {
    errori.push({ campo: 'figli', messaggio: `${etichetta}: data di nascita non valida o futura` });
    return null;
  }
  const eta = anniCompiuti(f.data_nascita, adesso);
  if (eta > ETA_MAX_FIGLIO) {
    errori.push({ campo: 'figli', messaggio: `${etichetta}: eta oltre ${ETA_MAX_FIGLIO} anni` });
    return null;
  }
  const scuola = f.scuola ?? 'nessuna';
  if (!ammessi(SCUOLE).has(scuola)) {
    errori.push({ campo: 'figli', messaggio: `${etichetta}: scelta asilo/scuola non valida` });
    return null;
  }
  const figlio = {
    eta,
    data_nascita: f.data_nascita,
    nato_dal_2024: Number(f.data_nascita.slice(0, 4)) >= ANNO_NASCITA_SOGLIA_NIDO,
    frequenta_nido: scuola === 'nido',
  };
  return scuola === 'nessuna' || scuola === 'nido' ? figlio : { ...figlio, scuola };
}

// risposte: oggetto con gli id delle domande. Restituisce { profilo } oppure { errori }.
export function costruisciProfilo(risposte, adesso = new Date()) {
  const errori = [];
  const scelta = (id, opzioni, testo) => {
    if (!ammessi(opzioni).has(risposte[id])) errori.push({ campo: id, messaggio: `${testo}: scegli una risposta` });
    return risposte[id];
  };

  const ccnl = scelta('ccnl', CCNL, 'CCNL');
  const qualifica = scelta('qualifica', QUALIFICHE, 'Qualifica');
  const contratto = scelta('contratto', CONTRATTI, 'Contratto');
  const fondo = scelta('fondo_pensione', FONDI_PENSIONE, 'Fondo pensione');

  const opzioneFondo = FONDI_PENSIONE.find((o) => o.valore === fondo);
  if (opzioneFondo?.soloCcnl && opzioneFondo.soloCcnl !== ccnl) {
    errori.push({ campo: 'fondo_pensione', messaggio: `${opzioneFondo.etichetta} non e il fondo del CCNL scelto` });
  }

  if (!dataIsoValida(risposte.data_assunzione, adesso)) {
    errori.push({ campo: 'data_assunzione', messaggio: 'Data di assunzione non valida o futura' });
  }

  const eta = intero(risposte.eta);
  if (!Number.isInteger(eta) || eta < 16 || eta > ETA_MAX_LAVORATORE) {
    errori.push({ campo: 'eta', messaggio: `Eta non valida (16-${ETA_MAX_LAVORATORE})` });
  }

  const isee = intero(risposte.isee);
  if (Number.isNaN(isee) || (isee !== null && (isee < 0 || isee > ISEE_MAX))) {
    errori.push({ campo: 'isee', messaggio: 'ISEE non valido' });
  }

  if (typeof risposte.fondo_sanitario !== 'boolean') {
    errori.push({ campo: 'fondo_sanitario', messaggio: 'Fondo sanitario: rispondi si o no' });
  }

  const figliInput = Array.isArray(risposte.figli) ? risposte.figli : [];
  const figli = figliInput.map((f, i) => costruisciFiglio(f, i, errori, adesso)).filter(Boolean);

  if (figli.length > 0 && !ammessi(GENITORI).has(risposte.genitore)) {
    errori.push({ campo: 'genitore', messaggio: 'Indica se sei madre o padre' });
  }

  if (errori.length > 0) return { errori };

  const base = {
    ccnl,
    stato_lavoro: 'dipendente_privato',
    qualifica,
    contratto,
    data_assunzione: risposte.data_assunzione,
    eta,
    figli,
    ...(figli.length > 0 ? { genitore: risposte.genitore } : {}),
    iscritto_fonte: fondo === 'fonte',
    iscritto_fondo_pensione: fondo !== 'no',
    iscritto_fondo_sanitario: risposte.fondo_sanitario,
  };
  return { profilo: isee === null ? base : { ...base, isee } };
}
