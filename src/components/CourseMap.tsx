import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface CourseMapProps {
  routeGeometry: GeoJSON.LineString | null;
  startPoint?: { lat: number; lng: number } | null;
  style?: React.CSSProperties;
}

export default function CourseMap({ routeGeometry, startPoint, style }: CourseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || !routeGeometry?.coordinates?.length) return;

    const coords = routeGeometry.coordinates as [number, number][];

    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend([c[0], c[1]]));

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      bounds,
      fitBoundsOptions: { padding: 40 },
    });

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeGeometry,
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFC800', 'line-width': 4 },
      });

      // Start marker
      const startCoord = coords[0];
      new mapboxgl.Marker({ color: '#52c41a' })
        .setLngLat([startCoord[0], startCoord[1]])
        .setPopup(new mapboxgl.Popup().setText('출발'))
        .addTo(map);

      // End marker
      const endCoord = coords[coords.length - 1];
      new mapboxgl.Marker({ color: '#ff4d4f' })
        .setLngLat([endCoord[0], endCoord[1]])
        .setPopup(new mapboxgl.Popup().setText('도착'))
        .addTo(map);
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [routeGeometry]);

  if (!routeGeometry?.coordinates?.length) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8, ...style }}>
        경로 데이터 없음
      </div>
    );
  }

  return <div ref={containerRef} style={{ height: 400, borderRadius: 8, ...style }} />;
}
