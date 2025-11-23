import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import staffApi from '../../../services/staffApi'
import { formatCurrency, formatDateTime } from '../../../utils/format'

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'delivering',
  'shipping',
  'completed',
  'canceled'
]

const StaffOrders = () => {
  const outlet = useOutletContext()
  const session = outlet?.session
  const staffId = session?.user?.user_id

  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')

  const loadOrders = async (statusParam = filter) => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await staffApi.listOrders({
        status: statusParam,
        staffId
      })
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders('all')
  }, [])

  const handleFilterChange = async (event) => {
    const value = event.target.value
    setFilter(value)
    await loadOrders(value)
  }

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await staffApi.updateOrderStatus(orderId, status, staffId)
      setStatusMessage('Da cap nhat trang thai don hang')
      setStatusType('success')
      await loadOrders(filter)
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
        <div>
          <h5 className="mb-1">Don hang cua toi</h5>
          <p className="text-muted mb-0">Theo doi tien trinh va cap nhat trang thai don hang.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="text-muted small">Trang thai:</span>
          <select className="form-select" value={filter} onChange={handleFilterChange}>
            <option value="all">Tat ca</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card-body">
        <AdminStatusAlert message={statusMessage} type={statusType} />
        {loading ? (
          <div className="text-center py-4">
            <Spinner label="Dang tai don hang..." />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Khach hang</th>
                  <th>Trang thai</th>
                  <th>Tong tien</th>
                  <th>Chi tiet</th>
                  <th className="text-end">Cap nhat</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="fw-semibold">#{order.order_id}</td>
                    <td>
                      <div className="fw-semibold text-capitalize">
                        {order.User?.full_name || order.User?.username || 'Khach le'}
                      </div>
                      <div className="text-muted small">
                        Tao: {formatDateTime(order.created_at || order.order_date)}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border text-capitalize">{order.status}</span>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <span>{formatCurrency(order.total_amount)}</span>
                        {typeof order.delivery_fee !== 'undefined' && (
                          <small className="text-muted">
                            Phi ship: {formatCurrency(Number(order.delivery_fee || 0))}
                          </small>
                        )}
                      </div>
                    </td>
                    <td style={{ minWidth: '16rem' }}>
                      <ul className="list-unstyled mb-0 small">
                        {order.items?.map((item) => (
                          <li key={`${order.order_id}-${item.order_item_id}`}>
                            {item.quantity}x {item.Product?.name || 'San pham'}{' '}
                            <span className="text-muted">({formatCurrency(item.price)})</span>
                          </li>
                        )) || <li className="text-muted">Chua co chi tiet</li>}
                        <li className="mt-2 text-muted">
                          Tien hang:{' '}
                          {formatCurrency(
                            order.items_subtotal !== undefined
                              ? order.items_subtotal
                              : (order.items || []).reduce(
                                  (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
                                  0
                                )
                          )}
                        </li>
                        <li className="text-muted">
                          Phi ship: {formatCurrency(Number(order.delivery_fee || 0))}
                        </li>
                        <li className="fw-semibold">Tong: {formatCurrency(order.total_amount)}</li>
                      </ul>
                    </td>
                    <td className="text-end" style={{ width: '14rem' }}>
                      <div className="d-flex gap-2 justify-content-end">
                        {ORDER_STATUSES.map((status) => (
                          <button
                            key={`${order.order_id}-${status}`}
                            type="button"
                            className={`btn btn-sm ${
                              status === order.status ? 'btn-secondary disabled' : 'btn-outline-secondary'
                            }`}
                            onClick={() => handleStatusUpdate(order.order_id, status)}
                            disabled={status === order.status}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Khong co don hang nao khop voi bo loc hien tai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffOrders

