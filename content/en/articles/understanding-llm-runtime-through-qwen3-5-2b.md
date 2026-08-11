---
author: evan
category: learning
createdAt: 2026-08-11
readingMinutes: 10
summary: Explore how a local Qwen3.5-2B model works by analyzing
  HuggingFace model files and understanding the complete pipeline from
  text input to generated output.
tags:
- Learning
- AI
- LLM
- Qwen
- Transformer
title: Understanding LLM Runtime Through Qwen3.5-2B Local Model Files
updatedAt: 2026-08-11
---

# Understanding LLM Runtime Through Qwen3.5-2B Local Model Files

## Content

Recently, I deployed Qwen3.5-2B locally and started exploring the model
files instead of only using high-level tools like Ollama.

By analyzing files such as `config.json`, `model.safetensors`, tokenizer
files, and `chat_template.jinja`, I gradually understood how a large
language model processes user input and generates responses.

A large language model is not a single executable program. It is a
combination of:

-   Model architecture
-   Trained parameters
-   Tokenization rules
-   Conversation format protocols

------------------------------------------------------------------------

# Structure of a Local LLM Model

A HuggingFace model usually contains files like:

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

Each file has a different responsibility:

  File                           Purpose
  ------------------------------ --------------------------------------
  config.json                    Defines model architecture
  model.safetensors              Stores trained model parameters
  model.safetensors.index.json   Maps parameters to weight files
  tokenizer.json                 Tokenizer configuration
  tokenizer_config.json          Tokenizer behavior settings
  vocab.json                     Token and ID mapping
  merges.txt                     BPE merge rules
  chat_template.jinja            Converts messages into model prompts

------------------------------------------------------------------------

# config.json: Model Architecture Definition

`config.json` describes the structure of the model.

Example:

``` json
{
  "hidden_size": 2048,
  "num_hidden_layers": 24,
  "num_attention_heads": 8,
  "vocab_size": 248320
}
```

------------------------------------------------------------------------

## Transformer Layers

``` json
"num_hidden_layers": 24
```

means the model contains 24 Transformer layers.

Structure:

``` txt
Input

↓

Transformer Layer 1

↓

Transformer Layer 2

↓

...

↓

Transformer Layer 24

↓

Output
```

Each layer performs complex mathematical operations.

------------------------------------------------------------------------

## hidden_size

``` json
"hidden_size":2048
```

means each token is represented internally as a 2048-dimensional vector.

Example:

``` txt
Hello

↓

[
0.12,
0.55,
...
2048 numbers
]
```

The model does not directly understand text. It calculates relationships
in a high-dimensional vector space.

------------------------------------------------------------------------

## vocab_size

``` json
"vocab_size":248320
```

means the tokenizer contains about 248 thousand tokens.

------------------------------------------------------------------------

# model.safetensors: The Model Parameters

`model.safetensors` stores the trained weights.

Example:

``` txt
model.language_model.layers.0.mlp.up_proj.weight
```

This represents:

The MLP projection matrix inside the first Transformer layer.

A Transformer layer usually contains:

``` txt
Transformer Layer

├── Attention
│
├── Normalization
│
└── MLP
```

The MLP performs transformations like:

``` txt
Input

2048 dimensions

↓

up_proj

↓

6144 dimensions

↓

Activation

↓

down_proj

↓

2048 dimensions
```

These matrices are the source of the model's learned ability.

------------------------------------------------------------------------

# model.safetensors.index.json: Weight Mapping

This file tells the framework where each parameter is stored.

Example:

``` json
{
  "weight_map": {
    "layer.weight": "model.safetensors"
  }
}
```

It works like a map:

``` txt
Parameter Name

↓

Weight File Location
```

------------------------------------------------------------------------

# Tokenizer: Converting Text into Numbers

Neural networks cannot directly process:

``` txt
Hello
```

They process numbers:

``` txt
[109266]
```

The tokenizer performs:

``` txt
Text

↓

Tokenizer

↓

Token IDs

↓

Embedding

↓

Transformer
```

