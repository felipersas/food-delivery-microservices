# DDD + TDD: Guia Pratico

Este documento explica os conceitos de **Domain-Driven Design (DDD)** e **Test-Driven Development (TDD)** aplicados neste projeto.

---

## Sumario

- [DDD: Domain-Driven Design](#ddd-domain-driven-design)
  - [A Filosofia](#a-filosofia)
  - [Bounded Contexts](#bounded-contexts)
  - [Ubiquitous Language](#ubiquitous-language)
  - [Camadas da Arquitetura](#camadas-da-arquitetura)
  - [Building Blocks do DDD](#building-blocks-do-ddd)
  - [Domain Events](#domain-events)
- [TDD: Test-Driven Development](#tdd-test-driven-development)
  - [A Filosofia](#a-filosofia-1)
  - [O Ciclo Red-Green-Refactor](#o-ciclo-red-green-refactor)
  - [Piramide de Testes](#piramide-de-testes)
  - [O que testamos neste projeto](#o-que-testamos-neste-projeto)
- [Como tudo se conecta](#como-tudo-se-conecta)

---

## DDD: Domain-Driven Design

### A Filosofia

DDD nao e uma arquitetura. E uma **forma de pensar** sobre software.

A ideia central: **o software existe para resolver problemas de negocio**. O codigo deve refletir o dominio (o mundo real do negocio), nao abstracoes genericas de banco de dados ou frameworks.

> "If you cant explain the code to a domain expert, the model is wrong." — Eric Evans

No nosso caso: o dominio e **pedidos de comida**. O codigo fala de `Order`, `OrderItem`, `KitchenTicket`, `Payment` — nao de "tabela orders" ou "registro no banco".

### Bounded Contexts

Um sistema complexo nao pode ser descrito por um unico modelo. DDD divide o sistema em **contextos delimitados**, cada um com seu proprio modelo, sua propria linguagem, e suas proprias regras.

No nosso projeto:

| Bounded Context | Responsabilidade | Modelo principal |
|---|---|---|
| **Order** | Gerencia pedidos | `Order` aggregate |
| **Kitchen** | Prepara os itens | `KitchenTicket` aggregate |
| **Payment** | Processa pagamentos | `Payment` aggregate |
| **Notification** | Envia alertas | Handler de eventos |
| **Analytics** | Acumula metricas | Handler de eventos |

**Exemplo pratico:** O conceito de "pedido" significa coisas diferentes em cada contexto:
- No **Order**: um pedido tem itens, status, total
- Na **Kitchen**: um pedido e uma lista de itens pra preparar
- No **Payment**: um pedido e um valor a cobrar

Cada contexto tem seu proprio modelo. Eles nao compartilham entidades — compartilham **eventos**.

### Ubiquitous Language

Cada bounded context tem sua propria **linguagem ubiqua** — um vocabulario compartilhado entre devs e domain experts.

Se o dev fala "Order" e o chef fala "comanda", tem um problema. A linguagem deve ser a mesma em conversas, documentos, e codigo.

No nosso codigo: `Order.create()`, `order.confirm()`, `order.startPreparing()` — o codigo *e* a linguagem do dominio.

### Camadas da Arquitetura

Cada bounded context segue uma arquitetura em camadas com dependencia apontando pra dentro:

```
  ┌─────────────────────────┐
  │        HTTP / MQ        │  ← Interface externa
  │    (Controllers,        │
  │     Consumers)          │
  ├─────────────────────────┤
  │     Application         │  ← Casos de uso
  │  (Use Cases, DTOs)      │     Orquestra, nao tem regra
  ├─────────────────────────┤
  │      Domain             │  ← O CORACAO
  │  (Aggregates, VOs,      │     Regras de negocio puras
  │   Events, Repositories) │     Zero dependencia externa
  ├─────────────────────────┤
  │     Infrastructure      │  ← Detalhes tecnicos
  │  (Database, RabbitMQ,   │     Implementa interfaces do domain
  │   External APIs)        │
  └─────────────────────────┘
```

**Regra de ouro:** O domain nunca importa nada das outras camadas. As outras camadas importam do domain.

No codigo:
- `domain/` importa so de `@app/shared` (que tambem e domain puro)
- `application/` importa de `domain/`
- `infra/` importa de `domain/` e `application/`
- `infra/` nunca e importada por ninguem

### Building Blocks do DDD

#### Entity (Entidade)

Um objeto que tem **identidade propria**. Dois objetos podem ter os mesmos dados mas serem entidades diferentes se tiverem IDs diferentes.

```
Pedido #123 e Pedido #456 sao diferentes,
mesmo que ambos tenham "2 X-Burgers".
```

No codigo: `class Order extends AggregateRoot<string>` — a identidade e o `id`.

#### Value Object (Objeto de Valor)

Um objeto definido **pelos seus atributos**, nao por identidade. Dois VOs com os mesmos atributos sao iguais. Sao **imutaveis**.

```
Money.BRL(50) === Money.BRL(50)  → verdadeiro
OrderStatus.pending() === OrderStatus.pending()  → verdadeiro
```

Caracteristicas:
- **Imutavel** — nunca muda, cria um novo
- **Sem identidade** — comparado pelo valor
- **Auto-validavel** — nao existe Money com valor negativo (por exemplo)

No codigo: `Money`, `OrderStatus`, `OrderItem` sao VOs.

#### Aggregate Root (Raiz de Agregacao)

Um **cluster de objetos** tratado como uma unidade. O Aggregate Root e o "porteiro" — tudo que esta dentro do aggregate so pode ser acessado atraves dele.

```
Order (Aggregate Root)
  ├── OrderItem (VO, vive dentro do Order)
  ├── OrderStatus (VO, vive dentro do Order)
  └── Domain Events (emitidos pelo Order)
```

Regras:
1. Toda modificacao interna passa pelo Aggregate Root
2. Fora do aggregate, voce so referencia pelo ID, nao pelo objeto
3. Uma transacao = um aggregate

No codigo: `Order.create()`, `order.confirm()`, `order.cancel()` — todas as modificacoes passam pelo aggregate.

#### Repository (Repositorio)

Uma **interface** que abstrai a persistencia. O domain define *o que* precisa (salvar, buscar), a infra define *como* (Postgres, MongoDB, in-memory).

```typescript
// Domain define a interface
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// Infra implementa
class InMemoryOrderRepository implements OrderRepository { ... }
class PostgresOrderRepository implements OrderRepository { ... }
```

O domain nunca sabe se esta salvando em memoria, num banco, ou num arquivo. Isso permite testar o domain puro sem infra.

#### Domain Service

Quando uma logica de negocio **nao pertence a nenhuma entidade ou VO** especificamente, ela vira um Domain Service.

Exemplo: `PricingService.calculateTotal(order, coupons, taxes)` — a logica envolve multiplos conceitos, nao so o Order.

*(Nosso projeto ainda nao tem domain services, mas o padrao esta pronto no shared kernel.)*

### Domain Events

Domain Events representam **coisas que aconteceram** no dominio. Sao a cola entre bounded contexts.

```
Order cria → emite OrderCreated
Payment confirma → emite PaymentConfirmed
Kitchen finaliza → emite OrderReady
```

No codigo:
```typescript
order.addDomainEvent({
  eventId: uuidv4(),
  eventType: 'order.created',
  occurredAt: new Date().toISOString(),
  aggregateId: order.getId(),
  aggregateType: 'Order',
  data: { orderId, customerId, items, totalAmount },
});
```

**Fluxo:**
1. Aggregate Root acumula eventos internamente
2. Application Service salva no repositorio
3. Application Service publica os eventos (RabbitMQ)
4. Outros bounded contexts consomem e reagem

**Por que isso importa?** Desacoplamento. O Order Service nao precisa saber que existe Kitchen Service. Ele so emite "pedido criado". Quem quiser ouvir, ouve.

---

## TDD: Test-Driven Development

### A Filosofia

TDD inverte a ordem tradicional: **escreva o teste primeiro, depois o codigo**.

> "If you cant write a test for it, you dont understand the requirement." — Kent Beck

Beneficios:
- **Design guiado por uso** — voce escreve a API que gostaria de ter, depois implementa
- **Seguranca pra refatorar** — testes verde = codigo funciona
- **Documentacao viva** — os testes descrevem o comportamento esperado
- **Menos bugs** — voce pensa nos edge cases antes de codar

### O Ciclo Red-Green-Refactor

```
   ┌──────────┐
   │   RED    │  1. Escreve um teste que FALHA
   │          │     (define o comportamento desejado)
   └────┬─────┘
        ▼
   ┌──────────┐
   │  GREEN   │  2. Escreve o codigo minimo pra passar
   │          │     (sem over-engineering)
   └────┬─────┘
        ▼
   ┌──────────┐
   │ REFACTOR │  3. Melhora o codigo mantendo testes verde
   │          │     (remove duplicacao, melhora nomes)
   └──────────┘
```

#### Exemplo real do nosso projeto

**RED** — Escrevemos o teste:
```typescript
it('should NOT transition from PENDING to PREPARING', () => {
  const order = makeOrder();
  expect(() => order.startPreparing()).toThrow();
});
```
Teste falha porque `startPreparing()` ainda nao existe ou nao valida a transicao.

**GREEN** — Implementamos o minimo:
```typescript
startPreparing(): void {
  this.transitionTo(OrderStatus.preparing());
}

private transitionTo(newStatus: OrderStatus): void {
  if (!this.status.canTransitionTo(newStatus)) {
    throw new Error(`Cannot transition from ${this.status.value} to ${newStatus.value}`);
  }
  this.status = newStatus;
}
```
Teste passa.

**REFACTOR** — A transicao ja esta generica, reutilizavel por todos os metodos. Nada a refatorar.

### Piramide de Testes

```
         ╱  E2E  ╲           Poucos, lentos, testam tudo integrado
        ╱──────────╲
       ╱ Integration ╲       Alguns, testam repo + filas reais
      ╱────────────────╲
     ╱     Unit          ╲   Muitos, rapidos, testam domain puro
    ╱──────────────────────╲
```

No nosso projeto:
- **Unit (base da piramide):** Aggregate, VOs, use cases com mocks — roda em ms
- **Integration (meio):** Repositorio com banco real, publisher com RabbitMQ real
- **E2E (topo):** HTTP → service completo → banco → fila → resultado

### O que testamos neste projeto

#### Domain (Unit tests puros)

```typescript
// Aggregate: state machine, events, transitions
describe('Order Aggregate', () => {
  it('should create an order with PENDING status', () => { ... });
  it('should emit OrderCreated domain event', () => { ... });
  it('should NOT transition from PENDING to PREPARING', () => { ... });
});
```

**Por que:** O domain e a parte mais importante. Regras de negocio puras, zero dependencia externa, testes instantaneos.

#### Application (Unit tests com mocks)

```typescript
// Use case: orquestracao com dependencias mockadas
describe('CreateOrderUseCase', () => {
  it('should create an order and persist it', async () => { ... });
  it('should publish domain events after saving', async () => { ... });
});
```

**Por que:** Testamos que o use case faz a orquestracao certa (cria → salva → publica). O repositorio e o publisher sao mocks — testamos o fluxo, nao o banco.

---

## Como tudo se conecta

O fluxo completo de um pedido, mostrando como DDD e TDD trabalham juntos:

```
1. [TDD] Escrevemos teste: "Order deve emitir OrderCreated"
2. [DDD] Implementamos Order.create() com domain event
3. [TDD] Escrevemos teste: "CreateOrderUseCase deve publicar eventos"
4. [DDD] Implementamos use case com Repository + EventPublisher (ports)
5. [DDD] Implementamos InMemoryOrderRepository e RabbitMQEventPublisher (adapters)
6. [TDD] Testamos tudo integrado
```

```
Cliente → POST /orders
  → OrderController (infra)
    → CreateOrderUseCase (application)
      → Order.create() (domain) → emite OrderCreated
      → orderRepository.save() (infra)
      → eventPublisher.publishAll() (infra) → RabbitMQ
        → Kitchen Service consome → BullMQ queue
        → Payment Service consome → processa pagamento
        → Notification Service consome → envia alerta
        → Analytics Service consome → acumula metricas
```

### Praticas que usamos

| Practica | Onde | Exemplo |
|---|---|---|
| **Dependency Inversion** | Domain define interfaces | `OrderRepository` e interface |
| **Ports & Adapters** | Application define ports | `EventPublisher` e port |
| **Immutability** | Value Objects | `Money.BRL(50)` nunca muda |
| **State Machine** | Aggregate Root | `OrderStatus` com transicoes validas |
| **Event-Driven** | Domain Events | `OrderCreated` desacopla services |
| **Test First** | TDD | Teste do aggregate antes do use case |
| **Mock at boundaries** | Testes de application | Repository e Publisher sao mocks |
| **Monorepo, micro deploy** | Estrutura | Codigo junto, deploy separado |

---

## Referencias

- *Domain-Driven Design* — Eric Evans (2003)
- *Implementing Domain-Driven Design* — Vaughn Vernon (2013)
- *Test-Driven Development: By Example* — Kent Beck (2002)
- *Clean Architecture* — Robert C. Martin (2017)
