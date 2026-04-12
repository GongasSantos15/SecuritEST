variable "securitest" {
  description = "Nome do Grupo de Recursos"
  type        = string
  default     = "rg-securitest"
}

variable "suffix" {
  description = "Sufixo fixo para garantir nomes únicos"
  type        = string
  default     = "1xyiu5"  # ← o sufixo atual, fica sempre este
}

variable "switzerlandNorth" {
  description = "Região do Azure"
  type        = string
  default     = "switzerlandnorth"
}