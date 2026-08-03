---
title: 使用 Python 替代 Ollama 独立部署大模型：深入理解底层执行原理
summary: 记录一次不依赖 Ollama、使用 Python 独立加载并部署 2B 以内大模型的学习计划，从模型权重、分词器、推理框架到 HTTP 服务逐步理解本地大模型的执行链路。
author: evan
category: learning
tags: [Python, 大模型, LLM, Transformers, PyTorch, Tokenizer, 模型部署]
createdAt: 2026-08-04
updatedAt: 2026-08-04
readingMinutes: 8
slug: python-local-llm-deployment-without-ollama
---

# 使用 Python 替代 Ollama 独立部署大模型：深入理解底层执行原理

## 为什么要做这次实验

Ollama 可以通过一条命令完成模型下载、加载、运行和 API 暴露：

```bash
ollama run deepseek-r1:1.5b
```

这种方式非常适合快速体验本地模型，但也隐藏了大量关键细节。作为后端开发者，我不希望只停留在“会使用一个本地模型应用”的层面，而是希望理解一段文本从进入程序，到最终生成回答，中间到底经过了哪些步骤。

因此，我计划在掌握 Python 基础后，不依赖 Ollama，使用 Python 独立部署一个参数量不超过 2B 的开源模型，亲手完成以下流程：

```text
下载模型权重
→ 加载 Tokenizer
→ 文本转换为 Token ID
→ 加载模型到 CPU 或 Apple MPS
→ 执行推理
→ 生成新的 Token
→ 解码为文本
→ 使用 FastAPI 暴露 HTTP 接口
```

这次实验的目标不是追求模型回答质量，也不是搭建生产级推理集群，而是建立对大模型部署底层链路的完整认识。

## 为什么选择 2B 以内的模型

我的本地设备是 Apple Silicon Mac，统一内存为 24GB。虽然可以尝试更大的量化模型，但第一次实验更应该关注流程是否清晰、错误是否容易定位，而不是模型规模。

2B 以内模型具有以下优势：

- 下载体积较小，实验成本低；
- 内存压力相对可控；
- 首次加载和推理速度更快；
- 便于观察 Tokenizer、模型加载和文本生成流程；
- 即使代码配置不合理，也不容易立即耗尽本机内存。

初步候选模型包括：

- `Qwen2.5-0.5B-Instruct`
- `Qwen2.5-1.5B-Instruct`
- `DeepSeek-R1-Distill-Qwen-1.5B`
- `SmolLM2-1.7B-Instruct`

第一次实验优先选择 `Qwen2.5-0.5B-Instruct`。当完整链路跑通后，再替换为 DeepSeek 1.5B，比较不同模型在加载方式、聊天模板、速度和输出效果上的区别。

## 计划使用的技术栈

```text
Python
├── PyTorch：张量计算和硬件执行
├── Transformers：模型与 Tokenizer 加载
├── Safetensors：读取模型权重
├── Accelerate：设备与内存辅助管理
└── FastAPI：对外暴露 HTTP 服务
```

各组件的职责需要明确区分：

| 组件 | 主要职责 |
|------|----------|
| Python | 编写模型加载、推理和服务代码 |
| PyTorch | 执行张量运算，调用 CPU、CUDA 或 Apple MPS |
| Transformers | 提供模型结构、Tokenizer、聊天模板和生成接口 |
| 模型权重 | 保存模型训练完成后的参数 |
| Tokenizer | 在自然语言和 Token ID 之间转换 |
| FastAPI | 将本地推理能力包装为 HTTP API |
| 推理引擎 | 更高效地调度模型计算、显存和批处理 |

FastAPI 本身不会运行模型，它只负责接收请求和返回响应。真正完成模型计算的是 PyTorch，以及后续可能学习的 MLX、llama.cpp、vLLM 等推理方案。

## 第一阶段：使用 Transformers 跑通模型

首先创建独立的 Python 虚拟环境：

```bash
mkdir python-local-llm
cd python-local-llm

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install torch transformers accelerate safetensors
```

第一版程序只完成一件事：输入一句话，获得模型输出。

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"


