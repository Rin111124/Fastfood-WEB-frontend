import PropTypes from 'prop-types'
import clsx from 'clsx'
import { formatCurrency, formatDateTime } from '../../utils/format'

const statusClassMap = {
  pending: 'text-warning bg-warning-subtle',
  confirmed: 'text-info bg-info-subtle',
  delivering: 'text-primary bg-primary-subtle',
  completed: 'text-success bg-success-subtle',
  canceled: 'text-danger bg-danger-subtle',
  refunded: 'text-secondary bg-secondary-subtle'
}

const OrdersTable = ({ orders }) => {
  if (!orders.length) {
    return <p className="text-muted small mb-0">Chua co don hang gan day.</p>
  }
  return (
    <div className="table-responsive">
      <table className="table table-rounded align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Ma don</th>
            <th>Khach hang</th>
            <th>Thanh toan</th>
            <th>Trang thai</th>
            <th className="text-end">Tong tien</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_id}>
              <td className="fw-semibold">#{order.order_id}</td>
              <td>
                <div className="fw-semibold">{order.User?.full_name || order.User?.username || 'Khach le'}</div>
                <small className="text-muted">{formatDateTime(order.created_at || order.order_date)}</small>
              </td>
              <td>
                <span className="badge bg-light text-dark border">
                  {order.Payment?.payment_method || 'COD'}
                </span>
              </td>
              <td>
                <span className={clsx('badge rounded-pill px-3 py-2 text-capitalize', statusClassMap[order.status] || 'bg-secondary-subtle text-secondary')}>
                  {order.status}
                </span>
              </td>
              <td className="text-end fw-semibold">{formatCurrency(order.total_amount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

OrdersTable.propTypes = {
  orders: PropTypes.arrayOf(
    PropTypes.shape({
      order_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      User: PropTypes.shape({
        full_name: PropTypes.string,
        username: PropTypes.string
      }),
      Payment: PropTypes.shape({
        payment_method: PropTypes.string
      }),
      status: PropTypes.string,
      total_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      created_at: PropTypes.string,
      order_date: PropTypes.string
    })
  )
}

OrdersTable.defaultProps = {
  orders: []
}

export default OrdersTable
