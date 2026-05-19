import Hero3ColSection        from './sections/Hero3ColSection'
import CategoryCirclesSection from './sections/CategoryCirclesSection'
import ProductGridSection     from './sections/ProductGridSection'
import PromoBannersSection    from './sections/PromoBannersSection'
import TrustBadgesSection     from './sections/TrustBadgesSection'
import TextSection            from './sections/TextSection'
import ImageTextSection       from './sections/ImageTextSection'
import CustomBannerSection    from './sections/CustomBannerSection'
import OfferSection           from './sections/OfferSection'

const SECTION_MAP = {
  hero_3col:        Hero3ColSection,
  category_circles: CategoryCirclesSection,
  product_grid:     ProductGridSection,
  promo_banners:    PromoBannersSection,
  trust_badges:     TrustBadgesSection,
  text_section:     TextSection,
  image_text:       ImageTextSection,
  custom_banner:    CustomBannerSection,
  offer_section:    OfferSection,
}

export default function SectionRenderer({ section, products, categories, loading }) {
  const Component = SECTION_MAP[section.type]
  if (!Component) return null

  const outerStyle = {}
  if (section.styles?.padding_top)    outerStyle.paddingTop    = `${section.styles.padding_top}px`
  if (section.styles?.padding_bottom) outerStyle.paddingBottom = `${section.styles.padding_bottom}px`
  if (section.styles?.bg_override)    outerStyle.background    = section.styles.bg_override

  return (
    <div style={Object.keys(outerStyle).length ? outerStyle : undefined}>
      <Component
        data={section.section_data || {}}
        styles={section.styles}
        products={products}
        categories={categories}
        loading={loading}
      />
    </div>
  )
}
