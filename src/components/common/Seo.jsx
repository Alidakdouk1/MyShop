// Per-page SEO using React 19's native document metadata: rendering <title>,
// <meta> and <link> anywhere hoists them into <head>. JSON-LD is emitted as a
// script tag (valid anywhere in the document for crawlers).

const SITE = 'MyShop'
const DEFAULT_DESC =
  'Shop curated fashion, electronics, beauty and more at MyShop — premium products, fast shipping and easy returns.'

export default function Seo({
  title,
  description = DEFAULT_DESC,
  image,
  type = 'website',
  canonical,
  jsonLd,
}) {
  const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — Modern Online Store`

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonical && <meta property="og:url" content={canonical} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  )
}
