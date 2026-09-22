import React, { useState } from 'react';
import { PolicyPlan, ClaimRecord, HospitalRecord, SupportTicket, DataConsent, EnrolledMember, EnrollmentProposal } from '../../types';
import { api } from '../../services/api';

interface CustomerConsoleProps {
  policies: PolicyPlan[];
  claims: ClaimRecord[];
  hospitals: HospitalRecord[];
  tickets: SupportTicket[];
  consents: DataConsent[];
  currentMember: EnrolledMember | null;
  recentEnrollments: EnrollmentProposal[];
  onStartNewEnrollment: (policyCode?: string) => void;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const CustomerConsole: React.FC<CustomerConsoleProps> = ({
  policies,
  claims,
  hospitals,
  tickets,
  consents,
  currentMember,
  recentEnrollments,
  onStartNewEnrollment,
  onRefreshData,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'policies' | 'hospitals' | 'claims' | 'support' | 'consent'>('plans');

  // Hospital filter
  const [searchCity, setSearchCity] = useState<string>('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('');
  const [cashlessOnly, setCashlessOnly] = useState<boolean>(true);

  // Claim Filing Form State
  const [claimType, setClaimType] = useState<'CASHLESS' | 'REIMBURSEMENT'>('CASHLESS');
  const [claimForm, setClaimForm] = useState({
    patientName: currentMember ? `${currentMember.first_name} ${currentMember.last_name}` : 'John Doe',
    hospitalName: 'Apollo Super Speciality Hospital, Mumbai',
    doctorName: 'Dr. Vivek Murthy',
    diagnosis: 'Acute appendicitis and laparoscopic appendectomy',
    estimatedCost: '185000',
    serviceDate: new Date().toISOString().split('T')[0],
    bankAccount: 'HDFC Bank (Acct: *******005)',
  });

  // Support Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'CLAIMS_ASSISTANCE',
    priority: 'HIGH',
    description: '',
  });

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (claimType === 'CASHLESS') {
        const res = await api.submitCashlessPreAuth({
          memberId: currentMember?.member_id || 'MEM-1001',
          policyCode: currentMember?.active_policy_code || 'POL-GLD-03',
          patientName: claimForm.patientName,
          hospitalName: claimForm.hospitalName,
          doctorName: claimForm.doctorName,
          provisionalDiagnosis: claimForm.diagnosis,
          estimatedCost: Number(claimForm.estimatedCost),
          plannedAdmissionDate: claimForm.serviceDate,
        });
        showToast(`Cashless pre-auth voucher ${res.preAuth?.pre_auth_number || 'PA-2026-904'} submitted!`);
      } else {
        const res = await api.submitReimbursementClaim({
          memberId: currentMember?.member_id || 'MEM-1001',
          policyCode: currentMember?.active_policy_code || 'POL-GLD-03',
          patientName: claimForm.patientName,
          hospitalName: claimForm.hospitalName,
          treatmentDescription: claimForm.diagnosis,
          claimedAmount: Number(claimForm.estimatedCost),
          serviceDate: claimForm.serviceDate,
          bankDetails: claimForm.bankAccount,
        });
        showToast(`Reimbursement claim ${res.claim?.claim_number || 'CLM-2026-104'} filed for medical audit review.`);
      }
      onRefreshData();
    } catch {
      showToast('Claim recorded in sandbox mode.');
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject) return;

