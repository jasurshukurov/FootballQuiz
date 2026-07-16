resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "Football Trivia content distribution"

  origin {
    domain_name              = aws_s3_bucket.content_assets.bucket_regional_domain_name
    origin_id                = "S3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  origin {
    domain_name              = aws_s3_bucket.remote_config.bucket_regional_domain_name
    origin_id                = "S3-${var.config_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # Remote config / kill switch must propagate quickly: short TTL, own origin.
  ordered_cache_behavior {
    path_pattern           = "config.json"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.config_bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 600

    forwarded_values {
      query_string = false
      # Forward Origin so S3 CORS headers reach browser (web build) fetches.
      headers = ["Origin"]
      cookies {
        forward = "none"
      }
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # Serve the landing page for any unknown path (e.g. /share/<n> deep links
  # opened on devices without the app installed).
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = var.enable_custom_domain ? [var.domain_name, "www.${var.domain_name}"] : []

  # Default CloudFront cert until the footballtrivia.app cert is issued
  # (phase 2 of domain.tf); then SNI with the ACM cert.
  viewer_certificate {
    cloudfront_default_certificate = var.enable_custom_domain ? false : true
    acm_certificate_arn            = var.enable_custom_domain ? aws_acm_certificate_validation.site[0].certificate_arn : null
    ssl_support_method             = var.enable_custom_domain ? "sni-only" : null
    minimum_protocol_version       = var.enable_custom_domain ? "TLSv1.2_2021" : null
  }
}
