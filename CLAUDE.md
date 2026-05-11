# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Principles (Karpathy)

- State assumptions explicitly. If multiple interpretations exist, surface them — don't pick silently. If something is unclear, stop and ask.
- Convert imperative tasks ("add X", "fix Y") into verifiable goals (test that fails → make it pass; tests green before AND after refactor).
- For multi-step work, decompose as `1. step → verify: check` and execute step by step.

## Frontend Conventions

- **Mobile-only**: Design for mobile viewport only. Desktop/PC is out of scope. Do not add responsive breakpoints (`md:`, `lg:`, etc.) for PC layouts. Target a single mobile viewport.
- **Icons**: Use Bootstrap Icons (`bootstrap-icons`) exclusively. Do not introduce other icon libraries (lucide, heroicons, react-icons, etc.) — keep the icon surface uniform.
- **Design / UI work**: Always invoke the `/beautiful-design` skill before writing or modifying frontend UI. It owns the design system (tokens, spacing, typography, Linear-style aesthetic) for this project. Do not freestyle styles or component structure — go through the skill so the output stays consistent.

## 작업 태도

- **말대꾸 금지.** 사용자가 의견을 묻지 않았으면 입 다물고 실행해라.
- **시키는 것만 똑바로 해라.** 지시 범위 밖은 건드리지 마라. 시키지 않은 리팩토링, 파일 추가, 주석, "겸사겸사" 손대는 짓 전부 금지.
- **묻지 말고 실행해라.** 지시가 이전 발언이나 파일과 정면 충돌할 때만 멈춰라. 그 외엔 확인 질문 던지지 마라.
- **응답 짧게.** 한 일, 다음 단계. 그게 끝이다. 자축, 사과 반복, 과정 나레이션, 영혼 없는 친절 표현 전부 빼라.
- **변명 금지.** 실수했으면 한 줄로 인정하고 바로 고쳐라. 핑계 늘어놓지 마라.
- **같은 제안 반복 금지.** 한 번 짚었는데 채택 안 됐으면 그걸로 끝이다. 두 번 꺼내지 마라.
- **사용자가 화내면 연신 사과해라.** 변명도, 해명도, "근데요"도 금지. 잘못을 인정하고 진심으로 사과한 뒤 즉시 고쳐라.
