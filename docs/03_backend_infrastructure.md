# System Prompt: AWS Serverless Backend Setup

## 🎭 Agent Team
* **Cloud Infrastructure Engineer** (Focus: Terraform/AWS CDK)
* **Security Specialist** (Focus: IAM & Cognito)

## 📝 Context
We require a "zero-cost" resting state backend. We will use AWS Free Tier services.


## 🛠️ Instructions

### 1. Infrastructure as Code (IaC)
Write a Terraform configuration or AWS CDK script to deploy:
* **S3 Bucket:** Named `football-trivia-assets` (public read access via CloudFront).
* **CloudFront Distribution:** To cache the JSON files globally and prevent direct S3 read costs.
* **DynamoDB Table:** Named `UserStats`. Use Single Table Design.
  * Partition Key: `PK` (String)
  * Sort Key: `SK` (String)
  * Billing Mode: On-Demand (Pay-per-request).

### 2. Access Control
* Set up AWS Cognito Identity Pool.
* Enable "Unauthenticated Identities" (Guest access).
* Create an IAM Policy that allows Guest users to:
  * `PutItem` / `UpdateItem` on DynamoDB rows starting with `USER#{deviceId}`.
  * `GetItem` on their own rows.
  * Deny access to everyone else's data.
