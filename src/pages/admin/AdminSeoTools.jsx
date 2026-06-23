import { useEffect, useState } from 'react'
import { getSeoStats } from '../../api/adminApi'
import Spinner from '../../components/ui/Spinner'

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-black/5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">{label}</p>
      <p className="text-2xl font-black text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

function CodeBox({ children }) {
  return (
    <pre className="bg-ink text-white text-[12px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed">
      {children}
    </pre>
  )
}

export default function AdminSeoTools() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    getSeoStats()
      .then(r => setStats(r.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const copy = async (label, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="xl" /></div>
  if (!stats)  return <div className="p-10 text-center text-ink-tertiary">Could not load stats.</div>

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink tracking-tight">SEO Tools</h1>
        <p className="text-sm text-ink-tertiary mt-1">
          Auto-generated sitemap.xml and robots.txt. Updates in real time — no manual regen needed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total URLs"     value={stats.total_urls} />
        <StatCard label="Product pages"  value={stats.product_urls} />
        <StatCard label="Category pages" value={stats.category_urls} />
        <StatCard label="Static pages"   value={stats.static_urls} />
      </div>

      {/* Live links */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
        <h2 className="font-bold text-ink mb-4">Live endpoints</h2>
        <div className="space-y-3">
          <LinkRow label="sitemap.xml (backend, always works)"
            url={stats.sitemap_backend} copied={copied === 'sitemap_be'}
            onCopy={() => copy('sitemap_be', stats.sitemap_backend)} />
          <LinkRow label="robots.txt (backend, always works)"
            url={stats.robots_backend} copied={copied === 'robots_be'}
            onCopy={() => copy('robots_be', stats.robots_backend)} />
          <hr className="border-border" />
          <LinkRow label="sitemap.xml (front-end URL — needs rewrite below)"
            url={stats.sitemap_url} copied={copied === 'sitemap_fe'}
            onCopy={() => copy('sitemap_fe', stats.sitemap_url)} muted />
          <LinkRow label="robots.txt (front-end URL — needs rewrite below)"
            url={stats.robots_url} copied={copied === 'robots_fe'}
            onCopy={() => copy('robots_fe', stats.robots_url)} muted />
        </div>
      </div>

      {/* What's in the sitemap */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
        <h2 className="font-bold text-ink mb-2">What's included</h2>
        <ul className="text-sm text-ink-secondary space-y-1.5 list-disc pl-5">
          <li>Homepage + Shop landing</li>
          <li>Every category (parents + subcategories)</li>
          <li>Every active product, with its primary image (helps Google Images index your photos)</li>
          <li>Per-URL <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">lastmod</code>, <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">changefreq</code>, and <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">priority</code></li>
          <li>Drafts, inactive products, and admin pages are excluded</li>
        </ul>
      </div>

      {/* Production setup */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
        <h2 className="font-bold text-ink mb-2">Production setup</h2>
        <p className="text-sm text-ink-secondary mb-3">
          Google looks for <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">/sitemap.xml</code> at your domain root, not inside <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">/backend/</code>. Add this snippet to the <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">.htaccess</code> at your domain's web root so the two short URLs forward to the backend:
        </p>
        <CodeBox>{`# Forward the standard SEO files to the backend handlers
RewriteEngine On
RewriteRule ^sitemap\\.xml$ /backend/sitemap.xml [L]
RewriteRule ^robots\\.txt$  /backend/robots.txt  [L]`}</CodeBox>
        <p className="text-xs text-ink-tertiary mt-3">
          On Hostinger this goes in <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">public_html/.htaccess</code>. Once added, <code className="text-xs bg-surface-alt px-1.5 py-0.5 rounded">{stats.sitemap_url}</code> will return real XML.
        </p>
      </div>

      {/* Submit to Google */}
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <h2 className="font-bold text-ink mb-2">Submit to Google</h2>
        <p className="text-sm text-ink-secondary mb-4">
          One-time step. Add your domain in Search Console, then paste your sitemap URL.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-ink text-white hover:bg-ink/90 transition-colors inline-flex items-center gap-2">
            Open Google Search Console
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
          <a href={stats.sitemap_backend} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-white border border-border text-ink hover:bg-surface-alt transition-colors">
            Preview Sitemap
          </a>
        </div>
      </div>
    </div>
  )
}

function LinkRow({ label, url, copied, onCopy, muted }) {
  return (
    <div className="flex items-center gap-3" style={{ opacity: muted ? 0.7 : 1 }}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">{label}</p>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-xs font-mono text-ink hover:underline break-all">{url}</a>
      </div>
      <button onClick={onCopy}
        className="text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-surface-alt text-ink hover:bg-border transition-colors shrink-0">
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}
