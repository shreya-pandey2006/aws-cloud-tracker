import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Compass,
  Crosshair,
  Maximize2,
  Layers,
  Battery,
  Gauge,
  Clock,
  Phone,
  Route
} from 'lucide-react';
import { formatTimeIst } from '../utils/time';

export default function MapView({
  members,
  selectedMemberId,
  onSelectMember,
  historyTrail,
  onClearHistory,
  onLoadHistory
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const historyPolylineRef = useRef(null);
  const historyMarkersRef = useRef([]);
  const [mapStyle, setMapStyle] = React.useState('dark'); // 'dark' | 'streets' | 'satellite'
  const tileLayerRef = useRef(null);
  const lastFocusedMemberIdRef = useRef(null);
  const onSelectMemberRef = useRef(onSelectMember);
  onSelectMemberRef.current = onSelectMember;

  const getTileLayer = (style) => {
    if (style === 'streets') {
      return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });
    } else if (style === 'satellite') {
      return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
        maxZoom: 19
      });
    } else {
      // Watermark-Free Dark Tactical Mode via filtered OpenStreetMap
      return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: 'dark-tiles',
        maxZoom: 19
      });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center: AKGEC Campus, Ghaziabad (28.6757, 77.5020)
    const map = L.map(mapContainerRef.current, {
      center: [28.6757, 77.5020],
      zoom: 16,
      zoomControl: false,
    });

    // Clean Dark Tiles with Zero Watermark
    const initialTile = getTileLayer('dark');
    initialTile.addTo(map);
    tileLayerRef.current = initialTile;

    // Custom Zoom controls at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // AKGEC Campus Landmark
    const campusIcon = L.divIcon({
      className: 'campus-basecamp-icon',
      html: `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.92);
          border: 1.5px solid #38bdf8;
          border-radius: 8px;
          padding: 4px 10px;
          color: #f8fafc;
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          white-space: nowrap;
          cursor: pointer;
        ">
          <span style="font-size: 14px;">🏛️</span>
          <span>AKGEC Campus</span>
        </div>
      `,
      iconSize: [125, 30],
      iconAnchor: [62, 15]
    });

    const campusMarker = L.marker([28.6757, 77.5020], { icon: campusIcon }).addTo(map);
    campusMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 6px 10px; min-width: 200px;">
        <div style="font-weight: 700; font-size: 13px; color: #38bdf8; margin-bottom: 3px;">🏛️ Ajay Kumar Garg Engineering College</div>
        <div style="font-size: 11px; color: #94a3b8;">AWS Cloud Clubs</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">28.6757° N, 77.5020° E</div>
      </div>
    `);

    // Clicking anywhere on map canvas deselects member
    map.on('click', () => {
      lastFocusedMemberIdRef.current = null;
      if (onSelectMemberRef.current) {
        onSelectMemberRef.current(null);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle map tiles (Dark Tactical -> Street View -> Satellite)
  const toggleMapStyle = () => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);

    let nextStyle = 'streets';
    if (mapStyle === 'dark') nextStyle = 'streets';
    else if (mapStyle === 'streets') nextStyle = 'satellite';
    else if (mapStyle === 'satellite') nextStyle = 'dark';

    const newTile = getTileLayer(nextStyle);
    newTile.addTo(mapRef.current);
    tileLayerRef.current = newTile;
    setMapStyle(nextStyle);
  };

  // Update Member Markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMemberIds = new Set();

    members.forEach((member) => {
      if (!member.last_latitude || !member.last_longitude) return;
      currentMemberIds.add(member.id);

      const lat = member.last_latitude;
      const lng = member.last_longitude;
      const isSharing = member.is_sharing_location === 1 || member.is_sharing_location === true;
      const status = member.status === 'sos' ? 'sos' : (isSharing ? 'active' : 'paused');

      // Create Custom HTML DivIcon
      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const headingAngle = member.last_heading || 0;

      const iconHtml = `
        <div class="custom-member-marker">
          <div class="marker-halo ${status}"></div>
          <div class="marker-pin ${status}">
            ${initials}
          </div>
          ${isSharing && member.last_speed > 1.5 ? `
            <div class="marker-heading-arrow" style="transform: rotate(${headingAngle}deg);"></div>
          ` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'member-leaflet-div-icon',
        html: iconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24]
      });

      // Format updated timestamp in IST
      const updatedText = formatTimeIst(member.last_seen_at, { includeSeconds: true });

      const popupHtml = `
        <div style="padding: 14px; min-width: 220px; font-family: sans-serif;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 700; font-size: 15px; color: #f8fafc;">${member.name}</div>
              <span style="
                display: inline-block;
                font-size: 11px;
                font-weight: 600;
                color: #38bdf8;
                background: rgba(56, 189, 248, 0.15);
                border: 1px solid rgba(56, 189, 248, 0.35);
                border-radius: 4px;
                padding: 1px 7px;
                margin-top: 3px;
              ">${member.role || 'Member'}</span>
            </div>
            <span style="
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 2px 8px;
              border-radius: 9999px;
              background: ${status === 'active' ? 'rgba(16,185,129,0.2)' : (status === 'sos' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)')};
              color: ${status === 'active' ? '#34d399' : (status === 'sos' ? '#f87171' : '#fbbf24')};
            ">
              ${status === 'active' ? 'Live Sharing' : (status === 'sos' ? 'SOS DISTRESS' : 'Sharing Off')}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; background: #0b0f19; padding: 10px; border-radius: 8px;">
            <div>
              <div style="font-size: 10px; color: #64748b;">SPEED</div>
              <div style="font-size: 13px; font-weight: 700; color: #e2e8f0;">${(member.last_speed || 0).toFixed(1)} km/h</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">BATTERY</div>
              <div style="font-size: 13px; font-weight: 700; color: ${member.last_battery < 20 ? '#ef4444' : '#10b981'};">
                ${member.last_battery || 100}%
              </div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">ACCURACY</div>
              <div style="font-size: 12px; font-weight: 600; color: #94a3b8;">±${(member.last_accuracy || 5).toFixed(1)} m</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">UPDATED</div>
              <div style="font-size: 11px; font-weight: 600; color: #94a3b8;">${updatedText}</div>
            </div>
          </div>

          ${member.phone ? `
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
              📞 <a href="tel:${member.phone}" style="color: #38bdf8; text-decoration: none;">${member.phone}</a>
            </div>
          ` : ''}

          <button id="btn-hist-${member.id}" style="
            width: 100%;
            padding: 7px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          ">
            View Travel Route
          </button>
        </div>
      `;

      if (markersRef.current[member.id]) {
        // Update existing marker position smoothly
        const marker = markersRef.current[member.id];
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupHtml);
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { icon: customIcon });
        marker.bindPopup(popupHtml);

        marker.on('popupopen', () => {
          setTimeout(() => {
            const btn = document.getElementById(`btn-hist-${member.id}`);
            if (btn) {
              btn.onclick = () => onLoadHistory(member.id);
            }
          }, 50);
        });

        marker.on('click', (e) => {
          if (e && e.originalEvent) {
            e.originalEvent._stopped = true;
          }
          onSelectMember(member.id);
        });

        marker.addTo(map);
        markersRef.current[member.id] = marker;
      }
    });

    // Remove markers that no longer exist
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentMemberIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }, [members, onSelectMember, onLoadHistory]);

  // Handle selected member focus (only triggers camera flyTo when a new member is selected)
  useEffect(() => {
    if (!selectedMemberId || !mapRef.current) {
      lastFocusedMemberIdRef.current = null;
      return;
    }

    // Do not re-fly if this member is already the active focus (prevents hijacking on periodic location updates)
    if (lastFocusedMemberIdRef.current === selectedMemberId) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (member && member.last_latitude && member.last_longitude) {
      lastFocusedMemberIdRef.current = selectedMemberId;
      mapRef.current.flyTo([member.last_latitude, member.last_longitude], 16, {
        duration: 1.2
      });

      // Open popup
      if (markersRef.current[selectedMemberId]) {
        markersRef.current[selectedMemberId].openPopup();
      }
    }
  }, [selectedMemberId, members]);

  // Render History Breadcrumbs Trail
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous trail
    if (historyPolylineRef.current) {
      map.removeLayer(historyPolylineRef.current);
      historyPolylineRef.current = null;
    }
    historyMarkersRef.current.forEach(m => map.removeLayer(m));
    historyMarkersRef.current = [];

    if (!historyTrail || historyTrail.length < 2) return;

    const latLngs = historyTrail.map(p => [p.latitude, p.longitude]);

    // Draw glowing polyline
    const polyline = L.polyline(latLngs, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    historyPolylineRef.current = polyline;

    // Start Pin (Green)
    const startPoint = historyTrail[0];
    const startIcon = L.divIcon({
      className: 'history-pin-start',
      html: `<div style="background:#10b981;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">START</div>`,
      iconSize: [40, 20],
      iconAnchor: [20, 10]
    });
    const startMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon }).addTo(map);
    historyMarkersRef.current.push(startMarker);

    // End Pin (Blue/Flag)
    const endPoint = historyTrail[historyTrail.length - 1];
    const endIcon = L.divIcon({
      className: 'history-pin-end',
      html: `<div style="background:#3b82f6;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">CURRENT</div>`,
      iconSize: [52, 20],
      iconAnchor: [26, 10]
    });
    const endMarker = L.marker([endPoint.latitude, endPoint.longitude], { icon: endIcon }).addTo(map);
    historyMarkersRef.current.push(endMarker);

    // Zoom map to fit the history trail bounds
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }, [historyTrail]);

  // Actions
  const handleRecenterBasecamp = () => {
    if (!mapRef.current) return;
    lastFocusedMemberIdRef.current = null;
    if (onSelectMember) {
      onSelectMember(null);
    }
    mapRef.current.closePopup();
    mapRef.current.flyTo([28.6757, 77.5020], 16, { duration: 1 });
  };

  const handleFitAllMembers = () => {
    if (!mapRef.current || members.length === 0) return;
    lastFocusedMemberIdRef.current = null;
    if (onSelectMember) {
      onSelectMember(null);
    }
    mapRef.current.closePopup();

    const activePoints = members
      .filter(m => m.last_latitude && m.last_longitude)
      .map(m => [m.last_latitude, m.last_longitude]);

    if (activePoints.length > 0) {
      const bounds = L.latLngBounds(activePoints);
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  };

  return (
    <div className="map-wrapper">
      <div id="map" ref={mapContainerRef} />

      {/* Floating Floating Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={handleFitAllMembers}
          title="Fit All Members in View"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          <Maximize2 size={14} color="#38bdf8" />
          Fit All Members
        </button>

        <button
          onClick={handleRecenterBasecamp}
          title="Center on AKGEC Campus"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          <Crosshair size={14} color="#10b981" />
          AKGEC Campus
        </button>

        <button
          onClick={toggleMapStyle}
          title="Switch Map Layer: Dark Tactical -> Street View -> Satellite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          <Layers size={14} color="#f59e0b" />
          {mapStyle === 'dark' ? 'Dark Tactical' : (mapStyle === 'streets' ? 'Street View' : 'Satellite View')}
        </button>

        {historyTrail && (
          <button
            onClick={onClearHistory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
          >
            Clear Route
          </button>
        )}
      </div>

      {/* Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '16px',
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '11px',
        color: '#cbd5e1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          Live Sharing
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          Paused
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          SOS Alert
        </div>
      </div>
    </div>
  );
}

