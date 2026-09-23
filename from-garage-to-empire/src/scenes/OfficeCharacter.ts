import Phaser from 'phaser';

import { looks } from '../config/characters';

/** A small, reusable paper-puppet rig. Animation never mutates game state. */
export class OfficeCharacter extends Phaser.GameObjects.Container {
  private torso: Phaser.GameObjects.Container;
  private head: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Graphics;
  private leftArm: Phaser.GameObjects.Container;
  private rightArm: Phaser.GameObjects.Container;
  private bubble: Phaser.GameObjects.Container;
  private bubbleUntil = 0;
  private phase: number;

  constructor(scene: Phaser.Scene, x: number, y: number, variant: number, onInteract: () => void) {
    super(scene, x, y);
    scene.add.existing(this);
    this.phase = variant * 1.37;
    const style = looks[variant % looks.length]!;
    const g = scene.add.graphics();
    this.add(g);
    // Feet, trousers and the seat stay still while the upper body breathes.
    g.fillStyle(0x2d443b, 0.15).fillEllipse(2, 36, 63, 18);
    g.lineStyle(3, 0x43584f).lineBetween(-19, 26, -23, 42).lineBetween(21, 26, 26, 42);
    g.fillStyle(0x34474b).fillRoundedRect(-20, 9, 41, 25, 10);
    g.fillStyle(0x263e42).fillRoundedRect(-17, 23, 13, 15, 5).fillRoundedRect(9, 23, 13, 15, 5);
    g.fillStyle(0xede8d8).fillRoundedRect(-22, 34, 20, 9, 4).fillRoundedRect(7, 34, 23, 9, 4);
    g.fillStyle(0x748985).fillRoundedRect(-22, 39, 20, 4, 2).fillRoundedRect(7, 39, 23, 4, 2);

    this.torso = scene.add.container(0, 0);
    this.add(this.torso);
    const body = scene.add.graphics();
    this.torso.add(body);
    body.fillStyle(style.shadow).fillRoundedRect(-23, -15, 47, 43, 15);
    body.fillStyle(style.shirt).fillRoundedRect(-21, -18, 40, 42, 13);
    body.fillStyle(0xffffff, 0.1).fillRoundedRect(-17, -12, 11, 28, 5);
    body.fillStyle(style.skin).fillRoundedRect(-7, -28, 14, 17, 5);
    body.lineStyle(3, style.shadow).lineBetween(-10, -13, -1, -7).lineBetween(-1, -7, 10, -13);
    if (variant === 0) {
      body.lineStyle(1.5, 0xf4d9a6).lineBetween(-5, -7, -6, 5).lineBetween(7, -8, 7, 5);
      body.lineStyle(2, style.shadow).lineBetween(-10, 13, 10, 13);
      body.fillStyle(0xf1d9ae).fillRoundedRect(9, -4, 5, 5, 1);
    } else {
      body.lineStyle(1.5, style.shadow).lineBetween(1, -7, 1, 18);
      body.fillStyle(0xe7e6d4).fillRoundedRect(8, -3, 7, 9, 2);
    }

    this.leftArm = this.arm(-21, -8, -1, style);
    this.rightArm = this.arm(20, -8, 1, style);
    this.torso.add([this.leftArm, this.rightArm]);

    this.head = scene.add.container(0, -39);
    this.torso.add(this.head);
    const face = scene.add.graphics();
    this.head.add(face);
    if (variant % 3 === 1) face.fillStyle(style.hair).fillRoundedRect(-23, -23, 47, 49, 17);
    face.fillStyle(style.skin).fillCircle(-20, 3, 5).fillCircle(20, 3, 5);
    face.fillStyle(style.skin).fillRoundedRect(-20, -19, 41, 45, 16);
    face.fillStyle(0xffffff, 0.12).fillEllipse(-10, -2, 11, 23);
    face.fillStyle(0xca7f69, 0.22).fillEllipse(-12, 13, 9, 5).fillEllipse(13, 13, 8, 5);
    face.fillStyle(style.hair).fillRoundedRect(-22, -27, 45, 22, 12);
    if (variant % 3 === 0) {
      face.fillCircle(-12, -22, 12).fillCircle(3, -27, 12).fillCircle(16, -24, 9);
      face.fillRoundedRect(-22, -11, 7, 17, 3);
    } else if (variant % 3 === 1) {
      face.fillEllipse(-14, -7, 15, 31).fillCircle(23, -23, 10);
    } else {
      face.fillTriangle(-19, -13, 18, -20, 7, -3).fillRoundedRect(17, -14, 6, 16, 3);
    }
    face.lineStyle(2, style.hair, 0.7).lineBetween(-10, -1, -4, -2).lineBetween(6, -2, 12, -1);
    face.fillStyle(0xc78868, 0.55).fillEllipse(3, 11, 5, 4);
    face.lineStyle(1.7, 0x99604d).beginPath().arc(3, 15, 5, 0.15, 2.6).strokePath();
    this.eyes = scene.add.graphics().setPosition(0, 5);
    this.eyes.fillStyle(0x303b38).fillEllipse(-7, 0, 3.5, 5).fillEllipse(10, 0, 3.5, 5);
    this.head.add(this.eyes);
    const accessories = scene.add.graphics();
    this.head.add(accessories);
    if (variant === 0 || variant === 3) {
      accessories
        .lineStyle(2, 0x425756)
        .strokeRoundedRect(-15, -1, 14, 12, 4)
        .strokeRoundedRect(4, -1, 14, 12, 4);
      accessories.lineBetween(-1, 3, 4, 3);
    }
    if (variant === 0 || variant === 2 || variant === 5) {
      accessories
        .lineStyle(4, 0x435955)
        .beginPath()
        .arc(0, -3, 25, Math.PI, Math.PI * 2)
        .strokePath();
      accessories
        .fillStyle(0x435955)
        .fillRoundedRect(-28, -7, 8, 17, 4)
        .fillRoundedRect(22, -7, 8, 17, 4);
      accessories
        .fillStyle(0x95ada0)
        .fillRoundedRect(-27, -4, 4, 10, 2)
        .fillRoundedRect(25, -4, 4, 10, 2);
    }

    this.bubble = scene.add.container(32, -78).setVisible(false);
    const bubbleArt = scene.add.graphics();
    bubbleArt.fillStyle(0x345849, 0.13).fillRoundedRect(-1, -3, 38, 27, 10);
    bubbleArt
      .fillStyle(0xfffbef)
      .fillRoundedRect(-2, -5, 38, 26, 10)
      .fillTriangle(4, 19, 12, 19, 3, 26);
    bubbleArt.fillStyle(0x81967c).fillCircle(7, 8, 2).fillCircle(17, 8, 2).fillCircle(27, 8, 2);
    this.bubble.add(bubbleArt);
    this.add(this.bubble);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-34, -76, 72, 123),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.input) this.input.cursor = 'pointer';
    this.on('pointerdown', () => {
      this.bubbleUntil = scene.time.now + 2000;
      onInteract();
    });
  }

  private arm(
    x: number,
    y: number,
    direction: number,
    style: (typeof looks)[number],
  ): Phaser.GameObjects.Container {
    const arm = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    g.lineStyle(12, style.shadow).lineBetween(0, 0, direction * 7, 15);
    g.lineStyle(10, style.shirt).lineBetween(0, -2, direction * 7, 12);
    // Bent forearms reach forward toward the laptop instead of hanging beside the body.
    g.lineStyle(8, style.skin).lineBetween(direction * 7, 12, direction * 11, -4);
    g.fillStyle(style.skin).fillEllipse(direction * 11, -5, 11, 8);
    g.fillStyle(0xffffff, 0.16).fillEllipse(direction * 12, -7, 6, 3);
    arm.add(g);
    return arm;
  }

  animate(time: number, reducedMotion: boolean, working: boolean, celebrating: boolean): void {
    const phase = this.phase;
    this.bubble.setVisible(time < this.bubbleUntil);
    if (reducedMotion) {
      this.torso.y = 0;
      this.head.rotation = 0;
      this.leftArm.rotation = 0;
      this.rightArm.rotation = 0;
      this.eyes.scaleY = 1;
      return;
    }
    const rhythm = time / (celebrating ? 95 : 125) + phase;
    this.torso.y =
      Math.sin(time / 850 + phase) * 1.15 - (celebrating ? Math.abs(Math.sin(rhythm)) * 3 : 0);
    this.head.rotation = Math.sin(time / (working ? 330 : 1800) + phase) * (working ? 0.025 : 0.04);
    this.eyes.scaleY = (time + phase * 1000) % 4600 < 140 ? 0.12 : 1;
    this.leftArm.rotation = celebrating ? 0.8 : working ? Math.sin(rhythm) * 0.16 : 0.03;
    this.rightArm.rotation = celebrating
      ? -0.8
      : working
        ? Math.sin(rhythm + Math.PI) * 0.16
        : -0.03;
  }
}
