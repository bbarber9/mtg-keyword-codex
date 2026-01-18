# mtg-keyword-codex

## Memory bank
There is a folder called "memory-bank" that contains all decisions made so far. Please include them as context when implementing features. Also, please update the relevant memory bank files when I change my mind.

## Dev environment
- This project uses Bun. Do not use NPM/PNPM

## Code quality
- Don't use `any` in typescript code unless there's a comment and no other reasonable way to accomplish your task
- Avoid magic strings/numbers. Prefer named constants unless it's only used once or twice or is unlikely to change ever.
- Prefer longer and more descriptive variable names for all variables other than quick one-offs (like "i" in a for loop)

## Plans and Designs
- Make the plans concise as long as the context is not lost. Sacrifice grammar for the sake of concision.
- At the end of every plan, give me a list of unanswered or open questions to answer if there are any