# Meal Planner Web Application

## Product and Implementation Specification

Document status: Approved for initial implementation
Target release: MVP
Primary users: One married couple
Primary device: Mobile phone
Deployment target: Vercel or an equivalent web-hosting platform
Language: English, using UK conventions
Application timezone: Europe/London

## 1. Instructions to the Coding Agent

Implement the application described in this specification.

### 1.1 Implementation principles

The implementation must:

1. Prioritise simplicity and intuitive use.
2. Be mobile-first.
3. Avoid features not explicitly included in this specification.
4. Use strict TypeScript.
5. Validate data on the server, even where client-side validation is also provided.
6. protect all recipe and meal-plan data behind server-side password authentication.
7. Include database migrations or an equivalent reproducible database definition.
8. Include clear setup and deployment instructions in README.md.
9. Include automated tests for critical business rules.
10. Provide useful empty, loading, success and error states.
11. Avoid unnecessary abstraction or enterprise-scale architecture.
12. Never expose database service credentials or the shared password to client-side JavaScript.
13. Prefer maintainable, conventional implementation patterns over bespoke frameworks.

### 1.2 Decision hierarchy

If an implementation detail is not specified:

1. Use the simplest solution that satisfies the requirements.
2. Prefer accessible native browser behaviour.
3. Prefer server-side enforcement for security and business rules.
4. Do not introduce a new product feature to resolve an ambiguity.
5. Document any material assumption in README.md.

## 2. Product Vision

The Meal Planner is a small collaborative web application that allows a couple to:

- Maintain a shared library of recipes they like.
- Plan up to two meals for each calendar date.
- Enter occasional meals that are not recipes, such as "Dinner out".
- Generate a shopping list for a selected period.
- See changes made by either person through the same shared application.

The application is a shared working space rather than a multi-user platform. Both users have identical access and permissions.

## 3. Product Goals

The MVP must make it quick and straightforward to:

1. Add and maintain recipes.
2. Filter recipes using practical meal categories.
3. Assign a recipe to a calendar date.
4. enter a manual meal without creating a recipe.
5. Review meal plans on mobile and desktop.
6. Generate a shopping list from planned recipes.
7. Preserve shared information between sessions.
8. Restrict access using one shared password.

## 4. Success Criteria

The MVP is successful when:

- Both users can access the same deployed application.
- Unauthenticated visitors cannot read or change application data.
- A user can add a recipe through the user interface.
- The recipe remains available after the application is refreshed.
- A user can assign a recipe to either meal slot on a date.
- The meal assignment remains available after refresh.
- A user can enter a manual meal instead of selecting a recipe.
- The mobile interface clearly displays both meal slots for each date.
- A date-range shopping list correctly includes ingredients from planned recipes.
- Recipes cannot be deleted while they are assigned to a retained or future meal plan.
- The current month, previous three complete months and all future plans behave according to the retention rules.

## 5. Scope

### 5.1 Included in the MVP

**Shared access**

- One shared password.
- No individual accounts.
- No separate permissions.
- Secure authenticated session.
- All authenticated users can view and change all data.

**Recipe library**

- View recipes.
- Add recipes.
- Edit recipes.
- Delete eligible recipes.
- Filter recipes.
- View recipe details.
- Store a source URL.
- Store ingredients as individual rows.
- Store optional free-text instructions.
- Upload one optional image.
- Display image thumbnails.
- Enlarge an image for viewing.

**Meal calendar**

- Current month shown by default.
- Month navigation.
- Two meal slots per date.
- Assign a library recipe.
- Add a manual meal.
- View, replace or remove an assigned meal.
- Mobile agenda layout.
- Tablet and desktop calendar grid.
- Historical visibility and retention rules.
- Unlimited future planning.

**Shopping list**

- Select a start and end date.
- Generate ingredients from planned recipes.
- Group ingredients by recipe occurrence.
- Display the relevant meal date.
- Copy the shopping list to the clipboard.
- Print the shopping list.

### 5.2 Explicitly excluded from the MVP

Do not implement:

- CSV or spreadsheet import.
- Bulk recipe creation.
- Downloadable import templates.
- Individual user accounts.
- Registration.
- Password reset.
- Password-management screens.
- Different roles or permissions.
- Multiple households.
- Recipe search.
- Recipe ratings.
- Recipe favourites.
- Recipe recommendations.
- Automatic recipe extraction from source URLs.
- Image import from external URLs.
- Recipe instruction steps as separate structured records.
- Recipe serving sizes.
- Ingredient units as separate fields.
- Ingredient sections.
- Ingredient consolidation.
- Shopping-list quantity calculations.
- Scaling recipes by serving count.
- Tickable or persistently checked shopping-list items.
- Pantry management.
- Stock tracking.
- Grocery-store integration.
- Cost or budget calculations.
- Nutrition or calorie information.
- Allergen management.
- Recurring meal plans.
- Drag-and-drop calendar interactions.
- Notifications or reminders.
- Email functionality.
- External calendar integration.
- Offline mode.
- Native iOS or Android applications.
- Real-time simultaneous editing as a guaranteed capability.

## 6. Recommended Technical Architecture

This section is prescriptive unless a dependency is unavailable.

### 6.1 Application stack

Use:

- Next.js with the App Router.
- TypeScript in strict mode.
- React.
- Tailwind CSS.
- A small accessible component library such as shadcn/ui.
- PostgreSQL-compatible persistent storage.
- Supabase PostgreSQL and Supabase Storage, or an equivalent managed service.
- Zod or an equivalent schema-validation library.
- Server Actions or route handlers for protected mutations.
- Vercel-compatible deployment.

