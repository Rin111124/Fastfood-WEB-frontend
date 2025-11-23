import React, { useEffect, useRef, useState } from 'react'
import { loadLeaflet } from '../../lib/leafletLoader'

const MapPicker = ({
  center = { lat: 21.0463, lon: 105.7946 },
  store = { lat: 21.0463, lon: 105.7946, label: 'Cua hang' },
  value,
  height = 320,
  onPick
}) => {
  const mapRef = useRef(null)
  const mapObjRef = useRef(null)
  const storeMarkerRef = useRef(null)
  const pickMarkerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const containerId = useRef(`map-picker-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        setLoading(true)
        const L = await loadLeaflet()
        if (!mounted) return
        const map = L.map(containerId).setView([center.lat, center.lon], 14)
        mapObjRef.current = map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map)
        // store marker
        storeMarkerRef.current = L.marker([store.lat, store.lon]).addTo(map).bindPopup(store.label || 'Cua hang')
        // existing value marker
        if (value && Number.isFinite(value.lat) && Number.isFinite(value.lon)) {
          pickMarkerRef.current = L.marker([value.lat, value.lon], { draggable: true }).addTo(map)
        }
        // click to pick
        map.on('click', (e) => {
          const lat = e.latlng.lat
          const lon = e.latlng.lng
          if (!pickMarkerRef.current) {
            pickMarkerRef.current = L.marker([lat, lon], { draggable: true }).addTo(map)
            pickMarkerRef.current.on('dragend', () => {
              const p = pickMarkerRef.current.getLatLng()
              onPick && onPick({ lat: p.lat, lon: p.lng })
            })
          } else {
            pickMarkerRef.current.setLatLng([lat, lon])
          }
          onPick && onPick({ lat, lon })
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => {
      mounted = false
      try {
        mapObjRef.current && mapObjRef.current.remove()
      } catch {}
    }
  }, [])

  return (
    <div>
      <div id={containerId} ref={mapRef} style={{ width: '100%', height }} />
      {loading && <div className="small text-muted mt-2">Dang tai ban do...</div>}
    </div>
  )
}

export default MapPicker

