import React from 'react';
import { RoleType } from '../../types';

interface HeaderProps {
  currentRole: RoleType;
  onSelectRole: (role: RoleType) => void;
  onOpenLauncher: () => void;
  notification: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  onOpenLauncher,
  notification,
}) => {
  const roleBadges: Record<RoleType, { label: string; badge: string; color: string; desc: string }> = {
    CUSTOMER: {
      label: 'Customer Portal',
      badge: '👤 Customer',
      color: '#4f46e5',
      desc: 'Policyholder Services & Claims'
    },
    ENROLLMENT: {
      label: 'New Enrollment',
      badge: '🌟 New Customer',
      color: '#10b981',
      desc: 'Apply & Buy Health Insurance'
    },
    ADMIN: {
      label: 'Admin Desk',
      badge: '🛡️ Operations Admin',
      color: '#d97706',
      desc: 'Enrollment Approvals & Fraud Queue'
    },
    DEVELOPER: {
      label: 'Developer Console',
      badge: '💻 SRE / Developer',
      color: '#0284c7',
      desc: 'Microservices & API Explorer'
    },
    QA: {
      label: 'QA Testing Console',
      badge: '🧪 QA Automation',
      color: '#9333ea',
      desc: 'E2E Suites & Chaos Simulator'
    },
    HOSPITAL: {
      label: 'Hospital Desk',
      badge: '🏥 Empanelled Provider',
      color: '#0891b2',
      desc: 'Cashless Pre-Auth & Admissions'
    },
    AIOPS: {
      label: 'AIOps Swarm',
      badge: '🛡️ AIOps Swarm',
      color: '#06b6d4',
      desc: 'Gemini Autonomous SRE & Growth Swarm'
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(11, 19, 43, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #293859',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16
    }}>
      {/* Toast Notification Banner */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 24,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'fadeInSlide 0.3s ease'
        }}>
          <span>🛡️</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Brand Identification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div 
          onClick={() => onSelectRole('CUSTOMER')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0284c7, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(2, 132, 199, 0.4)'
          }}
        >
          🛡️
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 
              onClick={() => onSelectRole('CUSTOMER')}
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.5px',
                cursor: 'pointer'
              }}
            >
              HealthShield Enterprise
            </h1>
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 20,
              background: '#064e3b',
              color: '#34d399',
              fontWeight: 700,
              border: '1px solid #059669'
            }}>
              v2.0 • AIOps Ready
            </span>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#94a3b8' }}>
            Microservices Platform • OpenShift OCP • AWS S3 & Kafka Event Hub
          </p>
        </div>
      </div>

      {/* Center: Quick Console Switcher Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#070c1a',
        padding: 4,
        borderRadius: 12,
        border: '1px solid #1e293b',
        gap: 2,
        overflowX: 'auto',
        maxWidth: '100%'
      }}>
        {(Object.keys(roleBadges) as RoleType[]).map((role) => {
          const item = roleBadges[role];
          const isSelected = currentRole === role;
          return (
            <button
              key={role}
              onClick={() => onSelectRole(role)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                background: isSelected ? item.color : 'transparent',
                color: isSelected ? '#ffffff' : '#94a3b8',
                boxShadow: isSelected ? `0 4px 14px ${item.color}66` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title={item.desc}
            >
              <span>{item.badge.split(' ')[0]}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Active Role & Console Switcher Hub Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onOpenLauncher}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#f8fafc',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1e293b')}
        >
          <span>🎛️</span>
          <span>Switch Console</span>
        </button>

        <div style={{
          padding: '6px 12px',
          borderRadius: 8,
          background: '#070c1a',
          border: `1px solid ${roleBadges[currentRole].color}66`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Current Console
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: roleBadges[currentRole].color }}>
            {roleBadges[currentRole].badge}
          </span>
        </div>
      </div>
    </header>
  );
};
