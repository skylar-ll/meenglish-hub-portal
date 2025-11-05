import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Offer {
  id: string;
  offer_name: string;
  offer_description: string | null;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function OffersManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [formData, setFormData] = useState({
    offer_name: "",
    offer_description: "",
    discount_percentage: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, [navigate]);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        navigate("/admin/login");
        return;
      }

      fetchOffers();
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    }
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Auto-update expired offers
      const now = new Date();
      const updatedOffers = await Promise.all(
        (data || []).map(async (offer) => {
          const endDate = new Date(offer.end_date);
          if (endDate < now && offer.status === "active") {
            await supabase
              .from("offers")
              .update({ status: "expired" })
              .eq("id", offer.id);
            return { ...offer, status: "expired" };
          }
          return offer;
        })
      );

      setOffers(updatedOffers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("offers").insert({
        offer_name: formData.offer_name,
        offer_description: formData.offer_description || null,
        discount_percentage: parseFloat(formData.discount_percentage),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: "active",
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Offer created successfully",
      });

      setFormData({
        offer_name: "",
        offer_description: "",
        discount_percentage: "",
        start_date: "",
        end_date: "",
      });

      fetchOffers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });

      fetchOffers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (offer: Offer) => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);

    if (offer.status === "expired" || endDate < now) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (startDate > now) {
      return <Badge variant="outline">Upcoming</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Offers Management</h1>
          <p className="text-muted-foreground">Create and manage discount offers</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Offer
          </CardTitle>
          <CardDescription>
            Offers will automatically apply to billing forms during their active period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer_name">Offer Name *</Label>
                <Input
                  id="offer_name"
                  value={formData.offer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, offer_name: e.target.value })
                  }
                  placeholder="e.g., Summer Sale 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Discount (%) *</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_percentage: e.target.value })
                  }
                  placeholder="e.g., 20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer_description">Description</Label>
              <Textarea
                id="offer_description"
                value={formData.offer_description}
                onChange={(e) =>
                  setFormData({ ...formData, offer_description: e.target.value })
                }
                placeholder="Optional description of the offer"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Offer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Offers</CardTitle>
          <CardDescription>
            View and manage existing offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading offers...</p>
          ) : offers.length === 0 ? (
            <p className="text-center text-muted-foreground">No offers created yet</p>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{offer.offer_name}</h3>
                      {getStatusBadge(offer)}
                      <Badge variant="outline">{offer.discount_percentage}% OFF</Badge>
                    </div>
                    {offer.offer_description && (
                      <p className="text-sm text-muted-foreground">
                        {offer.offer_description}
                      </p>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Period:</span>{" "}
                      {new Date(offer.start_date).toLocaleDateString()} -{" "}
                      {new Date(offer.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(offer.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
