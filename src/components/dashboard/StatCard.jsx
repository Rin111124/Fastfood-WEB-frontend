import PropTypes from 'prop-types'
import clsx from 'clsx'

const variantClasses = {
  primary: 'bg-gradient-primary text-white',
  success: 'bg-gradient-success text-white',
  warning: 'bg-gradient-warning text-dark',
  info: 'bg-gradient-info text-white',
  neutral: 'bg-white border'
}

const StatCard = ({ title, value, delta, deltaLabel, icon, variant = 'neutral' }) => {
  const isPositive = typeof delta === 'number' ? delta >= 0 : String(delta || '').startsWith('+')
  return (
    <div className={clsx('card shadow-sm border-0 h-100 stat-card', variantClasses[variant])}>
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <span className="text-uppercase small fw-semibold opacity-75">{title}</span>
            <h3 className="display-6 fw-bold mt-2 mb-0">{value}</h3>
          </div>
          {icon && (
            <span className="rounded-circle bg-white bg-opacity-25 text-white d-inline-flex align-items-center justify-content-center"
              style={{ width: 48, height: 48 }}>
              <i className={clsx('bi fs-4', icon)} />
            </span>
          )}
        </div>
        {delta !== undefined && (
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            <span className={clsx('badge rounded-pill px-3 py-2', isPositive ? 'bg-white text-success' : 'bg-white text-danger')}>
              {typeof delta === 'number' ? `${isPositive ? '+' : ''}${delta}%` : delta}
            </span>
            <span className="opacity-75">{deltaLabel || 'So voi ky truoc'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  delta: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  deltaLabel: PropTypes.string,
  icon: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'success', 'warning', 'info', 'neutral'])
}

export default StatCard
