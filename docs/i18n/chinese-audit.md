# Rà soát chuỗi tiếng Trung trong mã nguồn

Đây là quét tĩnh; không tự ý thay đổi chuỗi giao thức, kiểm tra lỗi, URL và dữ liệu thử nghiệm.

Tệp mã nguồn: 1302
Tệp còn fallback đủ điều kiện chuyển tự động: 0
Fallback còn có thể chuyển tự động tại lần quét này: 0
Lời dự phòng cần kiểm tra thủ công: 224
Vị trí chuỗi chữ Hán còn lại: 11723
Dòng chú thích Rust có chữ Hán: 4154

Lịch sử: một lượt xử lý trước đó đã Việt hóa 6.102 fallback trong 144 tệp.

## Phân loại
literal: 888
jsx: 12
rust-review: 10823

## Fallback chưa chuyển
src/components/CodexAccountPoolHealthModal.tsx - common.unknown
src/components/CodexAccountPoolHealthModal.tsx - common.unknown
src/components/CodexAccountPoolHealthModal.tsx - common.unknown
src/components/MfaVaultManager.tsx - mfaVault.migrationBatchProgress
src/components/PlatformLayoutModal.tsx - platformLayout.customIconStorageFailed
src/components/TagEditModal.tsx - accounts.tagModal.renamingGlobal
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.statusAll
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.statusCompleted
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.statusInProgress
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.searchPlaceholder
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.statusFilter
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.noMatching
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.noSessions
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.labels.session
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.labels.user
src/components/codebuddy/CodebuddySessionManager.tsx - codebuddy.sessionManager.labels.dir
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx - workbuddy.webview.open
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx - workbuddy.webview.open
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx - common.deleteTagWarning
src/components/codebuddy-suite/CodebuddySuiteCheckinModal.tsx - workbuddy.checkin.button.loading
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.error.invalidTime
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.error.invalidTime
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.error.endBeforeStart
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.checkin.success
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.checkin.alreadyChecked
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.checkin.failed
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - trae.autoCheckin.title
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.settings
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.history
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.enable
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.timeRange
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.manualTest
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.testNow
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.logCount
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.confirmClear
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.noLogs
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx - workbuddy.autoCheckin.duration
src/components/codebuddy-suite/TraeCheckinModal.tsx - trae.checkin.modalTitle
src/components/codebuddy-suite/TraeCheckinModal.tsx - workbuddy.checkin.errors
src/components/codebuddy-suite/TraeCheckinModal.tsx - workbuddy.checkin.totalCredits
src/components/codebuddy-suite/TraeCheckinModal.tsx - workbuddy.checkin.error
src/components/codebuddy-suite/TraeCheckinModal.tsx - workbuddy.checkin.checkin
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.saveFailed
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.manualTestPartialFailure
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.manualTestAlreadyRunning
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.manualTestFailed
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.clearLogsFailed
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.tabSettings
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.tabHistory
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - common.to
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.historyRangeHint
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.manualTest
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.manualTest
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.clearLogs
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.clearLogs
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.historyLoading
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.historyLoadFailed
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx - workbuddy.checkin.noHistory
src/components/codex/CodexCliLaunchDialog.tsx - codex.cli.selectWorkingDir
src/components/codex/CodexCliLaunchDialog.tsx - codex.cli.selectWorkingDir
src/components/codex/CodexExperimentalModelEditor.tsx - common.search
src/components/codex/CodexExperimentalModelEditor.tsx - codex.experimentalModelCatalog.models.addCustomBlank
src/components/codex/CodexExperimentalModelEditor.tsx - codex.experimentalModelCatalog.models.addAll
src/components/codex/CodexExperimentalModelEditor.tsx - common.clickToRemove
src/components/codex/CodexExperimentalModelEditor.tsx - common.clickToAdd
src/components/codex/CodexExperimentalModelEditor.tsx - common.added
src/components/codex/CodexExperimentalModelEditor.tsx - codex.experimentalModelCatalog.models.source
src/components/codex/CodexExperimentalModelEditor.tsx - codex.experimentalModelCatalog.models.source
src/components/codex/CodexExperimentalModelEditor.tsx - instances.form.modelRouting.subscriptionSource
src/components/codex/CodexExperimentalModelEditor.tsx - codex.experimentalModelCatalog.models.source
src/components/codex/CodexExperimentalModelEditor.tsx - instances.form.modelRouting.subscriptionSource
src/components/codex/CodexExperimentalModelEditor.tsx - instances.form.modelRouting.subscriptionSource
src/components/codex/CodexLaunchPreviewModal.tsx - instances.form.modelRouting.oauthRequired
src/components/codex/CodexLaunchPreviewModal.tsx - instances.form.modelRouting.routeRequired
src/components/codex/CodexLaunchPreviewModal.tsx - instances.form.modelRouting.invalidNamespace
src/components/codex/CodexLaunchPreviewModal.tsx - instances.form.modelRouting.providerRequired
src/components/codex/CodexLaunchPreviewModal.tsx - instances.form.codexQuickConfig.saveFailed
src/components/codex/CodexModelContextWindowTable.tsx - codex.api.modelCatalog.contextCustom
src/components/codex/CodexModelContextWindowTable.tsx - codex.api.modelCatalog.modelColumn
src/components/codex/CodexModelContextWindowTable.tsx - codex.api.modelCatalog.contextWindow
src/components/codex/CodexModelContextWindowTable.tsx - codex.api.modelCatalog.contextWindowOptional
src/components/codex/CodexModelContextWindowTable.tsx - codex.api.modelCatalog.contextWindow
src/components/codex/CodexModelContextWindowTable.tsx - codex.api.modelCatalog.contextWindow
src/components/codex/CodexModelProviderManager.tsx - common.unknown
src/components/codex/CodexModelProviderManager.tsx - codex.api.modelCatalog.contextWindowInvalid
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.validation.apiKeyRequired
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.updateApiKeySuccess
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.validation.apiKeyExists
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.validation.apiKeyRequired
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.updateApiKeyFailed
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.batchDeleteConfirm
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.batchDeleteSuccess
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.usage.fields.isAvailable
src/components/codex/CodexModelProviderManager.tsx - codex.modelProviders.usage.fields.currency
src/components/codex/CodexModelProviderManagerView.tsx - common.search
src/components/codex/CodexModelProviderManagerView.tsx - common.shared.sort.name
src/components/codex/CodexModelProviderManagerView.tsx - codex.modelProviders.noMatchTitle
src/components/codex/CodexModelProviderManagerView.tsx - codex.modelProviders.apiKeyCopied
src/components/codex/CodexModelProviderManagerView.tsx - common.search
src/components/codex/CodexModelProviderManagerView.tsx - common.rename
src/components/codex/CodexModelProviderManagerView.tsx - common.search
src/components/codex/CodexModelProviderManagerView.tsx - common.search
src/components/codex/CodexModelProviderManagerView.tsx - common.yes
src/components/codex/CodexModelProviderManagerView.tsx - common.no
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.subscriptionSource
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.missingSource
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.disabledSource
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.unavailableSource
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.modelUnavailable
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.fetchCredentialsRequired
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.fetchEmpty
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.fetchFailed
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.noProviderAccounts
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.provider
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.provider
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.namespacePlaceholder
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.deleteRoute
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.loadedModels
src/components/codex/CodexModelRoutingFields.tsx - common.filter
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.fetchModels
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.addModels
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.noCatalog
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToDeselect
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToSelect
src/components/codex/CodexModelRoutingFields.tsx - common.remove
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.addRoute
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.modalTitle
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.modalDescription
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToDisable
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToEnable
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.channelsSummary
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.manageChannels
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.noChannels
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.addRoute
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToEdit
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.unnamedAccount
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToDisable
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.clickToEnable
src/components/codex/CodexModelRoutingFields.tsx - codex.launchPreview.modelRoutingEnabled
src/components/codex/CodexModelRoutingFields.tsx - codex.launchPreview.modelRoutingDisabled
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.routesCount
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.modelsCount
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.manageAction
src/components/codex/CodexModelRoutingFields.tsx - instances.form.modelRouting.enableAction
src/components/codex/CodexSshServersPanel.tsx - common.saved
src/components/codex/CodexSshServersPanel.tsx - common.edit
src/components/codex/CodexSshServersPanel.tsx - common.edit
src/components/codex/CodexSshSyncModal.tsx - common.done
src/components/codex/CodexWakeupContent.tsx - common.edit
src/hooks/useProviderAccountsPage.ts - workbuddy.webview.opened

