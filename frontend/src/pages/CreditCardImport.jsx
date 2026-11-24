import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Swal from '../utils/alerts';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { CreditCardService } from '../services/creditCardService';
import { FormHeader } from '../components/ui/FormLayout';
import { fmt } from '../utils/format';
import { CATEGORIES } from '../utils/creditCard';
import { parseCSV, parseFecha, parseMonto } from '../utils/csvImport';

const FIELDS = [
  { key: 'fecha', label: 'Fecha de compra', required: true, guesses: ['fecha', 'date', 'fecha de compra', 'fecha transaccion', 'fecha transacción'] },
  { key: 'descripcion', label: 'Descripción', required: true, guesses: ['descripcion', 'descripción', 'detalle', 'description', 'comercio', 'concepto'] },
  { key: 'monto', label: 'Monto', required: true, guesses: ['monto', 'valor', 'amount', 'valor original', 'total'] },
  { key: 'categoria', label: 'Categoría (opcional)', required: false, guesses: ['categoria', 'categoría', 'category'] },
];


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
    <div className="animate-fade-in form-page">
      <FormHeader
        crumbs={[{ to: '/credit-cards', label: 'Tarjetas' }, { to: `/credit-cards/${id}`, label: 'Tarjeta' }, { label: 'Importar extracto' }]}
        title="Importar extracto"
        subtitle="Sube el extracto de tu banco (CSV o Excel) y elige qué columna es cada dato."
        onBack={() => navigate(`/credit-cards/${id}/purchases`)}
      />

      {result ? (
        <div className="card empty-state">
          {result.fail === 0 ? (
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)', marginBottom: 12 }} />
          ) : (
            <AlertTriangle size={40} style={{ color: 'var(--color-warning)', marginBottom: 12 }} />
          )}
          <p className="empty-state-title">
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
        <div className="card upload-zone">
          <span className="empty-state-icon"><FileSpreadsheet size={24} /></span>
          <p className="empty-state-title">Sube tu extracto</p>
          <p className="text-secondary" style={{ fontSize: 14, margin: '0 0 16px', maxWidth: 420 }}>
            Acepta .csv, .xlsx y .xls con cualquier orden de columnas: en el siguiente paso eliges cuál es cada dato.
          </p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Elegir archivo
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 className="card-title">Columnas</h2>
            <p className="form-section-desc" style={{ marginBottom: 16 }}>
              <FileSpreadsheet size={14} style={{ verticalAlign: -2 }} /> {fileName} · {rows.length} fila{rows.length !== 1 ? 's' : ''} detectada{rows.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {FIELDS.map(f => (
                <div className="form-group" key={f.key} style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor={`map-${f.key}`}>{f.label}</label>
                  <select
                    id={`map-${f.key}`}
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

          <div className="card card-flush" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">Vista previa</h2>
              <span className={`text-sm ${validCount === rows.length ? 'text-success' : 'text-warning'}`} style={{ fontWeight: 600 }}>
                {validCount} de {rows.length} filas listas para importar
              </span>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="cc-table">
                <thead>
                  <tr>
                    <th aria-label="Estado"></th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 15).map(m => (
                    <tr key={m.rowIndex} style={{ opacity: m.valid ? 1 : 0.6 }}>
                      <td style={{ width: 40 }}>
                        {m.valid ? <CheckCircle2 size={16} className="text-success" aria-label="Lista" /> : <XCircle size={16} className="text-danger" aria-label="Con error" />}
                      </td>
                      <td className="n">{m.fecha || '—'}</td>
                      <td>{m.descripcion || '—'}</td>
                      <td className="n" style={{ textAlign: 'right' }}>{isNaN(m.monto) ? '—' : fmt(m.monto)}</td>
                      <td className="text-secondary">{m.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mapped.length > 15 && (
                <p className="text-sm text-muted" style={{ margin: 0, padding: '12px 20px' }}>
                  y {mapped.length - 15} fila{mapped.length - 15 !== 1 ? 's' : ''} más…
                </p>
              )}
            </div>
          </div>

          <div className="form-actions">
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
