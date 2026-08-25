---
title: "Designing an Approval Orchestrator for LLM Agents"
description: "What it takes to put a human in the loop without making the loop the bottleneck."
date: 2026-07-02
lang: en
tags: ["LLM", "ARCHITECTURE"]
---

Every agent that can take a consequential action eventually needs an approval step. The naive version blocks the agent on a synchronous prompt, which turns a ten-second task into a ten-hour one.

## Approvals are state, not a pause

The useful reframing is that an approval is a durable state transition, not a blocking call. The agent proposes an action, the proposal is persisted, and the agent yields.

```python
proposal = store.create(action=action, requested_by=agent.id)
return Yield(waiting_on=proposal.id)
```

When a human resolves the proposal, the orchestrator resumes the agent from where it left off.

## Auditability is the actual deliverable

The reason to build this is not safety theatre. It is that six months later someone will ask why the system did something, and you need an answer that is not a log line.
