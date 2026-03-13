# Sorelo Naming and Codenames

## Purpose

This document fixes the current naming policy so the repository can keep a technical codename without creating product-language drift.

## Canonical Names

- User-facing product name: `Sorelo`
- Repository/package codename: `sorela`

## Default Rule

Use `Sorelo` everywhere a user, collaborator, or document is describing the product itself.

Use `sorela` only where a technical identifier already exists and is not being renamed in this cycle.

## Where `Sorelo` Must Be Used

- product copy
- handbook documents
- UI text
- marketing and positioning language
- architectural descriptions of the product model

## Where `sorela` May Still Appear

- package metadata
- environment and cookie identifiers
- backup bundle naming
- historical repository paths and migration context

## Current Non-Goal

This handbook pass does not perform a mass technical rename.

The immediate goal is consistency of meaning, not churn across package names, env keys, or low-level identifiers.

## Guardrail

The codename must never redefine the product model.

If a source says `sorela` but is describing Concepts, Links, Inspector, or Scenarios, read that source as referring to `Sorelo`.
