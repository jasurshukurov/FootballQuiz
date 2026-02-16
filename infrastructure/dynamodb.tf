resource "aws_dynamodb_table" "user_stats" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "sortKey"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "sortKey"
    type = "S"
  }
}
