# User Settings View Implementation Plan

## 1. Overview

The goal is to implement a user menu as a dropdown panel (popover/dropdown), globally available in the application header. It will let users log out, navigate to the goal view (`/goal`), and change their preferred pace unit (`min/km` vs `km/h`). The selected pace unit will be saved in `localStorage` and shared globally for consistent data presentation.

## 2. View Routing

The component will not have a dedicated route. It will be implemented as a globally available `UserMenu` component in the main application header (`Header.astro`), rendered on every page.

## 3. Component Structure

The component hierarchy will use React Context to manage pace unit state globally. The main interactive components will be Astro Islands.

```
src/layouts/Layout.astro
└── PaceUnitProvider.tsx (client:load)
    └── src/components/Header.astro
        └── UserMenu.tsx (client:load)
            └── shadcn/ui DropdownMenu
                ├── DropdownMenuLabel (User name)
                ├── DropdownMenuItem (Link to /goal)
                ├── PaceUnitToggle.tsx
                │   └── shadcn/ui Switch
                └── DropdownMenuItem (Logout button)
```

## 4. Component Details

### `PaceUnitProvider`

- **Component description**: A nonvisual Provider component managing global pace unit state. It reads the initial value from `localStorage` (or sets the default), then shares the state and its update function with all child components. It will be an Astro island (`client:load`) wrapping the main application layout.
- **Main elements**: Uses `React.createContext` and `useState`/`useEffect` for state management.
- **Supported interactions**: None.
- **Validation**: Checks whether the `localStorage` value is valid (`'min/km'` or `'km/h'`). Falls back to the default for invalid values.
- **Types**: `PaceUnit`, `PaceUnitContextType`
- **Props**: `children: React.ReactNode`

### `UserMenu`

- **Component description**: The main visible component rendered in the header. Displays an avatar or user icon. Clicking it opens a context menu. Implemented using the `shadcn/ui` `DropdownMenu` component.
- **Main elements**: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator` from `shadcn/ui`. The `PaceUnitToggle` component will be placed inside.
- **Supported interactions**:
  - Open/close the menu on click.
  - Navigate when clicking the "Goal" item.
  - Invoke logout when clicking "Log out".
- **Validation**: None.
- **Types**: `UserMenuProps`
- **Props**:
  - `userEmail: string | null` - user email passed from Header.astro (Astro.locals.user)

### `PaceUnitToggle`

- **Component description**: A component embedded in `UserMenu` for switching pace units. Displays a label and a toggle (`Switch` from `shadcn/ui`) that reflects and allows changes to the current setting.
- **Main elements**: `div` (wrapper), `Label`, `Switch`.
- **Supported interactions**: Toggle state change (`onCheckedChange`).
- **Validation**: None.
- **Types**: `PaceUnit`
- **Props**: None (state obtained from context).

## 5. Types

The following types must be defined, for example in a new `src/lib/types/ui.ts` file:

```typescript
/**
 * Defines available pace units.
 * 'min/km' - minutes per kilometer
 * 'km/h' - kilometers per hour
 */
export type PaceUnit = "min/km" | "km/h";

/**
 * React context structure for the pace unit.
 */
export interface PaceUnitContextType {
  paceUnit: PaceUnit;
  setPaceUnit: (unit: PaceUnit) => void;
}
```

## 6. State Management

Pace unit state (`paceUnit`) will be managed globally using the **React Context API**.

- **`PaceUnitProvider`**: Provider component holding the state. On the first client render (`useEffect`), it reads from `localStorage`. If the value is missing or invalid, it sets the default (`'min/km'`). Every state change is also saved in `localStorage`.
- **`usePaceUnit`**: Custom hook simplifying access to the context. Components that need to read or change the pace unit will use this hook.

```typescript
// Hook usage example
const { paceUnit, setPaceUnit } = usePaceUnit();
```

Access to `localStorage` will be protected from server-side execution (SSR) by placing it inside the `useEffect` hook.

## 7. API Integration

This feature is entirely client-side. **No API integration is required.** State is persisted in the user's browser `localStorage`.

## 8. User Interactions

- **Clicking the user icon**: Opens `DropdownMenu`.
- **Clicking outside the open menu**: Closes `DropdownMenu`.
- **Clicking the "Pace unit" toggle**: Changes `paceUnit` in context and `localStorage`. The change is immediately reflected in the toggle.
- **Clicking "Your goal"**: Redirects the user to `/goal`.
- **Clicking "Log out"**: Runs logout logic (e.g., a Supabase Auth method followed by a redirect to the login page).

## 9. Conditions and Validation

- The only validation occurs in `PaceUnitProvider` when reading `localStorage` data.
- **Condition**: The value read from the `paceUnit` key must equal `'min/km'` or `'km/h'`.
- **Handling**: If the condition is not met, initialize state with the default `'min/km'`.

## 10. Error Handling

- **Error**: `localStorage` is unavailable (e.g., in private browsing mode).
- **Handling**: Wrap `localStorage` access in `try...catch`. On error, manage `paceUnit` only in memory for the session. The feature will work, but the setting will not survive a page refresh. This is acceptable for this feature.

## 11. Implementation Steps

1.  **Create types**: Define `PaceUnit` and `PaceUnitContextType` in `src/lib/types/ui.ts`.
2.  **Implement `PaceUnitProvider`**:
    - Create `src/components/providers/PaceUnitProvider.tsx`.
    - Implement context, state, `localStorage` read/write logic (inside `useEffect`), and the `usePaceUnit` hook.
3.  **Integrate `PaceUnitProvider`**:
    - In the main layout (`src/layouts/Layout.astro`), import it and wrap `<slot />` with `<PaceUnitProvider client:load>`.
4.  **Implement `PaceUnitToggle`**:
    - Create `src/components/PaceUnitToggle.tsx`.
    - Use `usePaceUnit` to obtain state and the update function.
    - Build the interface using `Label` and `Switch` from `shadcn/ui`.
5.  **Implement `UserMenu`**:
    - Create `src/components/UserMenu.tsx`.
    - Build the menu structure using `DropdownMenu` from `shadcn/ui`.
    - Embed `PaceUnitToggle` inside the menu.
    - Add the remaining items: goal link and logout button.
6.  **Add `UserMenu` to the header**:
    - In `src/components/Header.astro` (or equivalent), import and place `<UserMenu client:load />`.
7.  **Verification**:
    - Check that the menu opens and closes correctly.
    - Verify that the toggle works, saves its state in `localStorage`, and restores it after a page refresh.
    - Ensure the goal link and logout button work as expected.
