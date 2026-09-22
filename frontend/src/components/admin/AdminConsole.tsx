import React, { useState } from 'react';
import { PolicyPlan, ClaimRecord, EnrolledMember, EnrollmentProposal } from '../../types';
import { api } from '../../services/api';

interface AdminConsoleProps {
  policies: PolicyPlan[];
  claims: ClaimRecord[];
  members: EnrolledMember[];
  pendingProposals: EnrollmentProposal[];
  onApproveProposal: (proposalId: string) => void;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  policies,
  claims,
  members,
  pendingProposals,
  onApproveProposal,
  onRefreshData,
  showToast,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'kpi' | 'enrollments' | 'fraud_claims' | 'policies' | 'members'>('enrollments');
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Pre-seed sample proposals if none yet
  const defaultProposals: EnrollmentProposal[] = [
    {
      id: 'prop-sample-1',
      proposalNumber: 'PROP-981204',
      applicant: {
        fullName: 'Vikramaditya Singhania',
        dob: '1984-04-12',
        age: 42,
        gender: 'Male',
        mobile: '+91 98220 11223',
        email: 'vikram.singhania@example.com',
        address: 'B-1402 Oberoi Woods, Goregaon East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400063',
        dependents: [
          { id: 'd1', fullName: 'Ananya Singhania', relationship: 'Spouse', age: 39, gender: 'Female' },
          { id: 'd2', fullName: 'Aarav Singhania', relationship: 'Child', age: 11, gender: 'Male' }
        ]
      },
      policyCode: 'POL-PLT-04',
      policyName: 'Executive Pinnacle Platinum',
      tier: 'Platinum',
      sumInsured: 5000000,
      premiumAmount: 8388,
      paymentFrequency: 'ANNUAL',
      paymentMethod: 'UPI',
      medicalDeclarations: {
        hasDiabetes: false,
        hasHypertension: true,
        hasHeartDisease: false,
        hasAsthma: false,
        hasPriorSurgery: false,
        isSmoker: false,
        additionalNotes: 'Mild hypertension managed by lifestyle and Telmisartan 20mg'
      },
      kyc: {
        aadhaarLast4: '4589',
        panNumber: 'BNVPS8891K',
        nomineeName: 'Ananya Singhania',
        nomineeRelation: 'Spouse',
        nomineeContact: '+91 98220 11223'
      },
      status: 'UNDERWRITING_REVIEW',
      createdAt: '2026-03-21T10:15:00Z',
      memberId: 'MEM-1088',
      policyNumber: 'POL-2026-440182'
    },
    {
      id: 'prop-sample-2',
      proposalNumber: 'PROP-981205',
      applicant: {
        fullName: 'Meera Nambiar',
        dob: '1996-09-28',
        age: 29,
        gender: 'Female',
        mobile: '+91 94470 55667',
        email: 'meera.nambiar@example.com',
        address: 'Villa 4, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        dependents: []
      },
      policyCode: 'POL-GLD-03',
      policyName: 'Advantage Plus Gold',
      tier: 'Gold',
      sumInsured: 2500000,
      premiumAmount: 4850,
      paymentFrequency: 'ANNUAL',
      paymentMethod: 'CARD',
      medicalDeclarations: {
        hasDiabetes: false,
        hasHypertension: false,
        hasHeartDisease: false,
        hasAsthma: false,
        hasPriorSurgery: false,
        isSmoker: false
      },
      kyc: {
        aadhaarLast4: '9012',
        panNumber: 'CQKPN7712M',
        nomineeName: 'Ramesh Nambiar',
        nomineeRelation: 'Father',
        nomineeContact: '+91 94470 55668'
      },
      status: 'UNDERWRITING_REVIEW',
      createdAt: '2026-03-22T04:30:00Z',
      memberId: 'MEM-1089',
      policyNumber: 'POL-2026-440183'
    }
  ];

  const allProposals = [...pendingProposals, ...defaultProposals];

