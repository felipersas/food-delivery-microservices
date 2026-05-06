# Restaurant Service - Implementation Plan

## Bounded Context

**Responsibility**: Restaurant profile management, menu catalog, availability control.

**Ubiquitous Language**:
- **Restaurant**: Food establishment registered on platform
- **Menu**: Catalog of items available for ordering
- **Category**: Menu item grouping (e.g., "Pizzas", "Beverages")
- **MenuItem**: Individual product with price, description, availability
- **OperatingHours**: Time ranges when restaurant accepts orders
- **Availability**: Whether restaurant/ menu item is currently orderable

## Domain Model

### Aggregates

#### Restaurant (Root)
```typescript
class Restaurant extends AggregateRoot<string> {
  private ownerId: string;
  private name: string;
  private description: string;
  private address: Address;
  private phone: string;
  private email: string;
  private operatingHours: OperatingHours[];
  private status: RestaurantStatus;
  private averageRating: number;
  private totalRatings: number;
  private deliveryFeeCents: number;
  private minOrderCents: number;
  private estimatedPrepTimeMinutes: number;
}
```

**State Transitions**:
```
PENDING → ACTIVE → SUSPENDED → CLOSED
              ↓          ↓
           INACTIVE   INACTIVE
```

**Business Rules**:
- Name required, max 100 chars
- Phone must be valid Brazilian format
- At least one operating hour range required
- Cannot activate without menu items
- Delivery fee >= 0
- Min order >= 0

#### Menu (Aggregate - Separate from Restaurant)
```typescript
class Menu extends AggregateRoot<string> {
  private restaurantId: string;
  private categories: MenuCategory[];
  private isActive: boolean;
}
```

**Why Separate?**
- Menu changes frequently (daily updates)
- Restaurant changes rarely (profile updates)
- Optimistic locking conflicts isolated
- Different access patterns

#### MenuCategory (Entity within Menu)
```typescript
class MenuCategory {
  private id: string;
  private name: string;
  private description?: string;
  private items: MenuItem[];
  private displayOrder: number;
}
```

#### MenuItem (Entity within Category)
```typescript
class MenuItem {
  private id: string;
  private name: string;
  private description: string;
  private priceCents: number;
  private imageUrl?: string;
  private isAvailable: boolean;
  private preparationTimeMinutes: number;
  private displayOrder: number;
}
```

### Value Objects

#### Address
```typescript
interface AddressProps {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;  // 2 chars
  zipCode: string;  // XXXXX-XXX
  latitude?: number;
  longitude?: number;
}
```

#### OperatingHours
```typescript
interface OperatingHoursProps {
  dayOfWeek: 0-6;  // 0 = Sunday
  openTime: string;  // HH:MM
  closeTime: string;  // HH:MM
}
```

#### RestaurantStatus (Value Object with state machine)
```typescript
enum RestaurantStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  CLOSED = 'closed'
}
```

## Domain Events

| Event | Published By | Consumed By | Payload |
|-------|--------------|-------------|---------|
| `restaurant.created` | Restaurant | Analytics | restaurantId, ownerId, name, address |
| `restaurant.activated` | Restaurant | Order, Analytics | restaurantId |
| `restaurant.suspended` | Restaurant | Order | restaurantId, reason |
| `restaurant.updated` | Restaurant | Analytics | restaurantId, changedFields |
| `restaurant.menu.created` | Menu | Kitchen, Analytics | restaurantId, menuId |
| `restaurant.menu.item.added` | Menu | Order, Kitchen | restaurantId, itemId, name, priceCents |
| `restaurant.menu.item.updated` | Menu | Order, Kitchen | restaurantId, itemId, name, priceCents, isAvailable |
| `restaurant.menu.item.removed` | Menu | Order, Kitchen | restaurantId, itemId |
| `restaurant.menu.category.added` | Menu | - | restaurantId, categoryId, name |
| `restaurant.menu.category.removed` | Menu | - | restaurantId, categoryId |

## API Endpoints

### Restaurant Management
```
POST   /restaurants                    # Create restaurant
GET    /restaurants/:id                # Get restaurant details
PUT    /restaurants/:id                # Update restaurant
PATCH  /restaurants/:id/status         # Change status
DELETE /restaurants/:id                # Deactivate (soft delete)

GET    /restaurants                    # List restaurants
Query: ?lat=X&lng=Y&radiusKm=5        # Geospatial search
       ?status=active                  # Filter by status
       ?search=pizza                   # Name search
```

### Menu Management
```
POST   /restaurants/:id/menus          # Create menu
GET    /restaurants/:id/menus          # List menus
GET    /restaurants/:id/menus/active   # Get active menu
PUT    /menus/:id                      # Update menu
DELETE /menus/:id                      # Delete menu
```

### Category Management
```
POST   /menus/:id/categories           # Add category
PUT    /categories/:id                 # Update category
DELETE /categories/:id                 # Remove category
PATCH  /categories/:id/order           # Reorder
```

### Item Management
```
POST   /categories/:id/items           # Add item
PUT    /items/:id                      # Update item
DELETE /items/:id                      # Remove item
PATCH  /items/:id/availability         # Toggle availability
PATCH  /items/:id/order                # Reorder item
PATCH  /items/batch/availability       # Batch update availability
```

