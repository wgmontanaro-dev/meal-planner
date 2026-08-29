import { describe, it, expect } from "vitest";
import {
  deriveDietType,
  extractRecipeFromHtml,
  looksLikeBotWall,
  mapCuisine,
  minutesToPrepTimeCategory,
  parseIsoDurationMinutes,
  parseRecipeText,
  splitIngredient,
} from "./import";

describe("parseIsoDurationMinutes", () => {
  it("reads hours and minutes", () => {
    expect(parseIsoDurationMinutes("PT1H30M")).toBe(90);
    expect(parseIsoDurationMinutes("PT20M")).toBe(20);
    expect(parseIsoDurationMinutes("PT2H")).toBe(120);
  });

  it("reads days and rounds seconds", () => {
    expect(parseIsoDurationMinutes("P1DT2H")).toBe(1560);
    expect(parseIsoDurationMinutes("PT90S")).toBe(2);
  });

  it("returns null for empty or unparseable input", () => {
    expect(parseIsoDurationMinutes("")).toBeNull();
    expect(parseIsoDurationMinutes("PT0S")).toBeNull();
    expect(parseIsoDurationMinutes("half an hour")).toBeNull();
    expect(parseIsoDurationMinutes(undefined)).toBeNull();
  });
});

describe("minutesToPrepTimeCategory", () => {
  it("buckets minutes to the controlled categories", () => {
    expect(minutesToPrepTimeCategory(10)).toBe("UNDER_15");
    expect(minutesToPrepTimeCategory(15)).toBe("FROM_15_TO_30");
    expect(minutesToPrepTimeCategory(30)).toBe("FROM_15_TO_30");
    expect(minutesToPrepTimeCategory(45)).toBe("FROM_30_TO_60");
    expect(minutesToPrepTimeCategory(90)).toBe("FROM_60_TO_90");
    expect(minutesToPrepTimeCategory(150)).toBe("OVER_90");
  });

  it("returns null when there is no usable time", () => {
    expect(minutesToPrepTimeCategory(null)).toBeNull();
    expect(minutesToPrepTimeCategory(0)).toBeNull();
  });
});

describe("mapCuisine", () => {
  it("maps a recipeCuisine string or array to the enum", () => {
    expect(mapCuisine("Italian", null, null)).toBe("ITALIAN");
    expect(mapCuisine(["Thai"], null, null)).toBe("THAI");
    expect(mapCuisine("mediterranean", null, null)).toBe("MEDITERRANEAN");
  });

  it("understands common synonyms", () => {
    expect(mapCuisine("Tex-Mex", null, null)).toBe("MEXICAN");
    expect(mapCuisine("Moroccan", null, null)).toBe("NORTH_AFRICAN");
  });

  it("falls back to keywords/title, then null", () => {
    expect(mapCuisine(null, ["quick", "italian dinner"], null)).toBe("ITALIAN");
    expect(mapCuisine(null, null, "Weeknight stir fry")).toBeNull();
  });
});

describe("deriveDietType", () => {
  it("trusts an explicit suitableForDiet value", () => {
    expect(
      deriveDietType("https://schema.org/VeganDiet", [{ name: "Beef", quantity: null }], null, null)
    ).toEqual({ value: "VEGETARIAN", guessed: false });
  });

  it("detects meat or fish from the ingredients", () => {
    const result = deriveDietType(
      null,
      [
        { name: "Chicken thighs", quantity: "900g" },
        { name: "Onion", quantity: "1" },
      ],
      "Chicken curry",
      null
    );
    expect(result).toEqual({ value: "MEAT_OR_FISH", guessed: false });
  });

  it("guesses vegetarian when nothing meaty is present", () => {
    const result = deriveDietType(
      null,
      [
        { name: "Chickpeas", quantity: "400g" },
        { name: "Spinach", quantity: "200g" },
        { name: "Onion", quantity: "1" },
        { name: "Garlic", quantity: "2 cloves" },
      ],
      "Chickpea and spinach stew",
      null
    );
    expect(result).toEqual({ value: "VEGETARIAN", guessed: true });
  });

  it("stays undecided with too little to go on", () => {
    expect(deriveDietType(null, [{ name: "Salt", quantity: null }], null, null)).toEqual({
      value: null,
      guessed: false,
    });
  });
});

