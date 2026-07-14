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

  attribute {
    name = "lbShard"
    type = "S"
  }

  attribute {
    name = "lbScore"
    type = "N"
  }

  # Global leaderboard: items written with lbShard = "ALLTIME" or
  # "DAILY#<yyyy-mm-dd>" and lbScore = XP are queryable top-N by score.
  # Only leaderboard items carry these attributes, so the index never
  # exposes other per-user records.
  global_secondary_index {
    name            = "leaderboard-index"
    hash_key        = "lbShard"
    range_key       = "lbScore"
    projection_type = "ALL"
  }
}
