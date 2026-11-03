<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All demo data lives in `src/lib/demo-data.ts` and is surfaced with `SimulatedTag`; swap that module for real feeds later so pages stay unchanged.
- Shared shell (fixed sidebar, search, notifications) is `AppShell` wrapped in `__root.tsx`; cross-page UI state lives in `AppState` context.
