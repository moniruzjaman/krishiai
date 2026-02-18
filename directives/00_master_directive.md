# Master Directive

This document defines the operation of the Krishi AI 3-Layer Architecture.

## System Overview

- **Layer 1: Directive (SOPs)**: Located in `directives/`. Defines what to do.
- **Layer 2: Orchestration (Agent)**: The AI agent (Antigravity). Decides which tools/scripts to call based on directives.
- **Layer 3: Execution (Scripts)**: Located in `execution/`. Deterministic Python/Shell scripts that perform the actual work.

## Operational Protocol

1. **Before any task**: Check `directives/` for relevant SOPs.
2. **Execution**: Favor scripts in `execution/` over manual steps.
3. **Learning**: Update directives as new information or constraints are discovered.
4. **Intermediates**: Store all temporary data in `.tmp/`.

## Active Directives

- [00_master_directive.md](./00_master_directive.md) - This file.
