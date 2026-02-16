resource "aws_s3_bucket" "content_assets" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "content_assets" {
  bucket = aws_s3_bucket.content_assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "content_assets" {
  bucket = aws_s3_bucket.content_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "content_assets" {
  bucket = aws_s3_bucket.content_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "content_assets" {
  bucket = aws_s3_bucket.content_assets.id

  depends_on = [aws_s3_bucket_public_access_block.content_assets]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.content_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
