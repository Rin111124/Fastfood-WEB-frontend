import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { clearSession } from '../lib/session'
import staffApi from '../services/staffApi'
import { connectSocket } from '../lib/socket'

const STAFF_LINKS = [
  { to: '/staff', icon: 'bi-house-door', label: 'Tong quan', exact: true },
  { to: '/staff/orders', icon: 'bi-receipt', label: 'Don hang' },
  { to: '/staff/menu', icon: 'bi-egg-fried', label: 'Mon an' },
  { to: '/staff/support', icon: 'bi-chat-dots', label: 'Ho tro khach' },
  { to: '/staff/inventory', icon: 'bi-box', label: 'Ton kho' },
  { to: '/staff/performance', icon: 'bi-trophy', label: 'Hieu suat' },
  { to: '/staff/shifts', icon: 'bi-calendar-check', label: 'Lich truc' }
]

const StaffSidebar = ({ onNavigate, supportUnreplied = 0 }) => (
  <div className="d-flex flex-column h-100">
    <div className="d-flex align-items-center mb-4">
      <div
        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
        style={{ width: 40, height: 40 }}
      >
        <i className="bi bi-lightning-charge" />
      </div>
      <div>
        <div className="fw-bold text-white">FatFood Staff</div>
        <small className="text-white-50">Workspace</small>
      </div>
    </div>
    <nav className="nav flex-column gap-1 flex-grow-1 overflow-auto pe-1">
      {STAFF_LINKS.map((item) => (
        <NavLink
          end={item.exact}
          key={item.to}
          to={item.to}
          onClick={() => onNavigate?.()}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center ${isActive ? 'text-white' : 'text-white-50'}`
          }
          style={({ isActive }) => ({
            borderRadius: 10,
            fontWeight: 500,
            padding: '0.65rem 0.9rem',
            backgroundColor: isActive ? 'rgba(81,113,255,0.18)' : 'transparent'
          })}
        >
          <i className={`bi ${item.icon} me-2`} /> {item.label}
          {item.to === '/staff/support' && supportUnreplied > 0 && (
            <span className="badge rounded-pill bg-danger ms-auto">{supportUnreplied}</span>
          )}
        </NavLink>
      ))}
    </nav>
  </div>
)

const StaffLayout = () => {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const session = outletContext?.session
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [supportUnreplied, setSupportUnreplied] = useState(0)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await staffApi.getSupportMetrics()
        setSupportUnreplied(Number(data?.unrepliedCount || 0))
      } catch {}
    }
    fetchMetrics()
    const socket = connectSocket()
    const onNew = () => setSupportUnreplied((c) => c + 1)
    const onReplied = () => setSupportUnreplied((c) => (c > 0 ? c - 1 : 0))
    socket.on('support:new', onNew)
    socket.on('support:replied', onReplied)
    return () => {
      socket.off('support:new', onNew)
      socket.off('support:replied', onReplied)
    }
  }, [])

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="d-flex min-vh-100 bg-light">
      <aside
        className="d-none d-lg-flex flex-column text-white p-3"
        style={{ width: 240, background: '#1a2332', borderRight: '1px solid rgba(17,28,68,0.25)' }}
      >
        <StaffSidebar supportUnreplied={supportUnreplied} />
        <div className="mt-auto pt-4 d-flex flex-column gap-2">
          <NavLink to="/admin" className="btn btn-outline-light" onClick={() => setMobileSidebarOpen(false)}>
            <i className="bi bi-speedometer2 me-2" />
            Quan tri
          </NavLink>
          <button type="button" className="btn btn-outline-light border-opacity-50" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2" />
            Dang xuat
          </button>
          <div className="text-white-50 small text-center mt-2">
            &copy; {new Date().getFullYear()} FatFood
          </div>
        </div>
      </aside>
      <main className="flex-grow-1 d-flex flex-column">
        <header className="py-3 px-3 px-md-4 bg-white border-bottom d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-primary d-lg-none"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mo menu nhan vien"
            >
              <i className="bi bi-list fs-4" />
            </button>
            <div>
              <h1 className="h5 mb-1">Bang dieu khien nhan vien</h1>
              <small className="text-muted">
                Chao {session?.user?.full_name || session?.user?.username || 'ban'}, chuc mot ngay lam viec hieu qua!
              </small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-light border rounded-circle">
              <i className="bi bi-bell" />
            </button>
            <div className="d-flex align-items-center gap-2">
              <div
                className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 38, height: 38 }}
              >
                <i className="bi bi-person" />
              </div>
              <div className="d-none d-sm-block">
                <div className="fw-semibold">{session?.user?.full_name || session?.user?.username || 'Staff'}</div>
                <small className="text-muted text-uppercase">{(session?.user?.role || 'staff').toString()}</small>
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
          <aside className="mobile-sidebar-panel text-white" style={{ background: '#1a2332' }}>
            <div className="d-flex justify-content-end mb-3">
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Dong menu"
                onClick={() => setMobileSidebarOpen(false)}
              />
            </div>
            <StaffSidebar onNavigate={() => setMobileSidebarOpen(false)} supportUnreplied={supportUnreplied} />
            <div className="mt-4 pt-3 border-top border-light-subtle d-flex flex-column gap-2">
              <NavLink to="/admin" className="btn btn-outline-light" onClick={() => setMobileSidebarOpen(false)}>
                <i className="bi bi-speedometer2 me-2" />
                Quan tri
              </NavLink>
              <button type="button" className="btn btn-outline-light border-opacity-50" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2" />
                Dang xuat
              </button>
              <div className="text-white-50 small text-center mt-2">
                &copy; {new Date().getFullYear()} FatFood
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default StaffLayout
