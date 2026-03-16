import type { DailyRecipesInput, IngredientCategory, Locale, RecipeDTO } from '../types/api';

interface LocalizedText {
  en: string;
  fi: string;
}

interface CatalogIngredient {
  category: IngredientCategory;
  name: LocalizedText;
  quantity?: LocalizedText;
}

interface CatalogStep {
  durationSeconds?: number;
  instruction: LocalizedText;
  tip?: LocalizedText;
}

interface CatalogRecipeSeed {
  cuisine: LocalizedText;
  difficulty: RecipeDTO['difficulty'];
  id: string;
  ingredients: CatalogIngredient[];
  nutritionEstimate: NonNullable<RecipeDTO['nutritionEstimate']>;
  servings: number;
  steps: CatalogStep[];
  title: LocalizedText;
  totalTimeMinutes: number;
}

const DAILY_FEED_SIZE = 12;

function text(en: string, fi: string): LocalizedText {
  return { en, fi };
}

const recipeCatalog: CatalogRecipeSeed[] = [
  {
    cuisine: text('Italian', 'Italialainen'),
    difficulty: 'easy',
    id: 'lemon-spinach-pasta',
    ingredients: [
      { category: 'grain', name: text('Pasta', 'Pasta'), quantity: text('180 g', '180 g') },
      { category: 'vegetable', name: text('Spinach', 'Pinaatti'), quantity: text('2 handfuls', '2 kourallista') },
      { category: 'dairy', name: text('Parmesan', 'Parmesaani'), quantity: text('3 tbsp', '3 rkl') },
    ],
    nutritionEstimate: { calories: 480, carbsG: 60, fatG: 16, proteinG: 18 },
    servings: 2,
    steps: [
      {
        durationSeconds: 480,
        instruction: text('Boil the pasta until tender.', 'Keita pasta kypsaksi.'),
      },
      {
        durationSeconds: 180,
        instruction: text('Toss the hot pasta with spinach and parmesan.', 'Pyorittele kuuma pasta pinaatin ja parmesaanin kanssa.'),
        tip: text('Add a squeeze of lemon if you have one.', 'Lisaa sitruunaa jos sita loytyy.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Serve immediately while glossy and warm.', 'Tarjoile heti kiiltavana ja lampimana.'),
      },
    ],
    title: text('Lemon Spinach Pasta', 'Sitruuna-pinaattipasta'),
    totalTimeMinutes: 16,
  },
  {
    cuisine: text('Asian', 'Aasialainen'),
    difficulty: 'easy',
    id: 'veggie-fried-rice',
    ingredients: [
      { category: 'grain', name: text('Cooked rice', 'Keitetty riisi'), quantity: text('2 cups', '2 kuppia') },
      { category: 'vegetable', name: text('Carrot', 'Porkkana'), quantity: text('1 small', '1 pieni') },
      { category: 'protein', name: text('Egg', 'Kananmuna'), quantity: text('2', '2') },
    ],
    nutritionEstimate: { calories: 430, carbsG: 54, fatG: 14, proteinG: 17 },
    servings: 2,
    steps: [
      {
        durationSeconds: 180,
        instruction: text('Saute the carrot in a hot pan.', 'Kuullota porkkana kuumalla pannulla.'),
      },
      {
        durationSeconds: 180,
        instruction: text('Scramble the eggs and fold in the rice.', 'Riko munat sekaan ja kaanna riisi joukkoon.'),
      },
      {
        durationSeconds: 120,
        instruction: text('Cook until everything is hot and lightly crisp.', 'Kypsenna kunnes kaikki on kuumaa ja kevyesti rapeaa.'),
        tip: text('Cold rice gives the best texture.', 'Kylma riisi antaa parhaan rakenteen.'),
      },
    ],
    title: text('Veggie Fried Rice', 'Kasvispaistettu riisi'),
    totalTimeMinutes: 12,
  },
  {
    cuisine: text('Nordic', 'Pohjoismainen'),
    difficulty: 'easy',
    id: 'mushroom-toast',
    ingredients: [
      { category: 'other', name: text('Bread', 'Leipa'), quantity: text('2 slices', '2 viipaletta') },
      { category: 'vegetable', name: text('Mushroom', 'Sieni'), quantity: text('150 g', '150 g') },
      { category: 'dairy', name: text('Cream cheese', 'Tuorejuusto'), quantity: text('2 tbsp', '2 rkl') },
    ],
    nutritionEstimate: { calories: 350, carbsG: 28, fatG: 19, proteinG: 11 },
    servings: 2,
    steps: [
      {
        durationSeconds: 240,
        instruction: text('Toast the bread until crisp.', 'Paahda leipa rapeaksi.'),
      },
      {
        durationSeconds: 300,
        instruction: text('Cook the mushrooms until deeply golden.', 'Kypsenna sienet kunnolla kullanruskeiksi.'),
        tip: text('Do not crowd the pan.', 'Ala tayta pannua liikaa.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Spread cream cheese on the toast and pile on the mushrooms.', 'Levita tuorejuusto leivalle ja nosta sienet paalle.'),
      },
    ],
    title: text('Golden Mushroom Toast', 'Kultainen sienileipa'),
    totalTimeMinutes: 11,
  },
  {
    cuisine: text('Middle Eastern', 'Lahi-itan'),
    difficulty: 'medium',
    id: 'chickpea-skillet',
    ingredients: [
      { category: 'protein', name: text('Chickpeas', 'Kikherneet'), quantity: text('1 can', '1 purkki') },
      { category: 'vegetable', name: text('Tomato', 'Tomaatti'), quantity: text('2', '2') },
      { category: 'spice', name: text('Cumin', 'Juustokumina'), quantity: text('1 tsp', '1 tl') },
    ],
    nutritionEstimate: { calories: 390, carbsG: 46, fatG: 11, proteinG: 17 },
    servings: 2,
    steps: [
      {
        durationSeconds: 240,
        instruction: text('Cook the tomatoes with cumin until saucy.', 'Kypsenna tomaatit juustokuminan kanssa kastikkeeksi.'),
      },
      {
        durationSeconds: 300,
        instruction: text('Add the chickpeas and simmer until glossy.', 'Lisaa kikherneet ja hauduta kiiltavaksi.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Spoon into bowls and finish with herbs if you have them.', 'Annostele kulhoihin ja viimeistele yrteilla jos niita on.'),
      },
    ],
    title: text('Spiced Chickpea Skillet', 'Mausteinen kikhernepannu'),
    totalTimeMinutes: 14,
  },
  {
    cuisine: text('Turkish', 'Turkkilainen'),
    difficulty: 'easy',
    id: 'tomato-shakshuka',
    ingredients: [
      { category: 'protein', name: text('Egg', 'Kananmuna'), quantity: text('3', '3') },
      { category: 'vegetable', name: text('Tomato sauce', 'Tomaattikastike'), quantity: text('1 cup', '1 kuppi') },
      { category: 'spice', name: text('Paprika', 'Paprika'), quantity: text('1 tsp', '1 tl') },
    ],
    nutritionEstimate: { calories: 320, carbsG: 15, fatG: 19, proteinG: 20 },
    servings: 2,
    steps: [
      {
        durationSeconds: 180,
        instruction: text('Warm the tomato sauce with paprika.', 'Lammita tomaattikastike paprikan kanssa.'),
      },
      {
        durationSeconds: 240,
        instruction: text('Crack in the eggs and cover until just set.', 'Riko munat kastikkeeseen ja peita kunnes ne juuri hyytyvat.'),
        tip: text('Keep the yolks soft for the best finish.', 'Jata keltuaiset hieman pehmeiksi.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Serve with bread or roasted potatoes.', 'Tarjoile leivan tai paahdettujen perunoiden kanssa.'),
      },
    ],
    title: text('Pantry Shakshuka', 'Kilershakshuka'),
    totalTimeMinutes: 10,
  },
  {
    cuisine: text('Mediterranean', 'Valimerellinen'),
    difficulty: 'easy',
    id: 'yogurt-parfait',
    ingredients: [
      { category: 'dairy', name: text('Greek yogurt', 'Kreikkalainen jogurtti'), quantity: text('1.5 cups', '1.5 kuppia') },
      { category: 'fruit', name: text('Berries', 'Marjat'), quantity: text('1 cup', '1 kuppi') },
      { category: 'grain', name: text('Granola', 'Granola'), quantity: text('0.5 cup', '0.5 kuppia') },
    ],
    nutritionEstimate: { calories: 290, carbsG: 31, fatG: 9, proteinG: 22 },
    servings: 2,
    steps: [
      {
        durationSeconds: 60,
        instruction: text('Spoon yogurt into glasses or bowls.', 'Lusikoi jogurtti laseihin tai kulhoihin.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Add berries and granola in layers.', 'Lisaa marjat ja granola kerroksittain.'),
      },
      {
        durationSeconds: 30,
        instruction: text('Serve chilled.', 'Tarjoile kylmana.'),
      },
    ],
    title: text('Berry Yogurt Parfait', 'Marjaisa jogurttiparfait'),
    totalTimeMinutes: 5,
  },
  {
    cuisine: text('American', 'Amerikkalainen'),
    difficulty: 'easy',
    id: 'bean-avocado-wrap',
    ingredients: [
      { category: 'protein', name: text('Beans', 'Pavut'), quantity: text('1 cup', '1 kuppi') },
      { category: 'fruit', name: text('Avocado', 'Avokado'), quantity: text('1', '1') },
      { category: 'grain', name: text('Tortilla', 'Tortilla'), quantity: text('2 large', '2 suurta') },
    ],
    nutritionEstimate: { calories: 410, carbsG: 45, fatG: 16, proteinG: 15 },
    servings: 2,
    steps: [
      {
        durationSeconds: 180,
        instruction: text('Warm the beans in a small pan.', 'Lammita pavut pienessa pannussa.'),
      },
      {
        durationSeconds: 120,
        instruction: text('Mash the avocado and spread it on the tortillas.', 'Muussaa avokado ja levita se tortilloille.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Add the beans, roll tightly, and serve.', 'Lisaa pavut, kaari tiukasti ja tarjoile.'),
      },
    ],
    title: text('Bean and Avocado Wrap', 'Papujen ja avokadon wrap'),
    totalTimeMinutes: 9,
  },
  {
    cuisine: text('French', 'Ranskalainen'),
    difficulty: 'medium',
    id: 'lentil-soup',
    ingredients: [
      { category: 'protein', name: text('Lentils', 'Linssit'), quantity: text('1 cup', '1 kuppi') },
      { category: 'vegetable', name: text('Onion', 'Sipuli'), quantity: text('1', '1') },
      { category: 'vegetable', name: text('Carrot', 'Porkkana'), quantity: text('1', '1') },
    ],
    nutritionEstimate: { calories: 360, carbsG: 48, fatG: 7, proteinG: 22 },
    servings: 3,
    steps: [
      {
        durationSeconds: 240,
        instruction: text('Cook the onion and carrot until softened.', 'Kypsenna sipuli ja porkkana pehmeiksi.'),
      },
      {
        durationSeconds: 900,
        instruction: text('Add the lentils and simmer until tender.', 'Lisaa linssit ja hauduta kunnes ne pehmenevat.'),
        tip: text('Blend a small portion for extra body.', 'Soseuta pieni osa paksummaksi rakenteeksi.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Season and serve hot.', 'Mausta ja tarjoile kuumana.'),
      },
    ],
    title: text('Weeknight Lentil Soup', 'Arki-illan linssikeitto'),
    totalTimeMinutes: 24,
  },
  {
    cuisine: text('Japanese', 'Japanilainen'),
    difficulty: 'medium',
    id: 'salmon-rice-bowl',
    ingredients: [
      { category: 'protein', name: text('Salmon', 'Lohi'), quantity: text('250 g', '250 g') },
      { category: 'grain', name: text('Rice', 'Riisi'), quantity: text('2 cups cooked', '2 kuppia keitettya') },
      { category: 'vegetable', name: text('Cucumber', 'Kurkku'), quantity: text('0.5', '0.5') },
    ],
    nutritionEstimate: { calories: 520, carbsG: 49, fatG: 19, proteinG: 34 },
    servings: 2,
    steps: [
      {
        durationSeconds: 420,
        instruction: text('Cook the salmon until just flaky.', 'Kypsenna lohi juuri ja juuri hiutaleiseksi.'),
      },
      {
        durationSeconds: 120,
        instruction: text('Slice the cucumber and fluff the rice.', 'Viipaloi kurkku ja kuohkeuta riisi.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Build bowls with rice, salmon, and cucumber.', 'Rakenna kulhot riisista, lohesta ja kurkusta.'),
      },
    ],
    title: text('Salmon Rice Bowl', 'Lohi-riisikulho'),
    totalTimeMinutes: 15,
  },
  {
    cuisine: text('Spanish', 'Espanjalainen'),
    difficulty: 'easy',
    id: 'potato-tortilla',
    ingredients: [
      { category: 'protein', name: text('Egg', 'Kananmuna'), quantity: text('4', '4') },
      { category: 'vegetable', name: text('Potato', 'Peruna'), quantity: text('2 medium', '2 keskikokoista') },
      { category: 'vegetable', name: text('Onion', 'Sipuli'), quantity: text('0.5', '0.5') },
    ],
    nutritionEstimate: { calories: 370, carbsG: 24, fatG: 22, proteinG: 17 },
    servings: 2,
    steps: [
      {
        durationSeconds: 420,
        instruction: text('Cook the potato and onion gently until tender.', 'Kypsenna peruna ja sipuli miedosti pehmeiksi.'),
      },
      {
        durationSeconds: 120,
        instruction: text('Pour in the eggs and cook until mostly set.', 'Kaada munat sekaan ja kypsenna melkein hyytyneeksi.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Flip or finish under a lid, then slice.', 'Kaanna tai viimeistele kannen alla ja leikkaa paloiksi.'),
      },
    ],
    title: text('Quick Spanish Tortilla', 'Nopea espanjalainen tortilla'),
    totalTimeMinutes: 14,
  },
  {
    cuisine: text('Greek', 'Kreikkalainen'),
    difficulty: 'easy',
    id: 'cucumber-feta-salad',
    ingredients: [
      { category: 'vegetable', name: text('Cucumber', 'Kurkku'), quantity: text('1', '1') },
      { category: 'dairy', name: text('Feta', 'Feta'), quantity: text('100 g', '100 g') },
      { category: 'vegetable', name: text('Tomato', 'Tomaatti'), quantity: text('2', '2') },
    ],
    nutritionEstimate: { calories: 260, carbsG: 13, fatG: 18, proteinG: 10 },
    servings: 2,
    steps: [
      {
        durationSeconds: 120,
        instruction: text('Slice the cucumber and tomatoes.', 'Viipaloi kurkku ja tomaatit.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Scatter over the feta and season lightly.', 'Murusta feta paalle ja mausta kevyesti.'),
      },
      {
        durationSeconds: 30,
        instruction: text('Serve cold with bread or grilled protein.', 'Tarjoile kylmana leivan tai grillatun proteiinin kanssa.'),
      },
    ],
    title: text('Cucumber Feta Salad', 'Kurkku-fetasalaatti'),
    totalTimeMinutes: 6,
  },
  {
    cuisine: text('Korean', 'Korealainen'),
    difficulty: 'medium',
    id: 'gochujang-noodles',
    ingredients: [
      { category: 'grain', name: text('Noodles', 'Nuudelit'), quantity: text('180 g', '180 g') },
      { category: 'spice', name: text('Chili paste', 'Chilitahna'), quantity: text('1 tbsp', '1 rkl') },
      { category: 'vegetable', name: text('Spring onion', 'Kevatsipuli'), quantity: text('2 stalks', '2 vartta') },
    ],
    nutritionEstimate: { calories: 450, carbsG: 63, fatG: 12, proteinG: 14 },
    servings: 2,
    steps: [
      {
        durationSeconds: 300,
        instruction: text('Cook the noodles and reserve a splash of water.', 'Keita nuudelit ja ota tilkka keitinvetta talteen.'),
      },
      {
        durationSeconds: 120,
        instruction: text('Warm the chili paste with a little noodle water.', 'Lammita chilitahna tilkassa nuudelivetta.'),
      },
      {
        durationSeconds: 60,
        instruction: text('Toss the noodles through the sauce and finish with spring onion.', 'Kaanna nuudelit kastikkeeseen ja viimeistele kevatsipulilla.'),
      },
    ],
    title: text('Gochujang Pantry Noodles', 'Gochujang-kilernuudelit'),
    totalTimeMinutes: 10,
  },
];

