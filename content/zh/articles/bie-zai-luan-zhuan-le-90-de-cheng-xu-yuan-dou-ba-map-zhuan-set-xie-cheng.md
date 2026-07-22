---
title: "别再乱转了！90%的程序员都把 Map 转 Set 写成了这个鬼样子！"
summary: 兄弟们，今天在 Code Review 的时候，我又破防了！😤 看到一个新来的实习生，要把 Map 转成 Set，结果写出来一段让我血压飙升的代码。 先来...
author: evan
category: learning
tags: [集合]
createdAt: 2026-05-18 17:36:59
updatedAt: 2026-05-18 17:36:59
readingMinutes: 3
---
# 别再乱转了！90%的程序员都把 Map 转 Set 写成了这个鬼样子！

## 正文

兄弟们，今天在 Code Review 的时候，我又破防了！😤
看到一个新来的实习生，要把 Map 转成 Set，结果写出来一段让我血压飙升的代码。
先来看看这两个数据结构，是不是很熟悉？👇
这是 Set（一堆对象）：
```json
[
  {"name": "张三", "age": 18},
  {"name": "李四", "age": 20}
]
```
这是 Map（一个对象）：
```json[
{
  "name": "张三",
  "age": 18
}
```
❌ 这种转换，简直是 Bug 制造机！
很多小白想当然地认为，Map 转 Set 就是把外面的花括号 {}换成方括号 []。
于是写出了这种 “地狱级”​ 代码：
```json[
[
  {"name": "张三", "age": 18}
]
```
醒醒吧老弟！
这哪里是 Map 转 Set？这明明是把一个 Map 塞进了一个 List 里啊！
在 Java 里，这叫 把 Entry 当成 Object 丢进去，你丢失了 Map 的 Key-Value 结构！
后续你想根据 Key 去重？想根据 Key 排序？全都没戏！
✅ 这才是大厂标准写法！
真正的 Map 转 Set，转的是 “键值对（Entry）”，而不是那个对象本身！
看好了，这才是正确的姿势 👇
```json[
[
  {"key": "name", "value": "张三"},
  {"key": "age", "value": 18}
]
```
为什么这样写才是对的？
结构对等：Map 的本质是 key=value。转成 Set 后，每一个元素都必须体现这种关系。
方便去重：Set 集合要求元素不重复。如果是第一种写法，你根本没法判断两个 Map 是不是同一个 Key。
符合规范：这就是 Java 里 Map.Entry的思想！
