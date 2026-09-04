// Verbia UI strings. en / zh-CN must stay symmetric — every key on one side
// has a key on the other. Brand copy (slogan / UX line) has official
// bilingual versions; UI copy follows the chosen interface language
// (UserSettings.uiLanguage: "auto" follows the browser).

export type UiLang = "en" | "zh-CN";

export function resolveUiLang(pref: string | undefined, browserLocale: string | undefined): UiLang {
  if (pref === "en" || pref === "zh-CN") return pref;
  const bl = (browserLocale ?? "").toLowerCase();
  if (bl.startsWith("zh")) return "zh-CN";
  return "en";
}

type Strings = Record<string, string>;

const EN: Strings = {
  // brand
  "brand.slogan": "You mean it. Verbia says it.",
  "brand.uxLine": "Just tell me what you mean. Any language.",

  // common
  "common.autoOption": "Auto (follow browser)",

  // options page
  "settings.title": "Settings",
  "settings.desc": "Defaults for the inline reply assistant. Context and drafts are not stored.",
  "settings.backend": "Backend URL",
  "settings.backendHint": "Development builds connect to your local thin gateway. Production builds should use the Verbia backend.",
  "settings.voiceLanguage": "Voice language",
  "settings.voiceHint": "Used only when you speak your intent. Typing works in any language.",
  "settings.replyLanguage": "Reply Language",
  "settings.replyTone": "Reply Tone",
  "settings.replyLength": "Reply Length",
  "settings.showInPanel": "Show in reply panel",
  "settings.uiLanguage": "Interface language",
  "settings.uiHint": "Language for Verbia’s interface. Follows your browser until you pick one.",
  "settings.expandContext": "Expand context preview by default",
  "settings.telemetry": "Allow metadata-only diagnostics (no message text)",
  "settings.reset": "Reset settings",
  "settings.howTitle": "How it works",
  "settings.howBody": "Open a Reddit reply box and Verbia appears directly below it. The toolbar icon opens the Verbia menu — open Settings from there. On other sites, use the keyboard shortcut for Universal Mode.",
  "settings.privacyTitle": "Privacy by design",
  "settings.privacyBody": "Verbia sends data only when you click Generate and never clicks a website’s send or submit controls.",

  // popup
  "popup.lead": "Reply in any language, right where you type.",
  "popup.keys": "Focus a reply box and start typing — or press Alt+Shift+I to open Verbia.",
  "popup.os": "Ctrl+Shift+I on Mac.",
  "popup.settings": "Settings",

  // reply panel
  "panel.speak": "Speak",
  "panel.stop": "Stop",
  "panel.clear": "Clear",
  "panel.generate": "Generate",
  "panel.cancel": "Cancel",
  "panel.append": "Append to reply",
  "panel.replace": "Replace reply",
  "panel.copy": "Copy",
  "panel.insert": "Insert",
  "panel.inserted": "Inserted",
  "panel.regenerate": "Regenerate",
  "panel.removeContext": "Remove context",
  "panel.editorHasText": "Editor already has text",
  "panel.draftLabel": "Draft",
  "panel.intentPlaceholder": "Type what you want to say in your own words…",
  "panel.foot": "Verbia never sends for you.",
  "panel.collapseAria": "Collapse reply panel",
  "panel.expandAria": "Expand reply panel",
  "panel.summaryContext": "Show context",
  "panel.warningLow": "Context confidence is low",
  "panel.warningTruncated": "Context was truncated",
  "panel.replyLanguage": "Reply Language",
  "panel.replyTone": "Reply Tone",
  "panel.replyLength": "Reply Length",

  // panel.status.*
  "panel.status.listening": "Listening…",
  "panel.status.listeningPaused": "Listening paused — click to resume",
  "panel.status.noSpeech": "No speech detected",
  "panel.status.voiceFailed": "Voice recognition failed",
  "panel.status.voiceUnavailable": "Voice recognition is not available in this browser",
  "panel.status.transcriptReady": "Transcript ready",
  "panel.status.enterIntent": "Type or speak your intent first",
  "panel.status.writing": "Drafting…",
  "panel.status.cancelled": "Cancelled",
  "panel.status.draftReady": "Draft ready",
  "panel.status.draftReadyWarning": "Draft ready (with warnings)",
  "panel.status.generationFailed": "Generation failed",
  "panel.status.inserting": "Inserting…",
  "panel.status.inserted": "Inserted into the editor",
  "panel.status.insertFailed": "Insertion failed",
  "panel.status.noDraft": "No draft to insert",
  "panel.status.copyInstead": "Falling back to clipboard",
  "panel.status.copied": "Copied to clipboard",
  "panel.status.copyManual": "Auto-copy failed — please select the text and copy manually",
  "panel.status.contextRemoved": "Context removed",

  // context preview
  "context.universal": "Universal",
  "context.noText": "No page text will be sent.",
  "context.postTitle": "Post title",
  "context.post": "Post",
  "context.parentComment": "Parent comment",
  "context.targetComment": "Target comment",
  "context.selectedText": "Selected text",
  "context.rel.reply_to_post": "reply to post",
  "context.rel.reply_to_comment": "reply to comment",
  "context.rel.selected_text": "selected text",
  "context.rel.none": "no context",
  "context.rel.unknown": "unknown context",

  // options for tone / length / voice / ui language
  "opt.auto": "Auto",
  "opt.casual": "Casual",
  "opt.friendly": "Friendly",
  "opt.professional": "Professional",
  "opt.polite": "Polite",
  "opt.direct": "Direct",
  "opt.short": "Short",
  "opt.medium": "Medium",
  "opt.detailed": "Detailed",

  // content toast
  "content.toastFocusEditor": "Focus a text editor, then use the Verbia shortcut again."
};

