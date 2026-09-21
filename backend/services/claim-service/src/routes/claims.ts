import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

export const claimRoutes = Router();

const DEFAULT_CLAIMS: any[] = [
  {
    id: 1,
    claim_number: 'CLM-2026-8801',
    claim_type: 'CASHLESS',
    member_id: 'MEM-1001',
    policy_code: 'POL-GLD-03',
    patient_name: 'John Doe',
    provider_hospital: 'Apollo Super Speciality Hospital',
    hospital_id: 1,
    treatment_description: 'Emergency Appendectomy & 3-day Inpatient Recovery',
    claimed_amount: 185000.00,
    approved_amount: 166500.00,
    status: 'SETTLED',
    service_date: '2026-08-15',
    notes: 'Settled via cashless TPA direct bank NEFT.',
    fraud_risk_score: 12,
    fraud_flags: [],
    created_at: new Date('2026-08-15').toISOString()
  },
  {
    id: 2,
    claim_number: 'CLM-2026-8802',
    claim_type: 'CASHLESS',
    member_id: 'MEM-1001',
    policy_code: 'POL-GLD-03',
    patient_name: 'John Doe',
    provider_hospital: 'Fortis Healthcare',
    hospital_id: 2,
    treatment_description: 'Cardiac Angiography & Stent Procedure',
    claimed_amount: 340000.00,
    approved_amount: 306000.00,
    status: 'PRE_AUTH_APPROVED',
    service_date: '2026-09-18',
    notes: 'Pre-auth letter issued for ₹3,06,000 after 10% copay.',
    fraud_risk_score: 15,
    fraud_flags: [],
    created_at: new Date('2026-09-18').toISOString()
  },
  {
    id: 3,
    claim_number: 'CLM-2026-8803',
    claim_type: 'REIMBURSEMENT',
    member_id: 'MEM-1002',
    policy_code: 'POL-SLV-02',
    patient_name: 'Sarah Smith',
    provider_hospital: 'Max Healthcare',
    hospital_id: 3,
    treatment_description: 'Dengue Fever Inpatient Treatment & Platelet Transfusion',
    claimed_amount: 65000.00,
    approved_amount: 55250.00,
    status: 'IN_REVIEW',
    service_date: '2026-09-10',
    notes: 'Original pharmacy bills and discharge summary uploaded.',
    fraud_risk_score: 22,
    fraud_flags: ['Duplicate bill check passed', 'Cost within room rent ceiling'],
    created_at: new Date('2026-09-10').toISOString()
  }
];

const PRE_AUTH_REQUESTS: any[] = [
  {
    id: 1,
    pre_auth_number: 'PA-2026-901',
    claim_id: 2,
    hospital_name: 'Fortis Healthcare',
    doctor_name: 'Dr. Vivek Murthy (Cardiology)',
    provisional_diagnosis: 'Coronary Artery Disease with 85% LAD stenosis',
    estimated_cost: 340000.00,
    planned_admission_date: '2026-09-19',
    tpa_decision: 'APPROVED',
    tpa_comments: 'Pre-authorization sanctioned up to ₹3,06,000. Standard copay of 10% payable by patient.',
    created_at: new Date('2026-09-18').toISOString()
  }
];

const CLAIM_QUERIES: any[] = [
  {
    id: 1,
    claim_id: 3,
    query_text: 'Please upload original indoor pharmacy itemized break-up for platelet units.',
    response_text: 'Uploaded pharmacy batch bill #PH-889182 under document section.',
    queried_by: 'Paramount TPA Medical Assessor',
    status: 'ANSWERED',
    created_at: new Date('2026-09-12').toISOString()
  }
];

