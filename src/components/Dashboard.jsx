import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { readSession } from '../lib/session'
import CustomerDashboard from '../features/customer/pages/CustomerDashboard'

const Dashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const outlet = useOutletContext()
  const session = outlet?.session || location.state || readSession()

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true })
      return
    }
    const role = (session?.user?.role || '').toLowerCase()
    if (role === 'admin') {
      navigate('/admin', { replace: true })
    } else if (role === 'staff' || role === 'shipper') {
      navigate('/staff', { replace: true })
    } else if (location.pathname !== '/' && location.pathname !== '/dashboard') {
      navigate('/', { replace: true })
    }
  }, [navigate, session, location.pathname])

  if (!session?.token) {
    return <Navigate to="/login" replace />
  }

  const role = (session?.user?.role || '').toLowerCase()
  if (role === 'admin') {
    return null
  }
  if (role === 'staff' || role === 'shipper') {
    return null
  }

  return <CustomerDashboard />
}

export default Dashboard
