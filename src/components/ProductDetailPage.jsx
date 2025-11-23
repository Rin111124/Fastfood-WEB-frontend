import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import customerApi from '../services/customerApi'
import { resolveAssetUrl } from '../services/apiClient'
import { formatCurrency, formatDateTime } from '../utils/format'
import { clearSession, readSession } from '../lib/session'
import LandingTopbar from './LandingTopbar'
import LandingSidebar from './LandingSidebar'
import '../styles/MenuPage.css'
import './LandingPage.css'

const FALLBACK_CARD_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f3f4f6"/><path d="M140 222h120a12 12 0 0 0 9.9-18.9l-60-90a12 12 0 0 0-19.8 0l-60 90A12 12 0 0 0 140 222zm60-120a30 30 0 1 0 0-60 30 30 0 0 0 0 60z" fill="#d0d5dd"/></svg>'
)}`
const FALLBACK_REMOTE_IMAGE =
  'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=1080&q=80'

const PRODUCT_REVIEW_STORAGE_KEY = 'ff_product_reviews'

const buildImageSrc = (product) => {
  if (!product) return FALLBACK_CARD_IMAGE
  const candidate = product.image || product.image_url
  if (typeof candidate === 'string' && candidate.trim().length) {
    return candidate.startsWith('data:') ? candidate : resolveAssetUrl(candidate)
  }
  return FALLBACK_CARD_IMAGE
}

const resolveHeroImage = (product) => {
  const resolved = buildImageSrc(product)
  return resolved === FALLBACK_CARD_IMAGE ? FALLBACK_REMOTE_IMAGE : resolved
}

const normalizeProductId = (value) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const matchProduct = (candidate, productId) => {
  if (!candidate) return false
  const idsToCheck = [
    candidate.product_id,
    candidate.id,
    candidate.slug,
    candidate.name
  ]
  return idsToCheck.some((item) => normalizeProductId(item) === normalizeProductId(productId))
}

const readStoredReviews = (productKey) => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PRODUCT_REVIEW_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const reviews = parsed?.[productKey]
    return Array.isArray(reviews) ? reviews : []
  } catch (error) {
    console.warn('Failed to read stored reviews', error)
    return []
  }
}

const persistReviews = (productKey, reviews) => {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(PRODUCT_REVIEW_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed[productKey] = reviews
    window.localStorage.setItem(PRODUCT_REVIEW_STORAGE_KEY, JSON.stringify(parsed))
  } catch (error) {
    console.warn('Failed to persist reviews', error)
  }
}

const ProductDetailPage = () => {
  const { productId: productParam = '' } = useParams()
  const decodedProductParam = decodeURIComponent(productParam)
  const reviewStorageKey = useMemo(
    () => `product-${normalizeProductId(decodedProductParam).toLowerCase()}`,
    [decodedProductParam]
  )

  const location = useLocation()
  const navigate = useNavigate()

  const [session, setSession] = useState(() => readSession())
  const [product, setProduct] = useState(() => location.state?.product || null)
  const [loading, setLoading] = useState(() => !location.state?.product)
  const [error, setError] = useState('')
  const [orderFeedback, setOrderFeedback] = useState('')
  const [reviews, setReviews] = useState(() => readStoredReviews(reviewStorageKey))
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const handleQty = (type) =>
    setQty((prev) => Math.max(1, type === 'inc' ? prev + 1 : prev - 1))

  useEffect(() => {
    setSession(readSession())
  }, [location])

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('landing-sidebar-open')
    } else {
      document.body.classList.remove('landing-sidebar-open')
    }
    return () => document.body.classList.remove('landing-sidebar-open')
  }, [isSidebarOpen])

  useEffect(() => {
    const productFromState = location.state?.product
    if (!productFromState) return
    if (matchProduct(productFromState, decodedProductParam)) {
      if (!matchProduct(product, decodedProductParam)) {
        setProduct(productFromState)
      }
      setLoading(false)
      setError('')
    }
  }, [location.state, decodedProductParam, product])

  useEffect(() => {
    const handleStorageChange = () => {
      setSession(readSession())
      setReviews(readStoredReviews(reviewStorageKey))
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [reviewStorageKey])

  useEffect(() => {
    setReviews(readStoredReviews(reviewStorageKey))
  }, [reviewStorageKey])

  useEffect(() => {
    if (product && matchProduct(product, decodedProductParam)) {
      return
    }

    let cancelled = false

    const fetchProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await customerApi.listProducts()
        if (cancelled) return
        const matched = Array.isArray(data)
          ? data.find((item) => matchProduct(item, decodedProductParam))
          : null
        if (matched) {
          setProduct(matched)
        } else {
          setError('Khong tim thay mon an ban yeu cau.')
        }
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'Khong the tai thong tin mon an. Vui long thu lai.')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchProduct()

    return () => {
      cancelled = true
    }
  }, [decodedProductParam, product])

  const isAuthenticated = Boolean(session?.token && session?.user)
  const customerName =
    session?.user?.name || session?.user?.full_name || session?.user?.username || 'Khach hang'

  const handleLogout = () => {
    clearSession()
    setSession(null)
    navigate('/login', { replace: true })
  }

  const handleOrderClick = () => {
    if (!product) return
    if (!isAuthenticated) {
      navigate('/login', {
        replace: false,
        state: { returnTo: `/menu/${encodeURIComponent(decodedProductParam)}` }
      })
      return
    }
    setOrderFeedback('Chuc nang dat mon se duoc tich hop trong phien ban tiep theo.')
    window.setTimeout(() => setOrderFeedback(''), 4000)
  }

  const handleReviewSubmit = (event) => {
    event.preventDefault()
    const trimmed = newReview.comment.trim()
    if (!trimmed) {
      setOrderFeedback('Vui long nhap noi dung danh gia truoc khi gui.')
      window.setTimeout(() => setOrderFeedback(''), 3000)
      return
    }
    const reviewPayload = {
      id: `${Date.now()}`,
      rating: Number(newReview.rating) || 5,
      comment: trimmed,
      author: isAuthenticated ? customerName : 'Khach hang',
      createdAt: new Date().toISOString()
    }
    setReviews((previous) => {
      const next = [reviewPayload, ...previous]
      persistReviews(reviewStorageKey, next)
      return next
    })
    setNewReview({ rating: 5, comment: '' })
  }

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0
    const sum = reviews.reduce((total, review) => total + Number(review.rating || 0), 0)
    return Math.round((sum / reviews.length + Number.EPSILON) * 10) / 10
  }, [reviews])

  const sidebarLinks = useMemo(() => {
    const links = [
      { label: 'Trang chu', to: '/' },
      { label: 'Thuc don', to: '/menu' },
      { label: 'Gio hang', to: '/cart' }
    ]
    if (isAuthenticated) {
      links.push({ label: 'Trung tam cua toi', to: '/customer' })
    } else {
      links.push({ label: 'Dang nhap', to: '/login' })
      links.push({ label: 'Dang ky', to: '/signup' })
    }
    return links
  }, [isAuthenticated])

  const handleSidebarOpen = () => setIsSidebarOpen(true)
  const handleSidebarClose = () => setIsSidebarOpen(false)

  const heroImage = resolveHeroImage(product)
  const cardImage = buildImageSrc(product)
  const galleryImages = useMemo(() => {
    if (!product) return []
    const list = [resolveHeroImage(product), buildImageSrc(product)].filter(Boolean)
    const uniq = []
    list.forEach((src) => {
      if (src && !uniq.includes(src)) uniq.push(src)
    })
    return uniq
  }, [product])
  const [activeIdx, setActiveIdx] = useState(0)
  useEffect(() => {
    setActiveIdx(0)
  }, [galleryImages.length])

  const handleAddToCart = async () => {
    if (!product) return
    if (!isAuthenticated) {
      navigate('/login', { replace: false, state: { returnTo: `/menu/${encodeURIComponent(decodedProductParam)}` } })
      return
    }
    try {
      const productId = product.product_id || product.id
      await customerApi.addToCart({ productId, quantity: qty })
      setOrderFeedback('Da them vao gio hang!')
    } catch (err) {
      setOrderFeedback(err?.message || 'Khong the them vao gio. Vui long thu lai.')
    } finally {
      window.setTimeout(() => setOrderFeedback(''), 2500)
    }
  }

  return (
    <div className="landing-new menu-page product-detail-page">
      <LandingSidebar open={isSidebarOpen} onClose={handleSidebarClose} links={sidebarLinks} />
      <header className="landing-new__hero landing-new__hero--menu" id="top">
        <LandingTopbar
          isAuthenticated={isAuthenticated}
          customerName={customerName}
          onLogout={handleLogout}
          isSticky
          showSidebarToggle
          onSidebarToggle={handleSidebarOpen}
        />

        <div className="container product-detail__hero row align-items-center g-4 g-lg-5">
          <div className="product-detail__hero-content col-12 col-lg-6">
            <span className="landing-new__hero-eyebrow">Chi tiet mon an</span>
            <h1 className="landing-new__hero-title">
              {product ? product.name : loading ? 'Dang tai...' : 'Khong tim thay mon an'}
            </h1>
            <p className="landing-new__hero-subtitle">
              Khai pha huong vi tuyet voi voi thuc don duoc dong bo truc tiep tu nha bep.
            </p>
            <div className="product-detail__hero-actions">
              <button
                type="button"
                className="landing-new__btn landing-new__btn--primary"
                onClick={handleOrderClick}
                disabled={!product}
              >
                Dat mon ngay
              </button>
              <Link className="landing-new__btn landing-new__btn--ghost" to="/menu">
                Quay ve thuc don
              </Link>
            </div>
            <div className="product-detail__hero-metrics">
              <div className="landing-new__hero-metric">
                <span className="landing-new__hero-metric-value">{formatCurrency(product?.price || 0)}</span>
                <span className="landing-new__hero-metric-label">Gia hien tai</span>
              </div>
              <div className="landing-new__hero-metric">
                <span className="landing-new__hero-metric-value">
                  {averageRating ? `${averageRating}/5` : 'Chua co'}
                </span>
                <span className="landing-new__hero-metric-label">Danh gia trung binh</span>
              </div>
              <div className="landing-new__hero-metric">
                <span className="landing-new__hero-metric-value">{reviews.length}</span>
                <span className="landing-new__hero-metric-label">So luong nhan xet</span>
              </div>
            </div>
          </div>

          <div className="product-detail__hero-visual col-12 col-lg-6">
            <div className="product-detail__hero-image-wrapper">
              <img
                src={heroImage}
                alt={product?.name || 'Chi tiet mon an'}
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_REMOTE_IMAGE
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="product-detail__content py-5">
        <div className="container">
          {orderFeedback && (
            <div className="alert alert-info shadow-sm" role="status">
              {orderFeedback}
            </div>
          )}

          {error && (
            <div className="alert alert-danger shadow-sm" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <div className="spinner-border text-primary" role="status" aria-live="polite">
                <span className="visually-hidden">Dang tai thong tin mon an...</span>
              </div>
            </div>
          ) : !product ? (
            <div className="text-center py-5 text-muted">
              <h2 className="h4 fw-semibold mb-3">Khong tim thay mon an</h2>
              <p>
                Co ve nhu mon an ban tim kiem da duoc cap nhat. Vui long tro lai trang{' '}
                <Link to="/menu">Thuc don</Link> de tiep tuc kham pha.
              </p>
            </div>
          ) : (
            <>
              <div className="row g-4 g-lg-5 align-items-start">
                <div className="col-12 col-lg-6 col-xl-5">
                  <article className="card shadow-sm border-0 rounded-4">
                    <div className="ratio ratio-4x3 bg-light rounded-top">
                      <img
                        src={galleryImages[activeIdx] || cardImage}
                        alt={product.name}
                        className="pd-main-img"
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_CARD_IMAGE
                        }}
                      />
                    </div>
                    {galleryImages.length > 1 && (
                      <div className="d-flex gap-2 p-3 border-top pd-thumbs">
                        {galleryImages.slice(0, 4).map((src, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className={`btn p-0 border-0 pd-thumb ${activeIdx === idx ? 'active' : ''}`}
                            onClick={() => setActiveIdx(idx)}
                            aria-label={`Xem hinh ${idx + 1}`}
                          >
                            <div className="ratio ratio-1x1 rounded overflow-hidden bg-light">
                              <img
                                src={src}
                                alt=""
                                className="pd-thumb-img"
                                onError={(event) => {
                                  event.currentTarget.src = FALLBACK_CARD_IMAGE
                                }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                </div>

                <div className="col-12 col-lg-6 col-xl-7">
                  <article className="card shadow-sm border-0 rounded-4">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h1 className="h3 mb-0">{product.name}</h1>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {product.food_type || 'Mac dinh'}
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2 text-warning mb-3">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const filled = index < Math.round(averageRating)
                          return (
                            <i
                              key={index}
                              className={`bi ${filled ? 'bi-star-fill' : 'bi-star'} `}
                              aria-hidden="true"
                            />
                          )
                        })}
                        <span className="text-muted small">({reviews.length} danh gia)</span>
                      </div>

                      <div className="fs-3 fw-bold text-primary mb-3">
                        {formatCurrency(product.price)}
                      </div>

                      <p className="text-muted">
                        {product.description || 'Mon ngon dang duoc cap nhat mo ta.'}
                      </p>

                      {Array.isArray(product.options) && product.options.length > 0 && (
                        <div className="product-detail__options mt-3">
                          <h3 className="h6 text-uppercase text-muted">Lua chon kem theo</h3>
                          <ul className="list-unstyled mb-0">
                            {product.options.map((option) => (
                              <li key={option.option_id || `${option.group_name}-${option.option_name}`}>
                                <span className="fw-semibold">{option.group_name}:</span>{' '}
                                <span>{option.option_name}</span>
                                {Number(option.price_adjustment) ? (
                                  <span className="text-primary fw-semibold ms-1">
                                    +{formatCurrency(option.price_adjustment)}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="d-flex align-items-center gap-2 my-4">
                        <div className="input-group" style={{ maxWidth: '180px' }}>
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => handleQty('dec')}
                            aria-label="Giam so luong"
                          >
                            <i className="bi bi-dash-lg" aria-hidden="true" />
                          </button>
                          <input
                            type="text"
                            className="form-control text-center"
                            value={qty}
                            readOnly
                            aria-label="So luong"
                          />
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => handleQty('inc')}
                            aria-label="Tang so luong"
                          >
                            <i className="bi bi-plus-lg" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        <button type="button" className="btn btn-primary" onClick={handleAddToCart}>
                          Them vao gio
                        </button>
                        <Link to="/menu" className="btn btn-outline-secondary">
                          Quay lai thuc don
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <div className="row g-4 mt-2 mt-lg-4">
                <div className="col-12 col-lg-7">
                  <section className="product-detail__reviews card h-100 shadow-sm border-0" id="reviews">
                    <div className="card-body">
                      <header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div>
                          <h2 className="h5 mb-1">Danh gia va nhan xet</h2>
                          <p className="mb-0 text-muted">
                            {reviews.length
                              ? `Co ${reviews.length} danh gia tu khach hang`
                              : 'Chua co danh gia nao. Hay la nguoi dau tien!'}
                          </p>
                        </div>
                        <div className="product-detail__rating-display">
                          <div className="display-6 fw-bold mb-0">{averageRating ? averageRating : '—'}</div>
                          <div className="text-muted small text-uppercase">Diem trung binh</div>
                        </div>
                      </header>

                      <form className="product-detail__review-form" onSubmit={handleReviewSubmit}>
                        <div className="row g-3 align-items-center">
                          <div className="col-12 col-sm-4 col-lg-3">
                            <label htmlFor="reviewRating" className="form-label fw-semibold mb-0">
                              Danh gia
                            </label>
                            <select
                              id="reviewRating"
                              className="form-select"
                              value={newReview.rating}
                              onChange={(event) =>
                                setNewReview((previous) => ({ ...previous, rating: Number(event.target.value) }))
                              }
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>
                                  {value} sao
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-12 col-sm-8 col-lg-7">
                            <label htmlFor="reviewComment" className="form-label fw-semibold">
                              Cam nhan cua ban
                            </label>
                            <textarea
                              id="reviewComment"
                              className="form-control"
                              rows={2}
                              maxLength={500}
                              value={newReview.comment}
                              onChange={(event) =>
                                setNewReview((previous) => ({ ...previous, comment: event.target.value }))
                              }
                              placeholder="Chia se trai nghiem ve mon an nay..."
                            />
                          </div>
                          <div className="col-12 col-lg-2 d-grid">
                            <button type="submit" className="btn btn-primary">
                              Gui
                            </button>
                          </div>
                        </div>
                      </form>

                      <hr className="my-4" />

                      <div className="product-detail__review-list">
                        {reviews.length === 0 ? (
                          <p className="text-muted fst-italic">Chua co danh gia nao duoc tao.</p>
                        ) : (
                          reviews.map((review) => (
                            <article key={review.id} className="product-detail__review-item">
                              <header className="d-flex align-items-center gap-3 mb-2">
                                <div className="product-detail__review-rating">
                                  {Array.from({ length: 5 }).map((_, index) => {
                                    const ratingValue = index + 1
                                    const filled = ratingValue <= Number(review.rating || 0)
                                    return (
                                      <i
                                        key={ratingValue}
                                        className={`bi ${filled ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}
                                        aria-hidden="true"
                                      />
                                    )
                                  })}
                                </div>
                                <div className="small text-muted">
                                  {formatDateTime(review.createdAt)} · {review.author || 'Khach hang'}
                                </div>
                              </header>
                              <p className="mb-0">{review.comment}</p>
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </div>
                <div className="col-12 col-lg-5">
                  <section className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h2 className="h5 mb-3">Thong tin them</h2>
                      <ul className="list-unstyled mb-0">
                        <li className="d-flex align-items-start gap-2 mb-2">
                          <i className="bi bi-check2-circle text-success mt-1" aria-hidden="true" />
                          <span>Nguyen lieu tuoi moi, che bien trong ngay</span>
                        </li>
                        <li className="d-flex align-items-start gap-2 mb-2">
                          <i className="bi bi-check2-circle text-success mt-1" aria-hidden="true" />
                          <span>Phu hop cho bua trua hoac bua toi</span>
                        </li>
                        <li className="d-flex align-items-start gap-2 mb-2">
                          <i className="bi bi-check2-circle text-success mt-1" aria-hidden="true" />
                          <span>Thich hop di kem do uong lanh</span>
                        </li>
                        {product?.category_name ? (
                          <li className="d-flex align-items-start gap-2 mb-2">
                            <i className="bi bi-tag text-muted mt-1" aria-hidden="true" />
                            <span>Danh muc: {product.category_name}</span>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default ProductDetailPage
