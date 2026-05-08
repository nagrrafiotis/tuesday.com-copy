import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Briefcase, FileText, User, Package, Wrench, Handshake, CircleDot, Pencil, MapPin, CreditCard, Globe, Hash } from "lucide-react";

const categoryIcons = {
  client: User,
  supplier: Package,
  contractor: Wrench,
  partner: Handshake,
  other: CircleDot,
};

const categoryColors = {
  client: "bg-blue-100 text-blue-700",
  supplier: "bg-purple-100 text-purple-700",
  contractor: "bg-amber-100 text-amber-700",
  partner: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-700",
};

export default function ContactCard({ contact, open, onClose, onEdit }) {
  if (!contact) return null;

  const CategoryIcon = categoryIcons[contact.category] || CircleDot;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
                <User className="w-6 h-6 text-[#1e3a5f]" />
              </div>
              <div>
                <div className="text-xl font-semibold">{contact.name}</div>
                <Badge className={`${categoryColors[contact.category]} border-0 gap-1.5 mt-1`}>
                  <CategoryIcon className="w-3 h-3" />
                  {contact.category}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onEdit?.(contact);
                onClose();
              }}
              className="shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {contact.company && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Company</div>
                <div className="font-medium text-gray-900">{contact.company}</div>
              </div>
            </div>
          )}

          {contact.position && (
            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Position</div>
                <div className="font-medium text-gray-900">{contact.position}</div>
              </div>
            </div>
          )}

          {(contact.emails || []).filter(e => e).length > 0 && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Email</div>
                {(contact.emails || []).filter(e => e).map((email, idx) => (
                  <a
                    key={idx}
                    href={`mailto:${email}`}
                    className="block font-medium text-[#1e3a5f] hover:underline"
                  >
                    {email}
                  </a>
                ))}
              </div>
            </div>
          )}

          {(contact.phones || []).filter(p => p).length > 0 && (
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Phone</div>
                {(contact.phones || []).filter(p => p).map((phone, idx) => (
                  <a
                    key={idx}
                    href={`tel:${phone}`}
                    className="block font-medium text-[#1e3a5f] hover:underline"
                  >
                    {phone}
                  </a>
                ))}
              </div>
            </div>
          )}

          {(contact.afm || contact.eponymia || contact.doy) && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Φορολογικά Στοιχεία</p>
              {contact.eponymia && <div className="flex justify-between text-sm"><span className="text-gray-500">Επωνυμία</span><span className="font-medium">{contact.eponymia}</span></div>}
              {contact.afm && <div className="flex justify-between text-sm"><span className="text-gray-500">ΑΦΜ</span><span className="font-medium font-mono">{contact.afm}</span></div>}
              {contact.doy && <div className="flex justify-between text-sm"><span className="text-gray-500">ΔΟΥ</span><span className="font-medium">{contact.doy}</span></div>}
            </div>
          )}

          {(contact.address || contact.city) && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Διεύθυνση</div>
                <div className="font-medium text-gray-900">
                  {[contact.address, contact.city, contact.postal_code].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
          )}

          {contact.iban && (
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">IBAN</div>
                <div className="font-medium text-gray-900 font-mono text-sm">{contact.iban}</div>
              </div>
            </div>
          )}

          {contact.website && (
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Website</div>
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="font-medium text-[#1e3a5f] hover:underline">{contact.website}</a>
              </div>
            </div>
          )}

          {contact.notes && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Notes</div>
                <div className="text-gray-700 whitespace-pre-wrap">{contact.notes}</div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}