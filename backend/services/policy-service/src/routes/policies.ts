import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

export const policyRoutes = Router();

// GET all policies
policyRoutes.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, tier, monthly_premium, annual_deductible, max_coverage, copay_percent, network_type, description, features FROM policies ORDER BY monthly_premium ASC'
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[Policies Fetch Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve insurance policies' });
  }
});

// GET policy by code or ID
policyRoutes.get('/:code', async (req: Request, res: Response): Promise<any> => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM policies WHERE code = $1 OR id::text = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Policy ${code} not found` });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[Policy Fetch Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve policy details' });
  }
});

// GET policies by tier
policyRoutes.get('/tier/:tier', async (req: Request, res: Response): Promise<any> => {
  const { tier } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM policies WHERE LOWER(tier) = LOWER($1) ORDER BY monthly_premium ASC',
      [tier]
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[Policy Tier Error]:', err);
    return res.status(500).json({ error: 'Failed to filter policies by tier' });
  }
});

// POST create custom policy
policyRoutes.post('/', async (req: Request, res: Response): Promise<any> => {
  const { code, name, tier, monthlyPremium, annualDeductible, maxCoverage, copayPercent, networkType, description, features } = req.body;

  if (!code || !name || !tier || !monthlyPremium) {
    return res.status(400).json({ error: 'Missing required policy attributes' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO policies (code, name, tier, monthly_premium, annual_deductible, max_coverage, copay_percent, network_type, description, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [code, name, tier, monthlyPremium, annualDeductible || 2000, maxCoverage || 500000, copayPercent || 20, networkType || 'PPO', description || '', JSON.stringify(features || [])]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('[Policy Creation Error]:', err);
    return res.status(500).json({ error: 'Failed to create policy' });
  }
});
