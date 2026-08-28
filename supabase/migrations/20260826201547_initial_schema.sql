-- Initial schema for the Meal Planner application.
-- See SPEC.md sections 9, 10 and 25 for the data model and integrity rules this encodes.

create extension if not exists "pgcrypto";

-- Shared trigger to keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------

create table recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary_description text,
  source_url text,
  prep_time_category text not null,
  cuisine text not null,
  storage_type text not null,
  diet_type text not null,
  child_friendly text not null default 'NOT_SPECIFIED',
  preparation_type text not null default 'NOT_SPECIFIED',
  instructions text,
  image_storage_path text,
  image_original_name text,
  image_mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recipes_title_not_blank check (btrim(title) <> ''),
  constraint recipes_title_length check (char_length(title) <= 150),
  constraint recipes_summary_length check (
    summary_description is null or char_length(summary_description) <= 500
  ),
  constraint recipes_source_url_length check (
    source_url is null or char_length(source_url) <= 2000
  ),
  constraint recipes_instructions_length check (
    instructions is null or char_length(instructions) <= 10000
  ),
  constraint recipes_prep_time_category_valid check (
    prep_time_category in (
      'UNDER_15', 'FROM_15_TO_30', 'FROM_30_TO_60', 'FROM_60_TO_90', 'OVER_90'
    )
  ),
  constraint recipes_cuisine_valid check (
    cuisine in (
      'AFRICAN', 'AMERICAN', 'BRITISH', 'CARIBBEAN', 'CHINESE', 'EASTERN_EUROPEAN',
      'FRENCH', 'GREEK', 'INDIAN', 'ITALIAN', 'JAPANESE', 'KOREAN', 'LATIN_AMERICAN',
      'MEDITERRANEAN', 'MEXICAN', 'MIDDLE_EASTERN', 'NORTH_AFRICAN', 'SCANDINAVIAN',
      'SOUTH_EAST_ASIAN', 'SPANISH', 'THAI', 'VIETNAMESE', 'OTHER'
    )
  ),
  constraint recipes_storage_type_valid check (
    storage_type in ('STORE_CUPBOARD', 'FRESH', 'MIXED')
  ),
  constraint recipes_diet_type_valid check (
    diet_type in ('VEGETARIAN', 'MEAT_OR_FISH', 'FLEXIBLE')
  ),
  constraint recipes_child_friendly_valid check (
    child_friendly in ('YES', 'NO', 'NOT_SPECIFIED')
  ),
  constraint recipes_preparation_type_valid check (
    preparation_type in ('PRE_PREPARED', 'REQUIRES_PREPARATION', 'NOT_SPECIFIED')
  )
);

create trigger recipes_set_updated_at
  before update on recipes
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ingredients
-- ---------------------------------------------------------------------------

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  name text not null,
  quantity text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ingredients_name_not_blank check (btrim(name) <> ''),
  constraint ingredients_name_length check (char_length(name) <= 150),
  constraint ingredients_quantity_length check (
    quantity is null or char_length(quantity) <= 50
  )
);

create index ingredients_recipe_id_sort_order_idx
  on ingredients (recipe_id, sort_order);

create trigger ingredients_set_updated_at
  before update on ingredients
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- meal_plan_entries
-- ---------------------------------------------------------------------------

create table meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_date date not null,
  slot smallint not null,
  entry_type text not null,
  recipe_id uuid references recipes (id) on delete restrict,
  manual_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_plan_entries_slot_valid check (slot in (1, 2)),
  constraint meal_plan_entries_entry_type_valid check (
    entry_type in ('recipe', 'manual')
  ),
  constraint meal_plan_entries_manual_title_length check (
    manual_title is null or char_length(manual_title) <= 100
  ),
  constraint meal_plan_entries_manual_title_not_blank check (
    manual_title is null or btrim(manual_title) <> ''
  ),
  -- Enforce the integrity rules from SPEC.md section 9.4: a recipe entry
  -- must reference a recipe and must not carry a manual title, and a manual
  -- entry must carry a title and must not reference a recipe.
  constraint meal_plan_entries_entry_type_shape check (
    (entry_type = 'recipe' and recipe_id is not null and manual_title is null)
    or
    (entry_type = 'manual' and recipe_id is null and manual_title is not null)
  ),
  constraint meal_plan_entries_date_slot_unique unique (meal_date, slot)
);

create index meal_plan_entries_meal_date_idx on meal_plan_entries (meal_date);
create index meal_plan_entries_recipe_id_idx on meal_plan_entries (recipe_id);

create trigger meal_plan_entries_set_updated_at
  before update on meal_plan_entries
  for each row
  execute function set_updated_at();
