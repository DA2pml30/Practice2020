#version 300 es

precision highp float;

uniform float time;
uniform float Zoom;
uniform float CX;
uniform float CY;
uniform int iterMax;

const float Size = 800.0;

uniform sampler2D uSampler;

out vec4 outColor;

float Julia( vec2 uv, vec2 T )
{
  vec2
    z = uv,
    c = sin((T + time) * vec2(.42, .76));
  float k = 0.;

  for (int i = 0; i < 2047; i++) {
    if (i == iterMax || z.x * z.x + z.y * z.y > 4.)
      break;

    z = vec2(z.x * z.x - z.y * z.y, 2. * z.x * z.y) + c;
    k += 1.;
  }

  return k / float(iterMax);
}


void main( void )
{
  vec2 Coord = (gl_FragCoord.xy / Size * 2. - vec2(1.0) + vec2(CY, CX)) * Zoom;
  vec2 C = fract(Coord / 4. + .5) * 4. - 2.;

  outColor = texture(uSampler, vec2(Julia(C, (Coord - C) / 4.), .5));
}