const ZH_CN: Strings = {
  // brand
  "brand.slogan": "你的想法，Verbia 帮你表达。",
  "brand.uxLine": "告诉我你想说什么，什么语言都可以。",

  // common
  "common.autoOption": "自动（跟随浏览器）",

  // options page
  "settings.title": "设置",
  "settings.desc": "内联回复助手的默认项。不会存储上下文与草稿。",
  "settings.backend": "后端 URL",
  "settings.backendHint": "开发版本连接你的本地 thin gateway。生产环境应使用 Verbia 后端。",
  "settings.voiceLanguage": "语音语言",
  "settings.voiceHint": "仅在口述意图时使用。打字输入可使用任何语言。",
  "settings.replyLanguage": "回复语言",
  "settings.replyTone": "回复语气",
  "settings.replyLength": "回复长度",
  "settings.showInPanel": "在回复面板显示",
  "settings.uiLanguage": "界面语言",
  "settings.uiHint": "Verbia 界面使用的语言。跟随浏览器，直到你手动选择。",
  "settings.expandContext": "默认展开上下文预览",
  "settings.telemetry": "允许仅元数据诊断（不含消息文本）",
  "settings.reset": "重置设置",
  "settings.howTitle": "工作原理",
  "settings.howBody": "打开 Reddit 回复框，Verbia 会直接出现在下方。点击工具栏图标打开 Verbia 菜单——在那里打开 Settings。其他网页可用快捷键进入通用模式。",
  "settings.privacyTitle": "隐私设计",
  "settings.privacyBody": "Verbia 仅在你点击 Generate 时发送数据，从不点击网站的发送或提交控件。",

  // popup
  "popup.lead": "在你打字的地方，用任何语言回复。",
  "popup.keys": "聚焦回复框开始打字——或按 Alt+Shift+I 打开 Verbia。",
  "popup.os": "Mac 上为 Ctrl+Shift+I。",
  "popup.settings": "设置",

  // reply panel
  "panel.speak": "口述",
  "panel.stop": "停止",
  "panel.clear": "清空",
  "panel.generate": "生成",
  "panel.cancel": "取消",
  "panel.append": "追加到回复",
  "panel.replace": "替换回复",
  "panel.copy": "复制",
  "panel.insert": "插入",
  "panel.inserted": "已插入",
  "panel.regenerate": "重新生成",
  "panel.removeContext": "移除上下文",
  "panel.editorHasText": "编辑器已有内容",
  "panel.draftLabel": "草稿",
  "panel.intentPlaceholder": "用你自己的话写下想说的……",
  "panel.foot": "Verbia 从不替你发送。",
  "panel.collapseAria": "折叠回复面板",
  "panel.expandAria": "展开回复面板",
  "panel.summaryContext": "查看上下文",
  "panel.warningLow": "上下文置信度较低",
  "panel.warningTruncated": "上下文已被截断",
  "panel.replyLanguage": "回复语言",
  "panel.replyTone": "回复语气",
  "panel.replyLength": "回复长度",

  // panel.status.*
  "panel.status.listening": "正在聆听……",
  "panel.status.listeningPaused": "聆听已暂停，点击继续",
  "panel.status.noSpeech": "没有听到语音",
  "panel.status.voiceFailed": "语音识别失败",
  "panel.status.voiceUnavailable": "当前浏览器不支持语音识别",
  "panel.status.transcriptReady": "转写完成",
  "panel.status.enterIntent": "请先输入或口述意图",
  "panel.status.writing": "正在起草……",
  "panel.status.cancelled": "已取消",
  "panel.status.draftReady": "草稿已就绪",
  "panel.status.draftReadyWarning": "草稿已就绪（存在警告）",
  "panel.status.generationFailed": "生成失败",
  "panel.status.inserting": "正在插入……",
  "panel.status.inserted": "已插入编辑器",
  "panel.status.insertFailed": "插入失败",
  "panel.status.noDraft": "暂无可插入的草稿",
  "panel.status.copyInstead": "改为复制到剪贴板",
  "panel.status.copied": "已复制到剪贴板",
  "panel.status.copyManual": "自动复制失败，请手动选择文本复制",
  "panel.status.contextRemoved": "上下文已移除",

  // context preview
  "context.universal": "通用",
  "context.noText": "不会发送任何页面文本。",
  "context.postTitle": "帖子标题",
  "context.post": "帖子",
  "context.parentComment": "上级评论",
  "context.targetComment": "目标评论",
  "context.selectedText": "所选文本",
  "context.rel.reply_to_post": "回复原帖",
  "context.rel.reply_to_comment": "回复评论",
  "context.rel.selected_text": "所选文本",
  "context.rel.none": "无上下文",
  "context.rel.unknown": "未知上下文",

  // options for tone / length / voice / ui language
  "opt.auto": "自动",
  "opt.casual": "随意",
  "opt.friendly": "友善",
  "opt.professional": "专业",
  "opt.polite": "礼貌",
  "opt.direct": "直接",
  "opt.short": "简短",
  "opt.medium": "中等",
  "opt.detailed": "详细",

  // content toast
  "content.toastFocusEditor": "请先聚焦一个文本编辑器，再按一次 Verbia 快捷键。"
};

export const UI_STRINGS: Record<UiLang, Strings> = {
  en: EN,
  "zh-CN": ZH_CN
};