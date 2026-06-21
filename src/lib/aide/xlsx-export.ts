import * as XLSX from "xlsx";

/**
 * Exporte un tableau d'objets (ou plusieurs feuilles) dans un fichier .xlsx
 * compatible Microsoft Excel / LibreOffice.
 */
export function downloadXlsx(
  filename: string,
  data: Record<string, unknown>[] | Record<string, Record<string, unknown>[]>,
) {
  const wb = XLSX.utils.book_new();
  const sheets = Array.isArray(data) ? { Données: data } : data;
  Object.entries(sheets).forEach(([name, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    // Auto-fit basique des colonnes
    if (rows.length) {
      const headers = Object.keys(rows[0]);
      ws["!cols"] = headers.map((h) => {
        const maxLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[h] ?? "").length),
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
      });
    }
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  const fname = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, fname);
}
