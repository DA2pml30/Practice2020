import { mat4 } from 'gl-matrix';

import vShaderStr from './T1.vert';
import fShaderStr from './T1.frag';

import * as dat from 'dat.gui';
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

import HeightP from '../bin/Height.png';
import CarM from '../bin/Car.glb';
import Sky from '../bin/Skybox.hdr';

class Graphics {
  initThree () {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.W / this.H, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.W, this.H);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.renderer.domElement);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.directionalLight.position.x = 1.98;
    this.directionalLight.position.y = 4.59;
    this.directionalLight.position.z = 0.1;

    this.scene.add(this.directionalLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableKeys = false;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.camera.position.z = 5;
  }

  initHeightmap (HeightP, VSText, FSText) {
    const k = 512;
    const k2 = k * k * 3;
    const Q = 128;
    const S = 512;
    const Seed = Math.random() * 100;
    const Noise = new ImprovedNoise();
    const geometry = new THREE.PlaneBufferGeometry(S, S, k - 1, k - 1);

    const P = geometry.attributes.position.array;

    function TurbNoise (x, y, S, Noise, Octaves) {
      let i;
      let frac = 2;
      let val = 0;

      for (i = 0; i < Octaves; i++) {
        val += (Noise.noise(x, y, S) * 0.5 + 0.5) / frac;
        x = (x + 13.8) * 2;
        y = (y + 17.2) * 2;
        frac *= 2;
      }

      return val;
    }

    for (let i = 0; i < k2; i += 3) {
      P[i + 2] = P[i];
      P[i] = P[i + 1];
      P[i + 1] = TurbNoise(P[i] / Q, P[i + 2] / Q, Seed, Noise, 8);
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        Scale: { value: S },
        W: { value: this.W },
        H: { value: this.H }
      },

      vertexShader: VSText,
      fragmentShader: FSText
    });

    this.Heightmap = new THREE.Mesh(geometry, material);

    this.scene.add(this.Heightmap);
  }

  initCar () {
    this.Car = {
      Model: null,
      Wheels: {
        LP: null,
        RP: null,
        LZ: null,
        RZ: null
      },
      A: 0,
      V: 0,
      Angle: 0,
      X: 0,
      XKey: 0,
      Z: 0,
      ZKey: 0
    };
  }

  loadCar (CarM, envMap) {
    const loader = new GLTFLoader();
    const T = this;

    loader.load(CarM, function (gltf) {
      gltf.scene.traverse(function (node) {
        if (node.material && (node.material.isMeshStandardMaterial ||
           (node.material.isShaderMaterial && node.material.envMap !== undefined))) {
          node.material.envMap = envMap;
        }
      });

      T.Car.Model = gltf.scene;

      const Bones = gltf.scene.children[0].children;
      for (let i = 0; i < Bones.length; i++) {
        if (Bones[i].name[0] == 'K') {
          if (Bones[i].name == 'KLP') {
            T.Car.Wheels.LP = Bones[i];
          } else if (Bones[i].name == 'KPP') {
            T.Car.Wheels.RP = Bones[i];
          } else if (Bones[i].name == 'KLZ') {
            T.Car.Wheels.LZ = Bones[i];
          } else {
            T.Car.Wheels.RZ = Bones[i];
          }
        }
      }

      T.scene.add(gltf.scene);
      T.controls.target = T.Car.Model.position;
    }, undefined, function (error) {
      alert(error);
      console.error(error);
    });
  }

  initGUI () {
    const T = this;

    this.Params = {
      Visible: true,
      Color: T.directionalLight.color.getHex(),
      Intensity: 0.5,
      Exposure: 1,
      Operator: THREE.ACESFilmicToneMapping
    };

    this.gui = new dat.GUI();
    this.gui.remember(this.Params);

    const lightGui = this.gui.addFolder('Light');
    lightGui.add(this.Params, 'Visible').onChange(function (value) {
      T.directionalLight.visible = value;
    });
    lightGui.add(this.Params, 'Intensity').min(0).max(1).step(0.01).onChange(function (value) {
      T.directionalLight.intensity = value;
    });
    lightGui.addColor(this.Params, 'Color').onChange(function (value) {
      T.directionalLight.color.setHex(parseInt(value));
    });

    const rendererGui = this.gui.addFolder('HDR');
    rendererGui.add(this.Params, 'Exposure').min(0.1).max(3).step(0.005).onChange(function (value) {
      T.renderer.toneMappingExposure = value;
    });
    rendererGui.add(this.Params, 'Operator', {
      Uncharted2: THREE.Uncharted2ToneMapping,
      Filmic: THREE.ACESFilmicToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      Linear: THREE.LinearToneMapping,
      Off: THREE.NoToneMapping
    }).onFinishChange(function (value) {
      T.renderer.toneMapping = parseInt(value);
    });

    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  moveCar () {
    if (this.Car.Model == null) {
      return;
    }

    this.Car.A = this.Car.XKey * 5 - Math.max(Math.min(this.Car.V, 1.0), -1.0);
    this.Car.V = Math.max(Math.min(this.Car.A * this.DeltaT + this.Car.V, 10.0), -10.0);

    this.Car.Wheels.LP.rotateZ(this.Car.Angle);
    this.Car.Wheels.RP.rotateZ(-this.Car.Angle);
    this.Car.Wheels.LZ.rotateZ(this.Car.Angle);
    this.Car.Wheels.RZ.rotateZ(-this.Car.Angle);

    this.Car.Angle += this.Car.V * this.DeltaT;

    if (this.Car.Z != this.Car.ZKey) {
      const dZ = (this.Car.ZKey - this.Car.Z) * this.DeltaT;
      this.Car.Wheels.LP.rotateY(-dZ);
      this.Car.Wheels.RP.rotateY(-dZ);
      this.Car.Z += dZ;
    }

    this.Car.Wheels.LP.rotateZ(-this.Car.Angle);
    this.Car.Wheels.RP.rotateZ(this.Car.Angle);
    this.Car.Wheels.LZ.rotateZ(-this.Car.Angle);
    this.Car.Wheels.RZ.rotateZ(this.Car.Angle);
  }

  drawScene () {
    this.DeltaT = this.IsNPause * (Date.now() / 1000 - this.globalMs);
    this.timeMs += this.DeltaT;
    this.globalMs = Date.now() / 1000;

    this.stats.update();

    this.moveCar();

    this.renderer.render(this.scene, this.camera);
  }

  constructor (VSText, FSText, HeightP, CarM, Sky) {
    this.IsNPause = true;
    this.timeMs = 0;
    this.globalMs = Date.now() / 1000;
    this.W = window.innerWidth;
    this.H = window.innerHeight;

    this.initThree();
    this.initHeightmap(HeightP, VSText, FSText);
    this.initCar();
    this.initGUI();

    let envMap;
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const RGBEL = new RGBELoader();

    const T = this;
    RGBEL.setDataType(THREE.UnsignedByteType);
    RGBEL.load(Sky, function (texture) {
      envMap = pmremGenerator.fromEquirectangular(texture).texture;
      pmremGenerator.dispose();

      envMap.encoding = THREE.RGBEEncoding;

      T.loadCar(CarM, envMap);
      T.scene.background = envMap;
    });

    document.onkeydown = function (e) {
      if (e.repeat) {
        return;
      }

      if (e.keyCode >= 37 && e.keyCode <= 40) {
        T.Car.ZKey += (e.keyCode == 39) - (e.keyCode == 37);
        T.Car.XKey += (e.keyCode == 38) - (e.keyCode == 40);
      } else if (e.keyCode == 80) {
        T.IsNPause = !T.IsNPause;
      }
    };

    document.onkeyup = function (e) {
      if (e.keyCode >= 37 && e.keyCode <= 40) {
        T.Car.ZKey -= (e.keyCode == 39) - (e.keyCode == 37);
        T.Car.XKey -= (e.keyCode == 38) - (e.keyCode == 40);
      }
    };
  }
}

const Cars = new Graphics(vShaderStr, fShaderStr, HeightP, CarM, Sky);

function Run () {
  requestAnimationFrame(Run);
  Cars.drawScene();
}

Run();