// Helper: Rule-based Fraud Risk Detection
function runFraudScoring(amount: number, treatment: string, claimType: string): { score: number; flags: string[] } {
  let score = 10;
  const flags: string[] = [];

  if (amount > 500000) {
    score += 30;
    flags.push('High claim amount threshold exceeded (> ₹5,00,000)');
  }
  if (treatment.toLowerCase().includes('emergency') && claimType === 'REIMBURSEMENT') {
    score += 15;
    flags.push('Emergency hospitalization filed via delayed reimbursement');
  }
  if (amount > 1000000) {
    score += 25;
    flags.push('Requires Senior Medical Director manual scrutiny');
  }

  return { score: Math.min(score, 95), flags };
}

// 1. GET all claims
claimRoutes.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await pool.query('SELECT * FROM claims ORDER BY created_at DESC');
    return res.json(result.rows.length ? result.rows : DEFAULT_CLAIMS);
  } catch (err) {
    return res.json(DEFAULT_CLAIMS);
  }
});

// 2. GET claims by member ID
claimRoutes.get('/member/:memberId', async (req: Request, res: Response): Promise<any> => {
  const { memberId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM claims WHERE member_id = $1 ORDER BY created_at DESC', [memberId]);
    return res.json(result.rows.length ? result.rows : DEFAULT_CLAIMS.filter(c => c.member_id === memberId));
  } catch (err) {
    return res.json(DEFAULT_CLAIMS.filter(c => c.member_id === memberId));
  }
});

// 3. POST Cashless Pre-Authorization Request (Hospital / Patient Flow)
claimRoutes.post('/pre-auth', async (req: Request, res: Response): Promise<any> => {
  const { memberId, policyCode, patientName, hospitalName, hospitalId, doctorName, provisionalDiagnosis, estimatedCost, plannedAdmissionDate } = req.body;

  const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;
  const preAuthNumber = `PA-${Date.now().toString().slice(-5)}`;
  const amount = Number(estimatedCost || 150000);
  const copay = policyCode?.includes('BRZ') ? 0.2 : policyCode?.includes('SLV') ? 0.15 : policyCode?.includes('GLD') ? 0.1 : 0;
  const approved = +(amount * (1 - copay)).toFixed(2);

  const { score, flags } = runFraudScoring(amount, provisionalDiagnosis || '', 'CASHLESS');

  const claim = {
    id: Date.now(),
    claim_number: claimNumber,
    claim_type: 'CASHLESS',
    member_id: memberId || 'MEM-1001',
    policy_code: policyCode || 'POL-GLD-03',
    patient_name: patientName,
    provider_hospital: hospitalName,
    hospital_id: hospitalId || 1,
    treatment_description: provisionalDiagnosis,
    claimed_amount: amount,
    approved_amount: approved,
    status: 'PRE_AUTH_APPROVED',
    service_date: plannedAdmissionDate || new Date().toISOString().split('T')[0],
    notes: `Instant Cashless Pre-Authorization cleared. Approved amount: ₹${approved.toLocaleString()} after ${(copay * 100)}% copay.`,
    fraud_risk_score: score,
    fraud_flags: flags,
    created_at: new Date().toISOString()
  };

  DEFAULT_CLAIMS.unshift(claim);

  const preAuth = {
    id: Date.now() + 1,
    pre_auth_number: preAuthNumber,
    claim_id: claim.id,
    hospital_name: hospitalName,
    doctor_name: doctorName || 'Attending Surgeon',
    provisional_diagnosis: provisionalDiagnosis,
    estimated_cost: amount,
    planned_admission_date: plannedAdmissionDate,
    tpa_decision: 'APPROVED',
    tpa_comments: `Pre-authorization letter issued for cashless admission at ${hospitalName}.`,
    created_at: new Date().toISOString()
  };
  PRE_AUTH_REQUESTS.unshift(preAuth);

  res.status(201).json({
    status: 'PRE_AUTH_APPROVED',
    message: 'Cashless pre-authorization issued to network hospital desk',
    claim,
    preAuth
  });
});

