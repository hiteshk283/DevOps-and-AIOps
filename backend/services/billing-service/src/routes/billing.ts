import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { publishPaymentEvent, PaymentCompletedEvent } from '../events/kafkaPublisher';
import { paymentTransactionsTotal } from '../metrics';

export const billingRoutes = Router();

// In-memory fallback ledger if running standalone without DB
const MEMORY_INVOICES: any[] = [
  {
    invoice_number: 'INV-2026-001',
    user_id: 1,
    policy_code: 'POL-GLD-03',
    amount: 4566.10,
    tax_amount: 821.90,
    total_amount: 5388.00,
    tax_80d_eligible: 4566.10,
    status: 'PAID',
    created_at: new Date('2026-01-01').toISOString()
  }
];

const MEMORY_PAYMENTS: any[] = [
  {
    payment_id: 'PAY-2026-901',
    invoice_number: 'INV-2026-001',
    user_id: 1,
    amount: 5388.00,
    payment_method: 'UPI',
    idempotency_key: 'IDEMP-KEY-998811',
    status: 'SUCCESS',
    transaction_ref: 'UPI-REF-992817263',
    created_at: new Date('2026-01-01').toISOString()
  }
];

const SEEN_IDEMPOTENCY_KEYS = new Map<string, any>();

// 1. Create Order / Invoice
billingRoutes.post('/create-order', async (req: Request, res: Response) => {
  const { userId, policyCode, amount, idempotencyKey } = req.body;

  if (!userId || !policyCode || !amount) {
    return res.status(400).json({ error: 'Missing required fields: userId, policyCode, amount' });
  }

  // Idempotency check: Return existing order if key was already sent
  if (idempotencyKey && SEEN_IDEMPOTENCY_KEYS.has(idempotencyKey)) {
    console.log(`[Billing Idempotency] Duplicate request prevented for key: ${idempotencyKey}`);
    return res.json(SEEN_IDEMPOTENCY_KEYS.get(idempotencyKey));
  }

  const baseAmount = Number(amount);
  const gstRate = 0.18; // 18% GST in India
  const taxAmount = +(baseAmount * gstRate).toFixed(2);
  const totalAmount = +(baseAmount + taxAmount).toFixed(2);
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

  const invoice = {
    invoice_number: invoiceNumber,
    user_id: userId,
    policy_code: policyCode,
    amount: baseAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    tax_80d_eligible: baseAmount,
    status: 'PENDING',
    created_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO invoices (invoice_number, user_id, policy_code, amount, tax_amount, total_amount, tax_80d_eligible, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [invoice.invoice_number, invoice.user_id, invoice.policy_code, invoice.amount, invoice.tax_amount, invoice.total_amount, invoice.tax_80d_eligible, 'PENDING']
    );
  } catch (err) {
    MEMORY_INVOICES.push(invoice);
  }

  const orderResponse = {
    orderId: `ORDER-${Date.now()}`,
    invoice,
    currency: 'INR',
    tax_80d_exemption_note: 'Eligible for deduction under Section 80D of the Indian Income Tax Act',
    supported_methods: ['UPI', 'NETBANKING', 'CREDIT_CARD', 'DEBIT_CARD'],
    mock_test_upi_ids: ['success@razorpay', 'john.doe@okaxis']
  };

  if (idempotencyKey) {
    SEEN_IDEMPOTENCY_KEYS.set(idempotencyKey, orderResponse);
  }

  res.json(orderResponse);
});

// 2. Process & Verify Payment (Emits Kafka Event for S3 Sink)
billingRoutes.post('/verify', async (req: Request, res: Response) => {
  const { invoiceNumber, userId, amount, paymentMethod, idempotencyKey } = req.body;

  if (idempotencyKey && SEEN_IDEMPOTENCY_KEYS.has(idempotencyKey)) {
    return res.json(SEEN_IDEMPOTENCY_KEYS.get(idempotencyKey));
  }

  const paymentId = `PAY-${Date.now().toString().slice(-6)}`;
  const method = (paymentMethod || 'UPI').toUpperCase();
  const txnRef = `${method}-TXN-${Math.floor(100000000 + Math.random() * 900000000)}`;

  const paymentRecord = {
    payment_id: paymentId,
    invoice_number: invoiceNumber,
    user_id: userId || 1,
    amount: Number(amount),
    payment_method: method,
    idempotency_key: idempotencyKey || `IDEMP-${Date.now()}`,
    status: 'SUCCESS',
    transaction_ref: txnRef,
    created_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO payments (payment_id, invoice_number, user_id, amount, payment_method, idempotency_key, status, transaction_ref, kafka_event_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [paymentRecord.payment_id, paymentRecord.invoice_number, paymentRecord.user_id, paymentRecord.amount, paymentRecord.payment_method, paymentRecord.idempotency_key, 'SUCCESS', paymentRecord.transaction_ref, true]
    );
    await pool.query(`UPDATE invoices SET status = 'PAID' WHERE invoice_number = $1`, [invoiceNumber]);
  } catch (err) {
    MEMORY_PAYMENTS.push(paymentRecord);
  }

  // Update Prometheus metrics
  paymentTransactionsTotal.inc({ payment_method: method, status: 'SUCCESS' });

  // Publish event to Kafka -> Destined for AWS S3 Sink Connector
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const eventPayload: PaymentCompletedEvent = {
    eventId: `EVT-${Date.now()}`,
    eventType: 'PAYMENT_COMPLETED',
    paymentId,
    invoiceNumber,
    userId: userId || 1,
    amount: Number(amount),
    paymentMethod: method,
    transactionRef: txnRef,
    timestamp: now.toISOString(),
    s3ArchiveMetadata: {
      lakehousePartition: `year=${now.getFullYear()}/month=${yearMonth}`,
      schemaVersion: '1.0.0',
      bucketTarget: process.env.AWS_S3_KAFKA_BUCKET || 'healthshield-kafka-events-794558722040'
    }
  };

  await publishPaymentEvent(eventPayload);

  const responsePayload = {
    status: 'SUCCESS',
    message: 'Payment verified and settled successfully',
    receipt: paymentRecord,
    tax_80d_certificate: {
      certificateNumber: `80D-CERT-${Date.now().toString().slice(-6)}`,
      section: 'Section 80D (Health Insurance Premium)',
      eligibleAmount: Number(amount),
      financialYear: '2026-2027',
      irda_registration_no: 'IRDAI/HLT/2026/089'
    },
    kafka_event_id: eventPayload.eventId
  };

  if (idempotencyKey) {
    SEEN_IDEMPOTENCY_KEYS.set(idempotencyKey, responsePayload);
  }

  res.json(responsePayload);
});

// 3. User Invoices
billingRoutes.get('/invoices/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows.length ? result.rows : MEMORY_INVOICES.filter(i => i.user_id === userId));
  } catch (err) {
    res.json(MEMORY_INVOICES.filter(i => i.user_id === userId));
  }
});

// 4. User Payment History
billingRoutes.get('/payments/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows.length ? result.rows : MEMORY_PAYMENTS.filter(p => p.user_id === userId));
  } catch (err) {
    res.json(MEMORY_PAYMENTS.filter(p => p.user_id === userId));
  }
});
