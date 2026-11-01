import React, { useState } from 'react';
import {
  Search,
  Radio,
  Battery,
  Gauge,
  Clock,
  Navigation,
  Phone,
  Route,
  ChevronRight,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export default function MemberSidebar({
  members,
  selectedMemberId,
  onSelectMember,
  onLoadHistory,
  loadingHistory
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'paused' | 'sos'

  // Filter members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.role && m.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const isSharing = m.is_sharing_location === 1 || m.is_sharing_location === true;

    if (!matchesSearch) return false;
    if (activeTab === 'live') return isSharing && m.status !== 'sos';
    if (activeTab === 'paused') return !isSharing && m.status !== 'sos';
    if (activeTab === 'sos') return m.status === 'sos';
    return true;
  });

  const liveCount = members.filter(m => (m.is_sharing_location === 1 || m.is_sharing_location === true) && m.status !== 'sos').length;
  const pausedCount = members.filter(m => (!m.is_sharing_location || m.is_sharing_location === 0) && m.status !== 'sos').length;
  const sosCount = members.filter(m => m.status === 'sos').length;

  return (
    <aside style={{
      width: '380px',
      height: '100%',
      backgroundColor: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 25
    }}>
      {/* Search Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '0 12px'
        }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name or role..."
            style={{
              width: '100%',
              padding: '10px 10px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '12px' }}>
          {[
            { id: 'all', label: 'All', count: members.length },
            { id: 'live', label: 'Live', count: liveCount, color: '#10b981' },
            { id: 'paused', label: 'Paused', count: pausedCount, color: '#f59e0b' },
            { id: 'sos', label: 'SOS', count: sosCount, color: '#ef4444' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                border: activeTab === tab.id ? '1px solid #3b82f6' : '1px solid #1e293b',
                backgroundColor: activeTab === tab.id ? '#1e293b' : 'transparent',
                color: activeTab === tab.id ? '#f8fafc' : '#94a3b8',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: tab.color || '#94a3b8'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {filteredMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: '13px' }}>
            No members found matching filter.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isSharing = member.is_sharing_location === 1 || member.is_sharing_location === true;
            const isSos = member.status === 'sos';
            const isSelected = selectedMemberId === member.id;
            const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div
                key={member.id}
                onClick={() => onSelectMember(member.id)}
                style={{
                  backgroundColor: isSelected ? '#1e293b' : '#111827',
                  border: isSelected
                    ? '1px solid #3b82f6'
                    : (isSos ? '1px solid #ef4444' : '1px solid #1e293b'),
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isSos ? '#ef4444' : (isSharing ? '#10b981' : '#f59e0b'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '12px',
                      color: 'white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}>
                      {initials}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {member.role || 'Club Member'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    backgroundColor: isSos ? 'rgba(239, 68, 68, 0.15)' : (isSharing ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                    color: isSos ? '#f87171' : (isSharing ? '#34d399' : '#fbbf24')
                  }}>
                    {isSos ? 'SOS ALERT' : (isSharing ? 'LIVE' : 'PAUSED')}
                  </span>
                </div>

                {/* Telemetry Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  padding: '8px',
                  backgroundColor: '#0b0f19',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '9px', display: 'block' }}>SPEED</span>
                    <strong style={{ color: '#e2e8f0' }}>{(member.last_speed || 0).toFixed(1)} km/h</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '9px', display: 'block' }}>BATTERY</span>
                    <strong style={{ color: member.last_battery < 20 ? '#ef4444' : '#10b981' }}>
                      {member.last_battery || 100}%
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '9px', display: 'block' }}>GPS ACC</span>
                    <strong style={{ color: '#94a3b8' }}>±{(member.last_accuracy || 5).toFixed(1)}m</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadHistory(member.id);
                      }}
                      disabled={loadingHistory === member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Route size={12} />
                      {loadingHistory === member.id ? 'Loading...' : 'Trail'}
                    </button>

                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#94a3b8',
                          fontSize: '11px',
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={12} />
                        Call
                      </a>
                    )}
                  </div>

                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {member.last_seen_at
                      ? new Date(member.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Recently'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

