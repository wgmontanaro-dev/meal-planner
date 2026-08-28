-- Make every recipe field except the title optional.
--
-- Previously the six controlled-category columns were NOT NULL (and
-- child_friendly / preparation_type carried a NOT_SPECIFIED default), so a
-- recipe could not be saved without choosing all of them. The product rule is
-- now: title is the only required field; a NULL category means "not
-- specified". Existing rows keep whatever value they already hold.

alter table recipes
  alter column prep_time_category drop not null,
  alter column cuisine            drop not null,
  alter column storage_type       drop not null,
  alter column diet_type          drop not null,
  alter column child_friendly     drop not null,
  alter column preparation_type   drop not null;

alter table recipes
  alter column child_friendly   drop default,
  alter column preparation_type drop default;

-- Re-state the value checks so they permit NULL alongside the known values.

alter table recipes drop constraint recipes_prep_time_category_valid;
alter table recipes add constraint recipes_prep_time_category_valid check (
  prep_time_category is null or prep_time_category in (
    'UNDER_15', 'FROM_15_TO_30', 'FROM_30_TO_60', 'FROM_60_TO_90', 'OVER_90'
  )
);

alter table recipes drop constraint recipes_cuisine_valid;
alter table recipes add constraint recipes_cuisine_valid check (
  cuisine is null or cuisine in (
    'AFRICAN', 'AMERICAN', 'BRITISH', 'CARIBBEAN', 'CHINESE', 'EASTERN_EUROPEAN',
    'FRENCH', 'GREEK', 'INDIAN', 'ITALIAN', 'JAPANESE', 'KOREAN', 'LATIN_AMERICAN',
    'MEDITERRANEAN', 'MEXICAN', 'MIDDLE_EASTERN', 'NORTH_AFRICAN', 'SCANDINAVIAN',
    'SOUTH_EAST_ASIAN', 'SPANISH', 'THAI', 'VIETNAMESE', 'OTHER'
  )
);

alter table recipes drop constraint recipes_storage_type_valid;
alter table recipes add constraint recipes_storage_type_valid check (
  storage_type is null or storage_type in ('STORE_CUPBOARD', 'FRESH', 'MIXED')
);

alter table recipes drop constraint recipes_diet_type_valid;
alter table recipes add constraint recipes_diet_type_valid check (
  diet_type is null or diet_type in ('VEGETARIAN', 'MEAT_OR_FISH', 'FLEXIBLE')
);

alter table recipes drop constraint recipes_child_friendly_valid;
alter table recipes add constraint recipes_child_friendly_valid check (
  child_friendly is null or child_friendly in ('YES', 'NO', 'NOT_SPECIFIED')
);

alter table recipes drop constraint recipes_preparation_type_valid;
alter table recipes add constraint recipes_preparation_type_valid check (
  preparation_type is null or preparation_type in (
    'PRE_PREPARED', 'REQUIRES_PREPARATION', 'NOT_SPECIFIED'
  )
);
