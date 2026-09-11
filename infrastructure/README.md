# Health Insurance Infrastructure — AWS Terraform

Modular Terraform configuration specifically customized for provisioning the **HealthShield Health Insurance Microservices Platform** on AWS.

---

## What This Infrastructure Creates

| Resource | Configuration / Name | Purpose |
| :--- | :--- | :--- |
| **VPC** | `HealthShield-VPC` (`10.1.0.0/16`) | 3 Multi-AZ public subnets across `us-east-1a/b/c` with Internet Gateway |
| **EKS Cluster** | `healthshield-eks` (v1.34) | Managed Kubernetes cluster control plane |
| **Node Group** | `healthshield-node-group` | 1–2 worker nodes (`m7i-flex.large` or `t3.large`, 30GB EBS) |
| **EBS CSI Driver** | `aws-ebs-csi-driver` (IRSA) | IAM Role for Service Accounts to attach EBS volumes to PostgreSQL |
| **ECR Repositories** | 6 Repositories | `frontend`, `gateway`, `auth`, `policy-service`, `claim-service`, `member-service` |
| **ArgoCD** | Helm chart `argo-cd` (v6.7.0) | Deployed into `argocd` namespace for GitOps sync |
| **Prometheus & Grafana**| `kube-prometheus-stack` (v56.21.0)| Deployed into `monitoring` namespace for observability |

---

## Directory Layout

```
infrastructure/
├── README.md               # Infrastructure documentation
├── provider.tf             # AWS provider configuration
├── variables.tf            # Input variable declarations
├── outputs.tf              # EKS endpoint and ECR URLs
├── terraform.tfvars        # Values customized for Health Insurance
├── main.tf                 # Root orchestration
└── modules/
    ├── vpc/                # VPC, subnets, IGW, route table
    ├── eks/                # EKS cluster, node group, IAM roles, EBS CSI driver
    ├── ecr/                # ECR image repositories
    └── argocd/             # ArgoCD & Prometheus-Grafana Helm releases
```

---

## Step-by-Step Deployment

### 1. Configure AWS CLI
Ensure your AWS credentials are configured:
```bash
aws configure
```

### 2. Initialize Terraform
```bash
cd projects/health-insurance-microservices/infrastructure
terraform init
```

### 3. Review Plan
```bash
terraform plan
```

### 4. Provision Infrastructure
```bash
terraform apply -auto-approve
```

### 5. Connect `kubectl` to your EKS Cluster
Once Terraform completes:
```bash
aws eks update-kubeconfig --region us-east-1 --name healthshield-eks
kubectl get nodes
```

---

## Teardown & Cost Management

To avoid ongoing AWS charges after your learning session, destroy the resources:
```bash
terraform destroy -auto-approve
```
