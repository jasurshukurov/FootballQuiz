# footballtrivia.app — Route53 hosted zone, ACM certificate, and (phase 2)
# CloudFront aliases for the existing content distribution.
#
# Two-phase rollout because ACM DNS validation can only complete once the
# domain's nameservers point at the Route53 zone below:
#   Phase 1 (enable_custom_domain = false): create zone + cert + validation
#     records. Apply, then update the registrar's nameservers to the
#     `nameservers` output.
#   Phase 2 (enable_custom_domain = true): once NS has propagated, apply again
#     to wait for cert issuance and attach aliases + cert to the distribution.

variable "domain_name" {
  description = "Apex domain for the public site"
  type        = string
  default     = "footballtrivia.app"
}

variable "enable_custom_domain" {
  description = "Flip to true after the registrar nameservers point at Route53"
  type        = bool
  default     = false
}

resource "aws_route53_zone" "site" {
  name = var.domain_name
}

resource "aws_acm_certificate" "site" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.site.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.record]
  allow_overwrite = true
}

# Phase 2 only: blocks until the cert is ISSUED (needs live NS delegation).
resource "aws_acm_certificate_validation" "site" {
  count                   = var.enable_custom_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_route53_record" "apex_a" {
  zone_id = aws_route53_zone.site.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = aws_route53_zone.site.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  zone_id = aws_route53_zone.site.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  zone_id = aws_route53_zone.site.zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

output "nameservers" {
  description = "Set these at the registrar for footballtrivia.app"
  value       = aws_route53_zone.site.name_servers
}
