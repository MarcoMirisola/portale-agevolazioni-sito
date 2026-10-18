// Validatore delle regole: schema, coerenza id/nome file, id unici, riferimenti, condizioni note.

import { existsSync } from 'node:fs';
import { CHIAVI_CONDIZIONE } from './condizioni.mjs';
import { validaSchema } from './json-schema.mjs';

// `file` -> { nome, contenuto } ; contenuto null se il JSON non e parsabile (errore in `errore`).
export function validaRegole(voci, schema, { radice } = {}) {
  const errori = [];
  const aggiungi = (nome, msg) => errori.push(`${nome}: ${msg}`);

  const valide = voci.filter((v) => {
    if (v.errore) aggiungi(v.nome, `JSON non valido (${v.errore})`);
    return !v.errore;
  });

  for (const { nome, contenuto: r } of valide) {
    validaSchema(r, schema).forEach((e) => aggiungi(nome, e));
    if (typeof r.id === 'string' && nome !== `${r.id}.json`) {
      aggiungi(nome, `il nome file deve essere "${r.id}.json"`);
    }
    for (const chiave of Object.keys(r.si_applica_se ?? {})) {
      if (!CHIAVI_CONDIZIONE.has(chiave)) aggiungi(nome, `condizione sconosciuta in si_applica_se: "${chiave}"`);
    }
    if (r.mostra_al_lavoratore !== false && r.stato === 'verificata' && !r.fonte?.url) {
      aggiungi(nome, 'una regola verificata e visibile deve avere fonte.url (link ufficiale)');
    }
    if (r.mostra_al_lavoratore !== false && !r.in_breve) {
      aggiungi(nome, 'una regola visibile deve avere in_breve (spiegazione in italiano semplice)');
    }
    const pdf = r.fonte?.pdf;
    if (r.mostra_al_lavoratore !== false) {
      if (!pdf) aggiungi(nome, 'manca fonte.pdf (documento ufficiale scaricato in fonti/)');
      if (!(r.fonte?.normativa ?? []).length && !r.fonte?.normativa_assente) {
        aggiungi(nome, 'manca fonte.normativa (link alla norma) o fonte.normativa_assente (motivo per cui non esiste una norma)');
      }
    }
    if (pdf && radice && !existsSync(`${radice}${pdf}`)) aggiungi(nome, `PDF della fonte inesistente: ${pdf}`);
    const tabella = r.valore?.tabella;
    if (tabella && radice && !existsSync(`${radice}${tabella}`)) {
      aggiungi(nome, `tabella dati inesistente: ${tabella}`);
    }
  }

  const conteggio = valide.reduce((m, { contenuto: r }) => m.set(r.id, (m.get(r.id) ?? 0) + 1), new Map());
  for (const [id, n] of conteggio) if (n > 1) errori.push(`id duplicato "${id}" in ${n} file`);

  const ids = new Set(conteggio.keys());
  for (const { nome, contenuto: r } of valide) {
    for (const altro of r.incompatibile_con ?? []) {
      if (!ids.has(altro)) aggiungi(nome, `incompatibile_con riferisce un id inesistente: "${altro}"`);
      if (altro === r.id) aggiungi(nome, 'incompatibile_con contiene l\'id della regola stessa');
    }
  }
  return errori;
}
