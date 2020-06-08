uniform sampler2D uSampler;
uniform float Scale;

varying float y;

void main(void)
{
  y = position.y * 1.2 - .2;
  float Y = (max(y, 0.) - .5) * Scale * .3;

  y = 1. - y; 

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, Y, position.z, 1.0);
}