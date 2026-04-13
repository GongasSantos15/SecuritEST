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
  name                     = "stsecuritest${var.suffix}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# =========================================================
# COSMOS DB
# Base de dados NoSQL para guardar resultados dos scans
# =========================================================
resource "azurerm_cosmosdb_account" "db" {
  name                = "cosmos-securitest-${var.suffix}"
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
# AZURE FUNCTION APP
# Corre o scanner em Docker
# Hardening mínimo:
# - HTTPS obrigatório
# - TLS 1.2
# =========================================================
resource "azurerm_linux_function_app" "scanner_func" {
  name                       = "func-scanner-${var.suffix}"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key
  service_plan_id            = azurerm_service_plan.plan.id

  https_only = true

  site_config {
    minimum_tls_version = "1.2"

    application_stack {
      docker {
        registry_url = "https://index.docker.io"
        image_name   = "securitest-scanner"
        image_tag    = "latest"
      }
    }
  }
}

# =========================================================
# FRONTEND WEB APP
# Hardening mínimo:
# - HTTPS obrigatório
# - TLS 1.2
# =========================================================
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-securitest-frontend-${var.suffix}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.plan.id

  https_only = true

  site_config {
    minimum_tls_version = "1.2"

    application_stack {
      node_version = "18-lts"
    }

    always_on        = false
    app_command_line = "npx serve -s /home/site/wwwroot -l 8080"
  }

  app_settings = {
    "WEBSITES_PORT"                  = "8080"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~18"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "WEBSITE_RUN_FROM_PACKAGE"       = "0"
  }
}

# =========================================================
# REDEPLOY AUTOMÁTICO DO FRONTEND
# =========================================================
resource "null_resource" "redeploy" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command     = "git commit --allow-empty -m redeploy; git push"
    interpreter = ["PowerShell", "-Command"]
  }

  depends_on = [azurerm_linux_web_app.frontend]
}

# =========================================================
# AZURE FRONT DOOR PROFILE
# Serviço global que fica à frente da Web App
# SKU Standard já suporta esta arquitetura moderna
# =========================================================
resource "azurerm_cdn_frontdoor_profile" "fd_profile" {
  name                = "fd-securitest-${var.suffix}"
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "Standard_AzureFrontDoor"
}

# =========================================================
# FRONT DOOR ENDPOINT
# Hostname público do Front Door
# Este será o URL preferencial para demonstração
# =========================================================
resource "azurerm_cdn_frontdoor_endpoint" "fd_endpoint" {
  name                     = "fd-endpoint-${var.suffix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.fd_profile.id
}

# =========================================================
# ORIGIN GROUP
# Grupo lógico de backends
# =========================================================
resource "azurerm_cdn_frontdoor_origin_group" "fd_origin_group" {
  name                     = "fd-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.fd_profile.id

  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    interval_in_seconds = 100
    path                = "/"
    protocol            = "Https"
    request_type        = "GET"
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
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = azurerm_linux_web_app.frontend.default_hostname
  priority                       = 1
  weight                         = 1000
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
  forwarding_protocol    = "MatchRequest"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true
}

# =========================================================
# WAF POLICY
# Firewall de aplicação web
# Mode = Prevention -> bloqueia ativamente
# Managed Rule Set -> regras geridas do Azure
# =========================================================
resource "azurerm_cdn_frontdoor_firewall_policy" "waf" {
  name                = "waf-securitest-${var.suffix}"
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "Standard_AzureFrontDoor"

  enabled = true
  mode    = "Prevention"

  managed_rule {
    type    = "DefaultRuleSet"
    version = "1.0"
  }
}

# =========================================================
# SECURITY POLICY
# Associa a WAF policy ao Front Door
# Sem este recurso, a policy existe mas não protege a route
# =========================================================
resource "azurerm_cdn_frontdoor_security_policy" "fd_security_policy" {
  name                     = "fd-security-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.fd_profile.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.waf.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.fd_endpoint.id
        }

        patterns_to_match = ["/*"]
      }
    }
  }
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