import * as THREE from 'three';
import { TreePreset } from '@dgreenheck/ez-tree';

// Bark keys map 1:1 to ambientcg directories under /textures/bark/.
// Add or remove entries to expose more variants in the UI dropdown.
export const BarkType = {
  Bark001: 'Bark001',
  Bark002: 'Bark002',
  Bark003: 'Bark003',
  Bark004: 'Bark004',
  Bark006: 'Bark006',
  Bark007: 'Bark007',
  Bark008: 'Bark008',
  Bark012: 'Bark012',
  Bark013: 'Bark013',
  Bark014: 'Bark014',
  Bark015: 'Bark015',
};

export const LeafType = {
  Ash: 'ash',
  Aspen: 'aspen',
  Oak: 'oak',
  Pine: 'pine',
};

export const FruitType = {
  Apple: 'apple',
  GlassBall: 'glassBall',
};

// Fruit texture sets under /textures/guoshi/{type}/
const FruitTexturePaths = {
  apple: {
    color: '/textures/guoshi/apple/FruitAppleRedWhole001_COL_VAR1_HIRES.jpg',
    normal: '/textures/guoshi/apple/FruitAppleRedWhole001_NRM_HIRES.jpg',
    gloss: '/textures/guoshi/apple/FruitAppleRedWhole001_GLOSS_HIRES.jpg',
  },
};

const textureLoader = new THREE.TextureLoader();
const barkCache = new Map();
const leafCache = new Map();
const fruitCache = new Map();
const barkLoaders = new Map();
const leafLoaders = new Map();
const fruitLoaders = new Map();

function isTextureReady(texture) {
  return texture?.image?.width > 8;
}

