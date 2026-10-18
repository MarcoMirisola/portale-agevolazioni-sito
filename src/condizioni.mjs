// Vocabolario di `si_applica_se`. Ogni condizione e una funzione pura (profilo, valoreRegola) -> boolean.
// Dato mancante nel profilo => condizione non soddisfatta (non si suppone nulla sull'utente).

const FIGLIO_LIVELLO = ['figlio_eta_min', 'figlio_eta_max', 'frequenta_nido', 'figlio_a_scuola'];

const inLista = (lista, valore) => valore !== undefined && lista.includes(valore);

export const CONDIZIONI_PROFILO = {
  ccnl: (p, v) => inLista(v, p.ccnl),
  stato_lavoro: (p, v) => inLista(v, p.stato_lavoro),
  qualifica: (p, v) => inLista(v, p.qualifica),
  qualifica_non: (p, v) => p.qualifica !== undefined && !v.includes(p.qualifica),
  contratto: (p, v) => inLista(v, p.contratto),
  iscritto_fonte: (p, v) => (p.iscritto_fonte === true) === v,
  // Fon.Te e un fondo pensione: l'iscrizione implica quella a un fondo pensione.
  iscritto_fondo_pensione: (p, v) => ((p.iscritto_fondo_pensione ?? p.iscritto_fonte) === true) === v,
  iscritto_fondo_sanitario: (p, v) => (p.iscritto_fondo_sanitario === true) === v,
  genitore: (p, v) => inLista(v, p.genitore),
  assunto_dal: (p, v) => typeof p.data_assunzione === 'string' && p.data_assunzione >= v,
  reddito_max: (p, v) => typeof p.reddito === 'number' && p.reddito <= v,
};

// Condizioni su un singolo figlio: devono valere insieme sullo stesso figlio.
const CONDIZIONI_FIGLIO = {
  figlio_eta_min: (f, v) => typeof f.eta === 'number' && f.eta >= v,
  figlio_eta_max: (f, v) => typeof f.eta === 'number' && f.eta <= v,
  frequenta_nido: (f, v) => (f.frequenta_nido === true) === v,
  figlio_a_scuola: (f, v) => inLista(v, f.scuola),
};

// Condizioni sul numero di figli; usano le condizioni di figlio come filtro.
const CONDIZIONI_CONTEGGIO = ['figli_a_carico_min'];

export const CHIAVI_CONDIZIONE = new Set([
  ...Object.keys(CONDIZIONI_PROFILO),
  ...FIGLIO_LIVELLO,
  ...CONDIZIONI_CONTEGGIO,
]);

export function figliCheSoddisfano(profilo, siApplicaSe) {
  const filtri = FIGLIO_LIVELLO.filter((k) => k in siApplicaSe);
  return (profilo.figli ?? []).filter((f) => filtri.every((k) => CONDIZIONI_FIGLIO[k](f, siApplicaSe[k])));
}

export function soddisfa(profilo, siApplicaSe) {
  const sconosciute = Object.keys(siApplicaSe).filter((k) => !CHIAVI_CONDIZIONE.has(k));
  if (sconosciute.length > 0) throw new Error(`Condizioni sconosciute in si_applica_se: ${sconosciute.join(', ')}`);

  const profiloOk = Object.entries(siApplicaSe)
    .filter(([k]) => k in CONDIZIONI_PROFILO)
    .every(([k, v]) => CONDIZIONI_PROFILO[k](profilo, v));
  if (!profiloOk) return false;

  const haCondizioniFiglio = FIGLIO_LIVELLO.some((k) => k in siApplicaSe);
  const haConteggio = 'figli_a_carico_min' in siApplicaSe;
  if (!haCondizioniFiglio && !haConteggio) return true;

  const minimo = haConteggio ? siApplicaSe.figli_a_carico_min : 1;
  return figliCheSoddisfano(profilo, siApplicaSe).length >= minimo;
}
