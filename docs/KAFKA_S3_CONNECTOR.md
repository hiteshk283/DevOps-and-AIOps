# HealthShield: Kafka Event Distribution & AWS S3 Sink Connector

This guide details how Apache Kafka events are published, structured, and archived into the **AWS S3 Lakehouse** via the Kafka S3 Sink Connector.

---

## 1. Event Streaming Architecture

```
Microservices (Billing, Claims, Policy)
                    │
                    ▼ Emits JSON Event
       Apache Kafka (Strimzi OCP)
  ┌─────────────────────────────────────┐
  │ Topic: payment.events (3 Partitions)│
  │ Topic: claim.events   (3 Partitions)│
  │ Topic: policy.events  (3 Partitions)│
  └──────────────────┬──────────────────┘
                     │
                     ▼ Polls & Batches Records
       Kafka Connect (S3 Sink Worker)
  ┌─────────────────────────────────────┐
  │ S3SinkConnector                     │
  │ • Partitioner: TimeBasedPartitioner │
  │ • Flush Size: 1,000 records / 5MB   │
  │ • IAM Scoped Credentials            │
  └──────────────────┬──────────────────┘
                     │
                     ▼ Writes Encrypted Files
       AWS S3 Event Store Bucket
  ┌─────────────────────────────────────┐
  │ s3://healthshield-kafka-events-.../ │
  │   └── payment.events/               │
  │       └── year=2026/month=09/day=22/│
  │           ├── chunk-0001.json       │
  │           └── chunk-0002.json       │
  └─────────────────────────────────────┘
```

---

## 2. Event Topics & Schemas

### A. Topic: `payment.events`
Emitted by `backend/services/billing-service/src/events/kafkaPublisher.ts` whenever a premium is paid or refunded.

```json
{
  "eventId": "EVT-1758509827",
  "eventType": "PAYMENT_COMPLETED",
  "paymentId": "PAY-2026-901",
  "invoiceNumber": "INV-2026-001",
  "userId": 1,
  "amount": 5388.00,
  "paymentMethod": "UPI",
  "transactionRef": "UPI-TXN-992817263",
  "timestamp": "2026-09-22T00:24:00.000Z",
  "s3ArchiveMetadata": {
    "lakehousePartition": "year=2026/month=2026-09",
    "schemaVersion": "1.0.0",
    "bucketTarget": "healthshield-kafka-events-794558722040"
  }
}
```

### B. Topic: `claim.events`
Emitted when claims or cashless pre-authorization vouchers are created or transition status (`SUBMITTED`, `PRE_AUTH_APPROVED`, `APPROVED`, `SETTLED`).

```json
{
  "eventId": "EVT-CLM-8802",
  "eventType": "PRE_AUTH_SANCTIONED",
  "claimNumber": "CLM-2026-8802",
  "memberId": "MEM-1001",
  "policyCode": "POL-GLD-03",
  "hospitalName": "Fortis Healthcare",
  "claimedAmount": 340000.00,
  "approvedAmount": 306000.00,
  "fraudRiskScore": 15,
  "timestamp": "2026-09-22T00:25:00.000Z"
}
```

---

## 3. Kafka S3 Sink Connector Configuration

Defined in `gitops/openshift/kafka/03-kafka-s3-sink-connector.yml`:

* **`s3.bucket.name`**: `healthshield-kafka-events-794558722040`
* **`s3.region`**: `us-east-1`
* **`partitioner.class`**: `io.confluent.connect.storage.partitioner.TimeBasedPartitioner`
* **`path.format`**: `'year'=YYYY/'month'=MM/'day'=dd`
* **`flush.size`**: `1000` (flushes files every 1,000 records or 5MB chunk)
* **`aws.access.key.id` & `aws.secret.access.key`**: Injected securely via OpenShift secret without committing keys to git.
