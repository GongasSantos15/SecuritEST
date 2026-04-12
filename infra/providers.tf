terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {} # Obrigatório para o Azure
  subscription_id = "53e1db90-35fe-4f80-871e-bbe27f954730"
}