describe("splitIngredient", () => {
  it("splits a leading quantity from the name", () => {
    expect(splitIngredient("2 tbsp olive oil")).toEqual({ quantity: "2 tbsp", name: "Olive oil" });
    expect(splitIngredient("400g tin chopped tomatoes")).toEqual({
      quantity: "400 g tin",
      name: "Chopped tomatoes",
    });
  });

  it("leaves quantity null when there is no amount", () => {
    expect(splitIngredient("Salt and pepper, to taste")).toEqual({
      quantity: null,
      name: "Salt and pepper, to taste",
    });
  });

  it("keeps a numeric range as the quantity", () => {
    expect(splitIngredient("1-2 tbsp olive oil")).toEqual({
      quantity: "1-2 tbsp",
      name: "Olive oil",
    });
    expect(splitIngredient("6–8 cherry tomatoes")).toEqual({
      quantity: "6–8",
      name: "Cherry tomatoes",
    });
  });

  it("absorbs a parenthetical amount into the quantity", () => {
    const result = splitIngredient("1 (400g) can chickpeas, drained");
    expect(result?.name).toBe("Chickpeas, drained");
    expect(result?.quantity).toMatch(/400/);
  });
});

describe("parseRecipeText", () => {
  it("splits a paste that has Ingredients / Method headings", () => {
    const text = [
      "Spaghetti Aglio e Olio",
      "",
      "Serves 4 · 20 minutes",
      "",
      "Ingredients",
      "400g spaghetti",
      "6 garlic cloves, thinly sliced",
      "120ml extra virgin olive oil",
      "1 tsp chilli flakes",
      "Small bunch parsley, chopped",
      "",
      "Method",
      "1. Cook the spaghetti in salted boiling water until al dente.",
      "2. Gently fry the garlic in the oil until golden.",
      "3. Toss the drained pasta with the oil, parsley and seasoning.",
    ].join("\n");
    const result = parseRecipeText(text);
    expect(result).not.toBeNull();
    const r = result!.recipe;
    expect(r.title).toBe("Spaghetti Aglio e Olio");
    expect(r.ingredients).toHaveLength(5);
    expect(r.ingredients[0]).toEqual({ quantity: "400 g", name: "Spaghetti" });
    expect(r.ingredients.map((i) => i.name)).toContain("Chilli flakes");
    expect(r.instructions).toContain("Cook the spaghetti");
    expect(r.instructions).toContain("Toss the drained pasta");
  });

  it("handles an ALL CAPS title, bullet ingredients, a DIRECTIONS heading and a prep line", () => {
    const text = [
      "SPAGHETTI AGLIO E OLIO",
      "Prep: 5 mins · Cook: 15 mins",
      "",
      "INGREDIENTS",
      "- 400 g spaghetti",
      "- 6 cloves garlic",
      "- 120 ml olive oil",
      "",
      "DIRECTIONS",
      "Bring a large pot of salted water to a boil and cook the pasta.",
      "Meanwhile, warm the oil and garlic in a pan.",
    ].join("\n");
    const r = parseRecipeText(text)!.recipe;
    expect(r.title).toBe("Spaghetti Aglio E Olio");
    expect(r.prepTimeCategory).toBe("UNDER_15");
    expect(r.ingredients).toHaveLength(3);
    expect(r.ingredients[1]).toEqual({ quantity: "6 cloves", name: "Garlic" });
    expect(r.instructions?.startsWith("Bring a large pot")).toBe(true);
  });

  it("falls back to line shape when there are no headings", () => {
    const text = [
      "Quick tomato pasta",
      "2 tbsp olive oil",
      "1 onion, diced",
      "2 garlic cloves, crushed",
      "400g tin chopped tomatoes",
      "300g pasta",
      "Handful of basil",
      "Heat the oil and soften the onion for 5 minutes. Add the garlic and tomatoes and simmer for 15 minutes. Cook the pasta, drain and stir through. Serve topped with basil.",
    ].join("\n");
    const r = parseRecipeText(text)!.recipe;
    expect(r.title).toBe("Quick tomato pasta");
    expect(r.ingredients).toHaveLength(6);
    expect(r.ingredients.map((i) => i.name)).toContain("Basil");
    expect(r.instructions?.startsWith("Heat the oil")).toBe(true);
  });

  it("returns null when the text has no recipe in it", () => {
    expect(parseRecipeText("")).toBeNull();
    expect(parseRecipeText("just some words with no recipe structure here at all")).toBeNull();
  });
});

