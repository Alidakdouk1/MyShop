// Shared marketplace constants + helpers.

export const AD_CATEGORIES = [
  'Phones & Tablets',
  'Electronics',
  'Computers',
  'Fashion',
  'Home & Garden',
  'Vehicles',
  'Furniture',
  'Sports & Hobbies',
  'Baby & Kids',
  'Jobs',
  'Services',
  'Other',
]

export const AD_CONDITIONS = [
  { value: 'new',      label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good',     label: 'Good' },
  { value: 'fair',     label: 'Fair' },
  { value: 'used',     label: 'Used' },
]

export const conditionLabel = (v) =>
  AD_CONDITIONS.find(c => c.value === v)?.label || 'Good'

export const REPORT_REASONS = [
  { value: 'spam',           label: 'Spam or duplicate' },
  { value: 'scam',           label: 'Scam / fraud' },
  { value: 'prohibited',     label: 'Prohibited item' },
  { value: 'offensive',      label: 'Offensive content' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'other',          label: 'Something else' },
]

export const STATUS_STYLE = {
  pending:  { bg: '#FEF9EC', color: '#B8922E', label: 'Pending review' },
  approved: { bg: '#F0FDF4', color: '#16A34A', label: 'Live' },
  rejected: { bg: '#FEF2F2', color: '#C0392B', label: 'Rejected' },
  sold:     { bg: '#F4F4F4', color: '#9C9894', label: 'Sold' },
}
