import { useEffect, useMemo, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import StatCard from '../../../components/dashboard/StatCard'
import OrdersTable from '../../../components/dashboard/OrdersTable'
import Spinner from '../../../components/common/Spinner'
import apiFetch from '../../../services/apiClient'
import { formatDate, formatNumber } from '../../../utils/format'
import useSocket, { useSocketEvent } from '../../../hooks/useSocket'
import '../../../styles/dashboard.css'

const defaultDashboard = {
  assigned: 0,
  completed: 0,
  canceled: 0,
  upcomingShifts: []
}

const StaffDashboard = () => {
  const { session } = useOutletContext() || {}
  const role = (session?.user?.role || '').toLowerCase()
  const myStaffId = session?.user?.user_id ? String(session.user.user_id) : ''
  const isAdmin = role === 'admin'

  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [dashboard, setDashboard] = useState(defaultDashboard)
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [performance, setPerformance] = useState({ completedOrders: 0, totalOrders: 0, completionRate: 0, rating: 'N/A' })
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')

  const completionRate = useMemo(() => {
    const total = dashboard.assigned || performance.totalOrders
    if (!total) return 0
    return Math.round(((dashboard.completed || performance.completedOrders) / total) * 100)
  }, [dashboard, performance])

  const cancellationRate = useMemo(() => {
    const total = dashboard.assigned || performance.totalOrders
    if (!total) return 0
    return Math.round(((dashboard.canceled || 0) / total) * 100)
  }, [dashboard])

  const loadStaffList = async () => {
    try {
      const response = await apiFetch('/api/admin/staff?limit=100')
      if (!response.ok) throw new Error('Khong the tai danh sach nhan vien')
      const payload = await response.json()
      const data = Array.isArray(payload?.data) ? payload.data : []
      setStaffList(data)
      if (data.length && !selectedStaffId) {
        setSelectedStaffId(String(data[0].user_id))
      }
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setStaffList([])
    }
  }

  const loadStaffData = async (staffId) => {
    if (!staffId) return
    setLoading(true)
    try {
      const [dashboardRes, ordersRes, performanceRes, shiftsRes, inventoryRes] = await Promise.all([
        apiFetch(`/api/staff/dashboard?staffId=${staffId}`),
        apiFetch(`/api/staff/orders?staffId=${staffId}`),
        apiFetch(`/api/staff/performance?staffId=${staffId}`),
        apiFetch(`/api/staff/shifts?staffId=${staffId}`),
        apiFetch(`/api/staff/inventory`)
      ])

      if (!dashboardRes.ok) throw new Error('Khong the tai du lieu bang dieu khien')

      const dashboardPayload = await dashboardRes.json()
      const ordersPayload = ordersRes.ok ? await ordersRes.json() : { data: [] }
      const performancePayload = performanceRes.ok ? await performanceRes.json() : { data: performance }
      const shiftsPayload = shiftsRes.ok ? await shiftsRes.json() : { data: [] }
      const inventoryPayload = inventoryRes.ok ? await inventoryRes.json() : { data: [] }

      setDashboard({
        ...(dashboardPayload?.data || defaultDashboard),
        upcomingShifts: Array.isArray(shiftsPayload?.data) ? shiftsPayload.data.slice(0, 5) : []
      })
      setOrders(Array.isArray(ordersPayload?.data) ? ordersPayload.data.slice(0, 8) : [])
      setPerformance(performancePayload?.data || performance)
      setInventory(Array.isArray(inventoryPayload?.data) ? inventoryPayload.data.slice(0, 5) : [])
      setStatusMessage('')
      setStatusType('info')
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setDashboard(defaultDashboard)
      setOrders([])
      setPerformance({ completedOrders: 0, totalOrders: 0, completionRate: 0, rating: 'N/A' })
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  // Socket.IO for realtime updates
  const { socket, connected } = useSocket({ autoConnect: true })

  // Handle new order assigned
  const handleOrderAssigned = useCallback((data) => {
    console.log('🆕 New order assigned:', data)
    const staffId = String(data.staff_id || '')
    const currentStaffId = selectedStaffId || myStaffId

    // Only reload if this order is for current staff
    if (staffId === currentStaffId) {
      setStatusMessage(`Don hang #${data.order_id} moi duoc giao cho ban!`)
      setStatusType('success')
      // Reload dashboard after short delay
      setTimeout(() => loadStaffData(currentStaffId), 500)
    }
  }, [selectedStaffId, myStaffId])

  // Handle KDS tasks created (all staff see this)
  const handleKdsTasksCreated = useCallback((data) => {
    console.log('🍳 New KDS tasks:', data)
    setStatusMessage(`Don hang #${data.order_id} can chuan bi tai: ${data.station_codes?.join(', ')}`)
    setStatusType('info')
    // Auto-clear after 5s
    setTimeout(() => setStatusMessage(''), 5000)
  }, [])

  // Handle order status updates
  const handleOrderUpdated = useCallback((data) => {
    console.log('🔄 Order updated:', data)
    const currentStaffId = selectedStaffId || myStaffId
    if (currentStaffId) {
      // Reload to get fresh data
      loadStaffData(currentStaffId)
    }
  }, [selectedStaffId, myStaffId])

  // Register socket listeners
  useSocketEvent('order:assigned', handleOrderAssigned, socket)
  useSocketEvent('kds:tasks:created', handleKdsTasksCreated, socket)
  useSocketEvent('orders:payment-updated', handleOrderUpdated, socket)

  useEffect(() => {
    if (isAdmin) {
      loadStaffList()
    } else if (myStaffId) {
      setSelectedStaffId(myStaffId)
    }
  }, [isAdmin, myStaffId])

  useEffect(() => {
    if (selectedStaffId) {
      loadStaffData(selectedStaffId)
    }
  }, [selectedStaffId])

  return (
    <div className="pb-4">
      <div className="glass-card p-4 p-lg-5 mb-4 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-4">
        <div>
          <p className="dashboard-section-title text-muted mb-2">GOC VAN HANH</p>
          <h1 className="h4 fw-bold mb-2">
            Xin chao {session?.user?.full_name || session?.user?.username || 'Nhan vien'}
            {connected && <span className="badge bg-success ms-2 fs-6">🟢 Trực tuyến</span>}
            {!connected && <span className="badge bg-secondary ms-2 fs-6">⚫ Ngoại tuyến</span>}
          </h1>
          <p className="text-secondary mb-0">
            Theo doi trang thai don hang, lich truc va yeu cau tu khach hang ngay tai day.
          </p>
        </div>
        {isAdmin ? (
          <div className="d-flex align-items-center gap-2">
            <label className="text-muted small mb-0">Chon nhan vien:</label>
            <select
              name="staffId"
              className="form-select form-select-sm"
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
            >
              {staffList.map((staff) => (
                <option key={staff.user_id} value={staff.user_id}>
                  {staff.full_name || staff.username}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-muted small">Ban dang xem du lieu ca nhan cua minh.</div>
        )}
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      {loading ? (
        <Spinner message="Dang tai bang dieu khien nhan vien..." />
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Don duoc giao"
                value={formatNumber(dashboard.assigned)}
                variant="info"
                icon="bi-inboxes-fill"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Da hoan thanh"
                value={formatNumber(dashboard.completed)}
                variant="success"
                icon="bi-check2-circle"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Bi huy"
                value={formatNumber(dashboard.canceled)}
                variant="warning"
                icon="bi-x-circle"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Ti le thao tac"
                value={`${completionRate}%`}
                delta={`${cancellationRate}%`}
                deltaLabel="Ti le huy"
                variant="primary"
                icon="bi-speedometer"
              />
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-xl-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <p className="dashboard-section-title text-muted mb-1">DON HANG</p>
                    <h5 className="mb-0">Danh sach don hang cua ban</h5>
                  </div>
                  <a href="/staff/orders" className="btn btn-sm btn-outline-secondary">
                    Quan ly don hang
                  </a>
                </div>
                <div className="card-body">
                  <OrdersTable orders={orders} />
                </div>
              </div>
            </div>
            <div className="col-xl-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0">
                  <p className="dashboard-section-title text-muted mb-1">LICH TRUC</p>
                  <h5 className="mb-0">Ca lam viec sap toi</h5>
                </div>
                <div className="card-body">
                  {dashboard.upcomingShifts.length ? (
                    <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                      {dashboard.upcomingShifts.map((shift) => (
                        <li key={`${shift.shift_id}-${shift.shift_date}`} className="d-flex align-items-center justify-content-between small">
                          <div>
                            <p className="fw-semibold mb-1">{formatDate(shift.shift_date)}</p>
                            <span className="badge bg-light text-dark border me-2">
                              {shift.start_time} - {shift.end_time}
                            </span>
                            <span className="text-muted">{shift.note || 'Khong co ghi chu'}</span>
                          </div>
                          <span
                            className={clsx(
                              'badge rounded-pill px-3 py-2 text-uppercase',
                              shift.status === 'confirmed' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'
                            )}
                          >
                            {shift.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted small mb-0">Ban chua co lich truc trong tuan nay.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-xl-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0">
                  <p className="dashboard-section-title text-muted mb-1">HIEU SUAT</p>
                  <h5 className="mb-0">Tong quan hieu suat ban hang</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Don hoan thanh</span>
                      <span className="fw-semibold">{formatNumber(performance.completedOrders)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Tong don</span>
                      <span className="fw-semibold">{formatNumber(performance.totalOrders)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Ti le hoan thanh</span>
                      <span className="fw-semibold text-success">{performance.completionRate}%</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Danh gia trung binh</span>
                      <span className="fw-semibold">{performance.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0">
                  <p className="dashboard-section-title text-muted mb-1">TON KHO</p>
                  <h5 className="mb-0">Nguyen lieu can luu y</h5>
                </div>
                <div className="card-body">
                  {inventory.length ? (
                    <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                      {inventory.map((item) => (
                        <li key={item.inventory_id || item.product_id} className="d-flex align-items-center justify-content-between">
                          <div>
                            <p className="mb-0 fw-semibold">{item.Product?.name || item.product_name || 'San pham'}</p>
                            <small className="text-muted">
                              So luong con: {formatNumber(item.quantity_available || item.quantity || 0)} | Muc bao dong:{' '}
                              {formatNumber(item.reorder_level || 0)}
                            </small>
                          </div>
                          <span className="badge bg-warning-subtle text-warning">
                            Cap nhat: {formatDate(item.updated_at || item.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted small mb-0">Chua co du lieu ton kho.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StaffDashboard