def resolve_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main() -> None:
    device = resolve_device()

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16 if device == "mps" else torch.float32,
        low_cpu_mem_usage=True,
    )

    model = model.to(device)
    model.eval()

    messages = [
        {
            "role": "user",
            "content": "请用简单的语言解释 Spring IOC。",
        }
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    answer = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    print(answer)


if __name__ == "__main__":
    main()
```

这段代码看起来不长，但已经包含了本地推理最核心的步骤：

1. `from_pretrained()` 下载并加载模型资源；
2. Tokenizer 根据聊天模板构造提示词；
3. 文本被转换为 Token ID；
4. 模型被加载到 CPU 或 Apple MPS；
5. `generate()` 循环预测后续 Token；
6. Tokenizer 将结果解码回自然语言。

## 第二阶段：理解 Tokenizer

Tokenizer 是本次学习的重点之一。大模型不能直接理解 Java、中文或英文字符串，它实际处理的是数字序列。

例如：

```text
"Spring Boot 是什么"
        ↓ Tokenizer
[7854, 23918, 204, 10321, ...]
```

需要重点理解以下概念：

- Token 不完全等于一个汉字或一个英文单词；
- 不同模型可能使用不同词表和切分算法；
- `encode()` 将文本转换为 Token ID；
- `decode()` 将 Token ID 恢复为文本；
- 聊天模型通常依赖固定的 chat template；
- BOS、EOS、PAD 等特殊 Token 会影响生成过程；
- 上下文长度通常按 Token 数量计算，而不是字符数量。

计划通过以下代码直接观察分词结果：

```python
text = "Spring Boot 是什么？"

token_ids = tokenizer.encode(text)
tokens = tokenizer.convert_ids_to_tokens(token_ids)

print(token_ids)
print(tokens)
print(tokenizer.decode(token_ids))
```

通过这种方式，可以建立“自然语言只是输入形式，模型内部处理的是 Token ID 和向量”的认识。

## 第三阶段：理解模型推理过程

模型生成回答并不是一次性产生整段文字，而是不断预测下一个 Token：

```text
输入 Token
→ 前向计算
→ 得到词表概率分布
→ 根据采样策略选择下一个 Token
→ 将新 Token 加入上下文
→ 再次执行计算
→ 直到生成 EOS 或达到长度限制
```

需要继续学习的关键概念包括：

### Prefill

模型一次性处理用户已有的输入 Token，并为后续生成建立中间状态。输入越长，Prefill 阶段的计算量通常越大。

### Decode

模型逐个生成新的 Token。Decode 阶段会反复执行，因此单 Token 延迟和内存访问效率非常重要。

### KV Cache

模型会缓存注意力机制中的 Key 和 Value，避免每生成一个 Token 都重新计算全部历史上下文。KV Cache 可以提升生成速度，但会占用额外内存。

### Temperature、Top-k 与 Top-p

这些参数决定如何从模型输出的概率分布中选择下一个 Token：

- `temperature` 越低，输出越稳定；
- `top_k` 只保留概率最高的 K 个候选；
- `top_p` 保留累计概率达到阈值的一组候选；
- 关闭采样后，通常选择概率最高的 Token，结果更确定。

## 第四阶段：使用 FastAPI 暴露本地接口

模型脚本跑通后，下一步是将模型常驻内存，并通过 HTTP API 提供推理能力。

目标架构如下：

```text
Spring Boot / curl
        ↓ HTTP
Python FastAPI
        ↓
Transformers
        ↓
PyTorch
        ↓
CPU / Apple MPS
        ↓
本地模型权重
```

FastAPI 服务需要重点处理：

- 应用启动时加载一次模型，不能每个请求重新加载；
- 增加 `/health` 健康检查接口；
- 定义明确的请求和响应 DTO；
- 限制输入长度和最大输出 Token 数；
- 避免多个请求同时导致内存峰值过高；
- 后续增加流式响应；
- 记录首 Token 延迟和总生成耗时。

最初可以设计两个接口：

```text
GET  /health
POST /chat
```

完成后，再让 Spring Boot 使用 `RestClient` 或 `WebClient` 调用该服务。这样可以从 Java 后端视角理解一个最小模型网关的组成。

## 第五阶段：理解“框架”和“推理引擎”的区别

在基础实验完成后，需要进一步区分以下工具：

| 工具 | 定位 |
|------|------|
| Transformers | 模型加载、训练与通用推理框架 |
| PyTorch | 底层张量计算框架 |
| MLX / mlx-lm | 面向 Apple Silicon 优化的机器学习与推理工具 |
| llama.cpp | 面向 GGUF 量化模型的高效本地推理实现 |
| Ollama | 封装模型管理、推理运行时和本地 API 的应用层工具 |
| vLLM | 面向 NVIDIA GPU 服务部署的高吞吐推理引擎 |
| SGLang | 面向复杂生成和 Agent 工作负载的推理系统 |

Transformers 能够运行模型，但它并不等同于生产级推理引擎。生产环境还需要考虑：

- 连续批处理；
- 请求调度；
- KV Cache 管理；
- 并发和吞吐量；
- 张量并行与流水线并行；
- 模型量化；
- 流式输出；
- 超时、取消和资源隔离。

## 最终希望获得的认识

完成这次实验后，我希望能够回答以下问题：

1. 一个开源模型仓库中包含哪些文件？
2. 模型权重、配置文件和 Tokenizer 分别负责什么？
3. `from_pretrained()` 到底加载了什么？
4. 一段文本如何转换为 Token ID？
5. 模型为什么需要逐个生成 Token？
6. PyTorch、Transformers 和推理引擎之间是什么关系？
7. Apple MPS 在模型推理中承担什么角色？
8. 为什么量化模型更适合个人电脑？
9. 为什么生产环境通常使用 vLLM 等推理引擎？
10. Ollama 为开发者封装了哪些底层工作？

最终的核心认识应该是：

> 大模型本地部署不是“安装一个聊天应用”，而是把模型结构与权重加载到计算设备中，通过 Tokenizer 完成文本与数字之间的转换，再由计算框架或推理引擎不断执行神经网络前向计算，逐个生成新的 Token，并通过服务层向外提供能力。

当这条链路真正跑通后，再回头使用 Ollama，就能看清它帮助开发者隐藏了哪些复杂性，而不是把 Ollama 本身误认为大模型。