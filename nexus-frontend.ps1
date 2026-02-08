# nexus-trading.ps1
# Creates the complete file structure for Nexus Trading Platform

Write-Host "Creating Nexus Trading Platform file structure..." -ForegroundColor Green

# Create root directory
$rootDir = "nexus-frontend"
New-Item -ItemType Directory -Path $rootDir -Force | Out-Null
Set-Location $rootDir

# Create root files
@(
    "package.json",
    "vite.config.js",
    "tailwind.config.js",
    "tsconfig.json",
    ".env.local",
    ".env.production",
    "docker-compose.frontend.yml",
    "Dockerfile",
    ".dockerignore",
    "README.md",
    ".gitignore"
) | ForEach-Object {
    New-Item -ItemType File -Path $_ -Force | Out-Null
}

# Create public directory and files
$publicDir = "public"
New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
@(
    "index.html",
    "favicon.ico"
) | ForEach-Object {
    New-Item -ItemType File -Path "$publicDir/$_" -Force | Out-Null
}

# Create src directory structure
$srcDir = "src"
New-Item -ItemType Directory -Path $srcDir -Force | Out-Null

# Create main src files
@(
    "main.jsx",
    "App.jsx",
    "index.css"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/$_" -Force | Out-Null
}

# Core infrastructure
$coreDirs = @(
    "core/api",
    "core/ws",
    "core/storage",
    "core/constants",
    "core/utils"
)

$coreDirs | ForEach-Object {
    New-Item -ItemType Directory -Path "$srcDir/$_" -Force | Out-Null
}

# Core API files
@(
    "client.js",
    "interceptors.js",
    "errorHandler.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/core/api/$_" -Force | Out-Null
}

# Core WebSocket files
@(
    "wsManager.js",
    "wsEvents.js",
    "wsSubscriptions.js",
    "wsReconnect.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/core/ws/$_" -Force | Out-Null
}

# Core storage files
@(
    "auth.js",
    "cache.js",
    "preferences.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/core/storage/$_" -Force | Out-Null
}

# Core constants files
@(
    "api.js",
    "trading.js",
    "regex.js",
    "messages.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/core/constants/$_" -Force | Out-Null
}

# Core utils files
@(
    "formatters.js",
    "validators.js",
    "math.js",
    "helpers.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/core/utils/$_" -Force | Out-Null
}

# Features
$features = @(
    "auth/contexts",
    "auth/hooks",
    "auth/pages",
    "auth/components",
    "auth/services",
    
    "trading/contexts",
    "trading/hooks",
    "trading/pages",
    "trading/components/TradePanel",
    "trading/components/Charts",
    "trading/components/TradeHistory",
    "trading/components/BotControls",
    "trading/components/Signals",
    "trading/services",
    
    "accounts/contexts",
    "accounts/hooks",
    "accounts/pages",
    "accounts/components",
    "accounts/services",
    
    "dashboard/pages",
    "dashboard/components/StatCards",
    "dashboard/components/Charts",
    
    "admin/pages",
    "admin/components",
    "admin/services",
    
    "notifications/contexts",
    "notifications/hooks",
    "notifications/pages",
    "notifications/components",
    "notifications/services",
    
    "settings/pages",
    "settings/components",
    "settings/services",
    
    "referrals/pages",
    "referrals/components",
    "referrals/services"
)

$features | ForEach-Object {
    New-Item -ItemType Directory -Path "$srcDir/features/$_" -Force | Out-Null
}

# Create feature index files
@(
    "auth",
    "trading",
    "accounts",
    "dashboard",
    "admin",
    "notifications",
    "settings",
    "referrals"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/$_/index.js" -Force | Out-Null
}

# Create auth feature files
@(
    "contexts/AuthContext.jsx",
    "hooks/useAuth.js",
    "hooks/useOAuth.js",
    "hooks/useSession.js",
    "pages/Login.jsx",
    "pages/OAuthCallback.jsx",
    "pages/OAuthRedirect.jsx",
    "components/LoginForm.jsx",
    "components/OAuthButton.jsx",
    "components/SessionWarning.jsx",
    "services/authService.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/auth/$_" -Force | Out-Null
}

