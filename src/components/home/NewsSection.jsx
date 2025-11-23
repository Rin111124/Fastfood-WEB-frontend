import { useCallback, useEffect, useState } from 'react'
import { resolveAssetUrl } from '../../services/apiClient'
import customerApi from '../../services/customerApi'
import Spinner from '../common/Spinner'

const NewsSection = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchNews = useCallback(
    async (searchValue) => {
      try {
        setLoading(true)
        setError(null)
        const data = await customerApi.listNews({
          limit: 6,
          search: searchValue ? searchValue : undefined
        })
        setNews(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Khong the tai tin tuc. Vui long thu lai sau.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchNews(debouncedSearch)
  }, [fetchNews, debouncedSearch])

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner label="Dang tai tin tuc..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center" role="alert">
        {error}
      </div>
    )
  }

  if (!news.length) {
    return (
      <>
        <div className="mb-3">
          <input
            type="search"
            className="form-control"
            placeholder="Tim kiem tin tuc..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="text-center text-muted py-4">Chua co tin tuc moi.</div>
      </>
    )
  }

  return (
    <>
      <div className="mb-3">
        <input
          type="search"
          className="form-control"
          placeholder="Tim kiem tin tuc..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
      <div className="row g-4">
        {news.map((item) => (
          <div key={item.news_id} className="col-12 col-md-6 col-lg-4">
            <div className="card h-100 border-0 shadow-sm">
              {item.image_url && (
                <img
                  src={resolveAssetUrl(item.image_url)}
                  className="card-img-top"
                  alt={item.title}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
              )}
              <div className="card-body">
                <h5 className="card-title">{item.title}</h5>
                <p className="card-text text-muted" style={{ whiteSpace: 'pre-line' }}>
                  {item.content}
                </p>
              </div>
              <div className="card-footer bg-white border-top-0 text-end">
                <small className="text-muted">
                  {new Date(item.created_at).toLocaleDateString('vi-VN')}
                </small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default NewsSection
