# 进入 server 目录
Write-Host "进入 server 目录..."
Set-Location "server"

# 检查 pnpm 是否可用
Write-Host "检查 pnpm 是否可用..."
try {
    # 尝试运行 pnpm
    pnpm --version
    Write-Host "pnpm 已安装"
} catch {
    # 如果 pnpm 不可用，尝试使用 npm 安装
    Write-Host "pnpm 未安装，尝试使用 npm 安装..."
    npm install -g pnpm
}

# 重新生成 pnpm-lock.yaml
Write-Host "重新生成 pnpm-lock.yaml..."
pnpm install --no-frozen-lockfile

# 返回到根目录
Write-Host "返回到根目录..."
Set-Location ".."

# 添加文件到 Git
Write-Host "添加文件到 Git..."
& "D:\Program Files\Git\bin\git.exe" add .

# 提交更改
Write-Host "提交更改..."
& "D:\Program Files\Git\bin\git.exe" commit -m "Update pnpm-lock.yaml with new dependencies"

# 推送到 GitHub
Write-Host "推送到 GitHub..."
& "D:\Program Files\Git\bin\git.exe" push origin main

Write-Host "操作完成！"
Read-Host "按 Enter 键退出..."
