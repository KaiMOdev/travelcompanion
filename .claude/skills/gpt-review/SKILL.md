---
name: gpt-review
description: >
  Send code to OpenAI GPT 5.4 for structured code review, expert consultation, or architecture
  advice. Use this skill whenever the user asks to: review code/commits with GPT, get a second
  opinion, consult GPT about a problem, ask GPT for advice on architecture/design, debug with
  GPT, or mentions "gpt review" / "ask gpt" / "consult gpt" / "what does gpt think".
  Also triggers for: "second opinion", "review my commit", "gpt advice", "ask openai",
  "check with gpt", "gpt debug".
---

# GPT Second Brain

Use OpenAI GPT 5.4 as a second model for code review, debugging advice, and architecture
consultation. Two models catch more than one — different training means different blind spots.

## Prerequisites

- `OPENAI_API_KEY` in environment or any `.env` file in the project
- Python `openai` package installed (use `C:/Users/cloud/anaconda3/envs/py311/python.exe` on this machine)

The Python executable for this machine is:
```
C:/Users/cloud/anaconda3/envs/py311/python.exe
```

## Three Modes

### 1. Code Review (`gpt_review.py`)

Review git diffs — committed, staged, or ranges. Best for: post-commit quality checks, pre-PR review, catching bugs.

```bash
# Last commit
python scripts/gpt_review.py

# Specific commit
python scripts/gpt_review.py abc1234

# Range of commits
python scripts/gpt_review.py HEAD~3..HEAD

# Staged changes
python scripts/gpt_review.py --staged

# Different model
python scripts/gpt_review.py --model gpt-4.1
```

**Output**: Categorized issues (Bugs, Security, Performance, Error Handling, Design) with severity, file:line, explanation, fix suggestion. Ends with Verdict and Risk Level.

### 2. Expert Consult (`gpt_consult.py`)

Send specific files + a question to GPT. Best for: debugging, "why doesn't this work", understanding behavior, getting implementation advice.

```bash
# Debug a problem
python scripts/gpt_consult.py -q "Why does the record button not respond on Android?" -f components/RecordButton.tsx hooks/useTranslation.ts

# Include a whole directory
python scripts/gpt_consult.py -q "What's wrong with my audio pipeline?" -f services/

# With git context
python scripts/gpt_consult.py -q "Why did this break?" -f src/api.ts --git-context
```

### 3. Architecture Consult (`gpt_consult.py --role architect`)

High-level design advice. Best for: "how should I structure X", pattern selection, technology choices, scalability questions.

```bash
python scripts/gpt_consult.py -q "Should I use SSE or WebSockets for realtime translation?" -f server/index.ts services/translate.ts -r architect
```

### 4. File Review (`gpt_consult.py --role reviewer`)

Review specific files (not diffs). Best for: reviewing files that weren't recently changed, auditing specific modules.

```bash
python scripts/gpt_consult.py -q "Review this for security issues" -f server/index.ts -r reviewer
```

## Workflow when invoked as a skill

Determine what the user wants and pick the right mode:

| User says | Mode | Script |
|-----------|------|--------|
| "review my commit", "gpt review", "review changes" | **Review** | `gpt_review.py` |
| "ask gpt about X", "consult gpt", "why doesn't X work" | **Consult** | `gpt_consult.py` |
| "gpt advice on architecture", "how should I design X" | **Architect** | `gpt_consult.py -r architect` |
| "have gpt review this file" | **File Review** | `gpt_consult.py -r reviewer` |

### For reviews:
1. Determine what to review (HEAD, staged, range, specific commit)
2. Run the review script
3. Present results in a table format
4. Offer to fix issues GPT found

### For consults:
1. Identify the relevant files for the question
2. Run the consult script with the appropriate role
3. Present GPT's response
4. If GPT suggests code changes, offer to implement them

## Options

Both scripts share:
- `--model MODEL` — override model (default: gpt-5.4)
- `--no-save` — don't save output to `.reviews/`

Review-specific:
- `--staged` — review staged changes
- `--json` — machine-readable output
- `ref` — git ref or range (default: HEAD)

Consult-specific:
- `-q`/`--question` — the question to ask
- `-f`/`--files` — files or directories to include as context
- `-r`/`--role` — expert (default), architect, or reviewer
- `--git-context` — include branch and recent commits

## History

All reviews and consults are saved to `.reviews/` with timestamps:
- `review_YYYYMMDD_HHMMSS.md` — code reviews
- `consult_YYYYMMDD_HHMMSS.md` — consultations

## Tips

- For debugging: include ALL files in the data flow, not just the one that errors
- For architecture: include existing code so GPT can see current patterns
- For large diffs: review by commit range instead of all at once (80K char limit)
- Compare GPT's take with Claude's for maximum coverage — different models catch different things
- Use `--git-context` when the question relates to recent changes
