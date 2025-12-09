import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import customerApi from '../../../services/customerApi'
import { resolveAssetUrl } from '../../../services/apiClient'
import './NewsPage.css'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=1080&q=80'

const formatDateTime = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

const NewsDetail = () => {
  const { newsId } = useParams()
  const navigate = useNavigate()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetchDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await customerApi.getNewsDetail(newsId)
        if (!cancelled) {
          setNews(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Khong the tai tin tuc.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [newsId])

  const imageSrc = useMemo(() => {
    if (!news) return ''
    const candidate =
      (typeof news.image === 'string' && news.image.trim()) ||
      (typeof news.image_url === 'string' && news.image_url.trim())
    return candidate ? resolveAssetUrl(candidate) : FALLBACK_IMAGE
  }, [news])

  if (loading) {
    return (
      <div className="container py-5">
        <p>Dang tai noi dung tin tuc...</p>
      </div>
    )
  }

  if (error || !news) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning" role="alert">
          {error || 'Khong tim thay tin tuc.'}
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          Quay lai
        </button>
      </div>
    )
  }

  return (
    <div className="py-5">
      <div className="container">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start news-detail__header mb-4">
          <div>
            <div className="news-detail__badge mb-2">Tin tuc</div>
            <h1 className="mb-2">{news.title}</h1>
            <div className="news-detail__date">{formatDateTime(news.updated_at || news.created_at)}</div>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
              Quay lai
            </button>
            <Link className="btn btn-primary" to="/news">
              Tat ca tin tuc
            </Link>
          </div>
        </div>

        {imageSrc && (
          <div className="mb-4">
            <img src={imageSrc} alt={news.title} className="news-detail__media" />
          </div>
        )}

        <div className="news-detail__content">{news.content}</div>
      </div>
    </div>
  )
}

export default NewsDetail
