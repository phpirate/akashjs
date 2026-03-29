/** Represents any renderable node in AkashJS */
export type AkashNode =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | AkashNode[];
