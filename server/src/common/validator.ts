/**
 * A focused port of Laravel's Validator, covering exactly the rules used by
 * this application's controllers.
 *
 * Why re-implement rather than use Zod directly: the controllers' rule strings
 * can then be copied across verbatim, which makes the port reviewable
 * line-by-line against the PHP, and the generated messages stay identical to
 * what the Vue error handlers already display.
 *
 * Semantics preserved from Laravel:
 *  - `sometimes`  → skip all rules when the key is absent from the payload
 *  - `nullable`   → skip all rules when the value is null/empty string
 *  - a missing, non-`required` key is simply not validated
 *  - every failing rule for a field is reported, keyed by field name
 */

import { ValidationException } from './errors';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ValidationContext {
  /** Resolves `unique:table,column` / `exists:table,column` against the DB. */
  countWhere?: (table: string, column: string, value: any) => Promise<number>;
}

type Payload = Record<string, any>;

/** `family_name` → `family name`, matching Laravel's :attribute formatting. */
function attr(field: string): string {
  return field.replace(/_/g, ' ').replace(/\.\*$/, '');
}

function isEmpty(v: any): boolean {
  return v === null || v === undefined || v === '';
}

function isFile(v: any): v is UploadedFile {
  return !!v && typeof v === 'object' && 'mimetype' in v && 'size' in v;
}

/** Laravel accepts these as booleans, including the string forms from FormData. */
function toBool(v: any): boolean | null {
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return null;
}

function parseDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (typeof v !== 'string' || v.trim() === '') return null;
  const d = new Date(v.length <= 10 ? `${v}T00:00:00Z` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export class Validator {
  private errors: Record<string, string[]> = {};

  constructor(
    private readonly data: Payload,
    private readonly rules: Record<string, string>,
    private readonly ctx: ValidationContext = {},
  ) {}

  private add(field: string, message: string) {
    (this.errors[field] ??= []).push(message);
  }

  async validate(): Promise<void> {
    for (const [field, ruleString] of Object.entries(this.rules)) {
      await this.applyField(field, ruleString.split('|'));
    }

    if (Object.keys(this.errors).length > 0) {
      throw new ValidationException(this.errors);
    }
  }

  private async applyField(field: string, rules: string[]) {
    // Array-item rules such as `photos.*`.
    if (field.endsWith('.*')) {
      const base = field.slice(0, -2);
      const items = this.data[base];
      if (Array.isArray(items)) {
        for (const item of items) await this.applyRules(field, item, rules);
      }
      return;
    }

    const present = field in this.data && this.data[field] !== undefined;
    const value = this.data[field];

    if (rules.includes('sometimes') && !present) return;

    // `required_without` / `required_if` decide presence dynamically.
    const conditional = rules.find(
      (r) => r.startsWith('required_without:') || r.startsWith('required_if:'),
    );
    if (conditional && isEmpty(value)) {
      if (this.conditionalApplies(conditional)) {
        this.add(field, this.conditionalMessage(field, conditional));
      }
      return;
    }

    if (rules.includes('required') && (isEmpty(value) || (Array.isArray(value) && !value.length))) {
      this.add(field, `The ${attr(field)} field is required.`);
      return;
    }

    // Absent optional field, or explicit null on a nullable field: nothing to check.
    if (!present || isEmpty(value)) return;

    await this.applyRules(field, value, rules);
  }

  private conditionalApplies(rule: string): boolean {
    const [name, arg] = rule.split(':');

    if (name === 'required_without') {
      return arg.split(',').some((other) => isEmpty(this.data[other]));
    }

    const [other, expected] = arg.split(',');
    return String(this.data[other]) === expected;
  }

  private conditionalMessage(field: string, rule: string): string {
    const [name, arg] = rule.split(':');

    if (name === 'required_without') {
      return `The ${attr(field)} field is required when ${arg.split(',').map(attr).join(' / ')} is not present.`;
    }

    const [other, expected] = arg.split(',');
    return `The ${attr(field)} field is required when ${attr(other)} is ${expected}.`;
  }

  private async applyRules(field: string, value: any, rules: string[]) {
    for (const rule of rules) {
      const [name, arg] = rule.split(/:(.+)/);
      await this.applyRule(field, value, name, arg);
    }
  }

  private async applyRule(field: string, value: any, name: string, arg?: string) {
    const a = attr(field);

    switch (name) {
      case 'required':
      case 'sometimes':
      case 'nullable':
      case 'file':
        return;

      case 'string':
        if (typeof value !== 'string') this.add(field, `The ${a} field must be a string.`);
        return;

      case 'integer':
        if (!/^-?\d+$/.test(String(value))) this.add(field, `The ${a} field must be an integer.`);
        return;

      case 'numeric':
        if (Number.isNaN(Number(value))) this.add(field, `The ${a} field must be a number.`);
        return;

      case 'boolean':
        if (toBool(value) === null) this.add(field, `The ${a} field must be true or false.`);
        return;

      case 'array':
        if (!Array.isArray(value)) this.add(field, `The ${a} field must be an array.`);
        return;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))
          this.add(field, `The ${a} field must be a valid email address.`);
        return;

      case 'date':
        if (!parseDate(value)) this.add(field, `The ${a} field must be a valid date.`);
        return;

      case 'date_format': {
        // Laravel accepts a comma-separated list of acceptable formats.
        const patterns: Record<string, RegExp> = {
          'H:i': /^([01]\d|2[0-3]):[0-5]\d$/,
          'H:i:s': /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
        };
        const formats = (arg ?? '').split(',');
        if (!formats.some((f) => patterns[f]?.test(String(value))))
          this.add(field, `The ${a} field must match the format ${arg}.`);
        return;
      }

      case 'size':
        if (String(value).length !== Number(arg))
          this.add(field, `The ${a} field must be ${arg} characters.`);
        return;

      case 'min': {
        const n = Number(arg);
        if (isFile(value)) {
          if (value.size / 1024 < n)
            this.add(field, `The ${a} field must be at least ${n} kilobytes.`);
        } else if (typeof value === 'string' && !/^-?\d+(\.\d+)?$/.test(value)) {
          if (value.length < n)
            this.add(field, `The ${a} field must be at least ${n} characters.`);
        } else if (Array.isArray(value)) {
          if (value.length < n) this.add(field, `The ${a} field must have at least ${n} items.`);
        } else if (Number(value) < n) {
          this.add(field, `The ${a} field must be at least ${n}.`);
        }
        return;
      }

      case 'max': {
        const n = Number(arg);
        if (isFile(value)) {
          // Laravel's file `max` is in kilobytes.
          if (value.size / 1024 > n)
            this.add(field, `The ${a} field must not be greater than ${n} kilobytes.`);
        } else if (typeof value === 'string' && !/^-?\d+(\.\d+)?$/.test(value)) {
          if (value.length > n)
            this.add(field, `The ${a} field must not be greater than ${n} characters.`);
        } else if (Number(value) > n) {
          this.add(field, `The ${a} field must not be greater than ${n}.`);
        }
        return;
      }

      case 'in':
        if (!(arg ?? '').split(',').includes(String(value)))
          this.add(field, `The selected ${a} is invalid.`);
        return;

      case 'image': {
        // Laravel's `image` rule accepts jpg, jpeg, png, bmp, gif, svg and webp.
        const imageTypes = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'svg', 'webp'];
        const imgExt = isFile(value)
          ? (value.originalname.split('.').pop() ?? '').toLowerCase()
          : '';
        if (!imageTypes.includes(imgExt)) this.add(field, `The ${a} field must be an image.`);
        return;
      }

      case 'mimes': {
        const allowed = (arg ?? '').split(',');
        const ext = isFile(value)
          ? (value.originalname.split('.').pop() ?? '').toLowerCase()
          : '';
        // `jpg` and `jpeg` are interchangeable in Laravel's mime map.
        const normalised = ext === 'jpeg' ? ['jpeg', 'jpg'] : [ext];
        if (!normalised.some((e) => allowed.includes(e)))
          this.add(field, `The ${a} field must be a file of type: ${arg}.`);
        return;
      }

      case 'confirmed':
        if (this.data[`${field}_confirmation`] !== value)
          this.add(field, `The ${a} field confirmation does not match.`);
        return;

      case 'after_or_equal': {
        const other = parseDate(this.data[arg!]);
        const self = parseDate(value);
        // Laravel skips the comparison when the referenced field is absent.
        if (other && self && self < other)
          this.add(field, `The ${a} field must be a date after or equal to ${attr(arg!)}.`);
        return;
      }

      case 'unique': {
        const [table, column = field] = (arg ?? '').split(',');
        const count = (await this.ctx.countWhere?.(table, column, value)) ?? 0;
        if (count > 0) this.add(field, `The ${a} has already been taken.`);
        return;
      }

      case 'exists': {
        const [table, column = 'id'] = (arg ?? '').split(',');
        const count = (await this.ctx.countWhere?.(table, column, value)) ?? 0;
        if (count === 0) this.add(field, `The selected ${a} is invalid.`);
        return;
      }

      default:
        throw new Error(`Unsupported validation rule "${name}" on field "${field}"`);
    }
  }
}

/** Convenience wrapper mirroring `Validator::make(...)->fails()`. */
export async function validate(
  data: Payload,
  rules: Record<string, string>,
  ctx: ValidationContext = {},
): Promise<void> {
  await new Validator(data, rules, ctx).validate();
}
