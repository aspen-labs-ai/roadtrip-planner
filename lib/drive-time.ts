type Coordinates = {
  lat: number
  lon: number
}

const knownLocations: Record<string, Coordinates> = {
  chicago: { lat: 41.8781, lon: -87.6298 },
  'chicago, il': { lat: 41.8781, lon: -87.6298 },
  'chicago, illinois': { lat: 41.8781, lon: -87.6298 },
  detroit: { lat: 42.3314, lon: -83.0458 },
  'detroit, mi': { lat: 42.3314, lon: -83.0458 },
  'detroit, michigan': { lat: 42.3314, lon: -83.0458 },
  toronto: { lat: 43.6532, lon: -79.3832 },
  'toronto, on': { lat: 43.6532, lon: -79.3832 },
  'toronto, ontario': { lat: 43.6532, lon: -79.3832 },
  montreal: { lat: 45.5017, lon: -73.5673 },
  'montreal, qc': { lat: 45.5017, lon: -73.5673 },
  'montreal, quebec': { lat: 45.5017, lon: -73.5673 },
}

const geocodeCache = new Map<string, Coordinates>()
const driveCache = new Map<string, number>()

function normalizeLocation(location: string): string {
  return location.trim().toLowerCase().replace(/\s+/g, ' ')
}

function haversineMiles(origin: Coordinates, destination: Coordinates): number {
  const earthRadiusMiles = 3958.8
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180
  const dLon = ((destination.lon - origin.lon) * Math.PI) / 180

  const startLat = (origin.lat * Math.PI) / 180
  const endLat = (destination.lat * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2

  return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function driveKey(fromLocation: string, toLocation: string): string {
  return `${normalizeLocation(fromLocation)}=>${normalizeLocation(toLocation)}`
}

async function geocodeLocation(location: string): Promise<Coordinates | null> {
  const normalized = normalizeLocation(location)
  if (!normalized) {
    return null
  }

  const known = knownLocations[normalized]
  if (known) {
    return known
  }

  const cached = geocodeCache.get(normalized)
  if (cached) {
    return cached
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', location)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as Array<{ lat?: string; lon?: string }>
    const topResult = payload[0]
    if (!topResult?.lat || !topResult?.lon) {
      return null
    }

    const result: Coordinates = {
      lat: Number(topResult.lat),
      lon: Number(topResult.lon),
    }

    if (!Number.isFinite(result.lat) || !Number.isFinite(result.lon)) {
      return null
    }

    geocodeCache.set(normalized, result)
    return result
  } catch {
    return null
  }
}

async function fetchRouteMinutes(from: Coordinates, to: Coordinates): Promise<number | null> {
  try {
    const url = new URL(
      `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}`,
    )
    url.searchParams.set('overview', 'false')

    const response = await fetch(url.toString())
    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as {
      routes?: Array<{ duration?: number }>
    }

    const durationSeconds = payload.routes?.[0]?.duration
    if (!Number.isFinite(durationSeconds)) {
      return null
    }

    return Math.max(1, Math.round((durationSeconds as number) / 60))
  } catch {
    return null
  }
}

export async function estimateDriveMinutes(
  fromLocation: string,
  toLocation: string,
): Promise<number | null> {
  const key = driveKey(fromLocation, toLocation)
  if (driveCache.has(key)) {
    return driveCache.get(key) ?? null
  }

  if (normalizeLocation(fromLocation) === normalizeLocation(toLocation)) {
    driveCache.set(key, 0)
    return 0
  }

  const [fromCoordinates, toCoordinates] = await Promise.all([
    geocodeLocation(fromLocation),
    geocodeLocation(toLocation),
  ])

  if (!fromCoordinates || !toCoordinates) {
    return null
  }

  const routeMinutes = await fetchRouteMinutes(fromCoordinates, toCoordinates)
  if (routeMinutes !== null) {
    driveCache.set(key, routeMinutes)
    return routeMinutes
  }

  const fallbackMinutes = Math.max(
    1,
    Math.round((haversineMiles(fromCoordinates, toCoordinates) / 55) * 60),
  )

  driveCache.set(key, fallbackMinutes)
  return fallbackMinutes
}
