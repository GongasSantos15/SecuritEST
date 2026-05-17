# =========================================================
# RESOURCE GROUP
# Contentor principal para todos os recursos do SecuritEST
# =========================================================
resource "azurerm_resource_group" "rg" {
  name     = var.securitest
  location = var.switzerlandNorth
}

# =========================================================
# STORAGE ACCOUNT
# Guarda logs e suporta o funcionamento da Azure Function
# =========================================================
resource "azurerm_storage_account" "storage" {
  name                     = "stsecuritest${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "reports" {
  name                  = "scan-reports"
  storage_account_id = azurerm_storage_account.storage.id
  container_access_type = "private"
}

resource "azurerm_container_registry" "acr" {
  name                = "securitestregistry${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

resource "time_sleep" "wait_storage" {
  depends_on = [azurerm_storage_account.storage]
  create_duration = "30s"
}

resource "azurerm_storage_account" "function_storage" {
  depends_on = [time_sleep.wait_storage]
  name                     = "securitestfunc${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "function_code" {
  name                  = "function-code"
  storage_account_id    = azurerm_storage_account.function_storage.id
  container_access_type = "private"
}

resource "azurerm_storage_blob" "function_zip" {
  name                   = "function.zip"
  storage_account_name   = azurerm_storage_account.function_storage.name
  storage_container_name = azurerm_storage_container.function_code.name
  type                   = "Block"
  source                 = "function.zip"
}

data "azurerm_storage_account_blob_container_sas" "function_sas" {
  connection_string = azurerm_storage_account.function_storage.primary_connection_string
  container_name    = azurerm_storage_container.function_code.name

  start  = "2024-01-01"
  expiry = "2030-01-01"

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
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"                  # Uso da SQL API (Core) do CosmosDB, API moderna que permite fazer consultas sobre JSON

  consistency_policy {
    consistency_level = "Session"                           # Opção p/ aplicações web. Se o utilizador gravar um resultado e ler logo a seguir, verá os dados mais recentes.
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0                                   # Define esta região como a principal.
  }
}

resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "securitest"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

resource "azurerm_cosmosdb_sql_container" "container" {
  name                = "scans"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name

  partition_key_paths = ["/scan_id"]
  throughput          = 400
}

# =========================================================
# SUFFIX
# Gerar um sufixo aleatório
# =========================================================
resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

# =========================================================
# SERVICE PLAN
# Plano para alojar a Function e a Web App
# =========================================================
resource "azurerm_service_plan" "plan" {
  name                = "plan-securitest"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}

# =========================================================
# SCANNER
# Código do Scanner
# =========================================================

resource "azurerm_container_group" "scanner" {
  name                = "securitest-container"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"

  ip_address_type = "Public"
  dns_name_label  = "securitest-${random_string.suffix.result}"

  container {
    name   = "scanner"
    image  = "${azurerm_container_registry.acr.login_server}/securitest:v1"
    cpu    = 1
    memory = 1.5

    ports {
      port     = 80
      protocol = "TCP"
    }

    secure_environment_variables = {
      COSMOS_ENDPOINT           = azurerm_cosmosdb_account.cosmos.endpoint
      COSMOS_KEY                = azurerm_cosmosdb_account.cosmos.primary_key
      COSMOS_DATABASE           = azurerm_cosmosdb_sql_database.db.name
      COSMOS_CONTAINER          = azurerm_cosmosdb_sql_container.container.name
      BLOB_CONNECTION_STRING    = azurerm_storage_account.storage.primary_connection_string
      BLOB_CONTAINER            = azurerm_storage_container.reports.name
    }
  }

  image_registry_credential {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }
}

# =========================================================
# AZURE FUNCTION APP
# Corre o scanner em Docker
# Hardening mínimo:
# - HTTPS obrigatório
# - TLS 1.2
# =========================================================
resource "azurerm_linux_function_app" "function" {
  name                       = "func-scanner-${random_string.suffix.result}"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.plan.id

  https_only = true                                                                 # Garante que a API da função só aceita HTTPS

  site_config {
    minimum_tls_version = "1.2"                                                     # Padrão de encriptação moderno, ao rejeitar ligações de browsers ou ferramentas antigas

    # Função vai correr dentro de um dock container
    application_stack {
      docker {
        registry_url = "https://index.docker.io"                                    # Imagem do Docker Hub
        image_name   = "securitest-scanner"
        image_tag    = "latest"
      }
    }
  }
  app_settings = {
    WEBSITE_RUN_FROM_PACKAGE = "${azurerm_storage_blob.function_zip.url}${data.azurerm_storage_account_blob_container_sas.function_sas.sas}"
    SCANNER_URL              = "http://${azurerm_container_group.scanner.fqdn}"
  }
}

# =========================================================
# FRONTEND WEB APP
# Hardening mínimo:
# - HTTPS obrigatório
# - TLS 1.2
# =========================================================
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-securitest-frontend-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.plan.id

  https_only = true                                                 # Bloqueia acessos via HTTP normal. Redirecionado para HTTPS

  site_config { 
    minimum_tls_version = "1.2"                                     # Protocolo de encriptação modernos.

    application_stack {
      node_version = "18-lts"                                       # Versão do ambiente Node.js
    } 

    always_on        = false                                        # Por usar o nível gratuito, não há muito tráfego.
    app_command_line = "npx serve -s /home/site/wwwroot -l 8080"    # Serve os ficheiros estáticos da pasta wwwroot
                                                                    # -s -> Ativa o modo Single Page Application, React controla as rotas
                                                                    # -l 8080 -> Obriga o site a correr na porta 8080.
  }

  app_settings = {
    "WEBSITES_PORT"                  = "8080"                       # Porta 8080 dentro do container
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~18"                        # Versão do Node.js
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"                      # Devido ao envio da pasta dist e do npm run build, diz ao Azure para não compilar o código again
    "WEBSITE_RUN_FROM_PACKAGE"       = "0"
  }
}

