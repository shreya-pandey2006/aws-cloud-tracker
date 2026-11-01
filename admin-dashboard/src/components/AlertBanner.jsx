import React from 'react';
import { ShieldAlert, Crosshair, Check, Phone } from 'lucide-react';

export default function AlertBanner({ alerts, onFocusMember, onResolveAlert }) {
  const unresolvedAlerts = alerts.filter(a => a.resolved === 0 || a.resolved === false);

  if (unresolvedAlerts.length === 0) return null;

  const currentAlert = unresolvedAlerts[0];
  const isSos = currentAlert.type === 'sos' || currentAlert.severity === 'critical';

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 35,
      maxWidth: '680px',
      width: '90%',
      backgroundColor: isSos ? 'rgba(185, 28, 28, 0.95)' : 'rgba(30, 58, 138, 0.95)',
      backdropFilter: 'blur(10px)',
      border: isSos ? '1px solid #ef4444' : '1px solid #3b82f6',
      borderRadius: '12px',
      padding: '12px 18px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      animation: 'slide-down 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isSos ? '#ef4444' : '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldAlert size={20} color="white" />
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
            {isSos ? '🚨 DISTRESS SOS ALERT' : '📍 GEOFENCE PERIMETER ALERT'}
          </div>
          <div style={{ fontSize: '12px', color: '#f1f5f9' }}>
            {currentAlert.message}
          </div>
          {currentAlert.emergency_contact && (
            <div style={{ fontSize: '11px', color: '#fecaca', marginTop: '2px' }}>
              Emergency Contact: {currentAlert.emergency_contact}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {currentAlert.member_id && (
          <button
            onClick={() => onFocusMember(currentAlert.member_id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              backgroundColor: 'white',
              color: '#0f172a',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Crosshair size={12} />
            Locate
          </button>
        )}

        <button
          onClick={() => onResolveAlert(currentAlert.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <Check size={12} />
          Resolve
        </button>
      </div>
    </div>
  );
}

