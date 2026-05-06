import { ValueObject, InvalidStateException } from '@app/shared';

export interface OperatingHoursProps {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
}

export class OperatingHours extends ValueObject<OperatingHoursProps> {
  private constructor(props: OperatingHoursProps) {
    super(props);
  }

  static create(props: OperatingHoursProps): OperatingHours {
    OperatingHours.validate(props);
    return new OperatingHours(props);
  }

  private static validate(props: OperatingHoursProps): void {
    if (props.dayOfWeek < 0 || props.dayOfWeek > 6) {
      throw new InvalidStateException('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }
    if (!OperatingHours.isValidTimeFormat(props.openTime)) {
      throw new InvalidStateException('Open time must be in HH:MM format');
    }
    if (!OperatingHours.isValidTimeFormat(props.closeTime)) {
      throw new InvalidStateException('Close time must be in HH:MM format');
    }
    if (OperatingHours.timeToMinutes(props.closeTime) <= OperatingHours.timeToMinutes(props.openTime)) {
      throw new InvalidStateException('Close time must be after open time');
    }
  }

  private static isValidTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  get dayOfWeek(): number {
    return this.props.dayOfWeek;
  }

  get openTime(): string {
    return this.props.openTime;
  }

  get closeTime(): string {
    return this.props.closeTime;
  }

  getDayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[this.props.dayOfWeek];
  }

  isOpenAt(date: Date): boolean {
    const day = date.getDay();
    if (day !== this.props.dayOfWeek) {
      return false;
    }

    const currentTime = date.getHours() * 60 + date.getMinutes();
    const openMinutes = OperatingHours.timeToMinutes(this.props.openTime);
    const closeMinutes = OperatingHours.timeToMinutes(this.props.closeTime);

    return currentTime >= openMinutes && currentTime < closeMinutes;
  }
}
