/**
 * Parsers para el import de extractos (CSV/Excel) de tarjeta de crédito.
 *
 * Viven aparte del componente para poder testearlos: son la parte del import
 * donde un error silencioso corrompe dinero o fechas.
 *
 * NO usar `XLSX.read` para .csv: SheetJS adivina tipos con SUS heurísticas
 * antes de que estos parsers vean el texto y, con formato es-CO
 * ("150.000,50", "05/07/2026"), corrompe el valor. XLSX.read solo para
 * .xlsx/.xls reales.
 */

/**
 * Detecta el separador de la primera línea (ignorando lo que va entre comillas).
 * Excel en español exporta CSV con ';' —precisamente porque aquí la coma es el
 * separador decimal—, así que asumir ',' dejaba el archivo en una sola columna.
 */
export function detectDelimiter(text) {
  const nl = text.search(/\r|\n/);
  const firstLine = nl === -1 ? text : text.slice(0, nl);
  let inQ = false, comas = 0, puntoYComa = 0, tabs = 0;
  for (const c of firstLine) {
    if (c === '"') inQ = !inQ;
    else if (!inQ && c === ',') comas++;
    else if (!inQ && c === ';') puntoYComa++;
    else if (!inQ && c === '\t') tabs++;
  }
  if (puntoYComa > comas && puntoYComa >= tabs) return ';';
  if (tabs > comas && tabs > puntoYComa) return '\t';
  return ',';
}

/** CSV -> array de arrays, respetando comillas y comillas escapadas (""). */
export function parseCSV(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else if (c === '"') { inQuotes = true; }
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

// Valida rangos reales — un regex solo de dígitos deja pasar "99/99/9999".
const validYMD = (y, mo, d) => mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100
  ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  : null;

/**
 * Celda de fecha (Date de Excel o texto DD/MM/YYYY, común en extractos
 * colombianos) -> 'YYYY-MM-DD'. Nunca toISOString(): mismo gotcha de zona
 * horaria de siempre (ver CLAUDE.md).
 */
export function parseFecha(value) {
  if (value instanceof Date && !isNaN(value)) {
    return validYMD(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  const str = String(value ?? '').trim();
  let m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // DD/MM/YYYY
  if (m) return validYMD(+m[3], +m[2], +m[1]);
  m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/); // YYYY-MM-DD
  if (m) return validYMD(+m[1], +m[2], +m[3]);
  return null;
}

/**
 * Monto en texto ("$1.500.000,50", "1500000", "1,234.56") -> número.
 * Si aparecen ambos separadores, el ÚLTIMO es el decimal.
 */
export function parseMonto(value) {
  if (typeof value === 'number') return value;
  let str = String(value ?? '').replace(/[^0-9,.-]/g, '');
  if (!str) return NaN;
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    str = lastComma > lastDot
      ? str.replace(/\./g, '').replace(',', '.')
      : str.replace(/,/g, '');
  } else if (lastComma > -1) {
    str = /,\d{1,2}$/.test(str) ? str.replace(',', '.') : str.replace(/,/g, '');
  } else if (lastDot > -1) {
    str = /\.\d{1,2}$/.test(str) ? str : str.replace(/\./g, '');
  }
  return parseFloat(str);
}
