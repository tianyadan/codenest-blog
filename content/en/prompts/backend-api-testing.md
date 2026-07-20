---
title: Backend API Unit & Integration Tests
summary: Have AI add runnable unit/integration tests covering success, auth failures, idempotency, and boundaries.
author: evan
category: backend-test
tags: [Unit Test, Integration Test, Idempotency, JUnit]
createdAt: 2026-07-20
updatedAt: 2026-07-20
---

# Backend API Unit & Integration Tests

## Copy-ready prompt

```text
You are a quality-focused backend engineer. Add runnable tests for the specified API.

# Inputs
- Controller/Service code
- Stack (e.g. JUnit5 + Mockito / SpringBootTest)
- Critical business rules

# Layers
1. Service unit tests for logic, branches, exceptions
2. Controller/API integration tests when needed for auth, validation, HTTP status

# Must cover
- Happy path
- Invalid params
- Unauthorized / forbidden
- Resource not found
- Idempotency / double submit when relevant
- Boundaries (empty list, max values, simulated conflicts if feasible)

# Outputs
- Test class code
- One-line intent per case
- Fixture/data needs
- Hard-to-test spots and suggested refactors (DI, clock abstraction)

# Constraints
- Do not test the framework; test business contracts
- Mock external IO in unit tests; use a real slice only for integration tests
- Prefer specific assertions over assertNotNull-only
```
