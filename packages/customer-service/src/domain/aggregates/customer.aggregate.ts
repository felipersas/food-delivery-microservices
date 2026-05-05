import { AggregateRoot, DomainException } from '@app/shared';
import { CustomerStatus, CustomerStatusEnum } from '../value-objects/customer-status.vo';
import { CustomerAddress } from '../value-objects/customer-address.vo';
import { PaymentMethod } from '../value-objects/payment-method.vo';
import { v4 as uuidv4 } from 'uuid';

export interface CustomerProfileProps {
  name: string;
  email: string;
  phone: string;
}

export class Customer extends AggregateRoot<string> {
  private name: string;
  private email: string;
  private phone: string;
  private status: CustomerStatus;
  private addresses: CustomerAddress[];
  private paymentMethods: PaymentMethod[];
  private totalOrders: number;
  private totalSpent: number;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    status?: CustomerStatus;
    addresses?: CustomerAddress[];
    paymentMethods?: PaymentMethod[];
    totalOrders?: number;
    totalSpent?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(props.id ?? uuidv4());
    this.name = props.name;
    this.email = props.email.toLowerCase();
    this.phone = props.phone;
    this.status = props.status ?? CustomerStatus.active();
    this.addresses = props.addresses ?? [];
    this.paymentMethods = props.paymentMethods ?? [];
    this.totalOrders = props.totalOrders ?? 0;
    this.totalSpent = props.totalSpent ?? 0;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static reconstitute(props: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: CustomerStatusEnum;
    addresses: CustomerAddress[];
    paymentMethods: PaymentMethod[];
    totalOrders: number;
    totalSpent: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): Customer {
    const customer = new Customer({
      id: props.id,
      name: props.name,
      email: props.email,
      phone: props.phone,
      addresses: props.addresses,
      paymentMethods: props.paymentMethods,
      totalOrders: props.totalOrders,
      totalSpent: props.totalSpent,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
    (customer as any).status = new CustomerStatus(props.status);
    for (let i = 0; i < props.version; i++) {
      customer.incrementVersion();
    }
    return customer;
  }

  static create(props: CustomerProfileProps): Customer {
    Customer.validateEmail(props.email);
    Customer.validatePhone(props.phone);

    const customer = new Customer({
      name: props.name.trim(),
      email: props.email,
      phone: props.phone,
    });

    customer.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'customer.created',
      occurredAt: new Date().toISOString(),
      aggregateId: customer.getId(),
      aggregateType: 'Customer',
      data: {
        customerId: customer.getId(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.getStatus(),
      },
    });

    return customer;
  }

  updateProfile(props: Partial<CustomerProfileProps>): void {
    if (props.name) {
      this.name = props.name.trim();
    }
    if (props.email) {
      Customer.validateEmail(props.email);
      this.email = props.email.toLowerCase();
    }
    if (props.phone) {
      Customer.validatePhone(props.phone);
      this.phone = props.phone;
    }
    this.markAsUpdated();
    this.incrementVersion();
  }

  addAddress(addressProps: {
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    zipCode: string;
  }): void {
    const address = CustomerAddress.create({
      ...addressProps,
      isDefault: this.addresses.length === 0, // First address is default
    });

    // Remove default from others if this is default
    if (address.isDefault) {
      this.addresses = this.addresses.map((a) => a.removeDefault());
    }

    this.addresses.push(address);
    this.markAsUpdated();
    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'customer.address.added',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Customer',
      data: {
        customerId: this.getId(),
        address: {
          street: address.street,
          number: address.number,
          city: address.city,
          state: address.state,
        },
      },
    });
  }

  removeAddress(addressIndex: number): void {
    if (addressIndex < 0 || addressIndex >= this.addresses.length) {
      throw new DomainException('Invalid address index');
    }

    const removedAddress = this.addresses[addressIndex];
    this.addresses.splice(addressIndex, 1);

    // If removed was default, make first remaining default
    if (removedAddress.isDefault && this.addresses.length > 0) {
      this.addresses[0] = this.addresses[0].makeDefault();
    }

    this.markAsUpdated();
    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'customer.address.removed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Customer',
      data: {
        customerId: this.getId(),
      },
    });
  }

  savePaymentMethod(paymentMethodProps: {
    token: string;
    brand: 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'discover';
    expiryMonth: number;
    expiryYear: number;
  }): void {
    const paymentMethod = PaymentMethod.create({
      ...paymentMethodProps,
      isDefault: this.paymentMethods.length === 0, // First is default
    });

    // Remove default from others if this is default
    if (paymentMethod.isDefault) {
      this.paymentMethods = this.paymentMethods.map((p) => p.removeDefault());
    }

    this.paymentMethods.push(paymentMethod);
    this.markAsUpdated();
    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'customer.payment-method.added',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Customer',
      data: {
        customerId: this.getId(),
        brand: paymentMethod.brand,
        last4: paymentMethod.token,
      },
    });
  }

  removePaymentMethod(paymentMethodIndex: number): void {
    if (paymentMethodIndex < 0 || paymentMethodIndex >= this.paymentMethods.length) {
      throw new DomainException('Invalid payment method index');
    }

    const removedMethod = this.paymentMethods[paymentMethodIndex];
    this.paymentMethods.splice(paymentMethodIndex, 1);

    // If removed was default, make first remaining default
    if (removedMethod.isDefault && this.paymentMethods.length > 0) {
      this.paymentMethods[0] = this.paymentMethods[0].makeDefault();
    }

    this.markAsUpdated();
    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'customer.payment-method.removed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Customer',
      data: {
        customerId: this.getId(),
      },
    });
  }

  recordOrder(amount: number): void {
    this.totalOrders++;
    this.totalSpent += amount;
    this.incrementVersion();
  }

  activate(): void {
    this.transitionTo(CustomerStatus.active());
    this.markAsUpdated();
  }

  deactivate(): void {
    this.transitionTo(CustomerStatus.inactive());
    this.markAsUpdated();
  }

  suspend(): void {
    this.transitionTo(CustomerStatus.suspended());
    this.markAsUpdated();
  }

  // Getters
  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getPhone(): string {
    return this.phone;
  }

  getStatus(): CustomerStatusEnum {
    return this.status.value;
  }

  getAddresses(): CustomerAddress[] {
    return [...this.addresses];
  }

  getPaymentMethods(): PaymentMethod[] {
    return [...this.paymentMethods];
  }

  getTotalOrders(): number {
    return this.totalOrders;
  }

  getTotalSpent(): number {
    return this.totalSpent;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private transitionTo(newStatus: CustomerStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Cannot transition from ${this.status.value} to ${newStatus.value}`,
      );
    }
    this.status = newStatus;
  }

  private markAsUpdated(): void {
    this.updatedAt = new Date();
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'customer.updated',
      occurredAt: this.updatedAt.toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Customer',
      data: {
        customerId: this.getId(),
        name: this.name,
        email: this.email,
        status: this.getStatus(),
      },
    });
  }

  private static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainException('Invalid email format');
    }
  }

  private static validatePhone(phone: string): void {
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      throw new DomainException('Invalid phone number format. Use country code + numbers only.');
    }
  }
}
