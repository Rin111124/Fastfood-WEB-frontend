import PropTypes from 'prop-types'

const VARIANT_MAP = {
  error: 'danger',
  success: 'success',
  info: 'info'
}

const AdminStatusAlert = ({ message, type = 'info' }) => {
  if (!message) return null
  const variant = VARIANT_MAP[type] || 'info'
  return (
    <div className={`alert alert-${variant} d-flex align-items-center`} role="alert">
      <i className="bi bi-info-circle-fill me-2" />
      <div>{message}</div>
    </div>
  )
}

AdminStatusAlert.propTypes = {
  message: PropTypes.string,
  type: PropTypes.string
}

export default AdminStatusAlert
