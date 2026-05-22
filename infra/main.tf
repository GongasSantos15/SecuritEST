# =========================================================
# RESOURCE GROUP
# Contentor principal para todos os recursos do SecuritEST
# =========================================================
resource "azurerm_resource_group" "rg" {
  name     = var.securitest
  location = var.switzerlandNorth
}

# =========================================================
# STORAGE ACCOUNT (BLOB)
# Guarda logs
# =========================================================
resource "azurerm_storage_account" "storage" {
  name                     = "stsecuritest${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"      # Locally Redundant Storage (Dados replicados várias vezes dentro da mesma região, se um falhar, outro assume)
}

# Espera que o Blob Service fique disponível
resource "time_sleep" "wait_storage" {
  depends_on      = [azurerm_storage_account.storage]
  create_duration = "60s"
}

# Container para guardar os relatórios dos scans
resource "azurerm_storage_container" "reports" {
  name                  = "scan-reports"
  storage_account_id    = azurerm_storage_account.storage.id
  container_access_type = "private"
}

# =========================================================
# CONTAINER REGISTRY (ACR)
# Guarda as imagens Docker do scanner
# =========================================================
resource "azurerm_container_registry" "acr" {
  name                = "securitestregistry${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

# Pequeno delay para garantir a consistência na criação do storage
resource "time_sleep" "wait_storage" {
  depends_on = [azurerm_storage_account.storage]
  create_duration = "30s"
}

# Storage dedicado às Azure Functions
resource "azurerm_storage_account" "function_storage" {
  depends_on = [time_sleep.wait_storage]
  name                     = "securitestfunc${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Espera que o Blob Service fique disponível
resource "time_sleep" "wait_function_storage" {
  depends_on      = [azurerm_storage_account.function_storage]
  create_duration = "60s"
}

# Container onde fica o código da Function
resource "azurerm_storage_container" "function_code" {
  name                  = "function-code"
  storage_account_id    = azurerm_storage_account.function_storage.id
  container_access_type = "private"
}

# Upload do ficheiro ZIP da Function
resource "azurerm_storage_blob" "function_zip" {
  name                   = "function.zip"
  storage_account_name   = azurerm_storage_account.function_storage.name
  storage_container_name = azurerm_storage_container.function_code.name
  type                   = "Block"
  source                 = "function.zip"
}

# SAS token para permitir a Function aceder ao ficheiro ZIP
data "azurerm_storage_account_blob_container_sas" "function_sas" {
  connection_string = azurerm_storage_account.function_storage.primary_connection_string
  container_name    = azurerm_storage_container.function_code.name

  # Datas de começo e fim aceder ao ficheiro ZIP
  start  = "2024-01-01"
  expiry = "2030-01-01"

  # Permissão de leitura
  permissions {
    read = true
  }
}

# =========================================================
# COSMOS DB
# Base de dados NoSQL para guardar resultados dos scans
# =========================================================
resource "azurerm_cosmosdb_account" "cosmos" {
  name                = "cosmos-securitest-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  
  # Uso da SQL API (Core) do CosmosDB, API moderna que permite fazer consultas sobre JSON
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  # Opção p/ aplicações web. Se o utilizador gravar um resultado e ler logo a seguir, verá os dados mais recentes.
  consistency_policy {
    consistency_level = "Session"
  }

  # Define esta região como a principal.
  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

# Database dentro do Cosmos DB
resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "securitest"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

# Container onde são guardados os scans
resource "azurerm_cosmosdb_sql_container" "container" {
  name                = "scans"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name

  partition_key_paths = ["/scan_id"]
  throughput          = 400
}

# =========================================================
# SUFFIX RANDOM
# Garante nomes únicos e aleatórios em recursos globais
# =========================================================
resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

# =========================================================
# SERVICE PLAN
# Base para a Function App e Web App
# =========================================================
resource "azurerm_service_plan" "plan" {
  name                = "plan-securitest"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Windows"
  sku_name            = "Y1"
}

# =========================================================
# SCANNER
# Container responsável por executar os scans
# =========================================================
resource "azurerm_container_group" "scanner" {
  name                = "securitest-container"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"

  # Endereço IP público e nome do container
  ip_address_type = "Public"
  dns_name_label  = "securitest-${random_string.suffix.result}"

  # Especificações do container
  container {
    name   = "scanner"
    image  = "${azurerm_container_registry.acr.login_server}/securitest:v1"
    cpu    = 1
    memory = 1.5

    # Acesso via TCP através da porta 80
    ports {
      port     = 80
      protocol = "TCP"
    }

    # Variáveis de ambiente seguras (ligação aos serviços Azure)
    secure_environment_variables = {
      COSMOS_ENDPOINT           = azurerm_cosmosdb_account.cosmos.endpoint
      COSMOS_KEY                = azurerm_cosmosdb_account.cosmos.primary_key
      COSMOS_DATABASE           = azurerm_cosmosdb_sql_database.db.name
      COSMOS_CONTAINER          = azurerm_cosmosdb_sql_container.container.name
      BLOB_CONNECTION_STRING    = azurerm_storage_account.storage.primary_connection_string
      BLOB_CONTAINER            = azurerm_storage_container.reports.name
    }
  }

  # Credenciais para puxar imagem do ACR
  image_registry_credential {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }
}

# =========================================================
# AZURE FUNCTION APP
# Responsável pelo scanner
# =========================================================
resource "azurerm_linux_function_app" "function" {
  name                       = "func-scanner-${random_string.suffix.result}"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.plan.id

  https_only = true

  # Configurações do Site
  site_config {
    # Versão do Node.js
    application_stack {
      node_version = "18"
    }

    # Configuração de CORS (Cross-Origin Resource Sharing)
    cors {
      allowed_origins     = ["*"]   # Qualquer site pode fazer requests para esta API.
      support_credentials = false   # Não permite cookies ou autenticação automática em request cross-origin
    }
  }

  # Variáveis de runtime da Function (Scanner, Blob, Cosmos DB, Blob)
  app_settings = {
    WEBSITE_RUN_FROM_PACKAGE = "${azurerm_storage_blob.function_zip.url}${data.azurerm_storage_account_blob_container_sas.function_sas.sas}"
    SCANNER_URL              = "http://${azurerm_container_group.scanner.fqdn}"
    COSMOS_ENDPOINT          = azurerm_cosmosdb_account.cosmos.endpoint
    COSMOS_KEY               = azurerm_cosmosdb_account.cosmos.primary_key
    COSMOS_DATABASE          = azurerm_cosmosdb_sql_database.db.name
    COSMOS_CONTAINER         = azurerm_cosmosdb_sql_container.container.name
    BLOB_CONNECTION_STRING = azurerm_storage_account.storage.primary_connection_string
    BLOB_CONTAINER         = azurerm_storage_container.reports.name
  }
}

# =========================================================
# WEB APP PLAN
# Plano para a Web App
# =========================================================
resource "azurerm_service_plan" "web_plan" {
  name                = "securitest-web-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  os_type  = "Linux"
  sku_name = "B1"
}

# =========================================================
# FRONTEND WEB APP
# Interface do utilizador (React/SPA)
# =========================================================
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-securitest-frontend-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.plan.id

  # Bloqueia acessos via HTTP normal. Redirecionado para HTTPS
  https_only = true

  # Regras para a Azure Cloud Shell
  ftp_publish_basic_authentication_enabled       = true
  webdeploy_publish_basic_authentication_enabled = true

  # Nível de segurança mínimo de comunicação da Web App
  site_config { 
    minimum_tls_version = "1.2"

    # Configuração de CORS (Cross-Origin Resource Sharing)
    cors {
      allowed_origins     = ["*"]   # Qualquer site pode fazer requests para esta API.
      support_credentials = false   # Não permite cookies ou autenticação automática em request cross-origin
    }

    # Versão do Node.js
    application_stack {
      node_version = "18"
    }

    always_on        = false                                                # Por usar o nível gratuito, não há muito tráfego.
    app_command_line = "pm2 serve /home/site/wwwroot --no-daemon --spa"     # Pega nos ficheiros do Frontend (na pasta default do Azure)
                                                                            # Serve-os (de forma estática) como um website React, 
                                                                            # No processo principal, não corre em background
                                                                            # Como uma Single-Page-Application (SPA)
  }

  # Variáveis do frontend (Ports, Versão Node.js)
  app_settings = {
    "WEBSITES_PORT"                  = "8080"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~18"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "WEBSITE_RUN_FROM_PACKAGE"       = "0"
    
    # API da Function App do Azure
    "VITE_API_URL"                   = "https://${azurerm_windows_function_app.function.default_hostname}/api/function"
  }
}

# =========================================================
# OUTPUTS
# URL necessários para funcionar tudo corretamente
# =========================================================
output "frontend_url" {
  value = azurerm_linux_web_app.frontend.default_hostname
}

output "acr_name" {
  value = azurerm_container_registry.acr.name
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "container_ip" {
  value = azurerm_container_group.scanner.ip_address
}

output "container_fqdn" {
  value = azurerm_container_group.scanner.fqdn
}

output "function_url" {
  value = "https://${azurerm_linux_function_app.function.default_hostname}/api/function"
}

output "webapp_name" {
  value = azurerm_linux_web_app.frontend.name
}

output "function_name" {
  value = azurerm_windows_function_app.function.name
}