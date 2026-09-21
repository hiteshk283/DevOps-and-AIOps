/**
 * Grafana Loki HTTP Push Client
 * 
 * Configured via environment variables:
 * - LOKI_URL: e.g. http://loki:3100 (Default for OpenShift & Docker Compose)
 */

export interface LogEntry {
  service: string;
  action: string;
  userId?: number;
  ticketId?: string;
  details: any;
  traceId: string;
  level: 'info' | 'warn' | 'error';
}

export const logToLoki = async (action: string, details: any, userId?: number, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> => {
  const lokiUrl = process.env.LOKI_URL || 'http://loki:3100';
  const traceId = `trc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const logEntry: LogEntry = {
    service: 'support-service',
    action,
    userId,
    details,
    traceId,
    level
  };

  const line = JSON.stringify(logEntry);

  // 1. Output to stdout (Captured by Kubernetes / OpenShift native logging)
  console.log(`[LOKI_AUDIT] ${line}`);

  // 2. Push directly to Loki HTTP Push API (/loki/api/v1/push)
  try {
    const timestampNs = (BigInt(Date.now()) * BigInt(1000000)).toString();
    const payload = {
      streams: [
        {
          stream: {
            app: 'healthshield',
            service: 'support-service',
            action,
            level
          },
          values: [
            [timestampNs, line]
          ]
        }
      ]
    };

    await fetch(`${lokiUrl}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Non-blocking fallback: if Loki is temporarily starting up
    // the log has already been recorded to stdout
  }
};
