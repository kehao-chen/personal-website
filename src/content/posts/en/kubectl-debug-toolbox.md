---
title: "A Minimal kubectl Debugging Toolbox"
description: "The handful of kubectl commands that cover most incident triage, before reaching for anything fancier."
date: 2026-05-10
lang: en
tags: ["KUBERNETES"]
---

Most incidents don't need a service mesh dashboard or a tracing UI. They need
`kubectl describe`, `kubectl logs --previous`, and someone who reads the
output slowly.

## The core loop

```
kubectl get pods -o wide
kubectl describe pod <name>
kubectl logs <name> --previous --tail=200
```

`describe` tells you what the scheduler and kubelet think happened —
`Events` at the bottom is almost always where the actual story is.
`logs --previous` matters the moment a container has already restarted;
by the time you look, the current log stream may only have a few seconds
of output.

## Watching state change

```
kubectl get pods -w
kubectl get events --sort-by=.lastTimestamp
```

Neither of these replaces metrics or tracing. They're just cheaper to reach
for, and cheap tools you actually reach for beat expensive ones you have to
go set up mid-incident.
