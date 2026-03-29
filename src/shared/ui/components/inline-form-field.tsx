import { Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { useId } from "react";

type InlineFormFieldAssociation = "control" | "labelledby";

type InlineFormFieldAccessibilityProps = {
  controlProps: {
    id: string;
    "aria-describedby"?: string | undefined;
    "aria-invalid"?: true | undefined;
  };
  triggerProps: {
    id: string;
    "aria-labelledby": string;
    "aria-describedby"?: string | undefined;
    "aria-invalid"?: true | undefined;
  };
};

type InlineFormFieldProps = {
  label: string;
  error?: string | undefined;
  association?: InlineFormFieldAssociation;
  controlId?: string | undefined;
  children: (props: InlineFormFieldAccessibilityProps) => ReactNode;
};

export function InlineFormField({
  label,
  error,
  association = "control",
  controlId,
  children,
}: InlineFormFieldProps) {
  const generatedId = useId().replace(/:/g, "");
  const fieldId = controlId ?? `sl-field-${generatedId}`;
  const labelId = `${fieldId}-label`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = errorId;
  const invalidProps = error
    ? ({
        "aria-invalid": true,
      } as const)
    : {};

  return (
    <Flex direction="column" gap="2">
      <Text
        as={association === "control" ? "label" : "span"}
        id={labelId}
        htmlFor={association === "control" ? fieldId : undefined}
        size="2"
        weight="medium"
      >
        {label}
      </Text>
      {children({
        controlProps: {
          id: fieldId,
          "aria-describedby": describedBy,
          ...invalidProps,
        },
        triggerProps: {
          id: fieldId,
          "aria-labelledby": `${labelId} ${fieldId}`,
          "aria-describedby": describedBy,
          ...invalidProps,
        },
      })}
      {error ? (
        <Text id={errorId} color="red" size="1">
          {error}
        </Text>
      ) : null}
    </Flex>
  );
}
