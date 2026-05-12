#!/bin/bash
# 自动构建验证并提交推送

echo "=========================================="
echo "  WB Canteen 自动构建验证脚本"
echo "=========================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 记录开始时间
START_TIME=$(date +%s)

# 检查 git 状态
echo -e "\n${YELLOW}[1/5] 检查 Git 状态...${NC}"
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}没有检测到代码变更，跳过提交${NC}"
    exit 0
fi

# 显示变更文件
echo -e "\n${YELLOW}变更的文件：${NC}"
git status --short

# 添加所有变更
echo -e "\n${YELLOW}[2/5] 添加变更到暂存区...${NC}"
git add .

# 用户输入提交信息
if [ -z "$1" ]; then
    COMMIT_MSG="更新代码: $(date '+%Y-%m-%d %H:%M:%S')"
else
    COMMIT_MSG="$1"
fi

# 提交
echo -e "\n${YELLOW}[3/5] 提交代码...${NC}"
git commit -m "$COMMIT_MSG"

# 推送
echo -e "\n${YELLOW}[4/5] 推送到 GitHub...${NC}"
git push origin main

# 计算耗时
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "\n=========================================="
echo -e "${GREEN}✅ 构建验证完成！${NC}"
echo -e "提交信息: ${COMMIT_MSG}"
echo -e "耗时: ${ELAPSED} 秒"
echo "=========================================="
