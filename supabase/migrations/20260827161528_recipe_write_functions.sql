-- Transactional recipe write helpers.
-- See SPEC.md section 25: creating/updating a recipe and its ingredients
-- must not leave inconsistent data. supabase-js issues one statement per
-- round trip, so these two functions do the multi-statement work inside a
-- single Postgres function invocation, which runs in one implicit
-- transaction and rolls back entirely on error.

create or replace function create_recipe_with_ingredients(
  recipe jsonb,
  ingredients jsonb
)
returns uuid
language plpgsql
as $$
declare
  new_recipe_id uuid;
begin
  insert into recipes (
    title, summary_description, source_url, prep_time_category, cuisine,
    storage_type, diet_type, child_friendly, preparation_type, instructions
  )
  values (
    recipe ->> 'title',
    recipe ->> 'summaryDescription',
    recipe ->> 'sourceUrl',
    recipe ->> 'prepTimeCategory',
    recipe ->> 'cuisine',
    recipe ->> 'storageType',
    recipe ->> 'dietType',
    recipe ->> 'childFriendly',
    recipe ->> 'preparationType',
    recipe ->> 'instructions'
  )
  returning id into new_recipe_id;

  insert into ingredients (recipe_id, name, quantity, sort_order)
  select
    new_recipe_id,
    item ->> 'name',
    item ->> 'quantity',
    (ordinality - 1)::integer
  from jsonb_array_elements(ingredients) with ordinality as t(item, ordinality);

  return new_recipe_id;
end;
$$;

create or replace function update_recipe_with_ingredients(
  target_recipe_id uuid,
  recipe jsonb,
  ingredients jsonb
)
returns void
language plpgsql
as $$
begin
  update recipes
  set
    title = recipe ->> 'title',
    summary_description = recipe ->> 'summaryDescription',
    source_url = recipe ->> 'sourceUrl',
    prep_time_category = recipe ->> 'prepTimeCategory',
    cuisine = recipe ->> 'cuisine',
    storage_type = recipe ->> 'storageType',
    diet_type = recipe ->> 'dietType',
    child_friendly = recipe ->> 'childFriendly',
    preparation_type = recipe ->> 'preparationType',
    instructions = recipe ->> 'instructions'
  where id = target_recipe_id;

  if not found then
    raise exception 'Recipe % not found', target_recipe_id
      using errcode = 'P0002';
  end if;

  delete from ingredients where recipe_id = target_recipe_id;

  insert into ingredients (recipe_id, name, quantity, sort_order)
  select
    target_recipe_id,
    item ->> 'name',
    item ->> 'quantity',
    (ordinality - 1)::integer
  from jsonb_array_elements(ingredients) with ordinality as t(item, ordinality);
end;
$$;
