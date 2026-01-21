import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, X, Upload, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProjectForm({ project, open, onClose, onSubmit }) {
  const [formData, setFormData] = useState(
    project || {
      name: "",
      description: "",
      status: "planning",
      property_type: "residential",
      address: "",
      budget: "",
      budget_items: [],
      start_date: "",
      target_completion: "",
      priority: "medium",
      progress: 0,
      cover_image: "",
    }
  );
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showBudgetItems, setShowBudgetItems] = useState(false);

  const addBudgetItem = () => {
    const newItem = {
      id: Date.now().toString(),
      category: "",
      description: "",
      quantity: 1,
      unit: "unit",
      unit_cost: 0,
      total_cost: 0
    };
    setFormData({
      ...formData,
      budget_items: [...(formData.budget_items || []), newItem]
    });
  };

  const updateBudgetItem = (id, field, value) => {
    const updatedItems = formData.budget_items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.total_cost = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        return updated;
      }
      return item;
    });
    
    const totalBudget = updatedItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    
    setFormData({
      ...formData,
      budget_items: updatedItems,
      budget: totalBudget
    });
  };

  const removeBudgetItem = (id) => {
    const updatedItems = formData.budget_items.filter(item => item.id !== id);
    const totalBudget = updatedItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    
    setFormData({
      ...formData,
      budget_items: updatedItems,
      budget: totalBudget
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, cover_image: file_url });
    } catch (error) {
      console.error("Failed to upload image:", error);
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...formData,
      budget: formData.budget ? Number(formData.budget) : null,
      progress: Number(formData.progress) || 0,
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1e3a5f]">
            {project ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Cover Image Upload */}
          <div>
            <Label>Project Cover Image</Label>
            <div className="mt-1.5">
              {formData.cover_image ? (
                <div className="relative group">
                  <img 
                    src={formData.cover_image} 
                    alt="Project cover" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById('cover-image-upload').click()}
                      disabled={uploadingImage}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setFormData({ ...formData, cover_image: "" })}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('cover-image-upload').click()}
                  disabled={uploadingImage}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#1e3a5f] hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#1e3a5f]"
                >
                  {uploadingImage ? (
                    <div className="animate-pulse">Uploading...</div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm font-medium">Click to upload cover image</span>
                    </>
                  )}
                </button>
              )}
              <input
                id="cover-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Project Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sunset Residences"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label>Property Type *</Label>
              <Select
                value={formData.property_type}
                onValueChange={(v) => setFormData({ ...formData, property_type: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">🏠 Residential</SelectItem>
                  <SelectItem value="commercial">🏢 Commercial</SelectItem>
                  <SelectItem value="mixed_use">🏗️ Mixed Use</SelectItem>
                  <SelectItem value="industrial">🏭 Industrial</SelectItem>
                  <SelectItem value="land">🌍 Land Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Address / Location</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 123 Main Street, Downtown"
                className="mt-1.5"
              />
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project overview and key details..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Budget (€)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBudgetItems(!showBudgetItems)}
                  className="text-[#1e3a5f] hover:text-[#152a45]"
                >
                  {showBudgetItems ? "Hide" : "Show"} Budget Breakdown
                </Button>
              </div>
              
              {!showBudgetItems ? (
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g., 5000000"
                  className="mt-1.5"
                />
              ) : (
                <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Budget Line Items</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addBudgetItem}
                      className="bg-[#1e3a5f] hover:bg-[#152a45]"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {formData.budget_items && formData.budget_items.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {formData.budget_items.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded-lg border space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Category"
                              value={item.category}
                              onChange={(e) => updateBudgetItem(item.id, 'category', e.target.value)}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-4 gap-2 items-end">
                            <div>
                              <label className="text-xs text-gray-500">Qty</label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateBudgetItem(item.id, 'quantity', Number(e.target.value))}
                                className="text-sm"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Unit</label>
                              <Input
                                value={item.unit}
                                onChange={(e) => updateBudgetItem(item.id, 'unit', e.target.value)}
                                className="text-sm"
                                placeholder="unit"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Unit Cost (€)</label>
                              <Input
                                type="number"
                                value={item.unit_cost}
                                onChange={(e) => updateBudgetItem(item.id, 'unit_cost', Number(e.target.value))}
                                className="text-sm"
                                min="0"
                              />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">Total</label>
                                <div className="text-sm font-semibold text-[#1e3a5f] py-2">
                                  €{item.total_cost?.toLocaleString() || 0}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBudgetItem(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No budget items yet. Click "Add Item" to start building your budget.
                    </p>
                  )}

                  <div className="border-t pt-3 mt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Budget:</span>
                    <span className="text-xl font-bold text-[#1e3a5f]">
                      €{(formData.budget || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(new Date(formData.start_date), "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, start_date: date?.toISOString() })}
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={2035}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Target Completion</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1.5 justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.target_completion
                      ? format(new Date(formData.target_completion), "PPP")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.target_completion ? new Date(formData.target_completion) : undefined}
                    onSelect={(date) => setFormData({ ...formData, target_completion: date?.toISOString() })}
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={2035}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {project && (
              <div className="col-span-2">
                <Label>Progress ({formData.progress}%)</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                  className="w-full mt-2 accent-[#1e3a5f]"
                />
              </div>
            )}
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
              {loading ? "Saving..." : project ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}