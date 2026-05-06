# Local Skills - Food Delivery Microservices

Project-specific skills for enforcing DDD patterns, service scaffolding, and domain modeling.

## Available Skills

### [service-scaffolder](./service-scaffolder.md)
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

### [code-patterns](./code-patterns.md)
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

### [domain-planner](./domain-planner.md)
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

## Usage

These skills are automatically loaded by Claude Code when working in this project. Reference them in conversations:

```
"Follow service-scaffolder patterns for the new service"
"Check code-patterns for the aggregate structure"
"Use domain-planner to design the delivery context"
```

## Adding New Skills

1. Create file in `.claude/skills/`
2. Add frontmatter with:
   - `name`: skill identifier
   - `description`: what it does
   - `triggers`: keywords that invoke it
   - `tags`: categorization

3. Update this README

See [oh-my-claudecode](https://github.com/oh-my-claudecode/oh-my-claudecode) documentation for full skill format reference.