### Availability
```
GET    /restaurants/:id/availability   # Check if open now
GET    /restaurants/nearby/available    # Open restaurants near location
```

## Database Schema

### restaurants Table
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  street VARCHAR(100) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(100),
  neighborhood VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  state CHAR(2) NOT NULL,
  zip_code VARCHAR(9) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  delivery_fee_cents INTEGER DEFAULT 0,
  min_order_cents INTEGER DEFAULT 0,
  estimated_prep_time_minutes INTEGER DEFAULT 30,
  version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_restaurants_location ON restaurants (latitude, longitude);
CREATE INDEX idx_restaurants_status ON restaurants (status);
CREATE INDEX idx_restaurants_owner ON restaurants (owner_id);
```

### operating_hours Table
```sql
CREATE TABLE operating_hours (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL
);

CREATE INDEX idx_operating_hours_restaurant ON operating_hours(restaurant_id);
```

### menus Table
```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_menus_restaurant ON menus(restaurant_id);
CREATE INDEX idx_menus_active ON menus(restaurant_id, is_active);
```

### menu_categories Table
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_menu ON menu_categories(menu_id);
```

### menu_items Table
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  image_url VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  preparation_time_minutes INTEGER DEFAULT 15,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_items_category ON menu_items(category_id);
CREATE INDEX idx_items_available ON menu_items(is_available);
```

## Event Subscriptions

### Incoming Events (Consumed)
- `customer.created` - Track restaurant owners (if owner = customer)
- `order.created` - Update popularity metrics

### Outgoing Events (Published)
- All restaurant events as defined above

## File Structure
```
packages/restaurant-service/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   │   ├── restaurant.aggregate.ts
│   │   │   └── menu.aggregate.ts
│   │   ├── value-objects/
│   │   │   ├── restaurant-address.vo.ts
│   │   │   ├── operating-hours.vo.ts
│   │   │   └── restaurant-status.vo.ts
│   │   ├── entities/
│   │   │   ├── menu-category.entity.ts
│   │   │   └── menu-item.entity.ts
│   │   └── repositories/
│   │       ├── restaurant.repository.interface.ts
│   │       └── menu.repository.interface.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── create-restaurant/
│   │   │   ├── update-restaurant/
│   │   │   ├── activate-restaurant/
│   │   │   ├── list-restaurants/
│   │   │   ├── create-menu/
│   │   │   ├── add-menu-item/
│   │   │   ├── update-item-availability/
│   │   │   └── check-availability/
│   │   └── dto/
│   ├── infra/
│   │   ├── database/
│   │   │   ├── typeorm/entities/
│   │   │   └── typeorm/repositories/
│   │   ├── http/
│   │   │   ├── restaurant.controller.ts
│   │   │   ├── menu.controller.ts
│   │   │   └── category.controller.ts
│   │   └── messaging/
│   │       └── rabbitmq/
│   ├── config/
│   ├── tokens.ts
│   ├── main.ts
│   └── restaurant.module.ts
└── package.json
```

## Configuration
```typescript
// environment
RESTAURANT_PORT=3007
RESTAURANT_DATABASE_URL=postgresql://postgres:postgres@localhost:5437/restaurants

// root package.json scripts
"dev:restaurant": "bun run --workspace packages/restaurant-service/src/main.ts",
"test:restaurant": "bun test --workspace packages/restaurant-service"
```

## Implementation Phases

### Phase 1: Core Restaurant (MVP)
- [ ] Restaurant aggregate + value objects
- [ ] CreateRestaurantUseCase
- [ ] GetRestaurantUseCase
- [ ] ListRestaurantsUseCase
- [ ] RestaurantController (CRUD)
- [ ] In-memory + PostgreSQL repos
- [ ] Events: restaurant.created, restaurant.updated

### Phase 2: Status & Availability
- [ ] RestaurantStatus value object + transitions
- [ ] ActivateRestaurantUseCase
- [ ] SuspendRestaurantUseCase
- [ ] CheckAvailabilityUseCase
- [ ] OperatingHours value object
- [ ] Events: restaurant.activated, restaurant.suspended

### Phase 3: Menu Management
- [ ] Menu aggregate
- [ ] MenuCategory + MenuItem entities
- [ ] CreateMenuUseCase
- [ ] AddCategoryUseCase, AddItemUseCase
- [ ] UpdateAvailabilityUseCase
- [ ] MenuController
- [ ] Events: all menu events

### Phase 4: Advanced Features
- [ ] Geospatial search (nearby restaurants)
- [ ] Image upload for menu items
- [ ] Bulk availability updates
- [ ] Menu versioning/history
- [ ] Analytics integration

## Dependencies
```json
{
  "name": "restaurant-service",
  "dependencies": {
    "@app/shared": "workspace:*",
    "@app/messaging": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.17",
    "uuid": "^9.0.0",
    "joi": "^17.9.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  }
}
```

## Testing Strategy
- **Unit**: Aggregates, value objects (in-memory)
- **Integration**: Repositories with test DB
- **E2E**: API endpoints + event publishing
- **Contract**: OpenAPI schema validation

## Open Questions
1. **Multi-tenant?** Should one owner have multiple restaurants?
2. **Menu approval?** Should menu changes require approval?
3. **Image storage?** S3, local, or external service?
4. **Geospatial?** PostGIS extension or simple distance calc?
