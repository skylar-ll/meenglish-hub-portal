import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FormConfiguration {
  id: string;
  config_type: string;
  config_key: string;
  config_value: string;
  display_order: number;
  is_active: boolean;
  price: number;
}

interface CourseConfig {
  id: string;
  value: string;
  label: string;
  category: string;
  price: number;
}

export const useFormConfigurations = () => {
  const [courses, setCourses] = useState<CourseConfig[]>([]);
  const [branches, setBranches] = useState<{ id: string; value: string; label: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; value: string; label: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; value: string; label: string }[]>([]);
  const [classTypes, setClassTypes] = useState<{ id: string; value: string; label: string }[]>([]);
  const [fieldLabels, setFieldLabels] = useState<{ id: string; value: string; label: string }[]>([]);
  const [courseDurations, setCourseDurations] = useState<{ id: string; value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const configs = data as FormConfiguration[];

      // Parse courses (they have JSON in config_value)
      const coursesData = configs
        .filter((c) => c.config_type === "course")
        .map((c) => {
          const parsed = JSON.parse(c.config_value);
          return {
            id: c.id,
            value: c.config_key,
            label: parsed.label,
            category: parsed.category,
            price: c.price || 0,
          };
        });

      // Parse simple configs
      const branchesData = configs
        .filter((c) => c.config_type === "branch")
        .map((c) => ({ id: c.id, value: c.config_key, label: c.config_value }));

      const paymentMethodsData = configs
        .filter((c) => c.config_type === "payment_method")
        .map((c) => ({ id: c.id, value: c.config_key, label: c.config_value }));

      const programsData = configs
        .filter((c) => c.config_type === "program")
        .map((c) => ({ id: c.id, value: c.config_key, label: c.config_value }));

      const classTypesData = configs
        .filter((c) => c.config_type === "class_type")
        .map((c) => ({ id: c.id, value: c.config_key, label: c.config_value }));

      const fieldLabelsData = configs
        .filter((c) => c.config_type === "field_label")
        .map((c) => ({ id: c.id, value: c.config_key, label: c.config_value }));

      const courseDurationsData = configs
        .filter((c) => c.config_type === "course_duration")
        .map((c) => ({ id: c.id, value: c.config_key, label: c.config_value }));

      setCourses(coursesData);
      setBranches(branchesData);
      setPaymentMethods(paymentMethodsData);
      setPrograms(programsData);
      setClassTypes(classTypesData);
      setFieldLabels(fieldLabelsData);
      setCourseDurations(courseDurationsData);
    } catch (error) {
      console.error("Error fetching form configurations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();

    // Subscribe to changes
    const channel = supabase
      .channel("form_configurations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "form_configurations",
        },
        () => {
          fetchConfigurations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    courses,
    branches,
    paymentMethods,
    programs,
    classTypes,
    fieldLabels,
    courseDurations,
    loading,
    refetch: fetchConfigurations,
  };
};
