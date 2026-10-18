// Validatore minimale per il sottoinsieme di JSON Schema usato in schema/regola.schema.json.
// Una keyword non supportata fa fallire subito, cosi lo schema non viene ignorato in silenzio.

const KEYWORD_SUPPORTATE = new Set([
  '$schema', 'title', 'type', 'required', 'properties', 'enum', 'pattern', 'items', 'format',
]);

const TIPI = {
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  array: Array.isArray,
  string: (v) => typeof v === 'string',
  integer: Number.isInteger,
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
};

export function dataValida(testo) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(testo)) return false;
  const d = new Date(`${testo}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === testo;
}

export function validaSchema(valore, schema, percorso = '$') {
  const sconosciute = Object.keys(schema).filter((k) => !KEYWORD_SUPPORTATE.has(k));
  if (sconosciute.length > 0) {
    throw new Error(`Keyword di schema non supportata in ${percorso}: ${sconosciute.join(', ')}`);
  }
  if (schema.type !== undefined) {
    const controllo = TIPI[schema.type];
    if (!controllo) throw new Error(`Tipo di schema non supportato in ${percorso}: ${schema.type}`);
    if (!controllo(valore)) return [`${percorso}: atteso ${schema.type}`];
  }
  if (schema.enum && !schema.enum.includes(valore)) {
    return [`${percorso}: valore "${valore}" non ammesso (ammessi: ${schema.enum.join(', ')})`];
  }
  if (schema.pattern && typeof valore === 'string' && !new RegExp(schema.pattern).test(valore)) {
    return [`${percorso}: "${valore}" non rispetta il pattern ${schema.pattern}`];
  }
  if (schema.format === 'date' && typeof valore === 'string' && !dataValida(valore)) {
    return [`${percorso}: "${valore}" non e una data valida (AAAA-MM-GG)`];
  }
  const errori = [];
  if (TIPI.object(valore)) {
    for (const chiave of schema.required ?? []) {
      if (!(chiave in valore)) errori.push(`${percorso}: campo obbligatorio mancante "${chiave}"`);
    }
    for (const [chiave, sotto] of Object.entries(schema.properties ?? {})) {
      if (chiave in valore) errori.push(...validaSchema(valore[chiave], sotto, `${percorso}.${chiave}`));
    }
  }
  if (Array.isArray(valore) && schema.items) {
    valore.forEach((el, i) => errori.push(...validaSchema(el, schema.items, `${percorso}[${i}]`)));
  }
  return errori;
}
