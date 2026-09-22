export type RoleType = 'CUSTOMER' | 'ENROLLMENT' | 'ADMIN' | 'DEVELOPER' | 'QA' | 'HOSPITAL';

export interface PolicyPlan {
  id: number;
  code: string;
  name: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  monthly_premium: number;
  annual_deductible: number;
  max_coverage: number;
  copay_percent: number;
  network_type: string;
  room_rent_limit: string;
  waiting_period_initial_days: number;
  waiting_period_pre_existing_months: number;
  description: string;
  plain_language_explanation?: {
    sum_insured_plain?: string;
    room_rent_plain?: string;
    waiting_period_plain?: string;
    copay_plain?: string;
  };
  features: string[];
}

export interface QuoteCalculation {
  policyCode: string;
  policyName: string;
  tier: string;
  calculatedMonthlyPremium: number;
  calculatedAnnualPremium: number;
  annualDiscountPercent: number;
  factorsApplied: {
    ageFactor: number;
    familyMembers: number;
    pedRiskApplied: boolean;
  };
}

export interface DependentMember {
  id: string;
  fullName: string;
  relationship: 'Spouse' | 'Child' | 'Father' | 'Mother';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
}

export interface ApplicantProfile {
  fullName: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  dependents: DependentMember[];
}

export interface MedicalDeclaration {
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasHeartDisease: boolean;
  hasAsthma: boolean;
  hasPriorSurgery: boolean;
  isSmoker: boolean;
  additionalNotes?: string;
}

export interface KYCDetails {
  aadhaarLast4: string;
  panNumber: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeContact: string;
}

export interface EnrollmentProposal {
  id: string;
  proposalNumber: string;
  applicant: ApplicantProfile;
  policyCode: string;
  policyName: string;
  tier: string;
  sumInsured: number;
  premiumAmount: number;
  paymentFrequency: 'ANNUAL' | 'MONTHLY';
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING';
  medicalDeclarations: MedicalDeclaration;
  kyc: KYCDetails;
  status: 'DRAFT' | 'UNDERWRITING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'REJECTED';
  createdAt: string;
  memberId?: string;
  policyNumber?: string;
  effectiveDate?: string;
  taxCertificateNumber?: string;
  underwritingNotes?: string;
}

export interface EnrolledMember {
  id: number | string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  active_policy_code: string;
  policy_status: string;
  effective_date: string;
  created_at?: string;
}

export interface ClaimRecord {
  id: number | string;
  claim_number: string;
  member_id: string;
  policy_code: string;
  patient_name: string;
  provider_hospital: string;
  doctor_name?: string;
  treatment_description: string;
  claimed_amount: number;
  approved_amount?: number;
  service_date: string;
  claim_type: 'CASHLESS' | 'REIMBURSEMENT';
  status: 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'QUERY_RAISED';
  fraud_risk_score?: number;
  fraud_flags?: string[];
  bank_details?: string;
  created_at?: string;
}

export interface HospitalRecord {
  id: number;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  specialty: string;
  cashless_approved: boolean;
  emergency_24x7: boolean;
  rating: number;
  tier: string;
}

export interface SupportTicket {
  id: number;
  ticket_id?: string;
  user_id: number;
  policy_code: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  jira_key?: string;
}

export interface DataConsent {
  id: number;
  user_id: number;
  purpose: string;
  granted_to: string;
  valid_until: string;
  status: 'ACTIVE' | 'WITHDRAWN';
}

export interface MicroserviceHealth {
  id: string;
  name: string;
  port: number;
  url: string;
  endpoint: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'CHECKING';
  latencyMs?: number;
  version: string;
  purpose: string;
}

export interface ApiTestEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  path: string;
  description: string;
  defaultPayload?: any;
  defaultParams?: Record<string, string>;
}

export interface EventStreamMessage {
  id: string;
  timestamp: string;
  topic: string;
  eventType: string;
  producerService: string;
  payload: any;
  s3Archived: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'IDLE' | 'PASSED' | 'FAILED' | 'RUNNING';
  durationMs?: number;
  error?: string;
  assertion?: string;
  responsePreview?: string;
}

export interface TestSuiteResult {
  id: string;
  title: string;
  category: string;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs?: number;
  tests: TestCase[];
}
