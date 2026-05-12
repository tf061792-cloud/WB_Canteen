# WB Canteen 自动构建验证并提交推送脚本
# 使用方法: .\auto-deploy.ps1 或双击运行

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  WB Canteen 自动构建验证脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 切换到项目根目录
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 记录开始时间
$StartTime = Get-Date

# 检查是否有变更
Write-Host "`n[1/4] 检查 Git 状态..." -ForegroundColor Yellow
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "没有检测到代码变更，跳过提交" -ForegroundColor Yellow
    exit 0
}

# 显示变更文件
Write-Host "`n变更的文件：" -ForegroundColor Yellow
git status --short

# 添加所有变更
Write-Host "`n[2/4] 添加变更到暂存区..." -ForegroundColor Yellow
git add .

# 生成提交信息
$commitMsg = "更新代码: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 提交
Write-Host "`n[3/4] 提交代码..." -ForegroundColor Yellow
git commit -m $commitMsg

# 推送
Write-Host "`n[4/4] 推送到 GitHub..." -ForegroundColor Yellow
git push origin main

# 计算耗时
$EndTime = Get-Date
$Elapsed = ($EndTime - $StartTime).TotalSeconds

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "✅ 构建验证完成！" -ForegroundColor Green
Write-Host "提交信息: $commitMsg" -ForegroundColor Green
Write-Host "耗时: $Elapsed 秒" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
