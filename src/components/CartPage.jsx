import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandingTopbar from './LandingTopbar'
import LandingSidebar from './LandingSidebar'
import { readSession, clearSession } from '../lib/session'
import { formatCurrency } from '../utils/format'
import { resolveAssetUrl } from '../services/apiClient'
import customerApi from '../services/customerApi'
import '../styles/MenuPage.css'
import './LandingPage.css'
// Keyless maps via OpenStreetMap/OSRM
import { searchPlaces, geocodeOneAddress, routeDriving, nearestDriving, reverseGeocode } from '../services/openMaps'
import MapPicker from './common/MapPicker'

const CartPage = () => {
  const navigate = useNavigate()

  const [session, setSession] = useState(() => readSession())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const onStorage = () => setSession(readSession())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isAuthenticated = Boolean(session?.token && session?.user)
  const customerName =
    session?.user?.name || session?.user?.full_name || session?.user?.username || 'Khach hang'

  const handleLogout = () => {
    clearSession()
    setSession(null)
    navigate('/login', { replace: true })
  }

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

  const [items, setItems] = useState([])
  const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1604908177590-8f22fc0744d8?auto=format&fit=crop&w=200&q=60'

  const refreshCart = async () => {
    try {
      const data = await customerApi.getCart()
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      // noop UI fail-soft
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart()
    } else {
      setItems([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)
  const [checkingOut, setCheckingOut] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('vnpay') // 'vnpay' | 'vietqr' | 'cod' | 'paypal' | 'stripe'

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!items.length) return
    setCheckingOut(true)
    try {
      const orderPayload = {
        payment_method: paymentMethod,
        shipping_fee: method === 'delivery' ? shipping : 0,
        items: items.map((it) => ({
          productId: it.product_id,
          quantity: it.quantity,
          selected_options: Array.isArray(it.selected_options) ? it.selected_options : []
        }))
      }
      const order = await customerApi.createOrder(orderPayload)
      const orderId = order?.order_id
      if (!orderId) {
        throw new Error('Khong tao duoc don hang.')
      }

      const routeMap = {
        vnpay: `/checkout/vnpay/${orderId}`,
        vietqr: `/checkout/vietqr/${orderId}`,
        paypal: `/checkout/paypal/${orderId}`,
        stripe: `/checkout/stripe/${orderId}`,
        cod: `/checkout/cod/${orderId}`
      }
      const targetRoute = routeMap[paymentMethod] || `/checkout/vietqr/${orderId}`
      navigate(targetRoute)
      setCheckingOut(false)
    } catch (error) {
      console.error('Checkout error', error)
      setCheckingOut(false)
      alert(error?.message || 'Khong thanh toan duoc. Vui long thu lai.')
    }
  }

  // Delivery options state and helpers
  const [method, setMethod] = useState('pickup') // 'pickup' | 'delivery'
  const [address, setAddress] = useState('')
  const [profileAddress, setProfileAddress] = useState('')
  const [addressSource, setAddressSource] = useState('profile') // 'profile' | 'custom'
  const [distanceKm, setDistanceKm] = useState(null)
  const [travelSeconds, setTravelSeconds] = useState(null)
  const [shipping, setShipping] = useState(0)
  const [shipNote, setShipNote] = useState('')
  const [shipError, setShipError] = useState('')
  const [loadingShip, setLoadingShip] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const searchTimer = useRef(null)
  const destCoordRef = useRef(null)
  const storeCoordRef = useRef(null)
  const [routeSource, setRouteSource] = useState('')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [pickedCoord, setPickedCoord] = useState(null)

  const STORE_ORIGIN = import.meta.env.VITE_STORE_ORIGIN_ADDRESS || '235 Hoang Quoc Viet, Cau Giay, Ha Noi'
  const PREP_MINUTES = 15

  const estimateShipping = (km) => {
    if (km == null || Number.isNaN(km)) return { fee: 0, note: '', blocked: false }
    if (km < 3) return { fee: 0, note: 'Freeship duoi 3km', blocked: false }
    if (km <= 7) {
      // Tinh phi 5.000d cho moi km sau 3km. Lam tron len theo km bat dau.
      const fee = Math.ceil(Math.max(0, km - 3)) * 5000
      return { fee, note: '5.000đ/km sau 3km', blocked: false }
    }
    return { fee: 0, note: 'Vuot qua 7km', blocked: true }
  }

  async function ensureStoreCoords() {
    if (storeCoordRef.current) return storeCoordRef.current
    const lat = Number(import.meta.env.VITE_STORE_ORIGIN_LAT)
    const lon = Number(import.meta.env.VITE_STORE_ORIGIN_LON)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      storeCoordRef.current = { lat, lon }
      return storeCoordRef.current
    }
    // geocode store address once as fallback
    const geo = await geocodeOneAddress(STORE_ORIGIN)
    if (geo) {
      storeCoordRef.current = { lat: geo.lat, lon: geo.lon }
      return storeCoordRef.current
    }
    throw new Error('Khong xac dinh duoc toa do cua hang')
  }

  async function computeDistanceTo(lat, lon) {
    try {
      setLoadingShip(true)
      setShipError('')
      const origin = await ensureStoreCoords()
      const destRaw = { lat, lon }
      // snap dest to nearest road for better routing stability
      const snapped = await nearestDriving(destRaw).catch(() => null)
      const dest = snapped ? { lat: snapped.lat, lon: snapped.lon } : destRaw
      const result = await routeDriving(origin, dest)
      const { distance_m, duration_s, source } = result
      destCoordRef.current = dest
      const km = distance_m / 1000
      setDistanceKm(km)
      setTravelSeconds(duration_s)
      setRouteSource(source || '')
      const { fee, note, blocked } = estimateShipping(km)
      setShipping(method === 'delivery' && !blocked ? fee : 0)
      setShipNote(
        blocked
          ? 'Xin loi, cua hang khong giao xa the!'
          : note + (source === 'approx' ? ' (uoc tinh)' : '')
      )
      if (blocked) setShipError('Khoang cach > 7km. Khong ho tro giao hang.')
    } catch (e) {
      setShipError(e?.message || 'Loi khi tinh khoang cach')
      setDistanceKm(null)
      setTravelSeconds(null)
      setShipping(0)
      destCoordRef.current = null
    } finally {
      setLoadingShip(false)
    }
  }

  useEffect(() => {
    // when switching to delivery, try resolving store coords once
    if (method === 'delivery') {
      ensureStoreCoords().catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method])

  useEffect(() => {
    // Reset when changing method
    if (method === 'pickup') {
      setShipping(0)
      setShipError('')
      setShipNote('')
    } else if (method === 'delivery' && distanceKm != null) {
      const { fee, blocked } = estimateShipping(distanceKm)
      setShipping(!blocked ? fee : 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method])

  // Load profile address and default selection
  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        const profile = await customerApi.getProfile()
        if (cancelled) return
        const addr = profile?.address || ''
        setProfileAddress(addr)
        if (addr && addressSource === 'profile') {
          setAddress(addr)
        }
      } catch { }
    }
    if (isAuthenticated) loadProfile()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  // When using profile address, auto compute when possible
  useEffect(() => {
    if (method !== 'delivery') return
    if (addressSource !== 'profile') return
    if (!profileAddress) return
    // geocode + compute once on change with bias near store
    ensureStoreCoords()
      .then((origin) =>
        geocodeOneAddress(profileAddress, {
          lang: 'vi',
          country: 'vn',
          bias: origin ? { lat: origin.lat, lon: origin.lon, km: 15 } : undefined
        })
      )
      .then((geo) => {
        if (geo) computeDistanceTo(geo.lat, geo.lon)
      })
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, addressSource, profileAddress])

  const total = subtotal + (shipping || 0)

  return (
    <div className="landing-new menu-page cart-page">
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

        <div className="container">
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-8">
              <h1 className="h3 mb-1">Gio hang</h1>
              <p className="text-white-50 mb-0">Quan ly cac mon an ban se dat</p>
            </div>
          </div>
        </div>
      </header>

      <main className="py-4 py-lg-5">
        <div className="container">
          {!isAuthenticated ? (
            <div className="row justify-content-center">
              <div className="col-12 col-md-10 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4 p-lg-5 text-center">
                    <h2 className="h4 mb-2">Vui long dang nhap de su dung gio hang</h2>
                    <p className="text-muted mb-4">
                      Dang nhap de luu giu mon an, tinh tien va theo doi don hang.
                    </p>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                      <Link to="/login" className="btn btn-primary px-4">
                        Dang nhap
                      </Link>
                      <Link to="/signup" className="btn btn-outline-secondary px-4">
                        Dang ky
                      </Link>
                      <Link to="/menu" className="btn btn-link">Quay lai thuc don</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-4 g-lg-5">
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th scope="col">Mon an</th>
                            <th scope="col" className="text-center">So luong</th>
                            <th scope="col" className="text-end">Gia</th>
                            <th scope="col" className="text-end">Thanh tien</th>
                            <th scope="col" className="text-end" style={{ width: '1%' }}>
                              <span className="visually-hidden">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-5">
                                <p className="text-muted mb-2">Gio hang cua ban dang rong.</p>
                                <Link to="/menu" className="btn btn-primary">
                                  Kham pha thuc don
                                </Link>
                              </td>
                            </tr>
                          ) : (
                            items.map((it) => (
                              <tr key={it.cart_item_id || it.product_id}>
                                <td>
                                  <div className="d-flex align-items-center gap-3">
                                    <div className="ratio ratio-1x1 rounded" style={{ width: 56 }}>
                                      <img
                                        src={resolveAssetUrl(it.product?.image || it.product?.image_url || '') || FALLBACK_THUMB}
                                        alt={it.product?.name || ''}
                                        className="w-100 h-100"
                                        style={{ objectFit: 'cover' }}
                                        onError={(e) => {
                                          e.currentTarget.src = FALLBACK_THUMB
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <div className="fw-semibold">{it.product?.name}</div>
                                      {it.product?.food_type ? (
                                        <div className="small text-muted">Loai: {it.product.food_type}</div>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center">
                                  <div className="input-group input-group-sm justify-content-center" style={{ maxWidth: 140, margin: '0 auto' }}>
                                    <button
                                      className="btn btn-outline-secondary"
                                      type="button"
                                      onClick={async () => {
                                        const next = Math.max(0, (Number(it.quantity) || 1) - 1)
                                        await customerApi.updateCartItem({ productId: it.product_id, quantity: next })
                                        refreshCart()
                                      }}
                                    >
                                      <i className="bi bi-dash-lg" aria-hidden="true" />
                                    </button>
                                    <input type="text" className="form-control text-center" value={it.quantity || 1} readOnly aria-label="So luong" />
                                    <button
                                      className="btn btn-outline-secondary"
                                      type="button"
                                      onClick={async () => {
                                        const next = (Number(it.quantity) || 1) + 1
                                        await customerApi.updateCartItem({ productId: it.product_id, quantity: next })
                                        refreshCart()
                                      }}
                                    >
                                      <i className="bi bi-plus-lg" aria-hidden="true" />
                                    </button>
                                  </div>
                                </td>
                                <td className="text-end">{formatCurrency(it.price)}</td>
                                <td className="text-end">{formatCurrency((Number(it.price) || 0) * (Number(it.quantity) || 1))}</td>
                                <td className="text-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={async () => {
                                      await customerApi.removeCartItem(it.product_id)
                                      refreshCart()
                                    }}
                                  >
                                    Xoa
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body">
                    <h2 className="h5 mb-3">Thong tin don hang</h2>
                    <div className="mb-3">
                      <div className="fw-semibold mb-2">Phuong thuc nhan hang</div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="fulfillment"
                            id="fulfillPickup"
                            checked={method === 'pickup'}
                            onChange={() => setMethod('pickup')}
                          />
                          <label className="form-check-label" htmlFor="fulfillPickup">
                            Nhan tai quay
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="fulfillment"
                            id="fulfillDelivery"
                            checked={method === 'delivery'}
                            onChange={() => setMethod('delivery')}
                          />
                          <label className="form-check-label" htmlFor="fulfillDelivery">
                            Giao tan noi
                          </label>
                        </div>
                      </div>
                    </div>

                    {method === 'delivery' && (
                      <div className="mb-3">
                        <div className="fw-semibold mb-2">Dia chi giao hang</div>
                        <div className="d-flex align-items-center gap-3 mb-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="addressSource"
                              id="addrFromProfile"
                              checked={addressSource === 'profile'}
                              onChange={() => setAddressSource('profile')}
                            />
                            <label className="form-check-label" htmlFor="addrFromProfile">
                              Dung dia chi da dang ky
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="addressSource"
                              id="addrCustom"
                              checked={addressSource === 'custom'}
                              onChange={() => setAddressSource('custom')}
                            />
                            <label className="form-check-label" htmlFor="addrCustom">
                              Nhap dia chi khac
                            </label>
                          </div>
                        </div>

                        {addressSource === 'profile' ? (
                          <div>
                            <input
                              type="text"
                              className="form-control"
                              value={profileAddress || ''}
                              readOnly
                              placeholder="Chua cap nhat dia chi trong ho so"
                            />
                            {!profileAddress && (
                              <div className="form-text">Ban chua cap nhat dia chi hoac chua dong bo. Hay vao Trung tam khach hang de cap nhat.</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="form-label" htmlFor="deliveryAddress">Nhap dia chi</label>
                            <input
                              id="deliveryAddress"
                              type="text"
                              className="form-control"
                              placeholder="Vi du: 123 Cau Giay ..."
                              value={address}
                              onChange={(e) => {
                                const val = e.target.value
                                setAddress(val)
                                setShipError('')
                                setSuggestions([])
                                // Clear previous computed results until user selects/enter
                                setDistanceKm(null)
                                setTravelSeconds(null)
                                setShipping(0)
                                setShipNote('')
                                if (searchTimer.current) clearTimeout(searchTimer.current)
                                if (!val.trim()) { setSuggestLoading(false); return }
                                setSuggestLoading(true)
                                searchTimer.current = setTimeout(async () => {
                                  try {
                                    const origin = await ensureStoreCoords().catch(() => null)
                                    const opts = origin
                                      ? { limit: 6, lang: 'vi', lat: origin.lat, lon: origin.lon }
                                      : { limit: 6, lang: 'vi' }
                                    const found = await searchPlaces(val, opts)
                                    setSuggestions(found)
                                    setSelectedSuggestionIdx('')
                                  } catch { }
                                  finally { setSuggestLoading(false) }
                                }, 300)
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  try {
                                    const picked = suggestions[0]
                                    if (picked) {
                                      setAddress(picked.label)
                                      setSuggestions([])
                                      await computeDistanceTo(picked.lat, picked.lon)
                                      return
                                    }
                                    const origin = await ensureStoreCoords().catch(() => null)
                                    const geo = await geocodeOneAddress(address, {
                                      lang: 'vi',
                                      country: 'vn',
                                      bias: origin ? { lat: origin.lat, lon: origin.lon, km: 15 } : undefined
                                    })
                                    if (geo) {
                                      await computeDistanceTo(geo.lat, geo.lon)
                                    } else {
                                      setShipError('Khong tim thay toa do dia chi nay')
                                    }
                                  } catch { }
                                }
                              }}
                            />
                            {suggestLoading && (
                              <div className="small text-muted mt-2 d-flex align-items-center gap-2">
                                <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>
                                <span>Dang tim goi y...</span>
                              </div>
                            )}
                            {!suggestLoading && !suggestions.length && address.trim().length > 0 && (
                              <div className="small text-muted mt-2">Khong tim thay goi y phu hop. Thu bo dau/dau nang hoac bo sung 'Ha Noi'.</div>
                            )}
                            {!!suggestions.length && (
                              <div className="list-group mt-2" role="listbox" aria-label="Goi y dia chi">
                                {suggestions.map((sug, i) => (
                                  <button
                                    key={`${sug.lat},${sug.lon}-${i}`}
                                    type="button"
                                    className="list-group-item list-group-item-action"
                                    onClick={() => {
                                      setAddress(sug.label)
                                      setSuggestions([])
                                      computeDistanceTo(sug.lat, sug.lon)
                                    }}
                                  >
                                    {sug.label}
                                  </button>
                                ))}
                              </div>
                            )}
                            {!!suggestions.length && (
                              <div className="mt-2">
                                <label htmlFor="deliverySuggestionSelect" className="form-label">Hoac chon tu danh sach goi y</label>
                                <select
                                  id="deliverySuggestionSelect"
                                  className="form-select"
                                  value={selectedSuggestionIdx}
                                  onChange={async (e) => {
                                    const idx = e.target.value
                                    setSelectedSuggestionIdx(idx)
                                    if (idx === '') return
                                    const sug = suggestions[Number(idx)]
                                    if (!sug) return
                                    setAddress(sug.label)
                                    setSuggestions([])
                                    await computeDistanceTo(sug.lat, sug.lon)
                                  }}
                                >
                                  <option value="">-- Chon goi y --</option>
                                  {suggestions.map((s, i) => (
                                    <option key={`opt-${i}`} value={String(i)}>{s.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="form-text">Goi y dia chi duoc cung cap boi OpenStreetMap (Photon).</div>

                            <div className="mt-3">
                              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowMapPicker((v) => !v)}>
                                {showMapPicker ? 'An ban do' : 'Chon tren ban do'}
                              </button>
                            </div>

                            {showMapPicker && (
                              <div className="mt-2">
                                <MapPicker
                                  center={{ lat: Number(import.meta.env.VITE_STORE_ORIGIN_LAT) || 21.0395625, lon: Number(import.meta.env.VITE_STORE_ORIGIN_LON) || 105.7854375 }}
                                  store={{ lat: Number(import.meta.env.VITE_STORE_ORIGIN_LAT) || 21.0395625, lon: Number(import.meta.env.VITE_STORE_ORIGIN_LON) || 105.7854375, label: 'Cua hang' }}
                                  value={pickedCoord}
                                  height={300}
                                  onPick={async ({ lat, lon }) => {
                                    setPickedCoord({ lat, lon })
                                    setShipError('')
                                    const label = await reverseGeocode(lat, lon).catch(() => null)
                                    if (label) setAddress(label)
                                    await computeDistanceTo(lat, lon)
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {loadingShip && (
                          <div className="small text-muted mt-2 d-flex align-items-center gap-2">
                            <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>
                            <span>Dang tinh khoang cach...</span>
                          </div>
                        )}
                        {shipError && (
                          <div className="text-danger small mt-2">{shipError}</div>
                        )}
                        {!shipError && distanceKm != null && (
                          <div className="mt-2 small">
                            <div>Khoang cach: <span className="fw-semibold">{distanceKm.toFixed(1)} km</span></div>
                            <div>
                              Thoi gian du kien: <span className="fw-semibold">{Math.round((travelSeconds || 0) / 60)} phut</span>
                              {' '}+ {PREP_MINUTES} phut chuan bi ={' '}
                              <span className="fw-semibold">{Math.round((travelSeconds || 0) / 60) + PREP_MINUTES} phut</span>
                            </div>
                            <div>
                              Phi giao hang: <span className="fw-semibold">
                                {loadingShip ? (
                                  <span className="d-inline-flex align-items-center gap-2">
                                    <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>
                                    <span>Dang tinh...</span>
                                  </span>
                                ) : (shipping ? formatCurrency(shipping) : '-')}
                              </span>
                            </div>
                            {routeSource && (
                              <div className="text-muted">Nguon tinh: {routeSource}</div>
                            )}
                            {shipNote && <div className="text-muted">{shipNote}</div>}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Tam tinh</span>
                      <span className="fw-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="text-muted">Phi van chuyen</span>
                      <span className="fw-semibold">
                        {method === 'pickup'
                          ? 'Mien phi'
                          : (loadingShip
                            ? (<span className="d-inline-flex align-items-center gap-2">
                              <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>
                              <span>Dang tinh...</span>
                            </span>)
                            : (shipping ? formatCurrency(shipping) : '-'))}
                      </span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between mb-3">
                      <span className="fw-semibold">Tong</span>
                      <span className="fw-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phuong thuc thanh toan</label>
                      <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="vnpay">VNPAY (Online)</option>
                        <option value="paypal">PayPal</option>
                        <option value="stripe">The quoc te (Stripe)</option>
                        <option value="vietqr">VietQR (Chuyen khoan)</option>
                        <option value="cod">Tien mat (Khi nhan hang)</option>
                      </select>
                    </div>
                    <div className="d-grid gap-2">
                      <button className="btn btn-primary" disabled={items.length === 0 || checkingOut} type="button" onClick={handleCheckout}>
                        {checkingOut ? (
                          <span className="d-inline-flex align-items-center gap-2">
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span>Dang chuyen den VNPAY...</span>
                          </span>
                        ) : (
                          'Thanh toan'
                        )}
                      </button>
                      <Link to="/menu" className="btn btn-outline-secondary" type="button">
                        Tiep tuc mua sam
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CartPage
