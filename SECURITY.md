# Security Policy

## Supported Version

Only the latest mainline branch is actively supported.

## Reporting A Vulnerability

Do not open a public issue for security-sensitive reports.

Report privately to the project maintainer with:

- impact summary
- reproduction steps
- proof-of-concept (if available)
- suggested mitigation

Response target:

- initial acknowledgement within 72 hours
- triage and fix plan after severity assessment

## Secret Handling Rules

- Never commit `.env`, API keys, service tokens, or private certificates.
- Rotate any credential that is accidentally exposed.
- Keep production secrets only in the deployment secret manager.
