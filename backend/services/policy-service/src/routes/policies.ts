import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

export const policyRoutes = Router();

const DEFAULT_POLICIES = [
  {
    id: 1,
    code: 'POL-BRZ-01',
    name: 'Essential Care Bronze',
    tier: 'Bronze',
    monthly_premium: 149.00,
    annual_deductible: 6500.00,
    max_coverage: 500000.00,
    copay_percent: 20,
    network_type: 'HMO',
    room_rent_limit: '1% of Sum Insured per day (₹5,000/day max)',
    waiting_period_initial_days: 30,
    waiting_period_pre_existing_months: 36,
    description: 'Affordable baseline protection for accidental hospitalizations and major illnesses.',
    plain_language_explanation: {
      sum_insured_plain: '₹5 Lakh total coverage per year for hospital admissions.',
      room_rent_plain: 'Capped at ₹5,000/day. If you choose an executive suite, proportional deductions apply.',
      waiting_period_plain: '30 days for fresh illnesses. Pre-existing conditions covered after 3 continuous years.',
      copay_plain: 'You pay 20% of admissible hospital bill, the insurer pays 80%.'
    },
    features: ['100% Preventive Care Covered', 'Free Annual Checkup', 'Cashless at 6,500+ Hospitals', 'Ayush Treatment Covered']
  },
  {
    id: 2,
    code: 'POL-SLV-02',
    name: 'Standard Shield Silver',
    tier: 'Silver',
    monthly_premium: 289.00,
    annual_deductible: 3500.00,
    max_coverage: 1000000.00,
    copay_percent: 15,
    network_type: 'EPO',
    room_rent_limit: 'Single Private AC Room (No Cap)',
    waiting_period_initial_days: 30,
    waiting_period_pre_existing_months: 24,
    description: 'Balanced health cover with zero room rent deductions and low copays for families.',
    plain_language_explanation: {
      sum_insured_plain: '₹10 Lakh complete sum insured every policy year with instant reload.',
      room_rent_plain: 'Choose any standard Single Private AC Room without any extra deduction.',
      waiting_period_plain: 'Cover for hypertension and diabetes kicks in after 24 months.',
      copay_plain: '15% copay on claims. 85% directly paid by insurer.'
    },
    features: ['No Room Rent Capping', 'Pre & Post Hospitalization 60/90 days', 'Free Annual Health Check', 'Road Ambulance ₹3,000']
  },
  {
    id: 3,
    code: 'POL-GLD-03',
    name: 'Advantage Plus Gold',
    tier: 'Gold',
    monthly_premium: 449.00,
    annual_deductible: 1500.00,
    max_coverage: 2500000.00,
    copay_percent: 10,
    network_type: 'PPO',
    room_rent_limit: 'No Room Rent Cap (Any Room)',
    waiting_period_initial_days: 30,
    waiting_period_pre_existing_months: 12,
    description: 'Comprehensive healthcare coverage with minimal waiting periods, global emergency assistance, and 10,000+ cashless hospitals.',
    plain_language_explanation: {
      sum_insured_plain: '₹25 Lakh comprehensive medical protection with unlimited restore.',
      room_rent_plain: 'No room rent sub-limit whatsoever. Suite and deluxe rooms included.',
      waiting_period_plain: 'Express coverage: pre-existing ailments covered after just 12 months.',
      copay_plain: 'Only 10% copay on eligible treatments. 90% settled cashlessly.'
    },
    features: ['Zero Room Rent Cap', '1-Year Pre-Existing Disease Waiting', 'Unlimited Reinstatement of Sum Insured', 'Maternity & Newborn Cover']
  },
  {
    id: 4,
    code: 'POL-PLT-04',
    name: 'Executive Pinnacle Platinum',
    tier: 'Platinum',
    monthly_premium: 699.00,
    annual_deductible: 0.00,
    max_coverage: 5000000.00,
    copay_percent: 0,
    network_type: 'PPO',
    room_rent_limit: 'No Limit (Any Room including Suites)',
    waiting_period_initial_days: 15,
    waiting_period_pre_existing_months: 12,
    description: 'Ultra-premium VIP concierge healthcare: zero deductible, zero copay, organ donor expenses, and worldwide medical evacuation.',
    plain_language_explanation: {
      sum_insured_plain: '₹50 Lakh massive coverage with zero out-of-pocket costs.',
      room_rent_plain: 'Unlimited — any room category anywhere in network.',
      waiting_period_plain: 'Accidents covered day 1. Illnesses covered after 15 days.',
      copay_plain: '0% copay. 100% of approved hospital invoice settled directly.'
    },
    features: ['0% Co-Payment Everywhere', 'Global Emergency Evacuation', 'OPD & Dental Consultations Included', 'Dedicated Concierge TPA Manager']
  }
];

