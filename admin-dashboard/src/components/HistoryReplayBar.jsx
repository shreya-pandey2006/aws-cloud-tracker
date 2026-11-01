import React from 'react';
import { Route, Clock, X, Navigation } from 'lucide-react';

export default function HistoryReplayBar({
  historyTrail,
  member,
  onClose
}) {
  if (!historyTrail || historyTrail.length === 0) return null;

  const firstPoint = historyTrail[0];
  const lastPoint = historyTrail[historyTrail.length - 1];

  const startTime = firstPoint?.timestamp ? new Date(firstPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const endTime = lastPoint?.timestamp ? new Date(lastPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 25,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #38bdf8',
      borderRadius: '12px',
      padding: '12px 20px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      minWidth: '500px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Route size={18} color="#38bdf8" />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
            Location History Trail: {member?.name || 'Member'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {historyTrail.length} breadcrumb waypoints recorded
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
        <Clock size={14} color="#94a3b8" />
        <span>{startTime}</span>
        <span style={{ color: '#64748b' }}>➔</span>
        <span>{endTime}</span>
      </div>

      <button
        onClick={onClose}
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '6px',
          color: '#f87171',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        <X size={14} />
        Exit Trail
      </button>
    </div>
  );
}

