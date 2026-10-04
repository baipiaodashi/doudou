import os
import tarfile
import paramiko

VPS_IP = '43.172.183.223'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = '@CZL20061023czl'
REMOTE_DIR = '/opt/doudou'

print("=== 1. 打包本地 dist 构建产物与最新源码 ===")
archive_path = 'D:/coco/doudou/deploy_payload.tar.gz'

with tarfile.open(archive_path, 'w:gz') as tar:
    # 增加 dist 目录
    tar.add('D:/coco/doudou/dist', arcname='dist')
    # 增加 src 目录
    tar.add('D:/coco/doudou/src', arcname='src')

print(f"打包完成: {archive_path}, 大小: {os.path.getsize(archive_path)} 字节")

print("=== 2. 连接 VPS 并上传构建产物 ===")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=15)

sftp = ssh.open_sftp()
remote_tar = f"{REMOTE_DIR}/deploy_payload.tar.gz"
sftp.put(archive_path, remote_tar)
sftp.close()
print("上传成功！")

print("=== 3. VPS 解压并重构 Web 容器 ===")
remote_commands = [
    f"cd {REMOTE_DIR} && tar -xzf deploy_payload.tar.gz",
    f"cd {REMOTE_DIR} && rm -f deploy_payload.tar.gz",
    f"cd {REMOTE_DIR} && docker compose build web",
    f"cd {REMOTE_DIR} && docker compose up -d --no-deps web",
    "sleep 2",
    "curl -I http://127.0.0.1:8080",
    "docker ps | grep pixel-bead"
]

for cmd in remote_commands:
    print(f"\n--> 执行: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print(out.strip())
    if err:
        print("STDERR:", err.strip())

ssh.close()
print("\n=== 部署全部完成！ ===")
