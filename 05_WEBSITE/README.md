# BECAA Maharashtra Magazine 2026 Website Prototype

Version 0 is a local, three-item static website prototype. It does not import the full magazine and is not deployed publicly.

## Commands

```powershell
npm.cmd install
npm.cmd run inventory
npm.cmd run import
npm.cmd run normalize
npm.cmd run validate
npm.cmd run build
npm.cmd run test
npm.cmd run qa
npm.cmd run release:v0
```

Use `npm.cmd run serve` to view locally at `http://localhost:8086/`.

## Scope

The prototype includes exactly:

- one office-bearer message
- one ordinary article or event report
- one reliably matched advertisement, or a labelled non-release placeholder if no reliable match exists

Original files in `01_REFERENCE_2025`, `02_INCOMING_CONTENT`, `03_ADVERTISEMENTS`, and source workbooks/documents in `04_MAGAZINE_WORKING` are not modified.