### 6.2 Architectural constraints

- The browser must not receive privileged database credentials.
- Mutations must be executed through authenticated server-side code.
- Server-side code must enforce validation and business rules.
- Client-side validation may improve usability but must not be the only validation.
- Recipe images must be held in managed object storage, not directly in database rows.
- Database migrations must be committed to the repository.
- Application configuration must use environment variables.
- Production data must not be replaced by seed or demonstration data.

### 6.3 Suggested source structure

```
app/
  login/
  calendar/
  recipes/
  api-or-server-actions/
components/
  auth/
  calendar/
  recipes/
  shopping-list/
  shared/
lib/
  auth/
  database/
  validation/
  dates/
  storage/
  constants/
database-or-supabase/
  migrations/
tests/
```

This is guidance rather than a requirement. Keep the final structure straightforward.

## 7. Authentication and Access Control

### 7.1 Shared-password model

The application uses one shared password for both users.

Initial configured password:

```
Poppy
```

The password must not be embedded in client-side source code.

For local development and deployment, configure it using a server-side environment variable, for example:

```
APP_SHARED_PASSWORD=Poppy
```

Changing the password requires changing the technical configuration or source-controlled deployment configuration. There must be no user-facing password-change screen.

### 7.2 Login experience

When a user visits the application without a valid authenticated session:

1. Redirect the user to a minimal password screen.
2. Display:
   - Application name
   - Password input
   - "Access meal planner" button
3. Do not display recipe or calendar information.
4. Validate the supplied password on the server.
5. If correct:
   - Create a signed, secure session.
   - Redirect to the Calendar view.
6. If incorrect:
   - Remain on the password screen.
   - Display: "That password is not correct."
   - Do not reveal additional implementation information.

The password field must:

- Mask entered characters.
- Support submission using the Enter key.
- Have a visible label.
- Use appropriate password autocomplete behaviour.

### 7.3 Session requirements

The authenticated session should:

- Be represented by a signed or encrypted cookie.
- Use HttpOnly.
- Use Secure in production.
- Use an appropriate SameSite setting.
- Have a defined expiry.
- Persist across ordinary browser refreshes.
- Not contain the shared password.
- Be validated by server-side routes and mutations.

A cookie containing a plain boolean such as `authenticated=true` is not sufficient unless its integrity is cryptographically protected.

### 7.4 Protected resources

Authentication must protect:

- Calendar pages.
- Recipe pages.
- Recipe images where technically practical.
- Recipe reads.
- Recipe creation.
- Recipe editing.
- Recipe deletion.
- Meal-plan reads.
- Meal-plan creation and editing.
- Meal-plan deletion.
- Shopping-list generation.

Hiding page elements without protecting the underlying server endpoints is not sufficient.

### 7.5 Security positioning

This shared-password design is a convenience barrier for low-sensitivity household data. It is not intended to provide the identity, auditability or account recovery associated with individual user accounts.

## 8. Navigation and Global Layout

### 8.1 Primary navigation

The application has two primary destinations:

1. Calendar
2. Recipes

Calendar is the default landing page after authentication.

### 8.2 Mobile navigation

On mobile, use a persistent bottom navigation bar where possible.

Each destination must have:

- An icon.
- A text label.
- A clear active state.

The bottom navigation must not obscure page actions or calendar content.

### 8.3 Tablet and desktop navigation

On larger screens, navigation may appear as:

- A top navigation bar, or
- A compact side navigation.

Do not create separate functionality for different screen sizes.

### 8.4 Global accessibility

- Interactive controls must be keyboard accessible.
- Controls must have visible focus states.
- Do not rely on colour alone to communicate state.
- Touch targets should be comfortable for mobile use.
- Modal dialogues must trap focus appropriately.
- Closing a modal should return focus to the triggering control.
- Icons used as controls must have accessible labels.

## 9. Data Model

Use UUIDs or an equivalent non-sequential identifier.

### 9.1 Recipe

