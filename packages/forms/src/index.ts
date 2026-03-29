// @akashjs/forms — Entry point

// Form creation
export { defineForm, defineFormGroup } from './form.js';

// Field creation (advanced use)
export { createField } from './field.js';

// Built-in validators
export { required, minLength, maxLength, min, max, pattern, email, custom } from './validators.js';

// Validation engine (advanced use)
export { createValidation } from './validation.js';

// Zod adapter
export { zodFieldValidator, zodAsyncFieldValidator, zodValidator } from './zod.js';

// Schema-driven forms
export { createFormFromSchema, getSchemaFields } from './schema.js';

// Types
export type {
  Validator,
  AsyncValidator,
  FieldConfig,
  FormField,
  Form,
  FormGroup,
  FormGroupInstance,
  FieldValues,
  FormFields,
} from './types.js';
