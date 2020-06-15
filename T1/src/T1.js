import * as dat from 'dat.gui';
import * as THREE from 'three';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import CarM from '../bin/Car.glb';
import HeightP from '../bin/Height.png';
import hash from '../../hash.txt';
import Sky from '../bin/Skybox.hdr';
import LoadP from '../bin/Loading.jpg';
import smoke0 from '../bin/Smoke0.png';
import smoke1 from '../bin/Smoke1.png';
import smoke2 from '../bin/Smoke2.png';
import smoke3 from '../bin/Smoke3.png';

Math.clamp = function (a, b, c) {
  return Math.max(b, Math.min(c, a));
};
Math.lerp = function (a, b, x) {
  return a + x * (b - a);
};

class Graphics {
  initThree () {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.W / this.H, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.W, this.H);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('container').appendChild(this.renderer.domElement);

    this.renderer.shadowMap.enabled = true;

    this.sun = new THREE.DirectionalLight(0xffffff, 0.5);
    this.moon = new THREE.DirectionalLight(0xB5F3FF, 1);
    this.HemisphereLight = new THREE.HemisphereLight(0xfffffff, 0x183d14, 1);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = this.sun.shadow.mapSize.height = 4096;
    this.sun.shadow.camera.top = this.sun.shadow.camera.right = 32;
    this.sun.shadow.camera.left = -this.sun.shadow.camera.right;
    this.sun.shadow.camera.bottom = -this.sun.shadow.camera.top;
    this.sun.shadow.bias = -0.0005;

