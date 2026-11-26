# AGENTS.md — MyPet

## Priorities and continuity
- Read this file before every intervention. Prioritize quality, stability and user experience over token savings.
- Preserve visual and functional consistency across the MyApps ecosystem, following established design, behavior and versioning conventions.
- Preserve all existing functionality outside the current request.

## Focused investigation and reuse
- Start with `anzosafe-oss/mypet`, using known paths and targeted searches of relevant files, functions and dependencies.
- Access other repositories or Supabase projects when necessary to implement, understand or validate the request. Do not perform unrelated organization-wide discovery.
- When the user refers to another application, inspect its actual implementation and reuse the validated solution, adapting it to MyPet's established design.
- Avoid redundant investigation and unnecessary output, without limiting implementation quality, testing or necessary previews.
- Prefer a focused, safe patch; expand the investigation or change when required for correctness. Avoid unrelated refactoring.
- For Supabase, start with the associated project and app-specific resources. Verify unknown resource identifiers before use and never expose secrets.

## Data and maintenance
- Demonstration data is allowed only in previews and test environments.
- At the first production publication, the LIVE application must be clean, with no demonstration data.
- On subsequent updates, preserve all real user data. Never treat real records as demonstration data or remove them during cleanup.
- Delete obsolete files or assets only after checking their dependencies and references, including dynamic references, manifests, service workers, caches and deployment configuration.
- Keep cleanup targeted. Preserve uncertain resources and never rewrite Git history.

## Validation and publication
- Verify compatibility with iOS, Android and desktop, including the relevant browser and installed web-app behavior.
- Run tests proportionate to the change and its risk, including relevant regressions. Report any verification limits or blockers honestly.
- Prepare changes on a separate branch. Publish to production only with the user's explicit approval; preparing or testing a change does not authorize publication.
- Update the application version when publishing an application release, following the existing versioning convention.
- Report changed files, validation results, limitations and material decisions concisely.
