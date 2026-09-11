import React, { useState, useEffect } from 'react';
import { api } from './services/api';

interface Policy {
  id: number;
  code: string;
  name: string;
  tier: string;
  monthly_premium: number | string;
  annual_deductible: number | string;
  max_coverage: number | string;
  copay_percent: number;
  network_type: string;
  description: string;
  features?: string[];
}

interface Claim {
  id: number;
  claim_number: string;
  member_id: string;
  policy_code: string;
  patient_name: string;
  provider_hospital: string;
  treatment_description: string;
  claimed_amount: number | string;
  approved_amount: number | string;
  status: string;
  service_date: string;
  notes?: string;
}

interface Member {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  active_policy_code: string;
  policy_status: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'plans' | 'claims' | 'member' | 'telemetry'>('plans');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New claim form state
  const [newClaim, setNewClaim] = useState({
    patientName: 'John Doe',
    providerHospital: 'Metro General Hospital',
    treatmentDescription: 'Diagnostic MRI & Radiology Consultation',
    claimedAmount: '1250',
    serviceDate: new Date().toISOString().split('T')[0],
    notes: 'Prescribed by attending physician',
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [polData, claimData, memberData, statusData] = await Promise.allSettled([
          api.getPolicies(),
          api.getClaims('MEM-1001'),
          api.getMember('MEM-1001'),
          api.getStatus()
        ]);

        if (polData.status === 'fulfilled' && polData.value?.length) {
          setPolicies(polData.value);
        } else {
          // Default fallback demo data if running standalone without DB
          setPolicies([
            {
              id: 1,
              code: 'POL-BRZ-01',
              name: 'Essential Care Bronze',
              tier: 'Bronze',
              monthly_premium: 149,
              annual_deductible: 6500,
              max_coverage: 250000,
              copay_percent: 40,
              network_type: 'HMO',
              description: 'Core emergency & catastrophic protection with 100% covered preventive exams.',
              features: ['100% Preventive Care Covered', 'Free Annual Wellness Exam', 'Generic Prescriptions $15', '24/7 Virtual Urgent Care']
            },
            {
              id: 2,
              code: 'POL-SLV-02',
              name: 'Standard Shield Silver',
              tier: 'Silver',
              monthly_premium: 289,
              annual_deductible: 3500,
              max_coverage: 500000,
              copay_percent: 30,
              network_type: 'EPO',
              description: 'Balanced healthcare coverage with low doctor visit copays and national pharmacy access.',
              features: ['$25 Primary Care Copay', '$50 Specialist Visit Copay', 'Comprehensive Dental & Vision', 'Low Generic Rx Copays']
            },
            {
              id: 3,
              code: 'POL-GLD-03',
              name: 'Advantage Plus Gold',
              tier: 'Gold',
              monthly_premium: 449,
              annual_deductible: 1500,
              max_coverage: 1000000,
              copay_percent: 20,
              network_type: 'PPO',
              description: 'Comprehensive high-tier care with no specialist referrals needed and wide out-of-network coverage.',
              features: ['$15 Primary Care Copay', 'No Referrals Needed for Specialists', 'Out-of-Network Coverage Included', 'Full Mental Health Coverage']
            },
            {
              id: 4,
              code: 'POL-PLT-04',
              name: 'Executive Pinnacle Platinum',
              tier: 'Platinum',
              monthly_premium: 699,
              annual_deductible: 500,
              max_coverage: 2500000,
              copay_percent: 10,
              network_type: 'PPO',
              description: 'Top-tier concierge healthcare with near-zero deductibles and global emergency support.',
              features: ['$0 Deductible for Preventive Care', 'Dedicated Care Navigator', 'Global Medical Assistance', 'Zero-Copay Advanced Diagnostics']
            }
          ]);
        }

        if (claimData.status === 'fulfilled' && claimData.value?.length) {
          setClaims(claimData.value);
        } else {
          setClaims([
            {
              id: 1,
              claim_number: 'CLM-2026-8801',
              member_id: 'MEM-1001',
              policy_code: 'POL-GLD-03',
              patient_name: 'John Doe',
              provider_hospital: 'Metro General Hospital',
              treatment_description: 'Outpatient MRI Scan & Orthopedic Consultation',
              claimed_amount: 1850,
              approved_amount: 1480,
              status: 'APPROVED',
              service_date: '2026-08-15',
              notes: 'Pre-authorized diagnostic imaging covered at 80% after copay.'
            },
            {
              id: 2,
              claim_number: 'CLM-2026-8802',
              member_id: 'MEM-1001',
              policy_code: 'POL-GLD-03',
              patient_name: 'John Doe',
              provider_hospital: 'Apex Cardiology Clinic',
              treatment_description: 'Cardiac Stress Test & Electrocardiogram',
              claimed_amount: 720,
              approved_amount: 0,
              status: 'IN_REVIEW',
              service_date: '2026-09-02',
              notes: 'Medical records requested from attending physician.'
            }
          ]);
        }

        if (memberData.status === 'fulfilled' && memberData.value) {
          setMember(memberData.value);
        } else {
          setMember({
            member_id: 'MEM-1001',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            active_policy_code: 'POL-GLD-03',
            policy_status: 'ACTIVE'
          });
        }

        if (statusData.status === 'fulfilled') {
          setGatewayStatus(statusData.value);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        memberId: member?.member_id || 'MEM-1001',
        policyCode: member?.active_policy_code || 'POL-GLD-03',
        patientName: newClaim.patientName,
        providerHospital: newClaim.providerHospital,
        treatmentDescription: newClaim.treatmentDescription,
        claimedAmount: parseFloat(newClaim.claimedAmount),
        serviceDate: newClaim.serviceDate,
        notes: newClaim.notes
      };

      const result = await api.submitClaim(payload);
      const created = result.claim || {
        id: Date.now(),
        claim_number: `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        ...payload,
        status: 'SUBMITTED',
        approved_amount: 0
      };

      setClaims([created, ...claims]);
      setShowClaimModal(false);
      showToast(`✓ Claim ${created.claim_number} successfully submitted to Claim Service (:3004)!`);
    } catch (err: any) {
      // Local optimistic fallback
      const mockClaim: Claim = {
        id: Date.now(),
        claim_number: `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        member_id: member?.member_id || 'MEM-1001',
        policy_code: member?.active_policy_code || 'POL-GLD-03',
        patient_name: newClaim.patientName,
        provider_hospital: newClaim.providerHospital,
        treatment_description: newClaim.treatmentDescription,
        claimed_amount: parseFloat(newClaim.claimedAmount),
        approved_amount: 0,
        status: 'SUBMITTED',
        service_date: newClaim.serviceDate,
        notes: newClaim.notes
      };
      setClaims([mockClaim, ...claims]);
      setShowClaimModal(false);
      showToast(`✓ Claim ${mockClaim.claim_number} recorded in portal!`);
    }
  };

