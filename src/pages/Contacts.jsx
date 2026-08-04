import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, Building2, Users, Package, Wrench, Handshake, MoreHorizontal, Pencil, Trash2, Upload, Download, Grid3x3, List } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ContactForm from "../components/contacts/ContactForm";
import SortSelect, { applySort } from "@/components/ui/sort-select";

const categoryIcons = {
  client: Users,
  supplier: Package,
  contractor: Wrench,
  partner: Handshake,
  other: Building2,
};

const categoryColors = {
  client: "bg-blue-100 text-blue-700",
  supplier: "bg-green-100 text-green-700",
  contractor: "bg-orange-100 text-orange-700",
  partner: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

export default function Contacts() {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [sortKey, setSortKey] = useState("alpha_asc");

  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setEditingContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const exportToCSV = () => {
    const headers = ["Name", "Emails", "Phones", "Company", "Position", "Category", "Notes"];
    const rows = filteredContacts.map(c => [
      c.name,
      c.emails?.join("; ") || "",
      c.phones?.join("; ") || "",
      c.company || "",
      c.position || "",
      c.category || "",
      c.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `contacts_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(arrayBuffer);
      
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert("CSV file must have a header row and at least one data row");
        setUploading(false);
        return;
      }

      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const contacts = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const contact = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            if (header === 'emails' || header === 'email') {
              contact.emails = values[index].split(';').map(e => e.trim()).filter(e => e);
            } else if (header === 'phones' || header === 'phone') {
              contact.phones = values[index].split(';').map(p => p.trim()).filter(p => p);
            } else {
              contact[header] = values[index];
            }
          }
        });

        if (contact.name) {
          contacts.push(contact);
        }
      }

      if (contacts.length > 0) {
        await base44.entities.Contact.bulkCreate(contacts);
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        alert(`Successfully imported ${contacts.length} contacts`);
      } else {
        alert("No valid contacts found in file");
      }
    } catch (error) {
      alert("Error importing file. Please check the CSV format.");
    }
    
    setUploading(false);
    e.target.value = "";
  };

  const filteredContacts = applySort(
    contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.emails?.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || contact.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }),
    sortKey,
    "name"
  );

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const toggleSelectContact = (id) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Contacts</h1>
          <p className="text-gray-600">Manage your clients, suppliers, and partners</p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              size="icon"
              className={viewMode === "grid" ? "bg-[#1e3a5f]" : ""}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              size="icon"
              className={viewMode === "list" ? "bg-[#1e3a5f]" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {["all", "client", "supplier", "contractor", "partner", "other"].map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                onClick={() => setCategoryFilter(cat)}
                className={categoryFilter === cat ? "bg-[#1e3a5f]" : ""}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <label htmlFor="csv-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => document.getElementById('csv-upload').click()}
              className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Import CSV"}
            </Button>
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            onClick={() => {
              setEditingContact(null);
              setShowForm(true);
            }}
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Selection Actions */}
        {selectedContacts.length > 0 && (
          <div className="mb-4 p-4 bg-[#1e3a5f] text-white rounded-lg flex items-center justify-between">
            <span>{selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selectedContacts.length} selected contacts?`)) {
                  Promise.all(selectedContacts.map(id => deleteMutation.mutateAsync(id)))
                    .then(() => setSelectedContacts([]));
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Select All */}
        {filteredContacts.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All ({filteredContacts.length})
            </label>
          </div>
        )}

        {/* Contacts Grid/List */}
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {filteredContacts.map((contact) => {
            const CategoryIcon = categoryIcons[contact.category] || Building2;
            const isSelected = selectedContacts.includes(contact.id);
            return (
              <Card key={contact.id} className={`hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-[#1e3a5f]' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectContact(contact.id)}
                      />
                      <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-semibold text-lg">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                        {contact.position && (
                          <CardDescription>{contact.position}</CardDescription>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingContact(contact);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(contact.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className={categoryColors[contact.category]}>
                      <CategoryIcon className="w-3 h-3 mr-1" />
                      {contact.category}
                    </Badge>
                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        {contact.company}
                      </div>
                    )}
                    {(contact.emails || []).filter(e => e).map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${email}`} className="hover:text-[#1e3a5f]">
                          {email}
                        </a>
                      </div>
                    ))}
                    {(contact.phones || []).filter(p => p).map((phone, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${phone}`} className="hover:text-[#1e3a5f]">
                          {phone}
                        </a>
                      </div>
                    ))}
                    {contact.notes && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{contact.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No contacts found</p>
          </div>
        )}

        {/* Contact Form Modal */}
        {showForm && (
          <ContactForm
            contact={editingContact}
            open={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingContact(null);
            }}
            onSubmit={(data) => {
              if (editingContact) {
                updateMutation.mutate({ id: editingContact.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}