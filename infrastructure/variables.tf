variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "S3 bucket name for content assets"
  type        = string
  default     = "football-trivia-content-assets"
}

variable "config_bucket_name" {
  description = "S3 bucket name for remote config"
  type        = string
  default     = "football-trivia-remote-config"
}

variable "table_name" {
  description = "DynamoDB table name for user stats"
  type        = string
  default     = "FootballTriviaUserStats"
}
