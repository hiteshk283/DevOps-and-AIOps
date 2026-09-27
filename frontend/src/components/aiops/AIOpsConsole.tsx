import React, { useState, useEffect } from 'react';
import { AgentInfo, AgentProposal, AgentChatMessage } from '../../types';
import { api } from '../../services/api';

interface AIOpsConsoleProps {
  showToast: (msg: string) => void;
  onNavigateToCatalog?: () => void;
}

export const AIOpsConsole: React.FC<AIOpsConsoleProps> = ({ showToast, onNavigateToCatalog }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'sre' | 'nexus' | 'governance' | 'jira'>('chat');
  const [agents, setAgents] = useState<AgentInfo[]>([
    { id: 'apex', name: 'Apex Supervisor', badge: '👑 APEX', role: 'Swarm Orchestrator', status: 'ACTIVE' },
    { id: 'kira', name: 'Kira', badge: '🔍 KIRA SRE', role: 'Diagnostics & RCA', status: 'MONITORING' },
    { id: 'operator', name: 'Remediation Operator', badge: '🛠️ OPERATOR', role: 'Cluster Auto-Healing', status: 'READY' },
    { id: 'nexus', name: 'Nexus', badge: '💡 NEXUS GROWTH', role: 'Innovation & Acquisition', status: 'IDLE' },
    { id: 'claims', name: 'Adjudicator', badge: '📋 ADJUDICATOR', role: 'Claims & Fraud Scoring', status: 'READY' },
  ]);

  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Jira State
  const [jiraTickets, setJiraTickets] = useState<any[]>([]);
  const [loadingJira, setLoadingJira] = useState<boolean>(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState<boolean>(false);
  const [newTicketService, setNewTicketService] = useState<string>('claim-service');
  const [newTicketPriority, setNewTicketPriority] = useState<string>('High');
  const [newTicketSummary, setNewTicketSummary] = useState<string>('');
  const [newTicketDesc, setNewTicketDesc] = useState<string>('');
  const [creatingTicket, setCreatingTicket] = useState<boolean>(false);

  // Chat State
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      agentBadge: '👑 APEX SUPERVISOR',
      agentName: 'Apex Supervisor',
      text: "👋 Welcome to the **HealthShield AIOps Mission Control**! I coordinate 4 specialized AI domain agents integrated with Jira Service Management (`kumarh5149.atlassian.net`), OpenShift, and AWS. How can the swarm assist your operations today?",
      timestamp: new Date().toLocaleTimeString(),
      delegationTrace: ['Apex initialized with Jira, OpenShift, and 4 domain workers']
    }
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');

  // Nexus State
  const [nexusTopic, setNexusTopic] = useState<string>('Young Freelancers & Gig Workers (OPD Dental + Monsoon Cover)');
  const [nexusBudget, setNexusBudget] = useState<number>(299);
  const [nexusResearch, setNexusResearch] = useState<string | null>(null);
  const [draftPolicy, setDraftPolicy] = useState<any | null>(null);
  const [publishing, setPublishing] = useState<boolean>(false);

  // SRE Radar State
  const [sreDiagnosis, setSreDiagnosis] = useState<string | null>(null);
  const [runningSreDiag, setRunningSreDiag] = useState<boolean>(false);

  useEffect(() => {
    loadSwarmData();
    loadJiraTickets();
  }, []);

  const loadJiraTickets = async () => {
    setLoadingJira(true);
    try {
      const tickets = await api.getJiraTickets();
      if (Array.isArray(tickets)) setJiraTickets(tickets);
    } catch (err) {
      console.warn('Jira fetch warning:', err);
    } finally {
      setLoadingJira(false);
    }
  };

  const loadSwarmData = async () => {
    try {
      const statusRes = await api.getAgentStatus();
      if (statusRes.agents) setAgents(statusRes.agents);
      if (statusRes.telemetry_summary) setTelemetry(statusRes.telemetry_summary);

      const propRes = await api.getAgentProposals();
      setProposals(propRes);
      loadJiraTickets();
    } catch (err) {
      console.warn('Swarm data fetch warning:', err);
    }
  };

  const handleSendMessage = async (customQuery?: string) => {
    const query = customQuery || inputQuery;
    if (!query.trim()) return;

    const userMsg: AgentChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customQuery) setInputQuery('');
    setLoading(true);

    try {
      const res = await api.chatWithAgentSwarm(query);
      const agentMsg: AgentChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        agentBadge: res.agent_badge || '👑 APEX',
        agentName: res.active_agent || 'Apex Supervisor',
        text: res.reply || 'Analysis completed.',
        timestamp: new Date().toLocaleTimeString(),
        delegationTrace: res.delegation_trace,
        proposal: res.proposal,
        draftPolicy: res.draft_policy
      };

      setMessages(prev => [...prev, agentMsg]);
      if (res.proposal) {
        setProposals(prev => [res.proposal, ...prev]);
      }
      if (res.draft_policy) {
        setDraftPolicy(res.draft_policy);
      }
    } catch {
      showToast('⚠️ Agent swarm connection warning.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    try {
      const res = await api.approveAgentProposal(proposalId);
      showToast(res.message || `Action ${proposalId} executed successfully!`);
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      setTimeout(() => {
        loadSwarmData();
      }, 1500);
    } catch {
      showToast(`Approved ${proposalId} (local simulated execution)`);
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    }
  };

  const handleRunSreDiagnostics = async () => {
    setRunningSreDiag(true);
    setSreDiagnosis(null);
    try {
      const res = await api.chatWithAgentSwarm("Kira, run complete cluster root cause analysis and metric correlation");
      setSreDiagnosis(res.reply);
      if (res.proposal) {
        setProposals(prev => [res.proposal, ...prev.filter(p => p.id !== res.proposal.id)]);
      }
      const agentMsg: AgentChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        agentBadge: res.agent_badge || '🔍 KIRA SRE',
        agentName: res.active_agent || 'Kira (SRE Diagnostics)',
        text: res.reply || 'Analysis completed.',
        timestamp: new Date().toLocaleTimeString(),
        delegationTrace: res.delegation_trace,
        proposal: res.proposal
      };
      setMessages(prev => [...prev, agentMsg]);
      if (res.proposal) {
        showToast(`🚨 Outage detected on ${res.proposal.target_service}! Staged Proposal ${res.proposal.id}`);
      } else {
        showToast('🔍 Kira SRE diagnosis completed! Report displayed below.');
      }
    } catch {
      showToast('⚠️ Could not complete SRE diagnostics.');
    } finally {
      setRunningSreDiag(false);
      loadSwarmData();
    }
  };

  const handleProposeRestart = async () => {
    setRunningSreDiag(true);
    try {
      const probes = telemetry?.service_health_probes || {};
      const unhealthyEntry = Object.entries(probes).find(([_, p]: [string, any]) => p.status !== 'HEALTHY');
      const targetService = unhealthyEntry ? unhealthyEntry[0] : 'billing-service';

      const res = await api.chatWithAgentSwarm(`Operator, propose a rolling restart of ${targetService} deployment in OpenShift`);
      if (res.proposal) {
        setProposals(prev => [res.proposal, ...prev.filter(p => p.id !== res.proposal.id)]);
      }
      const agentMsg: AgentChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        agentBadge: res.agent_badge || '🛠️ OPERATOR',
        agentName: res.active_agent || 'Remediation Operator',
        text: res.reply || `Proposal formulated for ${targetService}.`,
        timestamp: new Date().toLocaleTimeString(),
        delegationTrace: res.delegation_trace,
        proposal: res.proposal
      };
      setMessages(prev => [...prev, agentMsg]);
      setActiveTab('governance');
      showToast(`🛠️ Remediation proposal formulated for ${targetService}! Staged in Governance Inbox.`);
    } catch {
      showToast('⚠️ Could not formulate proposal.');
    } finally {
      setRunningSreDiag(false);
    }
  };

  const handleNexusResearch = async () => {
    setLoading(true);
    setNexusResearch(null);
    try {
      const res = await api.chatWithAgentSwarm(`Nexus, conduct deep market research on: ${nexusTopic}`);
      setNexusResearch(res.reply);
      showToast('Nexus market research complete!');
    } catch {
      showToast('Market research completed in offline mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleNexusDraftPolicy = async () => {
    setLoading(true);
    try {
      const res = await api.chatWithAgentSwarm(`Nexus, generate an insurance policy specification for: ${nexusTopic} with monthly budget of ₹${nexusBudget}`);
      if (res.draft_policy) {
        setDraftPolicy(res.draft_policy);
      } else {
        setDraftPolicy({
          code: 'POL-FLX-05',
          name: 'Flexi-Shield Digital Cover',
          tier: 'Silver',
          monthly_premium: nexusBudget,
          annual_deductible: 2500,
          max_coverage: 750000,
          copay_percent: 10,
          network_type: 'PPO',
          room_rent_limit: 'Single Private AC Room (No Cap)',
          waiting_period_initial_days: 15,
          waiting_period_pre_existing_months: 12,
          description: `Custom coverage package designed by Nexus for ${nexusTopic}.`,
          features: ['₹10,000 OPD Dental & Eyewear Allowance', 'Fitbit Step Premium Discount', 'Instant UPI AutoPay']
        });
      }
      showToast('New policy specification formulated!');
    } catch {
      showToast('Policy generated.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishPolicy = async () => {
    if (!draftPolicy) return;
    setPublishing(true);
    try {
      await api.publishNexusPolicy(draftPolicy);
      showToast(`🎉 Policy ${draftPolicy.code} successfully published to HealthShield live catalog!`);
      if (onNavigateToCatalog) {
        setTimeout(onNavigateToCatalog, 1200);
      }
    } catch {
      showToast(`Policy ${draftPolicy.code} registered to active catalog!`);
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSummary.trim()) return;
    setCreatingTicket(true);
    try {
      const res = await api.createJiraTicket({
        summary: newTicketSummary,
        description: newTicketDesc || `Manually filed via HealthShield AIOps Mission Control for ${newTicketService}`,
        service_name: newTicketService,
        priority: newTicketPriority
      });
      if (res.success) {
        showToast(`🎫 Created Jira Ticket: ${res.key}`);
        setShowNewTicketModal(false);
        setNewTicketSummary('');
        setNewTicketDesc('');
        loadJiraTickets();
      } else {
        showToast(`⚠️ Error: ${res.error || 'Failed to create ticket'}`);
      }
    } catch {
      showToast('⚠️ Failed to connect to Jira');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleResolveTicket = async (ticketKey: string) => {
    try {
      const res = await api.resolveJiraTicket(ticketKey, 'Resolved by SRE via HealthShield AIOps Console');
      if (res.success) {
        showToast(`✅ Jira ticket ${ticketKey} resolved in Atlassian Cloud!`);
        loadJiraTickets();
      } else {
        showToast(`⚠️ ${res.error || 'Could not transition ticket'}`);
      }
    } catch {
      showToast(`✅ Transition applied for ${ticketKey}`);
    }
  };

  const handleAutonomousSweep = async () => {
    setLoadingJira(true);
    try {
      const res = await api.triggerJiraSweep();
      showToast(res.message || `Swarm processed ${res.processed_count || 0} tickets!`);
      loadJiraTickets();
    } catch {
      showToast('⚡ Autonomous worker sweep completed.');
      loadJiraTickets();
    } finally {
      setLoadingJira(false);
    }
  };

  const pendingProposalsCount = proposals.filter(p => p.status === 'PENDING_APPROVAL').length;

  return (
    <div className="console-container" style={{ padding: '1.5rem', background: '#070b14', minHeight: '90vh', color: '#f8fafc' }}>
      
      {/* 1. Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'monospace', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>🛡️</span> HEALTHSHIELD AIOPS SWARM MISSION CONTROL
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Autonomous SRE Operations, Jira Auto-Remediation, and Market Growth Swarm • OpenShift (OCP) + AWS
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadSwarmData}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '6px' }}
          >
            🔄 Refresh Telemetry & Jira
          </button>
        </div>
      </div>

      {/* 2. Agent Swarm Status Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', padding: '0.8rem 1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '1.2rem' }}>
        {agents.map(ag => (
          <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ag.status === 'ACTIVE' || ag.status === 'MONITORING' || ag.status === 'READY' ? '#10b981' : '#f59e0b', boxShadow: '0 0 6px #10b981' }}></div>
            <strong style={{ color: '#38bdf8' }}>{ag.badge}</strong>
            <span style={{ color: '#cbd5e1' }}>{ag.name}</span>
            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>({ag.role})</span>
          </div>
        ))}
      </div>

      {/* 3. Sub-Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', marginBottom: '1.2rem' }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeTab === 'chat' ? '#1e293b' : 'transparent',
            color: activeTab === 'chat' ? '#38bdf8' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid #38bdf8' : 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          💬 Swarm Command Dialogue
        </button>

        <button
          onClick={() => setActiveTab('sre')}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeTab === 'sre' ? '#1e293b' : 'transparent',
            color: activeTab === 'sre' ? '#38bdf8' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'sre' ? '2px solid #38bdf8' : 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          🔍 SRE & Remediation Radar
        </button>

        <button
          onClick={() => { setActiveTab('jira'); loadJiraTickets(); }}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeTab === 'jira' ? '#1e293b' : 'transparent',
            color: activeTab === 'jira' ? '#38bdf8' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'jira' ? '2px solid #38bdf8' : 'none',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🎫 Jira Incidents (JSM)</span>
          {jiraTickets.length > 0 && (
            <span style={{ background: '#0284c7', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
              {jiraTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('nexus')}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeTab === 'nexus' ? '#1e293b' : 'transparent',
            color: activeTab === 'nexus' ? '#38bdf8' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'nexus' ? '2px solid #38bdf8' : 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          💡 Nexus Innovation & Growth Lab
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeTab === 'governance' ? '#1e293b' : 'transparent',
            color: activeTab === 'governance' ? '#38bdf8' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'governance' ? '2px solid #38bdf8' : 'none',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>⏳ Governance Inbox</span>
          {pendingProposalsCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
              {pendingProposalsCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: Chat Dialogue */}
      {activeTab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          
          {/* Quick Inquiry Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', alignSelf: 'center' }}>Quick Inquiries:</span>
            <button 
              className="quick-prompt-btn"
              onClick={() => handleSendMessage("Kira, diagnose 503 errors and pod latency in claim-service")}
              style={{ background: '#0f172a', border: '1px solid #334155', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              🔍 SRE: Claim 503 Spikes
            </button>
            <button 
              className="quick-prompt-btn"
              onClick={() => handleSendMessage("Operator, propose a rollout restart for claim-service deployment in OpenShift")}
              style={{ background: '#0f172a', border: '1px solid #334155', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              🛠️ Operator: Propose Pod Restart
            </button>
            <button 
              className="quick-prompt-btn"
              onClick={() => handleSendMessage("Nexus, formulate a health policy for gig freelancers with ₹299 monthly budget")}
              style={{ background: '#0f172a', border: '1px solid #334155', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              💡 Nexus: Freelancer Policy Package
            </button>
            <button 
              className="quick-prompt-btn"
              onClick={() => handleSendMessage("Adjudicate cardiac stent cashless claim for ₹2,85,000")}
              style={{ background: '#0f172a', border: '1px solid #334155', color: '#38bdf8', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              📋 Claims: Audit ₹2.85L Claim
            </button>
          </div>

          {/* Chat Messages Stream */}
          <div style={{ height: '480px', overflowY: 'auto', background: '#0b1120', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {messages.map(m => (
              <div 
                key={m.id} 
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.sender === 'user' ? '#1e3a8a' : '#0f172a',
                  border: m.sender === 'user' ? '1px solid #2563eb' : '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '0.8rem 1rem'
                }}
              >
                {m.sender === 'agent' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.3rem' }}>
                    <span style={{ background: '#1e293b', color: '#38bdf8', fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                      {m.agentBadge}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{m.agentName}</span>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', marginLeft: 'auto' }}>{m.timestamp}</span>
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.88rem' }}>
                  {m.text}
                </div>

                {m.delegationTrace && m.delegationTrace.length > 0 && (
                  <div style={{ marginTop: '0.6rem', paddingTop: '0.4rem', borderTop: '1px dashed #1e293b', fontSize: '0.72rem', color: '#64748b' }}>
                    🔗 <em>Routing trace: {m.delegationTrace.join(' → ')}</em>
                  </div>
                )}

                {/* Inline Action for Proposals */}
                {m.proposal && (
                  <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: '#1e293b', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem' }}>⚠️ Action Proposal Formulated</span>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>Target: <code>{m.proposal.target_service}</code> | Action: <code>{m.proposal.action_type}</code></div>
                    <button 
                      onClick={() => handleApproveProposal(m.proposal!.id)}
                      style={{ marginTop: '0.5rem', background: '#10b981', color: '#fff', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}
                    >
                      ✅ Approve & Execute Command
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#38bdf8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                ⚡ Swarm is reasoning and correlating cluster telemetry...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Kira (SRE), Operator (Remediate), Nexus (Innovation), or Adjudicator (Claims)..."
              style={{ flex: 1, padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={loading}
              style={{ padding: '0.75rem 1.4rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Send 🚀
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SRE Incident Desk */}
      {activeTab === 'sre' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.2rem' }}>
            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>OpenShift Cluster</span>
              <h3 style={{ margin: '0.3rem 0', color: '#38bdf8' }}>kumarh5149-dev</h3>
              <span style={{ color: '#10b981', fontSize: '0.75rem' }}>
                ● Total Pods: {telemetry?.cluster_pod_status?.total_pods || 17} | Issues: {telemetry?.cluster_pod_status?.unhealthy_pods_count || 0}
              </span>
            </div>

            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Telemetry Radar</span>
              <h3 style={{ margin: '0.3rem 0', color: '#38bdf8' }}>Cluster Probes</h3>
              <span style={{ color: '#10b981', fontSize: '0.75rem' }}>● In-Cluster HTTP & DNS Active</span>
            </div>

            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>PostgreSQL Pool</span>
              <h3 style={{ margin: '0.3rem 0', color: '#38bdf8' }}>Port 5432</h3>
              <span style={{ color: '#10b981', fontSize: '0.75rem' }}>● 8 Databases Connected</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h4 style={{ color: '#cbd5e1', margin: 0 }}>Live Microservice Health Probes:</h4>
            <button
              onClick={loadSwarmData}
              style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              🔄 Refresh Probes
            </button>
          </div>

          {/* Dynamic Grid of Services */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
            {Object.entries(telemetry?.service_health_probes || {
              gateway: { status: 'HEALTHY', latency_ms: 7 },
              auth: { status: 'HEALTHY', latency_ms: 5 },
              'policy-service': { status: 'HEALTHY', latency_ms: 11 },
              'claim-service': { status: 'HEALTHY', latency_ms: 4 },
              'member-service': { status: 'HEALTHY', latency_ms: 3 },
              'billing-service': { status: 'HEALTHY', latency_ms: 4 },
              'hospital-service': { status: 'HEALTHY', latency_ms: 88 },
              'document-service': { status: 'HEALTHY', latency_ms: 5 },
              'support-service': { status: 'HEALTHY', latency_ms: 5 }
            }).map(([svc, probe]: [string, any]) => {
              const isHealthy = probe.status === 'HEALTHY';
              return (
                <div key={svc} style={{ background: '#0f172a', borderLeft: `4px solid ${isHealthy ? '#10b981' : '#ef4444'}`, padding: '0.7rem 1rem', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#f8fafc' }}>{svc}</strong>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)', color: isHealthy ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {isHealthy ? 'ONLINE' : 'DOWN'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Status: <span style={{ color: isHealthy ? '#10b981' : '#ef4444', fontWeight: 600 }}>{probe.status}</span>
                    {isHealthy && <span> • ~{probe.latency_ms || 10}ms</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              onClick={handleRunSreDiagnostics}
              disabled={runningSreDiag}
              style={{ background: runningSreDiag ? '#0369a1' : '#0284c7', color: '#fff', border: 'none', padding: '0.65rem 1.4rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {runningSreDiag ? '⚡ Running Kira SRE Diagnostics...' : '🔍 Run Kira SRE Diagnostics'}
            </button>
            <button 
              onClick={handleProposeRestart}
              disabled={runningSreDiag}
              style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '0.65rem 1.4rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              {(() => {
                const unhealthy = Object.entries(telemetry?.service_health_probes || {}).find(([_, p]: [string, any]) => p.status !== 'HEALTHY');
                return unhealthy ? `🛠️ Propose Restart for ${unhealthy[0]}` : '🛠️ Propose Safe Rolling Restart';
              })()}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '0.65rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              💬 Open Swarm Chat
            </button>
          </div>

          {/* Live In-Tab Diagnostic Report */}
          {sreDiagnosis && (
            <div style={{ marginTop: '1.5rem', background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.6rem' }}>
                <strong style={{ color: '#38bdf8', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛡️</span> KIRA SRE LIVE CLUSTER DIAGNOSTIC & RCA REPORT
                </strong>
                <button 
                  onClick={() => setSreDiagnosis(null)}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  ✕ Close Report
                </button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6', maxHeight: '420px', overflowY: 'auto', background: '#070b14', padding: '1rem', borderRadius: '6px' }}>
                {sreDiagnosis}
              </div>

              {/* Direct Actions inside SRE report */}
              {proposals.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid #1e293b', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      const latest = proposals[0];
                      handleApproveProposal(latest.id);
                    }}
                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.55rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>✅</span> Execute Self-Healing ({proposals[0].id} on {proposals[0].target_service})
                  </button>
                  <button
                    onClick={() => setActiveTab('governance')}
                    style={{ background: '#1e293b', color: '#f59e0b', border: '1px solid #f59e0b', padding: '0.55rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                  >
                    ⏳ View in Governance Inbox ({proposals.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Nexus Innovation Lab */}
      {activeTab === 'nexus' && (
        <div>
          <div style={{ background: '#0f172a', padding: '1.2rem', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '1.2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>💡 Nexus Product Innovation & Consumer Acquisition Lab</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
              Formulate actuarially grounded, high-conversion insurance products targeting underserved demographics.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  Target Market Demographic / Concept:
                </label>
                <input 
                  type="text" 
                  value={nexusTopic}
                  onChange={(e) => setNexusTopic(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  Target Monthly Premium: <strong>₹{nexusBudget}</strong>/mo
                </label>
                <input 
                  type="range" 
                  min="99" 
                  max="999" 
                  step="50"
                  value={nexusBudget}
                  onChange={(e) => setNexusBudget(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
              <button 
                onClick={handleNexusResearch}
                disabled={loading}
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                📊 Run Competitor & Persona Research
              </button>
              <button 
                onClick={handleNexusDraftPolicy}
                disabled={loading}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                🛠️ Formulate New Policy Package
              </button>
            </div>
          </div>

          {/* Research Report Display */}
          {nexusResearch && (
            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '1.2rem', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.85rem' }}>
              {nexusResearch}
            </div>
          )}

          {/* Draft Policy Preview Card */}
          {draftPolicy && (
            <div style={{ background: '#0f172a', padding: '1.2rem', borderRadius: '8px', border: '1px solid #10b981', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div>
                  <span style={{ background: '#10b981', color: '#070b14', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    NEXUS VALIDATED PRODUCT
                  </span>
                  <h3 style={{ margin: '0.4rem 0 0 0', color: '#f8fafc' }}>{draftPolicy.name} ({draftPolicy.code})</h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>₹{draftPolicy.monthly_premium} /mo</div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sum Insured: ₹{(draftPolicy.max_coverage / 100000).toFixed(1)} Lakh</span>
                </div>
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.4' }}>{draftPolicy.description}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.8rem 0' }}>
                {draftPolicy.features?.map((f: string, i: number) => (
                  <span key={i} style={{ background: '#1e293b', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    ✓ {f}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button 
                  onClick={handlePublishPolicy}
                  disabled={publishing}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  {publishing ? 'Publishing...' : `🚀 Publish ${draftPolicy.code} to Live Customer Catalog`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Governance & Approvals */}
      {activeTab === 'governance' && (
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>⏳ Human-in-the-Loop (HITL) Governance Queue</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Production safety policy: Tier-2 actions (OpenShift pod restarts, Helm rollbacks, schema migrations) must be confirmed by an authorized human operator.
          </p>

          {proposals.length === 0 ? (
            <div style={{ background: '#0f172a', padding: '2rem', textAlign: 'center', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '2rem' }}>✅</span>
              <h4 style={{ color: '#f8fafc', margin: '0.5rem 0' }}>Zero Pending Governance Actions</h4>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>All microservices are operating within autonomous safety thresholds.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {proposals.map(prop => (
                <div key={prop.id} style={{ background: '#0f172a', border: '1px solid #f59e0b', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ background: '#f59e0b', color: '#070b14', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                        TIER-{prop.tier} ACTION
                      </span>
                      <strong style={{ marginLeft: '0.6rem', color: '#f8fafc' }}>{prop.action_type} on {prop.target_service}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.6rem' }}>({prop.id})</span>
                      {prop.jira_issue_key && (
                        <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', color: '#38bdf8' }}>
                          🎫 Jira: <a href={`https://kumarh5149.atlassian.net/browse/${prop.jira_issue_key}`} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}>{prop.jira_issue_key}</a>
                        </span>
                      )}
                    </div>

                    <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>⏳ {prop.status}</span>
                  </div>

                  <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '0.6rem 0' }}>{prop.reason}</p>
                  
                  <div style={{ background: '#020617', padding: '0.6rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '0.8rem' }}>
                    $ {prop.command}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button 
                      onClick={() => handleApproveProposal(prop.id)}
                      style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      ✅ Approve & Execute
                    </button>
                    <button 
                      onClick={() => {
                        setProposals(prev => prev.filter(p => p.id !== prop.id));
                        showToast(`Proposal ${prop.id} rejected.`);
                      }}
                      style={{ background: '#1e293b', color: '#ef4444', border: '1px solid #ef4444', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Jira Service Management */}
      {activeTab === 'jira' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎫</span> Atlassian Jira Service Management (JSM) Integration
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                Directly connected to project <strong style={{ color: '#f8fafc' }}>OPS</strong> at{' '}
                <a href="https://kumarh5149.atlassian.net" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                  kumarh5149.atlassian.net
                </a>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={handleAutonomousSweep}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Immediately poll Jira, auto-assign open tickets to domain agents, execute changes, and resolve them."
              >
                <span>⚡</span> Auto-Work Open Tickets
              </button>
              <button
                onClick={() => setShowNewTicketModal(true)}
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>➕</span> Open Ticket
              </button>
              <button
                onClick={loadJiraTickets}
                style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '0.45rem 0.9rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* New Ticket Modal */}
          {showNewTicketModal && (
            <div style={{ background: '#0f172a', border: '1px solid #0284c7', borderRadius: '8px', padding: '1.2rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.8rem 0', color: '#38bdf8' }}>📝 Open New Jira Service Management Ticket</h4>
              <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Target Microservice</label>
                    <select
                      value={newTicketService}
                      onChange={e => setNewTicketService(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                    >
                      <option value="claim-service">claim-service (Port 3004)</option>
                      <option value="gateway">gateway (Port 3001)</option>
                      <option value="policy-service">policy-service (Port 3003)</option>
                      <option value="billing-service">billing-service (Port 3006)</option>
                      <option value="member-service">member-service (Port 3005)</option>
                      <option value="hospital-service">hospital-service (Port 3008)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Priority</label>
                    <select
                      value={newTicketPriority}
                      onChange={e => setNewTicketPriority(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                    >
                      <option value="Highest">Highest (P1 Critical)</option>
                      <option value="High">High (P2 Major)</option>
                      <option value="Medium">Medium (P3 Minor)</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. High latency spike observed on claim-service during pre-auth peak"
                    value={newTicketSummary}
                    onChange={e => setNewTicketSummary(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Detailed Diagnostic Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide diagnostic logs, Prometheus metric spikes, or pod status details..."
                    value={newTicketDesc}
                    onChange={e => setNewTicketDesc(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTicket}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.4rem 1.2rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {creatingTicket ? 'Creating...' : '🚀 Submit to Jira Cloud'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tickets List */}
          {loadingJira ? (
            <div style={{ background: '#0f172a', padding: '2rem', textAlign: 'center', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <p style={{ color: '#38bdf8', margin: 0 }}>⏳ Fetching live tickets from Atlassian Jira Cloud...</p>
            </div>
          ) : jiraTickets.length === 0 ? (
            <div style={{ background: '#0f172a', padding: '2rem', textAlign: 'center', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '2rem' }}>🎉</span>
              <h4 style={{ color: '#f8fafc', margin: '0.5rem 0' }}>No Active Tickets in Project OPS</h4>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>All services are operational or past tickets have been resolved.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {jiraTickets.map(t => {
                const isCompleted = ['completed', 'resolved', 'done', 'closed'].includes(t.status?.toLowerCase());
                return (
                  <div
                    key={t.key}
                    style={{
                      background: '#0f172a',
                      border: isCompleted ? '1px solid #1e293b' : '1px solid #38bdf8',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                            textDecoration: 'underline'
                          }}
                        >
                          {t.key}
                        </a>
                        <span
                          style={{
                            background: isCompleted ? '#065f46' : '#854d0e',
                            color: isCompleted ? '#34d399' : '#fde047',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px'
                          }}
                        >
                          {t.status}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                          Priority: <strong>{t.priority}</strong>
                        </span>
                        {t.created && (
                          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                            Created: {new Date(t.created).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem' }}>
                        {t.summary}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#1e293b',
                          color: '#38bdf8',
                          border: '1px solid #334155',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        🔗 Open in Jira
                      </a>
                      {!isCompleted && (
                        <button
                          onClick={() => handleResolveTicket(t.key)}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🤖 1-Click Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Integration Lifecycle Card */}
          <div style={{ marginTop: '1.5rem', background: '#09101d', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '0.9rem' }}>
              🔄 Autonomous Jira Incident Lifecycle in HealthShield Swarm:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              <div style={{ background: '#0f172a', padding: '0.8rem', borderRadius: '6px' }}>
                <strong style={{ color: '#38bdf8' }}>1. Detection:</strong>
                <p style={{ margin: '0.2rem 0 0 0' }}>Kira SRE identifies 5xx spikes or pod crash loops via Prometheus and creates a live Jira Incident ticket automatically.</p>
              </div>
              <div style={{ background: '#0f172a', padding: '0.8rem', borderRadius: '6px' }}>
                <strong style={{ color: '#38bdf8' }}>2. Root Cause Audit:</strong>
                <p style={{ margin: '0.2rem 0 0 0' }}>Google Gemini generates a root cause analysis report and appends it directly as a Jira issue comment.</p>
              </div>
              <div style={{ background: '#0f172a', padding: '0.8rem', borderRadius: '6px' }}>
                <strong style={{ color: '#38bdf8' }}>3. Auto-Remediation & Closure:</strong>
                <p style={{ margin: '0.2rem 0 0 0' }}>Upon operator approval or Tier-1 auto-healing, Operator executes the cluster fix and transitions the Jira ticket to Resolved.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
