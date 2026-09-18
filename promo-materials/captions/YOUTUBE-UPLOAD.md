# YouTube 字幕批量上传

`upload-to-youtube.py` 用 YouTube Data API 把 `artifacts/verbia-captions.zip` 里的
字幕逐个上传到视频，**已存在的语言会自动跳过**，中断后可续传。

YouTube Studio 网页端没有批量能力（不收 zip、不能多选），43 种语言要点 43 次；
这个脚本一条命令传完。

---

## 0. 默认上传集合：25 种语言

Verbia 的 UI 本身就支持 31 种语言（`packages/shared/src/ui-strings.ts`）。剔除
截图里已发布的 3 种（English / 简体中文 / 繁體中文），剩 28 种；再剔除 3 个
**人口最少、英语普及度最高**的北欧语言（挪威语、丹麦语、芬兰语，瑞典语保留
作为北欧代表），得到 25 种 —— 这个数量也正好卡在默认每日配额上限内。

| # | 语言 | YouTube 代码 | 文件 |
|---|---|---|---|
| 1 | 西班牙语（拉美） | `es-419` | `verbia-captions.es.srt` |
| 2 | 葡萄牙语（巴西） | `pt-BR` | `verbia-captions.pt-BR.srt` |
| 3 | 德语 | `de` | `verbia-captions.de.srt` |
| 4 | 法语 | `fr` | `verbia-captions.fr.srt` |
| 5 | 日语 | `ja` | `verbia-captions.ja.srt` |
| 6 | 韩语 | `ko` | `verbia-captions.ko.srt` |
| 7 | 意大利语 | `it` | `verbia-captions.it.srt` |
| 8 | 阿拉伯语 | `ar` | `verbia-captions.ar.srt` |
| 9 | 印尼语 | `id` | `verbia-captions.id.srt` |
| 10 | 俄语 | `ru` | `verbia-captions.ru.srt` |
| 11 | 印地语 | `hi` | `verbia-captions.hi.srt` |
| 12 | 土耳其语 | `tr` | `verbia-captions.tr.srt` |
| 13 | 越南语 | `vi` | `verbia-captions.vi.srt` |
| 14 | 泰语 | `th` | `verbia-captions.th.srt` |
| 15 | 波兰语 | `pl` | `verbia-captions.pl.srt` |
| 16 | 荷兰语 | `nl` | `verbia-captions.nl.srt` |
| 17 | 乌克兰语 | `uk` | `verbia-captions.uk.srt` |
| 18 | 马来语 | `ms` | `verbia-captions.ms.srt` |
| 19 | 菲律宾语 | `fil` | `verbia-captions.fil.srt` |
| 20 | 罗马尼亚语 | `ro` | `verbia-captions.ro.srt` |
| 21 | 匈牙利语 | `hu` | `verbia-captions.hu.srt` |
| 22 | 捷克语 | `cs` | `verbia-captions.cs.srt` |
| 23 | 希伯来语 | `iw` | `verbia-captions.he.srt` |
| 24 | 希腊语 | `el` | `verbia-captions.el.srt` |
| 25 | 瑞典语 | `sv` | `verbia-captions.sv.srt` |

列表顺序 = 上传优先级，配额中途用尽时，大市场已经在前面传完了。

想改集合：直接编辑脚本顶部的 `DEFAULT_LANGUAGES`，或用 `--lang` 临时指定。
zip 里另外还有 16 种未进默认集合 —— 保加利亚语、孟加拉语、加泰罗尼亚语、丹麦语、
爱沙尼亚语、波斯语、芬兰语、克罗地亚语、冰岛语、立陶宛语、拉脱维亚语、挪威语、
葡萄牙语（葡萄牙）、斯洛伐克语、斯洛文尼亚语、塞尔维亚语（另有已发布的简体 /
繁体中文 2 种），用 `--all` 或 `--lang xx` 可单独补传。

> 两个 YouTube 的历史代码坑：希伯来语官方用 `iw`（不是 `he`）、挪威语只有
> `no`（没有 `nb`）。脚本已做映射，并在判断「轨道是否已存在」时对 `he/iw`、
> `nb/no` 等做归一化，不会重复上传。

---

## 1. 装依赖

