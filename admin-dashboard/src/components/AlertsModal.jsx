import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, Info, Crosshair, CheckCircle, Check, Trash2, Bell } from 'lucide-react';
import { formatTimeIst } from '../utils/time';

export default function AlertsModal({
  isOpen,
  onClose,
  alerts = [],
  onFocusMember,
  onResolveAlert,
  onDeleteAlert,
  onClearResolved
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unresolved' | 'sos' | 'resolved'

  if (!isOpen) return null;

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const filteredAlerts = safeAlerts.filter((a) => {
    const isResolved = a.resolved === 1 || a.resolved === true;
    const isSos = a.type === 'sos' || a.severity === 'critical';

    if (filter === 'unresolved') return !isResolved;
    if (filter === 'resolved') return isResolved;
    if (filter === 'sos') return isSos;
    return true;
  });

  const unresolvedCount = safeAlerts.filter(a => !a.resolved).length;
  const sosCount = safeAlerts.filter(a => a.type === 'sos' || a.severity === 'critical').length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
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
          borderRadius: '18px',
          width: '620px',
          maxWidth: '92%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: unresolvedCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              border: unresolvedCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={20} color={unresolvedCount > 0 ? '#ef4444' : '#38bdf8'} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Alerts & Notifications
                {unresolvedCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '9999px',
                    fontWeight: '700'
                  }}>
                    {unresolvedCount} Active
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Real-time safety distress beacons and emergency notifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0b0f19'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Alerts', count: safeAlerts.length },
              { id: 'unresolved', label: 'Unresolved', count: unresolvedCount, color: '#ef4444' },
              { id: 'sos', label: 'SOS Beacons', count: sosCount, color: '#f87171' },
              { id: 'resolved', label: 'Resolved', count: Math.max(0, safeAlerts.length - unresolvedCount), color: '#10b981' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: filter === tab.id ? '1px solid #3b82f6' : '1px solid #1e293b',
                  backgroundColor: filter === tab.id ? '#1e293b' : 'transparent',
                  color: filter === tab.id ? '#ffffff' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: filter === tab.id ? '#334155' : '#1e293b',
                  color: tab.color || '#94a3b8',
                  fontWeight: '700'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {onClearResolved && (safeAlerts.length - unresolvedCount > 0) && (
            <button
              onClick={onClearResolved}
              title="Delete all resolved alerts from history"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Trash2 size={12} />
              Clear Resolved
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredAlerts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: '#64748b'
            }}>
              <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>
                All Clear
              </h4>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                No alerts match the selected filter.
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isResolved = alert.resolved === 1 || alert.resolved === true;
              const isSos = alert.type === 'sos' || alert.severity === 'critical';

              return (
                <div
                  key={alert.id}
                  style={{
                    backgroundColor: isResolved ? '#111827' : (isSos ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)'),
                    border: isResolved
                      ? '1px solid #1e293b'
                      : (isSos ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)'),
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Alert Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: isSos ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: isSos ? '#f87171' : '#60a5fa',
                        border: isSos ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isSos ? <AlertTriangle size={12} /> : <Info size={12} />}
                        {isSos ? 'SOS DISTRESS' : 'SAFETY ALERT'}
                      </span>

                      {isResolved && (
                        <span style={{
                          fontSize: '11px',
                          color: '#10b981',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Check size={12} />
                          Resolved
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                      {formatTimeIst(alert.created_at || alert.createdAt)}
                    </span>
                  </div>

                  {/* Alert Body */}
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', lineHeight: '1.4' }}>
                      {alert.message}
                    </p>
                    {alert.emergency_contact && (
                      <p style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
                        Emergency Contact: <strong>{alert.emergency_contact}</strong>
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                    {alert.member_id && (
                      <button
                        onClick={() => {
                          onFocusMember(alert.member_id);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Crosshair size={12} />
                        Locate on Map
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => onResolveAlert(alert.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '6px',
                          color: '#34d399',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <Check size={12} />
                        Mark Resolved
                      </button>
                    )}

                    {onDeleteAlert && (
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        title="Delete alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#f87171',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

