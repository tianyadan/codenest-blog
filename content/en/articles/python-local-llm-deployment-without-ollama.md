---
title: Deploying a Local LLM with Python Instead of Ollama: Understanding the Execution Pipeline
summary: A bilingual learning plan for deploying an open-source model under 2B parameters directly with Python, covering model weights, tokenization, inference frameworks, hardware execution, and HTTP serving.
author: evan
category: learning
tags: [Python, LLM, Transformers, PyTorch, Tokenizer, Model Deployment]
createdAt: 2026-08-04
updatedAt: 2026-08-04
readingMinutes: 8
slug: python-local-llm-deployment-without-ollama
---

# Deploying a Local LLM with Python Instead of Ollama: Understanding the Execution Pipeline

## Why I want to run this experiment

Ollama can download, load, run, and expose a local model through a single command:

```bash
ollama run deepseek-r1:1.5b
```

That is excellent for quickly trying a local model, but it hides many important details. As a backend developer, I do not want to stop at knowing how to operate a local AI application. I want to understand what happens after a piece of text enters the program and before the model returns an answer.

After learning the Python fundamentals, I plan to deploy an open-source model with no more than 2B parameters without relying on Ollama. I want to implement the complete flow myself:

```text
Download model weights
→ Load the tokenizer
→ Convert text into token IDs
→ Load the model on CPU or Apple MPS
→ Run inference
→ Generate new tokens
→ Decode tokens into text
→ Expose the capability through FastAPI
```

The goal is not to maximize model quality or build a production inference cluster. The goal is to establish a complete mental model of the local LLM execution pipeline.

## Why choose a model under 2B parameters

My local machine is an Apple Silicon Mac with 24 GB of unified memory. It can run larger quantized models, but the first experiment should prioritize clarity and debuggability instead of model size.

A model under 2B parameters offers several practical advantages:

- Smaller downloads and lower experimentation cost;
- More manageable memory pressure;
- Faster startup and inference;
- Easier observation of tokenizer, loading, and generation behavior;
- Lower risk of exhausting system memory when the code is still immature.

Initial model candidates include:

- `Qwen2.5-0.5B-Instruct`
- `Qwen2.5-1.5B-Instruct`
- `DeepSeek-R1-Distill-Qwen-1.5B`
- `SmolLM2-1.7B-Instruct`

The first experiment should use `Qwen2.5-0.5B-Instruct`. After the full pipeline works, I can switch to DeepSeek 1.5B and compare loading behavior, chat templates, speed, and output quality.

## Planned technology stack

```text
Python
├── PyTorch: tensor computation and hardware execution
├── Transformers: model and tokenizer loading
├── Safetensors: model weight loading
├── Accelerate: device and memory assistance
└── FastAPI: HTTP service exposure
```

The responsibilities of each component should remain distinct:

| Component | Responsibility |
|-----------|----------------|
| Python | Implements loading, inference, and service code |
| PyTorch | Executes tensor operations on CPU, CUDA, or Apple MPS |
| Transformers | Provides model classes, tokenizers, chat templates, and generation APIs |
| Model weights | Store the trained parameters of the model |
| Tokenizer | Converts between natural language and token IDs |
| FastAPI | Wraps local inference behind HTTP endpoints |
| Inference engine | Optimizes scheduling, memory use, batching, and generation throughput |

FastAPI does not run the model. It only receives requests and returns responses. The actual model computation is performed by PyTorch or, later, by inference-oriented tools such as MLX, llama.cpp, or vLLM.

## Phase 1: Run a model with Transformers

First, create an isolated Python environment:

```bash
mkdir python-local-llm
cd python-local-llm

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install torch transformers accelerate safetensors
```

The first program should do one thing only: accept a prompt and print a generated response.

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
            "content": "Explain Spring IOC in simple terms.",
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

Although this script is short, it already contains the core stages of local inference:

1. `from_pretrained()` downloads and loads model assets;
2. The tokenizer applies the model's chat template;
3. Text is converted into token IDs;
4. The model is moved to CPU or Apple MPS;
5. `generate()` repeatedly predicts new tokens;
6. The tokenizer decodes generated token IDs back into text.

## Phase 2: Understand the tokenizer

The tokenizer is one of the most important parts of this study. A language model does not directly understand Java code, Chinese text, or English strings. It processes numerical sequences.

For example:

```text
"What is Spring Boot?"
        ↓ Tokenizer
[3838, 374, 13756, 15888, 30, ...]
```

Key concepts to study include:

- A token is not always equal to one character or one word;
- Different models may use different vocabularies and tokenization algorithms;
- `encode()` converts text into token IDs;
- `decode()` converts token IDs back into text;
- Chat models usually rely on a specific chat template;
- Special tokens such as BOS, EOS, and PAD affect generation;
- Context length is measured in tokens, not characters.

The following code can expose the tokenization result directly:

```python
text = "What is Spring Boot?"

token_ids = tokenizer.encode(text)
tokens = tokenizer.convert_ids_to_tokens(token_ids)

print(token_ids)
print(tokens)
print(tokenizer.decode(token_ids))
```

This makes it easier to understand that natural language is only the external representation. Internally, the model processes token IDs and vectors.

## Phase 3: Understand model inference

A model does not produce an entire paragraph in one operation. It predicts one new token at a time:

```text
Input tokens
→ Forward pass
→ Vocabulary probability distribution
→ Select the next token using a decoding strategy
→ Append the token to the context
→ Run the next computation
→ Stop at EOS or the configured length limit
```

Important concepts for the next stage include:

### Prefill

The model processes all existing prompt tokens and builds the intermediate state required for generation. Longer prompts generally increase prefill cost.

### Decode

The model generates new tokens one by one. Because this stage repeats continuously, per-token latency and memory bandwidth are important.

### KV Cache

The model caches the Key and Value tensors from attention layers so that it does not need to recompute the full history for every new token. KV Cache improves generation speed but consumes additional memory.

### Temperature, Top-k, and Top-p

These parameters control how the next token is selected from the model's probability distribution:

- Lower `temperature` makes output more deterministic;
- `top_k` keeps only the K highest-probability candidates;
- `top_p` keeps the smallest candidate set whose cumulative probability reaches a threshold;
- Disabling sampling usually selects the highest-probability token and produces more repeatable output.

## Phase 4: Expose a local HTTP API with FastAPI

After the model script works, the next step is to keep the model resident in memory and provide inference through HTTP.

The target architecture is:

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
Local model weights
```

The FastAPI service should focus on several engineering concerns:

- Load the model once during application startup, not once per request;
- Add a `/health` endpoint;
- Define explicit request and response DTOs;
- Limit input length and maximum output tokens;
- Avoid excessive concurrent requests that cause memory spikes;
- Add streaming responses later;
- Measure time to first token and total generation latency.

The initial API can contain only two endpoints:

```text
GET  /health
POST /chat
```

After that, a Spring Boot service can call it with `RestClient` or `WebClient`. This creates a minimal model gateway from a Java backend perspective.

## Phase 5: Distinguish frameworks from inference engines

After the basic experiment is complete, the following tools should be compared more carefully:

| Tool | Positioning |
|------|-------------|
| Transformers | General model loading, training, and inference framework |
| PyTorch | Tensor computation framework |
| MLX / mlx-lm | Machine learning and inference tools optimized for Apple Silicon |
| llama.cpp | Efficient local runtime for GGUF quantized models |
| Ollama | Application-layer packaging for model management, runtime, and local APIs |
| vLLM | High-throughput inference engine for NVIDIA GPU deployment |
| SGLang | Inference system for complex generation and agent workloads |

Transformers can run a model, but it is not the same as a production inference engine. Production deployment also needs to consider:

- Continuous batching;
- Request scheduling;
- KV Cache management;
- Concurrency and throughput;
- Tensor and pipeline parallelism;
- Quantization;
- Streaming output;
- Timeouts, cancellation, and resource isolation.

## What I want to understand at the end

After completing this experiment, I want to be able to answer the following questions:

1. What files are stored in an open-source model repository?
2. What are the responsibilities of model weights, configuration files, and tokenizers?
3. What does `from_pretrained()` actually load?
4. How is text converted into token IDs?
5. Why does a language model generate tokens one by one?
6. How are PyTorch, Transformers, and inference engines related?
7. What role does Apple MPS play in model inference?
8. Why are quantized models more practical on personal computers?
9. Why do production deployments usually use engines such as vLLM?
10. What complexity does Ollama hide from the developer?

The final mental model should be:

> Local LLM deployment is not simply installing a chat application. It means loading a model architecture and its trained weights onto a compute device, converting text into numerical tokens with a tokenizer, repeatedly executing neural-network forward passes through a compute framework or inference engine, generating tokens one by one, and exposing that capability through a service layer.

Once this pipeline works end to end, Ollama becomes easier to understand: it is a convenient packaging layer that hides model downloads, storage formats, hardware adaptation, runtime configuration, and API serving. It is not the model itself.