```bash
cd promo-materials/captions
python3 -m venv .venv
source .venv/bin/activate
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

不想用 venv 也可以直接 `pip3 install --user` 装到用户目录。

**装完先跑一次离线自检**（不联网、不用凭据）：

```bash
python3 test-offline.py
```

它会注入一个假的 YouTube service，把上传主循环完整跑一遍，同时拿 YouTube 的
discovery 文档校验**每个 API 调用的参数是不是真的存在**——像给 `captions.list`
传 `maxResults`（这个接口根本不支持分页参数）这类错误，会在这里就报出来，
不会等到跑了一半才崩。全绿会打印 `all offline checks passed`。

> 改完脚本建议先跑这个，比直接拿真配额试划算得多。

---

## 2. Google Cloud 一次性配置

> **可以复用现有的「Verbia」项目。** Supabase Google 登录用的那个项目里已经建好了
> OAuth 同意屏幕和测试用户，直接往里面加一个新 client 即可 —— 但**新建的必须是
> 「桌面应用」类型**。
>
> 登录用的那个 `Verbia` client 是 **Web application** 类型，**不能**拿来跑本脚本：
> 脚本走的是桌面应用的 loopback 回调（`http://localhost:随机端口/`），而 Web 类型
> 要求回调地址必须预先精确登记，用它会报 `redirect_uri_mismatch`。
>
> ⚠️ 不要修改现有那个 Web client（Supabase 登录在用），它的 Authorized redirect
> URIs 保持原样。新建 client 不会影响它。

1. 打开 <https://console.cloud.google.com/>，选择**已有的 Verbia 项目**
   （就是 Supabase 登录用的那个），或新建一个项目。
2. **启用 API**：搜索 `YouTube Data API v3` → 启用。
3. **配置 OAuth 同意屏幕**：User type 选「外部」→ 填写应用名/支持邮箱 →
   **测试用户里加上你自己的 Google 账号**（应用未发布时只有测试用户可以授权）。
   复用现有项目时，这一步**最容易漏**：测试用户列表是**按项目**的，而项目里
   已登记的账号未必就是你现在登录/拥有频道的那个。打开
   `OAuth consent screen` → **Audience** → **Test users** 核对一遍，
   把**频道所有者账号**加进去（漏掉就会得到 `403 access_denied`）。
4. **创建凭据**：左侧 `Clients` → `+ Create client` →
   应用类型选 **桌面应用（Desktop app）** → 命名（如 `Verbia captions uploader`）
   → 创建 → 下载 JSON。*（不要点现有的 Verbia Client ID 去改类型。）*
5. 把下载的 JSON 重命名为 **`client_secret.json`**，放到本目录
   （`promo-materials/captions/client_secret.json`）。
6. **加 YouTube 权限**：左侧 `Data Access（数据访问权限）` →
   `Add or remove scopes` → 勾选
   `https://www.googleapis.com/auth/youtube.force-ssl` → Update → Save。

> 应用类型必须是「桌面应用」。选「Web 应用」会要求填回调地址，本地脚本走不通。

> `youtube.force-ssl` 属于**敏感权限**。应用未通过验证时会先弹一个
> 「Google 未验证此应用」的警告页，点「高级」→「继续前往 …（不安全）」即可，
> 自己用没问题。

**确保授权的账号就是视频所属的频道** —— YouTube API 只能操作授权账号自己的视频。
如果该 Google 账号下有多个频道（个人 + 品牌账号），API 默认用默认频道，
视频不在默认频道时会上传失败（403）。

---

## 3. 首次授权

```bash
python3 upload-to-youtube.py --video-id <VIDEO_ID> --auth-only
```

会弹浏览器让你登录并授权，成功后 token 存到 `token.json`，之后不再需要浏览器。

`--video-id` 可以传视频 ID，也可以直接传完整链接（**记得加引号**，否则 zsh 会把
链接里的 `?` 当通配符）：

```bash
python3 upload-to-youtube.py --video-id "https://www.youtube.com/watch?v=xxxxxxxxxxx"
```

> **7 天有效期**：如果 OAuth 同意屏幕还是 Testing（测试）状态，Google 签发的
> refresh token **7 天后过期**，表现为一周后报授权失败。一次性把 25 种传完没影响；
> 拖久了就重跑一次 `--auth-only`。想让 token 长期有效，可在 Audience 页面
> 把应用 Publish（自己用，未验证警告可忽略）。
>
> 若浏览器授权时报 `redirect_uri_mismatch`，加个固定端口重试：
> `--auth-port 8765`（桌面应用类型一般不需要）。

---

## 4. 上传

```bash
# 先看一眼有哪些语言、默认传哪些
python3 upload-to-youtube.py --list

# 空跑，只打印计划，不调 API
python3 upload-to-youtube.py --video-id <ID> --dry-run

# 正式上传默认的 25 种
python3 upload-to-youtube.py --video-id <ID>
```

### 参数速查

