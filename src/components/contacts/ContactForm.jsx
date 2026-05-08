import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ContactForm({ contact, open, onClose, onSubmit }) {
  const [formData, setFormData] = useState(
    contact || {
      name: "",
      afm: "",
      eponymia: "",
      emails: [""],
      phones: [""],
      company: "",
      position: "",
      category: "other",
      notes: "",
    }
  );

  useEffect(() => {
    if (contact) {
      setFormData({
        ...contact,
        emails: contact.emails?.length > 0 ? contact.emails : [""],
        phones: contact.phones?.length > 0 ? contact.phones : [""],
      });
    } else {
      setFormData({
        name: "",
        afm: "",
        eponymia: "",
        emails: [""],
        phones: [""],
        company: "",
        position: "",
        category: "other",
        notes: "",
      });
    }
  }, [contact]);

  const addEmail = () => {
    setFormData({ ...formData, emails: [...formData.emails, ""] });
  };

  const removeEmail = (index) => {
    setFormData({ ...formData, emails: formData.emails.filter((_, i) => i !== index) });
  };

  const updateEmail = (index, value) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData({ ...formData, emails: newEmails });
  };

  const addPhone = () => {
    setFormData({ ...formData, phones: [...formData.phones, ""] });
  };

  const removePhone = (index) => {
    setFormData({ ...formData, phones: formData.phones.filter((_, i) => i !== index) });
  };

  const updatePhone = (index, value) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData({ ...formData, phones: newPhones });
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanedData = {
      ...formData,
      emails: formData.emails.filter(e => e.trim()),
      phones: formData.phones.filter(p => p.trim()),
    };
    await onSubmit(cleanedData);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">
            {contact ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contact name"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Emails</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addEmail}>
                <Plus className="w-4 h-4 mr-1" />
                Add Email
              </Button>
            </div>
            <div className="space-y-2">
              {formData.emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="email@example.com"
                  />
                  {formData.emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmail(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Phones</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addPhone}>
                <Plus className="w-4 h-4 mr-1" />
                Add Phone
              </Button>
            </div>
            <div className="space-y-2">
              {formData.phones.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => updatePhone(index, e.target.value)}
                    placeholder="+1234567890"
                  />
                  {formData.phones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhone(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ΑΦΜ</Label>
              <Input
                value={formData.afm || ""}
                onChange={(e) => setFormData({ ...formData, afm: e.target.value })}
                placeholder="π.χ. 123456789"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Επωνυμία</Label>
              <Input
                value={formData.eponymia || ""}
                onChange={(e) => setFormData({ ...formData, eponymia: e.target.value })}
                placeholder="Επωνυμία εταιρείας"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company</Label>
              <Input
                value={formData.company || ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={formData.position || ""}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Job title"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
              className="mt-1.5"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              {loading ? "Saving..." : contact ? "Update Contact" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ContactForm;