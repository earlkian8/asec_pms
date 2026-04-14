# Claude Prompt: Revision 3 - Project Team Assignment Permissions

You are working in a Laravel application with a multi-step project creation flow.

## Goal

Add role-based constraints to project creation so the team assignment steps are only shown when the current user has permission to assign team members.

## Required Changes

1. Identify the project creation wizard steps and the permission logic available for the current user.
2. If the user does not have permission for team assignment, do not render the team-assignment step(s) in the wizard.
3. Make sure the step flow still works correctly when one or more steps are hidden.
4. Keep the backend safe by preventing unauthorized team assignment even if the frontend is bypassed.
5. Update controllers, policies, middleware, or authorization checks as needed.

## Implementation Expectations

- Use existing roles or permissions if they already exist.
- Hide the UI step only when the user truly lacks permission.
- Ensure step indexes, progress indicators, and navigation do not break when steps are removed.
- Validate authorization on the server side as well as the frontend.

## Constraints

- Do not hardcode role names unless the codebase already uses them consistently.
- Keep the wizard responsive to permission changes.
- Do not let hidden steps leave the flow in an invalid state.

## Deliverables

- Updated wizard rendering logic.
- Updated authorization checks.
- Any controller or policy changes needed.
- Brief summary of how hidden steps are handled.

## Output Format

When done, report:
- Which permission governs the team assignment step
- How the step is hidden
- What backend protection was added