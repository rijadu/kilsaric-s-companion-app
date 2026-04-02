const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const COMMANDS = {
  init: [ESC, 0x40],
  alignCenter: [ESC, 0x61, 0x01],
  alignLeft: [ESC, 0x61, 0x00],
  boldOn: [ESC, 0x45, 0x01],
  boldOff: [ESC, 0x45, 0x00],
  doubleSize: [ESC, 0x21, 0x30],
  doubleHeight: [ESC, 0x21, 0x10],
  normalSize: [ESC, 0x21, 0x00],
  cutPaper: [GS, 0x56, 0x01],
  feed: (rows: number) => [ESC, 0x64, rows],
};

const CHARACTER_MAP: Record<string, number> = {
  č: 0x9f,
  ć: 0x86,
  đ: 0xd0,
  š: 0xe7,
  ž: 0xbe,
  Č: 0xac,
  Ć: 0x8f,
  Đ: 0xd1,
  Š: 0xe6,
  Ž: 0xa6,
};

const unitLabels: Record<string, string> = {
  piece: 'kom',
  kg: 'kg',
  meter: 'm',
  liter: 'L',
  box: 'kutija',
};

export interface PrinterConfig {
  baudRate: number;
  paperWidth: 58 | 80;
}

export interface ReceiptData {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  receiptNumber: string;
  date: Date;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  total: number;
  paymentMethod: 'cash' | 'card';
}

export function isSerialSupported(): boolean {
  return 'serial' in navigator;
}

function encode(text: string): number[] {
  const bytes: number[] = [];
  for (const character of text) {
    if (CHARACTER_MAP[character] !== undefined) {
      bytes.push(CHARACTER_MAP[character]);
      continue;
    }

    const code = character.charCodeAt(0);
    bytes.push(code < 256 ? code : 0x3f);
  }

  return bytes;
}

function columns(left: string, right: string, width: number): string {
  const spacing = Math.max(1, width - left.length - right.length);
  return `${left}${' '.repeat(spacing)}${right}`;
}

export async function printReceiptSerial(
  data: ReceiptData,
  config: Partial<PrinterConfig> = {},
): Promise<void> {
  const serialApi = (navigator as Navigator & {
    serial?: {
      requestPort: () => Promise<{
        open: (options: { baudRate: number }) => Promise<void>;
        close: () => Promise<void>;
        writable: {
          getWriter: () => {
            write: (chunk: Uint8Array) => Promise<void>;
            releaseLock: () => void;
          };
        };
      }>;
    };
  }).serial;
  const { baudRate = 9600, paperWidth = 58 } = config;
  const width = paperWidth === 58 ? 32 : 48;

  if (!serialApi) {
    throw new Error('Web Serial API nije podrzan');
  }

  const port = await serialApi.requestPort();
  await port.open({ baudRate });

  const writer = port.writable.getWriter();
  const send = async (bytes: number[]) => writer.write(new Uint8Array(bytes));
  const writeLine = async (text: string) => send([...encode(text), LF]);
  const writeCentered = async (text: string) => {
    await send(COMMANDS.alignCenter);
    await writeLine(text);
    await send(COMMANDS.alignLeft);
  };

  try {
    await send(COMMANDS.init);
    await send(COMMANDS.doubleSize);
    await writeCentered(data.shopName);
    await send(COMMANDS.normalSize);
    await writeCentered(data.shopAddress);
    await writeCentered(`Tel: ${data.shopPhone}`);
    await writeLine('-'.repeat(width));

    const date = data.date.toLocaleDateString('sr-RS');
    const time = data.date.toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
    await writeLine(columns(`R: ${data.receiptNumber}`, `${date} ${time}`, width));
    await writeLine('-'.repeat(width));

    for (const item of data.items) {
      await writeLine(item.name);
      const qty = `${item.quantity}${unitLabels[item.unit] ?? item.unit} x ${item.price.toLocaleString('sr-RS')}`;
      await writeLine(columns(`  ${qty}`, `${item.total.toLocaleString('sr-RS')}`, width));
    }

    await writeLine('-'.repeat(width));
    await send(COMMANDS.boldOn);
    await send(COMMANDS.doubleHeight);
    await writeLine(columns('UKUPNO:', `${data.total.toLocaleString('sr-RS')} RSD`, width));
    await send(COMMANDS.normalSize);
    await send(COMMANDS.boldOff);

    await writeLine('-'.repeat(width));
    await writeLine(
      columns(
        'Plaćanje:',
        data.paymentMethod === 'cash' ? 'Gotovina' : 'Kartica',
        width,
      ),
    );
    await writeLine('-'.repeat(width));
    await writeCentered('Hvala na kupovini!');
    await send(COMMANDS.feed(3));
    await send(COMMANDS.cutPaper);
  } finally {
    writer.releaseLock();
    await port.close();
  }
}
