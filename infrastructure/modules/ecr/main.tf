variable "repositories" {
  type = list(string)
}

resource "aws_ecr_repository" "repos" {
  for_each = toset(var.repositories)

  name         = each.value
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "MUTABLE"

  tags = {
    Project   = "HealthInsurance"
    Terraform = "true"
  }
}
