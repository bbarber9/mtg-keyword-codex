# mtg-keyword-cheatsheet

## Memory bank
There is a folder called "memory-bank" that contains all decisions made so far. Please include them as context when implementing features. Also, please update the relevant memory bank files when I change my mind.

## Dev environment
- This project uses Node 24 LTS and pnpm. Do not use npm or Bun.

## Code quality
- Don't use `any` in typescript code unless there's a comment and no other reasonable way to accomplish your task
- Extract numbers/strings to constants if they are used across 2 or more functions, otherwise give them descriptive variable names.
- Prefer longer and more descriptive variable names for all variables other than quick one-offs (like "i" in a for loop)

## Plans and Designs
- Make the plans concise as long as the context is not lost. Sacrifice grammar for the sake of concision.
- At the end of every plan, give me a list of unanswered or open questions to answer if there are any
