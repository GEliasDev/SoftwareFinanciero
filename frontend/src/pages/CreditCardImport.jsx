import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { ArrowLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { CreditCardService } from '../services/creditCardService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt } from '../utils/format';
import { CATEGORIES } from '../utils/creditCard';

// Parser CSV manual (no XLSX.read): SheetJS intenta "adivinar" tipos en CSV
// (números, fechas) usando SUS PROPIAS heurísticas de formato antes de que
// nuestro parseFecha/parseMonto vean el texto — con un extracto en formato
// es-CO ("150.000,50", "05/07/2026") eso corrompe el valor silenciosamente.
// Para .csv leemos el texto crudo nosotros; XLSX.read solo se usa para
// .xlsx/.xls reales, donde si hace falta interpretar tipos de celda.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

const FIELDS = [
  { key: 'fecha', label: 'Fecha de compra', required: true, guesses: ['fecha', 'date', 'fecha de compra', 'fecha transaccion', 'fecha transacción'] },
  { key: 'descripcion', label: 'Descripción', required: true, guesses: ['descripcion', 'descripción', 'detalle', 'description', 'comercio', 'concepto'] },
  { key: 'monto', label: 'Monto', required: true, guesses: ['monto', 'valor', 'amount', 'valor original', 'total'] },
  { key: 'categoria', label: 'Categoría (opcional)', required: false, guesses: ['categoria', 'categoría', 'category'] },
];

// Convierte una celda de fecha (Date de Excel o texto DD/MM/YYYY, común en
// extractos colombianos) a 'YYYY-MM-DD'. Nunca toISOString() — mismo gotcha
// de zona horaria de siempre (ver CLAUDE.md).
// Valida rangos reales (mes 1-12, día 1-31) — un regex solo de dígitos deja
// pasar cosas como "99/99/9999" como si fuera una fecha válida.
const validYMD = (y, mo, d) => mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100
  ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  : null;

function parseFecha(value) {
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

// Normaliza un monto en texto ("$1.500.000,50", "1500000", "1,234.56") a
// número. Si ambos separadores aparecen, el ÚLTIMO es el decimal.
function parseMonto(value) {
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

function guessColumn(headers, guesses) {
  const norm = (s) => String(s).toLowerCase().trim();
  const idx = headers.findIndex(h => guesses.includes(norm(h)));
  return idx >= 0 ? idx : '';
}

export const CreditCardImport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]); // array de arrays (crudo)
  const [mapping, setMapping] = useState({ fecha: '', descripcion: '', monto: '', categoria: '' });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null); // { ok, fail, errors }

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const isCSV = /\.csv$/i.test(file.name);
    let data;
    if (isCSV) {
      data = parseCSV(await file.text());
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    }
    if (data.length < 2) {
      Swal.fire({ icon: 'error', title: 'Archivo vacío', text: 'No se encontraron filas de datos.' });
      return;
    }
    const [head, ...body] = data;
    setHeaders(head);
    setRows(body.filter(r => r.some(c => c !== '')));
    setMapping({
      fecha: guessColumn(head, FIELDS[0].guesses),
      descripcion: guessColumn(head, FIELDS[1].guesses),
      monto: guessColumn(head, FIELDS[2].guesses),
      categoria: guessColumn(head, FIELDS[3].guesses),
    });
  };

  // Filas mapeadas + validadas, listas para previsualizar/importar.
  const mapped = rows.map((r, i) => {
    const fechaRaw = mapping.fecha !== '' ? r[mapping.fecha] : null;
    const montoRaw = mapping.monto !== '' ? r[mapping.monto] : null;
    const descripcion = mapping.descripcion !== '' ? String(r[mapping.descripcion] ?? '').trim() : '';
    const categoriaRaw = mapping.categoria !== '' ? String(r[mapping.categoria] ?? '').toLowerCase().trim() : '';
    const categoria = CATEGORIES.find(c => c.value === categoriaRaw || c.label.toLowerCase() === categoriaRaw)?.value || 'otros';
    const fecha = parseFecha(fechaRaw);
    const monto = parseMonto(montoRaw);
    const errors = [];
    if (!fecha) errors.push('fecha inválida');
    if (!descripcion) errors.push('sin descripción');
    if (!monto || monto <= 0 || isNaN(monto)) errors.push('monto inválido');
    return { rowIndex: i, fecha, descripcion, monto, categoria, errors, valid: errors.length === 0 };
  });

  const validCount = mapped.filter(m => m.valid).length;
  const canImport = mapping.fecha !== '' && mapping.descripcion !== '' && mapping.monto !== '' && validCount > 0;

  const handleImport = async () => {
    const toImport = mapped.filter(m => m.valid);
    setImporting(true);
    setProgress({ done: 0, total: toImport.length });
    let ok = 0;
    const errors = [];
    // Secuencial (no Promise.all): igual que "Pagar corte", muchas escrituras
    // en paralelo contra la misma tarjeta pueden pisarse en el cupo.
    for (const row of toImport) {
      try {
        await CreditCardService.createPurchase(id, {
          descripcion: row.descripcion,
          montoTotal: row.monto,
          numeroCuotas: 1,
          fechaCompra: row.fecha,
          categoria: row.categoria,
        });
        ok++;
      } catch (err) {
        errors.push(`${row.descripcion}: ${err.response?.data?.message || 'error desconocido'}`);
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setImporting(false);
    setResult({ ok, fail: errors.length, errors });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Importar movimientos"
        subtitle="Sube el extracto de tu banco (CSV o Excel) y mapea las columnas"
        back={<button onClick={() => navigate(`/credit-cards/${id}/purchases`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>}
      />

      {result ? (
        <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
          {result.fail === 0 ? (
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)', marginBottom: 12 }} />
          ) : (
            <AlertTriangle size={40} style={{ color: 'var(--color-warning)', marginBottom: 12 }} />
          )}
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            {result.ok} compra{result.ok !== 1 ? 's' : ''} importada{result.ok !== 1 ? 's' : ''}
            {result.fail > 0 && `, ${result.fail} con error`}
          </p>
          {result.errors.length > 0 && (
            <div style={{ textAlign: 'left', maxWidth: 480, margin: '1rem auto 0', fontSize: 12.5, color: 'var(--color-text-muted)' }}>
              {result.errors.slice(0, 10).map((e, i) => <p key={i} style={{ margin: '2px 0' }}>• {e}</p>)}
            </div>
          )}
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => navigate(`/credit-cards/${id}/purchases`)}>
            Ver compras
          </button>
        </div>
      ) : !headers.length ? (
        <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <FileSpreadsheet size={32} style={{ color: 'var(--brand-600)', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Sube tu extracto</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            Acepta .csv, .xlsx y .xls — cualquier formato de columnas, las mapeas en el siguiente paso.
          </p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Elegir archivo
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              <FileSpreadsheet size={13} style={{ verticalAlign: -2 }} /> {fileName} · {rows.length} fila{rows.length !== 1 ? 's' : ''} detectada{rows.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {FIELDS.map(f => (
                <div className="form-group" key={f.key} style={{ marginBottom: 0 }}>
                  <label className="form-label">{f.label}{f.required && ' *'}</label>
                  <select
                    className="form-input"
                    value={mapping[f.key]}
                    onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                  >
                    <option value="">-- No mapear --</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Vista previa</h3>
              <span style={{ fontSize: 12, color: validCount === rows.length ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {validCount} de {rows.length} filas listas para importar
              </span>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '4px 8px' }}></th>
                    <th style={{ padding: '4px 8px' }}>Fecha</th>
                    <th style={{ padding: '4px 8px' }}>Descripción</th>
                    <th style={{ padding: '4px 8px' }}>Monto</th>
                    <th style={{ padding: '4px 8px' }}>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 15).map(m => (
                    <tr key={m.rowIndex} style={{ borderTop: '1px solid var(--color-border)', opacity: m.valid ? 1 : 0.6 }}>
                      <td style={{ padding: '4px 8px' }}>
                        {m.valid ? <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} /> : <XCircle size={13} style={{ color: 'var(--color-danger)' }} />}
                      </td>
                      <td style={{ padding: '4px 8px' }}>{m.fecha || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{m.descripcion || '—'}</td>
                      <td className="tabular" style={{ padding: '4px 8px' }}>{isNaN(m.monto) ? '—' : fmt(m.monto)}</td>
                      <td style={{ padding: '4px 8px' }}>{m.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mapped.length > 15 && (
                <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: '6px 8px' }}>
                  y {mapped.length - 15} fila{mapped.length - 15 !== 1 ? 's' : ''} más…
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setHeaders([]); setRows([]); }}>Elegir otro archivo</button>
            <button className="btn btn-primary" disabled={!canImport || importing} onClick={handleImport}>
              {importing ? `Importando ${progress.done}/${progress.total}…` : `Importar ${validCount} compra${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