  // Calculated operational KPIs
  const totalClaimsAmount = claims.reduce((acc, c) => acc + (Number(c.claimed_amount) || 0), 0);
  const flaggedClaimsCount = claims.filter((c) => (c.fraud_risk_score || 0) > 30).length;

  return (
    <div>
      {/* Admin Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #1e293b 100%)',
        border: '1px solid #78350f',
        borderRadius: 16,
        padding: '22px 28px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 26 }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: 22, color: '#f8fafc', fontWeight: 800 }}>
              HealthShield Operations & Underwriting Desk
            </h2>
            <span style={{ fontSize: 11, background: '#d97706', color: '#000', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
              ADMIN CONSOLE
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Underwriting approvals, AIOps automated fraud risk scoring, policy catalog management, and member directory oversight.
          </p>
        </div>

        <button
          onClick={onRefreshData}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#334155',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>🔄</span>
          <span>Refresh Operations Queue</span>
        </button>
      </div>

      {/* KPI Counters Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ background: '#162032', border: '1px solid #293859', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Active Enrolled Members</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
            {members.length + allProposals.length}
          </div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>↑ 14% this month</div>
        </div>

        <div style={{ background: '#162032', border: '1px solid #293859', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Pending New Enrollments</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
            {allProposals.filter((p) => p.status === 'UNDERWRITING_REVIEW' || p.status === 'DRAFT').length || allProposals.length}
          </div>
          <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 4 }}>Ready for Underwriting</div>
        </div>

        <div style={{ background: '#162032', border: '1px solid #293859', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Total Claims Pipeline</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
            ₹{(totalClaimsAmount / 100000).toFixed(1)} Lakh
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{claims.length} claims in queue</div>
        </div>

        <div style={{ background: '#162032', border: '1px solid #293859', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>AIOps Fraud Alerts</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: flaggedClaimsCount > 0 ? '#ef4444' : '#34d399', marginTop: 4 }}>
            {flaggedClaimsCount} Flagged
          </div>
          <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Score &gt; 30/100 threshold</div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid #293859',
        paddingBottom: 14,
        marginBottom: 24,
        overflowX: 'auto'
      }}>
        {[
          { id: 'enrollments', label: `📥 New Customer Enrollments (${allProposals.length})` },
          { id: 'fraud_claims', label: `🚨 Claims & AIOps Fraud Engine (${claims.length})` },
          { id: 'members', label: `👥 Master Member Directory (${members.length})` },
          { id: 'policies', label: `📜 Policy Catalog Pricing (${policies.length})` }
        ].map((tab) => {
          const isSelected = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: isSelected ? '#d97706' : '#162032',
                color: isSelected ? '#fff' : '#cbd5e1',
                boxShadow: isSelected ? '0 4px 12px rgba(217, 119, 6, 0.4)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: NEW ENROLLMENT SUBMISSIONS QUEUE
          ========================================================================= */}
      {activeAdminTab === 'enrollments' && (
        <div>
          <div style={{ background: '#162032', padding: 20, borderRadius: 14, border: '1px solid #293859', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, color: '#fff' }}>
              Incoming Insurance Enrollment Applications
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Review applicants' personal details, covered family members, medical disclosures, and KYC credentials. Authorize policy binding with 1 click.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {allProposals.map((prop) => (
              <div
                key={prop.id}
                style={{
                  background: '#162032',
                  border: '1px solid #293859',
                  borderRadius: 14,
                  padding: 22
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>{prop.proposalNumber}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: prop.tier === 'Platinum' ? '#d97706' : prop.tier === 'Gold' ? '#eab308' : '#64748b',
                        color: '#000'
                      }}>
                        {prop.tier} Tier
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: prop.status === 'ACTIVE' ? '#064e3b' : '#78350f',
                        color: prop.status === 'ACTIVE' ? '#34d399' : '#fcd34d'
                      }}>
                        {prop.status}
                      </span>
                    </div>
                    <h4 style={{ margin: '6px 0 2px 0', fontSize: 18, color: '#fff' }}>
                      {prop.applicant.fullName} ({prop.applicant.age} yrs • {prop.applicant.gender})
                    </h4>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      📧 {prop.applicant.email} • 📱 {prop.applicant.mobile} • 📍 {prop.applicant.city}, {prop.applicant.state}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Coverage Requested</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>
                      ₹{(prop.sumInsured / 100000).toFixed(0)} Lakh
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Premium: ₹{prop.premiumAmount?.toLocaleString()} ({prop.paymentFrequency})
                    </div>
                  </div>
                </div>

                {/* Family and Medical Summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 12,
                  background: '#0b132b',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #1e293b',
                  marginBottom: 16
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>
                      👨‍👩‍👦 Covered Dependents ({prop.applicant.dependents?.length || 0})
                    </div>
                    {prop.applicant.dependents && prop.applicant.dependents.length > 0 ? (
                      prop.applicant.dependents.map((dep, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: '#cbd5e1' }}>
                          • {dep.fullName || 'Family Member'} ({dep.relationship}, {dep.age} yrs)
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b' }}>Individual cover (no dependents)</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 4 }}>
                      🩺 Medical Disclosures / Underwriting
                    </div>
                    {prop.medicalDeclarations.hasDiabetes || prop.medicalDeclarations.hasHypertension || prop.medicalDeclarations.hasHeartDisease ? (
                      <div style={{ fontSize: 12, color: '#f87171' }}>
                        ⚠️ Disclosed: {prop.medicalDeclarations.hasHypertension ? 'Hypertension; ' : ''}{prop.medicalDeclarations.hasDiabetes ? 'Diabetes; ' : ''}{prop.medicalDeclarations.hasHeartDisease ? 'Cardiac history' : ''}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#34d399' }}>
                        ✓ Standard Risk (No chronic ailments declared)
                      </div>
                    )}
                    {prop.medicalDeclarations.additionalNotes && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Note: {prop.medicalDeclarations.additionalNotes}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#67e8f9', marginBottom: 4 }}>
                      🪪 e-KYC & Nominee
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      • PAN: <strong>{prop.kyc?.panNumber || 'ABCDE1234F'}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                      • Nominee: <strong>{prop.kyc?.nomineeName || 'Nominee'}</strong> ({prop.kyc?.nomineeRelation || 'Spouse'})
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => {
                      onApproveProposal(prop.id);
                      showToast(`Proposal ${prop.proposalNumber} Approved! Policy certificate bound.`);
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      background: '#10b981',
                      border: 'none',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Approve & Issue Policy
                  </button>
                  <button
                    onClick={() => showToast(`Proposal ${prop.proposalNumber} referred to senior medical underwriter.`)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    🩺 Tele-Underwriting Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CLAIMS & AIOPS FRAUD ENGINE
          ========================================================================= */}
      {activeAdminTab === 'fraud_claims' && (
        <div>
          <div style={{ background: '#162032', padding: 20, borderRadius: 14, border: '1px solid #293859', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 18, color: '#fff' }}>
                  AIOps Automated Fraud Scoring & Anomaly Detection Queue
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Machine learning risk scoring models flag suspicious treatment tariffs, unbundled bills, and duplicate admission dates.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {claims.map((c) => {
              const isFlagged = (c.fraud_risk_score || 0) > 30;
              return (
                <div
                  key={c.id}
                  style={{
                    background: '#162032',
                    padding: 20,
                    borderRadius: 14,
                    border: isFlagged ? '1px solid #b91c1c' : '1px solid #293859'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>{c.claim_number}</span>
                      <span style={{ marginLeft: 10, fontSize: 12, background: '#0b132b', padding: '2px 8px', borderRadius: 4, color: '#cbd5e1' }}>
                        Type: {c.claim_type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: isFlagged ? '#7f1d1d' : '#064e3b',
                        color: isFlagged ? '#f87171' : '#34d399'
                      }}>
                        🛡️ AIOps Risk: {c.fraud_risk_score || 12}/100 ({isFlagged ? 'HIGH ANOMALY' : 'LOW RISK'})
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, background: '#334155', padding: '4px 10px', borderRadius: 6, color: '#fff' }}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>
                    {c.treatment_description}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                    Patient: <strong>{c.patient_name}</strong> • Provider: <strong>{c.provider_hospital}</strong> • Claimed: <strong>₹{Number(c.claimed_amount).toLocaleString()}</strong>
                  </div>

                  {c.fraud_flags && c.fraud_flags.length > 0 && (
                    <div style={{ background: '#451a03', border: '1px solid #78350f', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#fcd34d' }}>
                      ⚠️ Anomaly Alert: {c.fraud_flags.join('; ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={async () => {
                        await api.updateClaimDecision(c.id, { status: 'APPROVED', approvedAmount: c.claimed_amount * 0.9 });
                        showToast(`Claim ${c.claim_number} Approved at ₹${(c.claimed_amount * 0.9).toLocaleString()}`);
                        onRefreshData();
                      }}
                      style={{ padding: '8px 16px', borderRadius: 6, background: '#10b981', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✓ Sanction Settlement
                    </button>
                    <button
                      onClick={async () => {
                        await api.updateClaimDecision(c.id, { status: 'QUERY_RAISED', notes: 'Audit requested indoor prescription and tariff breakdown' });
                        showToast(`Query raised on claim ${c.claim_number}`);
                        onRefreshData();
                      }}
                      style={{ padding: '8px 16px', borderRadius: 6, background: '#f59e0b', border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ❓ Raise Hospital Query
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MASTER MEMBER DIRECTORY
          ========================================================================= */}
      {activeAdminTab === 'members' && (
        <div style={{ background: '#162032', borderRadius: 16, border: '1px solid #293859', padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Master Policyholder Directory</h3>
            <input
              type="text"
              placeholder="Filter by name, member ID, or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, background: '#0b132b', border: '1px solid #293859', color: '#fff', fontSize: 13, width: 280 }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #293859', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Member ID</th>
                  <th style={{ padding: 12 }}>Name</th>
                  <th style={{ padding: 12 }}>Email & Phone</th>
                  <th style={{ padding: 12 }}>Active Policy</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12 }}>Effective Date</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .filter((m) => {
                    const q = memberSearch.toLowerCase();
                    return (
                      m.first_name.toLowerCase().includes(q) ||
                      m.last_name.toLowerCase().includes(q) ||
                      m.member_id.toLowerCase().includes(q) ||
                      m.email.toLowerCase().includes(q)
                    );
                  })
                  .map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 12, fontWeight: 700, color: '#38bdf8' }}>{m.member_id}</td>
                      <td style={{ padding: 12, color: '#fff' }}>{m.first_name} {m.last_name}</td>
                      <td style={{ padding: 12, color: '#cbd5e1' }}>{m.email}<br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{m.phone}</span></td>
                      <td style={{ padding: 12, color: '#f59e0b' }}>{m.active_policy_code}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ fontSize: 11, background: '#064e3b', color: '#34d399', padding: '2px 8px', borderRadius: 4 }}>
                          {m.policy_status}
                        </span>
                      </td>
                      <td style={{ padding: 12, color: '#94a3b8' }}>{m.effective_date}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: POLICY CATALOG PRICING
          ========================================================================= */}
      {activeAdminTab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {policies.map((p) => (
            <div key={p.code} style={{ background: '#162032', border: '1px solid #293859', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>{p.code}</span>
                <span style={{ fontSize: 11, background: '#1e293b', padding: '3px 8px', borderRadius: 6, color: '#cbd5e1' }}>{p.tier}</span>
              </div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: 17, color: '#fff' }}>{p.name}</h4>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                Monthly Premium: <strong>₹{p.monthly_premium}</strong> • Annual: <strong>₹{p.monthly_premium * 12}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                Max Coverage: <strong>₹{(p.max_coverage / 100000).toFixed(0)} Lakh</strong>
              </div>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 14 }}>
                Room Rent: {p.room_rent_limit}
              </div>
              <button
                onClick={() => showToast(`Policy ${p.code} rule parameters locked under IRDAI Product Filing UIN.`)}
                style={{ width: '100%', padding: '8px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }}
              >
                Inspect Underwriting Guidelines
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
