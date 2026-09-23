import Phaser from 'phaser';

type Point = readonly [number, number];
export const officeLayouts = [
  { id: 'garage', founder: [299, 321], staff: [[472, 274]], cat: [477, 401] },
  {
    id: 'studio',
    founder: [290, 342],
    staff: [
      [350, 230],
      [477, 289],
      [214, 279],
    ],
    cat: [502, 390],
  },
  {
    id: 'coworking',
    founder: [330, 375],
    staff: [
      [355, 206],
      [470, 259],
      [250, 260],
      [365, 313],
      [535, 310],
      [478, 367],
    ],
    cat: [172, 342],
  },
] as const;

function poly(g: Phaser.GameObjects.Graphics, points: number[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha).beginPath().moveTo(points[0]!, points[1]!);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!);
  g.closePath().fillPath();
}
function cabinet(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  poly(
    g,
    [x, y, x + width, y + width * 0.46, x + width, y + width * 0.46 - height, x, y - height],
    0x927459,
  );
  poly(
    g,
    [
      x,
      y - height,
      x + width,
      y + width * 0.46 - height,
      x + width + 18,
      y + width * 0.46 - height - 9,
      x + 18,
      y - height - 9,
    ],
    0xd4b88d,
  );
  poly(
    g,
    [
      x + width,
      y + width * 0.46,
      x + width + 18,
      y + width * 0.46 - 9,
      x + width + 18,
      y + width * 0.46 - height - 9,
      x + width,
      y + width * 0.46 - height,
    ],
    0x635d52,
  );
  g.lineStyle(2, 0xddc99e).lineBetween(
    x + 7,
    y - height + 16,
    x + width - 7,
    y - height + 16 + (width - 14) * 0.46,
  );
}
function window(
  g: Phaser.GameObjects.Graphics,
  a: Point,
  width: number,
  height: number,
  slope: number,
  city: boolean,
): void {
  const [x, y] = a;
  poly(
    g,
    [x, y, x + width, y + width * slope, x + width, y + width * slope + height, x, y + height],
    0x273a4c,
  );
  poly(
    g,
    [
      x + 5,
      y + 7,
      x + width - 5,
      y + (width - 5) * slope + 7,
      x + width - 5,
      y + (width - 5) * slope + height - 6,
      x + 5,
      y + height - 6,
    ],
    city ? 0x88a9c4 : 0xa1c1cb,
  );
  if (city) {
    for (let i = 0; i < 6; i++) {
      const left = x + 9 + (i * (width - 20)) / 6,
        bottom = y + height - 9 + (left - x) * slope,
        w = (width - 25) / 6,
        h = 18 + (i % 3) * 10;
      poly(
        g,
        [
          left,
          bottom,
          left + w,
          bottom + w * slope,
          left + w,
          bottom + w * slope - h,
          left,
          bottom - h,
        ],
        i % 2 ? 0x617e98 : 0x728fa1,
      );
      g.lineStyle(2, 0xc0d0cf).lineBetween(
        left + 4,
        bottom - h + 7,
        left + w - 4,
        bottom - h + 7 + (w - 8) * slope,
      );
    }
  }
  g.lineStyle(5, 0x354759);
  for (let i = 1; i < 4; i++) {
    const at = x + (width * i) / 4;
    g.lineBetween(at, y + ((width * i) / 4) * slope, at, y + ((width * i) / 4) * slope + height);
  }
  g.lineBetween(x, y + height * 0.57, x + width, y + width * slope + height * 0.57);
  poly(
    g,
    [
      x + 8,
      y + 9,
      x + width * 0.42,
      y + width * 0.42 * slope + 9,
      x + width * 0.68,
      y + width * 0.68 * slope + height - 10,
      x + width * 0.48,
      y + width * 0.48 * slope + height - 10,
    ],
    0xf2f2d9,
    0.12,
  );
}

