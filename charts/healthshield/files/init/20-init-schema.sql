-- =============================================================================
-- HEALTHSHIELD ENTERPRISE MULTI-DATABASE SCHEMA & SEED DATA
-- =============================================================================

-- =============================================================================
-- 1. AUTH & IDENTITY DATABASE (auth_db)
-- =============================================================================
\c auth_db;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'CUSTOMER', -- CUSTOMER, HOSPITAL_USER, CLAIMS_AGENT, ADMIN
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    phone_or_email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    pan_number VARCHAR(20),
    aadhaar_last4 VARCHAR(4),
    full_name_as_per_id VARCHAR(200),
    kyc_status VARCHAR(50) DEFAULT 'VERIFIED', -- PENDING, VERIFIED, REJECTED
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dependents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- SPOUSE, CHILD, PARENT
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nominees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    share_percent INTEGER DEFAULT 100,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    account_holder_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Auth Data
INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, is_verified)
VALUES 
(1, 'john.doe@example.com', '+919876543210', '$2b$10$rO2XiXHibxChj.dUskr34eHlJDt8v.gD7D8xBAs4og7x2W1lphVU.', 'John', 'Doe', 'CUSTOMER', true),
(2, 'sarah.smith@example.com', '+919876543211', '$2b$10$rO2XiXHibxChj.dUskr34eHlJDt8v.gD7D8xBAs4og7x2W1lphVU.', 'Sarah', 'Smith', 'CUSTOMER', true),
(3, 'hospital.desk@metrohealth.com', '+919876543212', '$2b$10$rO2XiXHibxChj.dUskr34eHlJDt8v.gD7D8xBAs4og7x2W1lphVU.', 'Dr. Rajesh', 'Gupta', 'HOSPITAL_USER', true),
(4, 'claims.officer@healthshield.com', '+919876543213', '$2b$10$rO2XiXHibxChj.dUskr34eHlJDt8v.gD7D8xBAs4og7x2W1lphVU.', 'Anita', 'Sharma', 'CLAIMS_AGENT', true),
(5, 'admin@healthshield.com', '+919876543214', '$2b$10$rO2XiXHibxChj.dUskr34eHlJDt8v.gD7D8xBAs4og7x2W1lphVU.', 'System', 'Admin', 'ADMIN', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO kyc_verifications (user_id, pan_number, aadhaar_last4, full_name_as_per_id, kyc_status)
VALUES 
(1, 'ABCDE1234F', '7890', 'John Jonathan Doe', 'VERIFIED'),
(2, 'FGHIJ5678K', '4321', 'Sarah Smith', 'VERIFIED')
ON CONFLICT DO NOTHING;

INSERT INTO dependents (user_id, full_name, relationship, date_of_birth, gender)
VALUES 
(1, 'Jane Doe', 'SPOUSE', '1990-05-15', 'Female'),
(1, 'Leo Doe', 'CHILD', '2018-09-20', 'Male')
ON CONFLICT DO NOTHING;

INSERT INTO nominees (user_id, full_name, relationship, share_percent, phone)
VALUES 
(1, 'Jane Doe', 'SPOUSE', 100, '+919876543219')
ON CONFLICT DO NOTHING;

INSERT INTO bank_accounts (user_id, account_holder_name, account_number, ifsc_code, bank_name)
VALUES 
(1, 'John Doe', '91002003004005', 'HDFC0001234', 'HDFC Bank')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 2. POLICIES & QUOTATIONS DATABASE (policies_db)
-- =============================================================================
\c policies_db;

CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    monthly_premium NUMERIC(10, 2) NOT NULL,
    annual_deductible NUMERIC(10, 2) NOT NULL,
    max_coverage NUMERIC(12, 2) NOT NULL,
    copay_percent INTEGER NOT NULL,
    network_type VARCHAR(50) NOT NULL,
    room_rent_limit VARCHAR(100) NOT NULL, -- e.g. "No Limit", "1% of Sum Insured", "Single Private AC"
    waiting_period_initial_days INTEGER DEFAULT 30,
    waiting_period_pre_existing_months INTEGER DEFAULT 24,
    description TEXT,
    plain_language_explanation JSONB,
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    proposal_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    sum_insured NUMERIC(12, 2) NOT NULL,
    premium_amount NUMERIC(10, 2) NOT NULL,
    members_count INTEGER DEFAULT 1,
    health_declarations JSONB,
    kyc_verified BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'PAYMENT_PENDING', -- PAYMENT_PENDING, ISSUED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO policies (code, name, tier, monthly_premium, annual_deductible, max_coverage, copay_percent, network_type, room_rent_limit, waiting_period_initial_days, waiting_period_pre_existing_months, description, plain_language_explanation, features)
VALUES 
(
    'POL-BRZ-01',
    'Essential Care Bronze',
    'Bronze',
    149.00,
    6500.00,
    500000.00,
    20,
    'HMO',
    '1% of Sum Insured per day (₹5,000/day max)',
    30,
    36,
    'Affordable baseline protection for accidental hospitalizations and major illnesses.',
    '{
        "sum_insured_plain": "₹5 Lakh total coverage per year for hospital admissions.",
        "room_rent_plain": "Capped at ₹5,000/day. If you choose an executive suite, proportional deductions apply.",
        "waiting_period_plain": "30 days for fresh illnesses. Pre-existing conditions covered after 3 continuous years.",
        "copay_plain": "You pay 20% of admissible hospital bill, the insurer pays 80%."
    }'::jsonb,
    '["100% Preventive Care Covered", "Free Annual Checkup", "Cashless at 6,500+ Hospitals", "Ayush Treatment Covered"]'::jsonb
),
(
    'POL-SLV-02',
    'Standard Shield Silver',
    'Silver',
    289.00,
    3500.00,
    1000000.00,
    15,
    'EPO',
    'Single Private AC Room (No Cap)',
    30,
    24,
    'Balanced health cover with zero room rent deductions and low copays for families.',
    '{
        "sum_insured_plain": "₹10 Lakh complete sum insured every policy year with instant reload.",
        "room_rent_plain": "Choose any standard Single Private AC Room without any extra deduction.",
        "waiting_period_plain": "Cover for hypertension and diabetes kicks in after 24 months.",
        "copay_plain": "15% copay on claims. 85% directly paid by insurer."
    }'::jsonb,
    '["No Room Rent Capping", "Pre & Post Hospitalization 60/90 days", "Free Annual Health Check", "Road Ambulance ₹3,000"]'::jsonb
),
(
    'POL-GLD-03',
    'Advantage Plus Gold',
    'Gold',
    449.00,
    1500.00,
    2500000.00,
    10,
    'PPO',
    'No Room Rent Cap (Any Room)',
    30,
    12,
    'Comprehensive healthcare coverage with minimal waiting periods, global emergency assistance, and 10,000+ cashless hospitals.',
    '{
        "sum_insured_plain": "₹25 Lakh comprehensive medical protection with unlimited restore.",
        "room_rent_plain": "No room rent sub-limit whatsoever. Suite and deluxe rooms included.",
        "waiting_period_plain": "Express coverage: pre-existing ailments covered after just 12 months.",
        "copay_plain": "Only 10% copay on eligible treatments. 90% settled cashlessly."
    }'::jsonb,
    '["Zero Room Rent Cap", "1-Year Pre-Existing Disease Waiting", "Unlimited Reinstatement of Sum Insured", "Maternity & Newborn Cover"]'::jsonb
),
(
    'POL-PLT-04',
    'Executive Pinnacle Platinum',
    'Platinum',
    699.00,
    0.00,
    5000000.00,
    0,
    'PPO',
    'No Limit (Any Room including Suites)',
    15,
    12,
    'Ultra-premium VIP concierge healthcare: zero deductible, zero copay, organ donor expenses, and worldwide medical evacuation.',
    '{
        "sum_insured_plain": "₹50 Lakh massive coverage with zero out-of-pocket costs.",
        "room_rent_plain": "Unlimited — any room category anywhere in network.",
        "waiting_period_plain": "Accidents covered day 1. Illnesses covered after 15 days.",
        "copay_plain": "0% copay. 100% of approved hospital invoice settled directly."
    }'::jsonb,
    '["0% Co-Payment Everywhere", "Global Emergency Evacuation", "OPD & Dental Consultations Included", "Dedicated Concierge TPA Manager"]'::jsonb
)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 3. CLAIMS & PRE-AUTH DATABASE (claims_db)
-- =============================================================================
\c claims_db;

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    claim_type VARCHAR(50) DEFAULT 'CASHLESS', -- CASHLESS, REIMBURSEMENT
    member_id VARCHAR(50) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    patient_name VARCHAR(150) NOT NULL,
    provider_hospital VARCHAR(255) NOT NULL,
    hospital_id INTEGER,
    treatment_description TEXT NOT NULL,
    claimed_amount NUMERIC(10, 2) NOT NULL,
    approved_amount NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'SUBMITTED', -- SUBMITTED, PRE_AUTH_APPROVED, IN_REVIEW, APPROVED, SETTLED, REJECTED
    service_date DATE NOT NULL,
    discharge_date DATE,
    notes TEXT,
    fraud_risk_score INTEGER DEFAULT 10, -- 0 to 100 risk score
    fraud_flags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pre_auth_requests (
    id SERIAL PRIMARY KEY,
    pre_auth_number VARCHAR(50) UNIQUE NOT NULL,
    claim_id INTEGER REFERENCES claims(id),
    hospital_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(150) NOT NULL,
    provisional_diagnosis TEXT NOT NULL,
    estimated_cost NUMERIC(10, 2) NOT NULL,
    planned_admission_date DATE NOT NULL,
    tpa_decision VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, QUERY_RAISED, REJECTED
    tpa_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim_queries (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES claims(id),
    query_text TEXT NOT NULL,
    response_text TEXT,
    queried_by VARCHAR(100) DEFAULT 'TPA Medical Auditor',
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, ANSWERED, RESOLVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO claims (claim_number, claim_type, member_id, policy_code, patient_name, provider_hospital, hospital_id, treatment_description, claimed_amount, approved_amount, status, service_date, notes, fraud_risk_score, fraud_flags)
VALUES 
(
    'CLM-2026-8801',
    'CASHLESS',
    'MEM-1001',
    'POL-GLD-03',
    'John Doe',
    'Apollo Super Speciality Hospital',
    1,
    'Emergency Appendectomy & 3-day Inpatient Recovery',
    185000.00,
    166500.00,
    'SETTLED',
    '2026-08-15',
    'Settled via cashless TPA direct bank NEFT.',
    12,
    '[]'::jsonb
),
(
    'CLM-2026-8802',
    'CASHLESS',
    'MEM-1001',
    'POL-GLD-03',
    'John Doe',
    'Fortis Healthcare',
    2,
    'Cardiac Angiography & Stent Procedure',
    340000.00,
    306000.00,
    'PRE_AUTH_APPROVED',
    '2026-09-18',
    'Pre-auth letter issued for ₹3,06,000 after 10% copay.',
    15,
    '[]'::jsonb
),
(
    'CLM-2026-8803',
    'REIMBURSEMENT',
    'MEM-1002',
    'POL-SLV-02',
    'Sarah Smith',
    'Max Healthcare',
    3,
    'Dengue Fever Inpatient Treatment & Platelet Transfusion',
    65000.00,
    55250.00,
    'IN_REVIEW',
    '2026-09-10',
    'Original pharmacy bills and discharge summary uploaded.',
    22,
    '["Duplicate bill check passed", "Cost within room rent ceiling"]'::jsonb
)
ON CONFLICT (claim_number) DO NOTHING;


-- =============================================================================
-- 4. MEMBERS DATABASE (members_db)
-- =============================================================================
\c members_db;

CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    date_of_birth DATE,
    address TEXT,
    active_policy_code VARCHAR(50) NOT NULL,
    sum_insured NUMERIC(12, 2) DEFAULT 2500000.00,
    remaining_coverage NUMERIC(12, 2) DEFAULT 2315000.00,
    policy_status VARCHAR(50) DEFAULT 'ACTIVE',
    effective_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO members (member_id, user_id, first_name, last_name, email, phone, date_of_birth, address, active_policy_code, sum_insured, remaining_coverage, policy_status, effective_date, renewal_date)
VALUES 
(
    'MEM-1001',
    1,
    'John',
    'Doe',
    'john.doe@example.com',
    '+91 98765 43210',
    '1988-04-12',
    'Flat 402, Sea Green Apartments, Bandra West, Mumbai, MH',
    'POL-GLD-03',
    2500000.00,
    2027500.00,
    'ACTIVE',
    '2026-01-01',
    '2026-12-31'
),
(
    'MEM-1002',
    2,
    'Sarah',
    'Smith',
    'sarah.smith@example.com',
    '+91 98765 43211',
    '1992-09-24',
    'B-12, Indiranagar 100ft Road, Bengaluru, KA',
    'POL-SLV-02',
    1000000.00,
    944750.00,
    'ACTIVE',
    '2026-03-15',
    '2027-03-14'
)
ON CONFLICT (member_id) DO NOTHING;


-- =============================================================================
-- 5. CASHLESS HOSPITAL NETWORK DATABASE (hospitals_db)
-- =============================================================================
\c hospitals_db;

CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    cashless_available BOOLEAN DEFAULT true,
    emergency_24x7 BOOLEAN DEFAULT true,
    specialties JSONB NOT NULL,
    bed_count INTEGER DEFAULT 250,
    rating NUMERIC(2, 1) DEFAULT 4.7,
    tpa_desk_contact VARCHAR(100),
    turnaround_time_hours NUMERIC(3, 1) DEFAULT 1.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hospitals (id, name, city, state, address, pincode, phone, email, cashless_available, emergency_24x7, specialties, bed_count, rating, tpa_desk_contact, turnaround_time_hours)
VALUES 
(
    1,
    'Apollo Super Speciality Hospital',
    'Mumbai',
    'Maharashtra',
    'Plot No 13, Off Parsik Hill Road, Sector 23, CBD Belapur, Navi Mumbai',
    '400614',
    '+91 22 3350 3350',
    'tpa.mumbai@apollohospitals.com',
    true,
    true,
    '["Cardiology", "Orthopedics", "Oncology", "Neurology", "Gastroenterology", "24/7 Trauma"]'::jsonb,
    500,
    4.9,
    '+91 22 3350 3388 (Ext: TPA)',
    1.0
),
(
    2,
    'Fortis Hospital Bannerghatta',
    'Bengaluru',
    'Karnataka',
    '154/9, Bannerghatta Road, Opposite IIMB, Bengaluru',
    '560076',
    '+91 80 6621 4444',
    'cashless.bengaluru@fortishealthcare.com',
    true,
    true,
    '["Cardiac Sciences", "Joint Replacement", "Pulmonology", "Organ Transplant", "Emergency Care"]'::jsonb,
    400,
    4.8,
    '+91 80 6621 4412 (Desk 4)',
    1.2
),
(
    3,
    'Max Super Speciality Hospital, Saket',
    'Delhi',
    'Delhi NCR',
    '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
    '110017',
    '+91 11 2651 5050',
    'tpa.saket@maxhealthcare.com',
    true,
    true,
    '["Comprehensive Cancer Care", "Cardiovascular", "Neurosciences", "Pediatrics", "Neonatal ICU"]'::jsonb,
    550,
    4.8,
    '+91 11 2651 5080 (Floor 1)',
    1.5
),
(
    4,
    'Manipal Hospital Old Airport Road',
    'Bengaluru',
    'Karnataka',
    '98, HAL Old Airport Road, Kodihalli, Bengaluru',
    '560017',
    '+91 80 2502 4444',
    'insurance.manipal@manipalhospitals.com',
    true,
    true,
    '["Cardiology", "Nephrology & Dialysis", "Critical Care", "General Surgery"]'::jsonb,
    600,
    4.7,
    '+91 80 2502 4499',
    1.8
),
(
    5,
    'Tata Memorial Centre',
    'Mumbai',
    'Maharashtra',
    'Dr. E Borges Road, Parel, Mumbai',
    '400012',
    '+91 22 2417 7000',
    'info@tmc.gov.in',
    true,
    true,
    '["Advanced Oncology", "Bone Marrow Transplant", "Radiotherapy"]'::jsonb,
    700,
    4.9,
    '+91 22 2417 7055',
    2.0
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 6. BILLING & PAYMENTS DATABASE (billing_db)
-- =============================================================================
\c billing_db;

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL, -- 18% GST
    total_amount NUMERIC(10, 2) NOT NULL,
    tax_80d_eligible NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PAID', -- PAID, PENDING, REFUNDED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    invoice_number VARCHAR(50) REFERENCES invoices(invoice_number),
    user_id INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- UPI, CARD, NETBANKING
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, PENDING
    transaction_ref VARCHAR(100) NOT NULL,
    kafka_event_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO invoices (invoice_number, user_id, policy_code, amount, tax_amount, total_amount, tax_80d_eligible, status)
VALUES 
('INV-2026-001', 1, 'POL-GLD-03', 4566.10, 821.90, 5388.00, 4566.10, 'PAID'),
('INV-2026-002', 2, 'POL-SLV-02', 2939.00, 529.00, 3468.00, 2939.00, 'PAID')
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO payments (payment_id, invoice_number, user_id, amount, payment_method, idempotency_key, status, transaction_ref, kafka_event_published)
VALUES 
('PAY-2026-901', 'INV-2026-001', 1, 5388.00, 'UPI', 'IDEMP-KEY-998811', 'SUCCESS', 'UPI-REF-992817263', true),
('PAY-2026-902', 'INV-2026-002', 2, 3468.00, 'CARD', 'IDEMP-KEY-998812', 'SUCCESS', 'CARD-TXN-882736192', true)
ON CONFLICT (payment_id) DO NOTHING;


-- =============================================================================
-- 7. DOCUMENTS & CONSENT DATABASE (documents_db)
-- =============================================================================
\c documents_db;

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    claim_id INTEGER,
    document_type VARCHAR(100) NOT NULL, -- HOSPITAL_BILL, DISCHARGE_SUMMARY, PRESCRIPTION, KYC_PAN, POLICY_SCHEDULE
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    sha256_hash VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    is_encrypted BOOLEAN DEFAULT true,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Granular IRDAI & Digital Personal Data Protection (DPDP) Consent Schema
CREATE TABLE IF NOT EXISTS consent_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    purpose VARCHAR(255) NOT NULL, -- "CLAIMS_PROCESSING", "TPA_DATA_SHARING", "UNDERWRITING_EVALUATION"
    data_categories JSONB NOT NULL, -- ["MEDICAL_HISTORY", "HOSPITAL_BILLS", "DIAGNOSTIC_REPORTS"]
    recipient VARCHAR(255) NOT NULL, -- "Empanelled Network Hospital & Paramount TPA"
    version VARCHAR(20) DEFAULT 'v1.0',
    collection_method VARCHAR(50) DEFAULT 'IN_APP_CHECKBOX_OTP',
    expiry_date DATE NOT NULL,
    withdrawal_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, WITHDRAWN
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    audit_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO documents (user_id, claim_id, document_type, file_name, s3_key, sha256_hash, file_size_bytes, mime_type, is_encrypted)
VALUES 
(1, 1, 'DISCHARGE_SUMMARY', 'Discharge_Summary_Apollo_JohnDoe.pdf', 'documents/user-1/claims/clm-1/discharge_summary.pdf', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 418290, 'application/pdf', true),
(1, 1, 'HOSPITAL_BILL', 'Itemized_Hospital_Invoice_Apollo.pdf', 'documents/user-1/claims/clm-1/invoice.pdf', '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', 289120, 'application/pdf', true),
(1, NULL, 'POLICY_SCHEDULE', 'Policy_Schedule_POL-GLD-03.pdf', 'documents/user-1/policies/pol-gld-03.pdf', 'fc4688d3130f97e89e36306e3ea971809141e634b8ffab952f473ac003fb2f4c', 512000, 'application/pdf', true)
ON CONFLICT DO NOTHING;

INSERT INTO consent_records (user_id, purpose, data_categories, recipient, expiry_date, withdrawal_status, audit_hash)
VALUES 
(
    1,
    'Cashless Claim Adjudication & Pre-Authorization Sharing',
    '["Medical History", "Hospital Bills", "Discharge Summary", "Doctor Notes"]'::jsonb,
    'Apollo Hospitals & HealthShield In-house TPA Desk',
    '2027-01-01',
    'ACTIVE',
    'a7f8e3290b2c45199ffbe14298fc1c14'
),
(
    1,
    'Policy Issuance & IRDAI Regulatory Reporting',
    '["KYC Documents", "Aadhaar/PAN Info", "Contact Details"]'::jsonb,
    'Insurance Regulatory & Development Authority of India (IRDAI)',
    '2030-01-01',
    'ACTIVE',
    '9b2c45199fa7f8e320b2c45199ffbe14'
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 8. CUSTOMER SUPPORT & JIRA SERVICE DESK (support_db)
-- =============================================================================
\c support_db;

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    policy_code VARCHAR(50),
    claim_number VARCHAR(50),
    category VARCHAR(100) NOT NULL, -- CLAIMS_ASSISTANCE, BILLING_ISSUE, POLICY_UPDATE, GRIEVANCE
    priority VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, ESCALATED
    subject VARCHAR(255) NOT NULL,
    sla_due_hours INTEGER DEFAULT 24,
    jira_issue_key VARCHAR(50), -- e.g. "HS-1042" (linked to Jira Service Management)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id),
    sender_role VARCHAR(50) NOT NULL, -- CUSTOMER, SUPPORT_AGENT, JIRA_SYNC
    sender_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tickets (id, ticket_number, user_id, policy_code, claim_number, category, priority, status, subject, sla_due_hours, jira_issue_key)
VALUES 
(
    1,
    'TCK-2026-5501',
    1,
    'POL-GLD-03',
    'CLM-2026-8802',
    'CLAIMS_ASSISTANCE',
    'HIGH',
    'IN_PROGRESS',
    'Pre-Authorization query verification for Fortis Angiography',
    12,
    'HS-1042'
),
(
    2,
    'TCK-2026-5502',
    1,
    'POL-GLD-03',
    NULL,
    'POLICY_UPDATE',
    'LOW',
    'OPEN',
    'Request to add newborn baby as secondary dependent',
    48,
    'HS-1043'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_messages (ticket_id, sender_role, sender_name, message)
VALUES 
(1, 'CUSTOMER', 'John Doe', 'Hi, the Fortis Hospital billing desk mentioned that a query was raised regarding room category approval. Could you confirm if Single Private Room is cleared?'),
(1, 'SUPPORT_AGENT', 'Pooja V (Claims Desk)', 'Hello John, we verified your Advantage Plus Gold policy. There is zero room-rent cap on your policy. We have re-transmitted the approval voucher directly to Fortis TPA desk.'),
(2, 'CUSTOMER', 'John Doe', 'Please let me know which documents are needed to enroll my newborn child under our family floater plan.')
ON CONFLICT DO NOTHING;
