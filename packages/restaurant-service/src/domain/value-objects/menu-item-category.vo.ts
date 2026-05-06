import { ValueObject, DomainException } from '@app/shared';

export enum MenuItemCategoryEnum {
  APPETIZER = 'appetizer',
  MAIN = 'main',
  DESSERT = 'dessert',
  DRINK = 'drink',
  SIDE = 'side',
}

export class MenuItemCategory extends ValueObject<{ value: MenuItemCategoryEnum }> {
  private constructor(value: MenuItemCategoryEnum) {
    super({ value });
  }

  static appetizer(): MenuItemCategory {
    return new MenuItemCategory(MenuItemCategoryEnum.APPETIZER);
  }

  static main(): MenuItemCategory {
    return new MenuItemCategory(MenuItemCategoryEnum.MAIN);
  }

  static dessert(): MenuItemCategory {
    return new MenuItemCategory(MenuItemCategoryEnum.DESSERT);
  }

  static drink(): MenuItemCategory {
    return new MenuItemCategory(MenuItemCategoryEnum.DRINK);
  }

  static side(): MenuItemCategory {
    return new MenuItemCategory(MenuItemCategoryEnum.SIDE);
  }

  static fromString(value: string): MenuItemCategory {
    if (!Object.values(MenuItemCategoryEnum).includes(value as MenuItemCategoryEnum)) {
      throw new DomainException(`Invalid menu item category: ${value}`);
    }
    return new MenuItemCategory(value as MenuItemCategoryEnum);
  }

  get enumValue(): MenuItemCategoryEnum {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }

  isAppetizer(): boolean {
    return this.props.value === MenuItemCategoryEnum.APPETIZER;
  }

  isMain(): boolean {
    return this.props.value === MenuItemCategoryEnum.MAIN;
  }

  isDessert(): boolean {
    return this.props.value === MenuItemCategoryEnum.DESSERT;
  }

  isDrink(): boolean {
    return this.props.value === MenuItemCategoryEnum.DRINK;
  }

  isSide(): boolean {
    return this.props.value === MenuItemCategoryEnum.SIDE;
  }
}
