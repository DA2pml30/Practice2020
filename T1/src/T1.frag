varying float y;

float smax( float a, float b )
{
  float h = .04, k = clamp((b - a) / h / 2. + .5, 0., 1.);
  return -mix(-a, -b, k) + k * (1. - k) * h;
}

vec3 Light( void )
{
  // Mountain: 0 - 0.58
  // Green: 0.26 - 0.7
  // Sand: 0.58 - 0.86
  // Sea: 0.7 - 1

  float
    M = pow(max(0., 1. - 1.7 * y) * 1.1, 2.),
    Gr = min(clamp(4.3 - 5.0 * y, .0, .3), pow(clamp(y * .6 - .14, .0, .3) / .3, 2.) * .3), 
    Sand = clamp(min(pow(max(0., 5. * y - 3.5), 1.5), 4.3 - 5. * y), .0, .3), 
    Sea = pow(max(0., .7 - abs(2.8 - 3. * y)), 1.3);

  vec3 Color = vec3(Sand, smax(M, Gr), Sea) + vec3(M, 0., M);

  return Color;
}

void main( void )
{
  gl_FragColor = vec4(Light(), 1.);
}