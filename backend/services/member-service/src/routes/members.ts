import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

export const memberRoutes = Router();

// GET all members
memberRoutes.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[Members Fetch Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve members' });
  }
});

// GET member by member_id (e.g. MEM-1001) or email
memberRoutes.get('/:identifier', async (req: Request, res: Response): Promise<any> => {
  const { identifier } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM members WHERE member_id = $1 OR email = $1 OR id::text = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Member ${identifier} not found` });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[Member Detail Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve member details' });
  }
});

// POST enroll / create member
memberRoutes.post('/', async (req: Request, res: Response): Promise<any> => {
  const { firstName, lastName, email, phone, dateOfBirth, address, activePolicyCode } = req.body;

  if (!firstName || !lastName || !email || !activePolicyCode) {
    return res.status(400).json({ error: 'firstName, lastName, email, activePolicyCode are required' });
  }

  const memberId = `MEM-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const result = await pool.query(
      `INSERT INTO members (member_id, first_name, last_name, email, phone, date_of_birth, address, active_policy_code, policy_status, effective_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', CURRENT_DATE)
       RETURNING *`,
      [memberId, firstName, lastName, email, phone || '', dateOfBirth || '1990-01-01', address || '', activePolicyCode]
    );

    return res.status(201).json({
      message: 'Member successfully enrolled',
      member: result.rows[0]
    });
  } catch (err: any) {
    console.error('[Member Enrollment Error]:', err);
    return res.status(500).json({ error: 'Failed to enroll member' });
  }
});

// PUT update active policy
memberRoutes.put('/:memberId/policy', async (req: Request, res: Response): Promise<any> => {
  const { memberId } = req.params;
  const { policyCode } = req.body;

  if (!policyCode) {
    return res.status(400).json({ error: 'policyCode is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE members 
       SET active_policy_code = $1, effective_date = CURRENT_DATE, policy_status = 'ACTIVE'
       WHERE member_id = $2 OR id::text = $2
       RETURNING *`,
      [policyCode, memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Member ${memberId} not found` });
    }

    return res.json({
      message: `Member policy updated to ${policyCode}`,
      member: result.rows[0]
    });
  } catch (err: any) {
    console.error('[Policy Update Error]:', err);
    return res.status(500).json({ error: 'Failed to update member policy' });
  }
});
