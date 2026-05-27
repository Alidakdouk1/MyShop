import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAdminQuestions, answerQuestion, deleteQuestion } from '../../api/questionApi'
import { useToast } from '../../hooks/useToast'
import Spinner from '../../components/ui/Spinner'

function QuestionCard({ q, onAnswered, onDeleted }) {
  const toast = useToast()
  const [draft, setDraft]   = useState(q.answer || '')
  const [editing, setEditing] = useState(!q.answer)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (draft.trim().length < 1) { toast.error('Answer cannot be empty'); return }
    setSaving(true)
    try {
      const { data } = await answerQuestion(q.id, draft.trim())
      toast.success('Answer posted')
      setEditing(false)
      onAnswered(data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save answer')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm('Delete this question?')) return
    try {
      await deleteQuestion(q.id)
      toast.success('Question deleted')
      onDeleted(q.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            to={q.product_slug ? `/products/${q.product_slug}` : '#'}
            className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary hover:text-ink transition-colors"
          >
            {q.product_name || 'Product'}
          </Link>
          <p className="text-sm font-semibold text-ink mt-1 leading-snug">{q.question}</p>
          <p className="text-xs text-ink-tertiary mt-1">
            {q.asker_name} · {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {q.answer ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              Answered
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: '#FFFBEB', color: '#B8922E' }}>
              Unanswered
            </span>
          )}
          <button onClick={remove} aria-label="Delete" className="text-ink-tertiary hover:text-accent transition-colors p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Answer area */}
      <div className="mt-4 pt-4 border-t border-black/5">
        {q.answer && !editing ? (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-ink-secondary leading-relaxed flex-1">{q.answer}</p>
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-ink-tertiary hover:text-ink transition-colors shrink-0">
              Edit
            </button>
          </div>
        ) : (
          <div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              placeholder="Write your answer…"
              className="w-full text-sm rounded-xl p-3 outline-none border border-border bg-white text-ink focus:border-ink transition-colors"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={save}
                disabled={saving}
                className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-60"
                style={{ background: '#0F0F0F' }}
              >
                {saving ? 'Saving…' : q.answer ? 'Update Answer' : 'Post Answer'}
              </button>
              {q.answer && (
                <button onClick={() => { setEditing(false); setDraft(q.answer) }} className="text-sm font-semibold px-4 py-2 rounded-xl text-ink-tertiary">
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminQuestions() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all') // 'all' | 'unanswered'

  const load = useCallback(() => {
    setLoading(true)
    getAdminQuestions(filter === 'unanswered' ? { status: 'unanswered' } : {})
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  const onAnswered = (updated) => setItems(list => list.map(x => x.id === updated.id ? { ...x, ...updated } : x))
  const onDeleted  = (id)      => setItems(list => list.filter(x => x.id !== id))

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">Product Q&amp;A</h1>
          <p className="text-sm text-ink-tertiary mt-1">Answer customer questions — answers appear on the product page.</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-black/5">
          {['all', 'unanswered'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors ${
                filter === f ? 'bg-ink text-white' : 'text-ink-tertiary hover:text-ink'
              }`}
            >
              {f === 'all' ? 'All' : 'Unanswered'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner size="xl" className="text-ink-tertiary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 py-16 text-center">
          <p className="text-ink-secondary font-semibold">No questions {filter === 'unanswered' ? 'awaiting an answer' : 'yet'}.</p>
          <p className="text-sm text-ink-tertiary mt-1">Customer questions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(q => (
            <QuestionCard key={q.id} q={q} onAnswered={onAnswered} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  )
}
