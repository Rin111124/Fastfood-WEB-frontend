import { Link } from 'react-router-dom'

const Landing = () => (
  <div className="container py-5 text-center px-3 px-md-5">
    <h1 className="display-5 fw-bold mb-3">FatFood Workspace</h1>
    <p className="lead mb-4">
      Chon khu vuc lam viec phu hop de tiep tuc quan ly he thong va ho tro khach hang.
    </p>
    <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
      <Link to="/admin" className="btn btn-primary btn-lg px-4 py-3">
        Quan tri vien
      </Link>
      <Link to="/staff" className="btn btn-outline-secondary btn-lg px-4 py-3">
        Nhan vien
      </Link>
    </div>
  </div>
)

export default Landing
