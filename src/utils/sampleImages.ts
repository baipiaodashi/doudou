// Generate pixel art samples using Canvas to avoid external network dependencies
export function generateSampleHeart(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Red pixel heart with shadow
  const heart = [
    "0000000000000000",
    "0001100000110000",
    "0012210001221000",
    "0122221012222100",
    "0122322122322100",
    "0123322223322100",
    "0122222222222100",
    "0012222222221000",
    "0001222222210000",
    "0000122222100000",
    "0000012221000000",
    "0000001210000000",
    "0000000100000000",
    "0000000000000000",
    "0000000000000000",
    "0000000000000000"
  ];

  const colors: Record<string, string> = {
    '1': '#7F1D1D', // dark outline
    '2': '#EF4444', // red
    '3': '#FCA5A5'  // highlight
  };

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const char = heart[y][x];
      if (colors[char]) {
        ctx.fillStyle = colors[char];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas.toDataURL();
}

export function generateSampleMushroom(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const mushroom = [
    "0000011111100000",
    "0001122222211000",
    "0012222222222100",
    "0122333223332210",
    "1223333323333321",
    "1223333323333321",
    "1223333323333321",
    "1222333222333221",
    "1222222222222221",
    "0122222222222210",
    "0011144444411100",
    "0014444444444100",
    "0014455445544100",
    "0014455445544100",
    "0014444444444100",
    "0001111111111000"
  ];

  const colors: Record<string, string> = {
    '1': '#000000',
    '2': '#E52521', // mushroom red
    '3': '#FFFFFF', // spots
    '4': '#FDE0B4', // stem skin
    '5': '#000000'  // eyes
  };

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const char = mushroom[y][x];
      if (colors[char]) {
        ctx.fillStyle = colors[char];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas.toDataURL();
}

export function generateSamplePikachu(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const pika = [
    "11000000000000000011",
    "11100000000000000111",
    "12100000000000001211",
    "01210000000000012100",
    "01221000000000122100",
    "00122111111111221000",
    "00122222222222221000",
    "01222222222222222100",
    "01221122222211222100",
    "12211312222113122210",
    "12213312222133122210",
    "12221122112211222210",
    "12442221111222442210",
    "14444222112224444210",
    "12442222222222442210",
    "01222221111222222100",
    "01222221221222222100",
    "00122222112222221000",
    "00011222222222110000",
    "00000111111111000000"
  ];

  const colors: Record<string, string> = {
    '1': '#111111',
    '2': '#FFDE00', // Pikachu yellow
    '3': '#FFFFFF', // eye highlight
    '4': '#FF1800'  // red cheek
  };

  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const char = pika[y][x];
      if (colors[char]) {
        ctx.fillStyle = colors[char];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas.toDataURL();
}