const MEMORY_PROPOSALS: any[] = [];

// 1. GET all policies with plain-language explanations
policyRoutes.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await pool.query('SELECT * FROM policies ORDER BY monthly_premium ASC');
    return res.json(result.rows.length ? result.rows : DEFAULT_POLICIES);
  } catch (err: any) {
    return res.json(DEFAULT_POLICIES);
  }
});

// 2. Compare Multiple Policies
policyRoutes.get('/compare', async (req: Request, res: Response): Promise<any> => {
  const codesParam = req.query.codes as string;
  if (!codesParam) {
    return res.json(DEFAULT_POLICIES.slice(0, 2));
  }
  const codes = codesParam.split(',').map(c => c.trim().toUpperCase());
  const selected = DEFAULT_POLICIES.filter(p => codes.includes(p.code.toUpperCase()));
  return res.json(selected.length ? selected : DEFAULT_POLICIES.slice(0, 2));
});

// 3. Dynamic Quote Calculator (Age, Sum Insured, Family Members)
policyRoutes.post('/calculate-quote', async (req: Request, res: Response): Promise<any> => {
  const { policyCode, age, memberCount, hasPreExistingConditions } = req.body;
  const policy = DEFAULT_POLICIES.find(p => p.code === policyCode) || DEFAULT_POLICIES[1];

  let baseMonthly = Number(policy.monthly_premium);
  // Age factor
  const ageFactor = age > 50 ? 1.4 : age > 35 ? 1.15 : 1.0;
  // Member count factor
  const countFactor = (memberCount || 1) > 1 ? 1 + ((memberCount - 1) * 0.6) : 1.0;
  // Pre-existing risk
  const pedFactor = hasPreExistingConditions ? 1.2 : 1.0;

  const estimatedMonthly = +(baseMonthly * ageFactor * countFactor * pedFactor).toFixed(2);
  const estimatedAnnual = +(estimatedMonthly * 12 * 0.9).toFixed(2); // 10% annual discount

  res.json({
    policyCode: policy.code,
    policyName: policy.name,
    tier: policy.tier,
    calculatedMonthlyPremium: estimatedMonthly,
    calculatedAnnualPremium: estimatedAnnual,
    annualDiscountPercent: 10,
    factorsApplied: {
      ageFactor,
      familyMembers: memberCount || 1,
      pedRiskApplied: !!hasPreExistingConditions
    }
  });
});

// 4. Submit Proposal
policyRoutes.post('/proposals', async (req: Request, res: Response): Promise<any> => {
  const { userId, policyCode, sumInsured, premiumAmount, membersCount, healthAnswers } = req.body;

  const proposalNumber = `PROP-${Date.now().toString().slice(-6)}`;
  const proposal = {
    id: Date.now(),
    proposal_number: proposalNumber,
    user_id: userId || 1,
    policy_code: policyCode || 'POL-GLD-03',
    sum_insured: Number(sumInsured || 2500000),
    premium_amount: Number(premiumAmount || 5388),
    members_count: membersCount || 1,
    health_declarations: healthAnswers || {},
    kyc_verified: true,
    status: 'PAYMENT_PENDING',
    created_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO proposals (proposal_number, user_id, policy_code, sum_insured, premium_amount, members_count, health_declarations, kyc_verified, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [proposal.proposal_number, proposal.user_id, proposal.policy_code, proposal.sum_insured, proposal.premium_amount, proposal.members_count, JSON.stringify(proposal.health_declarations), true, 'PAYMENT_PENDING']
    );
  } catch (err) {
    MEMORY_PROPOSALS.push(proposal);
  }

  res.json({
    status: 'PROPOSAL_SUBMITTED',
    proposal,
    next_step: 'PROCEED_TO_PAYMENT',
    payment_url: `/api/billing/create-order?proposal=${proposalNumber}`
  });
});

