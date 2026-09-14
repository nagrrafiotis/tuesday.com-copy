import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const fmt = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

export default function OfferViewDialog({ offer, open, onClose }) {
  if (!offer) return null;
  const total = offer.items?.reduce((s, it) => s + (Number(it.total) || 0), 0) || offer.total_amount || 0;
  const transferred = offer.status === "transferred";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1e3a5f]">{offer.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
          <Badge className={transferred ? "bg-emerald-100 text-emerald-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
            {transferred ? "Μεταφέρθηκε στο Budget" : "Πρόχειρο"}
          </Badge>
          {offer.vendor && <span className="text-gray-600">{offer.vendor}</span>}
          {offer.offer_type && <span className="text-gray-500">· {offer.offer_type}</span>}
          {offer.date && <span className="text-gray-400">{format(new Date(offer.date), "dd/MM/yyyy")}</span>}
          {offer.file_url && <a href={offer.file_url} target="_blank" rel="noreferrer" className="text-[#1e3a5f] underline">Προβολή αρχείου</a>}
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">Περιγραφή</th>
                <th className="text-right p-2 w-20">Ποσ.</th>
                <th className="text-left p-2 w-20">Μον.</th>
                <th className="text-right p-2 w-28">Τιμή/Μον.</th>
                <th className="text-right p-2 w-28">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              {(offer.items || []).map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-gray-700">{it.description || "—"}</td>
                  <td className="p-2 text-right text-gray-600">{it.quantity ?? ""}</td>
                  <td className="p-2 text-gray-500">{it.unit || ""}</td>
                  <td className="p-2 text-right text-gray-600">{fmt(it.unit_cost)}</td>
                  <td className="p-2 text-right font-medium text-[#1e3a5f]">{fmt(it.total)}</td>
                </tr>
              ))}
              {!offer.items?.length && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">Δεν υπάρχουν στοιχεία</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2">
                <td colSpan={4} className="p-2 text-right font-semibold text-gray-700">Σύνολο</td>
                <td className="p-2 text-right font-bold text-[#1e3a5f]">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {offer.notes && <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{offer.notes}</p>}
      </DialogContent>
    </Dialog>
  );
}