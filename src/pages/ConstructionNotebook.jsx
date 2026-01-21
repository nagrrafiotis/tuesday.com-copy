import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  CloudRain,
  Calendar as CalendarIcon,
  Users,
  Briefcase,
  HardHat,
  FileText,
  AlertCircle,
  X,
  Cloud,
  Camera,
  Package,
  ShieldAlert,
  Clock,
  Wrench,
} from "lucide-react";

export default function ConstructionNotebook() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    project_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    weather: null,
    technicians: [],
    engineers: [],
    subcontractors: [],
    visitors: [],
    equipment_used: [],
    materials_delivered: [],
    safety_observations: "",
    photos: [],
    notes: "",
    work_performed: "",
    issues: "",
  });
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [personInput, setPersonInput] = useState({ technicians: "", engineers: "", subcontractors: "" });
  const [visitorInput, setVisitorInput] = useState({ name: "", company: "", purpose: "", time: "" });
  const [equipmentInput, setEquipmentInput] = useState("");
  const [materialInput, setMaterialInput] = useState({ material: "", quantity: "", supplier: "" });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["construction-notes", selectedProject],
    queryFn: () =>
      selectedProject
        ? base44.entities.ConstructionNote.filter({ project_id: selectedProject })
        : base44.entities.ConstructionNote.list(),
    initialData: [],
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.ConstructionNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-notes"] });
      setShowForm(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      project_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      weather: null,
      technicians: [],
      engineers: [],
      subcontractors: [],
      visitors: [],
      equipment_used: [],
      materials_delivered: [],
      safety_observations: "",
      photos: [],
      notes: "",
      work_performed: "",
      issues: "",
    });
    setPersonInput({ technicians: "", engineers: "", subcontractors: "" });
    setVisitorInput({ name: "", company: "", purpose: "", time: "" });
    setEquipmentInput("");
    setMaterialInput({ material: "", quantity: "", supplier: "" });
  };

  const fetchWeather = async () => {
    if (!formData.project_id) {
      alert("Please select a project first");
      return;
    }

    const project = projects.find((p) => p.id === formData.project_id);
    if (!project?.address) {
      alert("Project needs an address to fetch weather");
      return;
    }

    if (!formData.date) {
      alert("Please select a date first");
      return;
    }

    setLoadingWeather(true);
    try {
      const selectedDate = format(new Date(formData.date), "MMMM d, yyyy");
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Get weather data for ${project.address} on ${selectedDate}. Return temperature, condition (sunny/cloudy/rainy/etc), and a brief description. If this is a past date, provide historical weather data. If this is today or future, provide current or forecasted weather.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "string" },
            condition: { type: "string" },
            description: { type: "string" },
          },
        },
      });
      setFormData({ ...formData, weather: response });
    } catch (error) {
      alert("Failed to fetch weather data");
    }
    setLoadingWeather(false);
  };

  const addPerson = (type) => {
    if (personInput[type].trim()) {
      setFormData({
        ...formData,
        [type]: [...formData[type], personInput[type].trim()],
      });
      setPersonInput({ ...personInput, [type]: "" });
    }
  };

  const removePerson = (type, index) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index),
    });
  };

  const addVisitor = () => {
    if (visitorInput.name.trim()) {
      setFormData({
        ...formData,
        visitors: [...formData.visitors, { ...visitorInput, time: visitorInput.time || format(new Date(), "HH:mm") }],
      });
      setVisitorInput({ name: "", company: "", purpose: "", time: "" });
    }
  };

  const removeVisitor = (index) => {
    setFormData({
      ...formData,
      visitors: formData.visitors.filter((_, i) => i !== index),
    });
  };

  const addEquipment = () => {
    if (equipmentInput.trim()) {
      setFormData({
        ...formData,
        equipment_used: [...formData.equipment_used, equipmentInput.trim()],
      });
      setEquipmentInput("");
    }
  };

  const removeEquipment = (index) => {
    setFormData({
      ...formData,
      equipment_used: formData.equipment_used.filter((_, i) => i !== index),
    });
  };

  const addMaterial = () => {
    if (materialInput.material.trim()) {
      setFormData({
        ...formData,
        materials_delivered: [...formData.materials_delivered, { ...materialInput }],
      });
      setMaterialInput({ material: "", quantity: "", supplier: "" });
    }
  };

  const removeMaterial = (index) => {
    setFormData({
      ...formData,
      materials_delivered: formData.materials_delivered.filter((_, i) => i !== index),
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        photos: [...formData.photos, file_url],
      });
    } catch (error) {
      alert("Failed to upload photo");
    }
    setUploadingPhoto(false);
  };

  const removePhoto = (index) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createNoteMutation.mutate(formData);
  };

  const filteredNotes = selectedDate
    ? notes.filter((note) => note.date === format(selectedDate, "yyyy-MM-dd"))
    : notes;

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Construction Notebook</h1>
            <p className="text-gray-500 mt-1">Daily site logs and observations</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#152a45]">
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filter by Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Filter by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProject || "all"} onValueChange={(v) => setSelectedProject(v === "all" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
                const project = projects.find((p) => p.id === note.project_id);
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-[#1e3a5f]">{project?.name || "Unknown Project"}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                              {format(new Date(note.date), "EEEE, MMMM d, yyyy")}
                            </p>
                          </div>
                          {note.weather && (
                            <Badge variant="outline" className="flex items-center gap-2">
                              <Cloud className="w-4 h-4" />
                              {note.weather.temperature} • {note.weather.condition}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {note.weather && (
                          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                            <CloudRain className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">Weather Conditions</p>
                              <p className="text-sm text-blue-700">{note.weather.description}</p>
                            </div>
                          </div>
                        )}

                        {(note.technicians?.length > 0 || note.engineers?.length > 0 || note.subcontractors?.length > 0) && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {note.technicians?.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <HardHat className="w-4 h-4 text-gray-600" />
                                  <p className="text-sm font-medium text-gray-700">Technicians</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.technicians.map((person, i) => (
                                    <Badge key={i} variant="secondary">{person}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {note.engineers?.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-gray-600" />
                                  <p className="text-sm font-medium text-gray-700">Engineers</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.engineers.map((person, i) => (
                                    <Badge key={i} variant="secondary">{person}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {note.subcontractors?.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Briefcase className="w-4 h-4 text-gray-600" />
                                  <p className="text-sm font-medium text-gray-700">Subcontractors</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {note.subcontractors.map((person, i) => (
                                    <Badge key={i} variant="secondary">{person}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {note.work_performed && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-700">Work Performed</p>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.work_performed}</p>
                          </div>
                        )}

                        {note.issues && (
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <p className="text-sm font-medium text-red-900">Issues</p>
                            </div>
                            <p className="text-sm text-red-700 whitespace-pre-wrap">{note.issues}</p>
                          </div>
                        )}

                        {note.visitors?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-700">Site Visitors</p>
                            </div>
                            <div className="space-y-2">
                              {note.visitors.map((visitor, i) => (
                                <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                                  <span className="font-medium">{visitor.name}</span>
                                  {visitor.company && <span className="text-gray-600"> - {visitor.company}</span>}
                                  {visitor.purpose && <span className="text-gray-500"> ({visitor.purpose})</span>}
                                  {visitor.time && <span className="text-gray-400 ml-2">• {visitor.time}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {note.equipment_used?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Wrench className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-700">Equipment Used</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {note.equipment_used.map((equip, i) => (
                                <Badge key={i} variant="outline">{equip}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {note.materials_delivered?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-700">Materials Delivered</p>
                            </div>
                            <div className="space-y-2">
                              {note.materials_delivered.map((material, i) => (
                                <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                                  <span className="font-medium">{material.material}</span>
                                  {material.quantity && <span className="text-gray-600"> - {material.quantity}</span>}
                                  {material.supplier && <span className="text-gray-500"> (from {material.supplier})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {note.safety_observations && (
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <ShieldAlert className="w-4 h-4 text-yellow-600" />
                              <p className="text-sm font-medium text-yellow-900">Safety Observations</p>
                            </div>
                            <p className="text-sm text-yellow-700 whitespace-pre-wrap">{note.safety_observations}</p>
                          </div>
                        )}

                        {note.photos?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Camera className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-700">Site Photos</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {note.photos.map((photo, i) => (
                                <img
                                  key={i}
                                  src={photo}
                                  alt={`Site photo ${i + 1}`}
                                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(photo, "_blank")}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {note.notes && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Additional Notes</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No entries for this date</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">New Construction Note</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                  required
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1.5 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(new Date(formData.date), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => setFormData({ ...formData, date: format(date, "yyyy-MM-dd") })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Weather</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={fetchWeather}
                  disabled={loadingWeather}
                  variant="outline"
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  {loadingWeather ? "Fetching..." : "Get Weather"}
                </Button>
              </div>
              {formData.weather && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    {formData.weather.temperature} • {formData.weather.condition}
                  </p>
                  <p className="text-sm text-blue-700">{formData.weather.description}</p>
                </div>
              )}
            </div>

            <div>
              <Label>Technicians on Site</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={personInput.technicians}
                  onChange={(e) => setPersonInput({ ...personInput, technicians: e.target.value })}
                  placeholder="Enter name"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPerson("technicians"))}
                />
                <Button type="button" onClick={() => addPerson("technicians")}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.technicians.map((person, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {person}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removePerson("technicians", i)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Engineers on Site</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={personInput.engineers}
                  onChange={(e) => setPersonInput({ ...personInput, engineers: e.target.value })}
                  placeholder="Enter name"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPerson("engineers"))}
                />
                <Button type="button" onClick={() => addPerson("engineers")}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.engineers.map((person, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {person}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removePerson("engineers", i)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Subcontractors on Site</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={personInput.subcontractors}
                  onChange={(e) => setPersonInput({ ...personInput, subcontractors: e.target.value })}
                  placeholder="Enter name"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPerson("subcontractors"))}
                />
                <Button type="button" onClick={() => addPerson("subcontractors")}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.subcontractors.map((person, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {person}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removePerson("subcontractors", i)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Work Performed</Label>
              <Textarea
                value={formData.work_performed}
                onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
                placeholder="Describe the work completed today..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            <div>
              <Label>Issues / Problems</Label>
              <Textarea
                value={formData.issues}
                onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                placeholder="Any issues or problems encountered..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>

            <div>
              <Label>Site Visitors</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <Input
                  value={visitorInput.name}
                  onChange={(e) => setVisitorInput({ ...visitorInput, name: e.target.value })}
                  placeholder="Name *"
                />
                <Input
                  value={visitorInput.company}
                  onChange={(e) => setVisitorInput({ ...visitorInput, company: e.target.value })}
                  placeholder="Company"
                />
                <Input
                  value={visitorInput.purpose}
                  onChange={(e) => setVisitorInput({ ...visitorInput, purpose: e.target.value })}
                  placeholder="Purpose of visit"
                />
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={visitorInput.time}
                    onChange={(e) => setVisitorInput({ ...visitorInput, time: e.target.value })}
                    placeholder="Time"
                  />
                  <Button type="button" onClick={addVisitor} className="whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {formData.visitors.length > 0 && (
                <div className="mt-2 space-y-2">
                  {formData.visitors.map((visitor, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>
                        <strong>{visitor.name}</strong>
                        {visitor.company && ` - ${visitor.company}`}
                        {visitor.purpose && ` (${visitor.purpose})`}
                        {visitor.time && ` • ${visitor.time}`}
                      </span>
                      <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-600" onClick={() => removeVisitor(i)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Equipment Used</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  placeholder="e.g., Excavator, Crane, Generator..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addEquipment())}
                />
                <Button type="button" onClick={addEquipment}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.equipment_used.map((equip, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {equip}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeEquipment(i)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Materials Delivered</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <Input
                  value={materialInput.material}
                  onChange={(e) => setMaterialInput({ ...materialInput, material: e.target.value })}
                  placeholder="Material *"
                />
                <Input
                  value={materialInput.quantity}
                  onChange={(e) => setMaterialInput({ ...materialInput, quantity: e.target.value })}
                  placeholder="Quantity"
                />
                <div className="flex gap-2">
                  <Input
                    value={materialInput.supplier}
                    onChange={(e) => setMaterialInput({ ...materialInput, supplier: e.target.value })}
                    placeholder="Supplier"
                  />
                  <Button type="button" onClick={addMaterial} className="whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {formData.materials_delivered.length > 0 && (
                <div className="mt-2 space-y-2">
                  {formData.materials_delivered.map((material, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>
                        <strong>{material.material}</strong>
                        {material.quantity && ` - ${material.quantity}`}
                        {material.supplier && ` (${material.supplier})`}
                      </span>
                      <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-600" onClick={() => removeMaterial(i)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Safety Observations</Label>
              <Textarea
                value={formData.safety_observations}
                onChange={(e) => setFormData({ ...formData, safety_observations: e.target.value })}
                placeholder="Safety incidents, hazards, near-misses, or observations..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>

            <div>
              <Label>Site Photos</Label>
              <div className="mt-1.5">
                <label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingPhoto}
                    onClick={() => document.getElementById("photo-upload").click()}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? "Uploading..." : "Take/Upload Photo"}
                  </Button>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {formData.photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any other observations or notes..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                Save Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}