    this.scene.add(this.sun);
    this.scene.add(this.moon);
    this.scene.add(this.HemisphereLight);
    this.fog = this.scene.fog = new THREE.FogExp2(0xffffff, 0.03);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableKeys = false;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.camera.position.z = 5;
  }

  initLoadscene (LoadP) {
    this.loading = new THREE.Scene();

    const geom = new THREE.BoxGeometry();
    this.loadingCube = null;

    this.loadingCube = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: new THREE.TextureLoader().load(LoadP)
    }));

    this.loadingCube.matrixAutoUpdate = false;

    this.loading.add(this.loadingCube);
  }

  RegenColors () {
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

    this.geometryHM.setAttribute('color', new THREE.BufferAttribute(new Float32Array(P.length), 3));
    const C = this.geometryHM.attributes.color.array;

    function smax (a, b) {
      const h = 0.04;
      const k = Math.clamp((b - a) / h / 2.0 + 0.5, 0.0, 1.0);

      return -(a * (k - 1) - b * k) + k * (1.0 - k) * h;
    }

    for (i = 0; i < C.length; i += 3) {
      const y = 1 - P[i + 1] / 0.3 - 0.5;
      const Kd = Math.max(0.02, Math.max(0.4 - 0.7 * y, Math.min(0.3, 0.9 * y - 0.7)));
      const M = Math.pow(Math.max(0.0, 1.0 - 1.7 * y) * 1.1, 2.0);
      const Gr = Math.min(Math.clamp(4.3 - 5.0 * y, 0.0, 0.3), Math.pow(Math.clamp(y * 0.6 - 0.14, 0.0, 0.3) / 0.3, 2.0) * 0.3);
      const Sand = Math.clamp(Math.min(Math.pow(Math.max(0.0, 5.0 * y - 3.5), 1.5), 4.3 - 5.0 * y), 0.0, 0.3);
      const Sea = Math.pow(Math.max(0.0, 0.7 - Math.abs(2.8 - 3.0 * y)), 1.3);

      C[i] = Sand + M;
      C[i + 1] = smax(M, Gr);
      C[i + 2] = Sea + M;
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
      this.HMSize = k = 16;
      k2 = k * k * 3;
      this.HMapData = [];

      if (this.Heightmap != null) {
        delete this.geometryHM;
      }

      this.geometryHM = new THREE.PlaneBufferGeometry(1, 1, k - 1, k - 1);
      const P = this.geometryHM.attributes.position.array;

      for (let i = 0; i < k2; i += 3) {
        P[i + 2] = P[i];
        P[i] = P[i + 1];
        this.HMapData.push(P[i + 1] = TurbNoise(P[i] / Q, P[i + 2] / Q, Seed, Noise, 8) * 0.3);
      }

      this.RegenColors();

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

        T.geometryHM = new THREE.PlaneBufferGeometry(1, 1, k - 1, k - 1);
        const P = T.geometryHM.attributes.position.array;

        const Ch = data.length / k2;
        for (let i = 0; i < k2 * 3; i += 3) {
          P[i + 2] = P[i];
          P[i] = P[i + 1];
          T.HMapData.push(P[i + 1] = ((data[i / 3 * Ch] + data[i / 3 * Ch + 1] + data[i / 3 * Ch + 2]) / 3 / 255 - 0.5) * 0.3);
        }

        T.HMSize = k;
        T.RegenColors();

        if (T.Heightmap != null) {
          T.Heightmap.geometry = T.geometryHM;
        }
      };
      image.src = HeightP;
    }
  }

  initHeightmap (HeightP) {
    this.Heightmap = null;
    this.HMScale = 256;

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true });

    this.Regenerate();

    this.Heightmap = new THREE.Mesh(this.geometryHM, material);
    this.Heightmap.frustumCulled = false;

    this.scene.add(this.Heightmap);
    this.Heightmap.castShadow = true;
    this.Heightmap.receiveShadow = true;

    this.Regenerate(HeightP);
  }

  initParticles (smoke) {
    this.Particles = {
      array: [],
      maxTime: 2,
      deltaCreate: 0.025,
      Car: this.Car,
      scene: this.scene,
      camera: this.controls,
      material: [],
      dtime: 0,
      addParticle: function () {
        const P = {
          velocity: this.Car.V + 5,
          Matr: new THREE.Matrix4(),
          time: 0,
          mesh: null,
          x: 0,
          CarTr: new THREE.Matrix4(),
          base: new THREE.Vector3(Math.random() * 2 - 1, 0, Math.random() * 2 - 1)
        };
        P.base.multiplyScalar(0.3);
        P.Matr.copy(this.Car.RotateMatr);
        P.CarTr.makeTranslation(this.Car.Pos.x, this.Car.Pos.y, this.Car.Pos.z);

        P.mesh = new THREE.Sprite(this.material[Math.floor(Math.random() * this.material.length)]);
        P.mesh.matrix = new THREE.Matrix4();
        P.mesh.matrixAutoUpdate = false;

        this.array.push(P);
        this.scene.add(P.mesh);
      },
      onUpdate: function (deltaTime) {
        if (this.Car.Model == null) {
          return;
        }

        this.dtime += deltaTime;

        while (this.array.length > 0 && this.array[0].time + deltaTime > this.maxTime) {
          this.scene.remove(this.array[0].mesh);
          this.array.shift();
        }

        while (this.dtime > this.deltaCreate) {
          this.addParticle();
          this.dtime -= this.deltaCreate;
        }

        let i;
        for (i = 0; i < this.array.length; i++) {
          const P = this.array[i];
          P.time += deltaTime;

          const Scale = new THREE.Matrix4();
          const kScale = Math.lerp(1, 2, P.time / this.maxTime);
          Scale.makeScale(kScale, kScale, 1);

          const Tr = new THREE.Matrix4();
          P.velocity += Math.max(-deltaTime * P.velocity * P.velocity * 0.7, -P.velocity);
          P.x += P.velocity * deltaTime;
          Tr.makeTranslation(-0.3 + P.base.x, 0 + P.base.y, P.x + P.base.z);
          P.mesh.matrix.makeTranslation(0, -0.5 * P.time + 0.5, 0).multiply(P.CarTr).multiply(P.Matr).multiply(Tr).multiply(Scale);
        }
      }
    };

    let i;
    for (i = 0; i < smoke.length; i++) {
      const Tex = THREE.ImageUtils.loadTexture(smoke[i]);
      this.Particles.material.push(new THREE.SpriteMaterial({
        map: Tex,
        transparent: true,
        fog: true
      }));
    }
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
      },
      OnEnvMap (env) {
        this.Model.traverse(function (node) {
          if (node.material && (node.material.isMeshStandardMaterial ||
           (node.material.isShaderMaterial && node.material.envMap !== undefined))) {
            node.material.envMap = env;
          }
        });
      },
      RotateMatr: new THREE.Matrix4()
    };
  }

  loadCar (CarM, smoke) {
    const loader = new GLTFLoader();
    const T = this;

    loader.load(CarM, function (gltf) {
      T.Car.Model = gltf.scene;

      T.Car.Model.traverse(function (o) {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

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

      T.Car.Lights.L = new THREE.SpotLight(0xffffa0, 2, 20, Math.PI / 9, 0.3);
      T.Car.Lights.R = new THREE.SpotLight(0xffffa0, 2, 20, Math.PI / 9, 0.3);

      T.Car.Lights.L.position.copy(LPos);
      T.Car.Lights.R.position.copy(RPos);

      T.scene.add(T.Car.Model);
      T.scene.add(T.Car.Lights.L);
      T.scene.add(T.Car.Lights.R);
      T.scene.add(T.Car.Lights.L.target);
      T.scene.add(T.Car.Lights.R.target);

      T.sun.target = T.Car.Model;
      T.moon.target = T.Car.Model;

      T.Car.Model.matrixAutoUpdate = false;
    }, undefined, function (error) {
      alert('Error!');
      console.error(error);
    });

    T.initParticles(smoke);
  }

  initGUI () {
    const T = this;

    this.Params = {
      Exposure: 1,
      Operator: THREE.ACESFilmicToneMapping,
      Scale: this.HMScale,
      IsFog: true,
      RotateCar: true
    };

    this.gui = new dat.GUI();
    this.gui.remember(this.Params);

    const hdrGui = this.gui.addFolder('HDR');
    hdrGui.add(this.Params, 'Exposure').min(0.1).max(3).step(0.005).onChange(function (value) {
      T.renderer.toneMappingExposure = value;
    });
    hdrGui.add(this.Params, 'Operator', {
      Uncharted2: THREE.Uncharted2ToneMapping,
      Filmic: THREE.ACESFilmicToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      Linear: THREE.LinearToneMapping,
      Off: THREE.NoToneMapping
    }).onFinishChange(function (value) {
      T.renderer.toneMapping = parseInt(value);
    });

    this.gui.add(this.Params, 'Scale').min(64).max(512).step(8).onChange(function (value) {
      T.HMScale = value;
    });
    this.gui.add(this.Params, 'IsFog').onChange(function (value) {
      if (value) {
        T.scene.fog = T.fog;
      } else {
        T.scene.fog = null;
      }
    });
    this.gui.add(this.Params, 'RotateCar').onChange(function (value) {
      T.Params.RotateCar = value;
    });

    this.stats = new Stats();
    document.getElementById('container').appendChild(this.stats.dom);
  }

  moveCar () {
    if (this.Car.Model == null) {
      return;
    }

    this.Car.A = this.Car.XKey * 15 - Math.sign(this.Car.V) * Math.min(Math.max(Math.abs(this.Car.V), this.Car.V * this.Car.V), 4.0);
    const V1 = Math.clamp(this.Car.A * this.DeltaT + this.Car.V, -20.0, 30.0);

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

    this.Car.Rotate -= this.Car.Wheels.Y * this.DeltaT * this.Car.V * 0.05;

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
    M.makeRotationY(this.Car.Rotate);

    /* Move on Y */
    if (Math.abs(this.Car.Pos.x) <= this.HMScale * 0.5 && Math.abs(this.Car.Pos.z) <= this.HMScale * 0.5) {
      const K = new THREE.Matrix4();
      const KAxe = new THREE.Vector3(0, 1, 0);

      const narr = this.geometryHM.attributes.normal.array;
      const normCoeff = new THREE.Vector2(this.HMSize * (0.5 + this.Car.Pos.z / this.HMScale), this.HMSize * (0.5 - this.Car.Pos.x / this.HMScale));
      const normInd = new THREE.Vector2(Math.floor(normCoeff.x), Math.floor(normCoeff.y));
      const normInd2 = new THREE.Vector2(Math.min(normInd.x + 1, this.HMSize), Math.min(normInd.y + 1, this.HMSize));
      normCoeff.sub(normInd);

      if (this.Params.RotateCar) {
        const b1 = new THREE.Vector3(narr[(normInd.y * this.HMSize + normInd.x) * 3],
          narr[(normInd.y * this.HMSize + normInd.x) * 3 + 1],
          narr[(normInd.y * this.HMSize + normInd.x) * 3 + 2]);
        const b2 = new THREE.Vector3(narr[(normInd.y * this.HMSize + normInd2.x) * 3],
          narr[(normInd.y * this.HMSize + normInd2.x) * 3 + 1],
          narr[(normInd.y * this.HMSize + normInd2.x) * 3 + 2]);
        const b3 = new THREE.Vector3(narr[(normInd2.y * this.HMSize + normInd.x) * 3],
          narr[(normInd2.y * this.HMSize + normInd.x) * 3 + 1],
          narr[(normInd2.y * this.HMSize + normInd.x) * 3 + 2]);
        const b4 = new THREE.Vector3(narr[(normInd2.y * this.HMSize + normInd2.x) * 3],
          narr[(normInd2.y * this.HMSize + normInd2.x) * 3 + 1],
          narr[(normInd2.y * this.HMSize + normInd2.x) * 3 + 2]);

        const N = new THREE.Vector3(b1.x, b1.y, b1.z);

        N.add(b4.add(b1).sub(b2).sub(b3).multiplyScalar(normCoeff.x).multiplyScalar(normCoeff.y)).add(b2.sub(b1).multiplyScalar(normCoeff.x)).add(b3.sub(b1).multiplyScalar(normCoeff.y));

        K.makeRotationAxis(KAxe.crossVectors(Ya, N.normalize()), Ya.dot(N));
        K.multiply(M);
        M.copy(K);
      }

      const parr = this.geometryHM.attributes.position.array;
      const c1 = parr[(normInd.y * this.HMSize + normInd.x) * 3 + 1];
      const c2 = parr[(normInd.y * this.HMSize + normInd2.x) * 3 + 1];
      const c3 = parr[(normInd2.y * this.HMSize + normInd.x) * 3 + 1];
      const c4 = parr[(normInd2.y * this.HMSize + normInd2.x) * 3 + 1];
      const TargetY = this.HMScale * (c1 + (c2 - c1) * normCoeff.x + (c3 - c1) * normCoeff.y + (c4 - c3 - c2 + c1) * normCoeff.x * normCoeff.y);

      this.Car.Pos.y += Math.sign(TargetY - this.Car.Pos.y) * Math.min(Math.abs(TargetY - this.Car.Pos.y), this.HMScale * this.DeltaT);
    } else {
      this.Car.Pos.setComponent(1, 0);
    }

    this.Car.RotateMatr.copy(M);

    this.Car.Model.matrix.makeTranslation(this.Car.Pos.x, this.Car.Pos.y, this.Car.Pos.z);
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

    const LDir = new THREE.Vector3(0, 0, -1);
    LDir.applyMatrix4(M);

    this.Car.Lights.L.position.set(Lp.x, Lp.y, Lp.z);
    this.Car.Lights.L.target.position.addVectors(this.Car.Lights.L.position, LDir);
    this.Car.Lights.R.position.set(Rp.x, Rp.y, Rp.z);
    this.Car.Lights.R.target.position.addVectors(this.Car.Lights.R.position, LDir);

    this.camera.position.add(P);
    this.controls.target.copy(this.Car.Pos);

    this.Particles.onUpdate(this.DeltaT);
  }

  sunMove () {
    const t = this.timeMs * 0.05 / Math.PI / 2;
    let T = (t - Math.floor(t)) * Math.PI * 2;
    const a = Math.PI / 3;

    const V = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
    const X = new THREE.Vector3(1, 0, 0);
    const M = new THREE.Matrix4();
    const OSun = new THREE.Matrix4();
    const OMoon = new THREE.Matrix4();

    M.makeTranslation(-10, 0, 0);
    OSun.makeRotationAxis(V.cross(X), T);
    OMoon.makeRotationAxis(V, T + Math.PI);

    this.sun.position.set(-64, 0, 0).applyMatrix4(OSun).add(this.Car.Pos);
    this.moon.position.set(-64, 0, 0).applyMatrix4(OMoon).add(this.Car.Pos);

    // Colors
    if (Math.sin(T) < 0) {
      T = Math.PI * 1.5 + Math.pow(Math.abs(T / Math.PI - 1.5) * 2, 4) / 2 * Math.PI * Math.sign(T / Math.PI - 1.5);
    }

    const Morning = Math.clamp((Math.PI / 3 - Math.PI + Math.abs(Math.PI - T)) / Math.PI * 6, 0, 1);
    const Evening = Math.clamp((Math.PI / 3 - Math.abs(Math.PI - T)) / Math.PI * 6, 0, 1);
    const Day = Math.clamp((Math.PI / 3 - Math.abs(Math.PI / 2 - T)) / Math.PI * 6, 0, 1);
    const Night = Math.clamp((Math.PI / 3 - Math.abs(Math.PI * 1.5 - T)) / Math.PI * 6, 0, 1);

    this.sun.intensity = (1 - Night);
    this.moon.intensity = Night * 0.030;
    this.fog.density = (1 - Day) * 0.03;

    const MorningC = new THREE.Vector3(203, 178, 255);
    const EveningC = new THREE.Vector3(255, 76, 20);
    const DayC = new THREE.Vector3(200, 230, 255);
    const NightC = new THREE.Vector3(38, 42, 76);
    const MorningL = new THREE.Vector3(255, 232, 170);
    const EveningL = new THREE.Vector3(255, 76, 20);
    const DayL = new THREE.Vector3(255, 255, 255);
    const B = new THREE.Vector3();
    const L = new THREE.Vector3();

    B.copy(MorningC.multiplyScalar(Morning)).add(EveningC.multiplyScalar(Evening)).add(DayC.multiplyScalar(Day)).add(NightC.multiplyScalar(Night));
    L.copy(MorningL.multiplyScalar(Morning)).add(EveningL.multiplyScalar(Evening)).add(DayL.multiplyScalar(Day));

    this.fog.color.copy(this.HemisphereLight.groundColor.copy(this.HemisphereLight.color.copy(this.scene.background = new THREE.Color(B.x / 255, B.y / 255, B.z / 255))));

    this.sun.color.setRGB(L.x / 255, L.y / 255, L.z / 255);
  }

  drawScene () {
    this.stats.update();

    if (this.envMap == undefined || this.Car.Model == null) {
      this.loadingCube.rotation._x += 0.023;
      this.loadingCube.rotation._y += 0.033;
      this.loadingCube.rotation._z += 0.013;

      const Y = new THREE.Matrix4();
      const Z = new THREE.Matrix4();
      this.loadingCube.matrix.makeRotationX(this.loadingCube.rotation._x).multiply(Y.makeRotationY(this.loadingCube.rotation._y)).multiply(Z.makeRotationZ(this.loadingCube.rotation._z));
      this.renderer.render(this.loading, this.camera);
      return;
    }

    if (this.init == false) {
      this.globalMs = Date.now() / 1000;
    }
    this.DeltaT = this.IsNPause * (Date.now() / 1000 - this.globalMs);
    this.timeMs += this.DeltaT;
    this.globalMs = Date.now() / 1000;
    this.init = true;

    this.moveCar();
    this.sunMove();
    this.Heightmap.scale.set(this.HMScale, this.HMScale, this.HMScale);

    this.renderer.render(this.scene, this.camera);
  }

  constructor (HeightP, CarM, Sky, LoadP, smoke) {
    this.init = false;
    this.IsNPause = true;
    this.timeMs = 0;
    this.globalMs = Date.now() / 1000;
    this.W = window.innerWidth;
    this.H = window.innerHeight;

    const p = document.getElementById('info');
    p.innerHTML = '<a href="https://github.com/DA2pml30/Practice2020">Github</a>, hash:<span id="Hash"></span>';
    document.getElementById('Hash').innerHTML = hash;

    this.initThree();
    this.initLoadscene(LoadP);
    this.initHeightmap(HeightP);
    this.initCar();
    this.initGUI();
    this.loadCar(CarM, smoke);

    const T = this;
    this.envMap = undefined;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const RGBEL = new RGBELoader();
    RGBEL.setDataType(THREE.UnsignedByteType);
    RGBEL.load(Sky, function (texture) {
      T.envMap = pmremGenerator.fromEquirectangular(texture).texture;
      pmremGenerator.dispose();

      T.envMap.encoding = THREE.RGBEEncoding;

      if (T.Car.Model != null) {
        T.Car.OnEnvMap(T.envMap);
      }
    });

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

    document.getElementById('files').onchange = function (evt) {
      const file = evt.target.files[0];
      const reader = new FileReader();

      reader.onloadend = function () {
        T.Regenerate(reader.result);
      };
      reader.readAsDataURL(file);
    };
  }
}

const Cars = new Graphics(HeightP, CarM, Sky, LoadP, [smoke0, smoke1, smoke2, smoke3]);

function Run () {
  requestAnimationFrame(Run);
  Cars.drawScene();
}

Run();
