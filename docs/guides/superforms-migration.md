# Superforms → Runes-native forms migration

## Why

16 files use `// @ts-nocheck` to suppress Superforms v3 + Zod v3 type
incompatibilities. The core issue: `sveltekit-superforms` v3's generic
`SuperValidated<Infer<ZodSchema>>` doesn't compose correctly with Zod v3's
`z.output` type under Svelte 5 runes (`$state`, `$derived`).

Svelte 5 + SvelteKit 2 ship everything needed for typed forms:

- `use:enhance` (built-in, zero dependencies)
- `$state()` rune for reactive form data
- `$page.form` for server response access
- `zod` for schema + validation (already a dep)
- A thin `validate()` wrapper (30 lines)

## Strategy

**Phase 1 — Extract helpers** (1 session, no file changes outside lib/)

1. Create `src/lib/client/validation.ts`:

   ```ts
   import { z } from 'zod/v3';

   export function validate<T extends z.ZodType>(
     schema: T,
     data: unknown
   ): { success: true; data: z.output<T> } | { success: false; errors: Record<string, string[]> } {
     const r = schema.safeParse(data);
     if (r.success) return { success: true, data: r.data };
     const errors: Record<string, string[]> = {};
     for (const issue of r.error.issues) {
       const key = issue.path.join('.');
       (errors[key] ??= []).push(issue.message);
     }
     return { success: false, errors };
   }
   ```

2. Create `src/lib/client/form-action.ts`:

   ```ts
   import { enhance } from '$app/forms';

   export function formAction(form: HTMLFormElement, opts?: {
     onSuccess?: (data: Record<string, unknown>) => void;
     onError?: (errors: Record<string, string[]>) => void;
   }) {
     return enhance(form, ({ formData, formElement, cancel }) => {
       return async ({ result, update }) => {
         if (result.type === 'success' && opts?.onSuccess) {
           opts.onSuccess(result.data ?? {});
         }
         if (result.type === 'failure' && opts?.onError && result.data) {
           opts.onError((result.data as any).errors ?? {});
         }
         update();
       };
     });
   }
   ```

3. Create `src/lib/client/field-error.svelte`:

   ```svelte
   <script lang="ts">
     let { name, errors }: { name: string; errors?: Record<string, string[]> } = $props();
   </script>

   {#if errors?.[name]?.length}
     <p class="text-sm text-red-600">{errors[name][0]}</p>
   {/if}
   ```

**Phase 2 — Migrate one .server.ts** (~45 min per file)

For each of the 7 `.server.ts` files:

1. Remove `@ts-nocheck` and Superforms imports
2. Replace `superValidate(request, zod(schema))` with manual `request.json()` + `validate(schema, data)`
3. Replace `message(form, ...)` returns with `fail(400, { errors, data })` / `{ success: true }`
4. Keep all Supabase logic unchanged

Example pattern:

```ts
// Before
export const actions = {
  default: async ({ locals, request }) => {
    const form = await superValidate(request, zod(schema));
    if (!form.valid) return fail(400, { form });
    const { error } = await locals.srv.from('table').insert(form.data);
    if (error) return message(form, error.message, { status: 500 });
    return message(form, 'Created');
  }
};

// After
import { validate } from '$lib/client/validation';

export const actions = {
  default: async ({ locals, request }) => {
    const body = await request.json();
    const v = validate(schema, body);
    if (!v.success) return fail(400, { errors: v.errors, data: body });
    const { error } = await locals.srv.from('table').insert(v.data);
    if (error) return fail(500, { errors: { _form: [error.message] }, data: body });
    return { success: true };
  }
};
```

**Phase 3 — Migrate one .svelte** (~30 min per file)

For each of the 9 `.svelte` files:

1. Replace `{superForm}` / `form` stores with `$state()` rune
2. Replace `use:enhance` with `use:enhance` directly (already available in SvelteKit)
3. Replace `<input bind:value={$form.field} />` with `<input bind:value={data.field} />`
4. Replace `$errors.field` with `errors?.field?.[0]` using `$state`
5. Replace `$message` / `toasts` with `$page.form` or custom `$state`

Example pattern:

```svelte
<!-- Before -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod } from 'sveltekit-superforms/adapters';
  let { data } = $props();
  const { form, errors, enhance, message } = superForm(data.form, { validators: zod(schema) });
</script>

<form method="POST" use:enhase>
  <input name="name" bind:value={$form.name} />
  {#if $errors.name}<span>{$errors.name}</span>{/if}
  <button>Submit</button>
</form>

<!-- After -->
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  let formData = $state(data ?? {});
  let errors = $state<Record<string, string[]>>({});
  let success = $state(false);
</script>

<form
  method="POST"
  use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === 'failure' && result.data) {
        errors = (result.data as any).errors ?? {};
      }
      if (result.type === 'success') {
        errors = {};
        formData = {};
        success = true;
      }
      update();
    };
  }}
>
  <input name="name" bind:value={formData.name} />
  {#if errors.name}<span>{errors.name[0]}</span>{/if}
  <button>Submit</button>
</form>
```

**Phase 4 — Remove Superforms dependency**

After all 16 files are migrated:

```bash
npm uninstall sveltekit-superforms
```

Remove any remaining Superforms types/utils from `src/app.d.ts`.

## Ordering

1. `admin/fees` — simplest schema (single table CRUD)
2. `admin/subjects` — same pattern as fees
3. `admin/students` — most complex, save for last among .server.ts
4. Repeat for .svelte files in same order

## Total estimate

| Phase | Files | Time | Notes |
|-------|-------|------|-------|
| Phase 1 (helpers) | 3 | 1h | One-time lib creation |
| Phase 2 (.server.ts) | 7 | 5h | ~45 min each |
| Phase 3 (.svelte) | 9 | 4.5h | ~30 min each |
| Phase 4 (cleanup) | 2 | 0.5h | Uninstall + app.d.ts |
| **Total** | **21** | **11h** | ~1.5 days |

## Risk

- `use:enhance` returns `Promise<void>`, not a Cancel object, in SvelteKit 2.
  The `cancel()` parameter from Superforms is not available — use
  `event.preventDefault()` in the handler if needed.
- `$page.form` is `null` after initial load. Initialize `$state` with
  `data.formData ?? { defaultValue: true }` to avoid null form state on hydrate.
- File uploads (`<input type="file">`) need `FormData` parsing in the action
  instead of `request.json()`. Use `formidable` or `multiparty` if needed.
