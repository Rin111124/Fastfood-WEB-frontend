import PropTypes from 'prop-types'
import { formatNumber } from '../../utils/format'

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  delivering: 'primary',
  completed: 'success',
  canceled: 'danger',
  refunded: 'secondary'
}

const StatusDistribution = ({ data }) => {
  if (!data.length) {
    return <p className="text-muted small mb-0">Chua co don hang nao.</p>
  }
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1
  return (
    <div className="d-flex flex-column gap-3">
      {data.map((item) => {
        const ratio = Number(item.count || 0) / total
        return (
          <div key={item.status}>
            <div className="d-flex justify-content-between align-items-center mb-1 small fw-semibold">
              <span className="text-capitalize">{item.status}</span>
              <span>{formatNumber(item.count)}</span>
            </div>
            <div className="progress" style={{ height: 8, borderRadius: 999 }}>
              <div
                className={`progress-bar bg-${statusColors[item.status] || 'secondary'}`}
                role="progressbar"
                style={{ width: `${ratio * 100}%` }}
                aria-valuenow={ratio * 100}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

StatusDistribution.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.string.isRequired,
      count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  )
}

StatusDistribution.defaultProps = {
  data: []
}

export default StatusDistribution
