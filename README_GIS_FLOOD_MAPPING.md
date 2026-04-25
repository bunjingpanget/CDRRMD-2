# GIS Flood Mapping Upgrade (Capstone Version)

This document describes the barangay-based flood risk mapping design for CDRRMD Calamba City.

## 1) Database Structure

Use these logical entities:

- barangay_boundaries
  - id (PK)
  - barangay_name (unique)
  - boundary_geojson (JSONB polygon or multipolygon)
  - centroid_lat, centroid_lon
  - base_hazard (low, medium, high)
  - source (derived, qgis_import)
  - notes
  - updated_at

- incident_reports (existing)
  - latitude, longitude are used for separate incident marker layer

- evacuation_areas (existing)
  - used for derived fallback centroid and team location logic

## 2) Backend Logic (Node.js)

Implemented endpoints:

- GET /api/flood-risk/calamba
  - Returns rainfall signal, barangay risk levels, and decision support recommendations.

- GET /api/flood-risk/calamba/zones
  - Returns full barangay GeoJSON boundaries with risk attributes.

- GET /api/flood-risk/calamba/raster
  - Returns raster-like hazard cells (grid polygons) generated from barangay polygons.
  - This is a capstone-friendly approximation to a raster product.

Risk model used:

- Risk Score = Base Hazard Score + Rainfall Trigger Score
- LOW -> green
- MEDIUM -> orange
- HIGH -> red

Decision support:

- HIGH: Evacuate immediately
- MEDIUM: Prepare resources
- LOW: Monitor conditions

## 3) Leaflet Implementation

Layer stack implemented:

1. Barangay raster layer (semi-transparent grid cells)
2. Barangay boundary layer (outlined polygons with risk fill)
3. Evacuation areas
4. Incident markers (separate overlay)
5. Routes and selected incident emphasis (Monitoring page)

## 4) Sample GeoJSON Structure

Use this structure for QGIS-exported barangay polygons:

{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "zoneId": "bagong-kalsada",
        "barangay": "Bagong Kalsada",
        "hazardLevel": "MEDIUM",
        "riskLevel": "HIGH",
        "recommendation": "Evacuate immediately",
        "color": "#dc2626"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [121.1450, 14.2140],
            [121.1520, 14.2140],
            [121.1520, 14.2200],
            [121.1450, 14.2200],
            [121.1450, 14.2140]
          ]
        ]
      }
    }
  ]
}

## 5) QGIS Workflow (Like HazardHunter)

1. Load Calamba barangay boundary shapefile in QGIS.
2. Add hazard source raster (flood depth or flood susceptibility).
3. Run zonal statistics by barangay polygons.
4. Classify each barangay result into low, medium, high.
5. Export barangay polygons to GeoJSON.
6. Import/update boundary_geojson and base_hazard in barangay_boundaries.
7. Optional production path: publish GeoTIFF or tile service and replace fallback raster cells endpoint.

## 6) Dashboard UI Suggestions

- Add three KPI cards:
  - High-risk barangays (count)
  - Medium-risk barangays (count)
  - Barangays requiring evacuation now (count)
- Add a right-side panel: Top 5 high-risk barangays with recommendation and latest rainfall.
- Keep a map layer toggle:
  - Raster hazard
  - Barangay boundaries
  - Incidents
  - Evacuation centers
- Add a timestamp badge: Last risk update and rainfall source.

## 7) Capstone Scope Notes

This implementation is simple but effective:

- Uses your existing Node.js + PostgreSQL stack.
- Supports incremental improvement from derived boundaries to official QGIS polygons.
- Keeps incident monitoring independent from hazard mapping layers.
