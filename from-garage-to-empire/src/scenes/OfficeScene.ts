import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { OfficeCharacter } from './OfficeCharacter';
import { officeLayouts, drawExpandedOffice } from './OfficeEnvironment';

// This scene only consumes state. It never calculates or changes the economy.
export class OfficeScene extends Phaser.Scene {
  private signature = '';
  private closeView = true;
  private actors: OfficeCharacter[] = [];
  private founder?: OfficeCharacter;
  private particles: Phaser.GameObjects.Text[] = [];
  private confetti: Phaser.GameObjects.Rectangle[] = [];
  private workingUntil = 0;
  private celebrationUntil = 0;
  private getState: () => GameState;
  private onInteract: () => void;
  constructor(getState: () => GameState, onInteract: () => void) {
    super('office');
    this.getState = getState;
    this.onInteract = onInteract;
  }
  create(): void {
    this.applyFraming();
    this.drawOffice();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killAll();
      this.actors = [];
      this.particles = [];
      this.confetti = [];
    });
  }
  private applyFraming(): void {
    this.cameras.main.setZoom(this.closeView ? 1.4 : 1);
    this.cameras.main.centerOn(360, this.closeView ? 285 : 250.5);
  }
  toggleFraming(): boolean {
    this.closeView = !this.closeView;
    this.applyFraming();
    return this.closeView;
  }
  refreshOffice(): void {
    if (!this.sys.isActive()) return;
    const s = this.getState();
    this.signature = `${s.office}/${s.employees.length}/${JSON.stringify(s.upgrades)}/${s.settings.reducedMotion}`;
    this.drawOffice();
    if (!s.settings.reducedMotion) this.cameras.main.fadeIn(350, 20, 27, 34);
  }
  private polygon(
    g: Phaser.GameObjects.Graphics,
    points: number[],
    color: number,
    alpha = 1,
  ): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!);
    g.closePath();
    g.fillPath();
  }
  private box(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    top: number,
    left: number,
    right: number,
  ): void {
    this.polygon(
      g,
      [
        x,
        y - h,
        x + w,
        y + w * 0.46 - h,
        x + w - d,
        y + (w + d) * 0.46 - h,
        x - d,
        y + d * 0.46 - h,
      ],
      top,
    );
    this.polygon(
      g,
      [
        x - d,
        y + d * 0.46 - h,
        x + w - d,
        y + (w + d) * 0.46 - h,
        x + w - d,
        y + (w + d) * 0.46,
        x - d,
        y + d * 0.46,
      ],
      left,
    );
    this.polygon(
      g,
      [
        x + w - d,
        y + (w + d) * 0.46 - h,
        x + w,
        y + w * 0.46 - h,
        x + w,
        y + w * 0.46,
        x + w - d,
        y + (w + d) * 0.46,
      ],
      right,
    );
  }
  private plant(g: Phaser.GameObjects.Graphics, x: number, y: number, size = 1): void {
    g.fillStyle(0x34594b, 0.12);
    g.fillEllipse(x + 4, y + 7, 42 * size, 18 * size);
    g.fillStyle(0xcb8a62);
    g.fillRoundedRect(x - 12 * size, y - 20 * size, 24 * size, 29 * size, 6);
    g.fillStyle(0xe6ac7c);
    g.fillEllipse(x, y - 19 * size, 25 * size, 9 * size);
    g.lineStyle(3 * size, 0x39614a);
    g.lineBetween(x, y - 16 * size, x, y - 64 * size);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i % 2 ? 0x5a9469 : 0x7aa377);
      g.fillEllipse(x + (i % 2 ? 9 : -9) * size, y - (29 + i * 8) * size, 23 * size, 11 * size);
    }
  }
  private person(x: number, y: number, variant: number): OfficeCharacter {
    const actor = new OfficeCharacter(this, x, y, variant, this.onInteract).setDepth(y + 1);
    this.actors.push(actor);
    return actor;
  }
  private desk(g: Phaser.GameObjects.Graphics, x: number, y: number, main = false): void {
    const s = this.getState();
    g.fillStyle(0x35564c, 0.12);
    g.fillEllipse(x + 8, y + 54, 141, 47);
    this.box(g, x - 22, y + 27, 8, 7, 44, 0x936f53, 0x7d604a, 0x6c5040);
    this.box(g, x + 60, y + 15, 8, 7, 40, 0x936f53, 0x7d604a, 0x6c5040);
    this.box(g, x - 24, y - 12, 111, 56, 9, s.office ? 0xe4c292 : 0xd6b88b, 0xaf8960, 0xc0996f);
    // Rounded drawer handles and a little grain keep the furniture from feeling like blocks.
    g.lineStyle(1, 0x9d754a, 0.2);
    g.lineBetween(x - 52, y + 4, x + 24, y + 39);
    g.lineBetween(x - 44, y - 2, x - 10, y + 14);
    if (main) {
      this.box(g, x + 59, y + 36, 22, 22, 34, 0xcba774, 0xa98760, 0xb5946c);
      g.lineStyle(2, 0x7b765d).lineBetween(x + 42, y + 30, x + 52, y + 35);
      g.lineStyle(2, 0x7b765d).lineBetween(x + 42, y + 41, x + 52, y + 46);
    }
    // The screen grows into a desktop monitor as hardware is purchased.
    const screenX = x + 15,
      screenY = y - 53;
    const monitor = !main || s.upgrades.laptop > 0;
    g.fillStyle(0x3a5354);
    g.fillRoundedRect(screenX - 30, screenY - (monitor ? 15 : 0), 58, monitor ? 43 : 30, 5);
    g.fillStyle(0x243e42);
    g.fillRoundedRect(screenX - 25, screenY - (monitor ? 10 : -4), 48, monitor ? 32 : 21, 3);
    for (let i = 0; i < 4; i++) {
      g.lineStyle(2, [0xa8ceaf, 0xe6bb7a, 0x86b5c0, 0xa8ceaf][i]!);
      g.lineBetween(
        screenX - 18 + (i % 2) * 5,
        screenY + i * 5,
        screenX + 3 + i * 4,
        screenY + i * 5,
      );
    }
    g.fillStyle(0xd8eada).fillCircle(screenX, screenY - (monitor ? 12 : -2), 1);
    const cursor = this.add
      .rectangle(screenX + 19, screenY + 15, 2, 4, 0xb7dfb2)
      .setDepth(g.depth + 0.1);
    if (!s.settings.reducedMotion)
      this.tweens.add({ targets: cursor, alpha: 0.15, duration: 650, yoyo: true, repeat: -1 });
    this.polygon(
      g,
      [
        screenX - 30,
        screenY + 30,
        screenX + 28,
        screenY + 30,
        screenX + 39,
        screenY + 39,
        screenX - 20,
        screenY + 39,
      ],
      0x718786,
    );
    if (main && s.upgrades.monitor) {
      g.fillStyle(0x354e50);
      g.fillRoundedRect(x - 72, y - 66, 44, 34, 4);
      g.fillStyle(0xa0ccdb);
      g.fillRoundedRect(x - 68, y - 62, 36, 26, 3);
      g.lineStyle(3, 0x354e50);
      g.lineBetween(x - 50, y - 32, x - 50, y - 21);
    }
    if (main && s.upgrades.keyboard) {
      this.polygon(g, [x - 8, y - 9, x + 31, y - 9, x + 41, y, x + 1, y], 0x37544f);
      g.lineStyle(2, 0xeabd81);
      g.lineBetween(x + 1, y - 5, x + 29, y - 5);
    }
    if (main && s.upgrades.coffee) {
      g.fillStyle(0xf9f2de);
      g.fillRoundedRect(x + 48, y - 21, 13, 16, 3);
      g.lineStyle(2, 0xf9f2de);
      g.strokeCircle(x + 62, y - 15, 4);
      g.fillStyle(0x715449);
      g.fillEllipse(x + 54, y - 21, 12, 4);
      if (!s.settings.reducedMotion) {
        for (let i = 0; i < 3; i++) {
          const steam = this.add
            .graphics()
            .setPosition(x + 50 + i * 4, y - 28)
            .setDepth(g.depth + 0.2);
          steam
            .lineStyle(1.5, 0xfff8dc, 0.7)
            .beginPath()
            .moveTo(0, 0)
            .lineTo(2, -4)
            .lineTo(0, -8)
            .strokePath();
          this.tweens.add({
            targets: steam,
            y: y - 43,
            x: steam.x + 3,
            alpha: 0,
            delay: i * 380,
            duration: 1450,
            repeat: -1,
          });
        }
      }
    }
  }
  private wallDetails(g: Phaser.GameObjects.Graphics, office: number): void {
    // Small imperfections and the warm string lights give the garage a lived-in feel.
    g.lineStyle(1, 0xb4a489, 0.25);
    for (let row = 0; row < 3; row++) {
      const y = 206 + row * 20;
      g.lineBetween(213, y, 243, y - 14);
      g.lineBetween(225, y - 5, 225, y + 3);
    }
    if (office < 2) {
      g.lineStyle(1.5, 0x788170, 0.8);
      for (let i = 0; i < 9; i++) {
        const x = 83 + i * 29,
          y = 157 - i * 13 + Math.sin((i / 8) * Math.PI) * 13;
        if (i) {
          const lastY = 157 - (i - 1) * 13 + Math.sin(((i - 1) / 8) * Math.PI) * 13;
          g.lineBetween(x - 29, lastY, x, y);
        }
        g.fillStyle(0xffd887, 0.13).fillCircle(x, y + 6, 10);
        g.fillStyle(0xffdba1).fillEllipse(x, y + 5, 4, 7);
        g.fillStyle(0x89947e).fillRect(x - 2, y - 1, 4, 3);
      }
    }
    // Analog clock with a cream face; all artwork is generated locally.
    g.fillStyle(0x677b68).fillCircle(395, 100, 17);
    g.fillStyle(0xf8eccf).fillCircle(395, 100, 13);
    g.lineStyle(2, 0x687763).lineBetween(395, 100, 395, 92).lineBetween(395, 100, 402, 104);
    g.fillStyle(0xbc9864).fillCircle(395, 100, 2);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      g.fillStyle(0xb5aa87).fillCircle(395 + Math.sin(angle) * 10, 100 + Math.cos(angle) * 10, 1);
    }
    if (office > 0) {
      this.polygon(g, [598, 178, 639, 196, 639, 253, 598, 235], 0xab8560);
      this.polygon(g, [602, 185, 635, 199, 635, 246, 602, 232], 0xe9d9b5);
      g.fillStyle(0x86a695).fillEllipse(619, 214, 19, 24);
      g.fillStyle(0xecc17c).fillCircle(619, 210, 6);
      g.lineStyle(2, 0xfaf1d6).lineBetween(610, 226, 627, 233);
    }
  }
  private floorDetails(g: Phaser.GameObjects.Graphics, office: number): void {
    if (office === 0) {
      // Pizza box and a pair of notebooks, tucked away from the work area.
      this.box(g, 171, 343, 29, 22, 5, 0xeac89d, 0xc59b70, 0xd8b185);
      g.fillStyle(0xc78e65).fillEllipse(174, 352, 20, 8);
      g.fillStyle(0xf1cb7e).fillTriangle(168, 349, 182, 355, 165, 355);
      g.fillStyle(0xc5775d).fillCircle(170, 352, 1.5).fillCircle(175, 354, 1.5);
    }
    // A little coffee station grows into the improved garage.
    if (office > 0) {
      this.box(g, 184, 276, 38, 28, 40, 0xd7b98b, 0xab8d66, 0xbf9e72);
      g.fillStyle(0x4e665e).fillRoundedRect(176, 227, 21, 30, 4);
      g.fillStyle(0xaac4b3).fillRoundedRect(180, 232, 13, 8, 2);
      g.fillStyle(0xe9e2c9).fillRoundedRect(181, 245, 10, 10, 2);
      g.fillStyle(0xeac284).fillCircle(191, 242, 1.5);
      this.plant(g, 156, 275, 0.48);
    }
  }
  private sleepingCat(x: number, y: number): void {
    const cat = this.add.container(x, y).setDepth(y + 9);
    const body = this.add.graphics();
    body.fillStyle(0xd5a774).fillEllipse(0, 0, 44, 21);
    body.fillStyle(0xf0d2a0).fillEllipse(-5, 4, 21, 11);
    body.fillStyle(0xd5a774).fillCircle(18, -3, 12);
    body.fillTriangle(9, -9, 11, -19, 17, -11).fillTriangle(21, -11, 28, -18, 28, -5);
    body
      .fillStyle(0xd5947e)
      .fillTriangle(12, -11, 12, -15, 15, -11)
      .fillTriangle(24, -11, 27, -15, 27, -8);
    body.lineStyle(2, 0x876343).lineBetween(14, -2, 18, -1).lineBetween(23, -2, 27, -3);
    body.fillStyle(0x9d7156).fillTriangle(19, 2, 23, 2, 21, 4);
    body.lineStyle(1, 0xa97c55, 0.6).lineBetween(10, 2, 16, 3).lineBetween(26, 3, 32, 2);
    body.lineStyle(3, 0xb28558).lineBetween(-9, -8, -5, -2).lineBetween(-1, -9, 2, -4);
    const tail = this.add.graphics().setPosition(-19, 3);
    tail
      .lineStyle(6, 0xc69865)
      .beginPath()
      .moveTo(0, 0)
      .lineTo(-9, -5)
      .lineTo(-12, -13)
      .strokePath();
    const heart = this.add.graphics().setPosition(15, -24).setVisible(false);
    heart
      .fillStyle(0xc98a79)
      .fillCircle(-3, -3, 4)
      .fillCircle(3, -3, 4)
      .fillTriangle(-7, -2, 7, -2, 0, 7);
    cat.add([tail, body, heart]);
    if (!this.getState().settings.reducedMotion) {
      this.tweens.add({
        targets: body,
        scaleY: 1.06,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: tail,
        rotation: -0.2,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    cat.setInteractive(new Phaser.Geom.Rectangle(-34, -24, 72, 46), Phaser.Geom.Rectangle.Contains);
    if (cat.input) cat.input.cursor = 'pointer';
    cat.on('pointerdown', () => {
      this.tweens.killTweensOf(heart);
      heart.setPosition(15, -24).setAlpha(1).setVisible(true);
      this.tweens.add({
        targets: heart,
        y: this.getState().settings.reducedMotion ? -24 : -42,
        alpha: 0,
        duration: 1100,
        onComplete: () => heart.setVisible(false),
      });
    });
  }
  private ambientDust(): void {
    if (this.getState().settings.reducedMotion) return;
    for (let i = 0; i < 7; i++) {
      const dust = this.add
        .circle(370 + ((i * 29) % 135), 200 + ((i * 19) % 90), i % 2 ? 1 : 1.5, 0xfff9da, 0.42)
        .setDepth(100);
      this.tweens.add({
        targets: dust,
        x: dust.x - 22,
        y: dust.y - 33,
        alpha: 0.06,
        duration: 4500 + i * 250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
  private drawGarage(g: Phaser.GameObjects.Graphics, s: GameState): void {
    g.fillStyle(0x335448, 0.04).fillEllipse(361, 457, 615, 103);
    g.fillStyle(0x335448, 0.08).fillEllipse(361, 450, 560, 70);
    this.polygon(g, [55, 315, 368, 463, 665, 315, 665, 336, 368, 485, 55, 337], 0xbca98d);
    this.polygon(g, [55, 315, 350, 180, 665, 315, 368, 463], 0xa8ada5);
    // Soft plank seams follow the same isometric perspective.
    g.lineStyle(1, 0xb5a88e, 0.27);
    for (let i = 1; i < 9; i++) {
      g.lineBetween(55 + i * 32.8, 315 - i * 15, 368 + i * 33, 463 - i * 16.4);
    }
    this.polygon(g, [55, 315, 55, 161, 350, 26, 350, 180], 0xb99476);
    this.polygon(g, [350, 26, 665, 161, 665, 315, 350, 180], 0xd7d4bf);
    g.lineStyle(6, 0xf6eedc);
    g.lineBetween(55, 159, 350, 24);
    g.lineBetween(350, 24, 665, 159);
    g.lineStyle(5, 0xaeab8d);
    g.lineBetween(58, 307, 350, 176);
    g.lineBetween(350, 176, 662, 310);
    this.wallDetails(g, s.office);
    // Garage door, warm pinboard, and a sunlit window.
    this.polygon(g, [79, 181, 204, 124, 204, 235, 79, 292], 0x536370);
    for (let i = 0; i < 7; i++) {
      g.lineStyle(2, 0x87959a, 0.6);
      g.lineBetween(83, 190 + i * 14, 200, 137 + i * 14);
    }
    this.polygon(g, [238, 123, 317, 86, 317, 142, 238, 179], 0x9a7959);
    this.polygon(g, [244, 126, 312, 95, 312, 139, 244, 171], 0xc6a474);
    this.polygon(g, [253, 130, 270, 123, 270, 141, 253, 148], 0xffebaa);
    this.polygon(g, [283, 116, 302, 108, 302, 130, 283, 138], 0xe8b59c);
    this.polygon(g, [442, 88, 584, 150, 584, 245, 442, 183], 0xfaf3de);
    this.polygon(g, [449, 99, 577, 154, 577, 233, 449, 178], s.office === 2 ? 0xb5d8de : 0xaacaca);
    this.polygon(
      g,
      [449, 144, 481, 149, 501, 180, 537, 175, 577, 203, 577, 233, 449, 178],
      0x82aa97,
    );
    if (s.office === 2) {
      for (let i = 0; i < 6; i++) {
        const x = 453 + i * 20,
          y = 178 + (x - 449) * 0.43,
          height = 19 + (i % 3) * 8;
        this.polygon(
          g,
          [x, y - height, x + 16, y + 7 - height, x + 16, y + 7, x, y],
          i % 2 ? 0x789c9d : 0x91aca6,
        );
        g.lineStyle(2, 0xc9ded0).lineBetween(x + 5, y - height + 7, x + 11, y - height + 10);
      }
    }
    g.fillStyle(0xffffed, 0.4).fillEllipse(479, 128, 32, 7).fillEllipse(549, 162, 24, 6);
    g.lineStyle(6, 0xfaf3de);
    g.lineBetween(512, 127, 512, 206);
    g.lineBetween(449, 139, 577, 194);
    this.polygon(g, [444, 183, 584, 245, 595, 241, 455, 179], 0xd2c5aa);
    this.polygon(g, [442, 200, 545, 246, 455, 333, 347, 284], 0xfff1c5, 0.16);
    this.polygon(g, [451, 203, 480, 216, 399, 309, 367, 295], 0xfffae0, 0.12);
    this.polygon(g, [515, 231, 543, 244, 461, 337, 432, 322], 0xfffae0, 0.12);
    // Pendant lamp.
    g.lineStyle(2, 0x837c65);
    g.lineBetween(354, 40, 354, 97);
    g.fillStyle(0x506458);
    g.fillEllipse(354, 107, 49, 17);
    g.fillTriangle(330, 105, 345, 87, 369, 105);
    g.fillStyle(0xffde8c);
    g.fillEllipse(354, 110, 36, 7);
    this.polygon(g, [340, 111, 369, 111, 423, 267, 290, 249], 0xffe4a3, 0.055);
    // Storage and shipping boxes give the humble room a lived-in feel.
    this.box(g, 117, 268, 40, 27, 36, 0xd8b17d, 0xb89466, 0xc6a174);
    this.box(g, 146, 283, 30, 24, 26, 0xe1bd8b, 0xc5a16f, 0xd1ad7b);
    // Exposed conduit, a toolbox and a spare wheel make this unmistakably a garage.
    g.lineStyle(3, 0x6e7064).lineBetween(221, 104, 221, 228).lineBetween(221, 228, 256, 211);
    g.fillStyle(0x59676a).fillRoundedRect(215, 206, 12, 17, 2);
    g.lineStyle(7, 0x384449).strokeEllipse(91, 286, 25, 40);
    g.lineStyle(2, 0xa9b3a6).strokeEllipse(91, 286, 13, 26);
    this.box(g, 166, 295, 27, 21, 14, 0xc78251, 0x9a603b, 0xb77245);
    g.lineStyle(3, 0x3e4c50).lineBetween(165, 286, 176, 291);
    g.lineStyle(4, 0xe9cf9e);
    g.lineBetween(119, 235, 139, 244);
    if (s.office > 0) {
      this.box(g, 286, 206, 55, 23, 79, 0xd7b88b, 0x8a775b, 0x9d886a);
      g.lineStyle(5, 0xd8bd94);
      g.lineBetween(264, 156, 319, 181);
      g.lineBetween(264, 183, 319, 208);
      g.fillStyle(0x7ba4a0);
      g.fillRoundedRect(271, 137, 9, 20, 2);
      g.fillStyle(0xe1b276);
      g.fillRoundedRect(283, 142, 10, 22, 2);
      this.plant(g, 622, 285, 0.8);
    }
    if (s.upgrades.fiber) {
      g.fillStyle(0x456159);
      g.fillRoundedRect(367, 173, 25, 11, 3);
      g.lineStyle(2, 0x456159);
      g.lineBetween(371, 173, 371, 158);
      g.fillStyle(0x92e7b3);
      g.fillCircle(386, 178, 2);
    }
    // Rug beneath the founder's work area.
    this.polygon(g, [190, 342, 292, 295, 438, 359, 334, 411], s.office ? 0x87aaa0 : 0xc99572, 0.8);
    g.lineStyle(2, s.office ? 0xd7e4cb : 0xf3d7b4, 0.4);
    g.strokePoints(
      [
        { x: 202, y: 342 },
        { x: 292, y: 302 },
        { x: 424, y: 359 },
        { x: 334, y: 403 },
      ],
      true,
    );
    this.floorDetails(g, s.office);
    this.plant(g, 107, 337, 1.05);
  }
  private drawOffice(): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.actors = [];
    this.particles = [];
    this.confetti = [];
    const s = this.getState();
    const g = this.add.graphics();
    if (s.office === 0) this.drawGarage(g, s);
    else drawExpandedOffice(this, s.office as 1 | 2);
    const layout = officeLayouts[s.office]!;
    const positions = layout.staff;
    s.employees.forEach((employee, i) => {
      const [x, y] = positions[i]!;
      this.desk(this.add.graphics().setDepth(y!), x!, y!);
      const actor = this.person(x! + 6, y! + 28, employee.id);
      actor.setScale(0.72);
    });
    const [deskX, deskY] = layout.founder;
    this.desk(this.add.graphics().setDepth(deskY), deskX, deskY, true);
    this.founder = this.person(deskX + 11, deskY + 23, 0);
    const frontPlant = [
      [550, 352],
      [577, 348],
      [622, 314],
    ][s.office]!;
    this.plant(
      this.add.graphics().setDepth(frontPlant[1]! + 10),
      frontPlant[0]!,
      frontPlant[1]!,
      0.7,
    );
    // A tiny sleeping office cat.
    this.add
      .ellipse(layout.cat[0], layout.cat[1] + 9, 63, 20, 0x4e6d5a, 0.1)
      .setDepth(layout.cat[1]);
    this.sleepingCat(layout.cat[0], layout.cat[1]);
    if (s.office === 0) this.ambientDust();
    for (let i = 0; i < 18; i++)
      this.confetti.push(
        this.add
          .rectangle(0, 0, 5, 9, [0xe9bc76, 0x8da98b, 0x92b8be, 0xd49e85][i % 4]!)
          .setDepth(800)
          .setVisible(false),
      );
    for (let i = 0; i < 12; i++)
      this.particles.push(
        this.add
          .text(0, 0, '', {
            fontFamily: 'system-ui',
            fontSize: '23px',
            fontStyle: 'bold',
            color: '#245a46',
            stroke: '#fff9e9',
            strokeThickness: 4,
          })
          .setDepth(900)
          .setVisible(false),
      );
  }
  feedback(label: string, celebration = false): void {
    const s = this.getState();
    if (!this.founder) return;
    this.workingUntil = this.time.now + 900;
    if (celebration) this.celebrationUntil = this.time.now + 1050;
    const particle = this.particles.find((p) => !p.visible);
    if (particle) {
      particle
        .setText(label)
        .setPosition(this.founder.x - 25 + Math.random() * 50, this.founder.y - 100)
        .setAlpha(1)
        .setVisible(true);
      this.tweens.add({
        targets: particle,
        y: this.founder.y - (s.settings.reducedMotion ? 100 : 158),
        alpha: 0,
        duration: 850,
        onComplete: () => particle.setVisible(false),
      });
    }
    if (celebration && !s.settings.reducedMotion) {
      for (const [i, piece] of this.confetti.entries()) {
        if (piece.visible) continue;
        piece
          .setPosition(this.founder.x, this.founder.y - 108)
          .setAlpha(1)
          .setRotation(i)
          .setVisible(true);
        this.tweens.add({
          targets: piece,
          x: this.founder.x - 85 + i * 10,
          y: this.founder.y - 184 + (i % 4) * 13,
          rotation: i + 3,
          duration: 300,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: piece,
              y: piece.y + 90,
              alpha: 0,
              rotation: piece.rotation + 2,
              duration: 700,
              onComplete: () => piece.setVisible(false),
            });
          },
        });
      }
    }
  }
  update(time: number): void {
    const s = this.getState();
    const signature = `${s.office}/${s.employees.length}/${JSON.stringify(s.upgrades)}/${s.settings.reducedMotion}`;
    if (signature !== this.signature) {
      this.signature = signature;
      this.drawOffice();
    }
    for (const [i, actor] of this.actors.entries()) {
      const isFounder = actor === this.founder;
      const working =
        !s.company.bankrupt &&
        !s.company.pausedForReview &&
        (isFounder
          ? s.deepWork > 0 || this.time.now < this.workingUntil
          : !s.reservedEmployeeIds.includes(s.employees[i]!.id) &&
            (s.deepWork > 0 || (time + i * 1700) % 12000 < 10300));
      actor.animate(
        this.time.now,
        s.settings.reducedMotion,
        working,
        this.time.now < this.celebrationUntil,
      );
    }
  }
}