| 参数 | 作用 |
|---|---|
| `--list` | 列出全部 43 种语言、默认集合、已发布状态，然后退出 |
| `--dry-run` | 只打印将要上传的内容，不调用 API |
| `--lang CODE` | 只传指定语言，可重复（`--lang ja --lang ko`） |
| `--all` | 用全部 43 种，而不是默认 25 |
| `--limit N` | 最多传 N 条（配合配额使用） |
| `--keep-published` | 连 en / 中文也一起传（默认排除） |
| `--overwrite` | 重新上传已存在的语言（先删除旧轨道再传，不会留下重复轨道） |
| `--draft` | 传成草稿，之后在 Studio 里人工检查再发布 |
| `--auth-only` | 只跑授权并缓存 token |
| `--auth-port N` | 固定 OAuth 回调端口（默认任意空闲端口） |
| `--srt-dir DIR` | 指定 srt 所在目录 |
| `--zip FILE` | 直接指定 zip（脚本会自己解压读取） |
| `--client-secrets FILE` / `--token FILE` | 自定义凭据 / token 路径 |

脚本默认按这个顺序找字幕源，找到即用：

1. `--srt-dir` / `--zip` 指定的路径
2. `artifacts/verbia-captions/srt/`
3. `promo-materials/captions/srt/`
4. `artifacts/verbia-captions.zip`（自动解压到临时目录）
5. `promo-materials/captions/verbia-captions.zip`

所以 zip 还在就一定能跑，不需要手动解压。

---

## 5. 配额：为什么默认是 25

`captions.insert` **每次消耗 400 配额单位**，Google Cloud 默认每日配额
**10,000 单位** → 每天最多约 **25 条**。

- 25 种语言正好一天传完。
- 传更多（`--all` 43 种）时会中途撞配额，脚本会**停下并打印剩余语言**，
  第二天照着提示重跑即可续传（已传过的会自动跳过）：

  ```
  Quota exhausted after 25 upload(s).
  Not uploaded yet — re-run with:
    --lang is --lang bg --lang bn ...
  ```

- 想一天传完或者提高上限，去 Google Cloud → 「配额」里申请
  **YouTube Data API v3 → Captions Insert** 提额（需要填表单说明用途）。

> 注意：这个 25 条/天**只限制 API**。你在 YouTube Studio 网页手动上传不受
> 任何配额限制，想一天传 43 种也能传，只是要点 43 次。

---

## 6. 常见错误

| 现象 | 原因 / 处理 |
|---|---|
| 浏览器显示 **Access blocked / Error 403: access_denied**（“Verbia has not completed the Google verification process”） | 同意屏幕还在 **Testing** 状态，而你登录用的账号不在**测试用户**名单里。到 Cloud Console 该项目 → `APIs & Services` → `OAuth consent screen` → **Audience** → **Test users → + ADD USERS**，把**正在登录的那个账号**（如 `henriz0718@gmail.com`，也就是频道所有者）加进去并 Save，等 1 分钟重试。注意：client 属于哪个项目，就要在**哪个项目**里加 —— 核对 `client_secret.json` 里的 `project_id` |
| `403 The request is not authorized` / `insufficientPermissions` | 授权账号不是视频所属频道；或缺 scope。删掉 `token.json` 重新 `--auth-only` |
| `403 youtubeSignupRequired` | 授权用的 Google 账号还没有 YouTube 频道 |
| `400 invalid language` | 语言代码不在 YouTube 支持列表里，改脚本顶部 `YOUTUBE_LANG` |
| `400 videoNotFound` | `--video-id` 传错，或视频不属于授权账号 |
| `quotaExceeded` | 当日配额用尽，第二天再跑，或申请提额 |
| `missing dependency (googleapiclient)` | 没装依赖，回第 1 步 |
| 浏览器没弹出来 | 手动打开终端里打印的 URL；或先 `--auth-only` 单独授权 |
| 上传成功但 Studio 里看不到 | 用了 `--draft`，草稿要在 Studio 里手动发布 |

上传完成后建议在 Studio 或播放页抽查几条：切到对应语言看字幕是否正常、时间轴
是否对齐、中文繁简 / 葡语 BR-PT 有没有点错。

---

## 7. 文件说明

| 文件 | 说明 |
|---|---|
| `upload-to-youtube.py` | 上传脚本（本文件所在目录） |
| `test-offline.py` | 离线自检：假 service 跑完整流程 + 用 discovery 校验 API 参数，改脚本后先跑它 |
| `client_secret.json` | Google OAuth 凭据，**不要提交到 git**（已加 .gitignore） |
| `token.json` | 授权后缓存的 token，同样不入库 |
| `../artifacts/verbia-captions.zip` | 43 种语言 srt 的交付包 |
| `../artifacts/verbia-captions/srt/` | 若手动解压过，脚本会优先用这里的文件 |