async function loadColorAsync(url) {
  const texture = await textureLoader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function loadLinearAsync(url) {
  try {
    return await textureLoader.loadAsync(url);
  } catch {
    return null;
  }
}

/**
 * Returns a cached set of THREE.Texture maps for the given bark type.
 * @param {string} type - one of BarkType values
 * @returns {{ color: THREE.Texture, ao: THREE.Texture, normal: THREE.Texture, roughness: THREE.Texture } | null}
 */
export function getBarkMaps(type) {
  if (!BarkType[type]) return null;
  return barkCache.get(type) ?? null;
}

async function ensureBarkMaps(type) {
  if (!BarkType[type]) return null;

  const cached = barkCache.get(type);
  if (cached?.color && isTextureReady(cached.color)) {
    return cached;
  }

  if (!barkLoaders.has(type)) {
    barkLoaders.set(type, (async () => {
      const dir = `${type}_1K-JPG`;
      const base = `/textures/bark/${dir}/${dir}`;
      const [color, ao, normal, roughness] = await Promise.all([
        loadColorAsync(`${base}_Color.jpg`),
        loadLinearAsync(`${base}_AmbientOcclusion.jpg`),
        loadLinearAsync(`${base}_NormalGL.jpg`),
        loadLinearAsync(`${base}_Roughness.jpg`),
      ]);
      const maps = { color, ao, normal, roughness };
      barkCache.set(type, maps);
      return maps;
    })());
  }

  return barkLoaders.get(type);
}

/**
 * Returns a cached leaf color texture for the given leaf type.
 * @param {string} type - one of LeafType values
 * @returns {THREE.Texture | null}
 */
export function getLeafMap(type) {
  return leafCache.get(type) ?? null;
}

async function ensureLeafMap(type) {
  const cached = leafCache.get(type);
  if (cached && isTextureReady(cached)) {
    return cached;
  }

  if (!leafLoaders.has(type)) {
    leafLoaders.set(type, (async () => {
      try {
        const texture = await loadColorAsync(`/textures/leaves/${type}.png`);
        texture.premultiplyAlpha = true;
        leafCache.set(type, texture);
        return texture;
      } catch (err) {
        console.warn(`Failed to load leaf texture "${type}"`, err);
        return null;
      }
    })());
  }

  return leafLoaders.get(type);
}

/**
 * Returns a cached fruit texture set for the given fruit type.
 * @param {string} type - one of FruitType values
 * @returns {{ color: THREE.Texture, normal: THREE.Texture, gloss: THREE.Texture } | null}
 */
export function getFruitMaps(type) {
  if (!FruitTexturePaths[type]) return null;
  return fruitCache.get(type) ?? null;
}

/** @deprecated Use getFruitMaps(type)?.color */
export function getFruitMap(type) {
  return getFruitMaps(type)?.color ?? null;
}

async function ensureFruitMaps(type) {
  if (!FruitTexturePaths[type]) return null;

  const cached = fruitCache.get(type);
  if (cached?.color && isTextureReady(cached.color)) {
    return cached;
  }

  if (fruitLoaders.has(type)) {
    return fruitLoaders.get(type);
  }

  const loader = (async () => {
    try {
      const color = await loadColorAsync(FruitTexturePaths[type].color);
      const maps = { color, normal: null, gloss: null };
      fruitCache.set(type, maps);
      return maps;
    } catch (err) {
      console.warn(`Failed to load fruit textures "${type}"`, err);
      fruitLoaders.delete(type);
      return null;
    }
  })();

  fruitLoaders.set(type, loader);
  return loader;
}

/**
 * Preloads the textures referenced by a tree's current options.
 * @param {import('@dgreenheck/ez-tree').Tree} tree
 */
export async function preloadTreeTextures(tree) {
  const tasks = [
    ensureLeafMap(tree.options.leaves.type),
    ensureBarkMaps(tree.options.bark.type),
  ];

  if (tree.options.fruits?.type === 'apple') {
    tasks.push(ensureFruitMaps(tree.options.fruits.type));
  }

  const results = await Promise.all(tasks);
  const leafMap = results[0];
  const barkMaps = results[1];
  const fruitMaps = tree.options.fruits?.type === 'apple' ? results[2] : null;

  if (barkMaps) {
    tree.options.bark.maps.color = barkMaps.color;
    tree.options.bark.maps.ao = barkMaps.ao;
    tree.options.bark.maps.normal = barkMaps.normal;
    tree.options.bark.maps.roughness = barkMaps.roughness;
  }

  tree.options.leaves.map = leafMap;
  if (tree.options.fruits) {
    assignFruitMaps(tree.options.fruits, fruitMaps);
  }
}

function assignFruitMaps(fruitOptions, maps) {
  if (!fruitOptions.maps) {
    fruitOptions.maps = { color: null, normal: null, gloss: null };
  }
  fruitOptions.maps.color = maps?.color ?? null;
  fruitOptions.maps.normal = maps?.normal ?? null;
  fruitOptions.maps.gloss = maps?.gloss ?? null;
  fruitOptions.map = fruitOptions.maps.color;
}

/**
 * Preloads all leaf variants used by presets so forest generation is ready.
 */
export async function preloadLeafTextures() {
  await Promise.all(Object.values(LeafType).map((type) => ensureLeafMap(type)));
}

export async function preloadFruitTextures() {
  await Promise.all(Object.keys(FruitTexturePaths).map((type) => ensureFruitMaps(type)));
}

/**
 * Assigns bark + leaf textures onto the tree's options based on its current
 * `bark.type` and `leaves.type` identifiers. Uses cached textures when ready.
 * @param {import('@dgreenheck/ez-tree').Tree} tree
 */
export function applyTreeTextures(tree) {
  const barkMaps = getBarkMaps(tree.options.bark.type);
  if (barkMaps) {
    tree.options.bark.maps.color = barkMaps.color;
    tree.options.bark.maps.ao = barkMaps.ao;
    tree.options.bark.maps.normal = barkMaps.normal;
    tree.options.bark.maps.roughness = barkMaps.roughness;
  }
  tree.options.leaves.map = getLeafMap(tree.options.leaves.type);
  if (tree.options.fruits) {
    assignFruitMaps(tree.options.fruits, getFruitMaps(tree.options.fruits.type));
  }
}

/**
 * Loads a named preset onto the tree, applying the matching texture set in
 * the same step so the first generate sees the textures.
 * @param {import('@dgreenheck/ez-tree').Tree} tree
 * @param {string} name - key into TreePreset registry
 */
export async function loadPresetWithTextures(tree, name) {
  const json = structuredClone(TreePreset[name]);
  if (!json) return;
  tree.options.copy(json);
  if (tree.options.fruits) {
    tree.options.fruits.branchLevel = tree.options.branch.levels;
  }
  await preloadTreeTextures(tree);
  tree.generate();
}
