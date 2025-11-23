import PropTypes from 'prop-types'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { readSession } from '../lib/session'

const ProtectedRoute = ({ allowRoles }) => {
  const location = useLocation()
  const session = readSession()

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const role = (session?.user?.role || '').toLowerCase()
  if (allowRoles && allowRoles.length) {
    const allowed = allowRoles.map((item) => item.toLowerCase())
    if (!allowed.includes(role)) {
      const fallback = (() => {
        switch (role) {
          case 'admin':
            return '/admin'
          case 'staff':
            return '/staff'
          case 'customer':
            return '/customer'
          case 'shipper':
            return '/dashboard'
          default:
            return '/'
        }
      })()
      return <Navigate to={fallback} replace />
    }
  }

  return <Outlet context={{ session }} />
}

ProtectedRoute.propTypes = {
  allowRoles: PropTypes.arrayOf(PropTypes.string)
}

export default ProtectedRoute
