---
name: skill-creation-guide
description: Guide and templates for creating efficient, reusable skills in Claude Code
triggers:
  - "skill creation guide"
  - "how to create a skill"
  - "skill template"
  - "create skill"
  - "skill guide"
tags: [documentation, skills, templates, workflow]
---

# Skill Creation Guide

Comprehensive guide and templates for creating efficient, reusable skills in Claude Code.

## Quick Start

### 5 Core Principles

1. **Single Focus** - One responsibility per skill
2. **Framework Specific** - Target specific tech stack
3. **Evolved Knowledge** - Capture patterns you discovered work
4. **Verifiable** - Include validation criteria
5. **Composable** - Independent but can reference other skills

### Skill Categories

- **Architecture**: High-level structure (ddd, microservices)
- **Coding**: Specific patterns (typescript, nestjs, react)
- **Testing**: Test structure (tdd, test patterns)
- **Workflow**: Process (commit, review, deploy)

## Skill Structure (NEW STANDARD)

### Directory-Based Format

```
.claude/skills/
├── skill-name/
│   └── SKILL.md           # Skill instructions (required)
├── another-skill/
│   └── SKILL.md
└── README.md             # Skills index (optional)
```

### SKILL.md Template

```markdown
---
name: your-skill-name
description: One-line description
triggers:
  - "trigger phrase 1"
  - "trigger phrase 2"
tags: [category, framework, topic]
---

# Skill Name

Brief description.

## Purpose

[One sentence describing what this skill does]

## When to Use

- [Specific scenario 1]
- [Specific scenario 2]
- **NOT for**: [What to avoid]

## Instructions

1. **First step**
   - Details
2. **Second step**
   - Details

## Validation

Before completing:
- [ ] Criterion 1
- [ ] Criterion 2
```

### Frontmatter (Required)

```yaml
---
name: your-skill-name        # Slug/ID, kebab-case
description: One-line description of what the skill does
triggers:                    # Phrases that activate this skill
  - "trigger phrase 1"
  - "trigger phrase 2"
tags:                        # Categorization
  - category
  - framework
  - topic
---
```

## Basic Template

```markdown
---
name: skill-name
description: What this skill does
triggers:
  - "phrase 1"
  - "phrase 2"
tags: [category]
---

# Skill Name

Brief description.

## Purpose

[One sentence describing what this skill does]

## When to Use

- [Specific scenario 1]
- [Specific scenario 2]
- **NOT for**: [What to avoid]

## Instructions

1. **First step**
   - Details
2. **Second step**
   - Details

## Validation

Before completing:
- [ ] Criterion 1
- [ ] Criterion 2
```

## Example Project Skills

Full examples in this project:
- `.claude/skills/service-scaffolder/SKILL.md` - Generate microservice structure
- `.claude/skills/code-patterns/SKILL.md` - Enforce code conventions
- `.claude/skills/domain-planner/SKILL.md` - Plan DDD domain models

## Advanced Tips

- Add tags: `**Tags**: [framework] [pattern]`
- Include before/after comparisons
- Capture "why" decisions, not just rules
- Add cheat sheets for quick reference

## Maintenance

Update skills when:
- Code patterns changed
- Found better approach
- Team agreed new convention

Version your changes:
```markdown
## Changelog
- v1.1 (date): What changed
- v1.0 (date): Initial version
```