function localize(locale: Locale, value: LocalizedText | undefined) {
  if (!value) {
    return undefined;
  }

  return value[locale];
}

function scoreSeed(seed: CatalogRecipeSeed, ingredients: string[]) {
  if (ingredients.length === 0) {
    return 0;
  }

  const preferred = ingredients.map((ingredient) => ingredient.toLowerCase());
  return seed.ingredients.reduce((score, ingredient) => {
    const candidate = ingredient.name.en.toLowerCase();
    return preferred.some((preferredIngredient) => candidate.includes(preferredIngredient))
      ? score + 1
      : score;
  }, 0);
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }

  return hash;
}

export function buildFallbackDailyRecipes(input: DailyRecipesInput): RecipeDTO[] {
  const generatedFor = input.date ?? new Date().toISOString().slice(0, 10);
  const sortedSeeds = [...recipeCatalog].sort((left, right) => {
    const scoreDelta = scoreSeed(right, input.ingredients ?? []) - scoreSeed(left, input.ingredients ?? []);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return (
      hashText(`${generatedFor}-${left.id}-${input.locale}`) -
      hashText(`${generatedFor}-${right.id}-${input.locale}`)
    );
  });

  return sortedSeeds.slice(0, DAILY_FEED_SIZE).map((seed) => ({
    cuisine: localize(input.locale, seed.cuisine) ?? seed.cuisine.en,
    difficulty: seed.difficulty,
    id: `catalog-${seed.id}`,
    ingredients: seed.ingredients.map((ingredient, index) => ({
      category: ingredient.category,
      confidence: 1,
      id: `catalog-${seed.id}-ingredient-${index + 1}`,
      name: localize(input.locale, ingredient.name) ?? ingredient.name.en,
      quantity: localize(input.locale, ingredient.quantity),
    })),
    nutritionEstimate: seed.nutritionEstimate,
    servings: seed.servings,
    steps: seed.steps.map((step, index) => ({
      durationSeconds: step.durationSeconds,
      instruction: localize(input.locale, step.instruction) ?? step.instruction.en,
      stepNumber: index + 1,
      tip: localize(input.locale, step.tip),
    })),
    title: localize(input.locale, seed.title) ?? seed.title.en,
    totalTimeMinutes: seed.totalTimeMinutes,
  }));
}
