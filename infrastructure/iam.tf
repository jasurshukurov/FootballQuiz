data "aws_caller_identity" "current" {}

resource "aws_iam_role" "cognito_unauth" {
  name = "football-trivia-cognito-unauth"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "cognito_unauth_s3" {
  name = "s3-read-access"
  role = aws_iam_role.cognito_unauth.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.content_assets.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "cognito_unauth_dynamodb" {
  name = "dynamodb-user-stats"
  role = aws_iam_role.cognito_unauth.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.user_stats.arn
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = "$${cognito-identity.amazonaws.com:sub}"
          }
        }
      }
    ]
  })
}
