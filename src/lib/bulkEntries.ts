import { BulkDefaultLocationEntryItem, PinType } from '@/types';

const VALID_TYPES: PinType[] = ['crime', 'infraestrutura'];

function normalizeType(raw: string): PinType | null {
  const value = raw.trim().toLowerCase();
  if (value === 'crime' || value === 'crimes') return 'crime';
  if (value === 'infraestrutura' || value === 'infra' || value === 'infraestrutura urbana') return 'infraestrutura';
  return VALID_TYPES.includes(value as PinType) ? (value as PinType) : null;
}

function parseQuantity(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function isHeaderRow(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase();
  return joined.includes('description') || joined.includes('descri') || joined.includes('quantidade') || joined.includes('quantity') || joined.includes('tipo') || joined.includes('type');
}

export function parseBulkEntriesCsv(text: string): { entries: BulkDefaultLocationEntryItem[]; errors: string[] } {
  const errors: string[] = [];
  const entries: BulkDefaultLocationEntryItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const delimiter = line.includes(';') ? ';' : ',';
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));

    if (cells.length < 2) {
      errors.push(`Linha ${lineNum}: formato inválido (esperado tipo, descrição, quantidade).`);
      return;
    }

    if (index === 0 && isHeaderRow(cells)) return;

    let type: PinType;
    let description: string;
    let quantityRaw: string;

    if (cells.length >= 3) {
      const parsedType = normalizeType(cells[0]);
      if (!parsedType) {
        errors.push(`Linha ${lineNum}: tipo inválido "${cells[0]}".`);
        return;
      }
      type = parsedType;
      description = cells[1];
      quantityRaw = cells[2];
    } else {
      type = 'crime';
      description = cells[0];
      quantityRaw = cells[1];
    }

    if (!description) {
      errors.push(`Linha ${lineNum}: descrição obrigatória.`);
      return;
    }

    const quantity = parseQuantity(quantityRaw);
    if (quantity === null) {
      errors.push(`Linha ${lineNum}: quantidade inválida (mínimo 1).`);
      return;
    }

    entries.push({ type, description, quantity });
  });

  return { entries, errors };
}

export function createEmptyBulkRow(): BulkDefaultLocationEntryItem {
  return { type: 'crime', description: '', quantity: 1 };
}
