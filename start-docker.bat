@echo off
chcp 65001 >nul
echo ========================================================
echo        拼豆图纸工坊 (PixelBeads Studio) Docker 启动脚本
echo ========================================================
echo.
echo 正在检查 Docker 服务状态...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到正在运行的 Docker 引擎！
    echo 请先启动 Docker Desktop，然后再运行本脚本。
    echo.
    pause
    exit /b 1
)

echo 正在通过 Docker Compose 构建并启动容器...
docker compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  部署成功！
    echo  请在浏览器中访问: http://localhost:8080
    echo ========================================================
    echo.
    start http://localhost:8080
) else (
    echo.
    echo [错误] 容器构建或启动失败，请检查 Docker 日志。
)

pause
