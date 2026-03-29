import { Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { InlineFormField } from "@/shared/ui/components/inline-form-field";

type FormStackProps = {
  children: ReactNode;
};

export function FormStack({ children }: FormStackProps) {
  return (
    <Flex direction="column" gap="4">
      {children}
    </Flex>
  );
}

type FormErrorMessageProps = {
  message: string | null | undefined;
  size?: "1" | "2";
};

export function FormErrorMessage({
  message,
  size = "2",
}: FormErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <Text color="red" size={size}>
      {message}
    </Text>
  );
}

type TextInputFieldProps = {
  label: string;
  error?: string | undefined;
} & Omit<ComponentPropsWithoutRef<typeof TextField.Root>, "children">;

export function TextInputField({
  label,
  error,
  ...inputProps
}: TextInputFieldProps) {
  return (
    <InlineFormField label={label} error={error} controlId={inputProps.id}>
      {({ controlProps }) => (
        <TextField.Root
          {...inputProps}
          id={controlProps.id}
          aria-describedby={
            [inputProps["aria-describedby"], controlProps["aria-describedby"]]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={
            inputProps["aria-invalid"] ?? controlProps["aria-invalid"]
          }
        />
      )}
    </InlineFormField>
  );
}

type TextAreaFieldProps = {
  label: string;
  error?: string | undefined;
} & Omit<ComponentPropsWithoutRef<typeof TextArea>, "children">;

export function TextAreaField({
  label,
  error,
  ...textAreaProps
}: TextAreaFieldProps) {
  return (
    <InlineFormField label={label} error={error} controlId={textAreaProps.id}>
      {({ controlProps }) => (
        <TextArea
          {...textAreaProps}
          id={controlProps.id}
          aria-describedby={
            [
              textAreaProps["aria-describedby"],
              controlProps["aria-describedby"],
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={
            textAreaProps["aria-invalid"] ?? controlProps["aria-invalid"]
          }
        />
      )}
    </InlineFormField>
  );
}

type SubmitButtonProps = ComponentPropsWithoutRef<typeof Button>;

export function SubmitButton({
  type = "submit",
  children,
  ...buttonProps
}: SubmitButtonProps) {
  return (
    <Button type={type} {...buttonProps}>
      {children}
    </Button>
  );
}
