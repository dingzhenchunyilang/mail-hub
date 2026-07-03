# Mail Hub 新增页面检查清单

每次新增或修改 Vue 页面时，对照以下清单自查，避免重复定义和风格不一致。

## 必须复用的公共工具函数

从 `src/utils/display.js` 导入，不要在页面内重新实现：

```js
import { formatAccountName, formatAccountFull, getAvatarChar, formatTime } from '@/utils/display';
```

| 函数 | 用途 | 使用场景 |
|------|------|----------|
| `formatAccountName(name, email)` | 格式化账号显示名（去重） | 任何显示账号名的地方 |
| `formatAccountFull(name, email)` | 带邮箱的完整显示名 | tooltip、详情页 |
| `getAvatarChar(name)` | 获取头像首字母（处理CJK/特殊字符） | 头像圆圈 |
| `formatTime(dateStr)` | 邮件列表时间（今天/昨天/年份） | 邮件列表、日程列表 |

## 必须复用的全局 CSS 类

定义在 `src/assets/main.css` 的 `@layer components` 中，直接用 class 名：

| 类名 | 用途 | 替代错误写法 |
|------|------|-------------|
| `.page-header` | 页面顶部标题栏 | `bg-paper border-b border-line-soft px-6 py-4` |
| `.page-title` | 页面标题文字 | `text-display text-ink font-serif` |
| `.spinner` | 加载旋转圈 | `w-5 h-5 border-2 border-line-soft border-t-ink rounded-full animate-spin` |
| `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost` / `.btn-sm` | 按钮 | 手写 padding + border |
| `.input` | 输入框 | 手写 border + focus 样式 |
| `.select` | 下拉选择器 | 手写 appearance + 箭头 |
| `.textarea` | 文本域 | 手写 min-h + resize |
| `.label` | 表单标签 | `text-xs font-medium uppercase` |
| `.card` | 卡片容器 | `rounded-card border border-line-soft` |
| `.badge` | 标签/徽章 | `inline-flex items-center px-2 py-0.5 rounded-card` |
| `.section-title` | 区块小标题 | `text-xs font-mono uppercase tracking-widest text-ink-faint` |
| `.divider` | 分割线 | `border-t border-line-soft` |

## 必须使用的设计系统变量

不要硬编码颜色值，使用 CSS 变量（自动适配暗色模式）：

| 变量 | 用途 | 错误写法 |
|------|------|----------|
| `var(--ink)` | 主文字色 | `#1A1A1A` |
| `var(--paper)` | 背景色 | `#FAFAF7` |
| `var(--paper-dim)` | 次背景色 | `#F0EFEA` |
| `var(--line-soft)` | 边框/分割线 | `#D9D6CC` |
| `var(--ink-faint)` | 次文字色 | `#8C8878` |
| `var(--stamp-red)` | 强调/警告色 | `#C1432E` |
| `bg-ink/20` | 模态遮罩 | `bg-black bg-opacity-30` |

## 页面模板

新建页面时使用以下骨架：

```vue
<template>
  <div class="h-full flex flex-col">
    <header class="page-header">
      <h1 class="page-title">页面标题</h1>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-xxx mx-auto">
        <!-- 内容 -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { xxxApi } from '@/api';
import { formatAccountName, getAvatarChar, formatTime } from '@/utils/display';
import { useDialog } from '@/composables/useDialog';
// ...
</script>
```

## 删除操作检查清单

所有删除操作必须有二次确认：

```js
if (!await dialog.confirm('确定删除xxx吗？')) return;
```

## 自查流程

1. 页面骨架是否用了 `.page-header` + `.page-title`？
2. 加载状态是否用了 `.spinner`？
3. 账号名显示是否用了 `formatAccountName()`？
4. 头像是否用了 `getAvatarChar()`？
5. 时间显示是否用了 `formatTime()`？
6. 颜色是否全部使用 CSS 变量（无硬编码 hex）？
7. 模态框遮罩是否用 `bg-ink/20`？
8. 删除操作是否有 `dialog.confirm`？
