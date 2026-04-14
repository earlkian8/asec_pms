# Revision Plan

This document lists the requested revisions for the system and points to the detailed prompt files.

## Revision Items

1. Client Management cleanup
   - Remove unnecessary client inputs that are not used or relevant in the system.
   - Keep the address field.
   - Use the API for client data handling.
   - Create a new migration if the database schema needs to change.
   - Update related services and controllers for both API and Admin.
   - Detailed prompt: revision_1.md

2. Project creation cleanup
   - Remove status selection from Add Project.
   - Detailed prompt: revision_2.md

3. Project team assignment permissions
   - Add role constraints in project creation.
   - If the user does not have permission for team assignment, do not render those steps.
   - Detailed prompt: revision_3.md

4. Wizard selection behavior
   - Remove all Add Selected buttons from wizard steps.
   - Items should be counted automatically the moment they are checked.
   - Detailed prompt: revision_4.md

## Notes

- Keep the changes aligned with the current Laravel and Inertia structure.
- Prefer minimal, consistent edits that preserve existing behavior where not requested to change.