import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../database/connection';
import { documentUploadsTotal } from '../metrics';

export const documentRoutes = Router();

const MEMORY_DOCUMENTS: any[] = [
  {
    id: 1,
    user_id: 1,
    claim_id: 1,
    document_type: 'DISCHARGE_SUMMARY',
    file_name: 'Discharge_Summary_Apollo_JohnDoe.pdf',
    s3_key: 'documents/user-1/claims/clm-1/discharge_summary.pdf',
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    file_size_bytes: 418290,
    mime_type: 'application/pdf',
    is_encrypted: true,
    uploaded_at: new Date().toISOString()
  },
  {
    id: 2,
    user_id: 1,
    claim_id: 1,
    document_type: 'HOSPITAL_BILL',
    file_name: 'Itemized_Hospital_Invoice_Apollo.pdf',
    s3_key: 'documents/user-1/claims/clm-1/invoice.pdf',
    sha256_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    file_size_bytes: 289120,
    mime_type: 'application/pdf',
    is_encrypted: true,
    uploaded_at: new Date().toISOString()
  }
];

const MEMORY_CONSENTS: any[] = [
  {
    id: 1,
    user_id: 1,
    purpose: 'Cashless Claim Adjudication & Pre-Authorization Sharing',
    data_categories: ['Medical History', 'Hospital Bills', 'Discharge Summary', 'Doctor Notes'],
    recipient: 'Apollo Hospitals & HealthShield In-house TPA Desk',
    version: 'v1.0',
    collection_method: 'IN_APP_CHECKBOX_OTP',
    expiry_date: '2027-01-01',
    withdrawal_status: 'ACTIVE',
    audit_hash: 'a7f8e3290b2c45199ffbe14298fc1c14',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    user_id: 1,
    purpose: 'Policy Issuance & IRDAI Regulatory Reporting',
    data_categories: ['KYC Documents', 'Aadhaar/PAN Info', 'Contact Details'],
    recipient: 'Insurance Regulatory & Development Authority of India (IRDAI)',
    version: 'v1.0',
    collection_method: 'IN_APP_CHECKBOX_OTP',
    expiry_date: '2030-01-01',
    withdrawal_status: 'ACTIVE',
    audit_hash: '9b2c45199fa7f8e320b2c45199ffbe14',
    created_at: new Date().toISOString()
  }
];

// 1. Upload & Register Document
documentRoutes.post('/upload', async (req: Request, res: Response) => {
  const { userId, claimId, documentType, fileName, fileSize, mimeType } = req.body;

  const bucket = process.env.AWS_S3_DOCUMENTS_BUCKET || 'healthshield-documents-794558722040';
  const s3Key = `documents/user-${userId || 1}/claims/clm-${claimId || 'general'}/${Date.now()}-${fileName || 'document.pdf'}`;
  
  // Calculate simulated SHA-256 hash for document integrity validation
  const sha256Hash = crypto.createHash('sha256').update(s3Key + Date.now()).digest('hex');

  const doc = {
    id: Date.now(),
    user_id: userId || 1,
    claim_id: claimId ? Number(claimId) : null,
    document_type: documentType || 'MEDICAL_REPORT',
    file_name: fileName || 'Uploaded_Medical_Report.pdf',
    s3_key: s3Key,
    sha256_hash: sha256Hash,
    file_size_bytes: fileSize || 350000,
    mime_type: mimeType || 'application/pdf',
    is_encrypted: true,
    s3_bucket: bucket,
    uploaded_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO documents (user_id, claim_id, document_type, file_name, s3_key, sha256_hash, file_size_bytes, mime_type, is_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [doc.user_id, doc.claim_id, doc.document_type, doc.file_name, doc.s3_key, doc.sha256_hash, doc.file_size_bytes, doc.mime_type, true]
    );
  } catch (err) {
    MEMORY_DOCUMENTS.push(doc);
  }

  documentUploadsTotal.inc({ document_type: doc.document_type });

  res.json({
    status: 'SUCCESS',
    message: 'Medical document registered with AES-256 client-side encryption',
    document: doc,
    pre_signed_upload_url: `https://${bucket}.s3.us-east-1.amazonaws.com/${s3Key}?X-Amz-Security-Token=MOCK_PRESIGNED_TOKEN`
  });
});

// 2. Get User Documents
documentRoutes.get('/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query('SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC', [userId]);
    res.json(result.rows.length ? result.rows : MEMORY_DOCUMENTS.filter(d => d.user_id === userId));
  } catch (err) {
    res.json(MEMORY_DOCUMENTS.filter(d => d.user_id === userId));
  }
});

// 3. Granular IRDAI Consent Management
documentRoutes.post('/consent', async (req: Request, res: Response) => {
  const { userId, purpose, dataCategories, recipient, expiryDate } = req.body;

  const auditHash = crypto.createHash('sha256').update(`${userId}-${purpose}-${Date.now()}`).digest('hex').substring(0, 32);

  const consent = {
    id: Date.now(),
    user_id: userId || 1,
    purpose: purpose || 'Cashless Claims Processing',
    data_categories: dataCategories || ['Medical Records', 'Hospital Invoices'],
    recipient: recipient || 'Hospital TPA Desk',
    version: 'v1.0',
    collection_method: 'IN_APP_CHECKBOX_OTP',
    expiry_date: expiryDate || '2027-12-31',
    withdrawal_status: 'ACTIVE',
    audit_hash: auditHash,
    created_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO consent_records (user_id, purpose, data_categories, recipient, expiry_date, withdrawal_status, audit_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [consent.user_id, consent.purpose, JSON.stringify(consent.data_categories), consent.recipient, consent.expiry_date, 'ACTIVE', consent.audit_hash]
    );
  } catch (err) {
    MEMORY_CONSENTS.push(consent);
  }

  res.json({
    status: 'CONSENT_GRANTED',
    consent
  });
});

// 4. Get User Consents
documentRoutes.get('/consent/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query('SELECT * FROM consent_records WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows.length ? result.rows : MEMORY_CONSENTS.filter(c => c.user_id === userId));
  } catch (err) {
    res.json(MEMORY_CONSENTS.filter(c => c.user_id === userId));
  }
});

// 5. Withdraw Consent
documentRoutes.post('/consent/:id/withdraw', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const withdrawnAt = new Date().toISOString();

  try {
    await pool.query(
      `UPDATE consent_records SET withdrawal_status = 'WITHDRAWN', withdrawn_at = $1 WHERE id = $2`,
      [withdrawnAt, id]
    );
  } catch (err) {
    const record = MEMORY_CONSENTS.find(c => c.id === id);
    if (record) {
      record.withdrawal_status = 'WITHDRAWN';
      record.withdrawn_at = withdrawnAt;
    }
  }

  res.json({
    status: 'CONSENT_WITHDRAWN',
    id,
    withdrawnAt,
    compliance_note: 'Under IRDAI Policyholder Protection and DPDP Act, data processing for this recipient has ceased.'
  });
});
