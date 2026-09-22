import React, { useState, useEffect } from 'react';
import { RoleType, PolicyPlan, ClaimRecord, HospitalRecord, SupportTicket, DataConsent, EnrolledMember, EnrollmentProposal } from './types';
import { api } from './services/api';
import { Header } from './components/common/Header';
import { ConsoleSwitcherModal } from './components/common/ConsoleSwitcherModal';
import { CustomerConsole } from './components/customer/CustomerConsole';
import { NewEnrollmentWizard } from './components/customer/NewEnrollmentWizard';
import { AdminConsole } from './components/admin/AdminConsole';
import { DeveloperConsole } from './components/developer/DeveloperConsole';
import { QAConsole } from './components/qa/QAConsole';
import { HospitalConsole } from './components/hospital/HospitalConsole';

export default function App() {
  // Current active role console
  const [currentRole, setCurrentRole] = useState<RoleType>('CUSTOMER');
  const [isLauncherOpen, setIsLauncherOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Global State Containers
  const [policies, setPolicies] = useState<PolicyPlan[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [consents, setConsents] = useState<DataConsent[]>([]);
  const [members, setMembers] = useState<EnrolledMember[]>([]);
  const [currentMember, setCurrentMember] = useState<EnrolledMember | null>(null);
  const [proposals, setProposals] = useState<EnrollmentProposal[]>([]);
  const [selectedPlanForEnrollment, setSelectedPlanForEnrollment] = useState<string>('POL-GLD-03');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Sync with URL Hash on Mount and Popstate
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('enroll')) {
        setCurrentRole('ENROLLMENT');
      } else if (hash.includes('admin')) {
        setCurrentRole('ADMIN');
      } else if (hash.includes('developer') || hash.includes('dev')) {
        setCurrentRole('DEVELOPER');
      } else if (hash.includes('qa') || hash.includes('test')) {
        setCurrentRole('QA');
      } else if (hash.includes('hospital')) {
        setCurrentRole('HOSPITAL');
      } else {
        setCurrentRole('CUSTOMER');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL Hash on Role Selection
  const handleSelectRole = (role: RoleType) => {
    setCurrentRole(role);
    const hashMapping: Record<RoleType, string> = {
      CUSTOMER: '#/customer',
      ENROLLMENT: '#/enroll',
      ADMIN: '#/admin',
      DEVELOPER: '#/developer',
      QA: '#/qa',
      HOSPITAL: '#/hospital',
    };
    window.location.hash = hashMapping[role];
  };

  // Initial Data Fetch
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [polRes, claimRes, hospRes, memberRes, allMembersRes, ticketRes, consentRes] = await Promise.allSettled([
        api.getPolicies(),
        api.getClaims('MEM-1001'),
        api.getHospitals(),
        api.getMember('MEM-1001'),
        api.getAllMembers(),
        api.getUserTickets(1),
        api.getUserConsents(1),
      ]);

      if (polRes.status === 'fulfilled') setPolicies(polRes.value);
      if (claimRes.status === 'fulfilled') setClaims(claimRes.value);
      if (hospRes.status === 'fulfilled') setHospitals(hospRes.value);
      if (memberRes.status === 'fulfilled') setCurrentMember(memberRes.value);
      if (allMembersRes.status === 'fulfilled') setMembers(allMembersRes.value);
      if (ticketRes.status === 'fulfilled') setTickets(ticketRes.value);
      if (consentRes.status === 'fulfilled') setConsents(consentRes.value);
    } catch (err) {
      console.warn('Initial telemetry sync warning', err);
    }
  };

  // When a new customer enrolls
  const handleEnrollmentComplete = (proposal: EnrollmentProposal) => {
    setProposals([proposal, ...proposals]);
    // Also add to members list so admin directory immediately shows the new policyholder!
    const names = proposal.applicant.fullName.trim().split(' ');
    const newMemberRecord: EnrolledMember = {
      id: Date.now(),
      member_id: proposal.memberId || `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: names[0] || 'Enrolled',
      last_name: names.slice(1).join(' ') || 'Customer',
      email: proposal.applicant.email,
      phone: proposal.applicant.mobile,
      date_of_birth: proposal.applicant.dob,
      address: `${proposal.applicant.city}, ${proposal.applicant.state}`,
      active_policy_code: proposal.policyCode,
      policy_status: 'ACTIVE',
      effective_date: proposal.effectiveDate || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    setMembers([newMemberRecord, ...members]);
  };

  const handleApproveProposal = (proposalId: string) => {
    setProposals(
      proposals.map((p) => (p.id === proposalId ? { ...p, status: 'ACTIVE' } : p))
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070c1a',
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Top Application Header with Navigation & Quick Console Switcher */}
      <Header
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        onOpenLauncher={() => setIsLauncherOpen(true)}
        notification={notification}
      />

      {/* Global Console Switcher Hub Modal */}
      <ConsoleSwitcherModal
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
      />

      {/* Main Console Workspace */}
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 20px' }}>
        {currentRole === 'CUSTOMER' && (
          <CustomerConsole
            policies={policies}
            claims={claims}
            hospitals={hospitals}
            tickets={tickets}
            consents={consents}
            currentMember={currentMember}
            recentEnrollments={proposals}
            onStartNewEnrollment={(policyCode) => {
              if (policyCode) setSelectedPlanForEnrollment(policyCode);
              handleSelectRole('ENROLLMENT');
            }}
            onRefreshData={loadData}
            showToast={showToast}
          />
        )}

        {currentRole === 'ENROLLMENT' && (
          <NewEnrollmentWizard
            policies={policies}
            onEnrollmentComplete={handleEnrollmentComplete}
            onNavigateToPolicies={() => handleSelectRole('CUSTOMER')}
            showToast={showToast}
          />
        )}

        {currentRole === 'ADMIN' && (
          <AdminConsole
            policies={policies}
            claims={claims}
            members={members}
            pendingProposals={proposals}
            onApproveProposal={handleApproveProposal}
            onRefreshData={loadData}
            showToast={showToast}
          />
        )}

        {currentRole === 'DEVELOPER' && (
          <DeveloperConsole showToast={showToast} />
        )}

        {currentRole === 'QA' && (
          <QAConsole
            onGenerateApplicant={handleEnrollmentComplete}
            onRefreshData={loadData}
            showToast={showToast}
          />
        )}

        {currentRole === 'HOSPITAL' && (
          <HospitalConsole
            showToast={showToast}
            onRefreshData={loadData}
          />
        )}
      </main>
    </div>
  );
}