// 4. POST File Reimbursement Claim
const handleReimbursement = async (req: Request, res: Response): Promise<any> => {
  const { memberId, policyCode, patientName, hospitalName, treatmentDescription, claimedAmount, serviceDate, notes, bankDetails } = req.body;

  const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;
  const amount = Number(claimedAmount || 50000);
  const { score, flags } = runFraudScoring(amount, treatmentDescription || '', 'REIMBURSEMENT');

  const claim = {
    id: Date.now(),
    claim_number: claimNumber,
    claim_type: 'REIMBURSEMENT',
    member_id: memberId || 'MEM-1001',
    policy_code: policyCode || 'POL-GLD-03',
    patient_name: patientName,
    provider_hospital: hospitalName,
    treatment_description: treatmentDescription,
    claimed_amount: amount,
    approved_amount: 0.00,
    status: 'SUBMITTED',
    service_date: serviceDate || new Date().toISOString().split('T')[0],
    notes: notes || 'Hospital bills and discharge summary uploaded for medical officer audit.',
    fraud_risk_score: score,
    fraud_flags: flags,
    bank_account_for_settlement: bankDetails || 'HDFC Bank (Acct: *******005)',
    created_at: new Date().toISOString()
  };

  DEFAULT_CLAIMS.unshift(claim);

  res.status(201).json({
    status: 'SUBMITTED',
    message: 'Reimbursement claim received. Assigned to claims assessment desk.',
    claim
  });
};

claimRoutes.post('/reimbursement', handleReimbursement);

// 5. Admin Decision on Claim (Approve, Settle, Reject, or Query)
claimRoutes.patch('/:claimId/decision', async (req: Request, res: Response): Promise<any> => {
  const { claimId } = req.params;
  const { status, approvedAmount, notes } = req.body;

  const claim = DEFAULT_CLAIMS.find(c => c.id === Number(claimId) || c.claim_number === claimId);
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  claim.status = status || claim.status;
  if (approvedAmount !== undefined) {
    claim.approved_amount = Number(approvedAmount);
  }
  if (notes) {
    claim.notes = notes;
  }

  res.json({
    status: 'DECISION_RECORDED',
    message: `Claim ${claim.claim_number} updated to ${claim.status}`,
    claim
  });
});

// 6. Pre-Auth TPA Review
claimRoutes.patch('/preauth/:preAuthId/review', async (req: Request, res: Response): Promise<any> => {
  const { preAuthId } = req.params;
  const { decision, comments, approvedAmount } = req.body;

  const preAuth = PRE_AUTH_REQUESTS.find(p => p.id === Number(preAuthId) || p.pre_auth_number === preAuthId);
  if (!preAuth) {
    return res.status(404).json({ error: 'Pre-auth request not found' });
  }

  preAuth.tpa_decision = decision || preAuth.tpa_decision;
  if (comments) preAuth.tpa_comments = comments;

  const claim = DEFAULT_CLAIMS.find(c => c.id === preAuth.claim_id);
  if (claim) {
    if (decision === 'APPROVED') {
      claim.status = 'PRE_AUTH_APPROVED';
      if (approvedAmount) claim.approved_amount = Number(approvedAmount);
    } else if (decision === 'REJECTED') {
      claim.status = 'REJECTED';
    } else if (decision === 'INFO_REQUESTED') {
      claim.status = 'QUERY_RAISED';
    }
  }

  res.json({ status: 'REVIEWED', preAuth, claim });
});

// 7. Raise Query on Claim
claimRoutes.post('/:claimId/query', async (req: Request, res: Response): Promise<any> => {
  const { claimId } = req.params;
  const { question, requiredDocuments } = req.body;

  const query = {
    id: Date.now(),
    claim_id: Number(claimId),
    question,
    required_documents: requiredDocuments || ['Discharge Summary', 'Itemized Hospital Bill'],
    status: 'OPEN',
    created_at: new Date().toISOString()
  };
  CLAIM_QUERIES.push(query);

  const claim = DEFAULT_CLAIMS.find(c => c.id === Number(claimId));
  if (claim) claim.status = 'IN_REVIEW';

  res.json({ status: 'QUERY_RAISED', query });
});

// 8. Legacy submit route backward compatibility
claimRoutes.post('/', handleReimbursement);
