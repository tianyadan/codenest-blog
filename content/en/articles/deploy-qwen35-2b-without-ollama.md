---
title: Deploying Qwen3.5-2B Without Ollama: Lessons from a Local LLM Runtime
summary: Skip Ollama and run Qwen3.5-2B locally with Python, Transformers, and PyTorch on Apple Silicon—covering Python version traps, Transformers support gaps, MPS device mapping, and the real LLM inference pipeline.
author: evan
category: learning
tags: [LLM, Qwen, Transformers, PyTorch, Local Deployment, Apple Silicon]
createdAt: 2026-08-10
updatedAt: 2026-08-10
readingMinutes: 10
---

# Deploying Qwen3.5-2B Without Ollama: Lessons from a Local LLM Runtime

Instead of using Ollama, I deployed a local large language model directly with Python, Transformers, and PyTorch to understand how LLM inference actually works.

## Why did I do this?

I wanted to understand the internal workflow of a large language model.

The goal was:

```text
Python
    |
Transformers
    |
PyTorch
    |
Qwen3.5-2B
    |
Local Inference
```

I wanted to know how a model file becomes an interactive AI system.

## Environment Setup

Created a Python virtual environment:

```bash
python3 -m venv .venv

source .venv/bin/activate
```

Installed:

```bash
pip install torch
pip install transformers accelerate sentencepiece safetensors
```

At first I did not pay much attention to the Python version and used Python 3.14 directly.

That led to the first failure when loading the model.

## Problem 1: Python Version Compatibility

The model downloaded successfully:

```text
model.safetensors
4.55GB
```

However, loading stopped at:

```text
Loading weights: 0%
```

It stayed there for more than ten minutes.

The logs showed:

```text
Python.framework/Versions/3.14
```

I was on Python 3.14.

For ordinary application development, a brand-new Python version is often fine.

The AI ecosystem is different.

PyTorch, Transformers, and acceleration libraries are usually better tested with:

- Python 3.10
- Python 3.11
- Python 3.12

So I recreated the environment:

```bash
python3.12 -m venv .venv
```

After switching to Python 3.12, the loading process became stable.

## Problem 2: Transformers Did Not Recognize Qwen3.5

Next I hit:

```text
KeyError: 'qwen3_5'
```

The installed Transformers version did not support the Qwen3.5 architecture.

The model config contained:

```json
{
  "model_type": "qwen3_5"
}
```

But Transformers had no matching implementation yet.

The fix was to install Transformers from source:

```bash
pip install git+https://github.com/huggingface/transformers.git
```

After upgrading, the model architecture was recognized and loading continued.

## Problem 3: Device Mapping on Apple Silicon

The first implementation used:

```python
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto"
)
```

This pattern is common on NVIDIA CUDA setups.

My machine was different:

```text
Mac
Apple Silicon
MPS
```

Automatic device mapping made the load path unreliable.

The better approach was:

```python
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    dtype=torch.float16
)

model.to("mps")
```

This explicitly places the model on Apple's GPU backend.

## Successful Deployment

The final output:

```text
Loading weights: 100% | 320/320

Model loaded

mps:0
```

That meant the Qwen3.5-2B weights were successfully loaded onto the Apple GPU.

Then I asked:

```text
Who are you?
```

The model answered:

```text
Hello! I am Qwen3.5...
```

The first local LLM deployment worked.

## Understanding the LLM Pipeline

Previously, with Ollama:

```bash
ollama run qwen
```

It felt like launching ordinary software.

Running the same thing through Python made the internal pipeline visible:

```text
Text Input

    ↓

Tokenizer

    ↓

Token IDs

    ↓

Embedding

    ↓

Transformer Layers

    ↓

LM Head

    ↓

Next Token Prediction

    ↓

Decode

    ↓

Generated Text
```

A language model does not understand text the way humans do.

It repeatedly predicts the most probable next token from learned parameters.

## Looking Inside the Model

Printing the model showed:

```text
Qwen3_5ForCausalLM
```

With components such as:

```text
Embedding
Decoder Layer
MLP
Attention
LM Head
```

Qwen3.5 is not a plain classic Transformer stack either.

It includes structures such as:

- Attention
- Gated DeltaNet
- MLP
- RMSNorm

That complexity is why modern LLMs keep getting harder to reason about at the architecture level.

## Future Improvement: Keep the Model Resident

The current script:

```bash
python main.py
```

releases the model when the process exits.

The next run has to repeat:

```text
Read model files
↓
Load weights
↓
Initialize the network
```

That is expensive.

Production-style services do not work that way.

A better shape is:

```text
FastAPI

    |

Qwen3.5-2B

    |

Resident in memory
```

Start once:

```bash
python server.py
```

Keep the model warm, then let Java, the frontend, or other services call it over HTTP.

That is much closer to how enterprise private AI services are usually built.

## Conclusion

The biggest lesson was not simply running a local chatbot.

The real value was understanding the complete lifecycle:

```text
Model File
    |
Python Runtime
    |
Transformer Architecture
    |
GPU Acceleration
    |
Token Generation
    |
API Service
```

Ollama makes deployment easy.

But manually deploying a model reveals how modern AI systems actually work.

This foundation will help with the next topics:

- RAG
- Agents
- AI Gateway
- Private LLM Deployment
