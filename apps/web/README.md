# Verbia 官网

官网使用 Next.js App Router、React、TypeScript 和 pnpm。Stitch 原始设计保存在 `design/`，实现时应继续以该目录中的长图、HTML 和设计说明为视觉基准。

## 本地开发

从仓库根目录运行：

```bash
pnpm web:dev
```

生产构建：

```bash
pnpm web:typecheck
pnpm web:build
```

静态产物输出到 `apps/web/out`，可部署到 Cloudflare Workers Static Assets。

## 浏览器商店链接

Chrome Web Store 与 Microsoft Edge Add-ons 地址统一维护在 `components/install-link.tsx`。全站“Install now / 立即安装”按钮会识别 Microsoft Edge，并跳转到 Edge Add-ons；Chrome 及其他浏览器默认跳转到 Chrome Web Store。页脚分别提供两个商店的固定入口。

## 当前占位内容

- Walkthrough 仍是与 Stitch 设计一致的视频预览，正式视频完成后再接入播放器。
- Privacy 和 Terms 已有可访问、可索引的独立路由，正式发布前需要替换为最终法律文本。
- Open Graph 分享图将在品牌宣传图确定后补充。