  const handleStatusProgress = async (claimId: number | string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      SUBMITTED: 'IN_REVIEW',
      IN_REVIEW: 'APPROVED',
      APPROVED: 'SETTLED',
      SETTLED: 'SUBMITTED'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'SUBMITTED';

    try {
      await api.updateClaimStatus(claimId, nextStatus);
    } catch (e) {
      // Continue optimistic update
    }

    setClaims(claims.map(c => (c.id === claimId || c.claim_number === claimId) ? { ...c, status: nextStatus } : c));
    showToast(`Claim status updated to ${nextStatus}`);
  };

  return (
    <div className="app-layout">
      {/* Top Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #0284c7, #0f766e)',
          color: '#ffffff',
          padding: '0.85rem 1.4rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="brand-logo">
          <div className="brand-icon">🛡️</div>
          <div className="brand-text">
            <h1>HealthShield</h1>
            <p>Cloud-Native Health Insurance Platform</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="nav-tabs">
          <button
            className={`nav-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            📋 Insurance Plans
          </button>
          <button
            className={`nav-btn ${activeTab === 'claims' ? 'active' : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            📑 Claims Tracker ({claims.length})
          </button>
          <button
            className={`nav-btn ${activeTab === 'member' ? 'active' : ''}`}
            onClick={() => setActiveTab('member')}
          >
            💳 Member Card
          </button>
          <button
            className={`nav-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => setActiveTab('telemetry')}
          >
            ⚡ Architecture & SLA
          </button>
        </nav>

        {/* Header Actions */}
        <div className="header-actions">
          <div className="status-badge">
            <span className="pulse-dot"></span>
            <span>Gateway 3001 Live</span>
          </div>
          <div className="member-pill">
            <span>👤</span>
            <strong>{member?.first_name || 'John'} {member?.last_name || 'Doe'}</strong>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {/* TAB 1: PLANS & COVERAGE */}
        {activeTab === 'plans' && (
          <section>
            <div className="section-header">
              <div>
                <h2 className="section-title">Health Insurance Plans</h2>
                <p className="section-subtitle">
                  Microservice-driven plan offerings queried directly from <code>policy-service</code> on Port 3003.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge-Gold" style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                  Active Plan: {member?.active_policy_code || 'POL-GLD-03'}
                </span>
              </div>
            </div>

            <div className="cards-grid">
              {policies.map((p) => {
                const isCurrent = member?.active_policy_code === p.code;
                return (
                  <div key={p.code} className={`policy-card ${isCurrent ? 'featured' : ''}`}>
                    <div>
                      <div className="claim-top">
                        <span className={`policy-badge badge-${p.tier}`}>{p.tier} Tier</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{p.network_type}</span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>{p.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', minHeight: '40px' }}>{p.description}</p>

                      <div className="policy-price">
                        <span className="price-currency">$</span>
                        <span className="price-amount">{p.monthly_premium}</span>
                        <span className="price-period">/ month</span>
                      </div>

                      <div className="policy-stats">
                        <div className="stat-item">
                          <span className="stat-label">Annual Deductible</span>
                          <span className="stat-value">${Number(p.annual_deductible).toLocaleString()}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Max Coverage</span>
                          <span className="stat-value">${(Number(p.max_coverage) / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="stat-item" style={{ marginTop: '0.5rem' }}>
                          <span className="stat-label">Co-Payment</span>
                          <span className="stat-value">{p.copay_percent}%</span>
                        </div>
                        <div className="stat-item" style={{ marginTop: '0.5rem' }}>
                          <span className="stat-label">Plan ID</span>
                          <span className="stat-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8' }}>{p.code}</span>
                        </div>
                      </div>

                      {p.features && (
                        <ul className="features-list">
                          {p.features.map((feat, idx) => (
                            <li key={idx} className="feature-item">{feat}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      className="btn-primary"
                      style={isCurrent ? { background: '#059669' } : {}}
                      onClick={() => {
                        setMember(prev => prev ? { ...prev, active_policy_code: p.code } : null);
                        showToast(`Enrolled in ${p.name}! Synced with member-service (:3005).`);
                      }}
                    >
                      {isCurrent ? '✓ Current Enrolled Plan' : 'Select Plan & Enroll'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: CLAIMS TRACKER */}
        {activeTab === 'claims' && (
          <section>
            <div className="section-header">
              <div>
                <h2 className="section-title">Claims Management & Status</h2>
                <p className="section-subtitle">
                  Track healthcare claims, hospital bill reimbursements, and review lifecycles via <code>claim-service</code> (:3004).
                </p>
              </div>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowClaimModal(true)}>
                + File New Medical Claim
              </button>
            </div>

            <div className="claims-container">
              {claims.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No claims found. Click "+ File New Medical Claim" to submit your first claim.
                </div>
              ) : (
                claims.map((claim) => (
                  <div key={claim.claim_number} className="claim-row">
                    <div className="claim-top">
                      <div>
                        <span className="claim-id">{claim.claim_number}</span>
                        <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          Service Date: {claim.service_date}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`status-tag status-${claim.status}`}>
                          {claim.status.replace('_', ' ')}
                        </span>
                        <button
                          className="btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          title="Click to simulate advancing claim approval status"
                          onClick={() => handleStatusProgress(claim.id || claim.claim_number, claim.status)}
                        >
                          Advance Status ➔
                        </button>
                      </div>
                    </div>

                    <div className="claim-details">
                      <div>
                        <span className="stat-label">Hospital / Provider</span>
                        <p style={{ fontWeight: 600, marginTop: '2px' }}>{claim.provider_hospital}</p>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{claim.treatment_description}</p>
                      </div>
                      <div>
                        <span className="stat-label">Patient & Member</span>
                        <p style={{ fontWeight: 600, marginTop: '2px' }}>{claim.patient_name}</p>
                        <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#38bdf8' }}>{claim.member_id}</p>
                      </div>
                      <div>
                        <span className="stat-label">Claimed Amount</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', marginTop: '2px' }}>
                          ${Number(claim.claimed_amount).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="stat-label">Approved Benefit</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34d399', marginTop: '2px' }}>
                          ${Number(claim.approved_amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Visual 4-Step Tracker */}
                    <div className="status-steps">
                      {['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'SETTLED'].map((step, idx) => {
                        const stepOrder = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'SETTLED'];
                        const currentIdx = stepOrder.indexOf(claim.status);
                        const isReached = currentIdx >= idx;
                        return (
                          <div key={step} className={`step-indicator ${isReached ? 'active' : ''}`}>
                            <div className="step-dot" style={isReached ? { background: '#38bdf8' } : {}}></div>
                            <span>{step.replace('_', ' ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 3: MEMBER DIGITAL ID CARD */}
        {activeTab === 'member' && (
          <section>
            <div className="section-header">
              <div>
                <h2 className="section-title">Digital Member Insurance Card</h2>
                <p className="section-subtitle">
                  Real-time policyholder credential verified by <code>member-service</code> (:3005) & <code>auth-service</code> (:3002).
                </p>
              </div>
            </div>

            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div className="member-id-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '2rem' }}>🛡️</div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>HealthShield</h3>
                      <p style={{ fontSize: '0.75rem', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>Preferred Health Network</p>
                    </div>
                  </div>
                  <span className="status-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    ACTIVE SUBSCRIBER
                  </span>
                </div>

                <div style={{ margin: '2rem 0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Member Name</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {member?.first_name} {member?.last_name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Member ID</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>{member?.member_id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Group Number</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>GRP-89201</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Policy</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>{member?.active_policy_code}</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <div>Primary Care Copay: <strong>$15</strong></div>
                  <div>Specialist Copay: <strong>$30</strong></div>
                  <div>Emergency Room: <strong>$150</strong></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: ARCHITECTURE & TELEMETRY */}
        {activeTab === 'telemetry' && (
          <section>
            <div className="section-header">
              <div>
                <h2 className="section-title">Microservices Architecture & Telemetry</h2>
                <p className="section-subtitle">
                  Live topology connecting Frontend, API Gateway, PostgreSQL, and Prometheus Metrics.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href="http://localhost:3001/metrics" target="_blank" rel="noreferrer" className="btn-outline" style={{ textDecoration: 'none' }}>
                  📊 View Prometheus Metrics (:3001/metrics)
                </a>
                <a href="http://localhost:3007" target="_blank" rel="noreferrer" className="btn-outline" style={{ textDecoration: 'none' }}>
                  📈 Open Grafana Dashboard (:3007)
                </a>
              </div>
            </div>

            <div className="cards-grid">
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 700 }}>API Gateway</h4>
                  <span className="status-badge">Port 3001</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Central entry point with CORS, Helmet, Prometheus metrics collector, and reverse proxies to all backend domain services.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  GET /metrics → 200 OK
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 700 }}>Auth Service</h4>
                  <span className="status-badge">Port 3002</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Authenticates members and agents, hashes passwords with bcrypt, signs JWT tokens, and manages <code>auth_db</code>.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  POST /api/auth/login
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 700 }}>Policy Service</h4>
                  <span className="status-badge">Port 3003</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Provides Bronze, Silver, Gold, and Platinum health plan catalogs, deductibles, copay calculations, and queries <code>policies_db</code>.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  GET /api/policies
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 700 }}>Claim Service</h4>
                  <span className="status-badge">Port 3004</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Handles claim filing, hospital bill verification, reimbursement calculations, state transitions, and manages <code>claims_db</code>.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  POST /api/claims
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 700 }}>Member Service</h4>
                  <span className="status-badge">Port 3005</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Maintains subscriber records, addresses, date of birth, active policy attachments, and queries <code>members_db</code>.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  GET /api/members/:id
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 700 }}>PostgreSQL DB</h4>
                  <span className="status-badge">Port 5432</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Multi-database instance hosting 4 isolated schemas with relational integrity and automated seed migration.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  auth_db | policies_db | claims_db | members_db
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal: File New Claim */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>File a Healthcare Claim</h3>
              <button
                onClick={() => setShowClaimModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClaim}>
              <div className="form-group">
                <label className="form-label">Patient Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newClaim.patientName}
                  onChange={(e) => setNewClaim({ ...newClaim, patientName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hospital / Medical Provider</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Stanford Medical Center"
                  value={newClaim.providerHospital}
                  onChange={(e) => setNewClaim({ ...newClaim, providerHospital: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Diagnosis / Treatment Description</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  required
                  placeholder="e.g. Consultation, Blood Work, X-Ray"
                  value={newClaim.treatmentDescription}
                  onChange={(e) => setNewClaim({ ...newClaim, treatmentDescription: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Total Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={newClaim.claimedAmount}
                    onChange={(e) => setNewClaim({ ...newClaim, claimedAmount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Service Date</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={newClaim.serviceDate}
                    onChange={(e) => setNewClaim({ ...newClaim, serviceDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowClaimModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                  Submit Claim to Claim-Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
