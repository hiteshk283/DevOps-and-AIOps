import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

export const claimRoutes = Router();

// GET all claims
claimRoutes.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await pool.query('SELECT * FROM claims ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[Claims Fetch Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve claims' });
  }
});

// GET claims by member ID
claimRoutes.get('/member/:memberId', async (req: Request, res: Response): Promise<any> => {
  const { memberId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM claims WHERE member_id = $1 ORDER BY created_at DESC',
      [memberId]
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[Claims By Member Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve member claims' });
  }
});

// GET claim by claim number
claimRoutes.get('/:claimNumber', async (req: Request, res: Response): Promise<any> => {
  const { claimNumber } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM claims WHERE claim_number = $1 OR id::text = $1',
      [claimNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Claim ${claimNumber} not found` });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[Claim Detail Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve claim details' });
  }
});

// POST submit a new claim
claimRoutes.post('/', async (req: Request, res: Response): Promise<any> => {
  const {
    memberId,
    policyCode,
    patientName,
    providerHospital,
    treatmentDescription,
    claimedAmount,
    serviceDate,
    notes,
  } = req.body;

  if (!memberId || !policyCode || !patientName || !providerHospital || !claimedAmount || !serviceDate) {
    return res.status(400).json({
      error: 'Missing required fields: memberId, policyCode, patientName, providerHospital, claimedAmount, serviceDate are required'
    });
  }

  const claimNumber = `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const result = await pool.query(
      `INSERT INTO claims 
       (claim_number, member_id, policy_code, patient_name, provider_hospital, treatment_description, claimed_amount, approved_amount, status, service_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00, 'SUBMITTED', $8, $9)
       RETURNING *`,
      [
        claimNumber,
        memberId,
        policyCode,
        patientName,
        providerHospital,
        treatmentDescription || 'Medical treatment / consultation',
        claimedAmount,
        serviceDate,
        notes || 'Submitted via Member Portal'
      ]
    );

    return res.status(201).json({
      message: 'Claim filed successfully',
      claim: result.rows[0]
    });
  } catch (err: any) {
    console.error('[Claim Submission Error]:', err);
    return res.status(500).json({ error: 'Failed to process claim submission' });
  }
});

// PATCH update claim status
claimRoutes.patch('/:id/status', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { status, approvedAmount, notes } = req.body;

  const validStatuses = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'SETTLED', 'REJECTED'];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE claims 
       SET status = $1, approved_amount = COALESCE($2, approved_amount), notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id::text = $4 OR claim_number = $4
       RETURNING *`,
      [status.toUpperCase(), approvedAmount, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Claim ${id} not found` });
    }

    return res.json({
      message: `Claim status updated to ${status.toUpperCase()}`,
      claim: result.rows[0]
    });
  } catch (err: any) {
    console.error('[Claim Status Update Error]:', err);
    return res.status(500).json({ error: 'Failed to update claim status' });
  }
});
