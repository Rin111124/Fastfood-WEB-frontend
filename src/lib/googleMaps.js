// Lightweight loader for Google Maps JS API with desired libraries
// Usage: await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
let mapsLoadingPromise = null

export function loadGoogleMaps(apiKey, libraries = []) {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps)
  if (mapsLoadingPromise) return mapsLoadingPromise

  const params = new URLSearchParams({ key: apiKey || '', v: 'weekly' })
  if (libraries.length) params.set('libraries', libraries.join(','))

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps did not initialize'))
      }
    }
    document.head.appendChild(script)
  })

  return mapsLoadingPromise
}

export function isMapsLoaded() {
  return !!(window.google && window.google.maps)
}

