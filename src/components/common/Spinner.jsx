import PropTypes from 'prop-types'

const Spinner = ({ message = 'Dang tai du lieu...' }) => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5 my-4 text-secondary">
    <div className="spinner-border text-warning mb-3" role="status" aria-hidden="true" />
    <div className="fw-semibold">{message}</div>
  </div>
)

Spinner.propTypes = {
  message: PropTypes.string
}

export default Spinner
