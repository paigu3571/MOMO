import * as THREE from 'three';
import { WIDTH, HEIGHT, PARTS, FACES } from './config.js';
import { SoftPart } from './softpart.js';

const VIEW = { cover: [.54, 738], play: [.71, 535], results: [.53, 435] };
const ORDER = ['legwear_R', 'legwear_L', 'sleeve_R', 'sleeve_L', 'charm_peach', 'face', 'ribbon_spring', 'ahoge'];
const XL = WIDTH / 2;
const YL = HEIGHT / 2;

function loadImage(name) {
  const image = new Image();
  image.src = new URL('../assets/' + name + '.webp', import.meta.url);
  return image.decode().then(() => image);
}

function makeTexture(image) {
  const texture = new THREE.Texture(image);
  texture.premultiplyAlpha = true;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function material(texture, fabric = false) {
  return new THREE.ShaderMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      image: { value: texture },
      fabric: { value: fabric ? 1 : 0 },
      tension: { value: 0 },
    },
    vertexShader: `
      varying vec2 texUV;
      void main() {
        texUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D image;
      uniform float fabric;
      uniform float tension;
      varying vec2 texUV;
      void main() {
        vec4 color = texture2D(image, texUV);
        float grooves = (0.5 + 0.5 * sin(texUV.x * (150.0 + tension * 90.0))) * 0.10;
        float gleam = (0.5 + 0.5 * sin(texUV.x * 13.0)) * 0.12;
        float boost = 1.0 + fabric * tension * (grooves + gleam);
        gl_FragColor = vec4(min(vec3(color.a), color.rgb * boost), color.a);
      }`,
  });
}

function alphaMap(image) {
  const scratch = document.createElement('canvas');
  scratch.width = image.width;
  scratch.height = image.height;
  const context = scratch.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, image.width, image.height).data;
  const alpha = new Uint8Array(image.width * image.height);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = rgba[i * 4 + 3];
  return alpha;
}

function plane(rect, skin, z, parent) {
  const [x, y, w, h] = rect;
  const object = new THREE.Mesh(new THREE.PlaneGeometry(w, h), skin);
  object.position.set(x + w / 2, -(y + h / 2), 0);
  object.renderOrder = z;
  parent.add(object);
  return object;
}

export async function createStage(canvas) {
  const names = ['bg_room', 'body_base', 'icon_peach', ...ORDER.filter((n) => n !== 'face'), ...FACES.map((f) => 'face_' + f)];
  const rectRequest = fetch(new URL('../assets/rects.json', import.meta.url)).then((response) => {
    if (!response.ok) throw new Error('无法读取部件坐标');
    return response.json();
  });
  const [rects, images] = await Promise.all([
    rectRequest,
    Promise.all(names.map(async (name) => [name, await loadImage(name)])).then(Object.fromEntries),
  ]);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, WIDTH, 0, -HEIGHT, .1, 200);
  camera.position.z = 100;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, premultipliedAlpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor('#b674a8');
  const textures = Object.fromEntries(names.map((name) => [name, makeTexture(images[name])]));
  const background = plane([0, 0, WIDTH, HEIGHT], material(textures.bg_room), 0, scene);
  const character = new THREE.Group();
  scene.add(character);
  plane([0, 0, WIDTH, HEIGHT], material(textures.body_base), 3, character);
  const parts = ORDER.map((name, index) => {
    const source = name === 'face' ? 'face_idle' : name;
    const skin = material(textures[source], PARTS[name].kind === 'legwear');
    const part = new SoftPart(name, rects[name], PARTS[name], skin, alphaMap(images[source]));
    part.mesh.renderOrder = index + 10;
    character.add(part.mesh);
    return part;
  });
  const selection = Object.fromEntries(parts.map((part) => [part.name, part]));
  const hitOrder = [...parts].reverse();

  let mode = 'cover';
  let face = 'wink';
  let scale = VIEW.cover[0];
  let xOffset = 0;
  let yOffset = VIEW.cover[1];
  let viewW = WIDTH;
  let viewH = HEIGHT;
  let accumulator = 0;
  const step = 1 / 120;
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height;
    viewW = Math.max(WIDTH, HEIGHT * aspect);
    viewH = Math.max(HEIGHT, WIDTH / aspect);
    camera.left = XL - viewW / 2;
    camera.right = XL + viewW / 2;
    camera.top = -YL + viewH / 2;
    camera.bottom = -YL - viewH / 2;
    camera.updateProjectionMatrix();
    background.scale.setScalar(Math.max(viewW / WIDTH, viewH / HEIGHT));
    renderer.setSize(width, height, false);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  return {
    canvas, images, rects, parts, selection,
    setMode(next) {
      mode = next;
      for (const part of parts) part.reset();
      accumulator = 0;
    },
    face(next) {
      if (next === face && selection.face.material.uniforms.image.value === textures['face_' + next]) return;
      face = next;
      selection.face.material.uniforms.image.value = textures['face_' + next];
    },
    point(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      const x = camera.left + (clientX - box.left) / box.width * viewW;
      const y = -camera.top + (clientY - box.top) / box.height * viewH;
      return { x: (x - xOffset) / scale, y: (y - yOffset) / scale };
    },
    screenPoint(x, y) {
      const box = canvas.getBoundingClientRect();
      return {
        x: box.left + (x * scale + xOffset - camera.left) / viewW * box.width,
        y: box.top + (y * scale + yOffset + camera.top) / viewH * box.height,
      };
    },
    hit(x, y, touch) {
      return hitOrder.find((part) => part.mesh.visible && part.hit(x, y, touch));
    },
    update(delta, now) {
      const [base, top] = VIEW[mode];
      const breath = Math.sin(now * Math.PI * 2 / 3) * .006;
      scale = base * (1 + breath);
      xOffset = XL * (1 - scale);
      yOffset = top - base * (2550 * breath);
      character.scale.setScalar(scale);
      character.position.set(xOffset, -yOffset, 0);

      if (mode === 'cover') {
        selection.ahoge.goal[0] = Math.sin(now * 4.1) * 9;
        selection.ahoge.goal[1] = Math.sin(now * 6.1) * 4;
      }
      accumulator = Math.min(.067, accumulator + delta);
      while (accumulator >= step) {
        for (const part of parts) part.step(step);
        accumulator -= step;
      }
      renderer.render(scene, camera);
    },
    paintCharacter(context, x, y, ratio, expression = face) {
      context.drawImage(images.body_base, x, y, WIDTH * ratio, HEIGHT * ratio);
      for (const part of ORDER) {
        const [left, top, w, h] = rects[part];
        const image = images[part === 'face' ? 'face_' + expression : part];
        context.drawImage(image, x + left * ratio, y + top * ratio, w * ratio, h * ratio);
      }
    },
  };
}
