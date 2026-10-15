import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode
} from 'postprocessing';
import { QualityConfig } from './types';

export class RenderPipeline {
  public readonly composer: EffectComposer;
  public readonly bloom: BloomEffect;
  public readonly chromatic: ChromaticAberrationEffect;
  private readonly caOffset = new THREE.Vector2(0.001, 0.001);

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    quality: QualityConfig
  ) {
    // Generate procedural Synthwave HDR PMREM Environment Map
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x050208);

    const skyLight = new THREE.HemisphereLight(0x00f3ff, 0xff2d95, 2.8);
    envScene.add(skyLight);

    const horizonStrip = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 6, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff2d95, side: THREE.BackSide })
    );
    envScene.add(horizonStrip);

    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    // Postprocessing Effect Stack
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType
    });

    const renderPass = new RenderPass(scene, camera);
    this.bloom = new BloomEffect({
      intensity: quality.bloomIntensity,
      luminanceThreshold: 0.22,
      luminanceSmoothing: 0.4,
      mipmapBlur: true
    });

    this.chromatic = new ChromaticAberrationEffect({
      offset: this.caOffset,
      radialModulation: true,
      modulationOffset: 0.25
    });

    const vignette = new VignetteEffect({
      eskil: false,
      offset: 0.28,
      darkness: 0.72
    });

    const toneMapping = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC
    });

    const effectPass = new EffectPass(
      camera,
      this.bloom,
      this.chromatic,
      vignette,
      toneMapping
    );

    this.composer.addPass(renderPass);
    this.composer.addPass(effectPass);
  }

  public applyQuality(renderer: THREE.WebGLRenderer, quality: QualityConfig): void {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    this.bloom.intensity = quality.bloomIntensity;
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public update(dt: number, speedRatio: number, isNitro: boolean, pulse: number, reducedMotion: boolean): void {
    const caTarget = reducedMotion
      ? 0.0004
      : 0.0008 + speedRatio * 0.0018 + (isNitro ? 0.0038 : 0) + pulse * 0.001;
    this.caOffset.set(caTarget, caTarget * 0.65);
    this.chromatic.offset.copy(this.caOffset);
    this.composer.render(dt);
  }
}