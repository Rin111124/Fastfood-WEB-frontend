import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import customerApi from '../services/customerApi'
import { resolveAssetUrl } from '../services/apiClient'
import { formatCurrency } from '../utils/format'
import { clearSession, readSession } from '../lib/session'
import LandingTopbar from './LandingTopbar'
import LandingSidebar from './LandingSidebar'
import LandingAnchorNav from './LandingAnchorNav'
import '../styles/MenuPage.css'
import './LandingPage.css'

const PAGE_SIZE = 9
const FALLBACK_CARD_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f3f4f6"/><path d="M140 222h120a12 12 0 0 0 9.9-18.9l-60-90a12 12 0 0 0-19.8 0l-60 90A12 12 0 0 0 140 222zm60-120a30 30 0 1 0 0-60 30 30 0 0 0 0 60z" fill="#d0d5dd"/></svg>'
)}`
const FALLBACK_REMOTE_IMAGE =
  'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=1080&q=80'

const HERO_METRICS = [
  { label: 'Mon ngon', value: '120+' },
  { label: 'Khach hang', value: '85K+' },
  { label: 'Danh gia 5 sao', value: '9.5/10' }
]

const FALLBACK_HERO_PRODUCTS = [
  { product_id: 'menu-fallback-1', name: 'Burger Ga Gion', image_url: FALLBACK_REMOTE_IMAGE, price: 59000 },
  { product_id: 'menu-fallback-2', name: 'Combo An Nhanh', image_url: FALLBACK_REMOTE_IMAGE, price: 119000 },
  { product_id: 'menu-fallback-3', name: 'Tra Dao Mat Ong', image_url: FALLBACK_REMOTE_IMAGE, price: 39000 }
]

const buildProductPath = (product) => {
  const identifier =
    product?.product_id ?? product?.id ?? product?.slug ?? product?.name ?? `${Date.now()}`
  return `/menu/${encodeURIComponent(String(identifier))}`
}

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

const MenuPage = () => {
  const [session, setSession] = useState(() => readSession())
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
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
    let isMounted = true

    const fetchProducts = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await customerApi.listProducts()
        if (!isMounted) return
        const nextProducts = Array.isArray(data) ? data : []
        setProducts(nextProducts)
        setCurrentPage(1)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Khong the tai thuc don. Vui long thu lai.')
        setProducts([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [])

  const isAuthenticated = Boolean(session?.token && session?.user)
  const customerName =
    session?.user?.name || session?.user?.full_name || session?.user?.username || 'Khach hang'

  const handleLogout = () => {
    clearSession()
    setSession(null)
    navigate('/login', { replace: true })
  }

  const heroGallery = useMemo(() => {
    if (products.length) {
      return products.slice(0, 3)
    }
    return FALLBACK_HERO_PRODUCTS
  }, [products])

  const totalPages = useMemo(() => {
    if (!products.length) return 1
    return Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  }, [products.length])

  const paginatedProducts = useMemo(() => {
    if (!products.length) return []
    const start = (currentPage - 1) * PAGE_SIZE
    return products.slice(start, start + PAGE_SIZE)
  }, [products, currentPage])

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handlePageChange = (page) => {
    setCurrentPage(page)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const anchorNavItems = useMemo(
    () => [
      { label: 'Len dau trang', href: '#top' },
      { label: 'Danh sach mon', href: '#menu-list' }
    ],
    []
  )

  const topbarNavItems = useMemo(
    () => [
      { label: 'Trang chu', to: '/' },
      { label: 'Thuc don', to: '/menu' },
      { label: 'Gio hang', to: '/cart' }
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
    <div className="landing-new menu-page">
      <LandingSidebar open={isSidebarOpen} onClose={handleSidebarClose} links={sidebarLinks} />
      <LandingAnchorNav items={anchorNavItems} />
      <header className="landing-new__hero landing-new__hero--menu" id="top">
        <LandingTopbar
          isAuthenticated={isAuthenticated}
          customerName={customerName}
          onLogout={handleLogout}
          navItems={topbarNavItems}
          isSticky
          showSidebarToggle
          onSidebarToggle={handleSidebarOpen}
        />

        <div className="landing-new__hero-body container row align-items-center g-4 g-lg-5">
          <div className="landing-new__hero-content col-12 col-lg-6">
            <span className="landing-new__hero-eyebrow">Thuc don truc tuyen</span>
            <h1 className="landing-new__hero-title">Thoa suc lua chon mon yeu thich</h1>
            <p className="landing-new__hero-subtitle">
              Toan bo thuc don duoc dong bo truc tiep tu he thong backend. Chon mon, tuy chinh topping va san sang dat
              ngay.
            </p>
            <div className="landing-new__hero-actions">
              <Link
                className="landing-new__btn landing-new__btn--primary"
                to={isAuthenticated ? '/customer' : '/login'}
              >
                {isAuthenticated ? 'Xem don cua toi' : 'Dang nhap dat mon'}
              </Link>
              <Link className="landing-new__btn landing-new__btn--ghost" to="/#features">
                Ve trang chu
              </Link>
            </div>
            <div className="landing-new__hero-metrics">
              {HERO_METRICS.map((metric) => (
                <div key={metric.label} className="landing-new__hero-metric">
                  <span className="landing-new__hero-metric-value">{metric.value}</span>
                  <span className="landing-new__hero-metric-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-new__hero-visual col-12 col-lg-6">
            <div className="landing-new__hero-gallery">
              {heroGallery.map((product, index) => {
                const resolvedImage = resolveHeroImage(product)
                return (
                  <div
                    key={product.product_id || `menu-preview-${index}`}
                    className={`landing-new__hero-item landing-new__hero-item--${index}`}
                  >
                    <img
                      src={resolvedImage}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_REMOTE_IMAGE
                      }}
                      loading="lazy"
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

      <section className="menu-page__content py-5" id="menu-list">
        <div className="container">
          {error && (
            <div className="alert alert-danger shadow-sm" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <div className="spinner-border text-primary" role="status" aria-live="polite">
                <span className="visually-hidden">Dang tai thuc don...</span>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <h2 className="h4 fw-semibold mb-3">Thuc don dang duoc cap nhat</h2>
              <p>Vui long quay lai sau de kham pha nhieu lua chon hap dan hon.</p>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {paginatedProducts.map((product) => (
                  <div className="col-12 col-sm-6 col-lg-4" key={product.product_id || product.name}>
                    <article className="card h-100 shadow-sm border-0 menu-page__card">
                      <div className="ratio ratio-4x3 menu-page__image-wrapper">
                        <Link
                          to={buildProductPath(product)}
                          state={{ product }}
                          className="menu-page__card-link"
                        >
                          <img
                            src={buildImageSrc(product)}
                            alt={product.name}
                            className="img-fluid menu-page__image"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src = FALLBACK_CARD_IMAGE
                            }}
                          />
                        </Link>
                      </div>
                      <div className="card-body d-flex flex-column">
                        <h2 className="h5 card-title mb-2">
                          <Link
                            to={buildProductPath(product)}
                            state={{ product }}
                            className="stretched-link text-decoration-none text-reset menu-page__card-title-link"
                          >
                            {product.name}
                          </Link>
                        </h2>
                        {product.description && (
                          <p className="card-text text-muted small mb-3">{product.description}</p>
                        )}

                        {Array.isArray(product.options) && product.options.length > 0 && (
                          <ul className="list-unstyled mb-3 small text-muted">
                            {product.options.slice(0, 3).map((option) => (
                              <li key={option.option_id || `${option.group_name}-${option.option_name}`}>
                                <span className="text-body-secondary">{option.group_name}</span>:{' '}
                                <span className="text-body">{option.option_name}</span>
                                {Number(option.price_adjustment) ? (
                                  <span className="ms-1 fw-semibold text-primary">
                                    +{formatCurrency(option.price_adjustment)}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                            {product.options.length > 3 && (
                              <li className="fst-italic">+ {product.options.length - 3} lua chon khac</li>
                            )}
                          </ul>
                        )}

                        <div className="mt-auto d-flex align-items-center">
                          <span className="fs-5 fw-bold text-primary">
                            {formatCurrency(product.price)}
                          </span>
                          <Link
                            to={buildProductPath(product)}
                            state={{ product }}
                            className="btn btn-outline-primary btn-sm ms-auto"
                          >
                            Xem chi tiet
                          </Link>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="mt-4" aria-label="Phan trang thuc don">
                  <ul className="pagination justify-content-center flex-wrap gap-2 mb-0">
                    <li className={`page-item ${canGoPrevious ? '' : 'disabled'}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!canGoPrevious}
                      >
                        Truoc
                      </button>
                    </li>
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const page = index + 1
                      const isActive = page === currentPage
                      return (
                        <li key={page} className={`page-item ${isActive ? 'active' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => handlePageChange(page)}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {page}
                          </button>
                        </li>
                      )
                    })}
                    <li className={`page-item ${canGoNext ? '' : 'disabled'}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!canGoNext}
                      >
                        Sau
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export { MenuPage }
export default MenuPage