# =========================================================
# REDEPLOY AUTOMÁTICO DO FRONTEND
# =========================================================
resource "null_resource" "redeploy" {
  triggers = {
    always_run = timestamp()                                        # Devolve a data e hora. Cada vez que se corre o terraform apply, este bloco é executado.
  }

  provisioner "local-exec" {
    command     = "git commit --allow-empty -m redeploy; git push"  # Cria um commit fantasma para registar uma atividade no histórico.
    interpreter = ["PowerShell", "-Command"]                        # Por ser no Windows, usar o PowerShell para processar estes comandos.
  }

  depends_on = [azurerm_linux_web_app.frontend]                     # Este commit só pode ocorrer depois de o Azure ter terminado de configurar a Web App.
}

# =========================================================
# AZURE FRONT DOOR PROFILE
# Serviço global que fica à frente da Web App
# SKU Standard já suporta esta arquitetura moderna
# =========================================================
resource "azurerm_cdn_frontdoor_profile" "fd_profile" {
  name                = "fd-securitest-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "Standard_AzureFrontDoor"
}

# =========================================================
# FRONT DOOR ENDPOINT
# Hostname público do Front Door
# Este será o URL preferencial para demonstração
# =========================================================
resource "azurerm_cdn_frontdoor_endpoint" "fd_endpoint" {
  name                     = "fd-endpoint-${random_string.suffix.result}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.fd_profile.id
}

# =========================================================
# ORIGIN GROUP
# Grupo lógico de backends
# =========================================================
resource "azurerm_cdn_frontdoor_origin_group" "fd_origin_group" {
  name                     = "fd-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.fd_profile.id

  session_affinity_enabled = false                                        # O utilizador pode ser enviado para qualquer instância do servidor sem problemas.
                                                                          # Melhora a distribuição de carga.

  load_balancing {
    sample_size                 = 4                                       # O Azure olha para as últimas 4 tentativas de ligação.
    successful_samples_required = 3                                       # Se 3/4 forem bem sucedidas, o Azure considera que o servidor está saudável.
  }

  health_probe {
    interval_in_seconds = 100                                             # Front Door envia sinais constantes a cada 100 segundos
    path                = "/"                                             # Tenta aceder à raiz do site
    protocol            = "Https"                                         # Verificação é feita de forma segura
    request_type        = "GET"                                           # Faz um pedido GET de leitura
  }
}

# =========================================================
# ORIGIN
# A Web App é o backend real do Front Door
# =========================================================
resource "azurerm_cdn_frontdoor_origin" "fd_origin" {
  name                          = "frontend-webapp-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.fd_origin_group.id

  enabled                        = true
  host_name                      = azurerm_linux_web_app.frontend.default_hostname
  http_port                      = 80                                                 # Porta padrão HTTP para comunicação entre o Front Door e a Web App
  https_port                     = 443                                                # Porta padrão HTTPS para comunicação entre o Front Door e a Web App
  origin_host_header             = azurerm_linux_web_app.frontend.default_hostname
  priority                       = 1                                                  # Prioridade máxima
  weight                         = 1000                                               # Peso máximo
  certificate_name_check_enabled = true
}

# =========================================================
# ROUTE
# Encaminha o tráfego do Front Door para a Web App
# =========================================================
resource "azurerm_cdn_frontdoor_route" "fd_route" {
  name                          = "frontend-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.fd_endpoint.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.fd_origin_group.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.fd_origin.id]

  enabled                = true
  forwarding_protocol    = "MatchRequest"                                                 # Usar o mesmo protocolo que o utilizador para comunicação entre Door e App
  https_redirect_enabled = true                                                           # O utilizador acede via HTTP e redireciona-o para a versão HTTPS (segura)
  patterns_to_match      = ["/*"]                                                         # Regra que diz "apanha tudo", qualquer caminho escrito é processado e enviado
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true                                                           # Ativa a rota para o domínio padrão fornecido pelo Azure
}

# =========================================================
# OUTPUTS
# frontend_url   -> URL direta da Web App
# frontdoor_url  -> URL protegida pelo Front Door + WAF
# =========================================================
output "frontend_url" {
  value = azurerm_linux_web_app.frontend.default_hostname
}

output "frontdoor_url" {
  value = azurerm_cdn_frontdoor_endpoint.fd_endpoint.host_name
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