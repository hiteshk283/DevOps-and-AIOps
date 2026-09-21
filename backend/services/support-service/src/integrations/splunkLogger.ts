/**
 * Splunk HTTP Event Collector (HEC) Audit Logger
 * 
 * Configured via environment variables:
 * - SPLUNK_HEC_URL: e.g. https://<splunk-host>:8088/services/collector
 * - SPLUNK_HEC_TOKEN: Splunk HEC Token
 * - SPLUNK_INDEX: e.g. healthshield_logs
 */

export interface SplunkLogEvent {
  event: {
    service: string;
    action: string;
    userId?: number;
    ticketId?: string;
    claimId?: string;
    details: any;
    traceId: string;
    severity: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';
  };
  time?: number;
  host?: string;
  source?: string;
  sourcetype?: string;
  index?: string;
}

export const logToSplunk = async (action: string, details: any, userId?: number): Promise<void> => {
  const hecUrl = process.env.SPLUNK_HEC_URL;
  const hecToken = process.env.SPLUNK_HEC_TOKEN;
  const index = process.env.SPLUNK_INDEX || 'healthshield_logs';

  const traceId = `trc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const logPayload: SplunkLogEvent = {
    event: {
      service: 'support-service',
      action,
      userId,
      details,
      traceId,
      severity: 'AUDIT',
    },
    time: Math.floor(Date.now() / 1000),
    host: process.env.HOSTNAME || 'healthshield-support-pod',
    source: 'support-service-api',
    sourcetype: '_json',
    index,
  };

  // 1. Output structured JSON to stdout (Ingested by OpenShift / Fluentd / Splunk Universal Forwarder)
  console.log(JSON.stringify(logPayload));

  // 2. Direct HEC dispatch if token is provided
  if (hecUrl && hecToken) {
    try {
      await fetch(hecUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${hecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logPayload),
      });
    } catch (err) {
      console.warn('[Splunk HEC Warning] Failed to stream to HEC endpoint:', (err as any).message);
    }
  }
};