# Create trading feature files
$tradingFiles = @(
    "contexts/TradingContext.jsx",
    "contexts/BotContext.jsx",
    "hooks/useTrading.js",
    "hooks/useMarketData.js",
    "hooks/useSignals.js",
    "hooks/useRiskCalculator.js",
    "hooks/useBot.js",
    "pages/TradingDashboard.jsx",
    "pages/ManualTrading.jsx",
    "pages/AutoTrading.jsx",
    "pages/SignalsMonitor.jsx",
    "services/tradingService.js",
    "services/marketService.js",
    "services/signalService.js",
    "services/botService.js",
    
    # TradePanel components
    "components/TradePanel/MarketSelector.jsx",
    "components/TradePanel/ContractSelector.jsx",
    "components/TradePanel/StakeInput.jsx",
    "components/TradePanel/SignalDisplay.jsx",
    "components/TradePanel/RiskWarning.jsx",
    "components/TradePanel/TradeButton.jsx",
    
    # Chart components
    "components/Charts/PriceChart.jsx",
    "components/Charts/CandlestickChart.jsx",
    "components/Charts/TickChart.jsx",
    
    # TradeHistory components
    "components/TradeHistory/OpenTrades.jsx",
    "components/TradeHistory/ClosedTrades.jsx",
    "components/TradeHistory/TradeStats.jsx",
    
    # BotControls components
    "components/BotControls/BotStatus.jsx",
    "components/BotControls/StrategySelector.jsx",
    "components/BotControls/StakeSettings.jsx",
    "components/BotControls/RiskLimits.jsx",
    
    # Signals components
    "components/Signals/SignalCard.jsx",
    "components/Signals/SignalConsensus.jsx",
    "components/Signals/ConfidenceMetrics.jsx"
)

$tradingFiles | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/trading/$_" -Force | Out-Null
}

# Create accounts feature files
@(
    "contexts/AccountContext.jsx",
    "hooks/useAccounts.js",
    "hooks/useAccount.js",
    "hooks/useBalance.js",
    "pages/AccountList.jsx",
    "pages/AccountDetail.jsx",
    "pages/AccountSettings.jsx",
    "components/AccountSwitcher.jsx",
    "components/BalanceCard.jsx",
    "components/AccountStats.jsx",
    "components/AccountModal.jsx",
    "services/accountService.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/accounts/$_" -Force | Out-Null
}

# Create dashboard feature files
$dashboardFiles = @(
    "pages/UserDashboard.jsx",
    "pages/TradingDashboard.jsx",
    "pages/AdminDashboard.jsx",
    
    # StatCards
    "components/StatCards/BalanceCard.jsx",
    "components/StatCards/ProfitCard.jsx",
    "components/StatCards/WinRateCard.jsx",
    "components/StatCards/OpenTradesCard.jsx",
    
    # Charts
    "components/Charts/PnLChart.jsx",
    "components/Charts/WinLossChart.jsx",
    "components/Charts/DailyPerformance.jsx",
    
    # Other components
    "components/RecentTrades.jsx",
    "components/MarketOverview.jsx",
    "components/SystemHealth.jsx"
)

$dashboardFiles | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/dashboard/$_" -Force | Out-Null
}

# Create admin feature files
@(
    "pages/UserManagement.jsx",
    "pages/CommissionRules.jsx",
    "pages/SystemSettings.jsx",
    "pages/AuditLogs.jsx",
    "pages/Analytics.jsx",
    "components/UserTable.jsx",
    "components/UserModal.jsx",
    "components/CommissionTable.jsx",
    "components/AuditTable.jsx",
    "services/adminService.js",
    "services/auditService.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/admin/$_" -Force | Out-Null
}

# Create notifications feature files
@(
    "contexts/NotificationContext.jsx",
    "hooks/useNotifications.js",
    "hooks/useToast.js",
    "pages/NotificationCenter.jsx",
    "components/NotificationBell.jsx",
    "components/NotificationList.jsx",
    "components/NotificationToast.jsx",
    "components/Toast.jsx",
    "services/notificationService.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/notifications/$_" -Force | Out-Null
}

# Create settings feature files
@(
    "pages/ProfileSettings.jsx",
    "pages/TradingSettings.jsx",
    "pages/RiskSettings.jsx",
    "pages/BillingSettings.jsx",
    "components/ProfileForm.jsx",
    "components/TradingPreferences.jsx",
    "components/RiskLimits.jsx",
    "components/BillingInfo.jsx",
    "services/settingsService.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/settings/$_" -Force | Out-Null
}

# Create referrals feature files
@(
    "pages/ReferralDashboard.jsx",
    "pages/ReferralStats.jsx",
    "components/ReferralLink.jsx",
    "components/CommissionTable.jsx",
    "components/StatsCards.jsx",
    "services/referralService.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/features/referrals/$_" -Force | Out-Null
}

