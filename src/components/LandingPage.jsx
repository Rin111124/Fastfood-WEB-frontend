import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import customerApi from '../services/customerApi'
import { resolveAssetUrl } from '../services/apiClient'
import { formatCurrency } from '../utils/format'
import { clearSession, readSession } from '../lib/session'
import './LandingPage.css'
import LandingTopbar from './LandingTopbar'
import LandingSidebar from './LandingSidebar'
import LandingAnchorNav from './LandingAnchorNav'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=1080&q=80'

const heroMetrics = [
  { label: 'Mon ngon', value: '120+' },
  { label: 'Khach hang', value: '85K+' },
  { label: 'Danh gia 5 sao', value: '9.5/10' }
]

const featureList = [
  {
    title: 'Giao hang nhanh',
    description: 'Theo doi don hang theo thoi gian thuc va nhan mon chi trong 20 phut.'
  },
  {
    title: 'Nguyen lieu tuoi',
    description: 'Nguon cung cap duoc kiem dinh moi ngay, dam bao chat luong tung bua an.'
  },
  {
    title: 'Ca nhan hoa mon',
    description: 'Tuy chinh topping, size va so luong de phu hop voi khau vi cua ban.'
  }
]

const testimonialList = [
  {
    quote:
      'Thuc don da dang, gia ca hop ly va dat mon sieu nhanh. FatFood da tro thanh nguon nang luong moi buoi chieu cua team chung toi.',
    author: 'Chi Nguyen - Product Manager'
  },
  {
    quote:
      'Lan nao dat mon cung nhan duoc do an nong hoi. He thong tu dong cap nhat trang thai don hang rat tien loi.',
    author: 'Hoang Tran - UX Designer'
  }
]

const fallbackHeroProducts = [
  { product_id: 'placeholder-1', name: 'Burger Ga Gion', image_url: FALLBACK_IMAGE, price: 59000 },
  { product_id: 'placeholder-2', name: 'Combo An Nhanh', image_url: FALLBACK_IMAGE, price: 119000 },
  { product_id: 'placeholder-3', name: 'Tra Dao Mat Ong', image_url: FALLBACK_IMAGE, price: 39000 }
]

const trimText = (value = '', max = 160) => {
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}

const resolveProductImage = (product) => {
  if (!product) return ''
  const candidateImage =
    typeof product.image === 'string' && product.image.trim().length ? product.image.trim() : null
  const candidateUrl =
    typeof product.image_url === 'string' && product.image_url.trim().length ? product.image_url.trim() : null

  if (candidateImage) {
    return candidateImage.startsWith('data:') ? candidateImage : resolveAssetUrl(candidateImage)
  }

  if (candidateUrl) {
    return candidateUrl.startsWith('data:') ? candidateUrl : resolveAssetUrl(candidateUrl)
  }

  return ''
}