/** Different architecture for each location, rather than recoloring a shared garage. */
export function drawExpandedOffice(scene: Phaser.Scene, office: 1 | 2): void {
  const g = scene.add.graphics();
  g.fillStyle(0x182b3a, 0.13).fillEllipse(362, 459, 610, 71);
  if (office === 1) {
    // A renovated industrial studio: timber floor, a blue feature wall and project board.
    poly(g, [55, 302, 377, 465, 662, 314, 662, 334, 377, 485, 55, 322], 0x71644f);
    poly(g, [55, 302, 340, 156, 662, 314, 377, 465], 0xcda77c);
    for (let i = 1; i < 12; i++) {
      g.lineStyle(1, 0x795e47, 0.35).lineBetween(
        55 + i * 25.9,
        302 - i * 13.3,
        377 + i * 25.9,
        465 - i * 13.7,
      );
    }
    poly(g, [55, 302, 55, 149, 340, 3, 340, 156], 0xc6c3aa);
    poly(g, [340, 3, 662, 161, 662, 314, 340, 156], 0x405d70);
    g.lineStyle(6, 0xe6d4b3).lineBetween(55, 147, 340, 1).lineBetween(340, 1, 662, 159);
    g.lineStyle(5, 0x6d735f).lineBetween(57, 300, 340, 155).lineBetween(340, 155, 659, 312);
    // A broad workshop window replaces the garage door entirely.
    window(g, [82, 150], 141, 94, -0.51, false);
    // An oversized project board with flow diagrams.
    poly(g, [393, 91, 564, 175, 564, 251, 393, 167], 0x233b4d);
    poly(g, [399, 98, 558, 177, 558, 242, 399, 163], 0xf2e8c9);
    for (let i = 0; i < 4; i++) {
      const x = 412 + i * 35,
        y = 123 + i * 17;
      poly(
        g,
        [x, y, x + 24, y + 12, x + 24, y + 31, x, y + 19],
        [0xdca266, 0x84a998, 0x87a9c0, 0xd8bc75][i]!,
      );
      if (i < 3) g.lineStyle(2, 0x8b9f92).lineBetween(x + 26, y + 22, x + 33, y + 25);
    }
    cabinet(g, 590, 265, 33, 84);
    g.fillStyle(0xa8b79a).fillRoundedRect(597, 199, 8, 18, 2);
    g.fillStyle(0xd4aa79).fillRoundedRect(609, 205, 9, 19, 2);
    // Utility table, coffee machine and a real entrance door.
    cabinet(g, 99, 274, 59, 42);
    g.fillStyle(0x304851).fillRoundedRect(116, 215, 25, 28, 4);
    g.fillStyle(0xa0bdaf).fillRoundedRect(121, 220, 15, 8, 2);
    g.fillStyle(0xeed8ab).fillRoundedRect(124, 232, 10, 9, 2);
    poly(g, [251, 83, 307, 55, 307, 164, 251, 192], 0x737e79);
    poly(g, [257, 86, 301, 64, 301, 159, 257, 180], 0x8f9b8c);
    g.lineStyle(3, 0xe1c28f).lineBetween(292, 140, 292, 153);
    // Ceiling rail and amber pendant lights.
    g.lineStyle(4, 0x394953).lineBetween(238, 100, 478, 216);
    for (const [x, y] of [
      [270, 115],
      [409, 182],
    ]) {
      g.lineStyle(2, 0x536266).lineBetween(x!, y!, x!, y! + 23);
      g.fillStyle(0xe7b56b).fillEllipse(x!, y! + 25, 29, 10);
      g.fillStyle(0xf6d69b).fillEllipse(x!, y! + 29, 22, 5);
    }
    poly(g, [209, 331, 300, 288, 459, 364, 367, 410], 0x4c7074, 0.8);
    scene.add
      .text(362, 461, '02', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f4d8aa',
        fontStyle: 'bold',
      })
      .setDepth(5);
  } else {
    // Entirely new floor: a glass facade, open pods, meeting booth and entrance strip.
    poly(g, [33, 276, 398, 481, 693, 297, 693, 318, 398, 502, 33, 297], 0x526471);
    poly(g, [33, 276, 330, 122, 693, 297, 398, 481], 0xb3bcc0);
    for (let i = 1; i < 9; i++) {
      g.lineStyle(1, 0x7f939d, 0.36).lineBetween(
        33 + i * 33,
        276 - i * 17.1,
        398 + i * 32.8,
        481 - i * 20.4,
      );
      g.lineBetween(330 + i * 40.3, 122 + i * 19.4, 33 + i * 40.5, 276 + i * 22.8);
    }
    poly(g, [33, 276, 33, 143, 330, -11, 330, 122], 0x344e65);
    poly(g, [330, -11, 693, 164, 693, 297, 330, 122], 0x7997ae);
    window(g, [49, 155], 266, 102, -0.516, true);
    window(g, [346, 16], 326, 111, 0.482, true);
    g.lineStyle(7, 0x2c4357).lineBetween(33, 143, 330, -11).lineBetween(330, -11, 693, 164);
    g.lineStyle(6, 0x405972).lineBetween(330, -11, 330, 122);
    // Meeting booth at the far left: upholstered bench and an oval table.
    poly(g, [65, 258, 166, 207, 224, 235, 123, 290], 0x385b69);
    g.lineStyle(13, 0x5f8c8c).lineBetween(77, 246, 160, 206);
    g.lineStyle(13, 0x5f8c8c).lineBetween(77, 246, 113, 265);
    g.fillStyle(0xd5c4a3).fillEllipse(146, 256, 62, 25);
    g.lineStyle(4, 0x5a6c70).lineBetween(146, 267, 146, 289);
    // Built-in storage and server rack make this a company rather than another garage.
    cabinet(g, 581, 265, 59, 39);
    g.fillStyle(0x253e52).fillRoundedRect(593, 218, 33, 42, 4);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x425e72).fillRoundedRect(597, 223 + i * 8, 25, 5, 1);
      g.fillStyle(0x97d5b4).fillCircle(619, 225 + i * 8, 1.4);
    }
    // A broad teal carpet defines the developer pods.
    poly(g, [226, 248, 334, 191, 592, 316, 405, 433, 157, 295], 0x507e8e, 0.78);
    g.lineStyle(2, 0x89abb0, 0.7).lineBetween(241, 251, 335, 202).lineBetween(335, 202, 579, 320);
    // Entrance branding and long overhead luminaires.
    poly(g, [338, 447, 370, 428, 423, 456, 398, 473], 0x304557);
    scene.add
      .text(373, 451, '03', {
        fontFamily: 'monospace',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#e7c38b',
      })
      .setDepth(5);
    for (const [x, y] of [
      [279, 91],
      [436, 167],
    ]) {
      g.lineStyle(2, 0x344d62).lineBetween(x!, y! - 22, x!, y!);
      poly(g, [x! - 40, y! - 20, x! + 65, y! + 31, x! + 69, y! + 27, x! - 36, y! - 24], 0x354f64);
      g.lineStyle(3, 0xf4e3b3).lineBetween(x! - 36, y! - 18, x! + 62, y! + 29);
    }
  }
}