# Shared components
$sharedDirs = @(
    "shared/components/layout",
    "shared/components/ui/buttons",
    "shared/components/ui/inputs",
    "shared/components/ui/cards",
    "shared/components/ui/dialogs",
    "shared/components/ui/feedback",
    "shared/components/ui/data",
    "shared/components/ui/misc",
    "shared/components/hooks",
    "shared/styles"
)

$sharedDirs | ForEach-Object {
    New-Item -ItemType Directory -Path "$srcDir/$_" -Force | Out-Null
}

# Create shared layout files
@(
    "components/layout/AppLayout.jsx",
    "components/layout/Navbar.jsx",
    "components/layout/Sidebar.jsx",
    "components/layout/Footer.jsx",
    "components/layout/ProtectedRoute.jsx"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/shared/$_" -Force | Out-Null
}

# Create shared UI components
$uiFiles = @(
    # Buttons
    "components/ui/buttons/Button.jsx",
    "components/ui/buttons/IconButton.jsx",
    "components/ui/buttons/TradeButton.jsx",
    
    # Inputs
    "components/ui/inputs/Input.jsx",
    "components/ui/inputs/Select.jsx",
    "components/ui/inputs/Textarea.jsx",
    "components/ui/inputs/Checkbox.jsx",
    "components/ui/inputs/Radio.jsx",
    "components/ui/inputs/Slider.jsx",
    
    # Cards
    "components/ui/cards/Card.jsx",
    "components/ui/cards/CardHeader.jsx",
    "components/ui/cards/CardBody.jsx",
    
    # Dialogs
    "components/ui/dialogs/Modal.jsx",
    "components/ui/dialogs/Dialog.jsx",
    "components/ui/dialogs/Drawer.jsx",
    "components/ui/dialogs/ConfirmDialog.jsx",
    
    # Feedback
    "components/ui/feedback/Toast.jsx",
    "components/ui/feedback/Loader.jsx",
    "components/ui/feedback/Spinner.jsx",
    "components/ui/feedback/Progress.jsx",
    
    # Data
    "components/ui/data/Table.jsx",
    "components/ui/data/Pagination.jsx",
    "components/ui/data/DataGrid.jsx",
    "components/ui/data/SearchBar.jsx",
    
    # Misc
    "components/ui/misc/Badge.jsx",
    "components/ui/misc/Tooltip.jsx",
    "components/ui/misc/Tabs.jsx",
    "components/ui/misc/Tag.jsx",
    "components/ui/misc/Empty.jsx"
)

$uiFiles | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/shared/$_" -Force | Out-Null
}

# Create shared hooks
@(
    "components/hooks/useResponsive.js",
    "components/hooks/useLocalStorage.js",
    "components/hooks/useAsync.js",
    "components/hooks/usePagination.js",
    "components/hooks/useDebounce.js",
    "components/hooks/useThrottle.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/shared/$_" -Force | Out-Null
}

# Create shared styles
@(
    "styles/tailwind.css",
    "styles/animations.css",
    "styles/variables.css",
    "styles/theme.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$srcDir/shared/$_" -Force | Out-Null
}

# Create providers directory and files
$providersDir = "$srcDir/providers"
New-Item -ItemType Directory -Path $providersDir -Force | Out-Null

@(
    "RootProvider.jsx",
    "AuthProvider.jsx",
    "TradingProvider.jsx",
    "NotificationProvider.jsx",
    "WSProvider.jsx",
    "ThemeProvider.jsx",
    "QueryProvider.jsx"
) | ForEach-Object {
    New-Item -ItemType File -Path "$providersDir/$_" -Force | Out-Null
}

# Create global hooks directory and files
$hooksDir = "$srcDir/hooks"
New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null

@(
    "useWebSocket.js",
    "useApi.js",
    "useMutation.js",
    "useQuery.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$hooksDir/$_" -Force | Out-Null
}

# Create router directory and files
$routerDir = "$srcDir/router"
New-Item -ItemType Directory -Path $routerDir -Force | Out-Null

@(
    "index.js",
    "routes.jsx",
    "routeGuards.js"
) | ForEach-Object {
    New-Item -ItemType File -Path "$routerDir/$_" -Force | Out-Null
}

Write-Host "File structure created successfully!" -ForegroundColor Green
Write-Host "Location: $(Get-Location)" -ForegroundColor Yellow
Write-Host "Total files created: $(Get-ChildItem -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Cyan