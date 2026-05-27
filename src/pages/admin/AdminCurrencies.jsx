import { useState, useEffect, useCallback } from 'react'
import { getAdminCurrencies, createCurrency, updateCurrency, deleteCurrency } from '../../api/currencyApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

export default function AdminCurrencies() {
  const toast = useToast()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', name: '', symbol: '', rate: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getAdminCurrencies()
      .then(r => setRows(r.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const patch = (id, data) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...data } : r))
  }

  const saveRow = async (row) => {
    try {
      await updateCurrency(row.id, { name: row.name, symbol: row.symbol, rate: Number(row.rate), is_enabled: row.is_enabled ? 1 : 0 })
      toast.success(`${row.code} updated`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update')
      load()
    }
  }

  const toggleEnabled = async (row) => {
    const next = row.is_enabled ? 0 : 1
    patch(row.id, { is_enabled: next })
    try { await updateCurrency(row.id, { is_enabled: next }) }
    catch { toast.error('Could not update'); load() }
  }

  const remove = async (row) => {
    if (row.is_default) return toast.error('Cannot delete the default currency')
    if (!confirm(`Delete ${row.code}?`)) return
    try {
      await deleteCurrency(row.id)
      setRows(rs => rs.filter(r => r.id !== row.id))
      toast.success(`${row.code} deleted`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete')
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (!/^[A-Za-z]{3}$/.test(form.code.trim())) return toast.error('Code must be 3 letters (e.g. CAD)')
    if (!form.name.trim() || !form.symbol.trim()) return toast.error('Name and symbol are required')
    if (!(Number(form.rate) > 0)) return toast.error('Rate must be greater than 0')
    setSaving(true)
    try {
      await createCurrency({ code: form.code.trim().toUpperCase(), name: form.name.trim(), symbol: form.symbol.trim(), rate: Number(form.rate) })
      toast.success('Currency added')
      setForm({ code: '', name: '', symbol: '', rate: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add currency')
    } finally { setSaving(false) }
  }

  const field = 'text-sm rounded-lg px-2.5 py-1.5 outline-none border border-border bg-white text-ink focus:border-ink transition-colors'

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">Currencies</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Set display rates relative to <span className="font-semibold">USD</span> (the base). A rate of 0.92 means 1 USD = 0.92 of that currency.
          Conversion is for display only — orders are recorded and charged in USD.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {['Code', 'Name', 'Symbol', 'Rate (per 1 USD)', 'Enabled', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold tracking-wider uppercase text-ink-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-ink">{r.code}</span>
                    {!!r.is_default && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(15,15,15,0.08)', color: '#0F0F0F' }}>Base</span>}
                  </td>
                  <td className="px-4 py-3">
                    <input className={`${field} w-32`} value={r.name} onChange={e => patch(r.id, { name: e.target.value })} onBlur={() => saveRow(r)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={`${field} w-14 text-center`} value={r.symbol} onChange={e => patch(r.id, { symbol: e.target.value })} onBlur={() => saveRow(r)} />
                  </td>
                  <td className="px-4 py-3">
                    {r.is_default ? (
                      <span className="text-ink-tertiary">1.000000</span>
                    ) : (
                      <input type="number" step="0.0001" min="0" className={`${field} w-28`} value={r.rate}
                        onChange={e => patch(r.id, { rate: e.target.value })} onBlur={() => saveRow(r)} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEnabled(r)}
                      disabled={!!r.is_default}
                      className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors disabled:opacity-50"
                      style={{ background: r.is_enabled ? '#16A34A' : '#D8D4CC' }}
                      aria-label="Toggle enabled"
                    >
                      <span className="inline-block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: r.is_enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!r.is_default && (
                      <button onClick={() => remove(r)} className="text-ink-tertiary hover:text-accent transition-colors p-1" aria-label="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add currency */}
      <form onSubmit={add} className="bg-white rounded-2xl border border-black/5 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-tertiary mb-3">Add a Currency</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1">Code</label>
            <input className={`${field} w-20`} placeholder="CAD" maxLength={3} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1">Name</label>
            <input className={`${field} w-40`} placeholder="Canadian Dollar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1">Symbol</label>
            <input className={`${field} w-16 text-center`} placeholder="$" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1">Rate (per 1 USD)</label>
            <input type="number" step="0.0001" min="0" className={`${field} w-28`} placeholder="1.35" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving} className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-60" style={{ background: '#0F0F0F' }}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
