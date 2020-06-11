uniform float Scale;

varying float y;

void main( void )
{
  y = 1. - position.y / .3;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * Scale, 1.0);
}