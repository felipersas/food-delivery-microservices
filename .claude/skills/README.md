# Local Skills - Food Delivery Microservices

Project-specific skills for enforcing DDD patterns, service scaffolding, and domain modeling.

## New Structure Standard

Skills now follow a **directory-based format**:

```
.claude/skills/
├── skill-name/
│   └── SKILL.md           # Skill instructions (required)
├── another-skill/
│   └── SKILL.md
└── README.md             # This file
```

## Available Skills

### [service-scaffolder](./service-scaffolder/SKILL.md)
**Generate new microservice structure following project DDD patterns**

Use when: Creating a new service from scratch

Covers:
- Directory structure template
- Aggregate root pattern
- Value object pattern
- Use case pattern
- Controller pattern
- Repository pattern
- Event consumer/publisher pattern
- Module and bootstrap patterns
- Naming conventions
- Required files checklist

### [code-patterns](./code-patterns/SKILL.md)
**Enforce project code patterns and conventions**

Use when: Writing code, reviewing code, refactoring

Covers:
- Domain layer patterns (aggregates, VOs, repositories)
- Application layer patterns (use cases, DTOs)
- Infrastructure layer patterns (controllers, entities, repos)
- Module patterns
- Token convention
- Configuration convention
- Event naming convention
- Error handling
- Anti-patterns to avoid

### [domain-planner](./domain-planner/SKILL.md)
**Plan domain models following DDD strategic patterns**

Use when: Designing new bounded contexts, aggregates

Covers:
- Bounded context identification
- Aggregate design guidelines
- Value object identification
- Domain event design
- Context mapping
- Ubiquitous language
- Service planning checklist

### [skill-creation-guide](./skill-creation-guide/SKILL.md)
**Guide and templates for creating efficient, reusable skills**

Use when: Creating new skills for this or other projects

Covers:
- 5 Core Principles for effective skills
- Directory-based structure format
- SKILL.md template with frontmatter
- Skill categories and examples
- Advanced tips and maintenance

## Usage

These skills are automatically loaded by Claude Code when working in this project. Reference them in conversations:

```
"Follow service-scaffolder patterns for the new service"
"Check code-patterns for the aggregate structure"
"Use domain-planner to design the delivery context"
```

## Adding New Skills

1. Create directory: `.claude/skills/your-skill-name/`
2. Create `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: One-line description
   triggers:
     - "trigger phrase 1"
     - "trigger phrase 2"
   tags: [category, framework, topic]
   ---
   ```
3. Write skill content following the template
4. Update this README

See [skill-creation-guide](./skill-creation-guide/SKILL.md) for full templates and examples.
