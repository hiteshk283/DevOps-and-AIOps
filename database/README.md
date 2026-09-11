# Health Insurance Database Architecture

PostgreSQL container hosting four isolated databases:
* `auth_db`: User accounts and hashed credentials
* `policies_db`: Health insurance plans, tiers, premiums, deductibles, and benefits
* `claims_db`: Claims filed by members, diagnosis, hospital providers, and status lifecycle
* `members_db`: Member details, active coverage status, and subscriber records

Initialized automatically via scripts in `database/init/`:
* `10-create-databases.sh`
* `20-init-schema.sql`
