import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import customerApi from '../../../services/customerApi'
import { resolveAssetUrl } from '../../../services/apiClient'
import './NewsPage.css'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=1080&q=80'

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(value))
  } catch {
    return value
  }
}

const buildImage = (item) => {
  const candidate =
    (typeof item?.image === 'string' && item.image.trim()) ||
    (typeof item?.image_url === 'string' && item.image_url.trim())
  if (!candidate) return FALLBACK_IMAGE
  return resolveAssetUrl(candidate)
}

const clip = (text, max = 180) => {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

const NewsList = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    const fetchNews = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await customerApi.listNews({
          search: debouncedSearch || undefined
        })
        if (!cancelled) {
          setNews(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Khong the tai tin tuc. Vui long thu lai sau.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchNews()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  const headline = useMemo(() => (search ? 'Ket qua tim kiem' : 'Tin tuc moi'), [search])

  return (
    <div className="news-page">
      <section className="news-page__hero text-center">
        <div className="container">
          <h1>Ban tin FatFood</h1>
          <p>
            Doc day du cac tin tuc, uu dai va cau chuyen hau truong tu FatFood. Luon duoc cap nhat moi nhat, khong bo
            lo thong tin quan trong.
          </p>
          <div className="row justify-content-center mt-4">
            <div className="col-12 col-md-8 col-lg-6">
              <input
                type="search"
                className="form-control news-page__search"
                placeholder="Tim tin tuc theo tieu de hoac noi dung..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <div className="news-page__chip">Tin tuc</div>
              <h2 className="mt-2 mb-0">{headline}</h2>
            </div>
            <Link className="btn btn-outline-secondary" to="/">
              Ve trang chu
            </Link>
          </div>

          {loading && <div className="text-center py-5">Dang tai tin tuc...</div>}
          {error && !loading && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && !news.length && (
            <div className="text-center py-5 text-muted">
              <p className="mb-1">Chua co tin tuc phu hop.</p>
              <small>Thu tim kiem tu khoa khac hoac quay lai sau.</small>
            </div>
          )}

          <div className="row g-4">
            {news.map((item) => (
              <div key={item.news_id} className="col-12 col-md-6 col-lg-4">
                <article className="news-page__card">
                  <img src={buildImage(item)} alt={item.title} className="news-page__image" />
                  <div className="news-page__content">
                    <div className="news-page__meta">{formatDate(item.updated_at || item.created_at)}</div>
                    <h3 className="news-page__title">{item.title}</h3>
                    <p className="news-page__excerpt">{clip(item.content)}</p>
                  </div>
                  <div className="d-flex justify-content-between align-items-center px-3 pb-3 mt-auto">
                    <Link className="btn btn-sm btn-primary" to={`/news/${item.news_id}`}>
                      Doc chi tiet
                    </Link>
                    <span className="text-muted small">#{item.news_id}</span>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default NewsList
