# 拼豆图纸工坊 (PixelBeads Studio)

> 一款基于 Web 的现代化拼豆图纸生成器，支持将任意图片一键转换为高精度拼豆图纸，支持主流品牌色卡匹配、耗材用量统计、网格标尺与高清图纸导出。

---

## ✨ 核心特性

- 🎨 **主流品牌色卡精确匹配**：
  - **漫拼 (Mard)**：国内最主流的 60 色全套色卡。
  - **Perler**：国际经典流行 37 色色卡。
  - **Artkal**：24 色高频实用色卡。
  - **多品牌联合混拼**：支持 120+ 种颜色跨品牌匹配。
  - **色种限制**：支持限制最大使用颜色种数（如 12色、24色），减少新手备料负担。
- 📏 **丰富板型预设与自定义**：
  - 14×14 迷你板、28×28 标准大方板、50×50 大方板。
  - 56×56 (2×2 连拼)、84×84 (3×3 连拼)。
  - 自定义长宽（支持锁定原图宽高比）。
- 🔬 **高精度色彩算法与增强**：
  - 基于 **CIELAB 色彩空间** 与人眼感知色差算法 (Delta E)，色彩还原自然准确。
  - 支持 **Floyd-Steinberg 误差抖动**，平滑照片与复杂渐变过渡。
  - **智能白底/背景去除**：可一键剔除纯白/单色背景，避免浪费背景豆子。
  - 支持实时调节亮度、对比度与色彩饱和度。
- 🔍 **交互式图纸画布**：
  - **双视图模式**：拟真圆孔拼豆立体质感 / 经典像素平铺方块。
  - **网格与辅助线**：细格线 + 5格/10格加粗参考线，绝不数错格子。
  - **坐标标尺**：顶部与左侧数字标尺 (1, 5, 10...)。
  - **平移与缩放**：支持鼠标滚轮缩放、拖拽平移、一键居中复位。
  - **悬浮检测**：鼠标移至任意格子即可显示坐标、品牌、色号与颜色名。
- 📊 **色号用量统计与高亮查找**：
  - 自动汇总每种色号所需颗数与占比。
  - **选色高亮**：点击任一色号，画布仅高亮该颜色格子，找豆拼装神器！
  - 支持快速搜索色号、一键复制用料清单、导出 CSV 表格。
- 🖨️ **高分辨率图纸导出**：
  - 导出打印级高清 PNG 图纸（含网格、标尺、格子色号标注、用料图例）。
  - 支持导出 1:1 纯像素原图。

---

## 🐳 Docker 一键部署

### 方式一：使用 Docker Compose（推荐）

1. 确保已启动 Docker（Windows 用户启动 Docker Desktop）。
2. 在项目根目录下执行：
   ```bash
   docker compose up -d --build
   ```
3. 打开浏览器访问：
   ```
   http://localhost:8080
   ```

*Windows 用户也可以直接双击运行根目录下的 `start-docker.bat` 脚本一键启动。*

### 方式二：使用原生 Docker 命令

```bash
# 1. 构建镜像
docker build -t pixel-bead-studio:latest .

# 2. 运行容器
docker run -d --name pixel-bead-studio -p 8080:80 pixel-bead-studio:latest
```

运行后直接在浏览器中打开 `http://localhost:8080` 即可。

---

## 🛠️ 本地开发运行

如果需要在本地 Node.js 环境中开发或调试：

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 编译打包测试
npm run build
```
本地开发服务默认运行在 `http://localhost:5173`。

---

## 📦 项目架构

```
doudou/
├── Dockerfile              # 多阶段轻量 Docker 构建文件 (Node.js 编译 -> Nginx 托管)
├── docker-compose.yml      # Docker Compose 服务配置 (端口 8080:80)
├── nginx.conf              # Nginx 静态文件服务器配置 (含 Gzip 与缓存优化)
├── start-docker.bat        # Windows 一键启动脚本
├── start-docker.sh         # Linux / macOS 一键启动脚本
├── src/
│   ├── data/
│   │   └── palettes.ts     # 漫拼(Mard)、Perler、Artkal 色卡库与 LAB 色彩数据
│   ├── utils/
│   │   ├── quantize.ts     # CIELAB 色差计算、Floyd-Steinberg 抖动、背景剔除算法
│   │   ├── exportPattern.ts# 高清图纸与 CSV 耗材统计导出引擎
│   │   └── sampleImages.ts # 内置蘑菇/皮卡丘/爱心等示例图生成器
│   ├── components/
│   │   ├── PatternCanvas.tsx# Canvas 交互式拼豆画布 (拟真/方块/高亮/缩放)
│   │   ├── StatsPanel.tsx  # 耗材用量清单面板与色号高亮检索
│   │   └── ExportModal.tsx # 高清图纸导出弹窗
│   ├── App.tsx             # 主工作台页面
│   ├── index.css           # 基础样式与 Tailwind CSS
│   └── main.tsx            # 应用挂载入口
└── package.json
```
