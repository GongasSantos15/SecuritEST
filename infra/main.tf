# Cria o contentor principal para todos os serviços do SecuritEST
resource "azurerm_resource_group" "rg" {
  name     = var.securitest
  location = var.switzerlandNorth
}

# Cria o Storage Account para guardar os logs de análise e para o funcionamento da Azure Function
resource "azurerm_storage_account" "storage" {
  name                     = "stsecuritest${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Gerador de sufixo aleatório para garantir nomes únicos no Azure
# O keepers garante que o sufixo nunca muda enquanto o resource group for o mesmo
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false

  keepers = {
    resource_group = var.securitest
  }
}

# Cria uma base de dados NoSQL (Azure CosmosDB) para guardar os resultados dos scans
resource "azurerm_cosmosdb_account" "db" {
  name                = "cosmos-securitest-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"
  consistency_policy {
    consistency_level = "Session"
  }
  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

# Plano de serviço para alojar a Function e a Web App
resource "azurerm_service_plan" "plan" {
  name                = "plan-securitest"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}

# A Azure Function que vai correr o Docker
resource "azurerm_linux_function_app" "scanner_func" {
  name                       = "func-scanner-${random_string.suffix.result}"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.plan.id
  site_config {
    application_stack {
      docker {
        registry_url = "https://index.docker.io"
        image_name   = "securitest-scanner"
        image_tag    = "latest"
      }
    }
  }
}

# Recurso para alojar o Frontend
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-securitest-frontend-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    application_stack {
      node_version = "18-lts"
    }
    always_on = false
    app_command_line = "npx serve -s /home/site/wwwroot -l 8080"
  }

  app_settings = {
  "WEBSITES_PORT"                = "8080"
  "WEBSITE_NODE_DEFAULT_VERSION" = "~18"
  "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
  "WEBSITE_RUN_FROM_PACKAGE"       = "0"
}
}

# Output para saberes o URL do teu site no fim
output "frontend_url" {
  value = azurerm_linux_web_app.frontend.default_hostname
}