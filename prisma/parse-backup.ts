import * as fs from 'fs';

/**
 * Parse a pg_dump COPY section for a given table.
 * Returns an array of objects with column names as keys.
 */
export function parseCopySection(
  sqlContent: string,
  tableName: string,
  columns: string[],
): Record<string, string | null>[] {
  const copyRegex = new RegExp(
    `COPY public\\.${tableName}\\s*\\([^)]+\\)\\s*FROM stdin;\\n([\\s\\S]*?)\\n\\\\\\.`,
    'm',
  );
  const match = sqlContent.match(copyRegex);
  if (!match) {
    console.warn(`No COPY section found for table: ${tableName}`);
    return [];
  }

  const dataBlock = match[1];
  const rows: Record<string, string | null>[] = [];

  for (const line of dataBlock.split('\n')) {
    if (!line || line === '\\.') continue;
    const values = line.split('\t');
    const row: Record<string, string | null> = {};
    columns.forEach((col, i) => {
      row[col] = values[i] === '\\N' ? null : values[i];
    });
    rows.push(row);
  }

  return rows;
}

export function readBackupFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
