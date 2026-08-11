---
author: evan
category: learning
createdAt: 2026-08-11
readingMinutes: 10
summary: 通过拆解 HuggingFace 下载的 Qwen3.5-2B
  模型文件，理解大语言模型从文字输入到生成回复的完整执行链路。
tags:
- 学习
- AI
- LLM
- Qwen
- Transformer
title: 从 Qwen3.5-2B 本地模型文件理解大语言模型运行流程
updatedAt: 2026-08-11
---

# 从 Qwen3.5-2B 本地模型文件理解大语言模型运行流程

## 正文

最近尝试在本地部署 Qwen3.5-2B 模型，并没有直接使用 Ollama
等封装工具，而是从 HuggingFace 模型文件开始分析。

通过查看模型目录中的 `config.json`、`model.safetensors`、`tokenizer`
相关文件以及
`chat_template.jinja`，逐步理解一个大语言模型到底是如何运行的。

一个 LLM
并不是一个简单的程序，它由模型结构、训练参数、文字编码规则以及聊天协议共同组成。

------------------------------------------------------------------------

## 一个完整的大模型目录结构

``` txt
Qwen3.5-2B/

├── config.json
├── model.safetensors
├── model.safetensors.index.json
├── tokenizer.json
├── tokenizer_config.json
├── vocab.json
├── merges.txt
└── chat_template.jinja
```

这些文件分别负责不同功能：

  文件                           作用
  ------------------------------ -------------------
  config.json                    定义模型结构
  model.safetensors              保存模型训练参数
  model.safetensors.index.json   参数索引
  tokenizer.json                 tokenizer完整配置
  tokenizer_config.json          tokenizer行为配置
  vocab.json                     token与id映射
  merges.txt                     BPE合并规则
  chat_template.jinja            聊天格式模板

------------------------------------------------------------------------

# config.json：模型结构说明书

`config.json` 描述模型的结构。

例如 Qwen3.5-2B：

``` json
{
  "hidden_size": 2048,
  "num_hidden_layers": 24,
  "num_attention_heads": 8,
  "vocab_size": 248320
}
```

## Transformer层数

``` json
"num_hidden_layers": 24
```

表示模型拥有 24 层 Transformer Block。

结构：

``` txt
输入

↓

Transformer Layer 1

↓

Transformer Layer 2

↓

...

↓

Transformer Layer 24

↓

输出
```

每一层都会进行大量矩阵计算。

------------------------------------------------------------------------

## hidden_size

``` json
"hidden_size": 2048
```

表示模型内部每个 token 使用 2048 维向量表示。

例如：

``` txt
你好

↓

[
0.12,
0.55,
...
2048个数字
]
```

模型并不是直接理解文字，而是在高维向量空间中进行计算。

------------------------------------------------------------------------

## vocab_size

``` json
"vocab_size": 248320
```

表示 tokenizer 中存在约 24 万个 token。

------------------------------------------------------------------------

# model.safetensors：模型真正的参数

`safetensors` 文件保存模型训练后的权重。

例如：

``` txt
model.language_model.layers.0.mlp.up_proj.weight
```

表示：

第 0 层 Transformer 中 MLP 模块的参数矩阵。

一个 Transformer Layer：

``` txt
Transformer Layer

├── Attention
│
├── Norm
│
└── MLP
```

例如 MLP：

``` txt
输入

2048维

↓

up_proj

↓

6144维

↓

激活函数

↓

down_proj

↓

2048维
```

这些矩阵参数就是模型能力的来源。

------------------------------------------------------------------------

# tokenizer：文字如何变成数字

神经网络无法直接处理：

``` txt
你好
```

它只能处理数字：

``` txt
[109266]
```

所以需要 tokenizer。

流程：

``` txt
文字

↓

tokenizer

↓

token id

↓

Embedding

↓

Transformer
```

------------------------------------------------------------------------

# vocab.json：token词表

vocab 保存：

``` txt
token

↓

token id
```

例如：

``` txt
你好

↓

109266
```

