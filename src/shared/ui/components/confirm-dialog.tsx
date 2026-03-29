"use client";

import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import type { ComponentProps, ReactNode } from "react";

type DialogButtonProps = Pick<
  ComponentProps<typeof Button>,
  "size" | "variant" | "color"
>;

type ConfirmDialogProps = {
  triggerLabel: string;
  triggerButtonProps?: DialogButtonProps;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmButtonProps?: DialogButtonProps;
  action: (formData: FormData) => void | Promise<void>;
  children?: ReactNode;
};

export function ConfirmDialog({
  triggerLabel,
  triggerButtonProps,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmButtonProps,
  action,
  children,
}: ConfirmDialogProps) {
  const confirmVariant = confirmButtonProps?.variant;

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button
          size={triggerButtonProps?.size ?? "2"}
          variant={triggerButtonProps?.variant ?? "soft"}
          color={triggerButtonProps?.color ?? "red"}
        >
          {triggerLabel}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="420px">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description>{description}</AlertDialog.Description>
        <form action={action}>
          {children}
          <Flex gap="3" justify="end" mt="4">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="submit"
              size={confirmButtonProps?.size ?? "2"}
              color={confirmButtonProps?.color ?? "red"}
              {...(confirmVariant ? { variant: confirmVariant } : {})}
            >
              {confirmLabel}
            </Button>
          </Flex>
        </form>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