describe("looksLikeBotWall", () => {
  it("spots a Cloudflare interstitial", () => {
    expect(
      looksLikeBotWall(
        `<!DOCTYPE html><html><head><title>Just a moment...</title></head><body>` +
          `<div id="cf-wrapper">Enable JavaScript and cookies to continue</div></body></html>`
      )
    ).toBe(true);
  });

  it("passes a normal recipe page through", () => {
    expect(
      looksLikeBotWall(
        `<!DOCTYPE html><html><head><title>Spaghetti Aglio e Olio</title>` +
          `<script type="application/ld+json">{"@type":"Recipe"}</script></head><body>...</body></html>`
      )
    ).toBe(false);
  });
});

describe("extractRecipeFromHtml", () => {
  const html = `
    <html><head>
    <meta property="og:image" content="/images/pie.jpg" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Recipe",
      "name": "Cottage Pie",
      "description": "A proper British cottage pie.",
      "recipeCuisine": "British",
      "totalTime": "PT1H15M",
      "recipeIngredient": ["500g beef mince", "2 carrots, diced", "1 tbsp tomato puree"],
      "recipeInstructions": [
        { "@type": "HowToStep", "text": "Brown the mince." },
        { "@type": "HowToStep", "text": "Simmer with the veg." },
        { "@type": "HowToStep", "text": "Top with mash and bake." }
      ]
    }
    </script></head><body></body></html>`;

  it("pulls the core recipe out of JSON-LD", () => {
    const result = extractRecipeFromHtml(html, "https://example.com/cottage-pie");
    expect(result).not.toBeNull();
    const recipe = result!.recipe;
    expect(recipe.title).toBe("Cottage Pie");
    expect(recipe.summaryDescription).toBe("A proper British cottage pie.");
    expect(recipe.cuisine).toBe("BRITISH");
    expect(recipe.prepTimeCategory).toBe("FROM_60_TO_90");
    expect(recipe.dietType).toBe("MEAT_OR_FISH");
    expect(recipe.imageUrl).toBe("https://example.com/images/pie.jpg");
    expect(recipe.ingredients).toEqual([
      { quantity: "500 g", name: "Beef mince" },
      { quantity: "2", name: "Carrots, diced" },
      { quantity: "1 tbsp", name: "Tomato puree" },
    ]);
    expect(recipe.instructions).toBe(
      "Brown the mince.\n\nSimmer with the veg.\n\nTop with mash and bake."
    );
  });

  it("returns null when the page has no ingredients and no method", () => {
    expect(
      extractRecipeFromHtml("<html><body><p>just a blog post</p></body></html>", "https://x.test")
    ).toBeNull();
  });

  it("falls back to microdata when there is no JSON-LD", () => {
    const microdata = `
      <div itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Quick Salad</h1>
        <li itemprop="recipeIngredient">1 cucumber, sliced</li>
        <li itemprop="recipeIngredient">2 tbsp olive oil</li>
        <div itemprop="recipeInstructions">Toss everything together.</div>
      </div>`;
    const result = extractRecipeFromHtml(microdata, "https://x.test/salad");
    expect(result).not.toBeNull();
    expect(result!.recipe.ingredients).toHaveLength(2);
    expect(result!.recipe.instructions).toBe("Toss everything together.");
  });

  it("strips HTML embedded in JSON-LD ingredient strings", () => {
    const withMarkup = `
      <script type="application/ld+json">
      {
        "@type": "Recipe",
        "name": "Test",
        "recipeIngredient": [
          "200g <a href=\\"/flour\\">plain flour</a>",
          "1 tbsp&nbsp;caster sugar"
        ],
        "recipeInstructions": "Mix."
      }
      </script>`;
    const result = extractRecipeFromHtml(withMarkup, "https://x.test/t");
    expect(result!.recipe.ingredients).toEqual([
      { quantity: "200 g", name: "Plain flour" },
      { quantity: "1 tbsp", name: "Caster sugar" },
    ]);
  });

  it("picks the JSON-LD Recipe node that has the ingredient list", () => {
    const twoNodes = `
      <script type="application/ld+json">
      [
        { "@type": "Recipe", "name": "Stub" },
        {
          "@type": "Recipe",
          "name": "Real",
          "recipeIngredient": ["2 eggs", "100g sugar"],
          "recipeInstructions": "Beat."
        }
      ]
      </script>`;
    const result = extractRecipeFromHtml(twoNodes, "https://x.test/t");
    expect(result!.recipe.ingredients).toHaveLength(2);
  });

  it("drops section-heading lines from the ingredient list", () => {
    const withHeading = `
      <script type="application/ld+json">
      {
        "@type": "Recipe",
        "name": "Stir fry",
        "recipeIngredient": ["For the sauce", "2 tbsp soy sauce", "1 tbsp honey"],
        "recipeInstructions": "Cook."
      }
      </script>`;
    const result = extractRecipeFromHtml(withHeading, "https://x.test/t");
    const names = result!.recipe.ingredients.map((i) => i.name);
    expect(names).toEqual(["Soy sauce", "Honey"]);
  });

  it("scrapes a plain <ul> after an Ingredients heading when there is no structured data", () => {
    const plain = `
      <html><body>
        <h2>Ingredients</h2>
        <ul>
          <li>200g plain flour</li>
          <li>2 large eggs</li>
          <li>A pinch of salt</li>
        </ul>
        <h2>Method</h2>
        <ol><li>Mix it all.</li></ol>
      </body></html>`;
    const result = extractRecipeFromHtml(plain, "https://x.test/pancakes");
    expect(result).not.toBeNull();
    expect(result!.recipe.ingredients.map((i) => i.name)).toEqual([
      "Plain flour",
      "Eggs",
      "Salt",
    ]);
  });

  it("scrapes a run of plain <div> lines after an 'Ingredients' label (old blog posts)", () => {
    const oldBlog = `
      <html><body><div class="post-body">
        <div><span>Some chatty intro paragraph about the dish and its history.</span></div>
        <div><span>Ingredients:</span></div>
        <div><span>1 pound dry spaghetti</span></div>
        <div><span>salt and pepper to taste</span></div>
        <div><span>6 cloves garlic, sliced thin</span></div>
        <div><span>1/2 cup olive oil</span></div>
        <div><span><br /></span></div>
        <div><span>*Not traditional, but you can add a knob of butter at the end for extra richness if you like a slightly silkier sauce.</span></div>
        <div><span><a href="/full">View the complete recipe</a></span></div>
      </div></body></html>`;
    const result = extractRecipeFromHtml(oldBlog, "https://x.test/aglio");
    expect(result).not.toBeNull();
    expect(result!.recipe.ingredients.map((i) => i.name)).toEqual([
      "Dry spaghetti",
      "Salt and pepper to taste",
      "Garlic, sliced thin",
      "Olive oil",
    ]);
  });

  it("scrapes recipe-card plugin ingredient markup", () => {
    const wprm = `
      <html><body>
        <ul class="wprm-recipe-ingredients">
          <li class="wprm-recipe-ingredient"><span>200</span> <span>g</span> <span>flour</span></li>
          <li class="wprm-recipe-ingredient">2 eggs</li>
        </ul>
      </body></html>`;
    const result = extractRecipeFromHtml(wprm, "https://x.test/cake");
    expect(result).not.toBeNull();
    expect(result!.recipe.ingredients).toHaveLength(2);
    expect(result!.recipe.ingredients[0].name).toBe("Flour");
  });
});
