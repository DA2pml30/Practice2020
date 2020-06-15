import { mat4 } from 'gl-matrix';

import vShaderStr from './T0.vert';
import fShaderStr from './T0.frag';

import * as dat from 'dat.gui';

import GradP from '../bin/Grad.png';
import hash from '../../hash.txt'

class webGL {
  initGL = (canvas, VSText, FSText) => {
    try {
      this.gl = canvas.getContext('webgl2');
      this.gl.viewportWidth = canvas.width;
      this.gl.viewportHeight = canvas.height;
    } catch (e) {
    }

    if (!this.gl) {
      alert('Could not initialize WebGL');
    } else {
      this.FSText = FSText;
      this.VSText = VSText;
    }
  }

  getShader = (type, str) => {
    const shader = this.gl.createShader(type);

    this.gl.shaderSource(shader, str);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert(this.gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  loadTexture = (url) => {
    const texture = this.gl.createTexture();

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    const data = new Uint8Array(
      [0, 0, 127, 255,
       191, 191, 255, 255,
       255, 255, 255, 255,
       255, 251, 204, 255,
       255, 243, 153, 255,
       255, 235, 102, 255,
       255, 227, 51, 255,
       255, 211, 0, 255]);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, data.length / 4, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

    const image = new Image();
    const T = this;
    image.onload = function () {
      T.gl.bindTexture(T.gl.TEXTURE_2D, texture);
      T.gl.texImage2D(T.gl.TEXTURE_2D, 0, T.gl.RGBA, T.gl.RGBA, T.gl.UNSIGNED_BYTE, image);
      T.gl.texParameteri(T.gl.TEXTURE_2D, T.gl.TEXTURE_WRAP_S, T.gl.CLAMP_TO_EDGE);
      T.gl.texParameteri(T.gl.TEXTURE_2D, T.gl.TEXTURE_WRAP_T, T.gl.CLAMP_TO_EDGE);
      T.gl.texParameteri(T.gl.TEXTURE_2D, T.gl.TEXTURE_MIN_FILTER, T.gl.LINEAR);

      function IsPow2 (i) {
        return i & (i - 1) == 0;
      }

      if (IsPow2(image.width) && IsPow2(image.height)) {
        T.gl.generateMipmap(T.gl.TEXTURE_2D);
      } else {
        T.gl.texParameteri(T.gl.TEXTURE_2D, T.gl.TEXTURE_WRAP_S, T.gl.CLAMP_TO_EDGE);
        T.gl.texParameteri(T.gl.TEXTURE_2D, T.gl.TEXTURE_WRAP_T, T.gl.CLAMP_TO_EDGE);
      }

      document.getElementById('h1').innerHTML = 'DA2';
    };
    image.src = url;

    return texture;
  }

  initShaders = () => {
    const fragmentShader = this.getShader(this.gl.FRAGMENT_SHADER, this.FSText);
    const vertexShader = this.getShader(this.gl.VERTEX_SHADER, this.VSText);

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      alert('Could not initialise shaders');
    }

    this.gl.useProgram(this.shaderProgram);

    this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

    this.shaderProgram.time_uniform = this.gl.getUniformLocation(this.shaderProgram, 'time');
    this.shaderProgram.Zoom_uniform = this.gl.getUniformLocation(this.shaderProgram, 'Zoom');
    this.shaderProgram.CX_uniform = this.gl.getUniformLocation(this.shaderProgram, 'CY');
    this.shaderProgram.CY_uniform = this.gl.getUniformLocation(this.shaderProgram, 'CX');
    this.shaderProgram.uSampler = this.gl.getUniformLocation(this.shaderProgram, 'uSampler');
    this.shaderProgram.iterMax = this.gl.getUniformLocation(this.shaderProgram, 'iterMax');
    this.shaderProgram.Zoom = 3;
    this.shaderProgram.CX = 0;
    this.shaderProgram.CY = 0;
  }

  setUniforms = () => {
    this.gl.uniform1f(this.shaderProgram.time_uniform, this.timeMs);
    this.gl.uniform1f(this.shaderProgram.Zoom_uniform, this.shaderProgram.Zoom);
    this.gl.uniform1f(this.shaderProgram.CX_uniform, this.shaderProgram.CX);
    this.gl.uniform1f(this.shaderProgram.CY_uniform, this.shaderProgram.CY);
    this.gl.uniform1i(this.shaderProgram.iterMax, this.iterationsMax);
    this.gl.uniform1i(this.shaderProgram.uSampler, 0);
  }

  initTextures = (GradP) => {
    const Tex = this.loadTexture(GradP);
    if (this.TextureGrad != undefined)
      delete this.TextureGrad;
    this.TextureGrad = Tex;
  }

  initBuffers = () => {
    this.squareVertexPositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    const vertices = [
      -1.0, 1.0,
      -1.0, -1.0,
      1.0, 1.0,
      1.0, -1.0
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    this.squareVertexPositionBuffer.itemSize = 2;
    this.squareVertexPositionBuffer.numItems = 4;
  }

  drawScene = () => {
    this.timeMs += this.IsNPause * this.Params.timeMult * (Date.now() / 1000 - this.globalMs);
    this.globalMs = Date.now() / 1000;

    this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.TextureGrad);

    this.setUniforms();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.squareVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
  }

  tick = () => {
    window.requestAnimationFrame(this.tick);
    this.updateParams();
    this.drawScene();
  }

  constructor (VSText, FSText, GradP) {
    const canvas = document.getElementById('wegl-canvas');

    function getMousePos (canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      };
    }

    let IsMDown = 0;
    let LastPos = { x: 0, y: 0 };
    const T = this;

    this.Params = {
      timeMult: 1
    };
    this.gui = new dat.GUI();
    this.IsNPause = true;
    this.timeMs = 0;
    this.globalMs = Date.now() / 1000;
    this.iterationsMax = 255;

    canvas.addEventListener('mousedown', function (evt) {
      if (IsMDown == 0) {
        IsMDown = 1;
        const mousePos = getMousePos(canvas, evt);
        LastPos = {
          x: mousePos.x / 400.0,
          y: mousePos.y / 400.0
        };
      }
    }, false);

    canvas.addEventListener('mouseup', function (evt) {
      IsMDown = 0;
    }, false);

    canvas.addEventListener('mousemove', function (evt) {
      const mousePos = getMousePos(canvas, evt);

      T.shaderProgram.CX += IsMDown * (LastPos.x - (mousePos.x / 400.0));
      T.shaderProgram.CY += -IsMDown * (LastPos.y - (mousePos.y / 400.0));
      LastPos.x = mousePos.x / 400.0;
      LastPos.y = mousePos.y / 400.0;
    }, false);

    canvas.addEventListener('wheel', function (evt) {
      const Z0 = T.shaderProgram.Zoom;
      let dY = evt.deltaY;

      if (Math.abs(dY) > 50) {
        dY /= 100;
      }

      const dZ = dY > 0 ? Z0 * (dY / 10.0) : Z0 * (dY / 10) / (1 - dY / 10);

      if (T.shaderProgram.Zoom + dZ > 0) {
        const mousePos = getMousePos(canvas, evt);
        const dPosX = (mousePos.x / 400.0 - 1);
        const dPosY = -(mousePos.y / 400.0 - 1);
        T.shaderProgram.Zoom += dZ;
        T.shaderProgram.CX = Z0 / (Z0 + dZ) * (T.shaderProgram.CX - dPosX * dZ / Z0);
        T.shaderProgram.CY = Z0 / (Z0 + dZ) * (T.shaderProgram.CY - dPosY * dZ / Z0);
      }
    }, false);

    document.addEventListener('keydown', function (evt) {
      if (evt.repeat)
        return;

      if (evt.keyCode == 80) {
        T.IsNPause = !T.IsNPause;
      }
      else if (evt.keyCode == 48) {
        T.shaderProgram.CX = T.shaderProgram.CY = 0;
        T.shaderProgram.Zoom = 3;
      }

    }, false);

    document.getElementById('files').onchange = function (evt) {
      const file = evt.target.files[0];
      const reader = new FileReader();

      reader.onloadend = function () {
        T.initTextures(reader.result);
      };
      reader.readAsDataURL(file);
    };

    this.initGL(canvas, VSText, FSText);
    this.TextureGrad = undefined;
    this.initTextures(GradP);
    this.initShaders();
    this.initBuffers();

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    document.getElementById('IterN').innerHTML = '' + this.iterationsMax;

    this.gui.remember(this.Params);
    this.gui.add(this.Params, 'timeMult').min(0).max(10).step(0.1);

    this.tick();
  }

  IsInt (n) {
    const k = parseInt(n);
    return (parseFloat(n) == k) && !isNaN(k);
  }

  updateParams() {
    const Iter = document.getElementById('Iter').value;

    if (this.IsInt(Iter) && parseInt(Iter) <= 2047 && parseInt(Iter) >= 4) {
      this.iterationsMax = parseInt(Iter);
    }

    document.getElementById('IterN').innerHTML = '' + this.iterationsMax;
  }
}

const Julia = new webGL(vShaderStr, fShaderStr, GradP);

const p = document.createElement('p');
p.innerHTML = '<a href="https://github.com/DA2pml30/Practice2020">Github</a>, git hash:<span id="Hash"></span>';
document.body.appendChild(p);
document.getElementById("Hash").innerHTML = hash;