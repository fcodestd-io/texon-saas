"use client";

import { useState, useMemo } from "react";
import {
  getWeeklyPayrollDataAction,
  recordEmployeePayrollAction,
} from "./action";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Printer,
  Filter,
  Loader2,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Calendar,
  Briefcase,
} from "lucide-react";

interface PayrollPageClientProps {
  initialStartDate: string;
  initialPayrollData: any[];
  vendorBrandName: string;
}

export function PayrollPageClient({
  initialStartDate,
  initialPayrollData,
  vendorBrandName,
}: PayrollPageClientProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [payrollData, setPayrollData] = useState<any[]>(initialPayrollData);
  const [brandName, setBrandName] = useState(vendorBrandName);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [confirmEmp, setConfirmEmp] = useState<any | null>(null);
  const [viewDetailEmp, setViewDetailEmp] = useState<any | null>(null); // State Modal Detail Kerja
  const [printableEmp, setPrintableEmp] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const datesHeader = useMemo(() => {
    const start = new Date(startDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push({
        dayName: [
          "SENIN",
          "SELASA",
          "RABU",
          "KAMIS",
          "JUMAT",
          "SABTU",
          "MINGGU",
        ][i],
        dateStr: d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
    }
    return dates;
  }, [startDate]);

  const endDateStr = useMemo(() => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + 6);
    return start.toISOString().split("T")[0];
  }, [startDate]);

  const handleWeekChange = (deltaDays: number) => {
    const current = new Date(startDate);
    current.setDate(current.getDate() + deltaDays);
    const newStartDate = current.toISOString().split("T")[0];

    setStartDate(newStartDate);
    setIsLoading(true);
    getWeeklyPayrollDataAction(newStartDate).then((res) => {
      setPayrollData(res?.payrollData || []);
      if (res?.brandName) setBrandName(res.brandName);
      setIsLoading(false);
    });
  };

  const filteredData = useMemo(() => {
    return payrollData
      .filter((emp) => {
        const matchesSearch = emp.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesType = selectedType === "ALL" || emp.type === selectedType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
      });
  }, [payrollData, searchQuery, selectedType]);

  // Buka Modal Konfirmasi Cetak & Bayar
  const handleOpenConfirmModal = (emp: any) => {
    setConfirmEmp(emp);
  };

  // Eksekusi Insert Record ke DB & Trigger Print Slip
  const handleConfirmAndPrint = async () => {
    if (!confirmEmp) return;
    setIsSubmitting(true);

    const res = await recordEmployeePayrollAction(
      confirmEmp.id,
      startDate,
      endDateStr,
      confirmEmp.totalWeeklySalary,
    );

    if (res.success) {
      setPayrollData((prev) =>
        prev.map((e) => (e.id === confirmEmp.id ? { ...e, isPaid: true } : e)),
      );

      const targetEmp = { ...confirmEmp, isPaid: true };
      setPrintableEmp(targetEmp);
      setConfirmEmp(null);
      setIsSubmitting(false);

      setTimeout(() => {
        window.print();
      }, 200);
    } else {
      alert("Gagal memproses payroll: " + res.message);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #print-slip-area,
          #print-slip-area * {
            visibility: visible !important;
          }
          #print-slip-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="space-y-6 text-xs font-mono max-w-6xl mx-auto p-4">
        {/* TAMPILAN SCREEN UTAMA */}
        <div className="print:hidden space-y-4">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[9px] tracking-widest text-amber-500 uppercase font-bold block">
                REKAP BORONGAN & PAYROLL
              </span>
              <h1 className="text-sm font-bold text-neutral-100 uppercase">
                GAJI MINGGUAN KARYAWAN
              </h1>
            </div>

            <div className="flex items-center gap-3 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800">
              <button
                onClick={() => handleWeekChange(-7)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-300 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center px-2">
                <span className="text-[10px] text-neutral-500 block">
                  PERIODE KERJA:
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {datesHeader[0].dateStr} – {datesHeader[6].dateStr}
                </span>
              </div>

              <button
                onClick={() => handleWeekChange(7)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-300 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter & Live Search */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Cari Nama Karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded pl-9 pr-3 py-1.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-neutral-100 p-1.5 rounded focus:outline-none cursor-pointer"
              >
                <option value="ALL">SEMUA DIVISI/JENIS</option>
                <option value="cutting">POTONG (CUTTING)</option>
                <option value="sewing">JAHIT (SEWING)</option>
                <option value="overdeck">OVERDECK</option>
                <option value="finishing">FINISHING</option>
              </select>
            </div>
          </div>

          {/* List Karyawan */}
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Kalkulasi Rekap Gaji...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.map((emp) => (
                <div
                  key={emp.id}
                  className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-100 text-xs">
                          {emp.name}
                        </h3>
                        {/* MARK BADGE STATUS GAJI */}
                        {emp.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> SUDAH DIBAYAR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            <AlertCircle className="w-3 h-3" /> BELUM DIBAYAR
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold mt-0.5 block">
                        BORONGAN {emp.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                      <span className="text-[9px] text-neutral-500 block">
                        TOTAL GAJI SEMINGGU:
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        Rp {emp.totalWeeklySalary.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {/* TOMBOL LIHAT DETAIL KERJA */}
                    <button
                      onClick={() => setViewDetailEmp(emp)}
                      className="p-2 font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg flex items-center gap-1.5 uppercase tracking-wider text-[10px] transition-colors"
                      title="Lihat Rincian Pengerjaan Karyawan"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>DETAIL KERJA</span>
                    </button>

                    {/* TOMBOL CETAK SLIP */}
                    <button
                      onClick={() => handleOpenConfirmModal(emp)}
                      className={`p-2 font-bold rounded-lg flex items-center gap-1 uppercase tracking-wider text-[10px] transition-colors ${
                        emp.isPaid
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                          : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>
                        {emp.isPaid ? "CETAK ULANG" : "CETAK & BAYAR"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL DETAIL HASIL KERJA KARYAWAN (TANPA CETAK/RECORD) */}
        {viewDetailEmp && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-100 text-sm uppercase">
                      DETAIL HASIL KERJA MINGGUAN
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {viewDetailEmp.name} • BORONGAN{" "}
                      <span className="uppercase font-bold text-amber-400">
                        {viewDetailEmp.type}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewDetailEmp(null)}
                  className="p-1 text-neutral-500 hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rincian Per Hari (Grid / Scroll Area) */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {datesHeader.map((d, dayIdx) => {
                    const dayItems = viewDetailEmp.dailyDetails[dayIdx] || [];
                    const dayTotal = dayItems.reduce(
                      (sum: number, item: any) => {
                        if (item.isNested) {
                          return (
                            sum +
                            item.parts.reduce(
                              (pSum: number, p: any) => pSum + p.subtotal,
                              0,
                            )
                          );
                        }
                        return sum + item.subtotal;
                      },
                      0,
                    );

                    return (
                      <div
                        key={dayIdx}
                        className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center pb-1.5 border-b border-neutral-800/80 mb-2">
                            <span className="font-bold text-amber-400 text-[10px]">
                              {d.dayName}, {d.dateStr}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold">
                              Subtotal: Rp {dayTotal.toLocaleString("id-ID")}
                            </span>
                          </div>

                          {dayItems.length === 0 ? (
                            <span className="text-[10px] text-neutral-600 italic block py-2">
                              Tidak ada catatan pengerjaan.
                            </span>
                          ) : (
                            <div className="space-y-2">
                              {dayItems.map((item: any, idx: number) => {
                                if (item.isNested) {
                                  return (
                                    <div
                                      key={idx}
                                      className="space-y-1 bg-neutral-900/60 p-2 rounded border border-neutral-800/50"
                                    >
                                      <div className="font-bold text-neutral-200 text-[10px] underline uppercase">
                                        {item.productName}
                                      </div>
                                      <div className="space-y-1 pl-1">
                                        {item.parts.map(
                                          (pt: any, pIdx: number) => (
                                            <div
                                              key={pIdx}
                                              className="flex justify-between items-start text-[10px]"
                                            >
                                              <div>
                                                <span className="text-neutral-300 font-medium block">
                                                  • {pt.partName}
                                                </span>
                                                <span className="text-neutral-500 text-[9px]">
                                                  {pt.qty} Pcs × Rp{" "}
                                                  {pt.price.toLocaleString(
                                                    "id-ID",
                                                  )}
                                                </span>
                                              </div>
                                              <span className="font-bold text-emerald-400">
                                                Rp{" "}
                                                {pt.subtotal.toLocaleString(
                                                  "id-ID",
                                                )}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center bg-neutral-900/60 p-2 rounded border border-neutral-800/50 text-[10px]"
                                  >
                                    <div>
                                      <span className="text-neutral-200 font-bold block">
                                        {item.productName}
                                      </span>
                                      <span className="text-neutral-500 text-[9px]">
                                        {item.qty} Pcs × Rp{" "}
                                        {item.price.toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                    <span className="font-bold text-emerald-400">
                                      Rp {item.subtotal.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Total */}
              <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-neutral-500 block">
                    AKUMULASI TOTAL MINGGU INI
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    Rp {viewDetailEmp.totalWeeklySalary.toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  onClick={() => setViewDetailEmp(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg text-xs"
                >
                  TUTUP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI OWNER */}
        {confirmEmp && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-md w-full space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <h3 className="font-bold text-neutral-100 text-sm uppercase">
                  KONFIRMASI PENCAIRAN GAJI
                </h3>
                <button
                  onClick={() => setConfirmEmp(null)}
                  className="text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-neutral-300 text-xs">
                <p>
                  Apakah Anda yakin ingin menyetujui dan mencetak slip gaji
                  berikut?
                </p>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Nama Karyawan:</span>
                    <span className="font-bold text-neutral-100">
                      {confirmEmp.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Divisi/Jabatan:</span>
                    <span className="font-bold text-amber-400 uppercase">
                      BORONGAN {confirmEmp.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Periode:</span>
                    <span className="font-bold text-neutral-300">
                      {datesHeader[0].dateStr} – {datesHeader[6].dateStr}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-neutral-800">
                    <span className="text-neutral-500">Total Gaji:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      Rp {confirmEmp.totalWeeklySalary.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-500/80 italic">
                  *Pencairan gaji ini akan disimpan di database sebagai record
                  payroll resmi.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmEmp(null)}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-lg text-xs"
                >
                  BATAL
                </button>
                <button
                  onClick={handleConfirmAndPrint}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  <span>SETUJUI & CETAK SLIP</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AREA SLIP GAJI KHUSUS PRINT A4 LANDSCAPE */}
        {printableEmp && (
          <div
            id="print-slip-area"
            className="hidden print:block font-serif text-[11px] text-black bg-white p-2"
          >
            <div className="flex justify-between items-start pb-2 mb-3 border-b-2 border-black">
              <div>
                <h2 className="text-lg font-bold uppercase">{brandName}</h2>
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold uppercase">
                  SLIP GAJI {printableEmp.type.toUpperCase()}
                </h2>
                <p className="text-[9px] mt-0.5">
                  Dicetak pada:{" "}
                  {new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start mb-3 text-[10px]">
              <table className="w-1/2">
                <tbody>
                  <tr>
                    <td className="w-24 font-bold">Nama Karyawan</td>
                    <td>: {printableEmp.name}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Jabatan/Tugas</td>
                    <td>: BORONGAN {printableEmp.type.toUpperCase()}</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-1/2">
                <tbody>
                  <tr>
                    <td className="w-24 font-bold">Periode Kerja</td>
                    <td>: Minggu Ini</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Tanggal Awal</td>
                    <td>: {datesHeader[0].dateStr}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Tanggal Akhir</td>
                    <td>: {datesHeader[6].dateStr}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table className="w-full border-collapse border border-black text-center text-[9.5px] mb-4">
              <thead>
                <tr className="border-b border-black bg-gray-100">
                  {datesHeader.map((d, i) => (
                    <th
                      key={i}
                      className="border-r border-black p-1.5 w-[14.28%] uppercase"
                    >
                      <div>{d.dayName}</div>
                      <div className="font-normal text-[8.5px]">
                        {d.dateStr}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="align-top h-64">
                  {datesHeader.map((_, dayIdx) => {
                    const dayItems = printableEmp.dailyDetails[dayIdx] || [];

                    const dayTotal = dayItems.reduce(
                      (sum: number, item: any) => {
                        if (item.isNested) {
                          return (
                            sum +
                            item.parts.reduce(
                              (pSum: number, p: any) => pSum + p.subtotal,
                              0,
                            )
                          );
                        }
                        return sum + item.subtotal;
                      },
                      0,
                    );

                    return (
                      <td
                        key={dayIdx}
                        className="border-r border-black p-1 text-left relative"
                      >
                        <div className="space-y-2 pb-6">
                          {dayItems.map((item: any, idx: number) => {
                            if (item.isNested) {
                              return (
                                <div
                                  key={idx}
                                  className="pb-1 border-b border-gray-300"
                                >
                                  <div className="font-bold text-[8.5px] underline uppercase">
                                    {item.productName}
                                  </div>
                                  <div className="pl-1 space-y-1 mt-0.5">
                                    {item.parts.map((pt: any, pIdx: number) => (
                                      <div key={pIdx}>
                                        <div className="text-[8.5px] font-semibold">
                                          • {pt.partName}
                                        </div>
                                        <div className="text-[8px] text-gray-700">
                                          {pt.qty} Pcs x{" "}
                                          {pt.price.toLocaleString("id-ID")}
                                        </div>
                                        <div className="font-bold text-[8.5px]">
                                          ={" "}
                                          {pt.subtotal.toLocaleString("id-ID")}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={idx}
                                className="pb-1 border-b border-gray-300"
                              >
                                <div className="font-bold text-[8.5px]">
                                  {item.productName}
                                </div>
                                <div className="text-[8px] text-gray-700">
                                  {item.qty} Pcs x{" "}
                                  {item.price.toLocaleString("id-ID")}
                                </div>
                                <div className="font-bold text-[8.5px]">
                                  = {item.subtotal.toLocaleString("id-ID")}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {dayItems.length > 0 && (
                          <div className="absolute bottom-1 right-1 left-1 pt-1 border-t border-dashed border-black text-right font-bold text-[8.5px]">
                            Total: {dayTotal.toLocaleString("id-ID")}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>

            <div className="text-right pt-2 border-t-2 border-black">
              <span className="text-xs font-bold uppercase block">
                TOTAL GAJI DITERIMA
              </span>
              <span className="text-2xl font-bold border-b-2 border-black inline-block mt-0.5">
                Rp {printableEmp.totalWeeklySalary.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
