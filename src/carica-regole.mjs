import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url));

export function caricaFile(percorsoRelativo) {
  return JSON.parse(readFileSync(`${RADICE}${percorsoRelativo}`, 'utf8'));
}

export function elencoFileRegole() {
  return readdirSync(`${RADICE}rules`).filter((f) => f.endsWith('.json')).sort();
}

export function caricaRegole() {
  return elencoFileRegole().map((f) => caricaFile(`rules/${f}`));
}

export { RADICE };

// Mappa percorso -> contenuto per ogni tabella dati referenziata dalle regole.
export function caricaTabelle(regole) {
  const percorsi = [...new Set(regole.map((r) => r.valore?.tabella).filter(Boolean))];
  return Object.fromEntries(percorsi.map((p) => [p, caricaFile(p)]));
}
