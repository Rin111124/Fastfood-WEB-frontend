import { useEffect, useMemo, useState } from "react"
import AdminStatusAlert from "../../../components/admin/AdminStatusAlert"
import StatCard from "../../../components/dashboard/StatCard"
import TrendAreaChart from "../../../components/dashboard/TrendAreaChart"
import StatusDistribution from "../../../components/dashboard/StatusDistribution"
import TopProducts from "../../../components/dashboard/TopProducts"
import OrdersTable from "../../../components/dashboard/OrdersTable"
import Spinner from "../../../components/common/Spinner"
import apiFetch from "../../../services/apiClient"
import { formatCurrency, formatMonthLabel, formatNumber } from "../../../utils/format"
import "../../../styles/dashboard.css"

const defaultMetrics = {
  counters: { users: 0, orders: 0, revenueToday: 0 },
  ordersByStatus: [],
  topProducts: [],
  revenueByMonth: []
}

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [recentOrders, setRecentOrders] = useState([])
  const [staffSnapshot, setStaffSnapshot] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState("")
  const [statusType, setStatusType] = useState("info")

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [metricsRes, ordersRes, staffRes] = await Promise.all([
          apiFetch("/api/admin/dashboard"),
          apiFetch("/api/admin/orders?limit=8"),
          apiFetch("/api/admin/staff?limit=6")
        ])

        if (!metricsRes.ok) {
          throw new Error("Không thể tải dữ liệu bảng điều khiển")
        }

        const metricsPayload = await metricsRes.json()
        const ordersPayload = ordersRes.ok ? await ordersRes.json() : { data: [] }
        const staffPayload = staffRes.ok ? await staffRes.json() : { data: [] }

        if (!cancelled) {
          setMetrics(metricsPayload?.data || defaultMetrics)
          setRecentOrders(Array.isArray(ordersPayload?.data) ? ordersPayload.data : [])
          setStaffSnapshot(Array.isArray(staffPayload?.data) ? staffPayload.data : [])
          setStatusMessage("")
          setStatusType("info")
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error.message)
          setStatusType("error")
          setMetrics(defaultMetrics)
          setRecentOrders([])
          setStaffSnapshot([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])

  const counters = useMemo(() => metrics?.counters || {}, [metrics])
  const ordersByStatus = useMemo(() => metrics?.ordersByStatus || [], [metrics])
  const topProducts = useMemo(() => metrics?.topProducts || [], [metrics])
  const revenueByMonth = useMemo(() => metrics?.revenueByMonth || [], [metrics])

  const chartData = useMemo(() => {
    if (!revenueByMonth.length) return { labels: [], values: [] }
    const reversed = [...revenueByMonth].reverse()
    return {
      labels: reversed.map((item) => formatMonthLabel(item.month)),
      values: reversed.map((item) => Number(item.revenue || 0))
    }
  }, [revenueByMonth])

  const completionRate = useMemo(() => {
    const total = ordersByStatus.reduce((sum, item) => sum + Number(item.count || 0), 0)
    if (!total) return 0
    const completed = ordersByStatus.find((item) => item.status === "completed")
    return Math.round(((completed?.count || 0) / total) * 100)
  }, [ordersByStatus])

  const escalationRate = useMemo(() => {
    const total = ordersByStatus.reduce((sum, item) => sum + Number(item.count || 0), 0)
    if (!total) return 0
    const canceled = ordersByStatus.find((item) => item.status === "canceled")
    return Math.round(((canceled?.count || 0) / total) * 100)
  }, [ordersByStatus])

  return (
    <div className="pb-4">
      <div className="glass-card p-4 p-lg-5 mb-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-4">
          <div>
            <p className="dashboard-section-title text-muted mb-2">Tổng quan vận hành</p>
            <h1 className="display-6 fw-bold mb-3">Chào mừng trở lại, Admin!</h1>
            <p className="text-secondary mb-0">
              Theo dõi doanh thu, đơn hàng và hiệu suất nhân viên theo thời gian thực. Dữ liệu cập nhật liên tục.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <a href="#orders" className="btn btn-warning text-white px-4">
              <i className="bi bi-lightning-charge-fill me-2" />
              Tạo đơn nhanh
            </a>
            <a href="#reports" className="btn btn-outline-dark px-4">
              <i className="bi bi-bar-chart-line me-2" />
              Xem báo cáo
            </a>
          </div>
        </div>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      {loading ? (
        <Spinner message="Đang tải dữ liệu bảng điều khiển..." />
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Doanh thu hôm nay"
                value={formatCurrency(counters.revenueToday)}
                icon="bi-cash-stack"
                variant="primary"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Tổng đơn hàng"
                value={formatNumber(counters.orders)}
                icon="bi-receipt-cutoff"
                variant="info"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Khách hàng hoạt động"
                value={formatNumber(counters.users)}
                icon="bi-people-fill"
                variant="success"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <StatCard
                title="Tỷ lệ hoàn tất"
                value={`${completionRate}%`}
                delta={`${escalationRate}%`}
                deltaLabel="Tỷ lệ huỷ"
                icon="bi-graph-up-arrow"
                variant="warning"
              />
            </div>
          </div>

          <div className="row g-4 mb-4" id="reports">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <p className="dashboard-section-title text-muted mb-1">Doanh thu</p>
                    <h5 className="mb-0">Xu hướng doanh thu 6 tháng gần nhất</h5>
                  </div>
                  <span className="badge bg-warning-subtle text-warning">Đang cập nhật</span>
                </div>
                <div className="card-body">
                  {chartData.labels.length ? (
                    <TrendAreaChart labels={chartData.labels} data={chartData.values} seriesLabel="Doanh thu (VND)" />
                  ) : (
                    <p className="text-muted small mb-0">Chưa có dữ liệu doanh thu được ghi nhận.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0">
                  <p className="dashboard-section-title text-muted mb-1">Đơn hàng</p>
                  <h5 className="mb-0">Trạng thái xử lý</h5>
                </div>
                <div className="card-body">
                  <StatusDistribution data={ordersByStatus} />
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-7" id="orders">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <p className="dashboard-section-title text-muted mb-1">Đơn gần đây</p>
                    <h5 className="mb-0">Hoạt động mới nhất</h5>
                  </div>
                </div>
                <div className="card-body">
                  <OrdersTable orders={recentOrders} />
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                  <div>
                    <p className="dashboard-section-title text-muted mb-1">Nhân viên</p>
                    <h5 className="mb-0">Trực tuyến & ca gần nhất</h5>
                  </div>
                </div>
                <div className="card-body d-flex flex-column gap-3">
                  {staffSnapshot.length ? (
                    staffSnapshot.map((staff) => (
                      <div key={staff.user_id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{staff.full_name || staff.username}</div>
                          <small className="text-muted">Vai trò: {staff.role || "staff"}</small>
                        </div>
                        <span className="badge bg-success-subtle text-success">Đang trực</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted small mb-0">Chưa có dữ liệu nhân viên.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0" id="top-products">
            <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
              <div>
                <p className="dashboard-section-title text-muted mb-1">Sản phẩm</p>
                <h5 className="mb-0">Top món bán chạy</h5>
              </div>
            </div>
            <div className="card-body">
              <TopProducts products={topProducts} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard
