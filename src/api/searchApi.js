import api from './axios'

// POST a multipart "image" file. Backend forwards it to Google Cloud Vision
// (LABEL_DETECTION + OBJECT_LOCALIZATION), then matches the returned labels
// against the active product catalogue and returns up to 24 hits.
//
// Response shape: { data: { labels: string[], products: Product[] }, message }
export const searchByImage = (file) => {
  const fd = new FormData()
  fd.append('image', file)
  return api.post('/search/by-image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
}
