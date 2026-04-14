# Claude Prompt: Revision 1 - Client Management Cleanup

You are working in a Laravel application with both API and Admin layers.

## Goal

Revise Client Management so the system only keeps the client fields that are actually used and relevant. The address field must remain. The implementation must use the API flow where appropriate and keep the Admin side aligned.

## Required Changes

1. Audit the current Client model, controller, services, requests, resources, and views used by both API and Admin.
2. Remove unnecessary client inputs that are not used anywhere in the system.
3. Keep the address field.
4. If database cleanup is needed, create a new migration instead of editing old migrations.
5. Recheck every controller in API/ and Admin/ that uses the Client model and adapt each one to the latest reduced field set.
6. Update the client-related services, requests, resources, and views for both API and Admin so validation, create, update, and display logic match the reduced field set.
7. Make sure the API remains the source for client data handling where applicable.
8. Do not break existing relationships or downstream features that depend on client records.

## Implementation Expectations

- Identify which client fields are unused across the codebase before removing them.
- Update validation rules so removed fields are no longer required or accepted.
- If the database still contains unused columns, add a safe migration to drop or deprecate them.
- Keep the address field available in all relevant create and update flows.
- Ensure Admin and API responses stay consistent after the cleanup.

## Constraints

- Make the smallest safe change that satisfies the requirement.
- Do not remove fields that are still referenced by project, billing, or reporting features.
- Preserve existing naming conventions and code style.
- If a field is uncertain, verify usage before removing it.

## Deliverables

- Updated API and Admin controller logic.
- Updated service layer logic if present.
- New migration if the schema changes.
- Updated validation rules and request handling.
- Brief summary of removed fields and the reason they were removed.

## Output Format

When done, report:
- What fields were removed
- What files were updated
- Whether a migration was added
- Any fields that were intentionally kept