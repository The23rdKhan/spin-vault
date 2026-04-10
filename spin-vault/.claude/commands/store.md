Create a new Zustand store slice.

Arguments: $ARGUMENTS (slice name, e.g., "wallet" or "game")

Create the file at `src/stores/${name}Slice.ts` with this structure:

```typescript
import { create } from 'zustand';

interface ${Name}State {
  // Add state properties
}

interface ${Name}Actions {
  // Add action methods
  reset: () => void;
}

type ${Name}Slice = ${Name}State & ${Name}Actions;

const initialState: ${Name}State = {
  // Initial values
};

export const use${Name}Store = create<${Name}Slice>()((set, get) => ({
  ...initialState,

  reset: () => set(initialState),
}));

export default use${Name}Store;
```

Rules:
- Use bigint for any coin/currency amounts
- Never store sensitive data in the store
- Include a reset() action for clearing state
- Export the hook as default
