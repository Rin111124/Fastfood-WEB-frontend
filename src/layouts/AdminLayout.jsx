import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { clearSession } from '../lib/session'

const ADMIN_LINKS = [
  { to: '/admin', icon: 'bi-grid', label: 'Tong quan', exact: true },
  { to: '/admin/users', icon: 'bi-people', label: 'Nguoi dung' },
  { to: '/admin/foods', icon: 'bi-egg-fried', label: 'Mon an & Danh muc' },
  { to: '/admin/orders', icon: 'bi-receipt-cutoff', label: 'Don hang' },
  { to: '/admin/payments', icon: 'bi-credit-card', label: 'Giao dich' },
  { to: '/admin/promotions', icon: 'bi-ticket-perforated', label: 'Khuyen mai' },
  { to: '/admin/news', icon: 'bi-newspaper', label: 'Tin tuc' },
  { to: '/admin/reports', icon: 'bi-bar-chart-line', label: 'Thong ke & Bao cao' },
  { to: '/admin/inventory', icon: 'bi-box-seam', label: 'Ton kho' },
  { to: '/admin/shifts', icon: 'bi-calendar-week', label: 'Lich lam viec' },
  { section: 'He thong' },
  { to: '/admin/settings', icon: 'bi-gear', label: 'Cau hinh' },
  { to: '/admin/logs', icon: 'bi-clipboard-data', label: 'Logs he thong' }
]

const SidebarNav = ({ onNavigate }) => (
  <div className="d-flex flex-column h-100">
    <div className="d-flex align-items-center mb-4">
      <div
        className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center me-2"
        style={{ width: 42, height: 42 }}
      >
        <i className="bi bi-speedometer2 fs-5" />
      </div>
      <div>
        <div className="fw-bold text-white">FatFood Admin</div>
        <small className="text-white-50">Control Panel</small>
      </div>
    </div>
    <nav className="nav flex-column gap-1 flex-grow-1 overflow-auto pe-1">
      {ADMIN_LINKS.map((item) => {
        if (item.section) {
          return (
            <span className="text-uppercase text-white-50 fs-6 mt-3 mb-1" key={item.section}>
              {item.section}
            </span>
          )
        }
        return (
          <NavLink
            end={item.exact}
            key={item.to}
            to={item.to}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center ${isActive ? 'text-white' : 'text-white-50'}`
            }
            style={({ isActive }) => ({
              borderRadius: 12,
              padding: '0.75rem 1rem',
              fontWeight: 500,
              backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent'
            })}
          >
            <i className={`bi ${item.icon} me-2`} /> {item.label}
          </NavLink>
        )
      })}
    </nav>
  </div>
)

const AdminLayout = () => {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const session = outletContext?.session
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const handleLogout = async (event) => {
    event.preventDefault()
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="d-flex min-vh-100 bg-body-secondary">
      <aside
        className="d-none d-lg-flex flex-column p-3 text-white flex-shrink-0"
        style={{ width: 260, minWidth: 260, flex: '0 0 260px', background: '#111c44' }}
      >
        <SidebarNav />
        <div className="mt-auto pt-4">
          <button type="button" className="btn btn-outline-light w-100" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2" />
            Dang xuat
          </button>
          <div className="text-white-50 small mt-3">&copy; {new Date().getFullYear()} FatFood</div>
        </div>
      </aside>
      <main className="flex-grow-1 d-flex flex-column">
        <header className="py-3 px-3 px-md-4 bg-white border-bottom d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-outline-primary d-lg-none"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mo menu quan tri"
            >
              <i className="bi bi-list fs-4" />
            </button>
            <div className="position-relative d-none d-md-block">
              <i className="bi bi-search position-absolute text-muted" style={{ top: 10, left: 12 }} />
              <input className="form-control ps-5 rounded-pill" type="search" placeholder="Tim kiem nhanh..." />
            </div>
          </div>
          <div className="d-flex align-items-center gap-3 ms-auto">
            <button type="button" className="btn btn-light rounded-circle position-relative">
              <i className="bi bi-bell" />
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">3</span>
            </button>
            <div className="d-flex align-items-center gap-2">
              <div
                className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 40, height: 40 }}
              >
                <i className="bi bi-person" />
              </div>
              <div>
                <div className="fw-semibold">
                  {session?.user?.full_name || session?.user?.username || 'Administrator'}
                </div>
                <small className="text-muted text-uppercase">
                  {(session?.user?.role || 'Admin').toString().toUpperCase()}
                </small>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-grow-1">
          <div className="container-fluid py-4 px-3 px-md-4">
            <Outlet context={{ session }} />
          </div>
        </div>
      </main>
      {mobileSidebarOpen && (
        <div className="mobile-sidebar-overlay d-lg-none">
          <div className="mobile-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="mobile-sidebar-panel text-white">
            <div className="d-flex justify-content-end mb-3">
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Dong menu"
                onClick={() => setMobileSidebarOpen(false)}
              />
            </div>
            <SidebarNav onNavigate={() => setMobileSidebarOpen(false)} />
            <div className="mt-4 pt-3 border-top border-light-subtle">
              <button type="button" className="btn btn-outline-light w-100" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2" />
                Dang xuat
              </button>
              <div className="text-white-50 small mt-3 text-center">
                &copy; {new Date().getFullYear()} FatFood
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default AdminLayout