const LandingPage = () => {
  const [session, setSession] = useState(() => readSession())
  const [products, setProducts] = useState([])
  const [news, setNews] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingNews, setLoadingNews] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setSession(readSession())
  }, [location])

  useEffect(() => {
    const handleStorageChange = () => {
      setSession(readSession())
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('landing-sidebar-open')
    } else {
      document.body.classList.remove('landing-sidebar-open')
    }
    return () => document.body.classList.remove('landing-sidebar-open')
  }, [isSidebarOpen])

  useEffect(() => {
    if (!location.hash) return
    const target = document.querySelector(location.hash)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  useEffect(() => {
    let cancelled = false
    setStatusMessage('')
    setStatusType('info')

    const loadProducts = async () => {
      setLoadingProducts(true)
      try {
        const data = await customerApi.listProducts({ limit: 8 })
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Failed to load products', error)
        if (!cancelled) {
          setStatusMessage((previous) => previous || 'Khong the tai danh sach mon an. Vui long thu lai sau.')
          setStatusType('error')
          setProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false)
        }
      }
    }

    const loadNews = async () => {
      setLoadingNews(true)
      try {
        const data = await customerApi.listNews({ limit: 3 })
        if (!cancelled) {
          setNews(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Failed to load news', error)
        if (!cancelled) {
          setStatusMessage((previous) => previous || 'Khong the tai tin tuc moi nhat. Vui long thu lai sau.')
          setStatusType('error')
          setNews([])
        }
      } finally {
        if (!cancelled) {
          setLoadingNews(false)
        }
      }
    }

    loadProducts()
    loadNews()

    return () => {
      cancelled = true
    }
  }, [])

  const isAuthenticated = Boolean(session?.token && session?.user)
  const customerName =
    session?.user?.name || session?.user?.full_name || session?.user?.username || 'Khach hang'

  const heroGallery = useMemo(() => (products.length ? products.slice(0, 3) : []), [products])
  const highlightProducts = useMemo(() => products.slice(0, 6), [products])
  const galleryToRender = heroGallery.length ? heroGallery : fallbackHeroProducts

  const handleLogout = () => {
    clearSession()
    setSession(null)
    navigate('/login', { replace: true })
  }

  const renderProductGrid = () => {
    if (loadingProducts) {
      return (
        <div className="landing-new__product-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={`skeleton-${index}`} className="landing-new__product-card landing-new__product-card--skeleton">
              <div className="landing-new__product-skeleton-image" />
              <div className="landing-new__product-skeleton-text" />
              <div className="landing-new__product-skeleton-text landing-new__product-skeleton-text--short" />
            </article>
          ))}
        </div>
      )
    }

    if (!highlightProducts.length) {
      return (
        <div className="landing-new__empty-state">
          <p>Menu dang duoc cap nhat. Hay quay lai sau nhe!</p>
        </div>
      )
    }

    return (
      <div className="landing-new__product-grid">
        {highlightProducts.map((product, index) => {
          const resolvedImage = resolveProductImage(product) || FALLBACK_IMAGE
          return (
            <article key={product.product_id || `product-${index}`} className="landing-new__product-card">
              <div className="landing-new__product-image-wrapper">
                <img
                  src={resolvedImage}
                  alt={product.name}
                  className="landing-new__product-image"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE
                  }}
                />
                <span className="landing-new__product-badge">Pho bien</span>
              </div>
              <div className="landing-new__product-info">
                <h3 className="landing-new__product-title">{product.name}</h3>
                <p className="landing-new__product-description">
                  {product.description || 'Mon ngon phu hop moi bua an trong ngay.'}
                </p>
                <div className="landing-new__product-meta">
                  <span className="landing-new__product-price">{formatCurrency(product.price)}</span>
                  <button type="button" className="landing-new__btn landing-new__btn--ghost">
                    Dat mon
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    )
  }

  const renderNews = () => {
    if (loadingNews) {
      return (
        <div className="landing-new__news-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`news-skeleton-${index}`} className="landing-new__news-card landing-new__news-card--skeleton">
              <div className="landing-new__news-skeleton-image">
                <div className="landing-new__news-skeleton-loader" />
              </div>
              <div className="landing-new__news-skeleton-line" />
              <div className="landing-new__news-skeleton-line landing-new__news-skeleton-line--short" />
            </article>
          ))}
        </div>
      )
    }

    if (!news.length) {
      return (
        <div className="landing-new__empty-state">
          <div className="landing-new__empty-icon">📰</div>
          <h3>Chưa có tin tức mới</h3>
          <p>Chúng tôi sẽ cập nhật tin tức sớm nhất có thể.</p>
        </div>
      )
    }

    return (
      <div className="landing-new__news-grid">
        {news.map((item) => {
          const rawImage =
            typeof item.image === 'string' && item.image.trim().length
              ? item.image.trim()
              : typeof item.image_url === 'string' && item.image_url.trim().length
                ? item.image_url.trim()
                : null

          const resolvedImage =
            rawImage && rawImage.startsWith('data:')
              ? rawImage
              : rawImage
                ? resolveAssetUrl(rawImage)
                : null

          return (
            <article key={item.news_id} className="landing-new__news-card">
              <div className="landing-new__news-image-wrapper">
                {resolvedImage ? (
                  <img
                    src={resolvedImage}
                    alt={item.title}
                    className="landing-new__news-image"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_IMAGE
                    }}
                  />
                ) : (
                  <div className="landing-new__news-placeholder">Dang cap nhat hinh anh</div>
                )}
              </div>
              <div className="landing-new__news-content">
                <span className="landing-new__news-badge">Tin moi</span>
                <h3>{item.title}</h3>
                <p>{trimText(item.content)}</p>
                <time className="landing-new__news-date">
                  {new Intl.DateTimeFormat('vi-VN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }).format(new Date(item.updated_at || item.created_at))}
                </time>
              </div>
            </article>
          )
        })}
      </div>
    )
  }

  const anchorNavItems = useMemo(
    () => [
      { label: 'Len dau trang', href: '#top' },
      { label: 'Dich vu', href: '#features' },
      { label: 'Tin tuc', href: '#news' },
      { label: 'Thuc don', href: '#menu' },
      { label: 'Cam nhan', href: '#stories' }
    ],
    []
  )

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

  return (
    <div className="landing-new">
      <LandingSidebar open={isSidebarOpen} onClose={handleSidebarClose} links={sidebarLinks} />
      <LandingAnchorNav items={anchorNavItems} />
      <header className="landing-new__hero" id="top">
        <LandingTopbar
          isAuthenticated={isAuthenticated}
          customerName={customerName}
          onLogout={handleLogout}
          isSticky
          showSidebarToggle
          onSidebarToggle={handleSidebarOpen}
        />

        <div className="landing-new__hero-body container row align-items-center g-4 g-lg-5">
          <div className="landing-new__hero-content col-12 col-lg-6">
            <span className="landing-new__hero-eyebrow">Giao hang sieu toc trong thanh pho</span>
            <h1 className="landing-new__hero-title">Khoi dong ngay moi voi nhung mon an yeu thich</h1>
            <p className="landing-new__hero-subtitle">
              Dat mon chi trong vai cu cham, theo doi trang thai truc tuyen va nhan do an nong hoi. FatFood dong hanh
              cung ban moi bua an trong ngay.
            </p>
            <div className="landing-new__hero-actions">
              <Link className="landing-new__btn landing-new__btn--primary" to="/menu">
                Kham pha thuc don
              </Link>
              {isAuthenticated ? (
                <Link className="landing-new__btn landing-new__btn--ghost" to="/customer">
                  Xem bang tin cua toi
                </Link>
              ) : (
                <Link className="landing-new__btn landing-new__btn--ghost" to="/login">
                  Dang nhap de dat mon
                </Link>
              )}
            </div>
            <div className="landing-new__hero-metrics">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="landing-new__hero-metric">
                  <span className="landing-new__hero-metric-value">{metric.value}</span>
                  <span className="landing-new__hero-metric-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-new__hero-visual col-12 col-lg-6">
            <div className="landing-new__hero-gallery">
              {galleryToRender.map((product, index) => {
                const resolvedImage = resolveProductImage(product) || FALLBACK_IMAGE
                return (
                  <div
                    key={product.product_id || `visual-${index}`}
                    className={`landing-new__hero-item landing-new__hero-item--${index}`}
                  >
                    <img
                      src={resolvedImage}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE
                      }}
                    />
                    <div className="landing-new__hero-item-caption">
                      <span className="landing-new__hero-item-name">{product.name}</span>
                      <span className="landing-new__hero-item-price">{formatCurrency(product.price)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {statusMessage && (
        <div className={`landing-new__status landing-new__status--${statusType}`}>
          <span>{statusMessage}</span>
        </div>
      )}

      <main className="landing-new__main">
        <section className="landing-new__section" id="features">
          <header className="landing-new__section-header">
            <span className="landing-new__section-eyebrow">Suc manh giao hang so</span>
            <h2 className="landing-new__section-title">Chuoi gia tri mang den trai nghiem hoan hao</h2>
            <p className="landing-new__section-subtitle">
              Tu nha bep toi tay ban, FatFood toi uu tung cong doan de giu duoc chat luong va toc do.
            </p>
          </header>
          <div className="landing-new__feature-grid">
            {featureList.map((feature) => (
              <article key={feature.title} className="landing-new__feature-card">
                <div className="landing-new__feature-icon" aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-new__section landing-new__section" id="news">
          <header className="landing-new__section-header landing-new__section-header--inline">
            <div>
              <span className="landing-new__section-eyebrow">Tin tuc moi</span>
              <h2 className="landing-new__section-title">Cap nhat nhanh tu FatFood</h2>
              <p className="landing-new__section-subtitle">
                Chia se cac chuong trinh, uu dai va khoanh khac dang nho cua FatFood moi ngay.
              </p>
            </div>
            <div className="landing-new__section-actions">
              <a className="landing-new__link" href="#top">
                Ve dau trang
              </a>
            </div>
          </header>
          {renderNews()}
        </section>

        <section className="landing-new__section landing-new__section--alt" id="menu">
          <header className="landing-new__section-header landing-new__section-header--inline">
            <div>
              <span className="landing-new__section-eyebrow">Noi bat hom nay</span>
              <h2 className="landing-new__section-title">Mon ngon tu he thong backend</h2>
              <p className="landing-new__section-subtitle">
                Danh sach duoc dong bo truc tiep tu backend. Hinh anh va thong tin mon an luon duoc cap nhat moi nhat.
              </p>
            </div>
            <div className="landing-new__section-actions">
              {isAuthenticated ? (
                <Link className="landing-new__btn landing-new__btn--ghost" to="/customer">
                  Xem don cua toi
                </Link>
              ) : (
                <Link className="landing-new__btn landing-new__btn--ghost" to="/login">
                  Dang nhap de dat mon
                </Link>
              )}
              <a className="landing-new__link" href="#top">
                Ve dau trang
              </a>
            </div>
          </header>
          {renderProductGrid()}
        </section>

        <section className="landing-new__section" id="stories">
          <header className="landing-new__section-header">
            <span className="landing-new__section-eyebrow">Cam nhan thuc te</span>
            <h2 className="landing-new__section-title">Khach hang noi gi ve FatFood</h2>
          </header>
          <div className="landing-new__testimonial-grid">
            {testimonialList.map((item) => (
              <blockquote key={item.author} className="landing-new__testimonial-card">
                <p className="landing-new__testimonial-quote">"{item.quote}"</p>
                <footer className="landing-new__testimonial-author">{item.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="landing-new__section landing-new__cta">
          <div className="landing-new__cta-content">
            <h2>San sang dat mon?</h2>
            <p>
              Dang nhap de dong bo gio hang, su dung ma giam gia va theo doi don hang nhanh chong. FatFood san sang
              phuc vu ban 24/7.
            </p>
          </div>
          <div className="landing-new__cta-actions">
            {isAuthenticated ? (
              <Link className="landing-new__btn landing-new__btn--primary" to="/customer">
                Mo trang cua toi
              </Link>
            ) : (
              <Link className="landing-new__btn landing-new__btn--primary" to="/login">
                Dang nhap ngay
              </Link>
            )}
            <Link className="landing-new__btn landing-new__btn--ghost" to="/signup">
              Tao tai khoan moi
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-new__footer">
        <div>
          <strong>FatFood</strong>
          <p>An ngon trong moi khoang khac.</p>
        </div>
        <div className="landing-new__footer-links">
          <Link to="/#features">Dich vu</Link>
          <Link to="/#news">Tin tuc</Link>
          <Link to="/menu">Thuc don</Link>
          <Link to="/#stories">Cam nhan</Link>
        </div>
        <div className="landing-new__footer-copy">(c) {new Date().getFullYear()} FatFood. All rights reserved.</div>
      </footer>
    </div>
  )
}

export default LandingPage
