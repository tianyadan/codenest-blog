---
title: 脱离 Ollama：使用 Python 独立部署 Qwen3.5-2B 遇到的坑与思考
summary: 不用 Ollama，直接用 Python + Transformers + PyTorch 在 Apple Silicon 上跑通 Qwen3.5-2B，记录 Python 版本、Transformers 兼容性、MPS 设备映射等踩坑，并梳理大模型本地推理的真实链路。
author: evan
category: learning
tags: [LLM, Qwen, Transformers, PyTorch, 本地部署, Apple Silicon]
createdAt: 2026-08-10
updatedAt: 2026-08-10
readingMinutes: 10
---

# 脱离 Ollama：使用 Python 独立部署 Qwen3.5-2B 遇到的坑与思考

从安装依赖，到模型加载，再到理解大模型运行原理，这一次没有使用 Ollama，而是自己使用 Python + Transformers 跑通了一个本地大语言模型。

最近想深入学习大模型部署原理，所以决定做一个小实验：

不用 Ollama，不使用任何封装工具，直接使用 Python 加载一个 2B 级别的大模型。

目标很简单：

```text
Python
    |
Transformers
    |
PyTorch
    |
Qwen3.5-2B
    |
本地推理
```

我希望知道，一个大模型到底是怎么从一个模型文件，变成一个可以聊天的 AI。

## 第一步：安装环境

首先创建 Python 虚拟环境：

```bash
python3 -m venv .venv

source .venv/bin/activate
```

然后安装：

```bash
pip install torch
pip install transformers accelerate sentencepiece safetensors
```

最开始我没有太关注 Python 版本，直接使用了 Python 3.14。

结果第一次加载模型时遇到了问题。

## 第一个坑：Python 版本太新

模型下载完成以后：

```text
model.safetensors
4.55GB
```

已经成功下载。

但是加载阶段一直停留：

```text
Loading weights: 0%
```

等待十几分钟没有继续。

查看日志发现：

```text
Python.framework/Versions/3.14
```

当时使用的是 Python 3.14。

对于普通业务开发来说，新版本 Python 没有什么问题。

但是 AI 生态不同。

PyTorch、Transformers、各种推理加速库，通常会优先适配：

- Python 3.10
- Python 3.11
- Python 3.12

所以重新创建环境：

```bash
python3.12 -m venv .venv
```

问题得到改善。

## 第二个坑：Transformers 版本不支持新模型

换完 Python 后，又遇到了：

```text
KeyError: 'qwen3_5'
```

原因：

当前 Transformers 无法识别 Qwen3.5 的模型结构。

模型配置文件：

```json
{
  "model_type": "qwen3_5"
}
```

但是 Transformers 里面没有对应实现。

解决：

安装最新源码版本：

```bash
pip install git+https://github.com/huggingface/transformers.git
```

再次运行：

模型开始正常加载。

## 第三个坑：不要盲目使用 device_map="auto"

最开始代码：

```python
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto"
)
```

这个方式在 NVIDIA CUDA 环境中非常常见。

但是我的环境是：

```text
Mac
Apple Silicon
MPS
```

自动设备分配反而导致加载过程异常。

最后改成：

```python
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    dtype=torch.float16
)

model.to("mps")
```

让 PyTorch 明确使用 Apple GPU。

## 最终成功

运行日志：

```text
Loading weights: 100% | 320/320

模型加载完成

mps:0
```

说明：

模型权重已经成功加载到 Apple GPU。

然后输入：

```text
你是谁？
```

模型返回：

```text
你好！我是 Qwen3.5...
```

第一次本地大模型部署成功。

## 大模型启动过程中到底发生了什么？

以前使用 Ollama：

```bash
ollama run qwen
```

感觉模型像一个普通软件一样启动。

但是自己使用 Python 后，真正看到了内部流程。

完整链路：

```text
用户输入

    ↓

Tokenizer

    ↓

Token ID

    ↓

Embedding

    ↓

Transformer Layers

    ↓

LM Head

    ↓

预测下一个 Token

    ↓

Decode

    ↓

文本输出
```

模型并不是理解文字。

它实际上是在不断分类预测：

“下一个最可能出现的 token 是什么”。

## 查看模型结构

打印模型以后：

```text
Qwen3_5ForCausalLM
```

可以看到：

```text
Embedding
Decoder Layer
MLP
Attention
LM Head
```

这些组件。

其中 Qwen3.5 并不是传统单纯 Transformer。

里面包含：

- Attention
- Gated DeltaNet
- MLP
- RMSNorm

等结构。

这也是为什么现代大模型越来越复杂。

## 下一步：让模型常驻内存

目前：

```bash
python main.py
```

运行结束以后：

模型会从内存释放。

下一次启动：

又需要：

```text
读取模型文件
↓
加载权重
↓
初始化网络
```

这非常浪费时间。

真正的大模型服务不会这样设计。

正确方式：

```text
FastAPI

    |

Qwen3.5-2B

    |

持续驻留内存
```

启动一次：

```bash
python server.py
```

模型保持运行。

之后：

Java、前端、其他服务通过 HTTP 调用。

这也是企业内部 AI 服务常见架构。

## 总结

这次实验最大的收获不是「成功运行了一个聊天机器人」。

而是理解了：

一个大模型服务背后的真实过程：

```text
模型文件
    |
Python加载
    |
Transformer结构
    |
GPU计算
    |
Token生成
    |
API服务
```

Ollama 让使用模型变得简单。

但是自己使用 Python 部署一次，才能真正理解：

大模型到底是如何运行起来的。

对于后续学习：

- RAG
- Agent
- AI Gateway
- 私有化部署

这些方向都有很大的帮助。
