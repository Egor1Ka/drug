# Claude Code

This project uses the Payload CMS skill at `.claude/skills/payload/`.
Start with `.claude/skills/payload/SKILL.md` for a quick reference, then see `.claude/skills/payload/reference/` for detailed docs.

## React component conventions

React is the **view layer only** (MVVM mindset). All new components and pages MUST follow these rules:

1. **No God Object components.** A component never contains business logic, API calls, or domain transforms. All data access goes through the feature's `api/` layer (see "Data layer conventions" below); the returned TSX stays a passive view of that data.
2. **Screaming naming.** Name components by what they are on screen (`CategoryTabs`, `TagChips`, `ClearFiltersButton`), so the JSX reads top-to-bottom like the rendered page — no digging into placeholders or props to understand what an element does.
3. **Layout is separate from components.** Page positioning (containers, margins, grid placement) lives in dedicated layout components exposing dot-notation slots via `Object.assign` (`BlogListingLayout.Header`, `.Tabs`, `.Meta`, `.Content`; `BlogPostLayout.Header`, `.Content`, `.Similar`). Feature components never carry page-positioning styles, so they can be reused anywhere without breaking the layout.
4. **Abstract the UI kit.** Feature components use project-level abstractions, not raw low-level primitives — infrastructure code must not leak into entry components.
5. **Declarative conditional rendering.** Use `<Show when={...}>` (`@frontend/_shared/ui/Show`) instead of `&&`/ternary chains in page-level JSX. Keep visibility decisions at the top (entry) level — never bury an `isVisible` prop deep inside a nested component.
6. **Slots over callback props.** Prefer passing rendered elements as `children`/slots to threading callbacks and flags through props (avoids prop drilling).

## Frontend structure — FSD inside `(frontend)`

All frontend product code lives under `src/app/(frontend)/` in App Router private folders (underscore prefix = never routable). The `@frontend/*` tsconfig alias points there.

```
src/app/(frontend)/
  _features/
    blog/
      api/         ← data access: posts.ts, categories.ts, tags.ts
      ui/          ← components: BlogCard.tsx, BlogArchive.tsx, CategoryTabs.tsx,
                     BlogListingLayout.tsx, BlogPostLayout.tsx, TagChips.tsx,
                     SimilarPosts.tsx, Breadcrumbs.tsx, Pagination.tsx, PageRange.tsx
      index.ts     ← PUBLIC API of the feature (re-exports)
  _shared/
    ui/            ← frontend-only primitives with no business meaning: Show.tsx
  blog/            ← thin route files only: page.tsx, [slug]/, tag/[slug]/, page/[pageNumber]/
```

- **Public API rule:** routes import ONLY from the feature root (`@frontend/_features/blog`) — never from `ui/` or `api/` internals. `index.ts` controls what the feature exposes. When a feature mixes server-only exports (Payload Local API) with client code, it exposes a SECOND sanctioned entry `client.ts` (`@frontend/_features/forms/client`) with the client-safe subset — client components import from there so server-only modules never enter the client bundle; deep imports into internals stay forbidden.
- **Inside a feature**, files import siblings relatively (`./BlogCard`, `../api/posts`).
- **Where a thing belongs:** feature-specific → `_features/<feature>/`; reusable across frontend features with no business meaning → `_shared/`; used by BOTH the frontend and the Payload admin/template (e.g. `Media`, `RichText`, `Link`, `Card`, `ui/`) → stays in `src/components/`. A component starts inside its feature; promote it only when a SECOND consumer actually appears — not in advance.
- Flat files (`BlogCard.tsx`), no `index.tsx`-per-folder nesting.

### Adding a new feature (checklist)

1. Create `src/app/(frontend)/_features/<feature>/` with `api/`, `ui/`, and `index.ts` (public API).
2. Routes in `src/app/(frontend)/<route>/` stay thin: validate params, compose `fetch*` queries from the feature's public API, render `ui` components inside the feature's layout slots.
3. Need a primitive with no business meaning? Check `_shared/ui/` first, create it there only if a second feature needs it — otherwise keep it inside the feature.

## Data layer conventions (feature `api/`)

All Payload Local API access lives in the owning feature's `api/<collection>.ts` (e.g. `src/app/(frontend)/_features/blog/api/posts.ts`). Pages and components NEVER call `getPayload`/`payload.find` directly.

1. **One module per collection**: `api/posts.ts`, `api/categories.ts`, `api/tags.ts`.
2. **Screaming, verb-first function names** returning promises: `fetchPublishedPostsPage`, `fetchPostBySlug`, `fetchPostsByTag`, `fetchAllCategories`, `fetchTagBySlug`, `fetchSimilarPosts`, `fetchPublishedPostsCount`.
3. **Query-shape details live next to the queries**, not in pages: select sets (`blogCardSelect`), page size (`POSTS_PER_PAGE`), where-builders (`byCategorySlug`).
4. **Request-deduped lookups wrap in React `cache()` with primitive args** (`fetchPostBySlug(slug)`, not `({ slug })`) so the page render and `generateMetadata` share one DB hit — `cache` memoizes by reference, object args defeat it.
5. **Pages are containers**: they validate params with guard clauses, compose queries (keep `Promise.all` visible so parallelism is explicit), and hand plain data to presentational components.
6. **Self-contained widgets follow the pair pattern**: a `fetchXxx` query + a dumb component (`fetchSimilarPosts` + `SimilarPosts`); the parent decides visibility with `<Show when={...}>`.

## Payload Form Builder conventions

Any component that renders a Payload Form Builder form (a `Form` relationship pulled from Payload) is fully driven by the form's admin configuration — NEVER hardcode strings that duplicate a form setting.

1. **Success state renders `form.confirmationMessage`** through `RichText` (the canonical pattern lives in `src/app/(frontend)/_features/forms/ui/FormRenderer.tsx`), guarded with `<Show when={state === 'success' && !!form.confirmationMessage}>`. Never substitute a hardcoded/translated success string.
2. **Honor `form.confirmationType === 'redirect'`** + `form.redirect.url` instead of showing a message.
3. **Submit button label comes from `form.submitButtonLabel`** first; a translation is only a fallback when the editor left it empty.
4. **Field names come from the form** (`field.name`), never hardcoded — otherwise the submission targets a non-existent field.
5. **Only pure UI-state strings with NO form equivalent** may come from `messages/*.json`: input placeholder, "sending…" label, generic network-error text.
