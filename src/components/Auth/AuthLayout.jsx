import PropTypes from 'prop-types'
import './Auth.css'

const AuthLayout = ({ children, side, brand }) => {
  const {
    badge = 'Flavor Fleet',
    title = 'Serve unforgettable bites in minutes',
    description = 'Keep hungry guests smiling with a dashboard that syncs orders, kitchen prep, and delivery runs in real time.',
    highlights = [],
    footnote = '',
  } = side || {}

  const {
    name: brandName = 'QuickBite',
    abbreviation: brandAbbreviation = 'QB',
    tagline: brandTagline = 'Fresh flavors. Lightning-fast delivery.',
  } = brand || {}

  const renderBrand = (variant = 'dark') => (
    <div className={`auth-brand auth-brand-${variant}`}>
      <div className="auth-brand-icon" aria-hidden="true">
        {brandAbbreviation}
      </div>
      <div>
        <p className="auth-brand-name mb-0">{brandName}</p>
        {brandTagline && <p className="auth-brand-tagline mb-0">{brandTagline}</p>}
      </div>
    </div>
  )

  const renderSide = (className = '') => (
    <div className={`auth-illustration ${className}`.trim()}>
      {renderBrand('light')}
      <span className="badge rounded-pill auth-badge text-uppercase fw-semibold mt-4">
        {badge}
      </span>
      <h2 className="mt-4 mb-3 display-6 fw-semibold">{title}</h2>
      <p className="fs-6 text-white-75 mb-4">{description}</p>
      {highlights?.length > 0 && (
        <ul className="list-unstyled mb-4">
          {highlights.map((item) => (
            <li key={item} className="d-flex align-items-start gap-3 auth-highlight">
              <span className="auth-marker mt-2" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {footnote && <p className="text-white-75 small mb-0">{footnote}</p>}
    </div>
  )

  return (
    <div className="auth-wrapper py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xxl-10 col-xl-11">
            <div className="card auth-card border-0 shadow-lg">
              <div className="row g-0">
                <div className="col-12 d-lg-none">
                  {renderSide('auth-illustration-mobile mb-3')}
                </div>
                <div className="col-lg-6 d-none d-lg-flex align-items-stretch">
                  {renderSide('h-100')}
                </div>
                <div className="col-12 col-lg-6">
                  <div className="auth-form-column h-100 d-flex flex-column p-4 p-md-5">
                    {renderBrand('dark')}
                    <div className="auth-form-content mt-4">{children}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  side: PropTypes.shape({
    badge: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    highlights: PropTypes.arrayOf(PropTypes.string),
    footnote: PropTypes.string,
  }),
  brand: PropTypes.shape({
    name: PropTypes.string,
    abbreviation: PropTypes.string,
    tagline: PropTypes.string,
  }),
}

export default AuthLayout
