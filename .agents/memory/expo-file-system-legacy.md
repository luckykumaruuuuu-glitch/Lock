---
name: expo-file-system v19 legacy import
description: In expo-file-system v19+, the old API (documentDirectory, writeAsStringAsync, EncodingType, getInfoAsync, readAsStringAsync) must be imported from expo-file-system/legacy, not the main module.
---

# expo-file-system v19 — Legacy API Import

## Rule
Always import the legacy file API from `expo-file-system/legacy`, not `expo-file-system`.

```typescript
// WRONG (v19 main module — types missing, runtime throws)
import * as FileSystem from "expo-file-system";
FileSystem.documentDirectory; // TS error + runtime throw

// CORRECT
import * as FileSystem from "expo-file-system/legacy";
FileSystem.documentDirectory; // works, properly typed
FileSystem.writeAsStringAsync(...);
FileSystem.readAsStringAsync(...);
FileSystem.getInfoAsync(...);
FileSystem.EncodingType.UTF8;
```

**Why:** expo-file-system v19 restructured its API around `File` and `Directory` classes. The legacy path-string API was moved to a dedicated `legacy` subpath. The main module still re-exports the functions as deprecated stubs but they throw at runtime and their types are wrong.

**How to apply:** Any time `import * as FileSystem from "expo-file-system"` is used with the old path-string API, change it to `expo-file-system/legacy`.
