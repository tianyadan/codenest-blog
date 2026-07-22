---
title: 使用 GPT + Codex 制作专属桌面宠物（Pet）完整流程
summary: "最近体验了一下 Codex 的 Pet 功能，发现可以把自己的形象做成桌面宠物，效果非常有意思。 原型图： 效果图: 整个流程并不复杂，大概分为三步： 先..."
author: evan
category: work
tags: [工作总结]
createdAt: 2026-06-04 16:15:08
updatedAt: 2026-06-04 16:15:08
readingMinutes: 5
---
# 使用 GPT + Codex 制作专属桌面宠物（Pet）完整流程

最近体验了一下 Codex 的 Pet 功能，发现可以把自己的形象做成桌面宠物，效果非常有意思。

 **原型图：**
 ![DC393331-FE49-453B-B329-A46505B5B048](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/04/238384c4-dd32-482c-ab7e-dc2266eb2a97.png)
 
**效果图:**
 
![截屏2026-06-04 16.14.07](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/04/b34c66bc-1892-4a3a-acf0-71e4cb6fe6e2.png)

整个流程并不复杂，大概分为三步：

## 第一步：准备宠物形象

先准备一张透明背景 PNG 图片。

推荐方式：

1. 准备自己的照片
2. 让 GPT 生成 Q 版人物形象
3. 使用 GPT、PS、RemoveBG 等工具抠图
4. 导出透明背景 PNG

### 示例提示词

```text
请根据这张照片生成一个 Q 版人物形象。

要求：
- 最大程度保留人物外貌特征
- 大眼睛
- Q版比例
- 全身形象
- 保留发型和服装特点
- 适合作为桌面宠物
- 透明背景
```

最终得到：

```text
pet.png
```

透明背景非常重要，否则后续生成的宠物效果会比较差。

---

## 第二步：安装 Codex Pet 技能

在 Codex 输入：

```bash
$skill-installer hatch-pet
```

等待安装完成。

---

## 第三步：刷新技能

打开命令面板：

```text
Cmd + K
```

输入：

```text
Force Reload Skills
```

重新加载技能。

---

## 第四步：创建宠物

在 Codex 中输入：

```text
Hatch Pet

我想基于这张 PNG 图片创建一个 Codex 宠物。

请最大程度保留以下特征：

- 黑色长发
- 猫耳
- 猫尾
- 大眼睛
- 脸上的彩色星星贴纸
- 鼻子上的白色小贴纸
- 红色毛绒发夹
- 灰白条纹衬衫

要求：

- Q版风格
- 像素风
- 桌面宠物风格
- 支持待机动画
- 支持行走动画
- 支持眨眼动画
- 支持拖拽状态动画
- 小尺寸显示效果清晰

请生成适用于 Codex Desktop Pet 的资源文件，并自动打包到 Codex pets 目录。
```

随后确认执行即可：

```text
Yes, go ahead.
```

---

## 第五步：唤醒宠物

创建完成后输入：

```text
/pet
```

即可唤醒宠物。

部分版本也可以通过：

```text
Cmd + K
```

执行：

```text
Wake Pet
```

启动宠物。

---

# 推荐制作思路

相比直接使用系统默认宠物，我更推荐：

```text
真人照片
    ↓
GPT生成Q版形象
    ↓
透明背景PNG
    ↓
Codex Pet
    ↓
专属桌面宠物
```

这样生成出来的宠物会更有个人特色。

例如：

- 程序员形象
- 二次元形象
- 猫娘形象
- 狗狗形象
- 游戏角色形象
- 自己的头像形象

都可以制作成专属桌宠。

---

# 最终效果

```text
照片
    ↓
Q版形象
    ↓
透明PNG
    ↓
Codex生成动画
    ↓
桌面宠物
```

从一张照片到拥有自己的 AI 桌面宠物，大约只需要几分钟。