```ts
type Recipe = {
  id: string;
  title: string;
  summaryDescription: string | null;
  sourceUrl: string | null;
  prepTimeCategory: PrepTimeCategory;
  cuisine: Cuisine;
  storageType: StorageType;
  dietType: DietType;
  childFriendly: TernaryCategory;
  preparationType: PreparationType;
  instructions: string | null;
  imageStoragePath: string | null;
  imageOriginalName: string | null;
  imageMimeType: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 9.2 Ingredient

```ts
type Ingredient = {
  id: string;
  recipeId: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
```

Each ingredient belongs to exactly one recipe.

Deleting an eligible recipe must also delete its ingredients and associated image.

### 9.3 Meal-plan entry

```ts
type MealPlanEntry = {
  id: string;
  mealDate: string;
  slot: 1 | 2;
  entryType: "recipe" | "manual";
  recipeId: string | null;
  manualTitle: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 9.4 Meal-entry integrity rules

For a recipe entry:

```
entryType = recipe
recipeId is required
manualTitle must be null
```

For a manual entry:

```
entryType = manual
recipeId must be null
manualTitle is required
```

There may be no more than one meal-plan entry for each combination of:

```
mealDate + slot
```

Enforce this with a database-level unique constraint.

### 9.5 Relationships

```
Recipe 1 -> many Ingredients
Recipe 1 -> many MealPlanEntries
```

The relationship from a meal-plan entry to a recipe must use restrictive deletion behaviour. Do not cascade-delete meal-plan entries when a recipe deletion is attempted.

## 10. Controlled Categories

Store controlled values as stable internal identifiers. Display friendly labels in the interface.

### 10.1 Preparation time

```ts
type PrepTimeCategory =
  | "UNDER_15"
  | "FROM_15_TO_30"
  | "FROM_30_TO_60"
  | "FROM_60_TO_90"
  | "OVER_90";
```

Display labels:

- Under 15 minutes
- 15 to 30 minutes
- 30 to 60 minutes
- 60 to 90 minutes
- Over 90 minutes

Exactly one value is required.

### 10.2 Cuisine

Use the following predefined list for the MVP:

- African
- American
- British
- Caribbean
- Chinese
- Eastern European
- French
- Greek
- Indian
- Italian
- Japanese
- Korean
- Latin American
- Mediterranean
- Mexican
- Middle Eastern
- North African
- Scandinavian
- South East Asian
- Spanish
- Thai
- Vietnamese
- Other

Exactly one value is required.

Do not allow users to create or rename cuisines in the MVP.

"Other" supports recipes that do not fit the predefined categories.

### 10.3 Storage type

```ts
type StorageType =
  | "STORE_CUPBOARD"
  | "FRESH"
  | "MIXED";
```

Labels:

- Store cupboard
- Fresh
- Mixed

Exactly one value is required.

### 10.4 Diet type

```ts
type DietType =
  | "VEGETARIAN"
  | "MEAT_OR_FISH"
  | "FLEXIBLE";
```

Labels:

- Vegetarian
- Meat or fish
- Flexible

"Flexible" means that the recipe can reasonably be prepared either as vegetarian or with meat or fish.

Exactly one value is required.

### 10.5 Child-friendly

```ts
type TernaryCategory =
  | "YES"
  | "NO"
  | "NOT_SPECIFIED";
```

Labels:

- Yes
- No
- Not specified

Exactly one value is required. Default to "Not specified".

### 10.6 Preparation type

```ts
type PreparationType =
  | "PRE_PREPARED"
  | "REQUIRES_PREPARATION"
  | "NOT_SPECIFIED";
```

Labels:

- Pre-prepared
- Requires preparation or cooking
- Not specified

Exactly one value is required. Default to "Not specified".

## 11. Recipe Validation Rules

### 11.1 Title

- Required.
- Trim leading and trailing whitespace.
- Must contain at least one non-whitespace character.
- Maximum 150 characters.
- Duplicate titles are permitted.

### 11.2 Summary description

- Optional.
- Maximum 500 characters.
- Store null when empty.

### 11.3 Source URL

- Optional.
- If supplied, it must be a valid absolute HTTP or HTTPS URL.
- Maximum 2,000 characters.
- Display as a clickable link in the recipe library.
- Open in a new browser tab.
- Use safe external-link attributes.
- Display concise link text such as "View source", not the full URL where space is constrained.
- The full URL should remain available through accessible context or a tooltip where appropriate.

### 11.4 Ingredients

- At least one ingredient is required.
- Ingredient name is required.
- Ingredient name maximum: 150 characters.
- Quantity is optional.
- Quantity maximum: 50 characters.
- Quantity is deliberately stored as text.
- Examples of valid quantities:
  - 2
  - 300g
  - 1 large
  - Half a pack
  - To taste
- Preserve ingredient ordering.
- Do not create a separate unit field.
- Do not require numeric quantities.

### 11.5 Instructions

- Optional.
- One free-text field.
- Preserve line breaks.
- Maximum 10,000 characters.
- Do not parse the text into numbered steps.

### 11.6 Categories

All controlled categories are required. Categories with "Not specified" options may default to that value.

### 11.7 Image

- Optional.
- Maximum one image per recipe.
- Accept JPEG, PNG and WebP.
- Reject unsupported formats.
- Define and document a reasonable maximum upload size.
- Resize or compress oversized images before or during storage where practical.
- Preserve enough quality for an enlarged recipe preview.
- Generate or request an appropriately sized rendition for thumbnail display.
- Do not load the full-size image into every table row.
- Users can replace or remove an image.

## 12. Recipe Library

### 12.1 Library page purpose

The Recipe Library allows users to:

- Review all recipes.
- Filter recipes.
- Add recipes.
- View details.
- Edit recipes.
- Delete eligible recipes.

### 12.2 Empty state

A new production deployment starts with no recipes.

When the library is empty, display:

- A clear message such as "No recipes yet".
- Supporting text explaining that recipes added here can be used in the calendar.
- A prominent "Add recipe" button.

Do not populate production with demonstration recipes.

### 12.3 Library display on mobile

A conventional wide table is unsuitable for narrow screens. On mobile, show recipe summary cards or compact rows.

Each recipe summary must display:

- Image thumbnail or placeholder.
- Recipe title.
- Preparation-time label.
- Cuisine.
- Diet type.
- Clickable source link when present.
- A clear way to open recipe details.

Additional categories may be displayed compactly where space permits.

### 12.4 Library display on tablet and desktop

On larger screens, use a table or spacious list.

The summary view must include:

- Thumbnail.
- Title.
- Preparation time.
- Cuisine.
- Storage type.
- Diet type.
- Child-friendly category.
- Preparation type.
- Source link.
- Actions.

Avoid forcing the entire page to scroll horizontally.

### 12.5 Source link behaviour

Where a source URL exists:

- Show a visible, clickable source link in the summary view.
- Selecting the link opens the source in a new tab.
- Selecting the source link must not accidentally open the recipe detail view.

Where no source URL exists:

- Display an unobtrusive empty state such as "No source", or leave the source cell blank.

### 12.6 Filters

Provide filters for:

- Preparation time.
- Cuisine.
- Storage type.
- Diet type.
- Child-friendly status.
- Preparation type.

Filter behaviour:

- Multiple different filter dimensions may be active simultaneously.
- Different filter dimensions use AND logic.
- Each individual category may use a single selected value for the MVP.
- Filters update the visible recipe collection.
- Provide "Clear filters".
- Clearly indicate when filters are active.
- If no recipes match, display "No recipes match these filters".
- Do not provide free-text search.

On mobile, filters may be presented in a filter drawer or modal to preserve screen space.

Filtering may be client-side for a small recipe collection, provided authenticated server-side data access remains secure.

### 12.7 Recipe detail

Selecting a recipe opens a detail view, drawer or modal.

Display:

- Title.
- Image, if present.
- Summary description, if present.
- Clickable source link, if present.
- All category values.
- Ingredients as a bulleted list.
- Instructions, if present.
- Edit action.
- Delete action.

Ingredient formatting:

- If quantity is present: `Quantity Ingredient name`
- If quantity is absent: `Ingredient name`

Examples:

```
• 300g Pasta
• 1 large Onion
• Fresh basil
```

### 12.8 Image preview

- Show a small thumbnail in the library.
- Selecting the thumbnail opens an enlarged preview.
- The enlarged preview must be dismissible.
- Selecting the thumbnail must not trigger the source link.
- Provide appropriate alternative text based on the recipe title.

## 13. Add and Edit Recipe

### 13.1 Entry point

Place an "Add recipe" button prominently at the top of the Recipe Library.

On mobile, this may be:

- A prominent page button, or
- A labelled floating action button that does not obscure content.

### 13.2 Form sections

The recipe form should be divided into understandable sections:

1. Basic details
2. Ingredients
3. Categories
4. Instructions
5. Image

### 13.3 Ingredient editor

The form must allow users to:

- Add an ingredient row.
- Enter a required name.
- Enter an optional quantity.
- Remove an ingredient row.
- Reorder ingredients.

Reordering may use simple up and down controls. Drag-and-drop is not required.

The form must always retain at least one ingredient row.

### 13.4 Save behaviour

When saved successfully:

- Persist the recipe.
- Persist ingredient rows in their displayed order.
- Upload or update the image where applicable.
- Display a concise success message.
- Return to the recipe detail or library page.
- Make the recipe immediately available for calendar selection.

### 13.5 Error behaviour

When validation fails:

- Do not discard entered data.
- Display field-level error messages.
- Move focus to, or clearly identify, the first invalid field.
- Do not upload an image permanently if the recipe transaction fails.
- Show a general error only where the failure is not attributable to one field.

### 13.6 Unsaved changes

If practical, warn before navigating away from a recipe form containing unsaved changes. Do not introduce complex draft persistence.

## 14. Recipe Deletion

### 14.1 Deletion rule

A recipe cannot be deleted if any retained or future meal-plan entry references it.

The restriction must be enforced on the server and by the database relationship, not only by the user interface.

### 14.2 Eligible deletion flow

If a recipe has no meal-plan assignments:

1. User selects "Delete recipe".
2. Display a confirmation dialogue.
3. Identify the recipe by title.
4. Explain that deletion cannot be undone.
5. Provide "Cancel" and "Delete".
6. On confirmation:
   - Delete ingredients.
   - Delete the stored image.
   - Delete the recipe.
   - Return to the library.
   - Display a success message.

### 14.3 Blocked deletion flow

If the recipe is assigned to one or more retained or future dates:

- Do not delete it.
- Display a clear message such as:

```
This recipe cannot be deleted because it is used in the meal calendar. Remove it from all planned dates before deleting it.
```

The interface may also disable the delete action when assignment status is already known, but server enforcement remains mandatory.

### 14.4 Race condition

If assignment occurs after the deletion screen loads but before deletion completes, deletion must fail safely and preserve both records.

## 15. Calendar and Meal Planning

### 15.1 Default view

After login, display the Calendar page for the current calendar month in the Europe/London timezone.

### 15.2 Month navigation

Provide:

- Previous month.
- Next month.
- A month and year selector, or an equivalent accessible month picker.
- A "Today" or "Current month" action.

The user may navigate:

- Back to the earliest retained month.
- Forward without a product-defined limit.

Do not allow meal assignments in unavailable historical months.

### 15.3 Date representation

- Store meal dates as date-only values.
- Do not store a meal time.
- Avoid accidental date shifts caused by UTC conversion.
- Use Monday as the first day of the week.
- Use UK date display conventions.

### 15.4 Slots

Each date has exactly two conceptual slots:

- Meal 1
- Meal 2

Each slot may be:

- Empty.
- Assigned to a recipe.
- Filled with a manual meal title.

The same recipe may be assigned:

- To both slots on one date.
- To multiple dates.
- Multiple times within a shopping-list date range.

### 15.5 Mobile presentation

On mobile, use a vertically scrolling monthly agenda.

For each date:

- Display the weekday.
- Display the date.
- Highlight today.
- Display Meal 1.
- Display Meal 2.
- Make empty slots clearly selectable.
- Show the full meal title where reasonably possible.
- Avoid horizontal scrolling.

Dates should appear in chronological order for the selected month.

The view must include every date in the month, including dates without planned meals.

### 15.6 Tablet and desktop presentation

Use a standard seven-column monthly calendar grid.

Each date cell must include:

- Day number.
- Meal 1.
- Meal 2.
- A clear visual distinction between empty and populated slots.

Meal titles may be truncated within constrained cells, but the complete title must be accessible through selection or accessible text.

The page may scroll vertically to display the month.

### 15.7 Empty slot selection

Selecting an empty meal slot opens a dialogue or bottom sheet asking the user to choose:

1. Select from recipe library
2. Enter meal manually
3. Cancel

The dialogue must identify:

- Selected date.
- Selected slot.

## 16. Selecting a Recipe for a Meal Slot

### 16.1 Recipe-selection interface

Display a compact recipe collection containing:

- Thumbnail where present.
- Title.
- Preparation time.
- Cuisine.
- Diet type.

Provide the same category filters as the main Recipe Library.

Do not provide free-text search.

### 16.2 Selection behaviour

When a recipe is selected:

1. Confirm or immediately apply the selection.
2. Create or update the meal-plan entry.
3. Close the selection interface.
4. Update the selected calendar slot.
5. Persist the assignment.

A recipe title shown in the calendar must reflect the recipe's current title. If a recipe title is subsequently edited, calendar displays should show the updated title.

### 16.3 Empty recipe library

If the recipe library is empty when recipe selection is requested:

- Display an explanation.
- Provide a route to "Add recipe".
- Preserve the selected date and slot only if this can be implemented simply.
- Otherwise return the user to the calendar after recipe creation without assigning it automatically.

Automatic assignment of a newly created recipe is optional and must not complicate the MVP.

## 17. Manual Meal Entries

### 17.1 Manual meal fields

A manual meal consists only of a title.

Validation:

- Required.
- Trim whitespace.
- Maximum 100 characters.
- Must contain at least one non-whitespace character.

Examples:

- Dinner out
- Takeaway
- Leftovers
- At Mum and Dad's

### 17.2 Manual entry behaviour

- A manual meal does not create a recipe.
- It does not appear in the Recipe Library.
- It contributes no ingredients to a shopping list.
- It may be edited later.
- It may be replaced with a recipe.
- It may be removed.

## 18. Populated Meal-Slot Actions

Selecting a populated slot must open a small action menu, dialogue or bottom sheet.

### 18.1 Recipe meal actions

For a recipe entry, provide:

- View recipe
- Replace meal
- Remove meal
- Cancel

"Replace meal" returns to the choice between:

- Select from recipe library
- Enter meal manually

### 18.2 Manual meal actions

For a manual entry, provide:

- Edit title
- Replace meal
- Remove meal
- Cancel

### 18.3 Remove behaviour

Removal must:

- Require a clear user action.
- Remove only the selected date and slot.
- Not delete a recipe.
- Update the display after success.

A second confirmation is optional because the operation is limited and reversible through re-entry.

## 19. Calendar Retention Rules

### 19.1 Required behaviour

At any point in time, retain and expose:

- The current calendar month.
- The previous three complete calendar months.
- All future meal plans.

Example:

During August, the available historical period begins on 1 May.

- May is available.
- June is available.
- July is available.
- August is available.
- Future months are available.
- April and earlier are unavailable and must appear blank or inaccessible.

### 19.2 Retention boundary

Calculate:

```
earliest permitted date =
first day of current month minus three calendar months
```

Use the Europe/London calendar date when determining the current month.

### 19.3 Behaviour for expired entries

Meal-plan entries earlier than the retention boundary must be deleted or otherwise removed from active storage.

The user-visible requirements are:

- Expired entries do not reappear.
- Expired entries are not included in shopping lists.
- Expired entries do not prevent recipe deletion.
- Recipes are never deleted as part of retention processing.
- Ingredients and recipe images are never deleted as part of retention processing.

### 19.4 Housekeeping implementation

Implement a simple reliable housekeeping approach compatible with the deployment environment.

Acceptable approaches include:

- Server-side cleanup during authenticated calendar access.
- Cleanup during meal-plan mutations.
- A deployment-supported scheduled task.

Avoid requiring a separate continuously running worker for the MVP.

Housekeeping must be idempotent.

### 19.5 Historical navigation

If the user tries to navigate earlier than the available period:

- Disable further backwards navigation, or
- Display a blank unavailable state explaining that meal history is retained for the current month and previous three months.

Do not allow adding meals to expired dates.

### 19.6 Future plans

- Future meal-plan entries must not expire simply because they are far in advance.
- Future entries become current and later historical naturally.
- They expire only after their dates move beyond the historical retention boundary.

## 20. Shopping List

### 20.1 Entry point

Display a "Generate shopping list" action on the Calendar page.

It must be accessible on mobile without obscuring calendar content.

### 20.2 Date selection

Selecting the action opens a dialogue requesting:

- Start date.
- End date.

Validation:

- Both dates are required.
- Start date must be on or before end date.
- The range cannot begin before the earliest retained date.
- Dates may include future plans.
- Use inclusive date boundaries.

### 20.3 Ingredient selection rules

For the selected inclusive range:

1. Find every meal-plan entry with entryType = recipe.
2. Retrieve the referenced recipe.
3. Retrieve that recipe's ingredients in sortOrder.
4. Ignore manual meals.
5. Do not merge duplicate ingredients.
6. Do not combine quantities.
7. Do not scale quantities.
8. Do not omit ingredients with no quantity.
9. Treat every recipe occurrence independently.

### 20.4 Grouping

Group the output by planned recipe occurrence, not merely by unique recipe.

For each occurrence display:

- Planned date.
- Meal slot.
- Recipe title.
- Its ingredients.

Example:

```
Monday, 7 September
Meal 1: Vegetable Curry

• 2 Onions
• 400g Chickpeas
• Fresh coriander


Wednesday, 9 September
Meal 2: Vegetable Curry

• 2 Onions
• 400g Chickpeas
• Fresh coriander
```

If the same recipe appears twice, show it twice.

### 20.5 Ingredient display

Where a quantity exists:

```
Quantity + space + Ingredient name
```

Where no quantity exists:

```
Ingredient name
```

Do not display empty punctuation or placeholder quantities.

### 20.6 Shopping-list order

Sort occurrences by:

1. Meal date ascending.
2. Meal slot ascending.

Within each recipe, sort ingredients by their stored order.

### 20.7 Empty result

If no library recipes occur in the selected range:

- Display a clear empty state.
- Explain that manual meals do not contribute ingredients.
- Do not treat the result as an error.

### 20.8 Output actions

Provide:

**Copy to clipboard**

Copy a readable plain-text version containing:

- Date.
- Meal slot.
- Recipe title.
- Ingredient bullets or line items.

After success, display brief confirmation.

If clipboard access fails, display a clear fallback message without losing the generated list.

**Print**

Provide a print-friendly layout that:

- Removes application navigation.
- Removes action buttons.
- Uses readable black text.
- Avoids unnecessary backgrounds.
- Preserves recipe grouping.
- Preserves dates and meal slots.

File download and PDF generation are out of scope.

## 21. Image Storage Behaviour

### 21.1 Upload

When a user uploads an image:

- Validate MIME type on the server.
- Validate file size.
- Generate a unique storage name.
- Do not trust the client-provided filename as a storage path.
- Store useful image metadata on the recipe.
- Avoid public write access to the storage container.

### 21.2 Replace

When an image is replaced:

1. Upload and validate the new image.
2. Update the recipe reference.
3. Remove the previous image after the update succeeds.
4. Avoid leaving the recipe without its original image if replacement fails.

### 21.3 Remove

When an image is removed:

- Clear the recipe image reference.
- Delete the associated object.
- Fall back to the image placeholder.

### 21.4 Delete recipe

When an eligible recipe is deleted, remove its image from storage.

A failed storage cleanup must be logged appropriately but must not expose technical information to the user.

## 22. Persistence and Collaboration

### 22.1 Shared data

All authenticated users operate on the same:

- Recipe library.
- Meal plan.
- Shopping-list source data.

There is no concept of recipe ownership or user-specific meals.

### 22.2 Refresh behaviour

At minimum:

- Changes must be visible after another user refreshes the application.
- A browser refresh must not lose saved data.
- Navigating between Calendar and Recipes should retrieve or revalidate current data appropriately.

Immediate real-time updates are optional.

Do not introduce a complex real-time architecture solely for this MVP.

### 22.3 Concurrent edits

Full collaborative conflict resolution is out of scope.

Use a simple strategy:

- Last successful update wins for ordinary edits.
- Database constraints protect slot uniqueness.
- If a mutation conflicts or fails, display an error and refresh the affected data.
- Never silently create two records for the same date and slot.

## 23. User Feedback and Application States

All data-driven views must support:

- Loading state.
- Empty state.
- Error state.
- Success feedback where appropriate.

### 23.1 Error-message principles

Messages should:

- Be concise.
- Explain what the user can do.
- Avoid database or stack-trace details.
- Avoid generic "Something went wrong" wording where a more specific message is available.

Examples:

- "The recipe could not be saved. Check the highlighted fields."
- "This recipe is used in the meal calendar and cannot be deleted."
- "The selected meal slot was changed elsewhere. The calendar has been refreshed."
- "The image must be a JPEG, PNG or WebP file."

### 23.2 Destructive actions

Use confirmation for recipe deletion.

Do not use confirmation for every minor edit. Avoid creating unnecessary friction.

## 24. Server Operations

The implementation may use Server Actions or route handlers. The following logical operations must exist regardless of transport.

### 24.1 Authentication

```
authenticateSharedPassword(password)
validateSession()
clearSession() // optional UI exposure
```

### 24.2 Recipes

```
listRecipes(filters?)
getRecipe(recipeId)
createRecipe(input)
updateRecipe(recipeId, input)
deleteRecipe(recipeId)
getRecipeUsage(recipeId)
```

### 24.3 Images

```
uploadRecipeImage(recipeId, file)
replaceRecipeImage(recipeId, file)
removeRecipeImage(recipeId)
```

These may be incorporated into recipe create and update transactions.

### 24.4 Meal plans

```
getMealPlanForMonth(year, month)
setRecipeMeal(date, slot, recipeId)
setManualMeal(date, slot, title)
removeMeal(date, slot)
cleanupExpiredMealPlans()
```

setRecipeMeal and setManualMeal must upsert against the unique date-and-slot key.

### 24.5 Shopping list

```
generateShoppingList(startDate, endDate)
```

The server must derive ingredients from stored meal-plan and recipe data. Do not accept a client-computed ingredient list as authoritative.

## 25. Transaction and Integrity Requirements

Use transactions where a partial update could leave inconsistent data.

Examples:

- Creating a recipe and its ingredients.
- Updating a recipe and replacing its ingredient collection.
- Deleting a recipe and its ingredients.
- Replacing a recipe image reference.
- Upserting a meal-plan slot.

Business rules must be protected against concurrent requests.

The database should include:

- Primary keys.
- Foreign keys.
- Unique constraint on meal date and slot.
- Check constraint or equivalent validation for slot values.
- Check constraints or server validation for valid entry-type combinations.
- Restrictive recipe deletion when referenced by a meal-plan entry.
- Index on meal-plan date.
- Index on meal-plan recipe ID.
- Index on ingredient recipe ID and ordering.

## 26. Responsive Design Requirements

### 26.1 Mobile-first baseline

Design initially for a narrow mobile viewport.

Prioritise:

- One-handed navigation.
- Readable text.
- Large controls.
- Minimal horizontal density.
- Bottom sheets or full-screen modals for complex selection.
- Visible date context during meal selection.
- Avoidance of horizontal page scrolling.

### 26.2 Breakpoint behaviour

At an appropriate responsive breakpoint:

- Change the monthly agenda to a seven-column calendar grid.
- Change recipe cards to a table or expanded list.
- Move filters from a drawer to visible page controls where space permits.
- Preserve all features and data.

### 26.3 Modal behaviour

On mobile:

- Complex forms may use full-screen dialogues or dedicated pages.
- Short action menus may use bottom sheets.

On desktop:

- Dialogues or side panels are acceptable.

Do not place the entire recipe creation form in a cramped mobile popup.

## 27. Performance Requirements

The application should feel responsive for normal household-scale data.

Implementation expectations:

- Do not retrieve full-size images for thumbnails.
- Retrieve meal-plan entries by relevant month or range.
- Avoid loading all future meal plans when showing one month.
- Avoid database queries inside render loops.
- Prevent unnecessary duplicate requests.
- Use indexes for date and relationship lookups.
- Optimise images.
- Use server rendering or caching only where compatible with shared mutable data.
- Revalidate mutable data after successful changes.

No synthetic enterprise-scale performance requirement is necessary.

## 28. Privacy and Logging

- Do not log the shared password.
- Do not log session tokens.
- Do not expose environment variables to the browser.
- Avoid logging full form submissions unless explicitly sanitised.
- Do not add third-party analytics in the MVP.
- Do not add advertising or tracking.
- Technical errors may be logged server-side.
- User-facing errors must not display stack traces or internal database details.

## 29. Core User Stories and Acceptance Criteria

**US-01: Access the application**

As a household user, I want to enter the shared password so that the meal-planning data is not openly accessible.

Acceptance criteria:

- An unauthenticated visitor sees the password page.
- Recipe and meal data are not returned to an unauthenticated request.
- Poppy authenticates when configured as the deployment password.
- An incorrect password displays an error.
- A correct password creates a secure session.
- Refreshing the page retains access until session expiry.
- The password is not shipped in client-side JavaScript.

**US-02: View an empty recipe library**

As a user, I want a helpful empty state so that I know how to add the first recipe.

Acceptance criteria:

- Production starts with no recipes.
- The library explains that no recipes exist.
- "Add recipe" is clearly available.
- No demonstration recipes are inserted automatically.

**US-03: Add a recipe**

As a user, I want to add a recipe so that it can be used in future meal plans.

Acceptance criteria:

- Title and at least one ingredient are required.
- Quantity may be empty.
- Summary, URL, instructions and image are optional.
- All category fields can be completed.
- Invalid URLs are rejected.
- Valid images can be uploaded.
- Saving persists the recipe and ordered ingredients.
- The recipe appears in the library and meal selector.

**US-04: Filter recipes**

As a user, I want to filter recipes by category so that I can find a suitable meal without searching by text.

Acceptance criteria:

- Every specified category has a filter.
- Filters work together.
- Active filters are visible.
- Filters can be cleared.
- A no-results state is displayed.
- No free-text search is provided.

**US-05: View a recipe**

As a user, I want to view recipe information so that I can see its ingredients and cooking instructions.

Acceptance criteria:

- Ingredients appear as a bulleted list.
- Missing quantities do not prevent display.
- Instructions preserve line breaks.
- The source URL is clickable when present.
- The image can be enlarged when present.

**US-06: Edit a recipe**

As a user, I want to update recipe information so that the library stays accurate.

Acceptance criteria:

- All recipe fields can be edited.
- Ingredient order can be changed.
- Images can be added, replaced or removed.
- Changes persist.
- Updated titles are reflected in calendar displays.

**US-07: Delete an unassigned recipe**

As a user, I want to delete an unused recipe so that the library remains relevant.

Acceptance criteria:

- Confirmation is required.
- An unassigned recipe can be deleted.
- Its ingredients and image are removed.
- The deletion persists.

**US-08: Prevent deletion of an assigned recipe**

As a user, I must not delete a recipe used in the calendar so that planned meals remain valid.

Acceptance criteria:

- Deletion is blocked if any retained or future assignment exists.
- A useful explanation is displayed.
- The recipe and assignments remain unchanged.
- The server enforces the rule.

**US-09: View the meal calendar**

As a user, I want to review a month of meals so that I can understand our plan.

Acceptance criteria:

- The current month appears by default.
- Every date has Meal 1 and Meal 2.
- Mobile uses an agenda layout.
- Larger screens use a monthly grid.
- Meal titles are visible.
- Month navigation is available.

**US-10: Assign a recipe**

As a user, I want to assign a stored recipe to a meal slot so that it becomes part of the plan.

Acceptance criteria:

- An empty slot offers library or manual entry.
- The library selector supports category filters.
- Selecting a recipe fills the correct date and slot.
- The assignment persists after refresh.
- The same recipe may be used multiple times.

**US-11: Add a manual meal**

As a user, I want to enter a simple non-recipe meal so that plans such as eating out can be recorded.

Acceptance criteria:

- A title is required.
- Maximum length is 100 characters.
- The entry appears in the chosen slot.
- It persists.
- It does not create a recipe.
- It does not add ingredients to shopping lists.

**US-12: Manage an existing meal**

As a user, I want to view, replace, edit or remove a meal so that plans can change.

Acceptance criteria:

- Recipe entries offer view, replace and remove.
- Manual entries offer edit, replace and remove.
- Replacing affects only the selected slot.
- Removing does not delete a recipe.
- Updates persist.

**US-13: Observe historical retention**

As a user, I want recent history retained without keeping meal plans indefinitely.

Acceptance criteria:

- Current month is available.
- Previous three complete months are available.
- Older entries do not appear.
- Older entries do not block recipe deletion.
- Recipes are not removed by retention processing.
- Future meal plans remain available.

**US-14: Generate a shopping list**

As a user, I want ingredients for a selected period so that I know what to buy.

Acceptance criteria:

- Start and end dates are required.
- The range is inclusive.
- Each recipe occurrence appears separately.
- Date, slot and recipe title are shown.
- Ingredients retain their recipe order.
- Ingredients without quantities are present.
- Manual meals are ignored.
- Duplicate ingredients are not consolidated.

**US-15: Copy and print a shopping list**

As a user, I want to copy or print the list so that I can use it away from the planning screen.

Acceptance criteria:

- Copy produces readable plain text.
- Success or failure feedback is shown.
- Print removes navigation and controls.
- Printed grouping remains understandable.

## 30. Essential Test Scenarios

Include automated unit or integration tests for critical business logic and end-to-end coverage where practical.

### 30.1 Authentication tests

- Correct password succeeds.
- Incorrect password fails.
- Missing session cannot read protected data.
- Missing session cannot mutate protected data.
- Session cookie does not store the password.

### 30.2 Recipe-validation tests

- Blank title fails.
- Whitespace-only title fails.
- Duplicate title succeeds.
- No ingredients fails.
- Ingredient with no quantity succeeds.
- Ingredient with no name fails.
- Invalid source URL fails.
- Empty optional values become null.
- Unsupported image type fails.

### 30.3 Recipe-deletion tests

- Unassigned recipe can be deleted.
- Assigned recipe cannot be deleted.
- Concurrent assignment prevents deletion.
- Expired assignments do not block deletion after retention cleanup.

### 30.4 Meal-slot tests

- Recipe entry satisfies integrity rules.
- Manual entry satisfies integrity rules.
- Invalid mixed entry fails.
- Slot other than 1 or 2 fails.
- Duplicate date and slot are not created.
- Updating a slot replaces the existing value.
- Same recipe may be used in several slots.

### 30.5 Retention tests

Use a controllable clock.

Test:

- Earliest available date is the first day of the current month minus three calendar months.
- Entry on the boundary remains.
- Entry one day before the boundary expires.
- Future entries remain.
- Recipe records remain.
- Expired entries are absent from shopping lists.
- Expired entries no longer block recipe deletion.

Include tests around year boundaries, for example where the current month is January.

### 30.6 Shopping-list tests

- Date range is inclusive.
- Start after end fails.
- Recipe ingredients appear.
- Manual meals are ignored.
- Missing quantity is handled.
- Same recipe on two dates appears twice.
- Occurrences sort by date and slot.
- Ingredients sort by stored order.
- Empty range returns a valid empty state.

### 30.7 Responsive end-to-end tests

At minimum verify:

- Mobile calendar uses the agenda presentation.
- Desktop uses the monthly grid.
- Both layouts expose Meal 1 and Meal 2.
- Recipe source links work independently from row selection.
- Image preview can be opened and closed.
- Mobile forms do not require horizontal scrolling.

## 31. Definition of Done

The MVP is complete only when:

- All in-scope functionality is implemented.
- Out-of-scope functionality has not been introduced.
- Production starts with an empty recipe library.
- Database migrations are reproducible.
- Authentication protects pages and server operations.
- The shared password is configured server-side.
- Recipes and meal plans persist.
- Recipe deletion restrictions are enforced server-side.
- Retention behaviour is implemented and tested.
- Mobile and desktop calendar layouts work.
- Shopping lists can be generated, copied and printed.
- Recipe images can be uploaded, viewed, replaced and removed.
- Error, loading and empty states exist.
- Critical tests pass.
- Type checking passes.
- Linting passes.
- A production build succeeds.
- README.md explains local setup, environment variables, database setup, storage setup, testing and Vercel deployment.

## 32. Suggested Build Sequence

Implement in this order:

**Stage 1: Foundation**

- Initialise the application.
- Configure TypeScript and styling.
- Configure the database.
- Add migrations.
- Implement server-side shared-password authentication.
- Add protected Calendar and Recipes routes.
- Add global mobile-first navigation.

**Stage 2: Recipe core**

- Implement recipe and ingredient models.
- Build the empty library state.
- Build recipe creation.
- Build recipe detail.
- Build recipe editing.
- Build filters.
- Implement source links.
- Implement deletion restrictions.

**Stage 3: Calendar core**

- Implement month retrieval.
- Build mobile agenda.
- Build desktop calendar grid.
- Implement Meal 1 and Meal 2.
- Implement recipe assignment.
- Implement manual entries.
- Implement slot action menus.
- Implement replace and remove.

**Stage 4: Retention**

- Implement the retention-boundary calculation.
- Implement idempotent cleanup.
- Prevent modifications to expired dates.
- Verify future plans remain.
- Add boundary and year-transition tests.

**Stage 5: Shopping list**

- Implement date-range selection.
- Implement occurrence-based ingredient output.
- Implement empty output.
- Implement clipboard copy.
- Implement print styling.

**Stage 6: Images and hardening**

- Implement image upload.
- Implement thumbnail delivery.
- Implement enlarged preview.
- Implement replacement and removal.
- Add security, accessibility and responsive checks.
- Complete tests and deployment documentation.

Do not begin by implementing every page simultaneously. Complete and verify each stage before building dependants.

## 33. Final Product Constraint

When choosing between additional capability and a simpler interface, choose the simpler interface unless the additional capability is explicitly required by this specification.

The MVP should feel like a small shared household tool, not a general-purpose recipe-management platform.
