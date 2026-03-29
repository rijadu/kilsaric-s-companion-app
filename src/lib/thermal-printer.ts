/**
 * ESC/POS Thermal Printer via Web Serial API
 * Supports 58mm and 80mm thermal printers
 */

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_SIZE: [ESC, 0x21, 0x30],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  CUT_PAPER: [GS, 0x56, 0x01],
  FEED: (n: number) => [ESC, 0x64, n],
};

const CHAR_MAP: Record<string, number> = {
  'č': 0x9F, 'ć': 0x86, 'đ': 0xD0, 'š': 0xE7, 'ž': 0xBE,
  'Č': 0xAC, 'Ć': 0x8F, 'Đ': 0xD1, 'Š': 0xE6, 'Ž': 0xA6,
};

export interface PrinterConfig {
  baudRate: number;
  paperWidth: 58 | 80;
}

export function isSerialSupported(): boolean {
  return 'serial' in (navigator as any);
}

function encode(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    if (CHAR_MAP[ch] !== undefined) bytes.push(CHAR_MAP[ch]);
    else {
      const c = ch.charCodeAt(0);
      bytes.push(c < 256 ? c : 0x3F);
    }
  }
  return bytes;
}

function cols(left: string, right: string, width: number): string {
  const sp = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(sp) + right;
}

const unitLabels: Record<string, string> = {
  piece: 'kom', kg: 'kg', meter: 'm', liter: 'L', box: 'kutija',
};

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

export async function printReceiptSerial(
  data: ReceiptData,
  config: Partial<PrinterConfig> = {}
): Promise<void> {
  const { baudRate = 9600, paperWidth = 58 } = config;
  const w = paperWidth === 58 ? 32 : 48;

  if (!isSerialSupported()) {
    throw new Error('Web Serial API nije podržan');
  }

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate });

  const writer = port.writable.getWriter();
  const send = async (bytes: number[]) => writer.write(new Uint8Array(bytes));
  const line = async (text: string) => send([...encode(text), LF]);
  const center = async (text: string) => {
    await send(CMD.ALIGN_CENTER);
    await line(text);
    await send(CMD.ALIGN_LEFT);
  };

  try {
    await send(CMD.INIT);

    // Header
    await send(CMD.DOUBLE_SIZE);
    await center(data.shopName);
    await send(CMD.NORMAL_SIZE);
    await center(data.shopAddress);
    await center(`Tel: ${data.shopPhone}`);
    await line('-'.repeat(w));

    // Receipt info
    const d = data.date.toLocaleDateString('sr-RS');
    const t = data.date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    await line(cols(`R: ${data.receiptNumber}`, `${d} ${t}`, w));
    await line('-'.repeat(w));

    // Items
    for (const item of data.items) {
      await line(item.name);
      const qty = `${item.quantity}${unitLabels[item.unit] || item.unit} x ${item.price.toLocaleString('sr-RS')}`;
      await line(cols(`  ${qty}`, `${item.total.toLocaleString('sr-RS')}`, w));
    }

    await line('-'.repeat(w));

    // Total
    await send(CMD.BOLD_ON);
    await send(CMD.DOUBLE_HEIGHT);
    await line(cols('UKUPNO:', `${data.total.toLocaleString('sr-RS')} RSD`, w));
    await send(CMD.NORMAL_SIZE);
    await send(CMD.BOLD_OFF);

    await line('-'.repeat(w));
    await line(cols('Placanje:', data.paymentMethod === 'cash' ? 'Gotovina' : 'Kartica', w));
    await line('-'.repeat(w));
    await center('Hvala na kupovini!');
    await send(CMD.FEED(3));
    await send(CMD.CUT_PAPER);
  } finally {
    writer.releaseLock();
    await port.close();
  }
}