模型内部处理的是：

``` txt
109266
```

而不是中文字符。

------------------------------------------------------------------------

# 为什么 vocab 中出现乱码？

查看 vocab 时可能看到：

``` json
"ä½łå¥½": 109266
```

这不是错误。

Qwen 使用 Byte-level BPE tokenizer。

流程：

``` txt
中文字符

↓

UTF-8 byte

↓

BPE编码

↓

token
```

所以内部显示可能不是正常中文。

------------------------------------------------------------------------

# merges.txt：BPE分词规则

Tokenizer 不会保存所有句子。

例如：

``` txt
超级无敌宇宙飞船
```

可能拆成：

``` txt
超级
无敌
宇宙
飞船
```

BPE 会根据训练数据统计高频组合，将常见片段合并成 token。

------------------------------------------------------------------------

# tokenizer_config.json：特殊Token定义

这个文件定义模型协议中的特殊 token。

例如：

## 对话开始

``` txt
<|im_start|>
```

## 对话结束

``` txt
<|im_end|>
```

聊天模型实际上接收的不是：

``` txt
你好
```

而是：

``` txt
<|im_start|>user

你好

<|im_end|>
```

------------------------------------------------------------------------

## 工具调用 Token

例如：

``` txt
<tool_call>
```

用于 Agent 调用外部工具。

流程：

``` txt
用户问题

↓

模型生成 tool_call

↓

调用API

↓

返回结果

↓

继续生成回答
```

------------------------------------------------------------------------

## 图片 Token

Qwen3.5 支持多模态。

例如：

``` txt
<|image_pad|>
```

表示图片输入位置。

流程：

``` txt
图片

↓

视觉编码器

↓

视觉token

↓

语言模型
```

------------------------------------------------------------------------

# chat_template.jinja：聊天协议转换

聊天模型需要知道：

-   谁发送消息
-   当前角色是什么
-   对话如何结束

例如：

输入：

``` json
[
 {
  "role":"user",
  "content":"你好"
 }
]
```

经过：

``` txt
chat_template.jinja
```

转换：

``` txt
<|im_start|>user
你好
<|im_end|>

<|im_start|>assistant
```

然后再交给 tokenizer。

------------------------------------------------------------------------

# 大语言模型完整运行流程

完整链路：

``` txt
用户输入

↓

messages

↓

chat_template

↓

格式化 Prompt

↓

Tokenizer

↓

Token ID

↓

Embedding

↓

Transformer 多层计算

↓

输出 Logits

↓

采样下一个 Token

↓

Token ID

↓

Decode

↓

文字回复
```

------------------------------------------------------------------------

# 大模型本质是什么？

很多人认为：

> 大模型是不是保存了大量答案？

实际上不是。

大模型本质是：

> 一个拥有大量参数的概率预测系统。

它不断预测：

``` txt
下一个 token 是什么
```

例如：

输入：

``` txt
今天晚上吃
```

模型计算：

``` txt
饭 0.6

面 0.2

火锅 0.1
```

选择一个结果，然后继续预测。

------------------------------------------------------------------------

# pipeline 与手动推理

HuggingFace 提供：

``` python
pipeline()
```

可以快速调用模型。

但是它隐藏了内部流程。

手动执行：

``` txt
messages

↓

apply_chat_template()

↓

tokenizer()

↓

model.generate()

↓

decode()
```

可以完整理解模型执行过程。

------------------------------------------------------------------------

# 总结

通过分析 Qwen3.5-2B 本地文件，可以理解：

``` txt
config.json

负责模型结构


model.safetensors

负责模型参数


tokenizer

负责文字和数字转换


chat_template

负责聊天协议


Transformer

负责理解和生成
```

一个大语言模型的运行，本质就是：

``` txt
文字

↓

Token

↓

向量

↓

矩阵计算

↓

概率预测

↓

Token

↓

文字
```

从调用 AI 接口，到理解模型内部执行流程，是进入 LLM 工程领域的重要一步。