------------------------------------------------------------------------

# vocab.json: Token Dictionary

`vocab.json` stores:

``` txt
Token

↓

Token ID
```

Example:

``` txt
你好

↓

109266
```

The model internally works with the ID, not the original characters.

------------------------------------------------------------------------

# Why Do Tokens Look Like Garbled Text?

When viewing vocab files, you may see strings like:

``` json
"ä½łå¥½":109266
```

This is not an error.

Qwen uses Byte-level BPE tokenization.

The process is:

``` txt
Character

↓

UTF-8 Bytes

↓

BPE Encoding

↓

Token
```

The displayed content is an internal byte representation.

------------------------------------------------------------------------

# merges.txt: BPE Merge Rules

Tokenizer does not store every possible sentence.

For example:

``` txt
ArtificialIntelligence
```

may become:

``` txt
Artificial

Intelligence
```

BPE learns frequent combinations and merges common patterns into tokens.

------------------------------------------------------------------------

# tokenizer_config.json: Special Tokens

This file defines special tokens used by the model.

Examples:

## Conversation Start

``` txt
<|im_start|>
```

## Conversation End

``` txt
<|im_end|>
```

A chat model does not receive:

``` txt
Hello
```

It receives a structured prompt:

``` txt
<|im_start|>user

Hello

<|im_end|>
```

------------------------------------------------------------------------

## Tool Calling Tokens

Example:

``` txt
<tool_call>
```

These tokens allow models to interact with external tools.

Workflow:

``` txt
User Question

↓

Model Generates Tool Call

↓

External API Execution

↓

Tool Result

↓

Model Continues Response
```

------------------------------------------------------------------------

## Vision Tokens

Qwen3.5 supports multimodal input.

Example:

``` txt
<|image_pad|>
```

Workflow:

``` txt
Image

↓

Vision Encoder

↓

Visual Tokens

↓

Language Model
```

------------------------------------------------------------------------

# chat_template.jinja: Conversation Formatting

Chat models need to understand:

-   Who sent the message
-   What role the message belongs to
-   Where the conversation starts and ends

Example input:

``` json
[
 {
  "role":"user",
  "content":"Hello"
 }
]
```

After applying the chat template:

``` txt
<|im_start|>user
Hello
<|im_end|>

<|im_start|>assistant
```

Then the tokenizer processes it.

------------------------------------------------------------------------

# Complete LLM Inference Pipeline

The complete process:

``` txt
User Input

↓

Messages

↓

chat_template

↓

Formatted Prompt

↓

Tokenizer

↓

Token IDs

↓

Embedding

↓

Transformer Layers

↓

Logits

↓

Token Sampling

↓

New Token IDs

↓

Decode

↓

Generated Text
```

------------------------------------------------------------------------

# What Is an LLM Actually Doing?

A common misunderstanding is:

> Does an LLM store all answers?

No.

A large language model is a probability prediction system with billions
of parameters.

It predicts:

``` txt
What is the next token?
```

Example:

Input:

``` txt
The weather today is
```

The model calculates probabilities:

``` txt
sunny   0.6

rainy   0.2

cloudy  0.1
```

Then selects a token and continues generating.

------------------------------------------------------------------------

# pipeline() vs Manual Inference

HuggingFace provides:

``` python
pipeline()
```

for quick usage.

However, it hides the internal process.

Manual inference:

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

allows developers to understand how the model actually works.

------------------------------------------------------------------------

# Summary

By analyzing Qwen3.5-2B local model files, we can understand:

``` txt
config.json

Defines model architecture


model.safetensors

Stores trained parameters


tokenizer

Converts text and tokens


chat_template

Defines conversation format


Transformer

Processes and generates information
```

The essence of an LLM runtime is:

``` txt
Text

↓

Token

↓

Vector

↓

Matrix Computation

↓

Probability Prediction

↓

Token

↓

Text
```

Understanding this pipeline is an important step from simply using AI
APIs to becoming an LLM engineer.
