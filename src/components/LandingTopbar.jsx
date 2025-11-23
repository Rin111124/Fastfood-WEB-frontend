import clsx from 'clsx'
import PropTypes from 'prop-types'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faCartShopping, faMagnifyingGlass, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { faCalendarDays, faCircleUser } from '@fortawesome/free-regular-svg-icons'
import customerApi from '../services/customerApi'
import { resolveAssetUrl } from '../services/apiClient'
import { formatCurrency } from '../utils/format'

const defaultNavItems = [
  { label: 'Trang chu', to: '/', icon: 'home' },
  { label: 'Thuc don', to: '/menu', icon: 'calendar' },
  { label: 'Gio hang', to: '/cart', icon: 'cart' }
]

const faByKey = {
  home: faHouse,
  cart: faCartShopping,
  calendar: faCalendarDays,
  'trang chu': faHouse,
  'gio hang': faCartShopping,
  'thuc don': faCalendarDays,
  'danh sach mon': faCalendarDays,
  menu: faCalendarDays
}

const LandingTopbar = ({
  isAuthenticated = false,
  customerName = 'Khach hang',
  onLogout = () => { },
  navItems = defaultNavItems,
  isSticky = false,
  showSidebarToggle = false,
  onSidebarToggle = () => { },
  showNav = true
}) => {
  const topbarClassName = clsx('landing-new__topbar container navbar navbar-expand-lg rounded-pill shadow-sm', {
    'landing-new__topbar--sticky': isSticky
  })

  const resolveIcon = (item) => {
    const key = String(item.icon || item.label || '').toLowerCase().trim()
    return faByKey[key] || faHouse
  }

  const location = useLocation()

  const isActiveLink = (item) => {
    try {
      if (item?.to) {
        const to = String(item.to)
        const path = location.pathname || '/'
        if (to === '/') return path === '/'
        return path === to || path.startsWith(`${to}/`)
      }
      if (item?.href) {
        const href = String(item.href)
        if (href.startsWith('#')) return (location.hash || '') === href
        const [p, hash] = href.split('#')
        const path = location.pathname || '/'
        const okPath = path === (p || '/')
        if (hash) return okPath && (location.hash || '') === `#${hash}`
        return okPath
      }
    } catch (_) {}
    return false
  }

  const renderNavItem = (item) => {
    const icon = resolveIcon(item)
    const active = isActiveLink(item)
    const className = clsx(
      'nav-link d-inline-flex align-items-center gap-2 landing-new__nav-link landing-new__nav-link--icon',
      { active }
    )
    const commonProps = { className, title: item.label, 'aria-label': item.label }
    if (item.href) {
      return (
        <a key={item.label} {...commonProps} href={item.href} aria-current={active ? 'page' : undefined}>
          <FontAwesomeIcon icon={icon} />
          <span className="landing-new__nav-label">{item.label}</span>
        </a>
      )
    }
    return (
      <Link key={item.label} {...commonProps} to={item.to} aria-current={active ? 'page' : undefined}>
        <FontAwesomeIcon icon={icon} />
        <span className="landing-new__nav-label">{item.label}</span>
      </Link>
    )
  }

  // Search state
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [openSearch, setOpenSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [results, setResults] = useState([])
  const searchRef = useRef(null)
  const navRef = useRef(null)
  const [navOpen, setNavOpen] = useState(false)
  // hamburger used only for mobile sidebar toggle

  const handleOutsideClick = (event) => {
    if (searchRef.current && !searchRef.current.contains(event.target)) {
      setOpenSearch(false)
    }
    if (navRef.current && !navRef.current.contains(event.target)) {
      setNavOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      setResults([])
      setSearchLoading(false)
      setSearchError('')
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const data = await customerApi.listProducts({ search: trimmed, limit: 8 })
        if (cancelled) return
        setResults(Array.isArray(data) ? data : [])
      } catch (err) {
        if (cancelled) return
        setResults([])
        setSearchError(err?.message || 'Khong the tim kiem. Vui long thu lai.')
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const buildProductPath = (product) => {
    const identifier = product?.product_id ?? product?.id ?? product?.slug ?? product?.name ?? `${Date.now()}`
    return `/menu/${encodeURIComponent(String(identifier))}`
  }

  return (
    <div className={topbarClassName}>
      <div className="landing-new__topbar-left">
        {showSidebarToggle ? (
          <button
            type="button"
            className="btn btn-outline-light d-inline-flex d-lg-none align-items-center gap-2 landing-new__sidebar-toggle"
            onClick={onSidebarToggle}
          >
            <i className="bi bi-list" aria-hidden="true" />
            <span>Menu</span>
          </button>
        ) : null}
        <Link className="landing-new__brand navbar-brand" to="/">
          FatFood
        </Link>
      </div>

      {/* *** ĐÂY LÀ THAY ĐỔI ***
        Thêm class 'd-none' (ẩn mặc định) và 'd-lg-flex' (hiển thị flex trên màn hình lớn) 
      */}
      {showNav && navItems.length > 0 ? (
        <nav className="landing-new__nav d-none d-lg-flex align-items-center gap-2">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      ) : (
        <div className="landing-new__nav landing-new__nav--hidden" aria-hidden="true" />
      )}

      {/* desktop keeps the inline nav; hamburger only on mobile */}

      {/* Search box */}
      <div className="landing-new__search" ref={searchRef}>
        <div className="landing-new__search-input input-group">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="landing-new__search-icon" />
          <input
            type="search"
            className="landing-new__search-field form-control form-control-sm bg-transparent text-white"
            placeholder="Tim mon an..."
            value={query}
            onFocus={() => setOpenSearch(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpenSearch(false)
            }}
            aria-label="Tim kiem san pham"
          />
        </div>

        {openSearch && (
          <div className="landing-new__search-results" role="listbox">
            {searchLoading ? (
              <div className="landing-new__search-empty">Dang tim kiem...</div>
            ) : searchError ? (
              <div className="landing-new__search-empty text-danger">{searchError}</div>
            ) : results.length === 0 && query.trim().length >= 2 ? (
              <div className="landing-new__search-empty">Khong tim thay ket qua</div>
            ) : (
              results.map((p) => (
                <Link
                  key={p.product_id || p.id || p.name}
                  className="landing-new__search-item"
                  to={buildProductPath(p)}
                  state={{ product: p }}
                  onClick={() => setOpenSearch(false)}
                >
                  <img
                    className="landing-new__search-thumb"
                    src={resolveAssetUrl(p.image || p.image_url || '')}
                    alt={p.name}
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden'
                    }}
                  />
                  <span className="landing-new__search-name">{p.name}</span>
                  <span className="landing-new__search-price">{formatCurrency(p.price)}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <div className="landing-new__topbar-actions landing-new__topbar-actions--auth">
          <span className="landing-new__greeting">Xin chao, {customerName}</span>
          <Link
            className="landing-new__icon-btn"
            to="/customer"
            title="Trung tam cua toi"
            aria-label="Trung tam cua toi"
          >
            <FontAwesomeIcon icon={faCircleUser} />
          </Link>
          <button
            type="button"
            className="landing-new__icon-btn"
            onClick={onLogout}
            title="Dang xuat"
            aria-label="Dang xuat"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>
      ) : (
        <div className="landing-new__topbar-actions">
          <Link className="landing-new__link" to="/login" title="Dang nhap">
            Dang nhap
          </Link>
          <Link className="landing-new__btn landing-new__btn--ghost" to="/signup" title="Dang ky">
            Dang ky
          </Link>
        </div>
      )}
    </div>
  )
}

LandingTopbar.propTypes = {
  isAuthenticated: PropTypes.bool,
  customerName: PropTypes.string,
  onLogout: PropTypes.func,
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string,
      to: PropTypes.string
    })
  ),
  isSticky: PropTypes.bool,
  showSidebarToggle: PropTypes.bool,
  onSidebarToggle: PropTypes.func,
  showNav: PropTypes.bool
}

// Note: defaultProps are not reliable on function components in React 19.
// Defaults are provided via parameter defaults above.

export default LandingTopbar
