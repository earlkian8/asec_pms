# Claude Prompt: Revision 2 - Remove Project Status Selection

You are working in a Laravel application with Admin and API flows.

## Goal

Remove the status selection from Add Project so project creation no longer asks the user to manually set a status at creation time.

## Required Changes

1. Find the project creation form, controller, request validation, and any related services or frontend components that expose status selection.
2. Remove the status field from the Add Project UI.
3. Remove validation rules that require or validate status during project creation.
4. Set a safe default status in the backend if the project model still needs one.
5. Update any seeders, tests, or supporting code that assume status is selected during creation.

## Implementation Expectations

- Preserve existing project creation behavior for other fields.
- Do not break edit/update flows if status still exists there.
- If a default value is needed, define it in one place and keep it consistent.
- Keep the UX cleaner by not presenting a field the user should not choose at creation time.

## Constraints

- Make the smallest safe change.
- Do not remove status entirely if other parts of the app still rely on it.
- Keep naming and behavior aligned with the current codebase.

## Deliverables

- Updated Add Project UI.
- Updated validation and controller logic.
- Any backend defaulting logic needed for status.
- Brief summary of what changed.

## Output Format

When done, report:
- Where status was removed from
- What default status, if any, is now applied
- What files were updated