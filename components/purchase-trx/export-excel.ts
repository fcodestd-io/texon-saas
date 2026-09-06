import * as XLSX from "xlsx";

export function downloadRawPurchaseExcel(
  data: any[],
  startDate: string,
  endDate: string,
) {
  if (!data || data.length === 0) return false;

  // Raw Rows dengan tipe data angka & tanggal murni
  const rawRows = data.map((row) => [
    row.poNumber,
    new Date(row.createdAt),
    row.deliveredAt ? new Date(row.deliveredAt) : "-",
    row.category.toUpperCase(),
    row.status.toUpperCase(),
    row.itemNameSnapshot,
    parseFloat(row.estimatedQty || "0"),
    parseFloat(row.actualQty || "0"),
    row.unitName,
    parseFloat(row.unitPrice || "0"),
    parseFloat(row.estimatedSubtotal || "0"),
    parseFloat(row.actualSubtotal || "0"),
    row.userName || "Mandor",
    row.notes || "",
  ]);

  const headers = [
    "NO_PO",
    "TANGGAL_PO",
    "TANGGAL_DELIVERED",
    "KATEGORI",
    "STATUS",
    "NAMA_ITEM_WARNA",
    "QTY_ESTIMASI",
    "QTY_AKTUAL",
    "SATUAN",
    "HARGA_SATUAN",
    "SUBTOTAL_ESTIMASI",
    "SUBTOTAL_AKTUAL",
    "OPERATOR",
    "CATATAN",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rawRows]);

  // Lebar kolom otomatis agar rapi
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 35 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "RAW_DATA_PO");

  XLSX.writeFile(workbook, `RAW_PO_${startDate}_SD_${endDate}.xlsx`);
  return true;
}