## Ví dụ cần đánh giá thủ công
src/App.tsx:935 [literal] [ExternalImport][App] 读取当前应用版本失败，已终止外部导入
src/App.tsx:969 [literal] [ExternalImport][App] 当前版本不支持外部导入方式，已终止导入
src/App.tsx:980 [literal] [ExternalImport][App] 收到原始 payload:
src/App.tsx:983 [literal] [ExternalImport][App] payload 归一化失败，已忽略
src/App.tsx:997 [literal] [ExternalImport][App] 重复外部导入 payload 已忽略
src/App.tsx:1001 [literal] [ExternalImport][App] payload 归一化成功:
src/App.tsx:1013 [literal] [ExternalImport][App] 分发前端外部导入事件
src/App.tsx:1361 [literal] 远端更新策略已自动打开更新弹框: version=
src/App.tsx:1383 [literal] 应用重启前已关闭 Codex API 服务监听: enabled=
src/App.tsx:1389 [literal] 应用重启前关闭 Codex API 服务监听失败，将继续重启: error=
src/App.tsx:1404 [literal] 应用重启失败后恢复 Codex API 服务状态失败: error=
src/App.tsx:1479 [literal] 加载更新运行时信息失败: error=
src/App.tsx:1582 [literal] 交互式更新检查失败，准备重试(
src/App.tsx:1631 [literal] 交互式更新检查失败，关闭弹窗: error=
src/App.tsx:1665 [literal] 用户点击立即重启应用更新: version=
src/App.tsx:1709 [literal] 用户手动应用更新失败: stage=
src/App.tsx:1739 [literal] Linux 托管更新开始执行: version=
src/App.tsx:1768 [literal] Linux 托管更新安装完成但重启失败: version=
src/App.tsx:1781 [literal] Linux 托管更新失败: version=
src/App.tsx:1817 [literal] 统一更新任务开始下载: version=
src/App.tsx:1846 [literal] 缓存统一更新说明失败: version=
src/App.tsx:1918 [literal] 统一更新下载失败，准备重试(
src/App.tsx:1953 [literal] 统一更新下载完成，等待重启安装: version=
src/App.tsx:1956 [literal] 统一更新下载已取消: version=
src/App.tsx:1964 [literal] 统一更新下载失败: error=
src/App.tsx:1991 [literal] 当前下载任务不支持取消（非统一更新任务）
src/App.tsx:2024 [literal] 用户取消统一更新下载: version=
src/App.tsx:2042 [literal] 更新重启失败: error=
src/App.tsx:2061 [literal] 更新下载失败: error=
src/App.tsx:2115 [literal] 用户跳过更新版本: version=
src/App.tsx:2146 [literal] 跳过更新版本失败: error=
src/App.tsx:2274 [literal] 唤醒任务状态同步失败:
src/App.tsx:2295 [literal] [AutoBackup] 定期备份执行失败:
src/App.tsx:2322 [literal] [WorkbuddyAutoCheckin] 迁移旧版自动签到配置失败:
src/App.tsx:2338 [literal] 启动
src/App.tsx:2338 [literal] 每小时轮询
src/App.tsx:2338 [literal] 更新检查跳过：上一次尚未结束
src/App.tsx:2342 [literal] 启动
src/App.tsx:2342 [literal] 每小时轮询
src/App.tsx:2347 [literal] 触发自动更新检查流程
src/App.tsx:2369 [literal] 读取更新设置: auto_install=
src/App.tsx:2369 [literal] ；启动始终执行更新检查
src/App.tsx:2372 [literal] 启动检查立即执行
src/App.tsx:2377 [literal] 后台自动更新已开启，尝试静默检查并下载
src/App.tsx:2394 [literal] 静默更新检查失败，准备重试(
src/App.tsx:2405 [literal] 检测到新版本但已跳过: version=
src/App.tsx:2429 [literal] 检测到新版本，开始静默下载: version=
src/App.tsx:2453 [literal] 缓存待安装更新说明失败: version=
src/App.tsx:2533 [literal] 静默更新下载失败，准备重试(
src/App.tsx:2558 [literal] 静默更新下载完成，等待用户重启应用生效: version=
src/App.tsx:2572 [literal] 静默更新已在左上角显示待重启入口: version=
src/App.tsx:2577 [literal] 更新检查完成：当前已是最新版本
src/App.tsx:2599 [literal] 静默更新失败，保留左上角更新入口: error=
src/App.tsx:2625 [literal] 静默更新失败后已在左上角显示更新入口: version=
src/App.tsx:2633 [literal] Linux 包管理安装(
src/App.tsx:2633 [literal] )跳过静默下载，改为左上角一键安装入口
src/App.tsx:2636 [literal] 后台自动更新关闭，先执行无弹窗检查，仅在发现新版本时显示左上角入口
src/App.tsx:2652 [literal] 后台手动更新检查失败，准备重试(
src/App.tsx:2664 [literal] 检测到新版本但已跳过: version=
src/App.tsx:2690 [literal] 检测到新版本，已按远端策略打开更新弹框: version=
src/App.tsx:2691 [literal] 检测到新版本，已在左上角显示更新入口: version=
src/App.tsx:2696 [literal] 更新检查完成：当前已是最新版本
src/App.tsx:2716 [literal] 后台手动更新检查失败，跳过弹窗: error=
src/App.tsx:2726 [literal] 已更新 last_check_time，结束本次更新检查流程
src/App.tsx:2737 [literal] 更新检查流程异常中断: error=
src/App.tsx:3015 [literal] 更新唤醒任务时间失败:
src/App.tsx:3338 [literal] 选择应用路径失败:
src/App.tsx:3452 [literal] 设置应用路径失败:
src/App.tsx:3499 [literal] 扫描 Claude Desktop 启动目标失败:
src/App.tsx:3516 [literal] 自动探测应用路径失败:
src/App.tsx:3585 [literal] [ExternalImport][App] 收到 Tauri 事件 external:provider-import
src/App.tsx:3604 [literal] [ExternalImport][App] 启动时无待处理导入 payload
src/App.tsx:3607 [literal] [ExternalImport][App] 启动时读取到待处理导入 payload
src/App.tsx:3611 [literal] [ExternalImport] 读取待处理导入请求失败:
src/components/AnnouncementCenter.tsx:307 [literal] [Announcement] 未支持的命令动作:
src/components/CodexAccountPoolHealthModal.tsx:115 [literal] 未知模型
src/components/CodexAccountPoolHealthModal.tsx:625 [literal] 未知模型
src/components/CodexAccountPoolHealthModal.tsx:677 [literal] 未知模型
src/components/MfaVaultManager.tsx:671 [literal] Google Authenticator 迁移批次：已识别 {{scanned}}/{{total}} 张二维码。
src/components/PlatformLayoutModal.tsx:1178 [literal] 自定义图标无法保存，本地存储空间可能已满。删除不再使用的自定义图标后重试。
src/components/SettingsWebdavSyncSection.tsx:50 [literal]  Lưu ý: Không tìm thấy thư mục cha. Một số dịch vụ WebDAV không cho ph
src/components/TagEditModal.tsx:172 [literal] 标签长度不能超过 
src/components/TagEditModal.tsx:172 [literal]  个字符
src/components/TagEditModal.tsx:372 [literal] 正在全局重命名已存在标签所有账号记录：
src/components/codebuddy/CodebuddySessionManager.tsx:88 [literal] 全部状态
src/components/codebuddy/CodebuddySessionManager.tsx:92 [literal] 已完成
src/components/codebuddy/CodebuddySessionManager.tsx:96 [literal] 进行中
src/components/codebuddy/CodebuddySessionManager.tsx:184 [literal] 搜索标题或工作目录...
src/components/codebuddy/CodebuddySessionManager.tsx:204 [literal] 会话状态
src/components/codebuddy/CodebuddySessionManager.tsx:233 [literal] 没有匹配的会话
src/components/codebuddy/CodebuddySessionManager.tsx:234 [literal] 暂无会话记录
src/components/codebuddy/CodebuddySessionManager.tsx:279 [literal] 会话
src/components/codebuddy/CodebuddySessionManager.tsx:283 [literal] 用户
src/components/codebuddy/CodebuddySessionManager.tsx:287 [literal] 目录
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:542 [literal] 正常
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:545 [literal] 异常
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:549 [literal] 查看详情
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:553 [literal] 用量状态详情
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:583 [literal] 配额查询失败
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:587 [literal] 暂无可用配额数据
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:620 [literal] 用量状态
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:634 [literal] 配额查询
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:784 [literal] 打开网页会话
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:891 [literal] 打开网页会话
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1556 [literal] 打开授权窗口
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1728 [literal] 粘贴 Token 或 JSON...
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1739 [literal] 隐藏
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1739 [literal] 显示
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1743 [literal] 隐藏
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1743 [literal] 显示
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1762 [literal] 粘贴 Token 或 JSON...
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1795 [literal] 粘贴官方 auth.json，或本应用导出的完整账号 JSON（含凭据，可再导入恢复）。
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1806 [literal] 粘贴账号 JSON...
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1823 [literal] 导入 JSON
src/components/codebuddy-suite/CodebuddySuiteAccountsSharedView.tsx:1965 [literal] 确定要从所有账号中移除标签 "{{tag}}" 吗？
src/components/codebuddy-suite/CodebuddySuiteCheckinModal.tsx:127 [literal] [WorkbuddyAutoCheckin] 监听后端签到配置事件失败:
src/components/codebuddy-suite/CodebuddySuiteCheckinModal.tsx:550 [literal] 签到中...
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:66 [literal] 开始时间格式错误
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:70 [literal] 结束时间格式错误
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:76 [literal] 结束时间不能早于开始时间
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:115 [literal] 成功
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:117 [literal] 已签到
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:119 [literal] 失败
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:133 [literal] TRAE SOLO CN 自动签到设置
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:146 [literal] 设置
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:153 [literal] 历史记录
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:171 [literal] 启用自动签到
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:180 [literal] 签到时间段
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:214 [literal] 手动测试
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:225 [literal] 立即执行
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:235 [literal] 共 {{count}} 条记录
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:241 [literal] 确定清空所有记录？
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:254 [literal] 暂无签到记录
src/components/codebuddy-suite/TraeAutoCheckinConfigModal.tsx:296 [literal] 耗时: {{ms}}ms
src/components/codebuddy-suite/TraeCheckinModal.tsx:191 [literal] TRAE SOLO CN 每日签到
src/components/codebuddy-suite/TraeCheckinModal.tsx:208 [literal] 异常
src/components/codebuddy-suite/TraeCheckinModal.tsx:260 [literal] {{credits}} 积分
src/components/codebuddy-suite/TraeCheckinModal.tsx:273 [literal] 查询失败
src/components/codebuddy-suite/TraeCheckinModal.tsx:299 [literal] 签到
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:72 [literal] [WorkbuddyAutoCheckin] 读取后端签到日志失败:
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:96 [literal] [WorkbuddyAutoCheckin] 监听后端签到日志事件失败:
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:127 [literal] 自动签到设置保存失败：{{message}}
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:145 [literal] 部分账号签到失败，请查看记录；后台稍后会自动重试。
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:150 [literal] 自动签到任务正在执行，请稍后查看记录。
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:154 [literal] [WorkbuddyAutoCheckin] 手动测试自动签到异常:
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:157 [literal] 测试执行失败：{{message}}
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:172 [literal] 清空签到记录失败：{{message}}
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:186 [literal]  毫秒
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:188 [literal]  秒
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:204 [literal] 自动签到设置
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:211 [literal] 自动签到记录
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:265 [literal] 至
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:295 [literal] 仅保留近 30 天的自动签到记录（共 {{count}} 条）
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:304 [literal] 测试触发一次自动签到
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:311 [literal] 测试执行
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:317 [literal] 清空记录
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:320 [literal] 清空
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:329 [literal] 正在读取自动签到记录...
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:335 [literal] 读取自动签到记录失败：{{message}}
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:343 [literal] 暂无近 30 天的自动签到记录
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:357 [literal] 累计签到耗时
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:375 [literal] 成功 (
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:377 [literal] 部分成功 (
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:378 [literal] 未完成
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:406 [literal] 签到成功 
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:408 [literal] 今日已领
src/components/codebuddy-suite/WorkbuddyAutoCheckinConfigModal.tsx:409 [literal] 签到异常
src/components/codex/CodexCliLaunchDialog.tsx:134 [literal] 选择 Codex CLI 工作目录
src/components/codex/CodexCliLaunchDialog.tsx:138 [literal] 选择 Codex CLI 工作目录
src/components/codex/CodexExperimentalModelEditor.tsx:288 [literal] 至少保留一个模型。
src/components/codex/CodexExperimentalModelEditor.tsx:297 [literal] 模型 ID 只能包含字母、数字、点、横线、下划线、斜杠和冒号。
src/components/codex/CodexExperimentalModelEditor.tsx:303 [literal] 请输入不超过 100 个字符的展示名。
src/components/codex/CodexExperimentalModelEditor.tsx:310 [literal] 模型 ID 不能重复。
src/components/codex/CodexExperimentalModelEditor.tsx:317 [literal] 默认推理档位必须属于当前支持的档位。
src/components/codex/CodexExperimentalModelEditor.tsx:908 [literal] 搜索渠道或模型...
src/components/codex/CodexExperimentalModelEditor.tsx:922 [literal] 新建自定义空白模型
src/components/codex/CodexExperimentalModelEditor.tsx:964 [literal] + 全部 ({{count}})
src/components/codex/CodexExperimentalModelEditor.tsx:982 [literal] 点击取消选择
src/components/codex/CodexExperimentalModelEditor.tsx:982 [literal] 点击添加模型
src/components/codex/CodexExperimentalModelEditor.tsx:991 [literal] 已添加
src/components/codex/CodexExperimentalModelEditor.tsx:1024 [literal] 来源
src/components/codex/CodexExperimentalModelEditor.tsx:1130 [literal] 来源
src/components/codex/CodexExperimentalModelEditor.tsx:1142 [literal] 订阅
src/components/codex/CodexExperimentalModelEditor.tsx:1444 [literal] 来源
src/components/codex/CodexExperimentalModelEditor.tsx:1503 [literal] 订阅
src/components/codex/CodexExperimentalModelEditor.tsx:1505 [literal] 订阅
src/components/codex/CodexLaunchPreviewFocus.test.ts:236 [literal] Token 刷新失败：Token 刷新请求失败: error sending request for url (https://auth.o
src/components/codex/CodexLaunchPreviewFocus.test.ts:244 [literal] Codex 登录授权已被服务端撤销，原始错误: error_code=refresh_token_invalidated
src/components/codex/CodexLaunchPreviewFocus.test.ts:247 [literal] Codex 登录授权无效，原始错误: status=401 Unauthorized
src/components/codex/CodexLaunchPreviewModal.tsx:716 [literal] 混合模型路由需要绑定一个直接登录的 OAuth 订阅账号。
src/components/codex/CodexLaunchPreviewModal.tsx:725 [literal] 请至少添加一个 API 模型路由。
src/components/codex/CodexLaunchPreviewModal.tsx:742 [literal] 命名空间需为 2-32 位小写字母、数字、下划线或连字符，且不能使用保留名称。
src/components/codex/CodexLaunchPreviewModal.tsx:755 [literal] 每个模型路由都必须选择一个 API 账号。
src/components/codex/CodexLaunchPreviewModal.tsx:849 [literal] 保存 Codex 配置失败：{{error}}
src/components/codex/CodexModelContextWindowTable.tsx:57 [literal] 自定义
src/components/codex/CodexModelContextWindowTable.tsx:67 [literal] 模型
src/components/codex/CodexModelContextWindowTable.tsx:70 [literal] 上下文
src/components/codex/CodexModelContextWindowTable.tsx:72 [literal] 可选
src/components/codex/CodexModelContextWindowTable.tsx:122 [literal] 上下文
src/components/codex/CodexModelContextWindowTable.tsx:136 [literal] 上下文
src/components/codex/CodexModelProviderManager.tsx:792 [literal] 未知
src/components/codex/CodexModelProviderManager.tsx:2212 [literal] 上下文窗口必须是大于 0 的整数
src/components/codex/CodexModelProviderManager.tsx:2332 [literal] [CodexModelProviders] 额度类型探测失败
src/components/codex/CodexModelProviderManager.tsx:2466 [literal] API Key 不能为空
src/components/codex/CodexModelProviderManager.tsx:2526 [literal] API Key 已更新
src/components/codex/CodexModelProviderManager.tsx:2533 [literal] 该 API Key 已存在于当前供应商
src/components/codex/CodexModelProviderManager.tsx:2538 [literal] API Key 不能为空
src/components/codex/CodexModelProviderManager.tsx:2541 [literal] 更新 API Key 失败：{{error}}
src/components/codex/CodexModelProviderManager.tsx:2611 [literal] 确定要删除选中的 {{count}} 个供应商吗？
src/components/codex/CodexModelProviderManager.tsx:2630 [literal] 已删除 {{count}} 个供应商
src/components/codex/CodexModelProviderManager.tsx:3392 [literal] 余额可用
src/components/codex/CodexModelProviderManager.tsx:3393 [literal] 币种
src/components/codex/CodexModelProviderManagerView.tsx:229 [literal] 搜索...
src/components/codex/CodexModelProviderManagerView.tsx:274 [literal] 按名称
src/components/codex/CodexModelProviderManagerView.tsx:407 [literal] 没有匹配的供应商
src/components/codex/CodexModelProviderManagerView.tsx:548 [literal] API Key 已复制
src/components/codex/CodexModelProviderManagerView.tsx:952 [literal] 搜索...
src/components/codex/CodexModelProviderManagerView.tsx:2211 [literal] 重命名
src/components/codex/CodexModelProviderManagerView.tsx:2418 [literal] 搜索...
src/components/codex/CodexModelProviderManagerView.tsx:2476 [literal] 搜索...
src/components/codex/CodexModelProviderManagerView.tsx:2916 [literal] 是
src/components/codex/CodexModelProviderManagerView.tsx:2917 [literal] 否
src/components/codex/CodexModelRoutingFields.tsx:290 [literal] 订阅
src/components/codex/CodexModelRoutingFields.tsx:301 [literal] 路由缺失
src/components/codex/CodexModelRoutingFields.tsx:308 [literal] 路由已停用
src/components/codex/CodexModelRoutingFields.tsx:318 [literal] 账号不可用
src/components/codex/CodexModelRoutingFields.tsx:336 [literal] 模型已不在 API 目录
src/components/codex/CodexModelRoutingFields.tsx:553 [literal]  个模型
src/components/codex/CodexModelRoutingFields.tsx:554 [literal]  · 未获取列表
src/components/codex/CodexModelRoutingFields.tsx:617 [literal] 这个 API 账号缺少 Key 或 Base URL，无法获取模型列表。
src/components/codex/CodexModelRoutingFields.tsx:641 [literal] 上游没有返回模型，可以在下面手动填写。
src/components/codex/CodexModelRoutingFields.tsx:666 [literal] 获取模型列表失败：{{error}}
src/components/codex/CodexModelRoutingFields.tsx:721 [literal] 未检测到可用的 API 账号。请先在「API 账号」页面添加支持的模型服务。
src/components/codex/CodexModelRoutingFields.tsx:787 [literal] 选择 API 账号
src/components/codex/CodexModelRoutingFields.tsx:791 [literal] 选择 API 账号
src/components/codex/CodexModelRoutingFields.tsx:812 [literal] 前缀 (如 cpa)
src/components/codex/CodexModelRoutingFields.tsx:825 [literal] 删除渠道
src/components/codex/CodexModelRoutingFields.tsx:834 [literal] 已加载模型
src/components/codex/CodexModelRoutingFields.tsx:835 [literal] 已启用 / 总数
src/components/codex/CodexModelRoutingFields.tsx:852 [literal] 过滤...
src/components/codex/CodexModelRoutingFields.tsx:863 [literal] 全选该渠道所有模型
src/components/codex/CodexModelRoutingFields.tsx:872 [literal] 清空已选模型
src/components/codex/CodexModelRoutingFields.tsx:896 [literal] 获取列表
src/components/codex/CodexModelRoutingFields.tsx:906 [literal] 添加模型
src/components/codex/CodexModelRoutingFields.tsx:965 [literal] 尚未获取上游模型，点击「获取列表」或手动添加。
src/components/codex/CodexModelRoutingFields.tsx:984 [literal] 已勾选（点击取消）
src/components/codex/CodexModelRoutingFields.tsx:984 [literal] 未勾选（点击选择）
src/components/codex/CodexModelRoutingFields.tsx:999 [literal] 删除
src/components/codex/CodexModelRoutingFields.tsx:1037 [literal] 添加 API 渠道
src/components/codex/CodexModelRoutingFields.tsx:1135 [literal] 第三方 API 路由配置
src/components/codex/CodexModelRoutingFields.tsx:1139 [literal] 配置第三方 API 账号与模型前缀。未配置前缀的模型继续走当前订阅。
src/components/codex/CodexModelRoutingFields.tsx:1151 [literal] 点击关闭第三方路由
src/components/codex/CodexModelRoutingFields.tsx:1151 [literal] 点击开启第三方路由
src/components/codex/CodexModelRoutingFields.tsx:1241 [literal] 第三方 API 渠道
src/components/codex/CodexModelRoutingFields.tsx:1253 [literal] 配置渠道
src/components/codex/CodexModelRoutingFields.tsx:1259 [literal] 暂未添加第三方 API 渠道
src/components/codex/CodexModelRoutingFields.tsx:1278 [literal] 添加渠道
src/components/codex/CodexModelRoutingFields.tsx:1300 [literal] 点击配置此渠道
src/components/codex/CodexModelRoutingFields.tsx:1307 [literal] 未选择账号
src/components/codex/CodexModelRoutingFields.tsx:1398 [literal] 点击关闭第三方路由
src/components/codex/CodexModelRoutingFields.tsx:1398 [literal] 点击开启第三方路由
src/components/codex/CodexModelRoutingFields.tsx:1437 [literal] 已启用
src/components/codex/CodexModelRoutingFields.tsx:1438 [literal] 未启用
src/components/codex/CodexModelRoutingFields.tsx:1443 [literal] {{count}} 个渠道
src/components/codex/CodexModelRoutingFields.tsx:1449 [literal] {{count}} 个路由模型
src/components/codex/CodexModelRoutingFields.tsx:1471 [literal] 管理 API 渠道
src/components/codex/CodexModelRoutingFields.tsx:1472 [literal] 配置 API 渠道
src/components/codex/CodexOutputSpeed.test.ts:6 [literal] 速度
src/components/codex/CodexOutputSpeed.test.ts:21 [literal] 速度 ≈ 43 tok/s
src/components/codex/CodexOutputSpeed.test.ts:25 [literal] 速度 —
src/components/codex/CodexSessionManager.tsx:123 [literal] 时间未知
src/components/codex/CodexSessionManager.tsx:132 [literal]  分钟
src/components/codex/CodexSessionManager.tsx:136 [literal]  小时
src/components/codex/CodexSessionManager.tsx:140 [literal]  天
src/components/codex/CodexSessionManager.tsx:143 [literal]  周
src/components/codex/CodexSessionUsagePanel.tsx:63 [literal] 刚刚
src/components/codex/CodexSessionUsagePanel.tsx:67 [literal]  分钟前
src/components/codex/CodexSessionUsagePanel.tsx:71 [literal]  小时前
src/components/codex/CodexSessionUsagePanel.tsx:74 [literal]  天前
src/components/codex/CodexSpeedSelect.tsx:48 [literal] 默认速度，常规用量
src/components/codex/CodexSpeedSelect.tsx:50 [literal] 加速，用量／费用更高
src/components/codex/CodexSshServersPanel.tsx:165 [literal] 已保存
src/components/codex/CodexSshServersPanel.tsx:568 [literal] 编辑
src/components/codex/CodexSshServersPanel.tsx:569 [literal] 编辑
src/components/codex/CodexSshSyncModal.tsx:71 [literal] 完成
src/components/codex/CodexWakeupContent.tsx:2235 [literal] 取消 Codex 唤醒测试失败:
src/components/codex/CodexWakeupContent.tsx:2639 [literal] 释放 Codex 唤醒测试取消作用域失败:
src/components/codex/CodexWakeupContent.tsx:2769 [literal] 编辑
src/components/codex/pelican/pelicanUtils.test.ts:7 [literal] 请求超时
src/components/codex/pelican/pelicanUtils.test.ts:8 [literal] 响应失败或未完整结束
src/components/codex/pelican/pelicanUtils.test.ts:9 [literal] 响应过大
src/components/codex/pelican/pelicanUtils.test.ts:10 [literal] 预览过大
src/components/codex/pelican/pelicanUtils.test.ts:11 [literal] 账号不可用
src/components/codex/pelican/pelicanUtils.test.ts:12 [literal] 已取消
src/components/codex/pelican/pelicanUtils.test.ts:13 [literal] 请求失败
src/components/codex/pelican/pelicanUtils.test.ts:14 [literal] 没有 HTML
src/components/codex/pelican/pelicanUtils.test.ts:38 [literal] 响应失败或未完整结束: 
src/components/codex/pelican/pelicanUtils.test.ts:45 [literal] 响应失败或未完整结束: 
src/components/codex/pelican/pelicanUtils.test.ts:46 [literal] 请求超时: Read timed out
src/components/codex/pelican/pelicanUtils.test.ts:62 [literal] 响应失败或未完整结束: reason=content_filter

Không thay key, API, token, câu lệnh, đường dẫn và placeholder {{...}}.