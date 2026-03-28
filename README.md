# 五笔86版学习工具

一个基于浏览器的五笔86版打字练习工具，覆盖从入门到进阶的完整学习路径。

![Tech Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss) ![Redux](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?logo=redux) ![License](https://img.shields.io/badge/License-MIT-green)

## 功能

### 学习路径

| 模式 | 说明 |
|------|------|
| **一级简码** | 25 个高频汉字，每键一字（GFDSA / HJKLM / TREWQ / YUIOP / NBVCX） |
| **二级简码** | 616 个常用汉字，两键出字，按第一键分 25 组练习 |
| **词组练习** | 四码出词，1380 个高频词 + 4585 个扩展词，按词频排序 |
| **文章练习** | 内置 5 篇古文/现代文，逐字跟打，实时计速（字/分） |

### 特性

- 📊 **实时反馈**：逐键染色，正确绿/错误红，shake 动画提示
- 💾 **进度持久化**：redux-persist 存入 localStorage，刷新不丢
- 🏆 **结算系统**：每轮结束显示正确率、WPM、错误字/词回顾
- 🏠 **学习首页**：进度总览 + 圆形进度环 + 智能推荐当前关卡

### 码表来源

词库来自 [KyleBing/rime-wubi86-jidian](https://github.com/KyleBing/rime-wubi86-jidian)，89,000+ 词条，涵盖：

- 单字 21,586 个（含一/二级简码）
- 词组 62,000+ 个（二字词 / 三字词 / 四字词，全部 4 码）

## 运行

### 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8（`npm i -g pnpm`）

### 开发

```bash
# 克隆仓库
git clone https://github.com/zengcyoung/wubi86-trainer.git
cd wubi86-trainer

# 下载码表（首次需要）
git clone --depth=1 https://github.com/KyleBing/rime-wubi86-jidian.git rime-source

# 安装依赖
cd app
pnpm install

# 生成 TypeScript 码表文件（首次或码表更新后运行）
pnpm build:dict

# 启动开发服务器
pnpm dev
```

浏览器访问 `http://localhost:5173`

### 生产构建

```bash
cd app
pnpm build
# 产物在 app/dist/
```

### 码表重新生成

码表由脚本从 rime-source 自动生成，无需手动编辑：

```bash
cd app
pnpm build:dict
```

生成文件：

| 文件 | 内容 |
|------|------|
| `src/data/level1.ts` | 25 个一级简码 |
| `src/data/level2.ts` | 616 个二级简码 |
| `src/data/level2Groups.ts` | 二级简码按第一键分组 |
| `src/data/phrases.ts` | 词组（tier1 高频 + tier2 扩展） |
| `src/data/dict.ts` | 完整单字码表 Map |

## 项目结构

```
wubi86-trainer/
├── rime-source/          # 原始码表（git clone 获取，不入库）
└── app/
    ├── scripts/
    │   └── build-dict.mjs    # 码表转换脚本
    └── src/
        ├── data/             # 生成的码表 + 文章数据 + 工具函数
        ├── pages/            # 页面组件
        │   ├── HomePage.tsx
        │   ├── Level1Page.tsx
        │   ├── Level2Page.tsx
        │   ├── PhrasePage.tsx
        │   ├── ArticlePage.tsx
        │   └── ResultPage.tsx
        └── store/            # Redux store + progressSlice
```

## Tech Stack

- **框架**：React 19 + TypeScript 5
- **构建**：Vite 8（rolldown）
- **样式**：Tailwind CSS 4
- **状态**：Redux Toolkit 2 + redux-persist
- **包管理**：pnpm

## License

[MIT](./LICENSE)
