import { ZodError } from "zod";

export type FieldErrors<TField extends string> = Partial<
  Record<TField, string[]>
>;

export type ActionState<TField extends string = string> = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: FieldErrors<TField>;
};

export function createIdleState<TField extends string>(): ActionState<TField> {
  return { status: "idle" };
}

export function zodErrorToActionState<TField extends string>(
  error: ZodError,
  message = "Please review the highlighted fields."
): ActionState<TField> {
  return {
    status: "error",
    message,
    fieldErrors: error.flatten().fieldErrors as FieldErrors<TField>,
  };
}

export function toActionError<TField extends string>(
  message: string
): ActionState<TField> {
  return {
    status: "error",
    message,
  };
}
