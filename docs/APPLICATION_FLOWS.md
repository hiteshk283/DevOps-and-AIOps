# HealthShield: End-to-End Application Flows

This document details the core business and technical workflows across the HealthShield platform, complete with sequence flows and architectural interactions.

---

## Flow 1: Policy Discovery & Proposal Purchase Flow

```
User (Customer)          Gateway (3001)        Policy (3003)        Billing (3006)        Kafka / S3 Sink
      │                        │                     │                     │                     │
      ├─ 1. Browse Policies ──►│                     │                     │                     │
      │   (Plain terms)        ├─ Forward ──────────►│                     │                     │
      │◄─ Return Policies ─────┤◄─ Plain JSON ───────┤                     │                     │
      │                        │                     │                     │                     │
      ├─ 2. Submit Proposal ──►│                     │                     │                     │
      │   (KYC, Nominee, Health)├─ Forward ──────────►│                     │                     │
      │◄─ Proposal Created ────┤◄─ Return Proposal ──┤                     │                     │
      │                        │                     │                     │                     │
      ├─ 3. Pay Premium (UPI) ─►│                     │                     │                     │
      │   (Idempotency Key)    ├──────────────────────────────────────────►│                     │
      │                        │                                           ├─ Idempotency Check  │
      │                        │                                           ├─ Verify Payment     │
      │                        │                                           ├─ Emit Event ───────►│
      │◄─ Policy & 80D Cert ───┤◄─ Return Invoice & 80D Tax Receipt ───────┤                     │ (Flush to S3)
```

1. **Discovery**: Customer views policies with plain-language decoded definitions (e.g. *"Single Private Room - No Cap"*).
2. **Underwriting Assessment**: The user fills out the health questionnaire and provides regulatory KYC (PAN & Aadhaar last 4) and nominee information.
3. **Idempotent Payment**: Billing service receives `X-Idempotency-Key` preventing double charges.
4. **Event Emission**: `payment.completed` event is emitted to Kafka and archived into AWS S3 by the S3 Sink Connector.

---

## Flow 2: Cashless Pre-Authorization Workflow

```
Patient               Empanelled Hospital Desk         HealthShield TPA Desk          Claims Service (3004)
   │                             │                              │                             │
   ├─ 1. Present Member ID ─────►│                              │                             │
   │                             ├─ 2. Check Eligibility ───────┼────────────────────────────►│
   │                             │◄─ Active (₹20L remaining) ───┼─────────────────────────────┤
   │                             │                              │                             │
   │                             ├─ 3. File Pre-Auth Voucher ───┼────────────────────────────►│
   │                             │   (Diagnosis, Cost ₹1.85L)   │                             ├─ Fraud Scoring
   │                             │                              │◄─ Notify TPA Desk ──────────┤ (Risk: 12/100)
   │                             │                              │                             │
   │                             │                              ├─ 4. Medical Review Sanction ┤
   │                             │◄─ Approval Letter Issued ────┴─────────────────────────────┤
   │◄─ Admission Cleared ────────┤   (₹1,66,500 after 10% copay)
```

1. **Hospital Verification**: Empanelled hospital billing desk checks patient's policy eligibility via `POST /api/hospitals/preauth-check`.
2. **Pre-Auth Voucher**: Hospital enters diagnosis (e.g. *Acute Appendicitis*) and estimated cost.
3. **Instant Sanction**: System evaluates copay rules (e.g. 10% copay on Gold tier) and issues instant pre-authorization letter.
4. **Settlement**: Upon patient discharge, final bill is settled cashlessly via direct hospital NEFT.

---

## Flow 3: Reimbursement Claims Workflow & Fraud Scoring

```
User (Customer)              Document Vault (3009)          Claims Service (3004)         Rules Engine
      │                               │                             │                          │
      ├─ 1. Upload Hospital Bills ───►│                             │                          │
      │   (Discharge summary, Rx)     ├─ Compute SHA-256 Hash       │                          │
      │◄─ S3 Upload URL / Registered ─┤                             │                          │
      │                               │                             │                          │
      ├─ 2. Submit Reimbursement ─────┼────────────────────────────►│                          │
      │   (Claimed ₹65,000 + Bank)    │                             ├─ Run Fraud Scoring ─────►│
      │                               │                             │◄─ Risk Score: 22/100 ────┤
      │◄─ Claim SUBMITTED ────────────┴─────────────────────────────┤                          │
      │                                                             │                          │
      │                                                             ├─ 3. Claims Officer Review│
      │◄─ Claim Approved / Dispatched to Direct Bank NEFT ──────────┤   (Settled ₹55,250)      │
```

1. **Document Registration**: Patient uploads original itemized bills and discharge summary. S3 calculates SHA-256 integrity hash.
2. **Automated Fraud Scoring**:
   - Checks if amount exceeds threshold (> ₹5,00,000).
   - Checks duplicate bill references.
   - Flags suspicious delay or non-network anomalies.
3. **Settlement**: Approved amount is credited directly to member's verified bank account (IFSC).

---

## Flow 4: Customer Support & Jira Service Management (JSM)

```
User (Customer)               Support Service (3010)       Jira Service Management         Splunk SIEM
      │                               │                             │                          │
      ├─ 1. Create Support Ticket ───►│                             │                          │
      │   ("Pre-Auth Room Cap Query") ├─ Create JSM Issue ─────────►│                          │
      │                               │◄─ Issue Key: "HS-1042" ─────┤                          │
      │                               ├─ Dispatch Audit Event ──────┼─────────────────────────►│
      │◄─ Ticket TCK-5501 (HS-1042) ──┤                             │                          │
      │                               │                             │                          │
      ├─ 2. User Adds Reply ─────────►│                             │                          │
      │                               ├─ Post Comment to Issue ────►│                          │
      │                               ├─ Log Message Event ─────────┼─────────────────────────►│
      │◄─ Message Recorded ───────────┤                             │                          │
```

1. **Grievance Raised**: User opens a ticket linked to their claim or policy.
2. **JSM Sync**: Support service invokes Jira REST API (`POST /rest/api/3/issue`) and generates key `HS-1042`.
3. **SLA Countdown**: Ticket displays strict SLA target (e.g. 12 Hours for High priority).
4. **Splunk Audit**: Every message and SLA breach check streams to Splunk HEC.

---

## Flow 5: Granular IRDAI / DPDP Consent Management

```
User (Customer)               Document Vault (3009)          TPA / Third Parties
      │                               │                             │
      ├─ 1. View Active Consents ────►│                             │
      │◄─ List Consents with Hashes ──┤                             │
      │   (Recipient: Apollo TPA)     │                             │
      │                               │                             │
      ├─ 2. Revoke / Withdraw Consent►│                             │
      │                               ├─ Update Status: "WITHDRAWN" │
      │                               ├─ Log Withdrawal Timestamp   │
      │                               ├─ Invalidate TPA Data Tokens─┼───► Halt Processing
      │◄─ Consent Withdrawn Confirmed ┤                             │
```

1. **Granular Consent**: Data categories (e.g. *Medical History*, *Hospital Bills*) are tied to specific recipients and expiry dates.
2. **Instant Revocation**: User can withdraw consent at any time, halting third-party TPA processing in compliance with Indian DPDP Act.