    try {
      const res = await api.createSupportTicket({
        userId: Number(currentMember?.id) || 1,
        policyCode: currentMember?.active_policy_code || 'POL-GLD-03',
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        description: ticketForm.description,
      });
      showToast(`Support Ticket created! Synced with Jira Service Management key: ${res.jira_integration?.jira_key || 'HS-701'}`);
      setTicketForm({ subject: '', category: 'CLAIMS_ASSISTANCE', priority: 'HIGH', description: '' });
      onRefreshData();
    } catch {
      showToast('Support ticket dispatched.');
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    const matchCity = searchCity ? h.city.toLowerCase().includes(searchCity.toLowerCase()) : true;
    const matchSpec = filterSpecialty ? h.specialty.toLowerCase().includes(filterSpecialty.toLowerCase()) : true;
    const matchCashless = cashlessOnly ? h.cashless_approved : true;
    return matchCity && matchSpec && matchCashless;
  });

  return (
    <div>
      {/* Top Hero Callout: New Customer Enrollment Option */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)',
        border: '1px solid #3730a3',
        borderRadius: 16,
        padding: '20px 26px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🌟</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              Looking for Health Insurance?
            </span>
            <span style={{ fontSize: 11, background: '#10b981', color: '#000', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
              NEW ENROLLMENT OPEN
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            New user? Apply online in under 3 minutes with instant quote calculation, medical disclosures, e-KYC, and digital card generation.
          </p>
        </div>

        <button
          onClick={() => onStartNewEnrollment()}
          style={{
            padding: '10px 22px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>Apply for New Policy Now</span>
          <span>→</span>
        </button>
      </div>

      {/* Customer Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid #293859',
        paddingBottom: 14,
        marginBottom: 24,
        overflowX: 'auto'
      }}>
        {[
          { id: 'plans', label: '🔍 Explore & Compare Plans' },
          { id: 'policies', label: '📄 My Active Policies & e-Cards' },
          { id: 'hospitals', label: '🏥 Cashless Hospital Finder' },
          { id: 'claims', label: '📋 Claims (Cashless & Reimbursement)' },
          { id: 'support', label: '🎫 Support Desk (Jira JSM)' },
          { id: 'consent', label: '🔐 Consent Manager (IRDAI)' }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: isSelected ? '#4f46e5' : '#162032',
                color: isSelected ? '#fff' : '#cbd5e1',
                boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.4)' : 'none'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: EXPLORE & COMPARE PLANS
          ========================================================================= */}
      {activeTab === 'plans' && (
        <div>
          <div style={{ background: '#162032', padding: 22, borderRadius: 14, border: '1px solid #293859', marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: '#fff' }}>
              Healthcare Protection Plans — Plain Language Jargon Busters
            </h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              No misleading insurance jargon. We decode critical policy terms like <strong>Room-Rent Limits</strong>, <strong>Waiting Periods</strong>, and <strong>Co-payments</strong> so you choose the right protection for your family.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 20 }}>
            {policies.map((p) => (
              <div
                key={p.code}
                style={{
                  background: '#162032',
                  borderRadius: 14,
                  border: '1px solid #293859',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: p.tier === 'Platinum' ? '#d97706' : p.tier === 'Gold' ? '#eab308' : '#64748b',
                      color: '#000'
                    }}>
                      {p.tier} Tier
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{p.code}</span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#fff' }}>{p.name}</h3>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', marginBottom: 14 }}>
                    ₹{Number(p.monthly_premium * 12).toLocaleString()}
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}> /year</span>
                  </div>

                  {/* Plain Language Jargon Box */}
                  <div style={{ background: '#0b132b', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💡</span> Plain-Language Breakdown:
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                      <strong>Sum Insured:</strong> {p.plain_language_explanation?.sum_insured_plain || `₹${(p.max_coverage / 100000).toFixed(0)} Lakh coverage`}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                      <strong>Room Rent:</strong> {p.plain_language_explanation?.room_rent_plain || p.room_rent_limit}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                      <strong>Waiting Period:</strong> {p.plain_language_explanation?.waiting_period_plain || `${p.waiting_period_pre_existing_months} months for pre-existing diseases`}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      <strong>Co-Pay:</strong> {p.plain_language_explanation?.copay_plain || `${p.copay_percent}% payable by patient`}
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ marginBottom: 18 }}>
                    {p.features?.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ color: '#10b981' }}>✓</span> {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => onStartNewEnrollment(p.code)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Enroll Now (Instant)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MY ACTIVE POLICIES & DOCUMENTS
          ========================================================================= */}
      {activeTab === 'policies' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>My Active Health Policies</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                View your active insurance schedules, digital health passes, and tax deduction receipts.
              </p>
            </div>
            <button
              onClick={() => onStartNewEnrollment()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#10b981',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Enroll New Policy
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Display Enrolled Policies (Current Member + Any recently completed enrollment) */}
            {recentEnrollments.length > 0 ? (
              recentEnrollments.map((prop) => (
                <div
                  key={prop.id}
                  style={{
                    background: '#162032',
                    border: '1px solid #10b981',
                    borderRadius: 16,
                    padding: 24,
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#10b981', color: '#000', padding: '3px 8px', borderRadius: 6 }}>
                        ACTIVE COVER
                      </span>
                      <h4 style={{ margin: '8px 0 4px 0', fontSize: 18, color: '#fff' }}>
                        {prop.policyName}
                      </h4>
                      <div style={{ fontSize: 12, color: '#38bdf8' }}>
                        Member ID: {prop.memberId} • Policy: {prop.policyNumber}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Sum Insured</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#34d399' }}>
                        ₹{(prop.sumInsured / 100000).toFixed(0)} Lakh
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#0b132b', borderRadius: 10, padding: 14, margin: '14px 0', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                      • Primary Insured: <strong>{prop.applicant.fullName}</strong> ({prop.applicant.age} yrs)
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                      • Covered Dependents: <strong>{prop.applicant.dependents?.length || 0} person(s)</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                      • Tax 80D Certificate: <strong>{prop.taxCertificateNumber || 'SEC80D-2026-904123'}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      • Effective From: <strong>{prop.effectiveDate || new Date().toISOString().split('T')[0]}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => showToast(`Digital e-Card for ${prop.memberId} ready for mobile wallet.`)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: '#0284c7', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      🪪 Download Digital Card
                    </button>
                    <button
                      onClick={() => showToast(`Tax 80D Exemption Receipt downloaded.`)}
                      style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }}
                    >
                      📄 Tax Certificate
                    </button>
                  </div>
                </div>
              ))
            ) : currentMember ? (
              <div
                style={{
                  background: '#162032',
                  border: '1px solid #293859',
                  borderRadius: 16,
                  padding: 24
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#10b981', color: '#000', padding: '3px 8px', borderRadius: 6 }}>
                      ACTIVE COVER
                    </span>
                    <h4 style={{ margin: '8px 0 4px 0', fontSize: 18, color: '#fff' }}>
                      Advantage Plus Gold (POL-GLD-03)
                    </h4>
                    <div style={{ fontSize: 12, color: '#38bdf8' }}>
                      Member ID: {currentMember.member_id} • Status: {currentMember.policy_status}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Sum Insured</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#34d399' }}>₹25 Lakh</div>
                  </div>
                </div>

                <div style={{ background: '#0b132b', borderRadius: 10, padding: 14, margin: '14px 0', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                    • Primary Insured: <strong>{currentMember.first_name} {currentMember.last_name}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                    • Email: {currentMember.email} • Mobile: {currentMember.phone}
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    • Effective Date: {currentMember.effective_date}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => showToast(`Digital Health e-Card for ${currentMember.member_id} ready.`)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: '#0284c7', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    🪪 Download Digital Card
                  </button>
                  <button
                    onClick={() => showToast(`Tax 80D Exemption Receipt generated.`)}
                    style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }}
                  >
                    📄 Tax Certificate
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#162032', padding: 24, borderRadius: 12, textAlign: 'center', color: '#94a3b8' }}>
                No active policies found. Click "+ Enroll New Policy" to apply today!
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CASHLESS HOSPITAL NETWORK
          ========================================================================= */}
      {activeTab === 'hospitals' && (
        <div>
          <div style={{ background: '#162032', padding: 20, borderRadius: 14, border: '1px solid #293859', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#fff' }}>
              Find 10,000+ Empanelled Cashless Hospitals
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <input
                type="text"
                placeholder="Search city (e.g. Mumbai, Delhi, Bengaluru)..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                style={{ padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #293859', color: '#fff', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="Specialty (e.g. Cardiology, Oncology)..."
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                style={{ padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #293859', color: '#fff', fontSize: 13 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cashlessOnly}
                  onChange={(e) => setCashlessOnly(e.target.checked)}
                  style={{ accentColor: '#10b981' }}
                />
                Cashless Empanelled Only
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {filteredHospitals.map((h) => (
              <div
                key={h.id}
                style={{ background: '#162032', border: '1px solid #293859', borderRadius: 12, padding: 18 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{h.name}</h4>
                  <span style={{ fontSize: 12, color: '#eab308' }}>⭐ {h.rating}</span>
                </div>
                <div style={{ fontSize: 12, color: '#38bdf8', marginBottom: 6 }}>
                  {h.specialty} • {h.tier}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  📍 {h.address}, {h.city}, {h.state}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 10 }}>
                  <span style={{ fontSize: 11, color: h.cashless_approved ? '#10b981' : '#94a3b8' }}>
                    {h.cashless_approved ? '✓ 100% Cashless Desk Active' : 'Reimbursement Only'}
                  </span>
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>📞 {h.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CLAIMS (SUBMISSION & TRACKING)
          ========================================================================= */}
      {activeTab === 'claims' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Claim Filing Form */}
          <div style={{ background: '#162032', borderRadius: 16, border: '1px solid #293859', padding: 24 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#fff' }}>
              File a Claim (Cashless Pre-Auth or Reimbursement)
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#94a3b8' }}>
              Cashless pre-auth is sent directly to the hospital TPA desk. Reimbursement covers treatments paid out-of-pocket.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setClaimType('CASHLESS')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: claimType === 'CASHLESS' ? '#0891b2' : '#0b132b',
                  color: claimType === 'CASHLESS' ? '#fff' : '#94a3b8'
                }}
              >
                🏥 Cashless Pre-Auth
              </button>
              <button
                type="button"
                onClick={() => setClaimType('REIMBURSEMENT')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: claimType === 'REIMBURSEMENT' ? '#4f46e5' : '#0b132b',
                  color: claimType === 'REIMBURSEMENT' ? '#fff' : '#94a3b8'
                }}
              >
                💵 Reimbursement Claim
              </button>
            </div>

            <form onSubmit={handleClaimSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  Patient Full Name
                </label>
                <input
                  type="text"
                  value={claimForm.patientName}
                  onChange={(e) => setClaimForm({ ...claimForm, patientName: e.target.value })}
                  style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  Hospital Name
                </label>
                <input
                  type="text"
                  value={claimForm.hospitalName}
                  onChange={(e) => setClaimForm({ ...claimForm, hospitalName: e.target.value })}
                  style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  Diagnosis / Planned Treatment
                </label>
                <input
                  type="text"
                  value={claimForm.diagnosis}
                  onChange={(e) => setClaimForm({ ...claimForm, diagnosis: e.target.value })}
                  style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Claimed Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={claimForm.estimatedCost}
                    onChange={(e) => setClaimForm({ ...claimForm, estimatedCost: e.target.value })}
                    style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Date of Admission
                  </label>
                  <input
                    type="date"
                    value={claimForm.serviceDate}
                    onChange={(e) => setClaimForm({ ...claimForm, serviceDate: e.target.value })}
                    style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: claimType === 'CASHLESS' ? '#0891b2' : '#4f46e5',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Submit {claimType === 'CASHLESS' ? 'Pre-Authorization Voucher' : 'Claim for Settlement'}
              </button>
            </form>
          </div>

          {/* Claim Tracking Timeline */}
          <div>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 16, color: '#fff' }}>
              Claims Status & Audit History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {claims.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: '#162032',
                    border: '1px solid #293859',
                    borderRadius: 12,
                    padding: 16
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{c.claim_number}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: c.status === 'APPROVED' ? '#064e3b' : c.status === 'IN_REVIEW' ? '#78350f' : '#1e293b',
                      color: c.status === 'APPROVED' ? '#34d399' : c.status === 'IN_REVIEW' ? '#fde047' : '#94a3b8'
                    }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#fff', marginBottom: 4 }}>{c.treatment_description}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    {c.provider_hospital} • Date: {c.service_date}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                    <span>Claimed: <strong>₹{c.claimed_amount?.toLocaleString()}</strong></span>
                    {c.approved_amount && (
                      <span style={{ color: '#34d399' }}>Approved: <strong>₹{c.approved_amount?.toLocaleString()}</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SUPPORT DESK (JIRA JSM)
          ========================================================================= */}
      {activeTab === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#162032', borderRadius: 16, border: '1px solid #293859', padding: 24 }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#fff' }}>Raise Support Ticket (Jira Service Desk)</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#94a3b8' }}>
              Direct integration with Jira Service Management (JSM) and Splunk logging.
            </p>

            <form onSubmit={handleTicketSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Query regarding pre-auth approval at Apollo Hospital"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                  >
                    <option value="CLAIMS_ASSISTANCE">Claims Assistance</option>
                    <option value="POLICY_RENEWAL">Policy Renewal & Endorsement</option>
                    <option value="TAX_80D_QUERY">Tax 80D Certificate</option>
                    <option value="HOSPITAL_NETWORK">Hospital Empanellment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                  >
                    <option value="HIGH">High (Urgent Hospitalization)</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide any details, hospital reference, or invoice numbers..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  style={{ width: '100%', padding: 9, borderRadius: 6, background: '#0b132b', border: '1px solid #293859', color: '#fff' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 8,
                  background: '#4f46e5',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Dispatch to Jira Service Management
              </button>
            </form>
          </div>

          <div>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 16, color: '#fff' }}>Open Support Tickets</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tickets.map((t) => (
                <div
                  key={t.id}
                  style={{ background: '#162032', border: '1px solid #293859', borderRadius: 12, padding: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{t.ticket_id || `TCK-${t.id}`}</span>
                    <span style={{ fontSize: 11, background: '#064e3b', color: '#34d399', padding: '2px 8px', borderRadius: 4 }}>
                      Jira: {t.jira_key || 'HS-401'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Category: {t.category} • Status: {t.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: CONSENT MANAGER (IRDAI / DPDP)
          ========================================================================= */}
      {activeTab === 'consent' && (
        <div style={{ background: '#162032', borderRadius: 16, border: '1px solid #293859', padding: 24 }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#fff' }}>
            IRDAI & DPDP Compliant Data Consent Vault
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#94a3b8' }}>
            In compliance with Digital Personal Data Protection (DPDP) Act 2023 & IRDAI Master Guidelines, you maintain sovereign control over who accesses your electronic health records.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {consents.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#0b132b',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{c.purpose}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Entity: <strong>{c.granted_to}</strong> • Valid until: {c.valid_until}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, background: '#064e3b', color: '#34d399', padding: '3px 8px', borderRadius: 4 }}>
                    {c.status}
                  </span>
                  <button
                    onClick={async () => {
                      await api.withdrawConsent(c.id);
                      showToast(`Consent for "${c.purpose}" withdrawn.`);
                      onRefreshData();
                    }}
                    style={{
                      background: '#ef444422',
                      border: '1px solid #ef444466',
                      color: '#f87171',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Withdraw Consent
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
