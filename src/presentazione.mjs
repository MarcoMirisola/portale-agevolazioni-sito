// Logica di presentazione dei risultati, senza DOM: cosi si testa in Node.

const ETICHETTE_CATEGORIA = {
  fondi_pensione: 'Pensione',
  sanita_integrativa: 'Salute',
  welfare: 'Welfare aziendale',
  fisco: 'Tasse (730)',
  famiglia: 'Famiglia',
  detrazioni: 'Spese da detrarre (730)',
};
const ORDINE_CATEGORIE = Object.keys(ETICHETTE_CATEGORIA);

export const etichettaCategoria = (c) => ETICHETTE_CATEGORIA[c] ?? c;

export function formattaEuro(importo) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(importo);
}

export function formattaData(iso) {
  const [a, m, g] = iso.split('-');
  return `${g}/${m}/${a}`;
}

// Raggruppa nell'ordine fisso delle categorie; dentro il gruppo, prima le voci con importo piu alto.
export function raggruppaPerCategoria(voci) {
  const gruppi = new Map();
  for (const v of voci) gruppi.set(v.categoria, [...(gruppi.get(v.categoria) ?? []), v]);
  const ordine = (c) => (ORDINE_CATEGORIE.includes(c) ? ORDINE_CATEGORIE.indexOf(c) : ORDINE_CATEGORIE.length);
  return [...gruppi.entries()]
    .sort(([a], [b]) => ordine(a) - ordine(b))
    .map(([categoria, elementi]) => ({
      categoria,
      etichetta: etichettaCategoria(categoria),
      voci: [...elementi].sort((x, y) => (y.importo_stimato ?? -1) - (x.importo_stimato ?? -1)),
    }));
}

// Importo in evidenza: solo se calcolabile. Altrimenti il motivo va tra i dettagli, non in primo piano.
export function testoImporto(voce) {
  return voce.importo_stimato === null ? null : `${formattaEuro(voce.importo_stimato)} all'anno`;
}

export function descriviAvvisi(coppie, voci) {
  const titolo = new Map(voci.map((v) => [v.id, v.titolo]));
  return coppie.map(([a, b]) => `"${titolo.get(a) ?? a}" e "${titolo.get(b) ?? b}" non sono cumulabili: scegline una.`);
}

// Solo http(s): un url malformato o con altro schema non diventa un link.
export function urlSicuro(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}
