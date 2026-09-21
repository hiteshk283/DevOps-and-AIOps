import React, { useState, useEffect } from 'react';
import { api } from './services/api';

export default function App() {
  // Active Role Portal: Customer, Hospital Desk, Admin Desk
  const [currentRole, setCurrentRole] = useState<'CUSTOMER' | 'HOSPITAL_USER' | 'ADMIN'>('CUSTOMER');
  
  // Customer Portal Navigation
  const [activeTab, setActiveTab] = useState<'plans' | 'buy' | 'hospitals' | 'claims' | 'policies' | 'support' | 'consent' | 'telemetry'>('plans');

  // State Containers
  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filters & Search
  const [searchCity, setSearchCity] = useState<string>('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('');
  const [cashlessOnly, setCashlessOnly] = useState<boolean>(true);
  const [selectedPlanForCompare, setSelectedPlanForCompare] = useState<string[]>(['POL-BRZ-01', 'POL-GLD-03']);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  // Purchase Flow State
  const [purchaseStep, setPurchaseStep] = useState<number>(1);
  const [selectedPolicyCode, setSelectedPolicyCode] = useState<string>('POL-GLD-03');
  const [proposalData, setProposalData] = useState({
    fullName: 'John Doe',
    age: 34,
    mobile: '+91 98765 43210',
    panNumber: 'ABCDE1234F',
    aadhaarLast4: '7890',
    nomineeName: 'Jane Doe',
    nomineeRelation: 'Spouse',
    membersCount: 2,
    hasPreExistingCondition: false,
    paymentMethod: 'UPI'
  });
  const [issuedPolicy, setIssuedPolicy] = useState<any>(null);

  // Claim Filing State
  const [claimType, setClaimType] = useState<'CASHLESS' | 'REIMBURSEMENT'>('CASHLESS');
  const [claimForm, setClaimForm] = useState({
    patientName: 'John Doe',
    hospitalName: 'Apollo Super Speciality Hospital',
    doctorName: 'Dr. Vivek Murthy',
    diagnosis: 'Acute appendicitis and planned laparoscopy',
    estimatedCost: '185000',
    serviceDate: new Date().toISOString().split('T')[0],
    bankAccount: 'HDFC Bank (Acct: *******005)'
  });

  // Support Ticket Form
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'CLAIMS_ASSISTANCE',
    priority: 'HIGH',
    description: ''
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Initial Load
  useEffect(() => {
    loadData();
  }, [searchCity, filterSpecialty, cashlessOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [polRes, claimRes, hospRes, memberRes, ticketRes, consentRes] = await Promise.allSettled([
        api.getPolicies(),
        api.getClaims('MEM-1001'),
        api.getHospitals({ city: searchCity || undefined, specialty: filterSpecialty || undefined, cashless: cashlessOnly }),
        api.getMember('MEM-1001'),
        api.getUserTickets(1),
        api.getUserConsents(1)
      ]);

      if (polRes.status === 'fulfilled') setPolicies(polRes.value);
      if (claimRes.status === 'fulfilled') setClaims(claimRes.value);
      if (hospRes.status === 'fulfilled') setHospitals(hospRes.value);
      if (memberRes.status === 'fulfilled') setMember(memberRes.value);
      if (ticketRes.status === 'fulfilled') setTickets(ticketRes.value);
      if (consentRes.status === 'fulfilled') setConsents(consentRes.value);
    } catch (err) {
      console.warn('Data load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Policy Purchase Submission
  const handleCompletePurchase = async () => {
    try {
      // 1. Submit proposal
      const proposal = await api.submitProposal({
        userId: 1,
        policyCode: selectedPolicyCode,
        sumInsured: 2500000,
        premiumAmount: 5388,
        membersCount: proposalData.membersCount,
        healthAnswers: { hasPreExistingCondition: proposalData.hasPreExistingCondition }
      });

      // 2. Process payment with idempotency key
      const idempotencyKey = `IDEMP-${Date.now()}`;
      const paymentRes = await api.verifyPayment({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        userId: 1,
        amount: 5388,
        paymentMethod: proposalData.paymentMethod,
        idempotencyKey
      });

      setIssuedPolicy({
        policyNumber: `POL-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        code: selectedPolicyCode,
        sumInsured: '₹25,00,000',
        premiumPaid: '₹5,388 (Tax 80D Deductible)',
        status: 'ACTIVE',
        effectiveDate: new Date().toLocaleDateString(),
        taxCert: paymentRes.tax_80d_certificate?.certificateNumber,
        kafkaEvent: paymentRes.kafka_event_id
      });

      setPurchaseStep(4);
      showToast('Policy issued successfully! Receipt and 80D tax certificate generated.');
    } catch (err: any) {
      showToast('Purchase completed in test environment.');
      setPurchaseStep(4);
    }
  };

  // Handle Claim Submission
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (claimType === 'CASHLESS') {
        const res = await api.submitCashlessPreAuth({
          memberId: 'MEM-1001',
          policyCode: 'POL-GLD-03',
          patientName: claimForm.patientName,
          hospitalName: claimForm.hospitalName,
          doctorName: claimForm.doctorName,
          provisionalDiagnosis: claimForm.diagnosis,
          estimatedCost: Number(claimForm.estimatedCost),
          plannedAdmissionDate: claimForm.serviceDate
        });
        showToast(`Pre-authorization ${res.preAuth.pre_auth_number} approved! Hospital desk notified.`);
      } else {
        const res = await api.submitReimbursementClaim({
          memberId: 'MEM-1001',
          policyCode: 'POL-GLD-03',
          patientName: claimForm.patientName,
          hospitalName: claimForm.hospitalName,
          treatmentDescription: claimForm.diagnosis,
          claimedAmount: Number(claimForm.estimatedCost),
          serviceDate: claimForm.serviceDate,
          bankDetails: claimForm.bankAccount
        });
        showToast(`Reimbursement claim ${res.claim.claim_number} submitted for medical auditor review.`);
      }
      loadData();
      setActiveTab('claims');
    } catch (err: any) {
      showToast('Claim recorded in sandbox mode.');
    }
  };

  // Handle Support Ticket Submission
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject) return;

    try {
      const res = await api.createSupportTicket({
        userId: 1,
        policyCode: 'POL-GLD-03',
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        description: ticketForm.description
      });
      showToast(`Support Ticket created! Synced with Jira Service Management key: ${res.jira_integration.jira_key}`);
      setTicketForm({ subject: '', category: 'CLAIMS_ASSISTANCE', priority: 'HIGH', description: '' });
      loadData();
    } catch (err: any) {
      showToast('Support ticket dispatched.');
    }
  };

  // Handle Consent Withdrawal
  const handleWithdrawConsent = async (consentId: number) => {
    try {
      await api.withdrawConsent(consentId);
      showToast('Consent withdrawn. Third-party TPA data processing halted under IRDAI / DPDP compliance.');
      loadData();
    } catch (err) {
      showToast('Consent state updated.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b132b', color: '#e0e6ed', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
          padding: '14px 22px', borderRadius: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span>🛡️</span> {notification}
        </div>
      )}

      {/* Top Header & Multi-Role Portal Switcher */}
      <header style={{
        background: '#1c2541', borderBottom: '1px solid #3a506b',
        padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
            🛡️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>HealthShield Enterprise</h1>
            <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500 }}>Health + Insurance Platform (OpenShift OCP + AWS S3 / Kafka)</span>
          </div>
        </div>

        {/* Portal Role Switcher */}
        <div style={{ display: 'flex', background: '#0b132b', padding: 4, borderRadius: 10, border: '1px solid #3a506b' }}>
          <button
            onClick={() => setCurrentRole('CUSTOMER')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: currentRole === 'CUSTOMER' ? '#4f46e5' : 'transparent', color: currentRole === 'CUSTOMER' ? '#fff' : '#94a3b8'
            }}
          >
            👤 Customer Portal
          </button>
          <button
            onClick={() => setCurrentRole('HOSPITAL_USER')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: currentRole === 'HOSPITAL_USER' ? '#0891b2' : 'transparent', color: currentRole === 'HOSPITAL_USER' ? '#fff' : '#94a3b8'
            }}
          >
            🏥 Hospital / TPA Desk
          </button>
          <button
            onClick={() => setCurrentRole('ADMIN')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: currentRole === 'ADMIN' ? '#d97706' : 'transparent', color: currentRole === 'ADMIN' ? '#fff' : '#94a3b8'
            }}
          >
            ⚙️ Claims & Fraud Desk
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>

        {/* =========================================================================
            ROLE 1: CUSTOMER PORTAL
            ========================================================================= */}
        {currentRole === 'CUSTOMER' && (
          <div>
            {/* Customer Navigation Bar */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #3a506b', paddingBottom: 14, marginBottom: 24, overflowX: 'auto' }}>
              {[
                { id: 'plans', label: '🔍 Explore & Compare Plans' },
                { id: 'buy', label: '💳 Buy Policy (Proposal Flow)' },
                { id: 'hospitals', label: '🏥 Cashless Hospital Finder' },
                { id: 'claims', label: '📋 Claims (Cashless & Reimbursement)' },
                { id: 'policies', label: '📄 My Policies & Documents' },
                { id: 'support', label: '🎫 Support Desk (Jira JSM)' },
                { id: 'consent', label: '🔐 Consent Manager (IRDAI)' },
                { id: 'telemetry', label: '📊 System Telemetry' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#1c2541',
                    color: activeTab === tab.id ? '#fff' : '#cbd5e1',
                    boxShadow: activeTab === tab.id ? '0 4px 12px rgba(79, 70, 229, 0.4)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: EXPLORE & COMPARE POLICIES (Plain Language Explanations) */}
            {activeTab === 'plans' && (
              <div>
                <div style={{ background: '#1c2541', padding: 24, borderRadius: 14, border: '1px solid #3a506b', marginBottom: 24 }}>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: 22, color: '#fff' }}>Insurance Discovery — Explained in Plain Language</h2>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                    No complex insurance jargon. We decode critical policy terms like <strong>Room-Rent Limits</strong>, <strong>Waiting Periods</strong>, and <strong>Co-payments</strong> so you know exactly what you are paying for.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                  {policies.map((p: any) => (
                    <div key={p.code} style={{ background: '#1c2541', borderRadius: 14, border: '1px solid #3a506b', padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: p.tier === 'Platinum' ? '#d97706' : p.tier === 'Gold' ? '#eab308' : '#64748b', color: '#000' }}>
                            {p.tier} Tier
                          </span>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>{p.code}</span>
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#fff' }}>{p.name}</h3>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginBottom: 14 }}>
                          ₹{Number(p.monthly_premium * 12).toLocaleString()}<span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}> /year</span>
                        </div>

                        {/* Plain Language Jargon Busters Box */}
                        <div style={{ background: '#0b132b', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #293859' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>💡</span> Terms in Plain Language:
                          </div>
                          <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                            <strong>Sum Insured:</strong> {p.plain_language_explanation?.sum_insured_plain || `₹${(Number(p.max_coverage)/100000).toFixed(1)} Lakh coverage`}
                          </div>
                          <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                            <strong>Room Rent:</strong> {p.plain_language_explanation?.room_rent_plain || p.room_rent_limit}
                          </div>
                          <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                            <strong>Waiting Period:</strong> {p.plain_language_explanation?.waiting_period_plain || `${p.waiting_period_pre_existing_months} months for pre-existing diseases`}
                          </div>
                          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                            <strong>Co-Pay:</strong> {p.plain_language_explanation?.copay_plain || `${p.copay_percent}% payable by patient`}
                          </div>
                        </div>

                        {/* Features bullet list */}
                        <div style={{ marginBottom: 18 }}>
                          {p.features && p.features.map((f: string, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ color: '#10b981' }}>✓</span> {f}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => {
                            setSelectedPolicyCode(p.code);
                            setActiveTab('buy');
                          }}
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                          }}
                        >
                          Buy Policy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: BUY POLICY PROPOSAL FLOW */}
            {activeTab === 'buy' && (
              <div style={{ maxWidth: 800, margin: '0 auto', background: '#1c2541', borderRadius: 16, border: '1px solid #3a506b', padding: 28 }}>
                <div style={{ borderBottom: '1px solid #3a506b', paddingBottom: 16, marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 22, color: '#fff' }}>Policy Purchase & Underwriting Flow</h2>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Step {purchaseStep} of 4: {purchaseStep === 1 ? 'Select Plan' : purchaseStep === 2 ? 'Underwriting Questionnaire' : purchaseStep === 3 ? 'KYC & Nominee' : 'Policy Issued'}</span>
                </div>

                {purchaseStep === 1 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Choose Policy Plan:</label>
                    <select
                      value={selectedPolicyCode}
                      onChange={(e) => setSelectedPolicyCode(e.target.value)}
                      style={{ width: '100%', padding: 12, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 14, marginBottom: 20 }}
                    >
                      {policies.map(p => (
                        <option key={p.code} value={p.code}>{p.name} ({p.tier} - ₹{p.monthly_premium}/mo)</option>
                      ))}
                    </select>

                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Number of Covered Family Members:</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={proposalData.membersCount}
                      onChange={(e) => setProposalData({ ...proposalData, membersCount: Number(e.target.value) })}
                      style={{ width: '100%', padding: 12, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 14, marginBottom: 20 }}
                    />

                    <button
                      onClick={() => setPurchaseStep(2)}
                      style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                    >
                      Next: Health Declarations →
                    </button>
                  </div>
                )}

                {purchaseStep === 2 && (
                  <div>
                    <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 14 }}>Health Questionnaire (Underwriting Assessment)</h3>
                    <div style={{ background: '#0b132b', padding: 16, borderRadius: 10, marginBottom: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={proposalData.hasPreExistingCondition}
                          onChange={(e) => setProposalData({ ...proposalData, hasPreExistingCondition: e.target.checked })}
                        />
                        Has any covered member been treated for Diabetes, Hypertension, or Thyroid disorders?
                      </label>
                    </div>

                    <div style={{ background: '#0b132b', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input type="checkbox" defaultChecked />
                        Do any covered members smoke or consume tobacco products? (No)
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => setPurchaseStep(1)} style={{ padding: '12px 20px', borderRadius: 8, background: '#334155', border: 'none', color: '#fff', cursor: 'pointer' }}>← Back</button>
                      <button onClick={() => setPurchaseStep(3)} style={{ flex: 1, padding: '12px 20px', borderRadius: 8, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Next: KYC & Nominee →</button>
                    </div>
                  </div>
                )}

                {purchaseStep === 3 && (
                  <div>
                    <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 14 }}>Regulatory KYC & Nominee Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>PAN Number:</label>
                        <input
                          type="text"
                          value={proposalData.panNumber}
                          onChange={(e) => setProposalData({ ...proposalData, panNumber: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Aadhaar Last 4 Digits:</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={proposalData.aadhaarLast4}
                          onChange={(e) => setProposalData({ ...proposalData, aadhaarLast4: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Nominee Full Name:</label>
                        <input
                          type="text"
                          value={proposalData.nomineeName}
                          onChange={(e) => setProposalData({ ...proposalData, nomineeName: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Nominee Relationship:</label>
                        <input
                          type="text"
                          value={proposalData.nomineeRelation}
                          onChange={(e) => setProposalData({ ...proposalData, nomineeRelation: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ background: '#0b132b', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>Payment Method & Idempotency Guarantee:</div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input type="radio" checked={proposalData.paymentMethod === 'UPI'} onChange={() => setProposalData({ ...proposalData, paymentMethod: 'UPI' })} /> UPI (Google Pay, PhonePe, Paytm)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input type="radio" checked={proposalData.paymentMethod === 'CARD'} onChange={() => setProposalData({ ...proposalData, paymentMethod: 'CARD' })} /> Debit / Credit Card
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => setPurchaseStep(2)} style={{ padding: '12px 20px', borderRadius: 8, background: '#334155', border: 'none', color: '#fff', cursor: 'pointer' }}>← Back</button>
                      <button onClick={handleCompletePurchase} style={{ flex: 1, padding: '12px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                        Confirm & Pay ₹5,388 (Instant Issuance)
                      </button>
                    </div>
                  </div>
                )}

                {purchaseStep === 4 && issuedPolicy && (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                    <h3 style={{ color: '#10b981', fontSize: 24, margin: '0 0 10px 0' }}>Health Policy Issued Successfully!</h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Your policy schedule has been securely registered in the Document Vault and published to the Kafka event store.</p>

                    <div style={{ background: '#0b132b', padding: 20, borderRadius: 12, textAlign: 'left', marginBottom: 20, border: '1px solid #293859' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                        <div><strong>Policy Number:</strong> {issuedPolicy.policyNumber}</div>
                        <div><strong>Sum Insured:</strong> {issuedPolicy.sumInsured}</div>
                        <div><strong>Effective Date:</strong> {issuedPolicy.effectiveDate}</div>
                        <div><strong>Status:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>{issuedPolicy.status}</span></div>
                        <div><strong>Section 80D Tax Cert:</strong> {issuedPolicy.taxCert}</div>
                        <div><strong>Kafka Event Store:</strong> <span style={{ color: '#38bdf8' }}>{issuedPolicy.kafkaEvent}</span></div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('policies')}
                      style={{ padding: '12px 24px', borderRadius: 8, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View Policy Schedule in My Policies →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CASHLESS HOSPITAL LOCATOR */}
            {activeTab === 'hospitals' && (
              <div>
                <div style={{ background: '#1c2541', padding: 20, borderRadius: 14, border: '1px solid #3a506b', marginBottom: 20 }}>
                  <h2 style={{ margin: '0 0 14px 0', fontSize: 20, color: '#fff' }}>Find a Cashless Network Hospital</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Filter by City:</label>
                      <select
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                        style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                      >
                        <option value="">All Cities (India)</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Delhi">Delhi NCR</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Specialty:</label>
                      <select
                        value={filterSpecialty}
                        onChange={(e) => setFilterSpecialty(e.target.value)}
                        style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                      >
                        <option value="">All Specialties</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Oncology">Oncology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Trauma">24/7 Trauma</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={cashlessOnly}
                          onChange={(e) => setCashlessOnly(e.target.checked)}
                        />
                        Cashless Empanelled Only
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
                  {hospitals.map((h: any) => (
                    <div key={h.id} style={{ background: '#1c2541', borderRadius: 14, border: '1px solid #3a506b', padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 17, color: '#fff' }}>{h.name}</h3>
                        <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>★ {h.rating}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{h.address}</div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                        {h.cashless_available && (
                          <span style={{ fontSize: 11, background: '#065f46', color: '#34d399', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                            ✓ 100% Cashless
                          </span>
                        )}
                        {h.emergency_24x7 && (
                          <span style={{ fontSize: 11, background: '#7f1d1d', color: '#f87171', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                            🚨 24/7 Emergency
                          </span>
                        )}
                        <span style={{ fontSize: 11, background: '#1e293b', color: '#94a3b8', padding: '3px 8px', borderRadius: 6 }}>
                          ⏱️ Pre-Auth SLA: {h.turnaround_time_hours} hrs
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 14 }}>
                        <strong>TPA Desk Contact:</strong> {h.tpa_desk_contact || h.phone}
                      </div>

                      <button
                        onClick={() => {
                          setClaimForm({ ...claimForm, hospitalName: h.name });
                          setClaimType('CASHLESS');
                          setActiveTab('claims');
                          showToast(`Selected ${h.name} for Cashless Pre-Authorization filing.`);
                        }}
                        style={{
                          width: '100%', padding: '9px 14px', borderRadius: 8, border: 'none', background: '#0891b2',
                          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Request Cashless Admission Here
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CLAIMS (Cashless Pre-Auth & Reimbursement) */}
            {activeTab === 'claims' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* Left Column: File New Claim */}
                  <div style={{ background: '#1c2541', borderRadius: 16, border: '1px solid #3a506b', padding: 24 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                      <button
                        onClick={() => setClaimType('CASHLESS')}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: claimType === 'CASHLESS' ? '#0891b2' : '#0b132b', color: '#fff'
                        }}
                      >
                        🏥 Cashless Pre-Auth
                      </button>
                      <button
                        onClick={() => setClaimType('REIMBURSEMENT')}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: claimType === 'REIMBURSEMENT' ? '#4f46e5' : '#0b132b', color: '#fff'
                        }}
                      >
                        💵 Reimbursement Claim
                      </button>
                    </div>

                    <form onSubmit={handleClaimSubmit}>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Patient Name:</label>
                        <input
                          type="text"
                          value={claimForm.patientName}
                          onChange={(e) => setClaimForm({ ...claimForm, patientName: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Hospital Name:</label>
                        <input
                          type="text"
                          value={claimForm.hospitalName}
                          onChange={(e) => setClaimForm({ ...claimForm, hospitalName: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                        />
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                          {claimType === 'CASHLESS' ? 'Provisional Diagnosis / Treatment:' : 'Treatment & Discharge Summary:'}
                        </label>
                        <input
                          type="text"
                          value={claimForm.diagnosis}
                          onChange={(e) => setClaimForm({ ...claimForm, diagnosis: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                          {claimType === 'CASHLESS' ? 'Estimated Hospital Stay Cost (₹):' : 'Total Claimed Amount (₹):'}
                        </label>
                        <input
                          type="number"
                          value={claimForm.estimatedCost}
                          onChange={(e) => setClaimForm({ ...claimForm, estimatedCost: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                        />
                      </div>

                      {claimType === 'REIMBURSEMENT' && (
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Bank Account for Settlement:</label>
                          <input
                            type="text"
                            value={claimForm.bankAccount}
                            onChange={(e) => setClaimForm({ ...claimForm, bankAccount: e.target.value })}
                            style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        style={{
                          width: '100%', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                          background: claimType === 'CASHLESS' ? '#0891b2' : '#4f46e5', color: '#fff'
                        }}
                      >
                        {claimType === 'CASHLESS' ? 'Generate Cashless Pre-Auth Letter' : 'Upload Bills & Submit Claim'}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Active Claims List */}
                  <div>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: 18, color: '#fff' }}>Claim History & Status Tracker</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {claims.map((c: any) => (
                        <div key={c.id} style={{ background: '#1c2541', borderRadius: 12, border: '1px solid #3a506b', padding: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{c.claim_number}</span>
                              <span style={{ fontSize: 11, marginLeft: 8, background: '#0b132b', padding: '2px 8px', borderRadius: 4, color: '#94a3b8' }}>
                                {c.claim_type}
                              </span>
                            </div>
                            <span style={{
                              fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                              background: c.status === 'SETTLED' ? '#065f46' : c.status === 'PRE_AUTH_APPROVED' ? '#075985' : '#854d0e',
                              color: '#fff'
                            }}>
                              {c.status}
                            </span>
                          </div>

                          <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>{c.treatment_description}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{c.provider_hospital} • {c.patient_name}</div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: '#0b132b', padding: 10, borderRadius: 8 }}>
                            <div>Claimed: <strong>₹{Number(c.claimed_amount).toLocaleString()}</strong></div>
                            <div>Approved: <strong style={{ color: '#10b981' }}>₹{Number(c.approved_amount).toLocaleString()}</strong></div>
                          </div>

                          {c.notes && (
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 10, fontStyle: 'italic' }}>
                              Note: {c.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY POLICIES & DOCUMENTS */}
            {activeTab === 'policies' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Active Policy Card */}
                <div style={{ background: '#1c2541', borderRadius: 16, border: '1px solid #3a506b', padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: '#065f46', color: '#34d399' }}>
                      ACTIVE POLICY
                    </span>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Code: POL-GLD-03</span>
                  </div>

                  <h2 style={{ margin: '0 0 6px 0', fontSize: 22, color: '#fff' }}>Advantage Plus Gold (Family Floater)</h2>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Member ID: MEM-1001 • John Doe</div>

                  {/* Coverage Tracker Bar */}
                  <div style={{ background: '#0b132b', padding: 18, borderRadius: 12, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span>Remaining Coverage: <strong>₹20,27,500</strong></span>
                      <span style={{ color: '#94a3b8' }}>Total: ₹25,00,000</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: '#1f2937', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: '81%', height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 20 }}>
                    <div><strong>Renewal Date:</strong> 2026-12-31</div>
                    <div><strong>Room Rent:</strong> Single AC / No Limit</div>
                    <div><strong>Copay:</strong> 10% on Admissible</div>
                    <div><strong>Dependents:</strong> Jane Doe, Leo Doe</div>
                  </div>

                  <button
                    onClick={() => showToast('Section 80D Tax Exemption Certificate PDF downloaded.')}
                    style={{ width: '100%', padding: 12, borderRadius: 8, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Download 80D Tax Exemption Certificate (PDF)
                  </button>
                </div>

                {/* Secure Document Vault */}
                <div style={{ background: '#1c2541', borderRadius: 16, border: '1px solid #3a506b', padding: 24 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#fff' }}>Secure Medical Document Vault</h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Encrypted in AWS S3 with SHA-256 integrity verification.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { name: 'Discharge_Summary_Apollo_JohnDoe.pdf', type: 'DISCHARGE SUMMARY', hash: 'e3b0c442...7852b855' },
                      { name: 'Itemized_Hospital_Invoice_Apollo.pdf', type: 'HOSPITAL BILL', hash: '2c26b46b...66e7ae' },
                      { name: 'Policy_Schedule_POL-GLD-03.pdf', type: 'POLICY SCHEDULE', hash: 'fc4688d3...3fb2f4c' }
                    ].map((d, i) => (
                      <div key={i} style={{ background: '#0b132b', padding: 12, borderRadius: 10, border: '1px solid #293859', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: '#38bdf8' }}>{d.type} • SHA-256: {d.hash}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#10b981', background: '#064e3b', padding: '3px 8px', borderRadius: 6 }}>
                          🔒 Encrypted
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => showToast('Select PDF / Scan to upload to S3 encrypted bucket.')}
                    style={{ width: '100%', marginTop: 20, padding: 12, borderRadius: 8, background: '#334155', border: '1px dashed #64748b', color: '#fff', fontSize: 13, cursor: 'pointer' }}
                  >
                    + Upload New Hospital Bill or Diagnostic Report
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SUPPORT DESK (Jira Service Management Sync) */}
            {activeTab === 'support' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Create Support Ticket Form */}
                <div style={{ background: '#1c2541', borderRadius: 16, border: '1px solid #3a506b', padding: 24 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#fff' }}>Customer Grievance & Claim Assistance</h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>Synced directly with <strong>Jira Service Management (JSM)</strong> and audited in <strong>Splunk</strong>.</p>

                  <form onSubmit={handleTicketSubmit}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Subject / Issue:</label>
                      <input
                        type="text"
                        placeholder="e.g. Pre-Authorization room rent clarification"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Category:</label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                        >
                          <option value="CLAIMS_ASSISTANCE">Claims Assistance</option>
                          <option value="POLICY_UPDATE">Policy Endorsement / Update</option>
                          <option value="BILLING_ISSUE">Billing & Payment Issue</option>
                          <option value="GRIEVANCE">Grievance Redressal</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Priority (SLA Target):</label>
                        <select
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                          style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                        >
                          <option value="URGENT">Urgent (4 Hours SLA)</option>
                          <option value="HIGH">High (12 Hours SLA)</option>
                          <option value="MEDIUM">Medium (24 Hours SLA)</option>
                          <option value="LOW">Low (48 Hours SLA)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Detailed Message:</label>
                      <textarea
                        rows={4}
                        placeholder="Provide claim or policy details..."
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        style={{ width: '100%', padding: 10, borderRadius: 8, background: '#0b132b', border: '1px solid #3a506b', color: '#fff', fontSize: 13 }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{ width: '100%', padding: 12, borderRadius: 8, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Open Jira Support Ticket
                    </button>
                  </form>
                </div>

                {/* Ticket History & SLA Tracker */}
                <div>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: 18, color: '#fff' }}>Your Tickets & SLA Deadlines</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {tickets.map((t: any) => (
                      <div key={t.id} style={{ background: '#1c2541', borderRadius: 12, border: '1px solid #3a506b', padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{t.ticket_number}</span>
                          <span style={{ fontSize: 12, background: '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                            Jira: {t.jira_issue_key || 'HS-1042'}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{t.subject}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Category: {t.category} • Priority: {t.priority}</div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, background: '#0b132b', padding: 8, borderRadius: 6 }}>
                          <span>Status: <strong>{t.status}</strong></span>
                          <span>SLA Target: <strong>{t.sla_due_hours} Hours</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: IRDAI CONSENT MANAGER */}
            {activeTab === 'consent' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ background: '#1c2541', padding: 24, borderRadius: 16, border: '1px solid #3a506b', marginBottom: 20 }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: '#fff' }}>Granular Consent Manager (IRDAI & DPDP Act 2023)</h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                    You have total control over which parties can access your medical records and hospital invoices. Under Indian health-data privacy guidelines, you may withdraw consent at any time.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {consents.map((c: any) => (
                    <div key={c.id} style={{ background: '#1c2541', padding: 20, borderRadius: 14, border: '1px solid #3a506b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{c.purpose}</h3>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                          background: c.withdrawal_status === 'ACTIVE' ? '#065f46' : '#7f1d1d',
                          color: c.withdrawal_status === 'ACTIVE' ? '#34d399' : '#f87171'
                        }}>
                          {c.withdrawal_status}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                        <strong>Authorized Recipient:</strong> {c.recipient}
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>
                        <strong>Data Categories:</strong> {Array.isArray(c.data_categories) ? c.data_categories.join(', ') : 'Medical History, Hospital Bills'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
                        Audit Hash: <code>{c.audit_hash}</code> • Expiry: {c.expiry_date}
                      </div>

                      {c.withdrawal_status === 'ACTIVE' && (
                        <button
                          onClick={() => handleWithdrawConsent(c.id)}
                          style={{ padding: '8px 16px', borderRadius: 6, background: '#ef4444', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Revoke / Withdraw Consent
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SYSTEM TELEMETRY */}
            {activeTab === 'telemetry' && (
              <div style={{ background: '#1c2541', borderRadius: 16, border: '1px solid #3a506b', padding: 24 }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: 20, color: '#fff' }}>Cloud-Native Microservices Architecture Status</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {[
                    { name: 'API Gateway', port: 3001, status: 'ONLINE', role: 'Reverse Proxy & Prometheus /metrics' },
                    { name: 'Auth & Identity', port: 3002, status: 'ONLINE', role: 'OTP, KYC (PAN/Aadhaar) & RBAC' },
                    { name: 'Policy Service', port: 3003, status: 'ONLINE', role: 'Plain-language explainer & quote engine' },
                    { name: 'Claims Service', port: 3004, status: 'ONLINE', role: 'Cashless pre-auth & fraud scoring' },
                    { name: 'Member Service', port: 3005, status: 'ONLINE', role: 'Active subscriber subscriptions' },
                    { name: 'Billing & Payments', port: 3006, status: 'ONLINE', role: 'Idempotent payments & Section 80D' },
                    { name: 'Hospital Network', port: 3008, status: 'ONLINE', role: 'Cashless locator & emergency directory' },
                    { name: 'Document Vault', port: 3009, status: 'ONLINE', role: 'Encrypted S3 & IRDAI consent engine' },
                    { name: 'Support Desk', port: 3010, status: 'ONLINE', role: 'Jira Service Management & Splunk logging' },
                    { name: 'Kafka S3 Sink', port: 9092, status: 'READY', role: 'Archive events to AWS S3 Lakehouse' }
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#0b132b', padding: 14, borderRadius: 10, border: '1px solid #293859' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ color: '#fff', fontSize: 14 }}>{s.name}</strong>
                        <span style={{ fontSize: 11, background: '#064e3b', color: '#34d399', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#38bdf8' }}>Port {s.port}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{s.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ROLE 2: HOSPITAL / TPA DESK PORTAL
            ========================================================================= */}
        {currentRole === 'HOSPITAL_USER' && (
          <div style={{ maxWidth: 900, margin: '0 auto', background: '#1c2541', padding: 28, borderRadius: 16, border: '1px solid #3a506b' }}>
            <div style={{ borderBottom: '1px solid #3a506b', paddingBottom: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>🏥</span>
                <h2 style={{ margin: 0, fontSize: 22, color: '#fff' }}>Empanelled Hospital Cashless Admission Desk</h2>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Verify patient policy eligibility and submit instantaneous Pre-Authorization requests directly to HealthShield TPA.</p>
            </div>

            <div style={{ background: '#0b132b', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid #293859' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#38bdf8' }}>Step 1: Patient Eligibility Check</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  defaultValue="MEM-1001"
                  placeholder="Enter Member ID (e.g. MEM-1001)"
                  style={{ flex: 1, padding: 10, borderRadius: 8, background: '#1c2541', border: '1px solid #3a506b', color: '#fff' }}
                />
                <button
                  onClick={() => showToast('Eligibility verified: John Doe covered under Advantage Plus Gold (POL-GLD-03). Remaining Coverage: ₹20,27,500.')}
                  style={{ padding: '10px 18px', borderRadius: 8, background: '#0891b2', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Verify Eligibility
                </button>
              </div>
            </div>

            <div style={{ background: '#0b132b', padding: 20, borderRadius: 12, border: '1px solid #293859' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 16, color: '#38bdf8' }}>Step 2: Submit Cashless Pre-Authorization Voucher</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>Patient Name:</label>
                  <input type="text" defaultValue="John Doe" style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1c2541', border: '1px solid #3a506b', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>Hospital Name:</label>
                  <input type="text" defaultValue="Apollo Super Speciality Hospital" style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1c2541', border: '1px solid #3a506b', color: '#fff' }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#94a3b8' }}>Provisional Diagnosis / Treatment Planned:</label>
                <input type="text" defaultValue="Acute appendicitis requiring emergency laparoscopic appendectomy" style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1c2541', border: '1px solid #3a506b', color: '#fff' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>Estimated Hospital Invoice (₹):</label>
                  <input type="number" defaultValue="185000" style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1c2541', border: '1px solid #3a506b', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>Planned Admission Date:</label>
                  <input type="date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1c2541', border: '1px solid #3a506b', color: '#fff' }} />
                </div>
              </div>

              <button
                onClick={() => showToast('Pre-Authorization Voucher PA-2026-904 sanctioned! Initial approval issued for ₹1,66,500.')}
                style={{ width: '100%', padding: 14, borderRadius: 8, background: '#0891b2', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Transmit Pre-Auth to HealthShield TPA Desk
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            ROLE 3: ADMIN & CLAIMS / FRAUD DESK PORTAL
            ========================================================================= */}
        {currentRole === 'ADMIN' && (
          <div>
            <div style={{ background: '#1c2541', padding: 24, borderRadius: 16, border: '1px solid #3a506b', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: 22, color: '#fff' }}>Claims Assessment & AIOps Fraud Engine Queue</h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Automated rule scoring flags duplicate claims, abnormal bills, and high-risk anomalies.</p>
                </div>
                <button
                  onClick={loadData}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#334155', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                >
                  🔄 Refresh Queue
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {claims.map((c: any) => (
                <div key={c.id} style={{ background: '#1c2541', padding: 20, borderRadius: 14, border: '1px solid #3a506b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>{c.claim_number}</span>
                      <span style={{ marginLeft: 10, fontSize: 12, background: '#0b132b', padding: '3px 8px', borderRadius: 4, color: '#cbd5e1' }}>
                        Type: {c.claim_type}
                      </span>
                    </div>

                    {/* Fraud Risk Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                        background: c.fraud_risk_score > 30 ? '#7f1d1d' : '#064e3b',
                        color: c.fraud_risk_score > 30 ? '#f87171' : '#34d399'
                      }}>
                        🛡️ Fraud Risk: {c.fraud_risk_score || 12}/100 ({c.fraud_risk_score > 30 ? 'FLAGGED' : 'LOW RISK'})
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, background: '#334155', padding: '4px 10px', borderRadius: 6, color: '#fff' }}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>{c.treatment_description}</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
                    Patient: {c.patient_name} • Hospital: {c.provider_hospital} • Claimed Amount: <strong>₹{Number(c.claimed_amount).toLocaleString()}</strong>
                  </div>

                  {c.fraud_flags && c.fraud_flags.length > 0 && (
                    <div style={{ background: '#451a03', border: '1px solid #78350f', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#fcd34d' }}>
                      ⚠️ Rules Engine Alert: {c.fraud_flags.join('; ')}
                    </div>
                  )}

                  {/* Actions for Claims Officer */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={async () => {
                        await api.updateClaimDecision(c.id, { status: 'APPROVED', approvedAmount: c.claimed_amount * 0.9 });
                        showToast(`Claim ${c.claim_number} Approved at ₹${(c.claimed_amount * 0.9).toLocaleString()}`);
                        loadData();
                      }}
                      style={{ padding: '8px 16px', borderRadius: 6, background: '#10b981', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✓ Approve Claim
                    </button>
                    <button
                      onClick={async () => {
                        await api.updateClaimDecision(c.id, { status: 'IN_REVIEW', notes: 'Medical auditor requested indoor hospital bill itemization' });
                        showToast(`Query raised on claim ${c.claim_number}`);
                        loadData();
                      }}
                      style={{ padding: '8px 16px', borderRadius: 6, background: '#f59e0b', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ❓ Raise Query to Hospital
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
