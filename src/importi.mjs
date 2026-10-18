// Stima dell'importo annuo (euro) di una regola per un profilo. Restituisce { importo, nota }.
// `tabelle` mappa il percorso di una tabella dati (valore.tabella) al suo contenuto.
// importo e null quando non e calcolabile con i dati del profilo (es. percentuali sulla RAL).

import { figliCheSoddisfano } from './condizioni.mjs';

const arrotonda = (n) => Math.round(n * 100) / 100;
const nessuno = (nota) => ({ importo: null, nota });

function fasciaIsee(fasce, isee) {
  // Senza ISEE si applica l'ultima fascia (importo minimo), la sola garantita.
  if (typeof isee !== 'number') return fasce[fasce.length - 1];
  return fasce.find((f) => f.isee_max === null || isee <= f.isee_max) ?? fasce[fasce.length - 1];
}

function stimaFasceIsee(regola, profilo) {
  const figli = figliCheSoddisfano(profilo, regola.si_applica_se);
  const totale = figli.reduce((somma, f) => {
    const fasce = f.nato_dal_2024 ? regola.valore.nati_dal_2024 : regola.valore.nati_prima_2024;
    return somma + fasciaIsee(fasce, profilo.isee).importo_annuo;
  }, 0);
  const nota = typeof profilo.isee === 'number' ? 'In base all\'ISEE indicato.' : 'ISEE non indicato: importo minimo.';
  return { importo: totale, nota };
}

function stimaTabella(regola, profilo, tabelle) {
  const tabella = tabelle[regola.valore.tabella];
  if (!tabella) throw new Error(`Tabella dati non fornita: ${regola.valore.tabella}`);
  const riga = typeof profilo.isee === 'number'
    ? tabella.righe.find((r) => r.isee_a === null || profilo.isee <= r.isee_a) ?? tabella.righe.at(-1)
    : tabella.righe.at(-1);
  const figli = figliCheSoddisfano(profilo, regola.si_applica_se);
  const minorenni = figli.filter((f) => f.eta < 18).length;
  const maggiorenni = figli.length - minorenni;
  const mensile = minorenni * riga.valori[0] + maggiorenni * riga.valori[1];
  const notaMaggiorenni = maggiorenni > 0 ? ' I figli dai 18 ai 20 anni sono inclusi se rispettano le condizioni (studio, reddito sotto 8.000 euro...).' : '';
  return {
    importo: arrotonda(mensile * 12),
    nota: `Importo base su 12 mensilita, senza maggiorazioni.${notaMaggiorenni}`,
  };
}

function stimaImportoFisso(valore) {
  if (valore.totale_annuo !== undefined) return { importo: valore.totale_annuo, nota: 'Azienda + lavoratore.' };
  if (valore.azienda_annuo !== undefined) return { importo: valore.azienda_annuo, nota: 'Quota a carico azienda.' };
  if (valore.azienda_mensile !== undefined) {
    return { importo: valore.azienda_mensile * 12, nota: 'Quota a carico azienda, 12 mesi.' };
  }
  if (valore.annuo !== undefined) return { importo: valore.annuo, nota: 'Importo annuo.' };
  return nessuno('Importo non determinabile.');
}

function stimaDetrazione(regola, profilo) {
  const { percentuale, tetto_spesa: tetto } = regola.valore;
  if (tetto === undefined) return nessuno('Dipende dalla spesa sostenuta.');
  const unita = Math.max(1, figliCheSoddisfano(profilo, regola.si_applica_se).length);
  const perFiglio = regola.valore.per !== undefined;
  const n = perFiglio ? unita : 1;
  return { importo: arrotonda((tetto * percentuale / 100) * n), nota: 'Massimo recuperabile con spesa pari al tetto.' };
}

export function stimaImporto(regola, profilo, tabelle = {}) {
  switch (regola.valore.tipo) {
    case 'fasce_isee': return stimaFasceIsee(regola, profilo);
    case 'tabella': return stimaTabella(regola, profilo, tabelle);
    case 'importo_fisso': return stimaImportoFisso(regola.valore);
    case 'detrazione': return stimaDetrazione(regola, profilo);
    case 'percentuale': return nessuno('Dipende dalla retribuzione.');
    case 'deduzione': return nessuno('Il risparmio dipende dal reddito (tetto di deducibilita).');
    default: return nessuno('');
  }
}
