export const UNIFORM_NAMES = [
  'tDiffuse', 'uTime', 'uRes', 'uAmt', 'uGrain', 'uRing', 'uRingSpeed',
  'uInk', 'uGround', 'uAccent',
] as const;

export const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * 管線順序固定：glitch → 降取樣 → 抖色量化。
 * 故障必須發生在量化之前，否則會出現「乾淨的故障疊在粗糙畫面上」的破綻。
 * 強調色透過紅色通道遮罩傳遞：場景中以紅色繪製的物件會被上強調色，其餘維持 ink。
 */
export const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uAmt;
  uniform float uGrain;
  uniform float uRing;
  uniform float uRingSpeed;
  uniform vec3 uInk;
  uniform vec3 uGround;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) {
    return bayer2(0.5 * a) * 0.25 + bayer2(a);
  }

  void main() {
    // pixel size = 2
    vec2 res  = max(uRes / 2.0, vec2(2.0));
    vec2 cell = floor(vUv * res);
    vec2 uvC  = (cell + 0.5) / res;

    // ---- datamosh：橫向區塊位移 ----
    float band  = floor(uvC.y * 16.0);
    float seed  = hash(vec2(band, floor(uTime * 13.0)));
    float shift = (seed - 0.5) * 0.32 * uAmt * step(0.56, seed);
    vec2  uvG   = vec2(fract(uvC.x + shift), uvC.y);

    // ---- 降取樣：每格 5 tap 盒狀平均，讓細線框不消失 ----
    // 注意：不可命名為 half，GLSL ES 保留字，編譯器會直接拒絕。
    vec2 halfTexel = 0.5 / res;
    vec3 c  = texture2D(tDiffuse, uvG).rgb;
    c += texture2D(tDiffuse, uvG + vec2( halfTexel.x,  halfTexel.y)).rgb;
    c += texture2D(tDiffuse, uvG + vec2(-halfTexel.x,  halfTexel.y)).rgb;
    c += texture2D(tDiffuse, uvG + vec2( halfTexel.x, -halfTexel.y)).rgb;
    c += texture2D(tDiffuse, uvG + vec2(-halfTexel.x, -halfTexel.y)).rgb;
    c /= 5.0;

    float accentMask = smoothstep(0.06, 0.30, c.r - max(c.g, c.b));
    float lum = max(max(c.r, c.g), c.b);

    // ---- 脈衝環：只作用於暗部 ----
    vec2 p = (uvC - vec2(0.5)) * vec2(uRes.x / uRes.y, 1.0);
    float d = length(p);
    float rings = 0.5 + 0.5 * sin(d * 26.0 - uTime * uRingSpeed);
    rings = pow(rings, 3.0) * uRing
          * smoothstep(0.05, 0.42, d) * smoothstep(1.15, 0.45, d);
    lum = lum + rings * (1.0 - lum);

    // ---- 顆粒 ----
    lum += (hash(cell + floor(uTime * 30.0)) - 0.5) * uGrain;

    // ---- 1-bit 量化 ----
    float bit = step(bayer4(cell), lum);

    // 故障期間偶爾整條反轉
    float invert = step(0.94, hash(vec2(floor(uTime * 9.0), band))) * step(0.5, uAmt);
    bit = mix(bit, 1.0 - bit, invert);

    gl_FragColor = vec4(mix(uGround, mix(uInk, uAccent, accentMask), bit), 1.0);
  }
`;
