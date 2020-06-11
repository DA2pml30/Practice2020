import vShaderStr from './T1.vert';
import fShaderStr from './T1.frag';

import * as dat from 'dat.gui';
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

import CarM from '../bin/Car.glb';
import HeightP from '../bin/Height.png';
import hash from '../../hash.txt';

class Graphics {
  initThree () {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.W / this.H, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.W, this.H);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('container').appendChild(this.renderer.domElement);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.directionalLight.matrixAutoUpdate = false;

    const directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight);

    this.scene.add(this.directionalLight);
    this.scene.add(directionalLightHelper);

    var light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    this.scene.add(light);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableKeys = false;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.camera.position.z = 5;
  }

  RegenNormals () {
    const P = this.geometryHM.attributes.position.array;
    const N = this.geometryHM.attributes.normal.array;
    const Ind = this.geometryHM.index.array;

    let i = 0;
    for (i = 2; i < N.length; i += 3) {
      N[i] = 0;
    }

    for (i = 0; i < Ind.length; i += 3) {
      const p1 = new THREE.Vector3(P[Ind[i] * 3], P[Ind[i] * 3 + 1], P[Ind[i] * 3 + 2]);
      const p2 = new THREE.Vector3(P[Ind[i + 1] * 3], P[Ind[i + 1] * 3 + 1], P[Ind[i + 1] * 3 + 2]);
      const p3 = new THREE.Vector3(P[Ind[i + 2] * 3], P[Ind[i + 2] * 3 + 1], P[Ind[i + 2] * 3 + 2]);

      const n = new THREE.Vector3(0, 0, 0);

      n.crossVectors(p2.sub(p1), p3.sub(p1)).normalize();

      N[Ind[i] * 3] += n.x;
      N[Ind[i] * 3 + 1] += n.y;
      N[Ind[i] * 3 + 2] += n.z;
      N[Ind[i + 1] * 3] += n.x;
      N[Ind[i + 1] * 3 + 1] += n.y;
      N[Ind[i + 1] * 3 + 2] += n.z;
      N[Ind[i + 2] * 3] += n.x;
      N[Ind[i + 2] * 3 + 1] += n.y;
      N[Ind[i + 2] * 3 + 2] += n.z;
    }

    for (i = 0; i < N.length; i += 3) {
      const n = new THREE.Vector3(N[i], N[i + 1], N[i + 2]);
      n.normalize();

      N[i] = n.x;
      N[i + 1] = n.y;
      N[i + 2] = n.z;
    }
  }

  Regenerate (HeightP) {
    let k;
    let k2;
    const Q = 16 / this.HMScale;
    const Seed = Math.random() * 100;
    const Noise = new ImprovedNoise();

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

    if (HeightP == undefined) {
      k = 16;
      k2 = k * k * 3;
      this.HMapData = [];

      if (this.Heightmap != null) {
        delete this.geometryHM;
      }

      this.geometryHM = new THREE.PlaneBufferGeometry(this.HMScale, this.HMScale, k - 1, k - 1);
      const P = this.geometryHM.attributes.position.array;

      for (let i = 0; i < k2; i += 3) {
        P[i + 2] = P[i];
        P[i] = P[i + 1];
        this.HMapData.push(P[i + 1] = TurbNoise(P[i] / Q, P[i + 2] / Q, Seed, Noise, 8));
      }

      this.RegenNormals();

      if (this.Heightmap != null) {
        this.Heightmap.geometry = this.geometryHM;
      }
    } else {
      const T = this;
      const image = new Image();
      image.onload = function () {
        k = Math.min(image.width, image.height);
        k2 = k * k;

        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');

        context.drawImage(image, 0, 0);
        const data = context.getImageData(Math.floor((image.width - k) / 2), Math.floor((image.height - k) / 2), k, k).data;

        if (T.Heightmap != null) {
          delete T.geometryHM;
        }
        this.HMapData = [];

        T.geometryHM = new THREE.PlaneBufferGeometry(512, 512, k - 1, k - 1);
        const P = T.geometryHM.attributes.position.array;

        const Ch = data.length / k2;
        for (let i = 0; i < k2 * 3; i += 3) {
          P[i + 2] = P[i];
          P[i] = P[i + 1];
          T.HMapData.push(P[i + 1] = data[i / 3 * Ch] * 0.3);
        }

        T.RegenNormals();

        if (T.Heightmap != null) {
          T.Heightmap.geometry = T.geometryHM;
        }
      };
      image.src = HeightP;
    }
  }

  initHeightmap (HeightP, VSText, FSText) {
    this.Heightmap = null;

    this.VSText = VSText;
    this.FSText = FSText;
    this.HMScale = 512;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        Scale: { value: this.HMScale }
      },

      vertexShader: VSText,
      fragmentShader: FSText
    });
    const Phmat = new THREE.MeshPhongMaterial(
      {
        color: 0xA63744,
        shininess: 10
      });

    this.Regenerate();

    this.Heightmap = new THREE.Mesh(this.geometryHM, Phmat);

    this.scene.add(this.Heightmap);

    this.Regenerate(HeightP);
  }

  initCar () {
    this.Car = {
      Model: null,
      Wheels: {
        LP: null,
        RP: null,
        LZ: null,
        RZ: null,
        Y: 0,
        Angle: 0
      },
      A: 0,
      V: 0,
      XKey: 0,
      YKey: 0,
      Pos: new THREE.Vector3(0, 0, 0),
      Rotate: 0,
      Lights: {
        L: null,
        LPos: null,
        R: null,
        RPos: null
      }
    };
  }

  loadCar (CarM, envMap) {
    const loader = new GLTFLoader();
    const T = this;

    loader.load(CarM, function (gltf) {
      T.Car.Model = gltf.scene;

      const Bones = gltf.scene.children[0].children;
      let L;
      for (let i = 0; i < Bones.length; i++) {
        if (Bones[i].name == 'KLP') {
          T.Car.Wheels.LP = Bones[i];
        } else if (Bones[i].name == 'KPP') {
          T.Car.Wheels.RP = Bones[i];
        } else if (Bones[i].name == 'KLZ') {
          T.Car.Wheels.LZ = Bones[i];
        } else if (Bones[i].name == 'KPZ') {
          T.Car.Wheels.RZ = Bones[i];
        } else if (Bones[i].name == 'Lum') {
          L = Bones[i];
        }
      }

      let LPos;
      let RPos;
      for (let j = 0; j < L.children.length; j++) {
        if (L.children[j].name == 'HLp') {
          const P = L.children[j].geometry.attributes.position.array;
          LPos = new THREE.Vector3(
            (P[0] + P[3] + P[6] + P[9]) * 0.25,
            (P[1] + P[4] + P[7] + P[10]) * 0.25,
            (P[2] + P[5] + P[8] + P[11]) * 0.25);
        } else if (L.children[j].name == 'HRp') {
          const P = L.children[j].geometry.attributes.position.array;
          RPos = new THREE.Vector3(
            (P[0] + P[3] + P[6] + P[9]) * 0.25,
            (P[1] + P[4] + P[7] + P[10]) * 0.25,
            (P[2] + P[5] + P[8] + P[11]) * 0.25);
        }
      }

      LPos.add(L.position).multiply(T.Car.Model.children[0].scale);
      LPos.set(LPos.x, -LPos.z, LPos.y);

      RPos.add(L.position).multiply(T.Car.Model.children[0].scale);
      RPos.set(RPos.x, -RPos.z, RPos.y);

      T.Car.Lights.LPos = LPos;
      T.Car.Lights.RPos = RPos;

      T.Car.Lights.L = new THREE.SpotLight(0xffffa0, 1, 20, Math.PI / 9, 0.3);
      T.Car.Lights.R = new THREE.SpotLight(0xffffa0, 1, 20, Math.PI / 9, 0.3);
      T.Car.Lights.LSub = new THREE.SpotLightHelper(T.Car.Lights.L);
      T.Car.Lights.RSub = new THREE.SpotLightHelper(T.Car.Lights.R);

      T.Car.Lights.L.position.copy(LPos);
      T.Car.Lights.R.position.copy(RPos);

      T.Car.Lights.L.matrixAutoUpdate = false;
      T.Car.Lights.R.matrixAutoUpdate = false;

      T.scene.add(T.Car.Model);
      T.scene.add(T.Car.Lights.L);
      T.scene.add(T.Car.Lights.R);
      T.scene.add(T.Car.Lights.LSub);
      T.scene.add(T.Car.Lights.RSub);

      T.directionalLight.target = T.Car.Model;

      T.Car.Model.matrixAutoUpdate = false;
    }, undefined, function (error) {
      alert('Error!');
      console.error(error);
    });
  }

  initGUI () {
    const T = this;

    this.Params = {
      sun:
      {
        Visible: true,
        Color: T.directionalLight.color.getHex(),
        Intensity: 0.5
      },
      Exposure: 1,
      Operator: THREE.ACESFilmicToneMapping
    };

    this.gui = new dat.GUI();
    this.gui.remember(this.Params);

    const sunGui = this.gui.addFolder('Sun');
    sunGui.add(this.Params.sun, 'Visible').onChange(function (value) {
      T.directionalLight.visible = value;
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
    document.getElementById('container').appendChild(this.stats.dom);
  }

  moveCar () {
    if (this.Car.Model == null) {
      return;
    }

    this.Car.A = this.Car.XKey * 30 - Math.sign(this.Car.V) * Math.min(Math.max(Math.abs(this.Car.V), this.Car.V * this.Car.V), 4.0);
    const V1 = Math.max(Math.min(this.Car.A * this.DeltaT + this.Car.V, 50.0), -10.0);

    if (this.Car.XKey == 0 && Math.sign(V1) - Math.sign(this.Car.V)) {
      this.Car.V = 0;
    } else {
      this.Car.V = V1;
    }

    // Rotate wheels
    this.Car.Wheels.LP.rotateY(-this.Car.Wheels.Angle);
    this.Car.Wheels.RP.rotateY(this.Car.Wheels.Angle);
    this.Car.Wheels.LZ.rotateY(-this.Car.Wheels.Angle);
    this.Car.Wheels.RZ.rotateY(this.Car.Wheels.Angle);

    this.Car.Wheels.Angle += this.Car.V * this.DeltaT * 0.5;

    const dY = Math.sign(this.Car.YKey - this.Car.Wheels.Y) * Math.min(this.DeltaT * 5.0, Math.abs(this.Car.YKey - this.Car.Wheels.Y));
    this.Car.Wheels.LP.rotateZ(dY);
    this.Car.Wheels.RP.rotateZ(dY);
    this.Car.Wheels.Y += dY;

    this.Car.Rotate -= this.Car.Wheels.Y * this.DeltaT * this.Car.V * 0.01;

    this.Car.Wheels.LP.rotateY(this.Car.Wheels.Angle);
    this.Car.Wheels.RP.rotateY(-this.Car.Wheels.Angle);
    this.Car.Wheels.LZ.rotateY(this.Car.Wheels.Angle);
    this.Car.Wheels.RZ.rotateY(-this.Car.Wheels.Angle);

    // Mov car pos
    const P = new THREE.Vector3(0, 0, -this.Car.V * this.DeltaT);
    const Ya = new THREE.Vector3(0, 1, 0);
    P.applyAxisAngle(Ya, this.Car.Rotate);
    this.Car.Pos.add(P);
    const M = new THREE.Matrix4();

    this.Car.Model.matrix.makeTranslation(this.Car.Pos.x, this.Car.Pos.y, this.Car.Pos.z);
    M.makeRotationY(this.Car.Rotate);

    this.Car.Model.matrix.multiply(M);
    this.Car.Model.position.copy(this.Car.Pos);

    const Lp = new THREE.Vector3(0, 0, 0);
    Lp.copy(this.Car.Lights.LPos).applyMatrix4(M).add(this.Car.Pos);
    const Rp = new THREE.Vector3(0, 0, 0);
    Rp.copy(this.Car.Lights.RPos).applyMatrix4(M).add(this.Car.Pos);

    const R = new THREE.Matrix4();
    R.makeRotationX(Math.PI / 2);

    this.Car.Lights.L.matrix.makeTranslation(Lp.x, Lp.y, Lp.z).multiply(M).multiply(R);
    this.Car.Lights.R.matrix.makeTranslation(Rp.x, Rp.y, Rp.z).multiply(M).multiply(R);
    this.camera.position.add(P);
    this.controls.target.copy(this.Car.Pos);
  }

  sunMove () {
    const t = this.timeMs * 0.05 / Math.PI / 2;
    let T = (t - Math.floor(t)) * Math.PI * 2;
    const a = Math.PI / 3;

    const V = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
    const X = new THREE.Vector3(1, 0, 0);
    const M = new THREE.Matrix4();
    const R = new THREE.Matrix4();
    const O = new THREE.Matrix4();

    M.makeTranslation(-2, 0, 0);
    R.makeRotationZ(Math.PI / 2);
    O.makeRotationAxis(V.cross(X), T);
    this.directionalLight.matrix.makeTranslation(this.Car.Pos.x, this.Car.Pos.y, this.Car.Pos.z).multiply(O).multiply(M).multiply(R);

    // Colors
    if (Math.sin(T) < 0) {
      T = Math.PI * 1.5 + Math.pow(Math.abs(T / Math.PI - 1.5) * 2, 4) / 2 * Math.PI * Math.sign(T / Math.PI - 1.5);
    }

    const Morning = Math.min(Math.max(Math.PI / 3 - Math.PI + Math.abs(Math.PI - T), 0) / Math.PI * 6, 1);
    const Evening = Math.min(Math.max(Math.PI / 3 - Math.abs(Math.PI - T), 0) / Math.PI * 6, 1);
    const Day = Math.min(Math.max(Math.PI / 3 - Math.abs(Math.PI / 2 - T), 0) / Math.PI * 6, 1);
    const Night = Math.min(Math.max(Math.PI / 3 - Math.abs(Math.PI * 1.5 - T), 0) / Math.PI * 6, 1);

    this.directionalLight.Intensity = Math.max(Math.min(Morning + Evening + Day, 1), 0);

    const MorningC = new THREE.Vector3(203, 178, 255);
    const EveningC = new THREE.Vector3(255, 76, 0);
    const DayC = new THREE.Vector3(200, 230, 255);
    const NightC = new THREE.Vector3(40, 40, 76);
    const MorningL = new THREE.Vector3(255, 232, 170);
    const EveningL = new THREE.Vector3(255, 76, 0);
    const DayL = new THREE.Vector3(255, 255, 178);
    const B = new THREE.Vector3();
    const L = new THREE.Vector3();

    B.copy(MorningC.multiplyScalar(Morning)).add(EveningC.multiplyScalar(Evening)).add(DayC.multiplyScalar(Day)).add(NightC.multiplyScalar(Night));
    L.copy(MorningL.multiplyScalar(Morning)).add(EveningL.multiplyScalar(Evening)).add(DayL.multiplyScalar(Day));

    this.scene.background = new THREE.Color(B.x / 255, B.y / 255, B.z / 255);
    this.directionalLight.color.copy(L);
  }

  drawScene () {
    this.DeltaT = this.IsNPause * (Date.now() / 1000 - this.globalMs);
    this.timeMs += this.DeltaT;
    this.globalMs = Date.now() / 1000;

    this.stats.update();

    this.moveCar();
    this.sunMove();

    this.renderer.render(this.scene, this.camera);
  }

  constructor (VSText, FSText, HeightP, CarM, Sky) {
    this.IsNPause = true;
    this.timeMs = 0;
    this.globalMs = Date.now() / 1000;
    this.W = window.innerWidth;
    this.H = window.innerHeight;

    const p = document.getElementById('info');
    p.innerHTML = '<a href="https://github.com/DA2pml30/Practice2020">Github</a>, hash:<span id="Hash"></span>';
    document.getElementById('Hash').innerHTML = hash;

    this.initThree();
    this.initHeightmap(HeightP, VSText, FSText);
    this.initCar();
    this.initGUI();

    this.loadCar(CarM);

    const T = this;

    document.onkeydown = function (e) {
      if (e.repeat) {
        return;
      }

      if (e.keyCode >= 37 && e.keyCode <= 40) {
        T.Car.YKey += (e.keyCode == 39) - (e.keyCode == 37);
        T.Car.XKey += (e.keyCode == 38) - (e.keyCode == 40) * 0.4;
      } else if (e.keyCode == 80) {
        T.IsNPause = !T.IsNPause;
      }
    };

    document.onkeyup = function (e) {
      if (e.keyCode >= 37 && e.keyCode <= 40) {
        T.Car.YKey -= (e.keyCode == 39) - (e.keyCode == 37);
        T.Car.XKey -= (e.keyCode == 38) - (e.keyCode == 40) * 0.4;
      }
    };

    window.addEventListener('resize', function () {
      T.camera.aspect = window.innerWidth / window.innerHeight;
      T.camera.updateProjectionMatrix();

      T.W = window.innerWidth;
      T.H = window.innerHeight;

      T.renderer.setSize(T.W, T.H);
    }, false);
  }
}

const Cars = new Graphics(vShaderStr, fShaderStr, HeightP, CarM, '');

function Run () {
  requestAnimationFrame(Run);
  Cars.drawScene();
}

Run();
