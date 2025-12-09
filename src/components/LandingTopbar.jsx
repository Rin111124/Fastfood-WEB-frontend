import clsx from "clsx"
import PropTypes from "prop-types"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faHouse, faCartShopping, faMagnifyingGlass, faRightFromBracket, faBowlFood } from "@fortawesome/free-solid-svg-icons"
import { faCalendarDays, faCircleUser } from "@fortawesome/free-regular-svg-icons"
import customerApi from "../services/customerApi"
import { resolveAssetUrl } from "../services/apiClient"
import { formatCurrency } from "../utils/format"

const defaultNavItems = [
  { label: "Trang chủ", to: "/", icon: "home" },
  { label: "Thực đơn", to: "/menu", icon: "calendar" },
  { label: "Giỏ hàng", to: "/cart", icon: "cart" }
]

const faByKey = {
  home: faHouse,
  cart: faCartShopping,
  calendar: faCalendarDays,
  "trang chủ": faHouse,
  "giỏ hàng": faCartShopping,
  "thực đơn": faCalendarDays,
  menu: faCalendarDays
}

const LandingTopbar = ({
  isAuthenticated = false,
  customerName = "Khách hàng",
  onLogout = () => {},
  navItems = defaultNavItems,
  isSticky = false,
  showSidebarToggle = false,
  onSidebarToggle = () => {},
  showNav = true
}) => {
  const topbarClassName = clsx("landing-new__topbar container navbar navbar-expand-lg rounded-pill shadow-sm", {
    "landing-new__topbar--sticky": isSticky
  })

  const resolveIcon = (item) => {
    const key = String(item.icon || item.label || "").toLowerCase().trim()
    return faByKey[key] || faHouse
  }

  const location = useLocation()

  const isActiveLink = (item) => {
    try {
      if (item?.to) {
        const to = String(item.to)
        const path = location.pathname || "/"
        if (to === "/") return path === "/"
        return path === to || path.startsWith(`${to}/`)
      }
      if (item?.href) {
        const href = String(item.href)
        if (href.startsWith("#")) return (location.hash || "") === href
        const [p, hash] = href.split("#")
        const path = location.pathname || "/"
        const okPath = path === (p || "/")
        if (hash) return okPath && (location.hash || "") === `#${hash}`
        return okPath
      }
    } catch (err) {
      console.warn("Không thể đánh dấu link đang chọn", err)
    }
    return false
  }

  const renderNavItem = (item) => {
    const icon = resolveIcon(item)
    const active = isActiveLink(item)
    const className = clsx(
      "nav-link d-inline-flex align-items-center gap-2 landing-new__nav-link landing-new__nav-link--icon",
      { active }
    )
    const commonProps = { className, title: item.label, "aria-label": item.label }
    if (item.href) {
      return (
        <a key={item.label} {...commonProps} href={item.href} aria-current={active ? "page" : undefined}>
          <FontAwesomeIcon icon={icon} />
          <span className="landing-new__nav-label">{item.label}</span>
        </a>
      )
    }
    return (
      <Link key={item.label} {...commonProps} to={item.to} aria-current={active ? "page" : undefined}>
        <FontAwesomeIcon icon={icon} />
        <span className="landing-new__nav-label">{item.label}</span>
      </Link>
    )
  }

  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [openSearch, setOpenSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [results, setResults] = useState([])
  const searchRef = useRef(null)
  const navRef = useRef(null)
  const [navOpen, setNavOpen] = useState(false)

  const handleOutsideClick = (event) => {
    if (searchRef.current && !searchRef.current.contains(event.target)) {
      setOpenSearch(false)
    }
    if (navRef.current && !navRef.current.contains(event.target)) {
      setNavOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      setResults([])
      setSearchLoading(false)
      setSearchError("")
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError("")
      try {
        const data = await customerApi.listProducts({ search: trimmed, limit: 8 })
        if (cancelled) return
        setResults(Array.isArray(data) ? data : [])
      } catch (err) {
        if (cancelled) return
        setResults([])
        setSearchError(err?.message || "Không thể tìm kiếm. Vui lòng thử lại.")
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
        <Link className="landing-new__brand navbar-brand d-inline-flex align-items-center gap-2" to="/">
          <FontAwesomeIcon icon={faBowlFood} beat className="text-warning" />
          <span>FatFood</span>
        </Link>
      </div>

      {showNav && navItems.length > 0 ? (
        <nav className="landing-new__nav d-none d-lg-flex align-items-center gap-2">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      ) : (
        <div className="landing-new__nav landing-new__nav--hidden" aria-hidden="true" />
      )}

      <div className="landing-new__search" ref={searchRef}>
        <div className="landing-new__search-input input-group">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="landing-new__search-icon" />
          <input
            type="search"
            className="landing-new__search-field form-control form-control-sm bg-transparent text-white"
            placeholder="Tìm món ăn..."
            value={query}
            onFocus={() => setOpenSearch(true)}
            onChange={(e) => setQuery(e.target.value)}
          />
          {openSearch && query.trim() && (
            <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setQuery("")}>
              Xóa
            </button>
          )}
        </div>

        {openSearch && (
          <div className="landing-new__search-results" role="listbox">
            {searchLoading && <div className="landing-new__search-empty">Đang tìm kiếm...</div>}
            {!searchLoading && searchError && <div className="landing-new__search-empty text-danger">{searchError}</div>}
            {!searchLoading && !searchError && results.length === 0 && query.trim().length >= 2 && (
              <div className="landing-new__search-empty">Không tìm thấy món phù hợp.</div>
            )}
            {!searchLoading && !searchError && results.length > 0 && (
              <ul className="list-unstyled mb-0">
                {results.map((product) => (
                  <li key={product.product_id}>
                    <button
                      type="button"
                      className="landing-new__search-item"
                      onClick={() => navigate(buildProductPath(product))}
                    >
                      <span>{product.name}</span>
                      <span className="text-muted">{formatCurrency(product.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="landing-new__account" ref={navRef}>
        {isAuthenticated ? (
          <div className="dropdown">
            <button
              className="btn btn-light d-inline-flex align-items-center gap-2 dropdown-toggle"
              type="button"
              onClick={() => setNavOpen((prev) => !prev)}
            >
              <FontAwesomeIcon icon={faCircleUser} />
              <span>{customerName}</span>
            </button>
            <ul className={clsx("dropdown-menu dropdown-menu-end", { show: navOpen })}>
              <li>
                <Link className="dropdown-item" to="/customer">
                  Trung tâm của tôi
                </Link>
              </li>
              <li>
                <button className="dropdown-item text-danger" type="button" onClick={onLogout}>
                  <FontAwesomeIcon icon={faRightFromBracket} className="me-2" /> Đăng xuất
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="d-flex align-items-center gap-2">
            <Link className="btn btn-outline-light" to="/login">
              <FontAwesomeIcon icon={faCircleUser} className="me-2" /> Đăng nhập
            </Link>
            <Link className="btn btn-warning text-white" to="/signup">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
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
      to: PropTypes.string,
      href: PropTypes.string,
      icon: PropTypes.string
    })
  ),
  isSticky: PropTypes.bool,
  showSidebarToggle: PropTypes.bool,
  onSidebarToggle: PropTypes.func,
  showNav: PropTypes.bool
}

export default LandingTopbar
