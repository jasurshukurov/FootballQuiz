resource "aws_s3_bucket" "remote_config" {
  bucket = var.config_bucket_name
}

resource "aws_s3_bucket_versioning" "remote_config" {
  bucket = aws_s3_bucket.remote_config.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "remote_config" {
  bucket = aws_s3_bucket.remote_config.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Config is public, non-sensitive data; allow browser (web build) fetches.
resource "aws_s3_bucket_cors_configuration" "remote_config" {
  bucket = aws_s3_bucket.remote_config.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "remote_config" {
  bucket = aws_s3_bucket.remote_config.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "remote_config" {
  bucket = aws_s3_bucket.remote_config.id

  depends_on = [aws_s3_bucket_public_access_block.remote_config]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.remote_config.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
