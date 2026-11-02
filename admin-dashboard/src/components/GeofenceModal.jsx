import React, { useState } from 'react';
import { X, MapPin, Plus, Trash2 } from 'lucide-react';

export default function GeofenceModal({
  isOpen,
  onClose,
  geofences = [],
  onCreateGeofence,
  onDeleteGeofence
}) {
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('28.6757');
  const [longitude, setLongitude] = useState('77.5020');
  const [radiusMeters, setRadiusMeters] = useState('300');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const safeGeofences = Array.isArray(geofences) ? geofences : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
      setError('Zone name must be between 2 and 100 characters.');
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radiusMeters);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    if (isNaN(rad) || rad < 10 || rad > 50000) {
      setError('Radius must be between 10 meters and 50,000 meters (50km).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateGeofence({
        name: cleanName,
        latitude: lat,
        longitude: lon,
        radiusMeters: rad
      });
      setName('');
      setRadiusMeters('300');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to create geofence zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '520px',
          maxWidth: '92%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={20} color="#38bdf8" />
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
              Club Geofences & Rally Points
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {/* Add Form */}
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#111827',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px' }}>
              Create New Safe Zone / Geofence
            </h3>

            {error && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#fca5a5',
                fontSize: '12px',
                marginBottom: '12px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Zone Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. North Ridge Checkpoint, Camp Bravo"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Radius (meters)</label>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  step="50"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '9px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              {isSubmitting ? 'Creating Zone...' : 'Add Geofence to Map'}
            </button>
          </form>

          {/* Active Geofences List */}
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '10px' }}>
            Active Club Zones ({safeGeofences.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {safeGeofences.map((gf) => (
              <div
                key={gf.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                    {gf.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {gf.latitude.toFixed(4)}, {gf.longitude.toFixed(4)} • Radius: {Math.round(gf.radius_meters)}m
                  </div>
                </div>

                <button
                  onClick={() => onDeleteGeofence(gf.id)}
                  title="Delete Zone"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

