"use client";

import { useActionState } from "react";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";

import {
  type UnlockHandbookState,
  unlockHandbookAction,
} from "@/features/docs-hub/actions";

const initialState: UnlockHandbookState = {};

export function HandbookUnlockCard() {
  const [state, formAction, isPending] = useActionState(
    unlockHandbookAction,
    initialState
  );

  return (
    <Card className="handbook-unlock-card">
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <LockClosedIcon />
            <Text size="2" weight="medium" color="gray">
              Restricted page
            </Text>
          </Flex>
          <Heading size="6">Documentation hub</Heading>
          <Text size="2" color="gray">
            Enter the shared password to open the internal documentation hub.
          </Text>
        </Flex>

        <form action={formAction}>
          <Flex direction="column" gap="3">
            <TextField.Root
              size="3"
              type="password"
              name="password"
              placeholder="Shared password"
              autoComplete="current-password"
              aria-label="Shared password"
              required
            />

            {state.error ? (
              <Text size="2" color="red">
                {state.error}
              </Text>
            ) : null}

            <Button type="submit" size="3" disabled={isPending}>
              {isPending ? "Checking access..." : "Open hub"}
            </Button>
          </Flex>
        </form>
      </Flex>
    </Card>
  );
}
