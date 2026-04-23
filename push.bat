@echo off

REM 执行 Git 命令
echo 正在添加文件...
"D:\Program Files\Git\bin\git.exe" add .

echo 正在提交更改...
"D:\Program Files\Git\bin\git.exe" commit -m "Fix localStorage build errors for Vercel deployment"

echo 正在推送到 GitHub...
"D:\Program Files\Git\bin\git.exe" push origin main

echo 操作完成！
pause