// 5. POST Create / Register New Policy (Used by Nexus AI & Product Admin)
policyRoutes.post('/', async (req: Request, res: Response): Promise<any> => {
  const {
    code,
    name,
    tier,
    monthly_premium,
    annual_deductible,
    max_coverage,
    copay_percent,
    network_type,
    room_rent_limit,
    waiting_period_initial_days,
    waiting_period_pre_existing_months,
    description,
    plain_language_explanation,
    features
  } = req.body;

  if (!code || !name || !tier || !monthly_premium) {
    return res.status(400).json({ error: 'code, name, tier, and monthly_premium are required fields' });
  }

  const newPolicy = {
    id: DEFAULT_POLICIES.length + 1,
    code: code.trim().toUpperCase(),
    name,
    tier,
    monthly_premium: Number(monthly_premium),
    annual_deductible: Number(annual_deductible || 0),
    max_coverage: Number(max_coverage || 500000),
    copay_percent: Number(copay_percent || 10),
    network_type: network_type || 'PPO',
    room_rent_limit: room_rent_limit || 'Single Private AC Room (No Cap)',
    waiting_period_initial_days: Number(waiting_period_initial_days || 15),
    waiting_period_pre_existing_months: Number(waiting_period_pre_existing_months || 12),
    description: description || 'Innovative customized health coverage plan.',
    plain_language_explanation: plain_language_explanation || {
      sum_insured_plain: `₹${(Number(max_coverage || 500000) / 100000).toFixed(1)} Lakh coverage per year.`,
      room_rent_plain: room_rent_limit || 'Single Private AC Room included.',
      waiting_period_plain: `${waiting_period_initial_days || 15} days waiting period for fresh ailments.`,
      copay_plain: `${copay_percent || 10}% co-payment on approved hospital claims.`
    },
    features: Array.isArray(features) ? features : ['100% Preventive Care Covered', 'Instant Cashless Network', 'Free Tele-Consultations']
  };

  try {
    await pool.query(
      `INSERT INTO policies (code, name, tier, monthly_premium, annual_deductible, max_coverage, copay_percent, network_type, room_rent_limit, waiting_period_initial_days, waiting_period_pre_existing_months, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (code) DO UPDATE SET 
         name = EXCLUDED.name,
         monthly_premium = EXCLUDED.monthly_premium,
         max_coverage = EXCLUDED.max_coverage`,
      [
        newPolicy.code,
        newPolicy.name,
        newPolicy.tier,
        newPolicy.monthly_premium,
        newPolicy.annual_deductible,
        newPolicy.max_coverage,
        newPolicy.copay_percent,
        newPolicy.network_type,
        newPolicy.room_rent_limit,
        newPolicy.waiting_period_initial_days,
        newPolicy.waiting_period_pre_existing_months,
        newPolicy.description
      ]
    );
  } catch (err: any) {
    console.warn('[Policy Service DB Insert Warning]: Storing in memory fallback', err.message);
  }

  // Update in-memory fallback list
  const existingIdx = DEFAULT_POLICIES.findIndex(p => p.code === newPolicy.code);
  if (existingIdx >= 0) {
    DEFAULT_POLICIES[existingIdx] = newPolicy;
  } else {
    DEFAULT_POLICIES.push(newPolicy);
  }

  return res.status(201).json({
    message: `Policy ${newPolicy.code} successfully registered in HealthShield catalog`,
    policy: newPolicy
  });
});

// 6. GET policy by code
policyRoutes.get('/:code', async (req: Request, res: Response): Promise<any> => {
  const { code } = req.params;
  try {
    const result = await pool.query('SELECT * FROM policies WHERE code = $1 OR id::text = $1', [code]);
    if (result.rows.length > 0) return res.json(result.rows[0]);
  } catch (err) {}
  const fallback = DEFAULT_POLICIES.find(p => p.code === code || p.id === Number(code));
  if (fallback) return res.json(fallback);
  return res.status(404).json({ error: `Policy ${code} not found` });
});

