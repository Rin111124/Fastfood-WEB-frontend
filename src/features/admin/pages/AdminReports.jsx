import { useEffect, useMemo, useState } from 'react'
import AdminStatusAlert from '../../../components/admin/AdminStatusAlert'
import Spinner from '../../../components/common/Spinner'
import TrendAreaChart from '../../../components/dashboard/TrendAreaChart'
import StatusDistribution from '../../../components/dashboard/StatusDistribution'
import TopProducts from '../../../components/dashboard/TopProducts'
import adminApi from '../../../services/adminApi'
import { formatCurrency, formatDate, formatNumber } from '../../../utils/format'

const AdminReports = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [report, setReport] = useState({
    revenueByDay: [],
    ordersStatus: [],
    topProducts: []
  })

  const loadReports = async () => {
    setLoading(true)
    setStatusMessage('')
    setStatusType('info')
    try {
      const data = await adminApi.getReportOverview()
      setReport({
        revenueByDay: data?.revenueByDay || [],
        ordersStatus: data?.ordersStatus || [],
        topProducts: data?.topProducts || []
      })
    } catch (error) {
      setStatusMessage(error.message)
      setStatusType('error')
      setReport({ revenueByDay: [], ordersStatus: [], topProducts: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const revenueChart = useMemo(() => {
    const list = Array.isArray(report.revenueByDay) ? [...report.revenueByDay].reverse() : []
    return {
      labels: list.map((item) => formatDate(item.date)),
      values: list.map((item) => Number(item.revenue || 0))
    }
  }, [report.revenueByDay])

  const topProductRows = useMemo(
    () =>
      (report.topProducts || []).map((item, index) => ({
        ...item,
        rank: index + 1
      })),
    [report.topProducts]
  )

  const totalRevenue = useMemo(
    () => report.revenueByDay.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    [report.revenueByDay]
  )

  const totalOrders = useMemo(
    () => report.ordersStatus.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [report.ordersStatus]
  )

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 mb-1">Thong ke va bao cao</h1>
        <p className="text-muted mb-0">
          Phan tich doanh thu, so lieu don hang, top mon ban chay va ty le khach quay lai.
        </p>
      </div>

      <AdminStatusAlert message={statusMessage} type={statusType} />

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <Spinner label="Dang tai du lieu bao cao..." />
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-uppercase text-muted small fw-semibold mb-2">Tong quan</h6>
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <small className="text-muted text-uppercase">Tong doanh thu 14 ngay</small>
                      <div className="h4 fw-semibold mb-0">{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div>
                      <small className="text-muted text-uppercase">Tong don hang</small>
                      <div className="h4 fw-semibold mb-0">{formatNumber(totalOrders)}</div>
                    </div>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadReports}>
                      Lam moi bao cao
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-uppercase text-muted small fw-semibold mb-1">Doanh thu</h6>
                      <h5 className="mb-0">Xu huong 14 ngay gan nhat</h5>
                    </div>
                    <span className="badge bg-warning-subtle text-warning">Live</span>
                  </div>
                  {revenueChart.labels.length ? (
                    <TrendAreaChart labels={revenueChart.labels} data={revenueChart.values} seriesLabel="Doanh thu (VND)" />
                  ) : (
                    <p className="text-muted small mb-0">Chua co du lieu doanh thu de hien thi.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-uppercase text-muted small fw-semibold mb-1">Trang thai xu ly</h6>
                      <h5 className="mb-0">Phan bo don hang</h5>
                    </div>
                  </div>
                  <StatusDistribution data={report.ordersStatus} />
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="text-uppercase text-muted small fw-semibold mb-1">Top mon ban chay</h6>
                      <h5 className="mb-0">Dong gop doanh thu</h5>
                    </div>
                  </div>
                  {topProductRows.length ? (
                    <TopProducts products={topProductRows} />
                  ) : (
                    <p className="text-muted small mb-0">Chua co du lieu ban hang cho top san pham.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0">
              <h5 className="mb-0">Ban ghi doanh thu chi tiet</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngay</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.revenueByDay.map((item) => (
                      <tr key={item.date}>
                        <td>{formatDate(item.date)}</td>
                        <td>{formatCurrency(item.revenue)}</td>
                      </tr>
                    ))}
                    {!report.revenueByDay.length && (
                      <tr>
                        <td colSpan={2} className="text-center text-muted py-4">
                          Chua co du lieu doanh thu trong khoang thoi gian nay.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminReports

