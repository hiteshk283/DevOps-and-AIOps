import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { createJiraIssue } from '../integrations/jiraClient';
import { logToSplunk } from '../integrations/splunkLogger';
import { logToLoki } from '../integrations/lokiLogger';
import { supportTicketsTotal } from '../metrics';

export const supportRoutes = Router();

const MEMORY_TICKETS: any[] = [
  {
    id: 1,
    ticket_number: 'TCK-2026-5501',
    user_id: 1,
    policy_code: 'POL-GLD-03',
    claim_number: 'CLM-2026-8802',
    category: 'CLAIMS_ASSISTANCE',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    subject: 'Pre-Authorization query verification for Fortis Angiography',
    sla_due_hours: 12,
    jira_issue_key: 'HS-1042',
    created_at: new Date('2026-09-18').toISOString()
  },
  {
    id: 2,
    ticket_number: 'TCK-2026-5502',
    user_id: 1,
    policy_code: 'POL-GLD-03',
    claim_number: null,
    category: 'POLICY_UPDATE',
    priority: 'LOW',
    status: 'OPEN',
    subject: 'Request to add newborn baby as secondary dependent',
    sla_due_hours: 48,
    jira_issue_key: 'HS-1043',
    created_at: new Date('2026-09-19').toISOString()
  }
];

const MEMORY_MESSAGES: any[] = [
  {
    id: 1,
    ticket_id: 1,
    sender_role: 'CUSTOMER',
    sender_name: 'John Doe',
    message: 'Hi, the Fortis Hospital billing desk mentioned that a query was raised regarding room category approval. Could you confirm if Single Private Room is cleared?',
    created_at: new Date('2026-09-18T10:00:00Z').toISOString()
  },
  {
    id: 2,
    ticket_id: 1,
    sender_role: 'SUPPORT_AGENT',
    sender_name: 'Pooja V (Claims Desk)',
    message: 'Hello John, we verified your Advantage Plus Gold policy. There is zero room-rent cap on your policy. We have re-transmitted the approval voucher directly to Fortis TPA desk.',
    created_at: new Date('2026-09-18T11:15:00Z').toISOString()
  }
];

// 1. Create Support Ticket (Synced with Jira Service Management & Splunk)
supportRoutes.post('/tickets', async (req: Request, res: Response) => {
  const { userId, policyCode, claimNumber, category, priority, subject, description } = req.body;

  const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
  const ticketCategory = category || 'GRIEVANCE';
  const ticketPriority = priority || 'MEDIUM';
  const slaHours = ticketPriority === 'URGENT' ? 4 : ticketPriority === 'HIGH' ? 12 : 24;

  // Sync to Jira Service Management
  const jiraKey = await createJiraIssue({
    summary: subject,
    description: description || subject,
    category: ticketCategory,
    priority: ticketPriority,
    userId: userId || 1,
    policyCode,
    claimNumber
  });

  const ticket = {
    id: Date.now(),
    ticket_number: ticketNumber,
    user_id: userId || 1,
    policy_code: policyCode || null,
    claim_number: claimNumber || null,
    category: ticketCategory,
    priority: ticketPriority,
    status: 'OPEN',
    subject,
    sla_due_hours: slaHours,
    jira_issue_key: jiraKey,
    created_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO tickets (ticket_number, user_id, policy_code, claim_number, category, priority, status, subject, sla_due_hours, jira_issue_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [ticket.ticket_number, ticket.user_id, ticket.policy_code, ticket.claim_number, ticket.category, ticket.priority, ticket.status, ticket.subject, ticket.sla_due_hours, ticket.jira_issue_key]
    );
  } catch (err) {
    MEMORY_TICKETS.push(ticket);
  }

  if (description) {
    const message = {
      id: Date.now() + 1,
      ticket_id: ticket.id,
      sender_role: 'CUSTOMER',
      sender_name: 'Customer',
      message: description,
      created_at: new Date().toISOString()
    };
    MEMORY_MESSAGES.push(message);
  }

  // Update Prometheus metrics
  supportTicketsTotal.inc({ category: ticketCategory, priority: ticketPriority });

  // Stream audit event to Splunk & Grafana Loki
  await logToSplunk('SUPPORT_TICKET_CREATED', { ticketNumber, jiraKey, category: ticketCategory, slaHours }, userId);
  await logToLoki('SUPPORT_TICKET_CREATED', { ticketNumber, jiraKey, category: ticketCategory, slaHours }, userId);

  res.json({
    status: 'TICKET_CREATED',
    ticket,
    jira_integration: {
      synced: true,
      jira_key: jiraKey,
      sla_resolution_target: `${slaHours} Hours`
    }
  });
});

// 2. Get User Tickets
supportRoutes.get('/tickets/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const tickets = result.rows.length ? result.rows : MEMORY_TICKETS.filter(t => t.user_id === userId);
    res.json(tickets);
  } catch (err) {
    res.json(MEMORY_TICKETS.filter(t => t.user_id === userId));
  }
});

// 3. Get All Tickets (Admin / Agent Queue)
supportRoutes.get('/tickets', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.json(result.rows.length ? result.rows : MEMORY_TICKETS);
  } catch (err) {
    res.json(MEMORY_TICKETS);
  }
});

// 4. Ticket Thread Messages
supportRoutes.get('/tickets/:id/messages', async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC', [ticketId]);
    res.json(result.rows.length ? result.rows : MEMORY_MESSAGES.filter(m => m.ticket_id === ticketId));
  } catch (err) {
    res.json(MEMORY_MESSAGES.filter(m => m.ticket_id === ticketId));
  }
});

// 5. Post Message Reply to Ticket
supportRoutes.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  const ticketId = parseInt(req.params.id);
  const { senderRole, senderName, message } = req.body;

  const msg = {
    id: Date.now(),
    ticket_id: ticketId,
    sender_role: senderRole || 'CUSTOMER',
    sender_name: senderName || 'User',
    message,
    created_at: new Date().toISOString()
  };

  try {
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_role, sender_name, message) VALUES ($1, $2, $3, $4)`,
      [msg.ticket_id, msg.sender_role, msg.sender_name, msg.message]
    );
  } catch (err) {
    MEMORY_MESSAGES.push(msg);
  }

  // Audit log reply
  await logToSplunk('TICKET_REPLY_POSTED', { ticketId, senderRole }, undefined);

  res.json({ status: 'MESSAGE_SENT', message: msg });
});
