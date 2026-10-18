// Motore: funzione pura (profilo, regole, tabelle) -> risultati. Nessun I/O: gira uguale in Node e nel browser.

import { soddisfa } from './condizioni.mjs';
import { stimaImporto } from './importi.mjs';

const STATO_VERIFICATA = 'verificata';

function risultatoPer(regola, profilo, tabelle) {
  const { importo, nota } = stimaImporto(regola, profilo, tabelle);
  return {
    id: regola.id,
    categoria: regola.categoria,
    titolo: regola.titolo,
    anno_imposta: regola.anno_imposta,
    importo_stimato: importo,
    importo_nota: nota,
    in_breve: regola.in_breve ?? null,
    nascondi_importo: regola.nascondi_importo === true,
    note: regola.note ?? null,
    fonte: regola.fonte,
    verificato_il: regola.verificato_il,
    stato: regola.stato,
    da_verificare: regola.stato !== STATO_VERIFICATA,
    // Voci tecniche (es. requisiti di un'altra voce): valutate ma non mostrate al lavoratore.
    nascosta: regola.mostra_al_lavoratore === false,
  };
}

function avvisiIncompatibilita(applicabili) {
  const ids = new Set(applicabili.map((r) => r.id));
  const coppie = applicabili.flatMap((r) =>
    (r.incompatibile_con ?? []).filter((altro) => ids.has(altro)).map((altro) => [r.id, altro].sort()),
  );
  const uniche = new Map(coppie.map((c) => [c.join('|'), c]));
  return [...uniche.values()];
}

export function valuta(profilo, regole, tabelle = {}) {
  const applicabili = regole.filter((r) => soddisfa(profilo, r.si_applica_se));
  return {
    regole: applicabili.map((r) => risultatoPer(r, profilo, tabelle)),
    avvisi_incompatibilita: avvisiIncompatibilita(applicabili),
  };
}
