# Base UI Migration Plan

Last modified: 2026-05-27

> Update the `Last modified` date every time this plan file changes.

## Goal

Convert the app from `react-aria-components` to Base UI in one PR. Preserve current user-visible behavior and styling as much as practical, while making the migrated components idiomatic for Base UI.

## Decisions

- Scope: one PR, full removal of `react-aria-components`.
- Priority order for UI primitives: Base UI first, native HTML only when Base UI has no useful equivalent.
- Use CSS Modules already in the repo; adjust selectors/classes/data-attribute selectors where Base UI requires it.
- Do not preserve app component APIs at all costs; prefer idiomatic Base UI component structure.
- Component renames are allowed when useful, e.g. `TextField` -> `InputField`.
- Update all import paths/usages after any component rename.
- Keep route/form behavior unchanged unless Base UI event APIs require small adaptation.
- Pin latest stable Base UI version available at implementation time.
- Implementation note: Base UI package is now `@base-ui/react`; older `@base-ui-components/react` package is deprecated.
- Update memory bank frontend guideline from React Aria to Base UI.
- Validation required before manual sign-off: typecheck, build, and existing tests pass.
- No visual regression tooling required; final visual/manual sign-off by project owner.

## Current Known Usage

Inventory from initial search:

- `package.json`
  - dependency: `react-aria-components`
- `src/components/Button/Button.tsx`
  - `Button`, `composeRenderProps`, `ButtonProps`
- `src/components/TextField/TextField.tsx`
  - `TextField`, `FieldError`, `Input`, `Label`, `Text`, `ValidationResult`
- `src/components/TextArea/TextArea.tsx`
  - `TextField`, `Label`, `TextArea`
- `src/components/CheatsheetCreateForm/CheatsheetCreateForm.tsx`
  - `Form`, `Heading`
- `src/components/UsernameForm/UsernameForm.tsx`
  - `Form`

Re-run inventory during implementation with:

```bash
rg "react-aria-components|react-aria" src package.json pnpm-lock.yaml
```

## Implementation Steps

### 1. Read Base UI docs before coding

Use official docs to confirm package name, install command, component imports, props, accessibility behavior, and data attributes.

Minimum docs to read:

- Quick start: https://base-ui.com/react/overview/quick-start
- Button docs
- Field docs
- Input docs
- Textarea docs, if available
- Form-related docs, if available

Record any meaningful API surprises in this plan or PR notes before implementation continues.

### 2. Update dependencies

- Remove `react-aria-components`.
- Add latest stable Base UI package and pin exact version.
- Use pnpm only.

Expected shape:

```bash
pnpm remove react-aria-components
pnpm add @base-ui/react@<latest-stable-version>
```

Use the exact package/version confirmed from Base UI docs/npm at implementation time.

Implemented with `@base-ui/react@1.5.0`.

### 3. Migrate button primitive

Target file:

- `src/components/Button/Button.tsx`

Plan:

- Replace React Aria `Button` with Base UI Button primitive.
- Remove `composeRenderProps`; implement class composition directly or with a tiny local helper if useful.
- Keep variants: `primary`, `secondary`, `toolbar`.
- Preserve existing CSS module classes where possible:
  - `styles.button`
  - `styles.primary`
  - `styles.secondary`
  - `styles.toolbar`
- Check Base UI disabled/focus/data attributes and update CSS only if needed.

Accessibility check:

- Disabled state still maps correctly.
- Keyboard activation still works.
- Focus styling is not worse than current state.

### 4. Migrate text input field idiomatically

Target files may include:

- `src/components/TextField/TextField.tsx`
- possible rename to `src/components/InputField/InputField.tsx`
- `src/components/TextField/TextField.module.css`
- possible rename to `src/components/InputField/InputField.module.css`

Plan:

- Use Base UI field/input primitives, not native-only input, because Base UI provides an input component.
- Prefer Base UI naming/structure from docs.
- Support current required usage from forms:
  - label
  - id/name
  - required state
  - controlled value
  - `onChange`
  - `onBlur`
  - `autoComplete`
  - `placeholder`
- Preserve visual styling from existing CSS, with selector adjustments as needed.
- If renamed, update all imports/usages.

Accessibility check:

- Label is programmatically associated with input.
- Required state is exposed correctly.
- Description/error mechanisms are mapped to Base UI equivalents if still supported/needed.
- Browser autofill/autocomplete still works.

### 5. Migrate textarea field idiomatically

Target files may include:

- `src/components/TextArea/TextArea.tsx`
- possible rename to `src/components/TextareaField/TextareaField.tsx`
- `src/components/TextArea/TextArea.module.css`
- possible rename to `src/components/TextareaField/TextareaField.module.css`

Plan:

- Use Base UI textarea primitive if available.
- If Base UI does not have a textarea primitive, use the Base UI field wrapper plus native `<textarea>`.
- Preserve required current usage:
  - label
  - id/name
  - controlled value
  - `onChange` event semantics compatible with TanStack Form callers
  - `onBlur`
  - `autoComplete`
  - `rows`
  - `placeholder`
- Preserve visual styling from existing CSS, with selector adjustments as needed.

Accessibility check:

- Label is programmatically associated with textarea.
- Keyboard input and focus behavior unchanged.

### 6. Replace React Aria form/heading usages

Target files:

- `src/components/CheatsheetCreateForm/CheatsheetCreateForm.tsx`
- `src/components/UsernameForm/UsernameForm.tsx`

Plan:

- Replace React Aria `Form` with native `<form>` unless Base UI docs provide a clearly useful form primitive.
- Replace React Aria `Heading` with native heading element, likely `<h1>`, unless Base UI provides a useful equivalent.
- Keep submission behavior unchanged:
  - `preventDefault()`
  - `stopPropagation()` if still needed
  - call TanStack Form `handleSubmit()` / `form.handleSubmit()`
- Update imports for renamed field components.
- Do not introduce new validation UX or alter navigation/submission flows.

### 7. Update CSS modules as needed

Plan:

- Keep existing colors, spacing, radii, and layout.
- Update selectors/classes only where Base UI markup/data attributes require it.
- Remove selectors tied to React Aria-specific markup or states.
- Prefer stable class names over overly coupling app CSS to generated/internal structure.

Known risk:

- Base UI state/data attributes and event signatures may differ from React Aria, so CSS selectors and form handler props may need small adjustments.

### 8. Update memory bank

Target file:

- `memory-bank/design.md`

Replace the frontend guideline that says component behavior/accessibility uses React Aria with one saying it uses Base UI.

### 9. Verify full removal

Run:

```bash
rg "react-aria-components|react-aria" src package.json pnpm-lock.yaml memory-bank plans
```

Expected:

- No active source/package references to `react-aria-components`.
- `memory-bank/design.md` says Base UI, not React Aria.
- This plan may mention React Aria only as historical migration context.

### 10. Validate

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

All must pass before requesting manual sign-off.

### 11. Manual sign-off checklist

Project owner manually verifies:

- Create cheatsheet form renders correctly.
- Create cheatsheet form submits and navigates to public cheatsheet page.
- Username form renders correctly.
- Username availability feedback still works.
- Buttons, inputs, and textareas look acceptable with existing styling.
- Keyboard/focus behavior is acceptable.

## Open Questions

None.
