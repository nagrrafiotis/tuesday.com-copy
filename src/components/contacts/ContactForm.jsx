import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const defaultForm = {
  name: "", afm: "", eponymia: "", doy: "",
  address: "", city: "", postal_code: "",
  emails: [""], phones: [""],
  iban: "", website: "",
  company: "", position: "",
  category: "other", notes: "",
};

function ContactForm({ contact, open, onClose, onSubmit }) {
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        ...defaultForm,
        ...contact,
        emails: contact.emails?.length > 0 ? contact.emails : [""],
        phones: contact.phones?.length > 0 ? contact.phones : [""],
      });
    } else {
      setFormData(defaultForm);
    }
  }, [contact, open]);

  const set = (field, value) => setFormData(f => ({ ...f, [field]: value }));

  const addEmail = () => set("emails", [...formData.emails, ""]);
  const removeEmail = (i) => set("emails", formData.emails.filter((_, idx) => idx !== i));
  const updateEmail = (i, v) => { const arr = [...formData.emails]; arr[i] = v; set("emails", arr); };

  const addPhone = () => set("phones", [...formData.phones, ""]);
  const removePhone = (i) => set("phones", formData.phones.filter((_, idx) => idx !== i));
  const updatePhone = (i, v) => { const arr = [...formData.phones]; arr[i] = v; set("phones", arr); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...formData,
      emails: formData.emails.filter(e => e.trim()),
      phones: formData.phones.filter(p => p.trim()),
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">
            {contact ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Όνομα *</Label>
              <Input value={formData.name} onChange={e => set("name", e.target.value)} placeholder="Ονοματεπώνυμο / Επωνυμία" className="mt-1.5" required />
            </div>
            <div>
              <Label>ΑΦΜ</Label>
              <Input value={formData.afm || ""} onChange={e => set("afm", e.target.value)} placeholder="π.χ. 123456789" className="mt-1.5" />
            </div>
            <div>
              <Label>Επωνυμία</Label>
              <Input value={formData.eponymia || ""} onChange={e => set("eponymia", e.target.value)} placeholder="Επωνυμία εταιρείας" className="mt-1.5" />
            </div>
            <div>
              <Label>ΔΟΥ</Label>
              <Input value={formData.doy || ""} onChange={e => set("doy", e.target.value)} placeholder="π.χ. ΔΟΥ Αθηνών" className="mt-1.5" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Διεύθυνση</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Οδός / Αριθμός</Label>
                <Input value={formData.address || ""} onChange={e => set("address", e.target.value)} placeholder="π.χ. Λεωφόρος Αθηνών 10" className="mt-1.5" />
              </div>
              <div>
                <Label>Πόλη</Label>
                <Input value={formData.city || ""} onChange={e => set("city", e.target.value)} placeholder="π.χ. Αθήνα" className="mt-1.5" />
              </div>
              <div>
                <Label>ΤΚ</Label>
                <Input value={formData.postal_code || ""} onChange={e => set("postal_code", e.target.value)} placeholder="π.χ. 10431" className="mt-1.5" />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Επικοινωνία</p>
            <div className="space-y-3">
              {/* Emails */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Emails</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addEmail}><Plus className="w-3 h-3 mr-1" />Προσθήκη</Button>
                </div>
                <div className="space-y-2">
                  {formData.emails.map((email, i) => (
                    <div key={i} className="flex gap-2">
                      <Input type="email" value={email} onChange={e => updateEmail(i, e.target.value)} placeholder="email@example.com" />
                      {formData.emails.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(i)}><X className="w-4 h-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Phones */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Τηλέφωνα</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addPhone}><Plus className="w-3 h-3 mr-1" />Προσθήκη</Button>
                </div>
                <div className="space-y-2">
                  {formData.phones.map((phone, i) => (
                    <div key={i} className="flex gap-2">
                      <Input type="tel" value={phone} onChange={e => updatePhone(i, e.target.value)} placeholder="+30 210 0000000" />
                      {formData.phones.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(i)}><X className="w-4 h-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Financial & Web */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Χρηματοοικονομικά & Web</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>IBAN</Label>
                <Input value={formData.iban || ""} onChange={e => set("iban", e.target.value)} placeholder="GR00 0000 0000 0000 0000 0000 000" className="mt-1.5" />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input value={formData.website || ""} onChange={e => set("website", e.target.value)} placeholder="https://www.example.com" className="mt-1.5" />
              </div>
            </div>
          </div>

          {/* Other */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Company</Label>
              <Input value={formData.company || ""} onChange={e => set("company", e.target.value)} placeholder="Εταιρεία" className="mt-1.5" />
            </div>
            <div>
              <Label>Position</Label>
              <Input value={formData.position || ""} onChange={e => set("position", e.target.value)} placeholder="Θέση" className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Σημειώσεις</Label>
            <Textarea value={formData.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Επιπλέον πληροφορίες..." className="mt-1.5" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#1e3a5f] hover:bg-[#152a45]">
              {loading ? "Saving..." : contact ? "Update Contact" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ContactForm;