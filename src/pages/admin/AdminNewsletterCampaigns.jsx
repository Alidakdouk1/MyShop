import { useState, useEffect, useCallback } from 'react'
import {
  getNewsletterCampaigns, createNewsletterCampaign,
  updateNewsletterCampaign, deleteNewsletterCampaign,
  sendNewsletterCampaign,
} from '../../api/newsletterApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

const STATUS = {
  draft:   { label: 'Draft',    bg: '#F3F4F6', color: '#6B7280' },
  sending: { label: 'Sending…', bg: '#DBEAFE', color: '#1D4ED8' },
  sent:    { label: 'Sent',     bg: '#DCFCE7', color: '#15803D' },
  failed:  { label: 'Failed',   bg: '#FEE2E2', color: '#991B1B' },
}

const fmtDate = (d) => d
  ? new Date(String(d).replace(' ', 'T')).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  : '—'

function StatusPill({ status }) {
  const cfg = STATUS[status] || STATUS.draft
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function emptyForm() {
  return { id: null, subject: '', body: '', cta_text: '', cta_url: '' }
}

export default function AdminNewsletterCampaigns() {
  const toast = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [subCount, setSubCount]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(null)
  const [saving, setSaving]       = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [confirmSend, setConfirmSend] = useState(null)

  const refresh = useCallback(() => {
    setLoading(true)
    getNewsletterCampaigns()
      .then(r => {
        setCampaigns(r.data.data?.campaigns || [])
        setSubCount(r.data.data?.subscriber_count || 0)
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const save = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error('Subject and body are required')
      return
    }
    setSaving(true)
    try {
      if (form.id) {
        const r = await updateNewsletterCampaign(form.id, form)
        setCampaigns(list => list.map(c => c.id === form.id ? r.data.data : c))
        toast.success('Saved')
      } else {
        const r = await createNewsletterCampaign(form)
        setCampaigns(list => [r.data.data, ...list])
        toast.success('Draft saved')
      }
      setForm(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const send = async (c) => {
    setSendingId(c.id)
    setConfirmSend(null)
    try {
      const r = await sendNewsletterCampaign(c.id)
      const d = r.data.data
      if (!d.mail_enabled) {
        toast.info(`Recorded — MAIL_ENABLED is false, no email actually delivered (${d.total} recipient${d.total === 1 ? '' : 's'}).`)
      } else if (d.failed > 0) {
        toast.error(`Sent ${d.sent}/${d.total}. ${d.failed} failed.`)
      } else {
        toast.success(`Sent to ${d.sent} subscriber${d.sent === 1 ? '' : 's'}.`)
      }
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed')
    } finally { setSendingId(null) }
  }

  const remove = async (c) => {
    if (!confirm(`Delete draft "${c.subject}"?`)) return
    try {
      await deleteNewsletterCampaign(c.id)
      setCampaigns(list => list.filter(x => x.id !== c.id))
      toast.success('Deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete')
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Newsletter Campaigns</h1>
          <p className="text-sm text-ink-tertiary mt-1">
            One-off email blasts to your <span className="font-bold text-ink">{subCount}</span> active subscriber{subCount === 1 ? '' : 's'}.
          </p>
        </div>
        <button onClick={() => setForm(emptyForm())}
          className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors">
          + New Campaign
        </button>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size="xl" /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
          <p className="text-lg font-bold text-ink">No campaigns yet.</p>
          <p className="text-sm text-ink-tertiary mt-1">Compose your first email blast to your subscriber list.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-tertiary border-b border-black/5">
                <th className="px-5 py-3">Subject</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Recipients</th>
                <th className="px-3 py-3 text-right">Sent</th>
                <th className="px-3 py-3 text-right">Failed</th>
                <th className="px-3 py-3">Sent at</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-b border-black/5 last:border-b-0 hover:bg-surface-alt/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink text-sm">{c.subject}</p>
                    <p className="text-[11px] text-ink-tertiary">Created {fmtDate(c.created_at)}</p>
                  </td>
                  <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-3 text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.recipient_count}</td>
                  <td className="px-3 py-3 text-right text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: c.sent_count > 0 ? '#15803D' : '#9C9894' }}>{c.sent_count}</td>
                  <td className="px-3 py-3 text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums', color: c.failed_count > 0 ? '#C0392B' : '#9C9894' }}>{c.failed_count}</td>
                  <td className="px-3 py-3 text-xs text-ink-tertiary">{fmtDate(c.sent_at)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {c.status === 'draft' ? (
                      <>
                        <button onClick={() => setForm({ ...c })} className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-surface-alt text-ink hover:bg-border transition-colors mr-1.5">Edit</button>
                        <button onClick={() => setConfirmSend(c)} disabled={sendingId === c.id} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50 mr-1.5">
                          {sendingId === c.id ? 'Sending…' : 'Send'}
                        </button>
                        <button onClick={() => remove(c)} className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-accent-light text-accent hover:bg-accent hover:text-white transition-colors">Delete</button>
                      </>
                    ) : (
                      <button onClick={() => setForm({ ...c, id: null })} className="text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-surface-alt text-ink hover:bg-border transition-colors">
                        Duplicate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Composer */}
      {form && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setForm(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <form onSubmit={save} className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink text-lg">{form.id ? 'Edit draft' : 'New campaign'}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-alt hover:bg-border flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
                  Subject line <span className="text-ink-tertiary font-normal lowercase tracking-normal">({form.subject.length}/200)</span>
                </label>
                <input maxLength={200} value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required
                  placeholder="🎉 Spring Sale: 20% off everything"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">
                  Body (HTML allowed)
                </label>
                <textarea rows={9} value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required
                  placeholder={'<p>Hi there,</p>\n<p>Big news — our spring collection just dropped!</p>'}
                  className="w-full text-sm font-mono rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink resize-none" />
                <p className="text-[10px] text-ink-tertiary mt-1.5">
                  Allowed tags: <code className="bg-surface-alt px-1 rounded">p br strong em a ul ol li h1-h3 img blockquote</code>. Scripts and inline event handlers are stripped automatically.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">CTA button text (optional)</label>
                  <input maxLength={80} value={form.cta_text || ''}
                    onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                    placeholder="Shop now"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block mb-1.5">CTA button URL</label>
                  <input type="url" maxLength={500} value={form.cta_url || ''}
                    onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                    placeholder="https://yourshop.com/shop"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-white text-ink focus:border-ink" />
                </div>
              </div>

              {/* Live preview */}
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">Preview</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-ink text-white text-center py-4">
                    <h1 className="text-lg font-bold m-0">Pick&amp;Go LB</h1>
                  </div>
                  <div className="bg-white p-5 text-sm text-ink-secondary leading-relaxed">
                    <p className="font-bold text-ink text-base mb-3">{form.subject || 'Subject preview'}</p>
                    <div dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:#9C9894">Body preview…</p>' }} />
                    {form.cta_text && form.cta_url && (
                      <p className="text-center my-6">
                        <a href={form.cta_url} target="_blank" rel="noopener noreferrer"
                          className="inline-block bg-ink text-white font-bold px-7 py-3 rounded-lg no-underline">
                          {form.cta_text}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-5 border-t border-border">
              <button type="button" onClick={() => setForm(null)} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-surface-alt text-ink hover:bg-border transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Send confirmation — one-way action, surface it clearly */}
      {confirmSend && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmSend(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" style={{ animation: 'pop-in 0.22s var(--ease-out-back)' }}>
            <h2 className="font-bold text-ink text-lg mb-2">Send this campaign?</h2>
            <p className="text-sm text-ink-secondary mb-4">
              "<span className="font-semibold text-ink">{confirmSend.subject}</span>" will be emailed to <span className="font-bold text-ink">{subCount}</span> subscriber{subCount === 1 ? '' : 's'}. This can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmSend(null)} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-surface-alt text-ink hover:bg-border transition-colors">
                Cancel
              </button>
              <button onClick={() => send(confirmSend)} className="text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors">
                Send now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
