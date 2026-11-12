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

  defaultMessage(args: ValidationArguments): string {
    const { periodo, inicio, fim } = args.object as DateRangeQuery;

    if (periodo === null) {
      return "periodo deve ser um período predefinido válido.";
    }

    if (periodo !== undefined) {
      return "Não combine periodo com inicio ou fim.";
    }

    if ((inicio === undefined) !== (fim === undefined)) {
      return "Informe inicio e fim para um período customizado.";
    }

    if (inicio === undefined && fim === undefined) {
      return "Informe um período predefinido válido.";
    }

    if (!this.isIsoDate(inicio) || !this.isIsoDate(fim)) {
      return "inicio e fim devem ser datas válidas em ISO 8601.";
    }

    if (!this.hasTimezone(inicio) || !this.hasTimezone(fim)) {
      return "inicio e fim devem incluir Z ou um offset de fuso horário.";
    }

    const intervalMilliseconds =
      new Date(fim).getTime() - new Date(inicio).getTime();

    if (intervalMilliseconds <= 0) {
      return "inicio deve ser anterior a fim.";
    }

    return "O intervalo entre inicio e fim não pode exceder 90 dias.";
  }

  private isAbsoluteIsoDate(value: unknown): value is string {
    return this.isIsoDate(value) && this.hasTimezone(value);
  }

  private isIsoDate(value: unknown): value is string {
    return (
      typeof value === "string" &&
      isDateString(value, { strict: true, strictSeparator: true })
    );
  }

  private hasTimezone(value: string): boolean {
    return ISO_8601_TIMEZONE_SUFFIX.test(value);
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
