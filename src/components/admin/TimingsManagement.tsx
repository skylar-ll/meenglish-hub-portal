import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Timing {
  id: string;
  value: string;
  displayOrder: number;
}

export const TimingsManagement = () => {
  const [timings, setTimings] = useState<Timing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTiming, setSelectedTiming] = useState<Timing | null>(null);
  const [formData, setFormData] = useState({
    value: "",
  });

  const fetchTimings = async () => {
    try {
      const { data, error } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("config_type", "timing")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;

      const parsedTimings = data.map((item) => ({
        id: item.id,
        value: item.config_value,
        displayOrder: item.display_order || 0,
      }));

      setTimings(parsedTimings);
    } catch (error) {
      console.error("Error fetching timings:", error);
      toast.error("Failed to load timings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimings();
  }, []);

  const handleAdd = async () => {
    if (!formData.value.trim()) {
      toast.error("Please enter a timing value");
      return;
    }

    try {
      const { error } = await supabase
        .from("form_configurations")
        .insert({
          config_type: "timing",
          config_key: formData.value.toLowerCase().replace(/\s+/g, "_"),
          config_value: formData.value,
          display_order: timings.length,
        });

      if (error) throw error;

      toast.success("Timing added successfully");
      setShowAddModal(false);
      setFormData({ value: "" });
      fetchTimings();
    } catch (error) {
      console.error("Error adding timing:", error);
      toast.error("Failed to add timing");
    }
  };

  const handleEdit = async () => {
    if (!selectedTiming || !formData.value.trim()) {
      toast.error("Please enter a timing value");
      return;
    }

    try {
      const { error } = await supabase
        .from("form_configurations")
        .update({
          config_value: formData.value,
        })
        .eq("id", selectedTiming.id);

      if (error) throw error;

      toast.success("Timing updated successfully");
      setShowEditModal(false);
      setSelectedTiming(null);
      setFormData({ value: "" });
      fetchTimings();
    } catch (error) {
      console.error("Error updating timing:", error);
      toast.error("Failed to update timing");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this timing?")) return;

    try {
      const { error } = await supabase
        .from("form_configurations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Timing deleted successfully");
      fetchTimings();
    } catch (error) {
      console.error("Error deleting timing:", error);
      toast.error("Failed to delete timing");
    }
  };

  const openEditModal = (timing: Timing) => {
    setSelectedTiming(timing);
    setFormData({ value: timing.value });
    setShowEditModal(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Timings Management</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Timing
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timing</TableHead>
            <TableHead>Display Order</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timings.map((timing) => (
            <TableRow key={timing.id}>
              <TableCell className="font-medium">{timing.value}</TableCell>
              <TableCell>{timing.displayOrder}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(timing)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(timing.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Timing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Timing (e.g., "Monday 9:00 AM - 11:00 AM")</Label>
              <Input
                value={formData.value}
                onChange={(e) => setFormData({ value: e.target.value })}
                placeholder="Enter timing"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Add Timing</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Timing</Label>
              <Input
                value={formData.value}
                onChange={(e) => setFormData({ value: e.target.value })}
                placeholder="Enter timing"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTiming(null);
                  setFormData({ value: "" });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
