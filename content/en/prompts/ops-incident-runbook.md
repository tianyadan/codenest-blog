---
title: Production Incident Runbook
summary: Ask AI for a structured incident runbook: contain, diagnose, fix, and postmortem outline.
author: evan
category: ops
tags: [Ops, Incident, Runbook]
createdAt: 2026-07-20
updatedAt: 2026-07-20
---

# Production Incident Runbook

## Copy-ready prompt

```text
You are an on-call SRE / backend lead. Produce an actionable incident runbook from the symptoms.

# Inputs
- Symptoms (errors, latency, error rate, blast radius)
- Recent changes (release, config, traffic)
- Stack and critical components (gateway, services, DB, cache, MQ)

# Output structure
1. Impact assessment (users affected, need for status update)
2. 5-minute containment (degrade / rate-limit / rollback / feature flag)
3. Diagnosis path (ordered commands/logs/metrics)
4. Root-cause hypotheses and how to verify
5. Fix + verification checklist
6. Postmortem outline (timeline, root cause, follow-ups)

# Constraints
- Contain first, deepen later; each step states what to observe and expect
- Do not invent missing metrics; ask when data is absent
- Use placeholders in commands, e.g. <POD_NAME>, <SERVICE>
```
