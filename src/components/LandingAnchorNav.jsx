import PropTypes from 'prop-types'

const LandingAnchorNav = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return (
    <nav className="landing-anchor-nav" aria-label="Dieu huong nhanh">
      <ul className="landing-anchor-nav__list">
        {items.map((item) => (
          <li key={item.label} className="landing-anchor-nav__item">
            <a className="landing-anchor-nav__link" href={item.href}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

LandingAnchorNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired
    })
  )
}

LandingAnchorNav.defaultProps = {
  items: []
}

export default LandingAnchorNav
