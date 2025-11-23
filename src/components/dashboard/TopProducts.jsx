import PropTypes from 'prop-types'
import { formatNumber } from '../../utils/format'

const TopProducts = ({ products }) => {
  if (!products.length) {
    return <p className="text-muted small mb-0">Chua co du lieu san pham.</p>
  }
  return (
    <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
      {products.map((product, index) => (
        <li key={product.productName || product.product_id} className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-warning bg-opacity-25 text-warning d-flex align-items-center justify-content-center fw-bold"
              style={{ width: 44, height: 44 }}>
              {index + 1}
            </div>
            <div>
              <p className="mb-0 fw-semibold">{product.productName || product.name}</p>
              {product.Product?.food_type && (
                <small className="d-block text-muted text-uppercase">
                  {product.Product.food_type}
                </small>
              )}
              <small className="text-muted">Da ban: {formatNumber(product.totalQuantity || product.soldQuantity || product.quantity || 0)}</small>
            </div>
          </div>
          <span className="badge bg-light text-dark border">
            #{product.rank ?? index + 1}
          </span>
        </li>
      ))}
    </ul>
  )
}

TopProducts.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      productName: PropTypes.string,
      totalQuantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      soldQuantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Product: PropTypes.shape({
        food_type: PropTypes.string
      })
    })
  )
}

TopProducts.defaultProps = {
  products: []
}

export default TopProducts
