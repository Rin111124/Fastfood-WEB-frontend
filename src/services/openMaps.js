// Keyless maps helpers using OpenStreetMap ecosystem
// - Address suggestions: Photon (Komoot) API
// - Geocoding single address: Nominatim
// - Distance/time: OSRM demo routing server

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const OSRM_PRIMARY = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_BACKUP = 'https://routing.openstreetmap.de/routed-car/route/v1/driving'

function unaccent(input = '') {
  const s = String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
  return s
}

function formatPhotonLabel(p = {}) {
  const parts = []
  if (p.name) parts.push(p.name)
  if (p.street && !parts.includes(p.street)) parts.push(p.street)
  if (p.housenumber) parts.push(p.housenumber)
  if (p.suburb) parts.push(p.suburb)
  if (p.city) parts.push(p.city)
  if (p.state) parts.push(p.state)
  if (p.country) parts.push(p.country)
  return parts.join(', ')
}

export async function searchPlaces(query, { limit = 5, lang = 'vi', lat, lon } = {}) {
  const q = String(query || '').trim()
  if (!q) return []
  const params = new URLSearchParams({ q, limit: String(limit), lang })
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    params.set('lat', String(lat))
    params.set('lon', String(lon))
  }
  const url = `${PHOTON_ENDPOINT}?${params.toString()}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })
  if (!res.ok) return []
  const data = await res.json()
  const list = Array.isArray(data?.features) ? data.features : []
  let mapped = list.map((f) => {
    const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : []
    const lon = Number(coords[0])
    const lat = Number(coords[1])
    const props = f?.properties || {}
    const label = formatPhotonLabel(props) || props.name || props.street || ''
    return { label, lat, lon, raw: f }
  }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.label)
  if (mapped.length) return mapped
  // Retry without accents to improve hit rate
  const q2 = unaccent(q)
  if (q2 !== q) {
    const p2 = new URLSearchParams({ q: q2, limit: String(limit), lang })
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      p2.set('lat', String(lat))
      p2.set('lon', String(lon))
    }
    const url2 = `${PHOTON_ENDPOINT}?${p2.toString()}`
    const res2 = await fetch(url2, { headers: { 'Accept': 'application/json' } })
    if (res2.ok) {
      const data2 = await res2.json().catch(() => null)
      const list2 = Array.isArray(data2?.features) ? data2.features : []
      mapped = list2.map((f) => {
        const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : []
        const lon = Number(coords[0])
        const lat = Number(coords[1])
        const props = f?.properties || {}
        const label = formatPhotonLabel(props) || props.name || props.street || ''
        return { label, lat, lon, raw: f }
      }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.label)
    }
  }
  return mapped
}

function buildViewbox({ lat, lon, km }) {
  // approx degrees → km conversion
  const dLat = km / 110.574
  const dLon = km / (111.320 * Math.cos((lat * Math.PI) / 180))
  const left = lon - dLon
  const right = lon + dLon
  const top = lat + dLat
  const bottom = lat - dLat
  // Nominatim expects left,top,right,bottom
  return `${left},${top},${right},${bottom}`
}

export async function geocodeOneAddress(address, { lang = 'vi', country = 'vn', bias } = {}) {
  const q = String(address || '').trim()
  if (!q) return null
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    'accept-language': lang
  })
  if (country) params.set('countrycodes', country)
  if (bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lon) && Number.isFinite(bias.km)) {
    params.set('viewbox', buildViewbox(bias))
    params.set('bounded', '1')
  }
  const url = `${NOMINATIM_ENDPOINT}?${params.toString()}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })
  if (!res.ok) return null
  let arr = await res.json().catch(() => null)
  let item = Array.isArray(arr) ? arr[0] : null
  if (!item) {
    // Retry without accents and relax bounding box
    const q2 = unaccent(q)
    const p2 = new URLSearchParams({
      q: q2,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
      'accept-language': lang
    })
    if (country) p2.set('countrycodes', country)
    if (bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lon) && Number.isFinite(bias.km)) {
      // wider bias box
      const wide = { lat: bias.lat, lon: bias.lon, km: Math.max(25, Number(bias.km) || 15) }
      p2.set('viewbox', buildViewbox(wide))
      p2.set('bounded', '1')
    }
    const url2 = `${NOMINATIM_ENDPOINT}?${p2.toString()}`
    const res2 = await fetch(url2, { headers: { 'Accept': 'application/json' } })
    if (res2.ok) {
      arr = await res2.json().catch(() => null)
      item = Array.isArray(arr) ? arr[0] : null
    }
  }
  if (!item) return null
  const lat = Number(item.lat)
  const lon = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon, label: item.display_name }
}

export async function reverseGeocode(lat, lon, { lang = 'vi' } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const params = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lon), 'accept-language': lang })
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const label = data?.display_name || ''
  return label || null
}

function haversineKm(a, b) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

async function fetchOSRM(baseUrl, origin, destination) {
  const q = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`
  const url = `${baseUrl}/${q}?overview=false&alternatives=false`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) return { ok: false, status: res.status, statusText: res.statusText }
  const data = await res.json().catch(() => null)
  if (!data || data.code !== 'Ok' || !Array.isArray(data.routes) || !data.routes[0]) {
    return { ok: false, status: 200, statusText: data?.code || 'NoRoute' }
  }
  const route = data.routes[0]
  return { ok: true, route }
}

export async function routeDriving(origin, destination, { allowApproximate = true, approxSpeedKmh = 25 } = {}) {
  // origin, destination: { lat, lon }
  if (!origin || !destination) throw new Error('Missing coordinates')
  // Try primary OSRM
  let res1 = null
  try { res1 = await fetchOSRM(OSRM_PRIMARY, origin, destination) } catch {}
  if (res1?.ok) {
    return {
      distance_m: Number(res1.route.distance) || 0,
      duration_s: Number(res1.route.duration) || 0,
      source: 'osrm-primary'
    }
  }
  // Try backup OSRM
  let res2 = null
  try { res2 = await fetchOSRM(OSRM_BACKUP, origin, destination) } catch {}
  if (res2?.ok) {
    return {
      distance_m: Number(res2.route.distance) || 0,
      duration_s: Number(res2.route.duration) || 0,
      source: 'osrm-backup'
    }
  }
  // Approximate fallback using straight-line distance
  if (allowApproximate) {
    const km = haversineKm(origin, destination)
    const distance_m = Math.round(km * 1000)
    const duration_s = Math.round((km / Math.max(approxSpeedKmh, 5)) * 3600)
    return { distance_m, duration_s, source: 'approx' }
  }
  const why = res1 && !res1.ok ? res1.statusText : (res2 && !res2.ok ? res2.statusText : 'unknown')
  throw new Error('OSRM request failed: ' + why)
}

async function osrmNearest(baseUrl, { lat, lon }) {
  const url = `${baseUrl.replace(/\/$/, '')}/nearest/v1/driving/${lon},${lat}?number=1`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const pt = data?.waypoints?.[0]?.location
  if (!Array.isArray(pt) || pt.length < 2) return null
  return { lon: Number(pt[0]), lat: Number(pt[1]) }
}

export async function nearestDriving(point) {
  // Try snap to road using OSRM primary then backup
  try {
    const p = await osrmNearest(OSRM_PRIMARY, point)
    if (p) return p
  } catch {}
  try {
    const p2 = await osrmNearest(OSRM_BACKUP, point)
    if (p2) return p2
  } catch {}
  return null
}
