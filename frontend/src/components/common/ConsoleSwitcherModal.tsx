import React from 'react';
import { RoleType } from '../../types';

interface ConsoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: RoleType;
  onSelectRole: (role: RoleType) => void;
}

export const ConsoleSwitcherModal: React.FC<ConsoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  const consoles: {
    role: RoleType;
    icon: string;
    title: string;
    targetUser: string;
    color: string;
    description: string;
    features: string[];
    route: string;
  }[] = [
    {
      role: 'CUSTOMER',
      icon: '👤',
      title: 'Customer & Policyholder Portal',
      targetUser: 'Insured Policyholders & General Users',
      color: '#4f46e5',
      description: 'Explore policy benefits with plain-language jargon busters, download digital health cards, search empanelled hospitals, and submit claims.',
      features: ['Plain Language Explanations', 'Digital Health e-Card', 'Cashless Hospital Locator', 'Track Claims Timeline', 'Jira Support Tickets'],
      route: '#/customer'
    },
    {
      role: 'ENROLLMENT',
      icon: '🌟',
      title: 'New Customer Insurance Enrollment',
      targetUser: 'New Uninsured Users & Applicants',
      color: '#10b981',
      description: 'Guided 5-step onboarding wizard to calculate premiums, register dependents, declare health history, complete KYC, and instantly issue coverage.',
      features: ['Dynamic Quote Calculator', 'Multi-Member Dependent Setup', 'Medical Underwriting Questionnaire', 'Aadhaar/PAN KYC Check', 'Instant Digital Policy Issuance'],
      route: '#/enroll'
    },
    {
      role: 'ADMIN',
      icon: '🛡️',
      title: 'Operations Admin & Fraud Review Desk',
      targetUser: 'Claims Officers, Underwriters & Operations Leads',
      color: '#d97706',
      description: 'Executive KPI dashboard, new enrollment approvals queue, and AIOps-powered fraud detection rules engine with anomaly risk scoring.',
      features: ['Live Operations Counters', 'Enrollment Underwriting Approvals', 'AIOps Fraud Scoring (0-100)', 'Policy Catalog Pricing', 'Member Master Directory'],
      route: '#/admin'
    },
    {
      role: 'DEVELOPER',
      icon: '💻',
      title: 'Developer & SRE Telemetry Console',
      targetUser: 'Software Engineers, DevOps & SREs',
      color: '#0284c7',
      description: 'Full microservices health matrix (all 9 services), Swagger-like interactive API explorer, event bus inspector, and gateway route table.',
      features: ['9 Microservices Health Grid', 'Interactive API Request Playground', 'Kafka & S3 Lakehouse Event Stream', 'Gateway Route Table & Timeouts', 'Environment & Config Matrix'],
      route: '#/developer'
    },
    {
      role: 'QA',
      icon: '🧪',
      title: 'QA Engineer & Test Automation Bench',
      targetUser: 'QA Engineers & Test Automation Leads',
      color: '#9333ea',
      description: 'Automated end-to-end test suite runner, 1-click synthetic applicant/claim generator, and chaos engineering failure simulator.',
      features: ['5 E2E Automated Test Suites', 'Live Assertion & Latency Benchmark', 'Synthetic Test Data Generator', 'Chaos & 504 Failure Injector', 'Test Execution Summary Reports'],
      route: '#/qa'
    },
    {
      role: 'HOSPITAL',
      icon: '🏥',
      title: 'Empanelled Hospital & TPA Desk',
      targetUser: 'Hospital Admission Desks & TPA Coordinators',
      color: '#0891b2',
      description: 'Instant patient eligibility lookup by Member ID, room rent limit verification, and cashless pre-authorization voucher sanctions.',
      features: ['Instant Member Eligibility Verification', 'Remaining Coverage Balance Check', 'Emergency Pre-Auth Voucher Filing', 'Automated TPA Sanctions'],
      route: '#/hospital'
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 10, 24, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: '#0e172a',
        border: '1px solid #334155',
        borderRadius: 20,
        maxWidth: 1100,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
        padding: 30
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #1e293b',
          paddingBottom: 18,
          marginBottom: 24
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>🎛️</span>
              <h2 style={{ margin: 0, fontSize: 24, color: '#f8fafc', fontWeight: 800 }}>
                HealthShield Enterprise Consoles Hub
              </h2>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#94a3b8' }}>
              Select your role console to access specialized tools, workflows, telemetry, and testing suites.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: 10,
              width: 36,
              height: 36,
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18
        }}>
          {consoles.map((c) => {
            const isCurrent = currentRole === c.role;
            return (
              <div
                key={c.role}
                onClick={() => {
                  onSelectRole(c.role);
                  onClose();
                }}
                style={{
                  background: isCurrent ? 'rgba(30, 41, 59, 0.9)' : '#162032',
                  border: isCurrent ? `2px solid ${c.color}` : '1px solid #293859',
                  borderRadius: 14,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = c.color;
                  e.currentTarget.style.boxShadow = `0 12px 24px ${c.color}22`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = isCurrent ? c.color : '#293859';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: `${c.color}22`,
                      border: `1px solid ${c.color}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22
                    }}>
                      {c.icon}
                    </div>
                    {isCurrent ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: c.color,
                        color: '#fff',
                        padding: '3px 10px',
                        borderRadius: 20
                      }}>
                        ACTIVE NOW
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {c.route}
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 4px 0', fontSize: 17, color: '#f8fafc', fontWeight: 700 }}>
                    {c.title}
                  </h3>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.color, marginBottom: 10 }}>
                    Persona: {c.targetUser}
                  </div>
                  <p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                    {c.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    {c.features.map((feat, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#0b132b',
                          color: '#cbd5e1',
                          border: '1px solid #1e293b'
                        }}
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: isCurrent ? c.color : '#1e293b',
                    border: `1px solid ${c.color}66`,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <span>Launch {c.title.split(' ')[0]} Console</span>
                  <span>→</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
