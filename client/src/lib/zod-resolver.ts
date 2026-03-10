import type { FieldValues, Resolver } from "react-hook-form";
import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

/**
 * Typed Zod resolver for use with React Hook Form and Zod 4.
 * Centralizes the type assertion required when using z.coerce or transforms,
 * so form call sites stay type-safe. When @hookform/resolvers improves Zod 4
 * inference, update or remove this helper.
 */
export function typedZodResolver<T extends FieldValues>(
  schema: z.ZodType<T>
): Resolver<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod 4 input/output mismatch; single cast here.
  return baseZodResolver(schema as any) as Resolver<T>;
}
