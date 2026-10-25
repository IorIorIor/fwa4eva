/* FWA FOREVER — every FWA winner as a star in one galaxy you can fly through.
   WebGPU (three.js r184, TSL shaders) with an automatic WebGL2 fallback.
   One module, read top to bottom: data → world → graphics → flight → interface → loop. */
import * as THREE from 'three/webgpu';
import {
  Fn, If, Loop, Break, Discard, select, uniform, attribute, varying, varyingProperty, texture, pass, screenUV, uv, viewportSharedTexture,
  float, vec2, vec3, vec4,
  positionGeometry, positionWorld, normalWorld, modelViewMatrix, modelWorldMatrix, positionView, normalView, positionLocal,
  cameraPosition, cameraViewMatrix, cameraProjectionMatrix, modelScale, transpose,
  acesFilmicToneMapping, sRGBTransferOETF,
  abs, acos, atan, clamp, cos, cross, distance, dot, exp, floor, fract, fwidth, length, log, max, min, mix, mod, normalize, pow, sin, smoothstep, sqrt, step,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

THREE.ColorManagement.enabled = false;   // colours are authored as plain sRGB numbers and shown as-is (the look was tuned that way)
const V3 = THREE.Vector3, Q4 = THREE.Quaternion, C3 = THREE.Color;
