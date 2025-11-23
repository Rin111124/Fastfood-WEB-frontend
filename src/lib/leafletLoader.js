let leafletPromise = null

export function loadLeaflet() {
  if (typeof window !== 'undefined' && window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    // CSS
    const cssId = 'leaflet-css-cdn'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    // JS
    const scriptId = 'leaflet-js-cdn'
    if (document.getElementById(scriptId)) {
      const check = () => (window.L ? resolve(window.L) : setTimeout(check, 50))
      check()
      return
    }
    const s = document.createElement('script')
    s.id = scriptId
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.async = true
    s.defer = true
    s.onload = () => {
      if (window.L) resolve(window.L)
      else reject(new Error('Leaflet failed to load'))
    }
    s.onerror = () => reject(new Error('Leaflet script error'))
    document.body.appendChild(s)
  })

  return leafletPromise
}

