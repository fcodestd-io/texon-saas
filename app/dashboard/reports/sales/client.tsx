"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import CountUp from "react-countup";
import { SalesReportData } from "./action";
import { SalesChart } from "./sales-chart";
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Loader2,
  Calendar,
  ShoppingBag,
  RotateCcw,
  DollarSign,
  Filter,
  User,
} from "lucide-react";

interface SalesReportClientProps {
  initialData: SalesReportData;
  initialYear: number;
  initialMonth: number;
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function SalesReportClient({
  initialData,
  initialYear,
  initialMonth,
}: SalesReportClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  // Accordion State terpisah untuk Sales dan Return
  const [openSalesAccordion, setOpenSalesAccordion] = useState<string | null>(
    null,
  );
  const [openReturnAccordion, setOpenReturnAccordion] = useState<string | null>(
    null,
  );

  // Filter State
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("ALL");
  const [transactionType, setTransactionType] = useState<
    "ALL" | "SALES" | "RETURN"
  >("ALL");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(val);

  const handleFilterDateChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(() => {
      router.push(`/dashboard/reports/sales?year=${newYear}&month=${newMonth}`);
    });
  };

  // Grouping Log Return menjadi bentuk Accordion Header (per Reference Number)
  const groupedReturnInvoices = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        referenceNumber: string;
        marketplaceName: string;
        adminFeePercentage: number;
        createdAt: string;
        recordedBy: string;
        grossTotal: number;
        netTotal: number;
        items: typeof initialData.returnLogs;
      }
    >();

    initialData.returnLogs.forEach((log) => {
      if (!map.has(log.referenceNumber)) {
        map.set(log.referenceNumber, {
          id: log.referenceNumber,
          referenceNumber: log.referenceNumber,
          marketplaceName: log.marketplaceName,
          adminFeePercentage: log.adminFeePercentage,
          createdAt: log.createdAt,
          recordedBy: log.recordedBy,
          grossTotal: 0,
          netTotal: 0,
          items: [],
        });
      }

      const group = map.get(log.referenceNumber)!;
      group.grossTotal += log.grossSubtotal;
      group.netTotal += log.netSubtotal;
      group.items.push(log);
    });

    return Array.from(map.values());
  }, [initialData.returnLogs]);

  // Filtering Invoices Sales
  const filteredSalesInvoices = useMemo(() => {
    if (transactionType === "RETURN") return [];
    return initialData.invoices.filter((inv) => {
      if (
        selectedMarketplace !== "ALL" &&
        inv.marketplaceName !== selectedMarketplace
      ) {
        return false;
      }
      return true;
    });
  }, [initialData.invoices, selectedMarketplace, transactionType]);

  // Filtering Invoices Return
  const filteredReturnInvoices = useMemo(() => {
    if (transactionType === "SALES") return [];
    return groupedReturnInvoices.filter((ret) => {
      if (
        selectedMarketplace !== "ALL" &&
        ret.marketplaceName !== selectedMarketplace
      ) {
        return false;
      }
      return true;
    });
  }, [groupedReturnInvoices, selectedMarketplace, transactionType]);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* HEADER & DATE FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-xl font-light tracking-[0.2em] text-neutral-900 dark:text-neutral-100 uppercase">
            LAPORAN PENJUALAN & OMSET
          </h1>
          <p className="text-xs font-extralight tracking-wider text-neutral-500 uppercase mt-1">
            Breakdown Harian Penjualan, Return & Log Transaksi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <select
              value={month}
              onChange={(e) =>
                handleFilterDateChange(year, Number(e.target.value))
              }
              className="bg-transparent text-neutral-900 dark:text-neutral-100 font-light focus:outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option
                  key={idx}
                  value={idx + 1}
                  className="bg-neutral-900 text-white"
                >
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) =>
                handleFilterDateChange(Number(e.target.value), month)
              }
              className="bg-transparent text-neutral-900 dark:text-neutral-100 font-light focus:outline-none border-l border-neutral-300 dark:border-neutral-700 pl-2"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-neutral-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>
          {isPending && (
            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
          )}
        </div>
      </div>

      {/* METRIC CARDS WITH AUTO COUNT ANIMATION */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* GROSS SALES */}
        <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-extralight uppercase tracking-widest">
              GROSS SALES
            </span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-lg font-light text-neutral-900 dark:text-neutral-100">
            Rp{" "}
            <CountUp
              end={initialData.summary.grossSales}
              duration={1.2}
              separator="."
              decimal=","
            />
          </p>
        </div>

        {/* NET OMSET */}
        <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[10px] font-extralight uppercase tracking-widest">
              NET OMSET (AFTER TAX)
            </span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-lg font-light text-emerald-600 dark:text-emerald-400">
            Rp{" "}
            <CountUp
              end={initialData.summary.totalNetOmset}
              duration={1.2}
              separator="."
              decimal=","
            />
          </p>
        </div>

        {/* NET RETURN */}
        <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 space-y-1">
          <div className="flex items-center justify-between text-red-500">
            <span className="text-[10px] font-extralight uppercase tracking-widest">
              NET RETURN (AFTER TAX)
            </span>
            <RotateCcw className="w-4 h-4" />
          </div>
          <p className="text-lg font-light text-red-600 dark:text-red-400">
            Rp{" "}
            <CountUp
              end={initialData.summary.totalReturnAmount}
              duration={1.2}
              separator="."
              decimal=","
            />
          </p>
        </div>

        {/* ITEM TERJUAL */}
        <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-extralight uppercase tracking-widest">
              ITEM TERJUAL
            </span>
            <ShoppingBag className="w-4 h-4" />
          </div>
          <p className="text-lg font-light text-neutral-900 dark:text-neutral-100">
            <CountUp
              end={initialData.summary.totalItemsSold}
              duration={1.2}
              separator="."
            />{" "}
            Qty
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <SalesChart
        marketplaceShare={initialData.marketplaceShare}
        dailyChart={initialData.dailyChart}
      />

      {/* FILTER TRANSAKSI & MARKETPLACE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-light tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
            FILTER TRANSAKSI
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-neutral-500">
              MARKETPLACE:
            </span>
            <select
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">SEMUA MARKETPLACE</option>
              {initialData.marketplaceShare.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-neutral-500">
              TIPE:
            </span>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as any)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">SALES & RETURN</option>
              <option value="SALES">HANYA SALES</option>
              <option value="RETURN">HANYA RETURN</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION INVOICE OUTGOING SALES */}
      {(transactionType === "ALL" || transactionType === "SALES") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-light tracking-[0.2em] text-neutral-500 uppercase">
              DAFTAR INVOICE SALES ({filteredSalesInvoices.length})
            </h3>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
            {filteredSalesInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs font-extralight text-neutral-500">
                TIDAK ADA DATA INVOICE PENJUALAN
              </div>
            ) : (
              filteredSalesInvoices.map((inv) => {
                const isOpen = openSalesAccordion === inv.id;

                return (
                  <div key={inv.id} className="transition-colors">
                    {/* ACCORDION HEADER SALES */}
                    <div
                      onClick={() =>
                        setOpenSalesAccordion(isOpen ? null : inv.id)
                      }
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                    >
                      <div className="flex items-center gap-4">
                        <FileSpreadsheet className="w-5 h-5 text-neutral-400 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-neutral-900 dark:text-neutral-100 tracking-wider">
                              {inv.referenceNumber}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-extralight">
                              {inv.marketplaceName} (-{inv.adminFeePercentage}%)
                            </span>
                          </div>
                          <p className="text-[10px] font-extralight text-neutral-500 mt-0.5 flex items-center gap-1.5">
                            <span>
                              {new Date(inv.createdAt).toLocaleString("id-ID")}
                            </span>
                            <span>&bull;</span>
                            <span className="text-neutral-400 font-normal flex items-center gap-0.5">
                              <User className="w-3 h-3 text-amber-500" />
                              Op: {inv.recordedBy}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-extralight text-neutral-400 line-through">
                            Gross: {formatCurrency(inv.grossTotal)}
                          </p>
                          <p className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                            Net: {formatCurrency(inv.netTotal)}
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                    </div>

                    {/* ACCORDION BODY ITEM SALES */}
                    {isOpen && (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-900/20 border-t border-neutral-200 dark:border-neutral-800/80">
                        <table className="w-full text-left text-[11px] font-light">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[9px] tracking-wider">
                              <th className="pb-2">PRODUK</th>
                              <th className="pb-2">SKU</th>
                              <th className="pb-2">VARIAN</th>
                              <th className="pb-2 text-right">HARGA SATUAN</th>
                              <th className="pb-2 text-right">QTY</th>
                              <th className="pb-2 text-right">SUBTOTAL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                            {inv.items.map((item) => {
                              const netSubtotal =
                                item.subtotal *
                                (1 - inv.adminFeePercentage / 100);
                              return (
                                <tr
                                  key={item.id}
                                  className="text-neutral-700 dark:text-neutral-300"
                                >
                                  <td className="py-2.5 font-normal">
                                    {item.productName}
                                  </td>
                                  <td className="py-2.5 text-neutral-500">
                                    {item.sku}
                                  </td>
                                  <td className="py-2.5">
                                    {item.color} / {item.size}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    {formatCurrency(item.price)}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    {item.quantity}
                                  </td>
                                  <td className="py-2.5 text-right font-normal">
                                    <span className="block text-[9px] text-neutral-400 line-through">
                                      {formatCurrency(item.subtotal)}
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(netSubtotal)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {inv.notes && (
                          <p className="text-[10px] italic text-neutral-500 mt-3">
                            Catatan: {inv.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION ACCORDION LOG RETURN */}
      {(transactionType === "ALL" || transactionType === "RETURN") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-light tracking-[0.2em] text-red-500 uppercase">
              DAFTAR TRANSAKSI RETURN ({filteredReturnInvoices.length})
            </h3>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
            {filteredReturnInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs font-extralight text-neutral-500">
                TIDAK ADA DATA RETURN BARANG
              </div>
            ) : (
              filteredReturnInvoices.map((ret) => {
                const isOpen = openReturnAccordion === ret.id;

                return (
                  <div key={ret.id} className="transition-colors">
                    {/* ACCORDION HEADER RETURN */}
                    <div
                      onClick={() =>
                        setOpenReturnAccordion(isOpen ? null : ret.id)
                      }
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                    >
                      <div className="flex items-center gap-4">
                        <FileSpreadsheet className="w-5 h-5 text-red-400 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-neutral-900 dark:text-neutral-100 tracking-wider">
                              {ret.referenceNumber}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-extralight">
                              {ret.marketplaceName} (-{ret.adminFeePercentage}%)
                            </span>
                          </div>
                          <p className="text-[10px] font-extralight text-neutral-500 mt-0.5 flex items-center gap-1.5">
                            <span>
                              {new Date(ret.createdAt).toLocaleString("id-ID")}
                            </span>
                            <span>&bull;</span>
                            <span className="text-neutral-400 font-normal flex items-center gap-0.5">
                              <User className="w-3 h-3 text-red-400" />
                              Op: {ret.recordedBy}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-extralight text-neutral-400 line-through">
                            Gross: {formatCurrency(ret.grossTotal)}
                          </p>
                          <p className="text-xs font-normal text-red-600 dark:text-red-400">
                            Net: {formatCurrency(ret.netTotal)}
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                    </div>

                    {/* ACCORDION BODY ITEM RETURN */}
                    {isOpen && (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-900/20 border-t border-neutral-200 dark:border-neutral-800/80">
                        <table className="w-full text-left text-[11px] font-light">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[9px] tracking-wider">
                              <th className="pb-2">PRODUK</th>
                              <th className="pb-2">SKU</th>
                              <th className="pb-2">VARIAN & TIPE</th>
                              <th className="pb-2 text-right">HARGA SATUAN</th>
                              <th className="pb-2 text-right">QTY</th>
                              <th className="pb-2 text-right">SUBTOTAL</th>
                              <th className="pb-2 pl-4">ALASAN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                            {ret.items.map((item) => (
                              <tr
                                key={item.id}
                                className="text-neutral-700 dark:text-neutral-300"
                              >
                                <td className="py-2.5 font-normal">
                                  {item.productName}
                                </td>
                                <td className="py-2.5 text-neutral-500">
                                  {item.sku}
                                </td>
                                <td className="py-2.5">
                                  {item.color} / {item.size}
                                  <span
                                    className={`ml-2 px-1.5 py-0.5 text-[9px] uppercase ${item.returnType === "DEFECTIVE" ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"}`}
                                  >
                                    {item.returnType}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  {formatCurrency(item.price)}
                                </td>
                                <td className="py-2.5 text-right">
                                  {item.quantity}
                                </td>
                                <td className="py-2.5 text-right font-normal">
                                  <span className="block text-[9px] text-neutral-400 line-through">
                                    {formatCurrency(item.grossSubtotal)}
                                  </span>
                                  <span className="text-red-600 dark:text-red-400">
                                    {formatCurrency(item.netSubtotal)}
                                  </span>
                                </td>
                                <td className="py-2.5 pl-4 text-neutral-500 italic">
                                  {item.reason || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
