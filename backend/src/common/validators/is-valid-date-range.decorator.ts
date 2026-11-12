import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isDateString,
} from "class-validator";

const MAX_INTERVAL_MILLISECONDS = 90 * 24 * 60 * 60 * 1000;
const ISO_8601_TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i;

interface DateRangeQuery {
  periodo?: unknown;
  inicio?: unknown;
  fim?: unknown;
}

@ValidatorConstraint({ name: "isValidDateRange", async: false })
class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const { periodo, inicio, fim } = args.object as DateRangeQuery;
    const hasPeriod = periodo !== undefined;
    const hasInicio = inicio !== undefined;
    const hasFim = fim !== undefined;

    if (periodo === null) {
      return false;
    }

    if (hasPeriod) {
      return !hasInicio && !hasFim;
    }

    if (!hasInicio && !hasFim) {
      return true;
    }

    if (!hasInicio || !hasFim) {
      return false;
    }

    if (!this.isAbsoluteIsoDate(inicio) || !this.isAbsoluteIsoDate(fim)) {
      return false;
    }

    const inicioMilliseconds = new Date(inicio).getTime();
    const fimMilliseconds = new Date(fim).getTime();
    const intervalMilliseconds = fimMilliseconds - inicioMilliseconds;

    return (
      Number.isFinite(inicioMilliseconds) &&
      Number.isFinite(fimMilliseconds) &&
      intervalMilliseconds > 0 &&
      intervalMilliseconds <= MAX_INTERVAL_MILLISECONDS
    );
  }

  defaultMessage(): string {
    return "Informe um período predefinido ou um intervalo ISO 8601 válido, com início anterior ao fim e duração máxima de 90 dias.";
  }

  private isAbsoluteIsoDate(value: unknown): value is string {
    return (
      typeof value === "string" &&
      isDateString(value, { strict: true, strictSeparator: true }) &&
      ISO_8601_TIMEZONE_SUFFIX.test(value)
    );
  }
}

export function IsValidDateRange(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "isValidDateRange",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: IsValidDateRangeConstraint,
    });
  };
}
