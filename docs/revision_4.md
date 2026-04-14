# Claude Prompt: Revision 4 - Auto Count Wizard Selections

You are working in a wizard-based Laravel/Inertia or similar frontend flow.

## Goal

Remove all Add Selected buttons from wizard steps so selected items are counted automatically as soon as the user checks them.

## Required Changes

1. Find every wizard step that uses an Add Selected button.
2. Remove those buttons from the UI.
3. Make selection counting automatic on checkbox or item selection change.
4. Ensure selected-item counts update immediately and accurately.
5. Keep the step flow smooth for users with no extra confirmation click.

## Implementation Expectations

- Selection state should update in real time.
- The total selected count should always reflect the checked items.
- If a step has a summary badge or counter, it should update automatically.
- Remove any redundant confirmation logic that only exists for Add Selected.

## Constraints

- Do not break existing selection persistence.
- Do not change unrelated wizard behavior.
- Keep the implementation simple and consistent across steps.

## Deliverables

- Updated wizard components or pages.
- Updated selection state logic.
- Removed Add Selected buttons everywhere they appear.
- Brief summary of the automatic counting behavior.

## Output Format

When done, report:
- Which wizard steps were updated
- How selection counting now works
- What files were changed