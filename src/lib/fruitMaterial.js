import * as THREE from 'three';

/**
 * UV atlas layout for FruitAppleRedWhole001_COL_VAR1_HIRES.jpg
 * - topCap: stem end (top-left in image)
 * - bottomCap: blossom end (bottom-right in image)
 * - stem: pedicel strip (center-left in image)
 */
export const AppleAtlas = {
  topCap: { center: new THREE.Vector2(0.282, 0.720), radius: 0.178 },
  bottomCap: { center: new THREE.Vector2(0.719, 0.277), radius: 0.178 },
  stem: { center: new THREE.Vector2(0.335, 0.455), size: new THREE.Vector2(0.10, 0.065) },
};

function clampToUnitDisk(sx, sz, maxRadius = 0.95) {
  const len2 = sx * sx + sz * sz;
  const maxR2 = maxRadius * maxRadius;
  if (len2 <= maxR2 || len2 === 0) {
    return { sx, sz };
  }

  const scale = maxRadius / Math.sqrt(len2);
  return { sx: sx * scale, sz: sz * scale };
}

function mapCapUV(sx, sz, cap, scale) {
  const clamped = clampToUnitDisk(sx, sz);
  const radius = cap.radius * scale;
  return {
    u: clamped.sx * radius + cap.center.x,
    v: clamped.sz * radius + cap.center.y,
  };
}

/**
 * Writes scan-atlas UVs onto a unit sphere for the apple color map.
 */
export function applyAppleSphereUVs(geometry, capScale = 1) {
  const atlas = AppleAtlas;
  const scale = Number(capScale) || 1;
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    x /= len;
    y /= len;
    z /= len;

    let mapped;

    if (y >= 0) {
      const sx = x / (1 + y);
      const sz = -z / (1 + y);
      mapped = mapCapUV(sx, sz, atlas.topCap, scale);
    } else {
      const sx = -x / (1 - y);
      const sz = z / (1 - y);
      mapped = mapCapUV(sx, sz, atlas.bottomCap, scale);
    }

    uv.setXY(i, mapped.u, mapped.v);
  }

  uv.needsUpdate = true;
}

/**
 * Maps cylinder UVs onto the stem island in the atlas.
 */
export function applyStemUVs(geometry) {
  const stem = AppleAtlas.stem;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i) * stem.size.x + stem.center.x - stem.size.x * 0.5;
    const v = uv.getY(i) * stem.size.y + stem.center.y - stem.size.y * 0.5;
    uv.setXY(i, u, v);
  }

  uv.needsUpdate = true;
}

function configureAtlasTexture(texture) {
  if (!texture) return null;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Apple body material — UVs come from applyAppleSphereUVs().
 */
export function createAppleBodyMaterial(colorMap, { tint, shininess }) {
  return new THREE.MeshPhongMaterial({
    name: 'fruits',
    map: configureAtlasTexture(colorMap),
    color: new THREE.Color(tint),
    shininess,
    specular: new THREE.Color(0x333333),
    side: THREE.FrontSide,
  });
}

/**
 * Stem material — UVs come from applyStemUVs().
 */
export function createAppleStemMaterial(colorMap, { tint, shininess }) {
  return new THREE.MeshPhongMaterial({
    name: 'fruit-stems',
    map: configureAtlasTexture(colorMap),
    color: new THREE.Color(tint),
    shininess: shininess * 0.5,
    specular: new THREE.Color(0x222222),
  });
}

/**
 * Procedural glass sphere — no texture atlas; uses MeshPhysicalMaterial.
 */
export function createGlassBallMaterial({
  tint,
  transmission,
  roughness,
  ior,
  thickness,
  clearcoat,
  clearcoatRoughness,
}) {
  const color = new THREE.Color(tint);

  return new THREE.MeshPhysicalMaterial({
    name: 'fruits',
    color,
    metalness: 0,
    roughness,
    transmission,
    thickness,
    ior,
    transparent: true,
    opacity: 1,
    clearcoat,
    clearcoatRoughness,
    attenuationColor: color,
    attenuationDistance: 0.6,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xffffff),
    side: THREE.FrontSide,
    depthWrite: false,
  });
}
