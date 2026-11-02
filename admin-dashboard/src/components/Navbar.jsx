import React from 'react';
import {
  Compass,
  Radio,
  Users,
  ShieldAlert,
  Bell,
  LogOut,
  Settings
} from 'lucide-react';
import { getBackendServerUrl } from '../services/api';

export default function Navbar({
  club,
  admin,
  stats,
  isConnected,
  onOpenServerSettings,
  onOpenAlerts,
  unresolvedAlertCount,
  onLogout
}) {
  return (
    <header style={{
      height: '64px',
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 30,
      position: 'relative'
    }}>
      {/* Brand & Club Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
        }}>
          <Compass size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.02em', color: '#f8fafc', margin: 0 }}>
              AWS Cloud Clubs
            </h1>
            <span
              onClick={onOpenServerSettings}
              title={`Gateway: ${getBackendServerUrl()} (Click to change)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: isConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '11px',
                fontWeight: '600',
                color: isConnected ? '#34d399' : '#f87171',
                cursor: 'pointer'
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                boxShadow: isConnected ? '0 0 8px #10b981' : 'none'
              }} />
              {isConnected ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: '500' }}>
            Ajay Kumar Garg Engineering College
          </p>
        </div>
      </div>

      {/* Fleet Stats Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <Users size={16} color="#94a3b8" />
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Members: </span>
            <strong style={{ color: '#f8fafc' }}>{stats.total || 0}</strong>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <Radio size={16} color="#10b981" />
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#6ee7b7' }}>Sharing Live: </span>
            <strong style={{ color: '#ffffff' }}>{stats.activeSharing || 0}</strong>
          </div>
        </div>

        {unresolvedAlertCount > 0 && (
          <div
            onClick={onOpenAlerts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              cursor: 'pointer',
              animation: 'pulse 1.5s infinite'
            }}
          >
            <ShieldAlert size={16} color="#ef4444" />
            <div style={{ fontSize: '12px' }}>
              <strong style={{ color: '#fca5a5' }}>{unresolvedAlertCount} Alerts</strong>
            </div>
          </div>
        )}
      </div>

      {/* Actions & Admin Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94a3b8'
          }}
        >
          <Bell size={18} />
          {unresolvedAlertCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '18px',
              height: '18px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              fontSize: '10px',
              fontWeight: '700',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unresolvedAlertCount}
            </span>
          )}
        </button>

        {/* Server Gateway Settings */}
        <button
          onClick={onOpenServerSettings}
          title={`Backend Gateway: ${getBackendServerUrl()}`}
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94a3b8'
          }}
        >
          <Settings size={17} />
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }} />

        {/* Admin User / Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
              {admin?.name || 'Club Head'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Admin</div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

